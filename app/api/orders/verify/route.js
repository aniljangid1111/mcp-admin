
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { markOrderPaid } from "@/lib/stripe-order";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const orderId = searchParams.get("orderId");
        const sessionId = searchParams.get("session_id");

        if (!orderId || !sessionId) {
            return NextResponse.json(
                { success: false, error: "Order ID and session ID are required" },
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
                { success: false, error: "Order or payment session not found" },
                { status: 404 }
            );
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (
            session.metadata?.orderId !== order.id ||
            session.client_reference_id && session.client_reference_id !== order.id
        ) {
            return NextResponse.json(
                { success: false, error: "Payment session does not match this order" },
                { status: 403 }
            );
        }

        if (session.payment_status === "paid") {
            await markOrderPaid(session);
        }

        const updatedOrder = await prisma.order.findUnique({
            where: { id: orderId },
            include: { items: true, payment: true },
        });

        const status =
            updatedOrder.status === "PAID"
                ? "PAID"
                : updatedOrder.status === "FAILED"
                    ? "FAILED"
                    : updatedOrder.status === "CANCELLED" ||
                        session.status === "expired"
                        ? "CANCELLED"
                        : "PENDING";

        return NextResponse.json({
            success: true,
            status,
            order: updatedOrder,
        });
    } catch (error) {
        console.error("Order verification error:", error);
        return NextResponse.json(
            { success: false, error: "Unable to verify payment" },
            { status: 500 }
        );
    }
}