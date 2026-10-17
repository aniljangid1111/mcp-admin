import { NextResponse } from "next/server";
import { generateOrderEmailHtml } from "@/lib/mail";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const isOwner = searchParams.get("owner") === "true";

  // Mock sample order data based on Cleanergy Battery website products
  const mockOrder = {
    id: "clnz9817203x",
    customerName: "Alex Johnson",
    customerEmail: "alex.johnson@example.com",
    customerPhone: "+1 (555) 234-5678",
    currency: "usd",
    subtotalAmount: 25195,
    totalAmount: 25195,
    addressLine1: "742 Evergreen Terrace",
    addressLine2: "Suite 104",
    city: "Miami",
    state: "FL",
    postalCode: "33101",
    country: "United States",
    createdAt: new Date().toISOString(),
    items: [
      {
        id: "item_1",
        productId: "prod_sodium_12v",
        productName: "Sodium Ion Starting Battery 12V, 200Ah",
        imageUrl:
          "https://cleanergybattery.com/cdn/shop/files/sodium-ion-starting-battery-12v-200ah-320.webp?v=1781768632&width=600",
        unitPrice: 25195,
        quantity: 1,
      },
    ],
  };

  const html = generateOrderEmailHtml({
    order: mockOrder,
    isOwnerCopy: isOwner,
    isWebPreview: true,
  });

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
