"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ViewProductClient({ productId }) {
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadProduct() {
            try {
                const response = await fetch(`/api/products/${productId}`);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Failed to load product");
                }

                setProduct(data.product);
            } catch (err) {
                setError(err.message || "Something went wrong");
            } finally {
                setLoading(false);
            }
        }

      if (productId) loadProduct();
    }, [productId]);

    if (loading) {
        return (
            <main className="flex min-h-[70vh] items-center justify-center bg-[#f7f8fa] px-4">
                <div className="flex flex-col items-center gap-3 text-center">
                    <div className="h-9 w-9 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent" />
                    <p className="text-sm font-medium text-slate-600">Loading product...</p>
                </div>
            </main>
        );
    }

    if (error || !product) {
        return (
            <main className="flex min-h-[70vh] items-center justify-center bg-[#f7f8fa] px-4">
                <div className="flex flex-col items-center gap-3 text-center">
                    <p className="text-sm font-medium text-rose-600">{error || "Product not found"}</p>
                    <Link
                        href="/admin/dashboard"
                        className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                        ← Back to Products
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#f7f8fa] px-4 py-8 sm:px-6">
            <div className="mx-auto max-w-4xl">
                <Link
                    href="/admin/dashboard"
                    className="text-sm text-gray-500 hover:text-black"
                >
                    ← Back to Products
                </Link>

                <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900">
                                Product Details
                            </h1>
                            <p className="mt-2 text-sm text-gray-500">
                                View complete product information.
                            </p>
                        </div>

                        <Link
                            href={`/admin/products/edit/${product.id}`}
                            className="rounded-lg bg-black px-5 py-2.5 text-center text-sm text-white hover:bg-gray-800"
                        >
                            Edit Product
                        </Link>
                    </div>

                    {product.imageUrl ? (
                        <div className="mt-8 flex min-h-64 items-center justify-center rounded-xl bg-gray-50 p-4">
                            <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="max-h-80 max-w-full object-contain"
                            />
                        </div>
                    ) : (
                        <div className="mt-8 flex h-64 items-center justify-center rounded-xl bg-gray-50 text-gray-400">
                            No product image available
                        </div>
                    )}

                    <div className="mt-8 grid gap-6 sm:grid-cols-2">
                        <div>
                            <p className="text-sm text-gray-500">Product Name</p>
                            <p className="mt-1 font-medium text-gray-900">
                                {product.name}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-gray-500">Price</p>
                            <p className="mt-1 font-medium text-gray-900">
                                ${Number(product.price).toFixed(2)}
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 border-t border-gray-200 pt-6">
                        <h2 className="font-semibold text-gray-900">
                            Product Description
                        </h2>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-600">
                            {product.content}
                        </p>
                    </div>

                    {product.specifications && (
                        <div className="mt-8 rounded-xl border border-gray-200 bg-slate-50/70 p-6">
                            <div className="flex items-center gap-2">
                                <h2 className="font-semibold text-gray-900">
                                    Technical Specifications (Extracted from PDF)
                                </h2>
                                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                                    Database Saved
                                </span>
                            </div>
                            <div className="mt-3 whitespace-pre-wrap font-mono text-xs leading-6 text-gray-800">
                                {product.specifications}
                            </div>
                        </div>
                    )}

                    {product.documentUrl && (
                        <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600">
                                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {product.documentName || "Product Specification Document"}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Attached PDF document
                                        </p>
                                    </div>
                                </div>

                                <a
                                    href={product.documentUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-emerald-700 shadow-xs hover:bg-emerald-50"
                                >
                                    <span>View / Download PDF</span>
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}