
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function DashboardPage() {
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    async function loadProducts() {
        try {
            setLoading(true);
            setError("");

            const response = await fetch("/api/products", {
                cache: "no-store",
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to load products");
            }

            setProducts(data.products || []);
        } catch (err) {
            setError(err.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadProducts();
    }, []);

    const filteredProducts = products.filter((product) =>
        product.name.toLowerCase().includes(search.toLowerCase())
    );


    async function handleDelete(id) {
        const confirmed = window.confirm(
            "Are you sure you want to delete this product?"
        );

        if (!confirmed) return;

        try {
            const response = await fetch(`/api/products/${id}`, {
                method: "DELETE",
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to delete product.");
            }

            alert("Product deleted successfully!");

            // Dashboard ki product list refresh karo
            setProducts((currentProducts) =>
                currentProducts.filter((product) => product.id !== id)
            );
        } catch (error) {
            console.error("Delete product error:", error);
            alert(error.message || "Something went wrong.");
        }
    }

    return (
        <main className="min-h-screen bg-[#f7f8fa] px-4 py-8 sm:px-6">
            <div className="mx-auto max-w-7xl">
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="mb-2 text-sm text-gray-500">
                            Admin / Dashboard
                        </p>

                        <h1 className="text-3xl font-semibold text-gray-900">
                            Products
                        </h1>

                        <p className="mt-2 text-sm text-gray-500">
                            Manage your Cleanergy product catalog.
                        </p>
                    </div>

                    <Link
                        href="/admin/products/add"
                        className="inline-flex items-center justify-center rounded-lg bg-black px-5 py-3 text-sm font-medium text-white hover:bg-gray-800"
                    >
                        + Add Product
                    </Link>
                </div>

                <div className="mb-6 grid gap-4 sm:grid-cols-3  ">
                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <p className="text-sm text-gray-500">Total Products</p>
                        <p className="mt-2 text-3xl font-semibold text-gray-900">
                            {loading ? "..." : products.length}
                        </p>
                    </div>
                </div>

                <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                                All Products
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">
                                View and manage your products.
                            </p>
                        </div>

                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search product name..."
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-900 sm:max-w-xs"
                        />
                    </div>

                    {error ? (
                        <div className="p-8 text-center">
                            <p className="text-sm text-red-600">{error}</p>
                            <button
                                onClick={loadProducts}
                                className="mt-3 rounded-lg border px-4 py-2 text-sm"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : loading ? (
                        <div className="p-12 text-center text-sm text-gray-500">
                            Loading products...
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="font-medium text-gray-900">
                                {search ? "No matching products found" : "No products yet"}
                            </p>
                            <p className="mt-2 text-sm text-gray-500">
                                {search
                                    ? "Try another product name."
                                    : "Add your first product to get started."}
                            </p>

                            {!search && (
                                <Link
                                    href="/admin/products/add"
                                    className="mt-4 inline-block rounded-lg bg-black px-4 py-2.5 text-sm text-white"
                                >
                                    Add Product
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[850px] text-left text-sm">
                                <thead className="bg-gray-50 text-gray-500">
                                    <tr>
                                        <th className="px-5 py-4 font-medium">Product</th>
                                        <th className="px-5 py-4 font-medium">Price</th>
                                        <th className="px-5 py-4 font-medium">Created</th>
                                        <th className="px-5 py-4 font-medium">Updated</th>
                                        <th className="px-5 py-4 text-right font-medium">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-100">
                                    {filteredProducts.map((product) => (
                                        <tr key={product.id} className="hover:bg-gray-50">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    {product.imageUrl ? (
                                                        <img
                                                            src={product.imageUrl}
                                                            alt={product.name}
                                                            className="h-12 w-12 rounded-lg border border-gray-200 object-contain"
                                                        />
                                                    ) : (
                                                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">
                                                            No image
                                                        </div>
                                                    )}

                                                    <div className="max-w-xs">
                                                        <p className="font-medium text-gray-900">
                                                            {product.name}
                                                        </p>
                                                        <p className="mt-1 truncate text-xs text-gray-500">
                                                            {product.content}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4 font-medium text-gray-900">
                                                ${Number(product.price).toFixed(2)}
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4 text-gray-500">
                                                {product.createdAt
                                                    ? new Date(product.createdAt).toLocaleDateString()
                                                    : "—"}
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4 text-gray-500">
                                                {product.updatedAt
                                                    ? new Date(product.updatedAt).toLocaleDateString()
                                                    : "—"}
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <Link
                                                        href={`/admin/products/${product.id}`}
                                                        title="View product"
                                                        className="rounded-md border border-gray-200 px-3 py-2 hover:bg-gray-100"
                                                    >
                                                        View
                                                    </Link>

                                                    <Link

                                                        href={`/admin/products/edit/${product.id}`}
                                                        title="Edit product"
                                                        className="rounded-md border border-gray-200 px-3 py-2 hover:bg-gray-100"
                                                    >
                                                        Edit
                                                    </Link>


                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(product.id)}
                                                        className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}