import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const pageParam = parseInt(searchParams.get("page") || "1", 10);
    const limitParam = parseInt(searchParams.get("limit") || "10", 10);

    const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    const limit = isNaN(limitParam) || limitParam < 1 ? 10 : limitParam;
    const skip = (page - 1) * limit;

    const where = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (search && search.trim() !== "") {
      const q = search.trim();
      where.OR = [
        { id: { contains: q, mode: "insensitive" } },
        { customerName: { contains: q, mode: "insensitive" } },
        { customerEmail: { contains: q, mode: "insensitive" } },
        { customerPhone: { contains: q, mode: "insensitive" } },
        { items: { some: { productName: { contains: q, mode: "insensitive" } } } },
      ];
    }

    const [totalMatching, orders, allOrders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          items: true,
          payment: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.order.findMany({
        select: {
          status: true,
          totalAmount: true,
        },
      }),
    ]);

    const totalPages = Math.ceil(totalMatching / limit) || 1;

    const stats = {
      totalOrders: allOrders.length,
      paidOrders: allOrders.filter((o) => o.status === "PAID").length,
      pendingOrders: allOrders.filter((o) => o.status === "PENDING").length,
      cancelledOrders: allOrders.filter((o) => o.status === "CANCELLED").length,
      failedOrders: allOrders.filter((o) => o.status === "FAILED").length,
      totalRevenue: allOrders
        .filter((o) => o.status === "PAID")
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0),
    };

    return NextResponse.json({
      success: true,
      orders,
      pagination: {
        total: totalMatching,
        page,
        limit,
        totalPages,
      },
      stats,
    });
  } catch (error) {
    console.error("Get orders error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch orders",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
