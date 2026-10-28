import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request) {
    try {
        // Rate limit: 30 cart actions per 60 seconds per IP
        const clientIp = getClientIp(request);
        const rateLimit = await checkRateLimit(`cart:${clientIp}`, 30, 60);
        if (!rateLimit.success) {
            return rateLimitResponse(rateLimit);
        }

        const body = await request.json();

        const {
            cartId,
            productId,
            quantity = 1,
        } = body;

        if (!productId || typeof productId !== "string") {
            return NextResponse.json(
                {
                    success: false,
                    message: "Product ID is required",
                },
                { status: 400 }
            );
        }

        const numQuantity = Number(quantity);
        if (!Number.isInteger(numQuantity) || numQuantity <= 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Quantity must be a positive integer",
                },
                { status: 400 }
            );
        }

        const product = await prisma.product.findUnique({
            where: {
                id: productId,
            },
        });

        if (!product) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Product not found",
                },
                { status: 404 }
            );
        }

        let cart;

        if (cartId) {
            if (typeof cartId !== "string" || !cartId.trim()) {
                return NextResponse.json(
                    {
                        success: false,
                        message: "Invalid cart ID",
                    },
                    { status: 400 }
                );
            }

            cart = await prisma.cart.findUnique({
                where: {
                    id: cartId.trim(),
                },
            });

            if (!cart) {
                return NextResponse.json(
                    {
                        success: false,
                        message: "Cart not found",
                    },
                    { status: 404 }
                );
            }
        } else {
            cart = await prisma.cart.create({
                data: {
                    currencyCode: "USD",
                    total: 0,
                    totalQuantity: 0,
                },
            });
        }

        const existingItem = await prisma.cartItem.findUnique({
            where: {
                cartId_productId: {
                    cartId: cart.id,
                    productId: product.id,
                },
            },
        });

        if (existingItem) {
            await prisma.cartItem.update({
                where: {
                    id: existingItem.id,
                },
                data: {
                    quantity: existingItem.quantity + numQuantity,
                    price: product.price,
                },
            });
        } else {
            await prisma.cartItem.create({
                data: {
                    cartId: cart.id,
                    productId: product.id,
                    quantity: numQuantity,
                    price: product.price,
                },
            });
        }

        const items = await prisma.cartItem.findMany({
            where: {
                cartId: cart.id,
            },
            include: {
                product: true,
            },
        });

        const totalQuantity = items.reduce(
            (sum, item) => sum + item.quantity,
            0
        );

        const total = items.reduce(
            (sum, item) =>
                sum + Number(item.price) * item.quantity,
            0
        );

        const updatedCart = await prisma.cart.update({
            where: {
                id: cart.id,
            },
            data: {
                totalQuantity,
                total,
            },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
            },
        });

        return NextResponse.json({
            success: true,
            message: "Product added to cart",
            cart: updatedCart,
        });
    } catch (error) {
        console.error("Add to cart error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to add product to cart",
            },
            { status: 500 }
        );
    }
}