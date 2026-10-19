import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../app/generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const newPassword = process.argv[2];
  const email = (process.argv[3] || "admin@cleanergybattery.com").trim().toLowerCase();

  if (!newPassword || newPassword.trim().length < 6) {
    console.error("\n❌ Error: Please provide a new password (minimum 6 characters).");
    console.log("👉 Usage: node scripts/change-password.js \"YourNewPassword\"\n");
    process.exit(1);
  }

  console.log(`\nUpdating password for admin: ${email}...`);

  const existing = await prisma.admin.findUnique({
    where: { email },
  });

  const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);

  if (existing) {
    await prisma.admin.update({
      where: { email },
      data: { password: hashedPassword },
    });
    console.log("✅ Password successfully updated in database!");
  } else {
    await prisma.admin.create({
      data: {
        email,
        password: hashedPassword,
        name: "Cleanergy Admin",
      },
    });
    console.log("✅ Admin created with the new password!");
  }

  console.log("\n==========================================");
  console.log("🔐 Cleanergy Admin Credentials:");
  console.log(`📧 Email:    ${email}`);
  console.log(`🔑 Password: ${newPassword.trim()}`);
  console.log("==========================================\n");

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("❌ Error updating password:", err);
  await prisma.$disconnect();
  process.exit(1);
});
