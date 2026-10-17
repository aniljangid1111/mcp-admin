import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";

/**
 * Cleanergy Battery - Email Service
 * Sends order confirmation emails to customers and notification emails to the owner.
 * Designed using the Cleanergy brand theme (Green & Teal accents, modern card layout).
 */

function getTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const user = (process.env.SENDER_EMAIL || process.env.SMTP_USER || "").trim();
  const rawPass = process.env.SENDER_PASSWORD || process.env.SMTP_PASS || "";
  const pass = rawPass.replace(/\s+/g, "");

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

function formatPrice(amountInCents, currency = "usd") {
  const num = (Number(amountInCents || 0) / 100).toFixed(2);
  const curr = (currency || "usd").toLowerCase();
  if (curr === "usd") return `$${num}`;
  if (curr === "eur") return `€${num}`;
  if (curr === "gbp") return `£${num}`;
  return `${currency.toUpperCase()} ${num}`;
}

export function generateOrderEmailHtml({ order, isOwnerCopy = false, isWebPreview = false }) {
  const customerName = order.customerName || "Valued Customer";
  const customerEmail = order.customerEmail || "N/A";
  const customerPhone = order.customerPhone || "N/A";
  const orderId = order.id;
  const currency = order.currency || "usd";
  const formattedTotal = formatPrice(order.totalAmount, currency);
  const formattedSubtotal = formatPrice(order.subtotalAmount, currency);

  const orderDate = new Date(order.createdAt || Date.now()).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const addressParts = [
    order.addressLine1,
    order.addressLine2,
    order.city,
    order.state,
    order.postalCode,
    order.country,
  ].filter(Boolean);

  const fullAddress = addressParts.length > 0 ? addressParts.join(", ") : "No shipping address provided";

  const logoPath = path.join(process.cwd(), "public", "logo.png");
  const hasLocalLogo = fs.existsSync(logoPath);
  const logoSrc = isWebPreview
    ? "/logo.png"
    : hasLocalLogo
    ? "cid:cleanergy-logo"
    : "https://cleanergybattery.com/cdn/shop/files/Logo-of-cleanergy-transparent_f56c8e49-d76a-482d-bf49-716e5b7c4da5.png";

  const itemsHtml = (order.items || [])
    .map((item) => {
      const itemUnit = formatPrice(item.unitPrice, currency);
      const itemTotal = formatPrice(item.unitPrice * item.quantity, currency);
      const imageHtml = item.imageUrl
        ? `<td width="64" valign="middle" style="padding: 12px 14px 12px 0;">
             <img src="${item.imageUrl}" alt="${item.productName}" width="60" height="60" style="display:block; width:60px; height:60px; object-fit:cover; border-radius:8px; border:1px solid #e2e8f0; background-color:#f8fafc;" />
           </td>`
        : "";

      return `
        <tr>
          ${imageHtml}
          <td valign="middle" style="padding: 12px 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <div style="font-size: 14px; font-weight: 600; color: #0f172a; line-height: 1.4;">${item.productName}</div>
            <div style="font-size: 13px; color: #64748b; margin-top: 3px;">Qty: ${item.quantity} × ${itemUnit}</div>
          </td>
          <td align="right" valign="middle" style="padding: 12px 0 12px 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 700; color: #0f172a;">
            ${itemTotal}
          </td>
        </tr>
      `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cleanergy Battery - Order Confirmation #${orderId}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 30px 12px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 620px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
          
          <!-- Brand Header -->
          <tr>
            <td style="background-color: #ffffff; padding: 24px 32px; border-bottom: 2px solid #f1f5f9;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left" valign="middle">
                    <a href="https://cleanergybattery.com/" target="_blank" style="text-decoration: none; display: inline-block;">
                      <img src="${logoSrc}" alt="Cleanergy Battery" height="42" style="display: block; max-height: 42px; width: auto; border: 0;" />
                    </a>
                  </td>
                  <td align="right" valign="middle">
                    <span style="font-size: 11px; font-weight: 700; color: #16a34a; letter-spacing: 0.5px; text-transform: uppercase; background-color: #dcfce7; padding: 5px 12px; border-radius: 9999px;">
                      ● Official Store
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Banner / Hero Section -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; background: linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%);">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    ${
                      isOwnerCopy
                        ? `<div style="display: inline-block; background-color: #0284c7; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">ADMIN NOTIFICATION</div>`
                        : `<div style="display: inline-block; background-color: #16a34a; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">ORDER CONFIRMED</div>`
                    }
                    <h1 style="margin: 0 0 10px 0; font-size: 24px; font-weight: 800; color: #0f172a; line-height: 1.3;">
                      ${isOwnerCopy ? `New Order Received #${orderId}` : `Payment Successful! Thank you for your order.`}
                    </h1>
                    <p style="margin: 0; font-size: 15px; color: #475569; line-height: 1.5;">
                      ${
                        isOwnerCopy
                          ? `A new order has been paid successfully via Stripe. Customer details and purchased battery products are listed below.`
                          : `Hello <strong>${customerName}</strong>, we've received your payment via Stripe. Our team is now preparing your Cleanergy battery system for dispatch.`
                      }
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Order Summary Meta Card -->
          <tr>
            <td style="padding: 0 32px 20px 32px;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px;">
                <tr>
                  <td width="50%" valign="top" style="padding: 6px;">
                    <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Order Number</div>
                    <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 3px; font-family: monospace;">#${orderId}</div>
                  </td>
                  <td width="50%" valign="top" style="padding: 6px;">
                    <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Order Date</div>
                    <div style="font-size: 14px; font-weight: 600; color: #0f172a; margin-top: 3px;">${orderDate}</div>
                  </td>
                </tr>
                <tr>
                  <td width="50%" valign="top" style="padding: 6px;">
                    <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Payment Status</div>
                    <div style="font-size: 14px; font-weight: 700; color: #16a34a; margin-top: 3px;">✓ PAID (Stripe)</div>
                  </td>
                  <td width="50%" valign="top" style="padding: 6px;">
                    <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Total Paid</div>
                    <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px;">${formattedTotal}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items Ordered -->
          <tr>
            <td style="padding: 10px 32px 24px 32px;">
              <h2 style="margin: 0 0 14px 0; font-size: 16px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
                Items in your order
              </h2>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                ${itemsHtml}
              </table>

              <!-- Pricing Breakdown -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-top: 16px; border-top: 1px dashed #cbd5e1; padding-top: 12px;">
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #64748b;">Subtotal</td>
                  <td align="right" style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: 600;">${formattedSubtotal}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #64748b;">Shipping</td>
                  <td align="right" style="padding: 6px 0; font-size: 14px; color: #16a34a; font-weight: 700;">FREE</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0 6px 0; font-size: 16px; font-weight: 800; color: #0f172a; border-top: 2px solid #e2e8f0;">Total Amount Paid</td>
                  <td align="right" style="padding: 12px 0 6px 0; font-size: 18px; font-weight: 900; color: #16a34a; border-top: 2px solid #e2e8f0;">${formattedTotal}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Shipping and Customer Details -->
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
                <tr>
                  <td>
                    <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
                      Shipping & Customer Details
                    </h3>
                    <div style="font-size: 14px; color: #334155; line-height: 1.6;">
                      <strong>Recipient:</strong> ${customerName}<br>
                      <strong>Email:</strong> ${customerEmail}<br>
                      ${customerPhone !== "N/A" ? `<strong>Phone:</strong> ${customerPhone}<br>` : ""}
                      <strong>Delivery Address:</strong><br>
                      <span style="color: #475569;">${fullAddress}</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button (Cleanergy Cyan/Teal matching screenshot) -->
          <tr>
            <td align="center" style="padding: 0 32px 32px 32px;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="border-radius: 9999px; background-color: #06b6d4;">
                    <a href="https://cleanergybattery.com/" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 9999px; letter-spacing: 0.5px; text-transform: uppercase;">
                      Visit Cleanergy Store →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer Information -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                Need help or have questions regarding your order?<br>
                Reply directly to this email or visit <a href="https://cleanergybattery.com/" target="_blank" style="color: #06b6d4; text-decoration: underline;">cleanergybattery.com</a>
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #94a3b8;">
                © ${new Date().getFullYear()} Cleanergy Battery. All rights reserved. Developed by <a href="https://shapebytes.com/" target="_blank" style="color: #06b6d4; text-decoration: underline;">ShapeBytes</a>.<br>
                LiFePO4 &amp; Sodium-Ion Battery Systems for Marine, RV, Solar and Off-Grid Power.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Sends order confirmation email to the customer who paid on Stripe,
 * and also sends an admin notification to OWNER_EMAIL if configured.
 */
export async function sendOrderConfirmationEmail(order) {
  const customerEmail = order.customerEmail;
  const ownerEmail = process.env.OWNER_EMAIL?.trim();

  const transporter = getTransporter();

  if (!transporter) {
    console.warn(
      `[Mail Warning] SMTP is not configured in .env (SMTP_HOST, SMTP_USER, SMTP_PASS). Order #${order.id} was paid, but email to ${customerEmail || "N/A"} was skipped.`
    );
    return {
      success: false,
      skipped: true,
      reason: "SMTP_NOT_CONFIGURED",
    };
  }

  const fromAddress =
    process.env.SMTP_FROM ||
    `"Cleanergy Battery" <${process.env.SENDER_EMAIL || process.env.SMTP_USER}>`;

  const results = {
    customerSent: false,
    ownerSent: false,
  };

  const logoPath = path.join(process.cwd(), "public", "logo.png");
  const attachments = [];
  if (fs.existsSync(logoPath)) {
    attachments.push({
      filename: "logo.png",
      path: logoPath,
      cid: "cleanergy-logo",
    });
  }

  // 1. Send confirmation email to Customer
  if (customerEmail && customerEmail.includes("@")) {
    try {
      const customerHtml = generateOrderEmailHtml({ order, isOwnerCopy: false });
      await transporter.sendMail({
        from: fromAddress,
        to: customerEmail,
        subject: `Order Confirmed: Cleanergy Battery Order #${order.id}`,
        html: customerHtml,
        attachments,
      });
      console.log(`[Mail Success] Customer confirmation sent to ${customerEmail} for order #${order.id}`);
      results.customerSent = true;
    } catch (err) {
      console.error(`[Mail Error] Failed sending confirmation to customer ${customerEmail}:`, err);
    }
  } else {
    console.warn(`[Mail Warning] No valid customer email found for order #${order.id}`);
  }

  // 2. Send notification email to Owner (if OWNER_EMAIL is configured)
  if (ownerEmail && ownerEmail.includes("@")) {
    try {
      const ownerHtml = generateOrderEmailHtml({ order, isOwnerCopy: true });
      await transporter.sendMail({
        from: fromAddress,
        to: ownerEmail,
        subject: `[New Order Alert] Cleanergy Battery Order #${order.id} Paid (${formatPrice(order.totalAmount, order.currency)})`,
        html: ownerHtml,
        attachments,
      });
      console.log(`[Mail Success] Owner notification sent to ${ownerEmail} for order #${order.id}`);
      results.ownerSent = true;
    } catch (err) {
      console.error(`[Mail Error] Failed sending notification to owner ${ownerEmail}:`, err);
    }
  }

  return { success: true, ...results };
}
