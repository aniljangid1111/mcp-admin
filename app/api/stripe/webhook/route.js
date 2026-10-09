
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { markOrderPaid } from "@/lib/stripe-order";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing Stripe webhook configuration" },
      { status: 400 }
    );
  }

  let event;

  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error("Invalid Stripe webhook signature:", error.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const session = event.data.object;

    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        if (session.payment_status === "paid") {
          await markOrderPaid(session);
        }
        break;
      }

      case "checkout.session.expired": {
        const orderId = session.metadata?.orderId;
        if (orderId) {
          await prisma.$transaction(async (tx) => {
            await tx.order.updateMany({
              where: { id: orderId, status: "PENDING" },
              data: { status: "CANCELLED" },
            });
            await tx.payment.updateMany({
              where: { orderId, status: "PENDING" },
              data: { status: "FAILED" },
            });
          });
        }
        break;
      }

      case "checkout.session.async_payment_failed": {
        const orderId = session.metadata?.orderId;
        if (orderId) {
          await prisma.$transaction(async (tx) => {
            await tx.order.updateMany({
              where: { id: orderId, status: "PENDING" },
              data: { status: "FAILED" },
            });
            await tx.payment.updateMany({
              where: { orderId, status: "PENDING" },
              data: { status: "FAILED" },
            });
          });
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}