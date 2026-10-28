import { NextResponse } from "next/server";
import { sendOrderConfirmationEmail } from "@/lib/mail";
import { authenticateAdminRequest } from "@/lib/auth";

export async function POST(request) {
  try {
    // 1. Disable in production unless explicitly opted in via ENABLE_EMAIL_TEST
    if (
      process.env.NODE_ENV === "production" &&
      process.env.ENABLE_EMAIL_TEST !== "true"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Email test endpoint is disabled in production.",
        },
        { status: 403 }
      );
    }

    // 2. Strict Server-side Admin Authentication
    const admin = await authenticateAdminRequest(request);
    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized. Admin authentication required.",
        },
        { status: 401 }
      );
    }

    // 3. Strict Recipient Validation
    const body = await request.json().catch(() => ({}));
    const rawTo = typeof body.to === "string" ? body.to.trim() : "";
    const targetEmail = rawTo || process.env.OWNER_EMAIL;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!targetEmail || !emailRegex.test(targetEmail)) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid recipient email address is required.",
        },
        { status: 400 }
      );
    }

    const sampleOrder = {
      id: "TEST-ORDER-101",
      customerName: typeof body.name === "string" && body.name.trim() ? body.name.trim() : "Cleanergy Test Admin",
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
      customerSent: result.customerSent,
      ownerSent: result.ownerSent,
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
