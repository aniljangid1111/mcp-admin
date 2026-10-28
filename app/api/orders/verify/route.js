import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { markOrderPaid } from "@/lib/stripe-order";
import { authenticateAdminRequest } from "@/lib/auth";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function GET(request) {
  try {
    // 1. Rate limiting: 30 verification checks per minute per IP
    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimit(`verify:${clientIp}`, 30, 60);
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit);
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");
    const sessionId = searchParams.get("session_id");

    if (!orderId || !sessionId) {
      return NextResponse.json(
        { success: false, error: "Order ID and session ID are required." },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payment: true,
      },
    });

    if (
      !order ||
      !order.payment ||
      order.payment.stripeCheckoutSessionId !== sessionId
    ) {
      return NextResponse.json(
        { success: false, error: "Order or payment session not found." },
        { status: 404 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (
      session.metadata?.orderId !== order.id ||
      (session.client_reference_id && session.client_reference_id !== order.id)
    ) {
      return NextResponse.json(
        { success: false, error: "Payment session does not match this order." },
        { status: 403 }
      );
    }

    if (session.payment_status === "paid") {
      await markOrderPaid(session);
    } else if (session.status === "expired") {
      // Cancel expired order if still pending
      await prisma.$transaction([
        prisma.order.updateMany({
          where: { id: orderId, status: "PENDING" },
          data: { status: "CANCELLED" },
        }),
        prisma.payment.updateMany({
          where: { orderId, status: "PENDING" },
          data: { status: "FAILED" },
        }),
      ]).catch(console.error);
    }

    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payment: true },
    });

    if (!updatedOrder) {
      return NextResponse.json(
        { success: false, error: "Order not found after update." },
        { status: 404 }
      );
    }

    // STRICT STATUS VALIDATION: Only marked PAID if Stripe confirmed paid
    let verifiedStatus;
    if (session.payment_status === "paid" && updatedOrder.status === "PAID") {
      verifiedStatus = "PAID";
    } else if (updatedOrder.status === "FAILED" || session.status === "expired") {
      verifiedStatus = "FAILED";
    } else if (updatedOrder.status === "CANCELLED") {
      verifiedStatus = "CANCELLED";
    } else {
      verifiedStatus = "PENDING";
    }

    // Check if caller is an authorized Admin
    const admin = await authenticateAdminRequest(request);

    if (admin) {
      // Full order information returned only to authenticated administrators
      return NextResponse.json({
        success: true,
        status: verifiedStatus,
        order: {
          ...updatedOrder,
          status: verifiedStatus,
        },
      });
    }

    // PUBLIC MINIMIZED RESPONSE: Exclude customer PII and internal payment secrets
    const sanitizedOrder = {
      id: updatedOrder.id,
      status: verifiedStatus,
      currency: updatedOrder.currency,
      totalAmount: updatedOrder.totalAmount,
      subtotalAmount: updatedOrder.subtotalAmount,
      items: (updatedOrder.items || []).map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        imageUrl: item.imageUrl,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
      })),
      payment: {
        status: verifiedStatus,
      },
      createdAt: updatedOrder.createdAt,
    };

    return NextResponse.json({
      success: true,
      status: verifiedStatus,
      order: sanitizedOrder,
    });
  } catch (error) {
    console.error("Order verification error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to verify payment." },
      { status: 500 }
    );
  }
}