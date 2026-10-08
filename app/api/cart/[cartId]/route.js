import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    request,
    { params }
) {
    try {
        const { cartId } = await params;

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
                    message: "Cart not found",
                },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            cart,
        });
    } catch (error) {
        console.error("Get cart error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to fetch cart",
            },
            { status: 500 }
        );
    }
}