/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    paidOrders: 0,
    pendingOrders: 0,
    cancelledOrders: 0,
    failedOrders: 0,
    totalRevenue: 0,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Manual refresh helper
  async function refreshOrders() {
    setLoading(true);
    try {
      setError("");
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });
      if (statusFilter && statusFilter !== "ALL") params.set("status", statusFilter);
      if (search && search.trim() !== "") params.set("search", search.trim());

      const response = await fetch(`/api/orders?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load orders");
      }

      setOrders(data.orders || []);
      if (data.stats) setStats(data.stats);
      if (data.pagination) setPagination(data.pagination);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // Effect to load and filter with debounce
  useEffect(() => {
    let ignore = false;

    const timer = setTimeout(async () => {
      try {
        setError("");
        const params = new URLSearchParams({
          page: page.toString(),
          limit: pageSize.toString(),
        });
        if (statusFilter && statusFilter !== "ALL") params.set("status", statusFilter);
        if (search && search.trim() !== "") params.set("search", search.trim());

        const response = await fetch(`/api/orders?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await response.json();

        if (!ignore) {
          if (!response.ok) {
            throw new Error(data.message || "Failed to load orders");
          }
          setOrders(data.orders || []);
          if (data.stats) setStats(data.stats);
          if (data.pagination) setPagination(data.pagination);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || "Something went wrong");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [page, pageSize, statusFilter, search]);

  // Copy order ID helper
  function handleCopyId(id) {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  // Update order status
  async function handleUpdateStatus(orderId, newStatus) {
    try {
      setStatusUpdating(true);
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to update status");
      }

      // Update in local state
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );

      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => ({ ...prev, status: newStatus }));
      }

      // Refresh stats
      refreshOrders();
    } catch (err) {
      alert(err.message || "Could not update order status");
    } finally {
      setStatusUpdating(false);
    }
  }

  // Helper for status badge styling
  function getStatusBadge(status) {
    switch (status) {
      case "PAID":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            Paid
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-600/20">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
            Pending
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-600/20">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-400"></span>
            Cancelled
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-600/20">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
            {status}
          </span>
        );
    }
  }

  function formatPrice(cents, currency = "USD") {
    if (cents === null || cents === undefined) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  }

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl">
        {/* Navigation Tabs Header */}
        <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
          <nav className="flex space-x-6">
            <Link
              href="/admin/dashboard"
              className="text-sm font-medium text-gray-500 transition hover:text-gray-900"
            >
              Products
            </Link>
            <Link
              href="/admin/orders"
              className="border-b-2 border-black pb-2 text-sm font-semibold text-gray-900"
            >
              Orders
            </Link>
          </nav>

          <button
            onClick={refreshOrders}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
          >
            <svg
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>

        {/* Page Title & Breadcrumb */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-sm text-gray-500">Admin / Orders</p>
            <h1 className="text-3xl font-semibold text-gray-900">Orders</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage and track customer orders, payment statuses, and fulfillment.
            </p>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                Total Orders
              </p>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900 sm:text-3xl">
              {loading && !stats.totalOrders ? "..." : stats.totalOrders}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                Total Revenue
              </p>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-emerald-600 sm:text-3xl">
              {loading && !stats.totalRevenue ? "..." : formatPrice(stats.totalRevenue)}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                Paid Orders
              </p>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900 sm:text-3xl">
              {loading && !stats.paidOrders ? "..." : stats.paidOrders}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                Pending Orders
              </p>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900 sm:text-3xl">
              {loading && !stats.pendingOrders ? "..." : stats.pendingOrders}
            </p>
          </div>
        </div>

        {/* Orders Table Container */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {/* Header toolbar with search & status filters */}
          <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            {/* Status pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { label: "All", value: "ALL", count: stats.totalOrders },
                {
                  label: "Paid",
                  value: "PAID",
                  count: stats.paidOrders,
                },
                {
                  label: "Pending",
                  value: "PENDING",
                  count: stats.pendingOrders,
                },
                {
                  label: "Cancelled",
                  value: "CANCELLED",
                  count: stats.cancelledOrders,
                },
                {
                  label: "Failed",
                  value: "FAILED",
                  count: stats.failedOrders,
                },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => {
                    setStatusFilter(tab.value);
                    setPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    statusFilter === tab.value
                      ? "bg-black text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                      statusFilter === tab.value
                        ? "bg-gray-800 text-white"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search input */}
            <div className="relative">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search orders, customers, items..."
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-4 text-xs sm:text-sm text-gray-900 outline-none transition focus:border-black focus:ring-1 focus:ring-black sm:w-72"
              />
            </div>
          </div>

          {/* Table State Handling */}
          {error ? (
            <div className="p-12 text-center">
              <p className="text-sm font-medium text-rose-600">{error}</p>
              <button
                onClick={refreshOrders}
                className="mt-3 rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Try Again
              </button>
            </div>
          ) : loading && orders.length === 0 ? (
            <div className="p-16 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-gray-900 border-r-transparent"></div>
              <p className="mt-3 text-sm text-gray-500">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="mt-4 font-medium text-gray-900">
                {search || statusFilter !== "ALL"
                  ? "No matching orders found"
                  : "No orders yet"}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {search || statusFilter !== "ALL"
                  ? "Try adjusting your search terms or filters."
                  : "When customers complete checkout, orders will appear here."}
              </p>
              {(search || statusFilter !== "ALL") && (
                <button
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("ALL");
                    setPage(1);
                  }}
                  className="mt-4 inline-block rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-5 py-3.5">Order ID</th>
                    <th className="px-5 py-3.5">Customer</th>
                    <th className="px-5 py-3.5">Items</th>
                    <th className="px-5 py-3.5">Total Amount</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {orders.map((order) => {
                    const itemCount =
                      order.items?.reduce((sum, it) => sum + it.quantity, 0) || 0;
                    const firstItem = order.items?.[0];

                    return (
                      <tr
                        key={order.id}
                        className="transition hover:bg-gray-50/80"
                      >
                        {/* Order ID */}
                        <td className="whitespace-nowrap px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-medium text-gray-900">
                              #{order.id.slice(0, 8)}...{order.id.slice(-4)}
                            </span>
                            <button
                              onClick={() => handleCopyId(order.id)}
                              title="Copy full Order ID"
                              className="text-gray-400 hover:text-gray-600"
                            >
                              {copiedId === order.id ? (
                                <span className="text-[10px] text-emerald-600 font-medium">Copied!</span>
                              ) : (
                                <svg
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                  />
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-medium text-gray-900">
                              {order.customerName || "Guest Customer"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {order.customerEmail || "No email provided"}
                            </p>
                            {order.customerPhone && (
                              <p className="text-[11px] text-gray-400">
                                {order.customerPhone}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Items Preview */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            {firstItem?.imageUrl ? (
                              <img
                                src={firstItem.imageUrl}
                                alt={firstItem.productName}
                                className="h-9 w-9 rounded-md border border-gray-200 object-contain bg-white"
                              />
                            ) : (
                              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gray-100 text-[10px] text-gray-400">
                                Item
                              </div>
                            )}
                            <div className="max-w-[200px]">
                              <p className="truncate text-xs font-medium text-gray-800">
                                {firstItem?.productName || "No items"}
                              </p>
                              <p className="text-[11px] text-gray-500">
                                {itemCount} {itemCount === 1 ? "item" : "items"}
                                {order.items?.length > 1 &&
                                  ` (+${order.items.length - 1} more)`}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Total Amount */}
                        <td className="whitespace-nowrap px-5 py-4">
                          <span className="font-semibold text-gray-900">
                            {formatPrice(order.totalAmount, order.currency)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="whitespace-nowrap px-5 py-4">
                          {getStatusBadge(order.status)}
                        </td>

                        {/* Date */}
                        <td className="whitespace-nowrap px-5 py-4 text-xs text-gray-500">
                          {formatDate(order.createdAt)}
                        </td>

                        {/* Actions */}
                        <td className="whitespace-nowrap px-5 py-4 text-right">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls Footer */}
          {!loading && !error && pagination.total > 0 && (
            <div className="flex flex-col gap-3 border-t border-gray-200 bg-white px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              {/* Left stats & limit select */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
                <span>
                  Showing{" "}
                  <span className="font-semibold text-gray-900">
                    {Math.min((page - 1) * pageSize + 1, pagination.total)}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-gray-900">
                    {Math.min(page * pageSize, pagination.total)}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-gray-900">
                    {pagination.total}
                  </span>{" "}
                  orders
                </span>

                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400">Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-800 shadow-xs outline-none focus:border-black"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              {/* Right pagination navigation buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-xs transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Previous
                </button>

                {/* Page number buttons */}
                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      return (
                        p === 1 ||
                        p === pagination.totalPages ||
                        Math.abs(p - page) <= 1
                      );
                    })
                    .map((p, idx, arr) => {
                      const prevP = arr[idx - 1];
                      const hasGap = prevP && p - prevP > 1;

                      return (
                        <div key={p} className="flex items-center">
                          {hasGap && (
                            <span className="px-1 text-xs text-gray-400">...</span>
                          )}
                          <button
                            onClick={() => setPage(p)}
                            className={`h-7 w-7 rounded-lg text-xs font-medium transition ${
                              p === page
                                ? "bg-black text-white"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            {p}
                          </button>
                        </div>
                      );
                    })}
                </div>

                <button
                  onClick={() =>
                    setPage((p) => Math.min(pagination.totalPages, p + 1))
                  }
                  disabled={page >= pagination.totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-xs transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Order Details Modal / Drawer */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      Order Details
                    </h3>
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                  <p className="text-xs text-gray-500">
                    ID: {selectedOrder.id} • Placed on {formatDate(selectedOrder.createdAt)}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedOrder(null)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                {/* Status Update Bar */}
                <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3.5 border border-gray-200">
                  <div>
                    <p className="text-xs font-medium text-gray-900">Change Order Status</p>
                    <p className="text-[11px] text-gray-500">Update current state of this order</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedOrder.status}
                      disabled={statusUpdating}
                      onChange={(e) =>
                        handleUpdateStatus(selectedOrder.id, e.target.value)
                      }
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 shadow-sm outline-none focus:border-black"
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="PAID">PAID</option>
                      <option value="CANCELLED">CANCELLED</option>
                      <option value="FAILED">FAILED</option>
                    </select>
                  </div>
                </div>

                {/* Items Purchased */}
                <div>
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
                    Items ({selectedOrder.items?.length || 0})
                  </h4>
                  <div className="divide-y divide-gray-100 rounded-xl border border-gray-200">
                    {selectedOrder.items?.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3.5"
                      >
                        <div className="flex items-center gap-3">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.productName}
                              className="h-12 w-12 rounded-lg border border-gray-200 object-contain bg-white"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">
                              Item
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {item.productName}
                            </p>
                            <p className="text-xs text-gray-500">
                              Qty: {item.quantity} × {formatPrice(item.unitPrice, selectedOrder.currency)}
                            </p>
                          </div>
                        </div>

                        <p className="text-sm font-bold text-gray-900">
                          {formatPrice(item.unitPrice * item.quantity, selectedOrder.currency)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Customer & Shipping Details */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-gray-200 p-4">
                    <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                      Customer Information
                    </h4>
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedOrder.customerName || "N/A"}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Email: {selectedOrder.customerEmail || "N/A"}
                    </p>
                    <p className="text-xs text-gray-600">
                      Phone: {selectedOrder.customerPhone || "N/A"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-200 p-4">
                    <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                      Shipping Address
                    </h4>
                    {selectedOrder.addressLine1 ? (
                      <div className="text-xs text-gray-700 space-y-0.5">
                        <p>{selectedOrder.addressLine1}</p>
                        {selectedOrder.addressLine2 && <p>{selectedOrder.addressLine2}</p>}
                        <p>
                          {[
                            selectedOrder.city,
                            selectedOrder.state,
                            selectedOrder.postalCode,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                        <p className="font-medium text-gray-900">
                          {selectedOrder.country || ""}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">
                        No address provided for this order.
                      </p>
                    )}
                  </div>
                </div>

                {/* Payment & Breakdown Summary */}
                <div className="rounded-xl border border-gray-200 p-4 bg-gray-50/50">
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
                    Payment Summary
                  </h4>

                  <div className="space-y-2 text-xs text-gray-600 border-b border-gray-200 pb-3">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>
                        {formatPrice(selectedOrder.subtotalAmount, selectedOrder.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold text-gray-900 text-sm pt-1">
                      <span>Total Amount</span>
                      <span>
                        {formatPrice(selectedOrder.totalAmount, selectedOrder.currency)}
                      </span>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="mt-3 text-xs text-gray-500 space-y-1">
                    <div className="flex justify-between">
                      <span>Payment Status:</span>
                      <span className="font-medium text-gray-800">
                        {selectedOrder.payment?.status || selectedOrder.status}
                      </span>
                    </div>
                    {selectedOrder.payment?.stripeCheckoutSessionId && (
                      <div className="flex justify-between">
                        <span>Stripe Session:</span>
                        <span className="font-mono text-[11px] text-gray-700 truncate max-w-[240px]">
                          {selectedOrder.payment.stripeCheckoutSessionId}
                        </span>
                      </div>
                    )}
                    {selectedOrder.payment?.stripePaymentIntentId && (
                      <div className="flex justify-between">
                        <span>Payment Intent:</span>
                        <span className="font-mono text-[11px] text-gray-700 truncate max-w-[240px]">
                          {selectedOrder.payment.stripePaymentIntentId}
                        </span>
                      </div>
                    )}
                    {selectedOrder.payment?.paidAt && (
                      <div className="flex justify-between">
                        <span>Paid At:</span>
                        <span>{formatDate(selectedOrder.payment.paidAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end border-t border-gray-200 px-6 py-3">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="rounded-lg bg-black px-4 py-2 text-xs font-medium text-white hover:bg-gray-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
