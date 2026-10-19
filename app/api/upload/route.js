import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";
import cloudinary from "@/lib/cloudinary";
import { extractPdfSpecs } from "@/lib/pdfAnalyzer";

export async function POST(request) {
  let tempFilePath = null;
  try {
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

    // Prepare temp file path
    const originalName = file.name || (isImage ? "image.png" : "document.pdf");
    const sanitizedBase = originalName
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]/g, "_");
    const extension = isPdf ? ".pdf" : originalName.slice(originalName.lastIndexOf("."));
    const publicId = `${Date.now()}_${sanitizedBase}${extension}`;

    tempFilePath = path.join(os.tmpdir(), `upload_${Date.now()}_${sanitizedBase}${extension}`);
    await fs.writeFile(tempFilePath, buffer);

    // Extract PDF Specifications with unpdf
    let extracted = null;
    if (isPdf) {
      try {
        const fileContent = await fs.readFile(tempFilePath);
        extracted = await extractPdfSpecs(fileContent);
      } catch (parseErr) {
        console.error("PDF parse error:", parseErr);
      }
    }

    const result = await cloudinary.uploader.upload(tempFilePath, {
      folder: isImage ? "cleanergy/products" : "cleanergy/documents",
      resource_type: isImage ? "image" : "raw",
      public_id: publicId,
    });

    // Delete temp file after upload
    await fs.unlink(tempFilePath).catch(() => {});
    tempFilePath = null;

    if (isImage) {
      return NextResponse.json({
        success: true,
        fileType: "image",
        imageUrl: result.secure_url,
        publicId: result.public_id,
      });
    }

    return NextResponse.json({
      success: true,
      fileType: isPdf ? "pdf" : "doc",
      documentUrl: result.secure_url,
      documentName: originalName,
      publicId: result.public_id,
      specifications: extracted?.specifications || null,
      fullAnalysis: extracted?.fullAnalysis || null,
      pdfText: extracted?.pdfText || null,
      summary: extracted?.summary || null,
      metadata: extracted?.metadata || null,
    });
  } catch (error) {
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(() => {});
    }
    console.error("Upload handler error:", error);

    return NextResponse.json(
      { success: false, message: error.message || "File upload failed" },
      { status: 500 }
    );
  }
}