import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET, R2_PUBLIC_URL } from "@/lib/r2";
import { extractPdfSpecs } from "@/lib/pdfAnalyzer";
import { authenticateAdminRequest } from "@/lib/auth";

export async function POST(request) {
  try {
    const admin = await authenticateAdminRequest(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Admin authentication required." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { success: false, message: "File is required" },
        { status: 400 }
      );
    }

    const isImage = file.type?.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/i.test(file.name);
    const isPdf = file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf");
    const isDoc = file.name?.toLowerCase().endsWith(".doc") || file.name?.toLowerCase().endsWith(".docx");

    if (!isImage && !isPdf && !isDoc) {
      return NextResponse.json(
        { success: false, message: "Only image (PNG, JPG, WEBP) or PDF documents are allowed" },
        { status: 400 }
      );
    }

    // Limit image to 10MB, PDF to 25MB
    const maxBytes = isImage ? 10 * 1024 * 1024 : 25 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { success: false, message: `File size must be under ${isImage ? "10 MB" : "25 MB"}` },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Prepare path and public key
    const originalName = file.name || (isImage ? "image.png" : "document.pdf");
    const sanitizedBase = originalName
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]/g, "_");
    const extension = isPdf ? ".pdf" : originalName.slice(originalName.lastIndexOf("."));
    const folder = isImage ? "products" : "documents";
    const key = `${folder}/${Date.now()}_${sanitizedBase}${extension}`;

    // Extract PDF Specifications with unpdf
    let extracted = null;
    if (isPdf) {
      try {
        extracted = await extractPdfSpecs(buffer);
      } catch (parseErr) {
        console.error("PDF parse error:", parseErr);
      }
    }

    // Upload directly to Cloudflare R2
    const contentType = file.type || (isImage ? "image/jpeg" : isPdf ? "application/pdf" : "application/octet-stream");

    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    const publicUrl = `${R2_PUBLIC_URL}/${key}`;

    if (isImage) {
      return NextResponse.json({
        success: true,
        fileType: "image",
        imageUrl: publicUrl,
        publicId: key,
      });
    }

    return NextResponse.json({
      success: true,
      fileType: isPdf ? "pdf" : "doc",
      documentUrl: publicUrl,
      documentName: originalName,
      publicId: key,
      specifications: extracted?.specifications || null,
      fullAnalysis: extracted?.fullAnalysis || null,
      pdfText: extracted?.pdfText || null,
      summary: extracted?.summary || null,
      metadata: extracted?.metadata || null,
    });
  } catch (error) {
    console.error("Upload handler error:", error);

    return NextResponse.json(
      { success: false, message: error.message || "File upload failed" },
      { status: 500 }
    );
  }
}
