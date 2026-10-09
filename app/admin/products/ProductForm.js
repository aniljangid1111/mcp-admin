"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProductForm({ mode = "add", productId }) {
    const router = useRouter();
    const isEdit = mode === "edit";

    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [content, setContent] = useState("");
    const [imagePreview, setImagePreview] = useState(null);
    const [imageName, setImageName] = useState("");
    const [documentName, setDocumentName] = useState("");
    const [existingImageUrl, setExistingImageUrl] = useState(null);
    const [existingDocumentUrl, setExistingDocumentUrl] = useState(null);
    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Edit mode: existing product load karo
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
                setExistingDocumentUrl(product.documentUrl || null);
                setDocumentName(
                    product.documentUrl
                        ? product.documentUrl.split("/").pop()
                        : ""
                );
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

    const handleDocumentChange = (event) => {
        const file = event.target.files?.[0];
        if (file) setDocumentName(file.name);
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

        setSaving(true);

        try {
            const form = event.currentTarget;
            const imageFile = form.elements.productImage.files?.[0];

            // Existing image ko preserve karo; nayi image ho toh upload karo
            let imageUrl = existingImageUrl;

            if (imageFile && imageFile.size > 0) {
                const uploadFormData = new FormData();
                uploadFormData.append("file", imageFile);

                const uploadResponse = await fetch("/api/upload", {
                    method: "POST",
                    body: uploadFormData,
                });

                const uploadData = await uploadResponse.json();

                if (!uploadResponse.ok || !uploadData.imageUrl) {
                    throw new Error(
                        uploadData.message || "Image upload failed."
                    );
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
                    // Existing document URL ko preserve karo
                    documentUrl: existingDocumentUrl,
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
                    ? "Product updated successfully!"
                    : "Product saved successfully!"
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
            <main className="min-h-screen bg-[#f7f8fa] p-8">
                <p className="text-gray-600">Loading product details...</p>
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
                                    ? "Update your existing battery product."
                                    : "Add a new Cleanergy battery product to your catalog."}
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
                                    placeholder="e.g. Cranking Sodium Ion Battery 12V 200Ah"
                                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="price"
                                    className="mb-2 block text-sm font-medium text-gray-800"
                                >
                                    Price
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
                                        placeholder="251.95"
                                        className="w-full rounded-lg border border-gray-300 py-3 pl-8 pr-4 text-sm text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-b border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Product Files
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Upload a product image and optionally select a specification document.
                        </p>

                        <div className="mt-6 grid gap-6 md:grid-cols-2">
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
                                                <p className="text-sm font-medium text-gray-700">
                                                    Upload product image
                                                </p>
                                                <p className="mt-1 text-xs text-gray-500">
                                                    PNG, JPG or WEBP
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <input
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

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-800">
                                    Product Document
                                    <span className="ml-2 font-normal text-gray-400">
                                        Optional
                                    </span>
                                </label>

                                <label
                                    htmlFor="productDocument"
                                    className="flex min-h-[260px] cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 hover:bg-gray-100"
                                >
                                    <div className="text-center">
                                        <p className="text-sm font-medium text-gray-700">
                                            {documentName || "Select product document"}
                                        </p>
                                        <p className="mt-1 text-xs text-gray-500">
                                            PDF or DOCX
                                        </p>
                                        {existingDocumentUrl && (
                                            <a
                                                href={existingDocumentUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="mt-3 inline-block text-sm text-blue-600 underline"
                                            >
                                                View existing document
                                            </a>
                                        )}
                                    </div>

                                    <input
                                        id="productDocument"
                                        name="productDocument"
                                        type="file"
                                        accept=".pdf,.doc,.docx"
                                        onChange={handleDocumentChange}
                                        className="hidden"
                                    />
                                </label>
                                <p className="mt-2 text-xs text-gray-500">
                                    Document upload and replacement are not connected yet.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Product Content
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Add the product description, specifications and applications.
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
                                rows={16}
                                required
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Enter the complete product description, specifications, applications and other available information..."
                                className="w-full resize-y rounded-xl border border-gray-300 px-4 py-4 text-sm leading-6 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                            />
                        </div>
                    </div>

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
                            disabled={saving}
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
