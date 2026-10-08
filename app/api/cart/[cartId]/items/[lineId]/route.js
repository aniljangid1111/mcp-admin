import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function recalculateCart(cartId) {
    const items = await prisma.cartItem.findMany({
        where: {
            cartId,
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

    return prisma.cart.update({
        where: {
            id: cartId,
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
}

export async function PATCH(
    request,
    { params }
) {
    try {
        const { cartId, lineId } = await params;

        const body = await request.json();
        const { quantity } = body;

        if (quantity <= 0) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Quantity must be greater than 0",
                },
                { status: 400 }
            );
        }

        const item = await prisma.cartItem.findFirst({
            where: {
                id: lineId,
                cartId,
            },
        });

        if (!item) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Cart item not found",
                },
                { status: 404 }
            );
        }

        await prisma.cartItem.update({
            where: {
                id: lineId,
            },
            data: {
                quantity,
            },
        });

        const cart = await recalculateCart(cartId);

        return NextResponse.json({
            success: true,
            message: "Cart quantity updated",
            cart,
        });
    } catch (error) {
        console.error("Update cart error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to update cart",
            },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request,
    { params }
) {
    try {
        const { cartId, lineId } = await params;

        const item = await prisma.cartItem.findFirst({
            where: {
                id: lineId,
                cartId,
            },
        });

        if (!item) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Cart item not found",
                },
                { status: 404 }
            );
        }

        await prisma.cartItem.delete({
            where: {
                id: lineId,
            },
        });

        const cart = await recalculateCart(cartId);

        return NextResponse.json({
            success: true,
            message: "Product removed from cart",
            cart,
        });
    } catch (error) {
        console.error("Remove cart item error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to remove product from cart",
            },
            { status: 500 }
        );
    }
}