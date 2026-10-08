import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request) {
    try {
        const body = await request.json();

        const {
            cartId,
            productId,
            quantity = 1,
        } = body;

        if (!productId) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Product ID is required",
                },
                { status: 400 }
            );
        }

        if (quantity <= 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Quantity must be greater than 0",
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
            cart = await prisma.cart.findUnique({
                where: {
                    id: cartId,
                },
            });
        }

        if (!cart) {
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
                    quantity: existingItem.quantity + quantity,
                },
            });
        } else {
            await prisma.cartItem.create({
                data: {
                    cartId: cart.id,
                    productId: product.id,
                    quantity,
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