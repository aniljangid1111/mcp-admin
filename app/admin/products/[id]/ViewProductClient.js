
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
        return <main className="p-8 text-gray-500">Loading product...</main>;
    }

    if (error || !product) {
        return (
            <main className="p-8">
                <p className="text-red-600">{error || "Product not found"}</p>
                <Link
                    href="/admin/dashboard"
                    className="mt-4 inline-block underline"
                >
                    Back to Products
                </Link>
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

                    {product.documentUrl && (
                        <div className="mt-6">
                            <a
                                href={product.documentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm font-medium text-blue-600 underline"
                            >
                                View Product Document
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}