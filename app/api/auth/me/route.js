import { NextResponse } from "next/server";
import { verifyAdminToken, COOKIE_NAME } from "@/lib/auth";

export async function GET(request) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const payload = await verifyAdminToken(token);

  if (!payload) {
    return NextResponse.json(
      { authenticated: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    authenticated: true,
    admin: {
      id: payload.id,
      email: payload.email,
      name: payload.name,
    },
  });
}
