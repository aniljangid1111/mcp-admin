
import { prisma } from "@/lib/prisma";
import { sendOrderConfirmationEmail } from "@/lib/mail";

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

  // Security check: verify paid amount and currency
  if (
    typeof session.amount_total === "number" &&
    session.amount_total < payment.amount
  ) {
    throw new Error(
      `Amount paid (${session.amount_total}) is less than order amount (${payment.amount})`
    );
  }

  if (
    session.currency &&
    payment.currency &&
    session.currency.toLowerCase() !== payment.currency.toLowerCase()
  ) {
    throw new Error(
      `Currency mismatch: expected ${payment.currency}, got ${session.currency}`
    );
  }

  const customer = session.customer_details;
  const address =
    session.shipping_details?.address ||
    customer?.address ||
    null;

  let isNewlyPaid = false;

  await prisma.$transaction(async (tx) => {
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
    isNewlyPaid = true;

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

  // Send branded email confirmation to customer (and owner if configured)
  if (isNewlyPaid) {
    try {
      const fullOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          payment: true,
        },
      });

      if (fullOrder) {
        await sendOrderConfirmationEmail(fullOrder);
      }
    } catch (err) {
      console.error("[Mail] Error sending confirmation email for order:", err);
    }
  }

  return true;
}