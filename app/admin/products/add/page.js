"use client";

import { useState } from "react";

export default function AddProductPage() {
    const [imagePreview, setImagePreview] = useState(null);
    const [imageName, setImageName] = useState("");
    const [documentName, setDocumentName] = useState("");

    const handleImageChange = (event) => {
        const file = event.target.files?.[0];

        if (!file) return;

        setImageName(file.name);

        const imageUrl = URL.createObjectURL(file);
        setImagePreview(imageUrl);
    };

    const handleDocumentChange = (event) => {
        const file = event.target.files?.[0];

        if (!file) return;

        setDocumentName(file.name);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);

        const name = formData.get("productName");
        const price = formData.get("price");
        const content = formData.get("content");

        if (!name || !price || !content) {
            alert("Please fill Product Name, Price and Content.");
            return;
        }

        try {
            const response = await fetch("/api/products", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name,
                    price,
                    content,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || "Failed to create product");
                return;
            }

            alert("Product saved successfully!");

            event.currentTarget.reset();

            setImagePreview(null);
            setImageName("");
            setDocumentName("");
        } catch (error) {
            console.error(error);
            alert("Something went wrong while saving product.");
        }
    };

    return (
        <main className="min-h-screen bg-[#f7f8fa] px-6 py-8">
            <div className="mx-auto max-w-5xl">

                {/* Header */}
                <div className="mb-8">
                    <p className="mb-2 text-sm font-medium text-gray-500">
                        Products
                    </p>

                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
                                Add Product
                            </h1>

                            <p className="mt-2 text-sm text-gray-500">
                                Add a new Cleanergy battery product to your catalog.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                    </div>
                </div>

                {/* Form Card */}
                <form
                    onSubmit={handleSubmit}
                    className="rounded-2xl border border-gray-200 bg-white shadow-sm">

                    {/* Basic Information */}
                    <div className="border-b border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Product Information
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                            Enter the basic information of the battery.
                        </p>

                        <div className="mt-6 grid gap-6 md:grid-cols-2">

                            {/* Product Name */}
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
                                    placeholder="e.g. Cranking Sodium Ion Battery 12V 200Ah"
                                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                                />
                            </div>

                            {/* Price */}
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
                                        placeholder="251.95"
                                        className="w-full rounded-lg border border-gray-300 py-3 pl-8 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                                    />
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Product Files */}
                    <div className="border-b border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Product Files
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                            Upload the product image and optional specification document.
                        </p>

                        <div className="mt-6 grid gap-6 md:grid-cols-2">

                            {/* Product Image */}
                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-800">
                                    Product Image
                                </label>

                                <label
                                    htmlFor="productImage"
                                    className="group block cursor-pointer"
                                >
                                    <div className="flex min-h-[260px] items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 transition hover:border-gray-500 hover:bg-gray-100">

                                        {imagePreview ? (
                                            <div className="w-full">
                                                <img
                                                    src={imagePreview}
                                                    alt="Product preview"
                                                    className="mx-auto h-48 w-full rounded-lg object-contain"
                                                />

                                                <p className="mt-3 truncate text-center text-xs text-gray-500">
                                                    {imageName}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="text-center">
                                                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                                                    <svg
                                                        width="22"
                                                        height="22"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="1.8"
                                                        className="text-gray-500"
                                                    >
                                                        <rect
                                                            x="3"
                                                            y="3"
                                                            width="18"
                                                            height="18"
                                                            rx="2"
                                                        />
                                                        <circle cx="8.5" cy="8.5" r="1.5" />
                                                        <path d="m21 15-5-5L5 21" />
                                                    </svg>
                                                </div>

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
                            </div>

                            {/* PDF / DOCX */}
                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-800">
                                    Product Document
                                    <span className="ml-2 font-normal text-gray-400">
                                        Optional
                                    </span>
                                </label>

                                <label
                                    htmlFor="productDocument"
                                    className="block cursor-pointer"
                                >
                                    <div className="flex min-h-[260px] items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 transition hover:border-gray-500 hover:bg-gray-100">

                                        <div className="text-center">
                                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                                                <svg
                                                    width="22"
                                                    height="22"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="1.8"
                                                >
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                    <path d="M14 2v6h6" />
                                                    <path d="M8 13h8" />
                                                    <path d="M8 17h5" />
                                                </svg>
                                            </div>

                                            {documentName ? (
                                                <>
                                                    <p className="text-sm font-medium text-gray-800">
                                                        {documentName}
                                                    </p>

                                                    <p className="mt-1 text-xs text-gray-500">
                                                        Document selected
                                                    </p>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="text-sm font-medium text-gray-700">
                                                        Upload product document
                                                    </p>

                                                    <p className="mt-1 text-xs text-gray-500">
                                                        PDF or DOCX
                                                    </p>
                                                </>
                                            )}
                                        </div>
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
                            </div>

                        </div>
                    </div>

                    {/* Product Content */}
                    <div className="p-6">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Product Content
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                            Paste the complete product description, specifications,
                            applications and other available information.
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
                                placeholder={`Example:

The Cranking Sodium Battery is designed for high-demand engines, marine applications, and other vehicles requiring dependable power.

High Cold Cranking Power:
Designed for high-demand engines and vehicles with 1300 CCA.

Lightweight & Easy to Handle:
Weighing only 25 lbs.

Extended Usage:
Provides 200Ah capacity and 2,400Wh energy.

Consistent Voltage:
Provides a stable 12V output with a 14.6V charging voltage.

High Amp Support:
Supports continuous charge/discharge up to 100A.

...`}
                                className="w-full resize-y rounded-xl border border-gray-300 px-4 py-4 text-sm leading-6 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                            />

                            <p className="mt-2 text-xs text-gray-400">
                                You can paste the complete content here. AI processing will be
                                handled later.
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
                        <button
                            type="button"
                            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="rounded-lg bg-black px-6 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
                        >
                            Save Product
                        </button>
                    </div>

                </form>
            </div>
        </main>
    );
}