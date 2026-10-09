
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
    let orderId;

    try {
        const { cartId } = await request.json();

        if (!cartId) {
            return NextResponse.json(
                { success: false, error: "Cart ID is required" },
                { status: 400 }
            );
        }

        const cart = await prisma.cart.findUnique({
            where: { id: cartId },
            include: {
                items: { include: { product: true } },
            },
        });

        if (!cart) {
            return NextResponse.json(
                { success: false, error: "Cart not found" },
                { status: 404 }
            );
        }

        if (!cart.items.length) {
            return NextResponse.json(
                { success: false, error: "Cart is empty" },
                { status: 400 }
            );
        }

        const items = cart.items.map((item) => ({
            productId: item.productId,
            productName: item.product.name,
            imageUrl: item.product.imageUrl,
            unitPrice: Math.round(Number(item.price) * 100),
            quantity: item.quantity,
        }));

        const subtotalAmount = items.reduce(
            (sum, item) => sum + item.unitPrice * item.quantity,
            0
        );

        // Create a pending order before redirecting to Stripe.
        const order = await prisma.order.create({
            data: {
                cartId: cart.id,
                currency: cart.currencyCode.toLowerCase(),
                subtotalAmount,
                totalAmount: subtotalAmount,
                items: {
                    create: items,
                },
                payment: {
                    create: {
                        amount: subtotalAmount,
                        currency: cart.currencyCode.toLowerCase(),
                    },
                },
            },
        });

        orderId = order.id;

        const baseUrl = process.env.MCP_BASE_URL?.replace(/\/$/, "");

        if (!baseUrl) {
            throw new Error("MCP_BASE_URL is not configured");
        }

        const session = await stripe.checkout.sessions.create({
            mode: "payment",

            line_items: items.map((item) => ({
                price_data: {
                    currency: cart.currencyCode.toLowerCase(),
                    product_data: {
                        name: item.productName,
                        ...(item.imageUrl ? { images: [item.imageUrl] } : {}),
                    },
                    unit_amount: item.unitPrice,
                },
                quantity: item.quantity,
            })),

            // Collect contact details at Stripe Checkout.
            phone_number_collection: { enabled: true },
            billing_address_collection: "required",
            shipping_address_collection: {
                // Change this list to countries you actually ship to.
                allowed_countries: ["US"],
            },

            success_url:
                `${baseUrl}/checkout?orderId=${order.id}` +
                `&session_id={CHECKOUT_SESSION_ID}`,

            cancel_url:
                `${baseUrl}/checkout?orderId=${order.id}&status=cancelled`,

            metadata: {
                orderId: order.id,
                cartId: cart.id,
            },
        });

        await prisma.payment.update({
            where: { orderId: order.id },
            data: { stripeCheckoutSessionId: session.id },
        });

        return NextResponse.json({
            success: true,
            orderId: order.id,
            url: session.url,
        });
    } catch (error) {
        console.error("Stripe checkout error:", error);

        if (orderId) {
            await prisma.$transaction([
                prisma.order.update({
                    where: { id: orderId },
                    data: { status: "FAILED" },
                }),
                prisma.payment.updateMany({
                    where: { orderId, status: "PENDING" },
                    data: { status: "FAILED" },
                }),
            ]).catch(console.error);
        }

        return NextResponse.json(
            { success: false, error: "Unable to create Stripe checkout session" },
            { status: 500 }
        );
    }
}