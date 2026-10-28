import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signAdminToken, COOKIE_NAME } from "@/lib/auth";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request) {
  try {
    // Rate limit: 5 login attempts per 60 seconds per IP
    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimit(`login:${clientIp}`, 5, 60);
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit);
    }

    const body = await request.json().catch(() => ({}));
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required." },
        { status: 400 }
      );
    }

    // Query admin user directly from Database (no default admin auto-creation)
    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Invalid admin email or password." },
        { status: 401 }
      );
    }

    // Verify bcrypt hashed password from database
    const isValid = await verifyPassword(password, admin.password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid admin email or password." },
        { status: 401 }
      );
    }

    // Generate secure session token
    const token = await signAdminToken(admin);

    const response = NextResponse.json({
      success: true,
      message: "Login successful.",
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
      },
    });

    // Set secure HTTP-only cookie
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("[Login Error]:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred during login." },
      { status: 500 }
    );
  }
}
