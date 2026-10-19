import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  authenticateAdminRequest,
  verifyPassword,
  hashPassword,
} from "@/lib/auth";

export async function POST(request) {
  try {
    // 1. Strict Authentication Guard: Only authenticated admin can change password
    const adminSession = await authenticateAdminRequest(request);
    if (!adminSession) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please log in first." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { currentPassword, newPassword } = body;

    // 2. Validate input fields
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        {
          success: false,
          error: "Both current password and new password are required.",
        },
        { status: 400 }
      );
    }

    if (typeof newPassword !== "string" || newPassword.trim().length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: "New password must be at least 6 characters long.",
        },
        { status: 400 }
      );
    }

    // 3. Fetch admin from database
    const adminUser = await prisma.admin.findUnique({
      where: { id: adminSession.id },
    });

    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: "Admin account not found." },
        { status: 404 }
      );
    }

    // 4. Verify current password
    const isCurrentValid = await verifyPassword(
      currentPassword,
      adminUser.password
    );

    if (!isCurrentValid) {
      return NextResponse.json(
        { success: false, error: "Current password is incorrect." },
        { status: 403 }
      );
    }

    // 5. Hash new password and update
    const hashedNewPassword = await hashPassword(newPassword.trim());

    await prisma.admin.update({
      where: { id: adminUser.id },
      data: { password: hashedNewPassword },
    });

    console.log(`[Auth Security] Admin password updated for ${adminUser.email}`);

    return NextResponse.json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("[Change Password Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to change password. Please try again." },
      { status: 500 }
    );
  }
}
