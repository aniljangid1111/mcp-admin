"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function ProductForm({ mode = "add", productId }) {
    const router = useRouter();
    const isEdit = mode === "edit";

    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [content, setContent] = useState("");
    const [imagePreview, setImagePreview] = useState(null);
    const [imageName, setImageName] = useState("");
    const [existingImageUrl, setExistingImageUrl] = useState(null);

    // Document & PDF Extraction States
    const [documentUrl, setDocumentUrl] = useState(null);
    const [documentName, setDocumentName] = useState("");
    const [specifications, setSpecifications] = useState("");
    const [pdfText, setPdfText] = useState("");
    const [documentSummary, setDocumentSummary] = useState("");
    const [documentStatus, setDocumentStatus] = useState("idle"); // idle | uploading | ready | error
    const [documentStatusMsg, setDocumentStatusMsg] = useState("");
    const [isDocumentRemoved, setIsDocumentRemoved] = useState(false);

    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const documentInputRef = useRef(null);
    const imageInputRef = useRef(null);

    // Edit mode: load existing product
    useEffect(() => {
        if (!isEdit || !productId) return;

        async function loadProduct() {
            try {
                const response = await fetch(`/api/products/${productId}`);
                const data = await response.json();

                if (!response.ok || !data.product) {
                    throw new Error(data.message || "Product not found.");
                }

                const product = data.product;

                setName(product.name || "");
                setPrice(String(product.price ?? ""));
                setContent(product.content || "");
                setExistingImageUrl(product.imageUrl || null);
                setImagePreview(product.imageUrl || null);

                if (product.documentUrl) {
                    setDocumentUrl(product.documentUrl);
                    setDocumentName(
                        product.documentName ||
                        product.documentUrl.split("/").pop() ||
                        "Product Specification Document.pdf"
                    );
                    setSpecifications(product.specifications || "");
                    setPdfText(product.pdfText || "");
                    setDocumentStatus("ready");
                }
            } catch (err) {
                setError(err.message || "Failed to load product.");
            } finally {
                setLoading(false);
            }
        }

        loadProduct();
    }, [isEdit, productId]);

    const handleImageChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImageName(file.name);
        setImagePreview(URL.createObjectURL(file));
    };

    // PDF / Document upload & analyze immediately upon selection
    const handleDocumentChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setDocumentName(file.name);
        setIsDocumentRemoved(false);
        setDocumentStatus("uploading");
        setDocumentStatusMsg("Uploading PDF and analyzing battery specifications...");

        try {
            const formData = new FormData();
            formData.append("file", file);

            const uploadRes = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            const data = await uploadRes.json();

            if (!uploadRes.ok || !data.success) {
                throw new Error(data.message || "Failed to process PDF document.");
            }

            setDocumentUrl(data.documentUrl);
            setDocumentName(data.documentName || file.name);
            setSpecifications(data.specifications || "");
            setPdfText(data.pdfText || "");
            setDocumentSummary(data.summary || "");

            // Automatically populate content with the complete analyzed specifications
            const autoContent = data.fullAnalysis || data.specifications || "";
            if (autoContent) {
                setContent((prev) => {
                    if (!prev || !prev.trim() || prev.trim().toLowerCase() === "testing") {
                        return autoContent;
                    }
                    return `${prev.trim()}\n\n${autoContent}`;
                });
            }

            // Auto-fill product name if empty
            if (!name.trim()) {
                const cleanName = (data.documentName || file.name)
                    .replace(/\.[^/.]+$/, "")
                    .replace(/[-_]+/g, " ");
                setName(cleanName);
            }

            setDocumentStatus("ready");
            setDocumentStatusMsg("✓ PDF analyzed! Content and specifications populated automatically.");
        } catch (err) {
            console.error("Document upload/analysis error:", err);
            setDocumentStatus("error");
            setDocumentStatusMsg(err.message || "Failed to upload or analyze PDF.");
        }
    };

    const handleRemoveDocument = () => {
        setDocumentUrl(null);
        setDocumentName("");
        setSpecifications("");
        setPdfText("");
        setDocumentSummary("");
        setDocumentStatus("idle");
        setDocumentStatusMsg("");
        setIsDocumentRemoved(true);
        if (documentInputRef.current) {
            documentInputRef.current.value = "";
        }
    };

    const handleTriggerDocumentSelect = () => {
        if (documentInputRef.current) {
            documentInputRef.current.click();
        }
    };

    const handleAppendSpecsToContent = () => {
        if (!specifications.trim()) return;
        const divider = content.trim() ? "\n\n" : "";
        setContent((prev) => `${prev.trim()}${divider}${specifications.trim()}`);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");

        if (!name.trim() || price === "" || !content.trim()) {
            setError("Please fill in product name, price and content.");
            return;
        }

        if (!Number.isFinite(Number(price)) || Number(price) < 0) {
            setError("Please enter a valid price.");
            return;
        }

        if (documentStatus === "uploading") {
            setError("Please wait while the PDF is being uploaded and analyzed.");
            return;
        }

        setSaving(true);

        try {
            const form = event.currentTarget;
            const imageFile = form.elements.productImage?.files?.[0];

            let imageUrl = existingImageUrl;

            // Upload new image if chosen
            if (imageFile && imageFile.size > 0) {
                const uploadFormData = new FormData();
                uploadFormData.append("file", imageFile);

                const uploadResponse = await fetch("/api/upload", {
                    method: "POST",
                    body: uploadFormData,
                });

                const uploadData = await uploadResponse.json();

                if (!uploadResponse.ok || !uploadData.imageUrl) {
                    throw new Error(uploadData.message || "Image upload failed.");
                }

                imageUrl = uploadData.imageUrl;
            }

            const endpoint = isEdit
                ? `/api/products/${productId}`
                : "/api/products";

            const response = await fetch(endpoint, {
                method: isEdit ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: name.trim(),
                    price: Number(price),
                    content: content.trim(),
                    imageUrl,
                    documentUrl: isDocumentRemoved ? null : documentUrl,
                    documentName: isDocumentRemoved ? null : documentName,
                    specifications: isDocumentRemoved ? null : specifications,
                    pdfText: isDocumentRemoved ? null : pdfText,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    (isEdit
                        ? "Failed to update product."
                        : "Failed to save product.")
                );
            }

            alert(
                isEdit
                    ? "Product updated successfully with PDF specifications!"
                    : "Product saved successfully with PDF specifications!"
            );

            router.push("/admin/dashboard");
            router.refresh();
        } catch (err) {
            console.error("Save product error:", err);
            setError(err.message || "Something went wrong. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <main className="flex min-h-[70vh] items-center justify-center bg-[#f7f8fa] px-4">
                <div className="flex flex-col items-center gap-3 text-center">
                    <div className="h-9 w-9 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent" />
                    <p className="text-sm font-medium text-slate-600">Loading product details...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#f7f8fa] px-6 py-8">
            <div className="mx-auto max-w-5xl">
                <div className="mb-8">
                    <p className="mb-2 text-sm font-medium text-gray-500">
                        Products
                    </p>

                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
                                {isEdit ? "Edit Product" : "Add Product"}
                            </h1>
                            <p className="mt-2 text-sm text-gray-500">
                                {isEdit
                                    ? "Update your existing battery product, replace PDF, and refresh specifications."
                                    : "Add a new Cleanergy battery product with automatic PDF analysis and database storage."}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <form
                    onSubmit={handleSubmit}
                    className="rounded-2xl border border-gray-200 bg-white shadow-sm"
                >
                    {/* Basic Info */}
                    <div className="border-b border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Product Information
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Enter the basic information of the battery.
                        </p>

                        <div className="mt-6 grid gap-6 md:grid-cols-2">
                            <div className="md:col-span-2">
                                <label
                                    htmlFor="productName"
                                    className="mb-2 block text-sm font-medium text-gray-800"
                                >
                                    Product Name
                                </label>
                                <input
                                    id="productName"
                                    name="productName"
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. 51.2V 300Ah 15.3Kwh Lithium Phosphate Home Power Storage Battery"
                                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="price"
                                    className="mb-2 block text-sm font-medium text-gray-800"
                                >
                                    Price (USD)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                                        $
                                    </span>
                                    <input
                                        id="price"
                                        name="price"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        placeholder="1792.00"
                                        className="w-full rounded-lg border border-gray-300 py-3 pl-8 pr-4 text-sm text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Files Section: Image & PDF Document */}
                    <div className="border-b border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Product Files & Specification PDF
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Upload product image and PDF specifications. The PDF will be analyzed instantly and stored in the database for the MCP server.
                        </p>

                        <div className="mt-6 grid gap-6 md:grid-cols-2">
                            {/* Product Image */}
                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-800">
                                    Product Image
                                </label>

                                <label
                                    htmlFor="productImage"
                                    className="block cursor-pointer"
                                >
                                    <div className="flex min-h-[260px] items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 hover:bg-gray-100">
                                        {imagePreview ? (
                                            <div className="w-full">
                                                <img
                                                    src={imagePreview}
                                                    alt="Product preview"
                                                    className="mx-auto h-48 w-full rounded-lg object-contain"
                                                />
                                                <p className="mt-3 truncate text-center text-xs text-gray-500">
                                                    {imageName || "Current product image"}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="text-center">
                                                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <p className="text-sm font-medium text-gray-700">
                                                    Upload product image
                                                </p>
                                                <p className="mt-1 text-xs text-gray-500">
                                                    PNG, JPG or WEBP (max 10MB)
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <input
                                        ref={imageInputRef}
                                        id="productImage"
                                        name="productImage"
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        onChange={handleImageChange}
                                        className="hidden"
                                    />
                                </label>
                                {isEdit && (
                                    <p className="mt-2 text-xs text-gray-500">
                                        Select a new image only if you want to replace the existing one.
                                    </p>
                                )}
                            </div>

                            {/* Product Document (PDF) with Replace & Auto-Analysis */}
                            <div>
                                <div className="mb-2 flex items-center justify-between">
                                    <label className="text-sm font-medium text-gray-800">
                                        Product Specification PDF
                                    </label>
                                    <span className="text-xs text-emerald-600 font-medium">
                                        Auto-analyzed to Database
                                    </span>
                                </div>

                                {/* Hidden PDF Input */}
                                <input
                                    ref={documentInputRef}
                                    id="productDocument"
                                    name="productDocument"
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    onChange={handleDocumentChange}
                                    className="hidden"
                                />

                                {documentUrl && !isDocumentRemoved ? (
                                    /* Active Document Card with Replace & Remove */
                                    <div className="flex min-h-[260px] flex-col justify-between rounded-xl border border-emerald-200 bg-emerald-50/40 p-5">
                                        <div>
                                            <div className="flex items-start gap-3">
                                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
                                                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                                        ✓ Analyzed & Stored in Database
                                                    </span>
                                                    <p className="mt-1 truncate text-sm font-semibold text-gray-900" title={documentName}>
                                                        {documentName || "Battery Specification Sheet.pdf"}
                                                    </p>
                                                    {documentSummary && (
                                                        <p className="mt-1 line-clamp-2 text-xs text-gray-600">
                                                            {documentSummary}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mt-4">
                                                <a
                                                    href={documentUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-900 underline"
                                                >
                                                    <span>View uploaded PDF in new tab</span>
                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                    </svg>
                                                </a>
                                            </div>
                                        </div>

                                        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-emerald-100 pt-3">
                                            <button
                                                type="button"
                                                onClick={handleTriggerDocumentSelect}
                                                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                                            >
                                                🔄 Replace PDF
                                            </button>

                                            <button
                                                type="button"
                                                onClick={handleRemoveDocument}
                                                className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                                            >
                                                Remove PDF
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* Upload Area when no document or being uploaded */
                                    <div
                                        onClick={handleTriggerDocumentSelect}
                                        className={`flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition ${
                                            documentStatus === "uploading"
                                                ? "border-emerald-400 bg-emerald-50/50"
                                                : "border-gray-300 bg-gray-50 hover:bg-gray-100"
                                        }`}
                                    >
                                        {documentStatus === "uploading" ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent" />
                                                <p className="text-sm font-semibold text-emerald-800">
                                                    Analyzing PDF...
                                                </p>
                                                <p className="text-xs text-emerald-600 max-w-xs">
                                                    Extracting battery voltages, capacity, energy, and cycle life specifications to save into the database.
                                                </p>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
                                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                                <p className="text-sm font-medium text-gray-700">
                                                    Click to upload Product Specification PDF
                                                </p>
                                                <p className="mt-1 text-xs text-gray-500">
                                                    PDF format (max 25MB)
                                                </p>
                                                <div className="mt-3 inline-block rounded-md bg-white px-2.5 py-1 text-xs font-medium text-gray-600 border border-gray-200 shadow-xs">
                                                    Select PDF File
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {documentStatusMsg && (
                                    <p
                                        className={`mt-2 text-xs font-medium ${
                                            documentStatus === "error"
                                                ? "text-red-600"
                                                : "text-emerald-700"
                                        }`}
                                    >
                                        {documentStatusMsg}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Extracted Specifications Section */}
                    {specifications && (
                        <div className="border-b border-gray-200 bg-slate-50/50 p-6">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg font-semibold text-gray-900">
                                            Extracted Battery Specifications (Saved to DB)
                                        </h2>
                                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                                            Instant MCP Access
                                        </span>
                                    </div>
                                    <p className="mt-1 text-sm text-gray-500">
                                        These specifications are extracted from the PDF and saved directly in the database so the MCP server accesses them instantly with zero delay.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleAppendSpecsToContent}
                                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 shadow-xs hover:bg-gray-50"
                                    title="Append these specifications to the main Product Content below"
                                >
                                    <span>➕ Add to Product Content</span>
                                </button>
                            </div>

                            <div className="mt-4">
                                <textarea
                                    id="specifications"
                                    name="specifications"
                                    rows={8}
                                    value={specifications}
                                    onChange={(e) => setSpecifications(e.target.value)}
                                    placeholder="Extracted specifications..."
                                    className="w-full resize-y rounded-xl border border-gray-300 bg-white px-4 py-3 font-mono text-xs leading-5 text-gray-800 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                                />
                                <p className="mt-1.5 text-xs text-gray-500">
                                    You can review and edit these technical specifications before saving.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Product Content */}
                    <div className="p-6">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Product Description & Content
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Add the product description, highlights, applications and other information.
                        </p>

                        <div className="mt-6">
                            <label
                                htmlFor="content"
                                className="mb-2 block text-sm font-medium text-gray-800"
                            >
                                Content
                            </label>
                            <textarea
                                id="content"
                                name="content"
                                rows={14}
                                required
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Enter the complete product description, applications, and features..."
                                className="w-full resize-y rounded-xl border border-gray-300 px-4 py-4 text-sm leading-6 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={saving || documentStatus === "uploading"}
                            className="rounded-lg bg-black px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {saving
                                ? "Saving..."
                                : isEdit
                                    ? "Update Product"
                                    : "Save Product"}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}
