import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

export const COOKIE_NAME = "cleanergy_admin_token";

/**
 * Returns the raw binary key for JWT signing and verification.
 * Fails safely if ADMIN_JWT_SECRET is absent or insufficiently strong.
 * No static strings or third-party service secrets are accepted as fallbacks.
 */
function getAdminJwtSecretKey() {
  const secret = process.env.ADMIN_JWT_SECRET?.trim();
  if (!secret || secret.length < 32) {
    return null;
  }
  return new TextEncoder().encode(secret);
}

/**
 * Hash a plain password using bcrypt with standard salt rounds
 */
export async function hashPassword(plainPassword) {
  if (!plainPassword || typeof plainPassword !== "string") {
    throw new Error("Password must be a non-empty string.");
  }
  return bcrypt.hash(plainPassword, 12);
}

/**
 * Verify a plain password against a bcrypt hash
 */
export async function verifyPassword(plainPassword, hashedPassword) {
  if (!plainPassword || !hashedPassword) return false;
  return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Generate a signed JWT session token for an authenticated Admin.
 * Fails if ADMIN_JWT_SECRET is not configured.
 */
export async function signAdminToken(admin) {
  const secretKey = getAdminJwtSecretKey();
  if (!secretKey) {
    throw new Error(
      "ADMIN_JWT_SECRET is not configured or is shorter than 32 characters."
    );
  }

  return new SignJWT({
    id: admin.id,
    email: admin.email,
    name: admin.name || "Admin",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

/**
 * Verify a JWT session token.
 * Returns decoded payload if valid, null otherwise.
 */
export async function verifyAdminToken(token) {
  if (!token) return null;

  const secretKey = getAdminJwtSecretKey();
  if (!secretKey) {
    console.error(
      "[Auth Security] ADMIN_JWT_SECRET environment variable is missing or insecure (< 32 chars). Verification rejected."
    );
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload;
  } catch {
    return null;
  }
}

/**
 * Authenticate incoming API request using HTTP-only Cookie or Bearer Authorization header.
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
