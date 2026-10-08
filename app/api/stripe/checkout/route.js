import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
    try {
        const { cartId } = await request.json();

        if (!cartId) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Cart ID is required",
                },
                { status: 400 }
            );
        }

        const cart = await prisma.cart.findUnique({
            where: {
                id: cartId,
            },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
            },
        });

        if (!cart) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Cart not found",
                },
                { status: 404 }
            );
        }

        if (cart.items.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Cart is empty",
                },
                { status: 400 }
            );
        }

        const session = await stripe.checkout.sessions.create({
            mode: "payment",

            line_items: cart.items.map((item) => ({
                price_data: {
                    currency: "usd",

                    product_data: {
                        name: item.product.name,

                        images: item.product.imageUrl
                            ? [item.product.imageUrl]
                            : [],
                    },

                    unit_amount: Math.round(
                        Number(item.price) * 100
                    ),
                },

                quantity: item.quantity,
            })),

            success_url:
                `${process.env.MCP_BASE_URL}/checkout?cart=${cart.id}&success=true`,

            cancel_url:
                `${process.env.MCP_BASE_URL}/checkout?cart=${cart.id}`,

            metadata: {
                cartId: cart.id,
            },
        });

        return NextResponse.json({
            success: true,
            url: session.url,
        });

    } catch (error) {
        console.error("Stripe checkout error:", error);

        return NextResponse.json(
            {
                success: false,
                error: "Unable to create Stripe checkout session",
            },
            { status: 500 }
        );
    }
}