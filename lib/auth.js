import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const JWT_SECRET_STRING =
  process.env.ADMIN_JWT_SECRET ||
  process.env.STRIPE_SECRET_KEY ||
  "cleanergy-battery-secure-admin-secret-2026";

const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
export const COOKIE_NAME = "cleanergy_admin_token";

export const DEFAULT_ADMIN_CREDENTIALS = {
  email: "admin@cleanergybattery.com",
  password: "admin123",
  name: "Cleanergy Admin",
};

/**
 * Hash a plain password using bcrypt
 */
export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, 10);
}

/**
 * Verify a plain password against a bcrypt hash
 */
export async function verifyPassword(plainPassword, hashedPassword) {
  if (!plainPassword || !hashedPassword) return false;
  return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Generate a signed JWT session token
 */
export async function signAdminToken(admin) {
  return new SignJWT({
    id: admin.id,
    email: admin.email,
    name: admin.name || "Admin",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

/**
 * Verify a JWT session token
 */
export async function verifyAdminToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

/**
 * Authenticate incoming API request using Cookie or Authorization header
 */
export async function authenticateAdminRequest(request) {
  try {
    const cookieToken = request.cookies?.get?.(COOKIE_NAME)?.value;
    const authHeader = request.headers?.get?.("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7).trim()
      : null;

    const token = cookieToken || bearerToken;
    if (!token) return null;

    return await verifyAdminToken(token);
  } catch {
    return null;
  }
}

/**
 * Ensure initial Admin user exists in Database.
 * If not present, creates one with DEFAULT_ADMIN_CREDENTIALS.
 */
export async function ensureDefaultAdmin() {
  try {
    const existing = await prisma.admin.findUnique({
      where: { email: DEFAULT_ADMIN_CREDENTIALS.email },
    });

    if (existing) {
      return existing;
    }

    const hashedPassword = await hashPassword(
      DEFAULT_ADMIN_CREDENTIALS.password
    );

    const newAdmin = await prisma.admin.create({
      data: {
        email: DEFAULT_ADMIN_CREDENTIALS.email,
        password: hashedPassword,
        name: DEFAULT_ADMIN_CREDENTIALS.name,
      },
    });

    console.log(
      `[Auth Setup] Initial Admin user seeded in Database: ${newAdmin.email}`
    );
    return newAdmin;
  } catch (error) {
    console.error("[Auth Setup] Failed ensuring default admin:", error);
    return null;
  }
}
