
import { prisma } from "@/lib/prisma";

export async function markOrderPaid(session) {
  const orderId = session.metadata?.orderId;
  if (!orderId || session.payment_status !== "paid") return false;

  const payment = await prisma.payment.findUnique({
    where: { orderId },
  });

  // Do not accept a session that is not linked to this order.
  if (
    !payment ||
    payment.stripeCheckoutSessionId !== session.id
  ) {
    throw new Error("Stripe session does not match the order");
  }

  const customer = session.customer_details;
  const address =
    session.shipping_details?.address ||
    customer?.address ||
    null;

  return prisma.$transaction(async (tx) => {
    const result = await tx.payment.updateMany({
      where: { orderId, status: { not: "PAID" } },
      data: {
        status: "PAID",
        stripePaymentIntentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id,
        amount: session.amount_total ?? payment.amount,
        currency: session.currency ?? payment.currency,
        paidAt: new Date(),
      },
    });

    // Already processed: makes repeated webhook deliveries safe.
    if (result.count === 0) return true;

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "PAID",
        totalAmount: session.amount_total ?? payment.amount,
        customerName:
          session.shipping_details?.name || customer?.name || null,
        customerEmail: customer?.email || session.customer_email || null,
        customerPhone: customer?.phone || null,
        addressLine1: address?.line1 || null,
        addressLine2: address?.line2 || null,
        city: address?.city || null,
        state: address?.state || null,
        postalCode: address?.postal_code || null,
        country: address?.country || null,
      },
    });

    // Clear the cart only after confirmed payment.
    const cartId = session.metadata?.cartId;
    if (cartId) {
      await tx.cartItem.deleteMany({ where: { cartId } });
      await tx.cart.update({
        where: { id: cartId },
        data: { total: 0, totalQuantity: 0 },
      });
    }

    return true;
  });
}