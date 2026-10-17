import { NextResponse } from "next/server";
import { sendOrderConfirmationEmail } from "@/lib/mail";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const targetEmail = body.to || process.env.OWNER_EMAIL;

    if (!targetEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "Recipient email is required (provide in JSON body 'to' or set OWNER_EMAIL in .env)",
        },
        { status: 400 }
      );
    }

    const sampleOrder = {
      id: "TEST-ORDER-101",
      customerName: body.name || "Test Customer",
      customerEmail: targetEmail,
      customerPhone: "+1 (555) 019-2834",
      currency: "usd",
      subtotalAmount: 25195,
      totalAmount: 25195,
      addressLine1: "123 Cleanergy Blvd",
      city: "Tampa",
      state: "FL",
      postalCode: "33601",
      country: "United States",
      createdAt: new Date().toISOString(),
      items: [
        {
          id: "item_test_1",
          productId: "test_sodium_12v",
          productName: "Sodium Ion Starting Battery 12V, 200Ah",
          imageUrl:
            "https://cleanergybattery.com/cdn/shop/files/sodium-ion-starting-battery-12v-200ah-320.webp?v=1781768632&width=600",
          unitPrice: 25195,
          quantity: 1,
        },
      ],
    };

    const result = await sendOrderConfirmationEmail(sampleOrder);

    return NextResponse.json({
      success: result.success && (result.customerSent || result.ownerSent),
      result,
    });
  } catch (error) {
    console.error("[Test Mail Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to send test email",
      },
      { status: 500 }
    );
  }
}
