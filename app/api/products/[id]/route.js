
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Fetch one product by ID
export async function GET(request, { params }) {
    try {
        const { id } = await params;

        const product = await prisma.product.findUnique({
            where: { id },
        });

        if (!product) {
            return NextResponse.json(
                { success: false, message: "Product not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            product,
        });
    } catch (error) {
        console.error("Get product error:", error);

        return NextResponse.json(
            { success: false, message: "Failed to fetch product" },
            { status: 500 }
        );
    }
}

// PUT: Update an existing product
export async function PUT(request, { params }) {
    try {
        const { id } = await params;
        const body = await request.json();

        const { name, price, content, imageUrl, documentUrl } = body;

        if (
            !name?.trim() ||
            price === undefined ||
            price === null ||
            price === "" ||
            !Number.isFinite(Number(price)) ||
            Number(price) < 0 ||
            !content?.trim()
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Valid name, price and content are required",
                },
                { status: 400 }
            );
        }

        const product = await prisma.product.update({
            where: { id },
            data: {
                name: name.trim(),
                price: Number(price),
                content: content.trim(),
                ...(imageUrl !== undefined && { imageUrl }),
                ...(documentUrl !== undefined && { documentUrl }),
            },
        });

        return NextResponse.json({
            success: true,
            message: "Product updated successfully",
            product,
        });
    } catch (error) {
        if (error.code === "P2025") {
            return NextResponse.json(
                { success: false, message: "Product not found" },
                { status: 404 }
            );
        }

        console.error("Update product error:", error);

        return NextResponse.json(
            { success: false, message: "Failed to update product" },
            { status: 500 }
        );
    }
}

// DELETE: Delete a product
export async function DELETE(request, { params }) {
    try {
        const { id } = await params;

        await prisma.product.delete({
            where: { id },
        });

        return NextResponse.json({
            success: true,
            message: "Product deleted successfully",
        });
    } catch (error) {
        if (error.code === "P2025") {
            return NextResponse.json(
                {
                    success: false,
                    message: "Product not found",
                },
                { status: 404 }
            );
        }

        console.error("Delete product error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to delete product",
            },
            { status: 500 }
        );
    }
}