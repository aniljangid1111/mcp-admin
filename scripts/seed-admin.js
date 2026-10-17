import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../app/generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const DEFAULT_ADMIN = {
  email: "admin@cleanergybattery.com",
  password: "CleanergyAdmin@2026",
  name: "Cleanergy Admin",
};

async function main() {
  console.log("Seeding Cleanergy Admin user into Database...");

  const existing = await prisma.admin.findUnique({
    where: { email: DEFAULT_ADMIN.email },
  });

  const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, 10);

  if (existing) {
    const updated = await prisma.admin.update({
      where: { email: DEFAULT_ADMIN.email },
      data: {
        password: hashedPassword,
        name: DEFAULT_ADMIN.name,
      },
    });
    console.log("✓ Existing Admin updated successfully:", updated.email);
  } else {
    const created = await prisma.admin.create({
      data: {
        email: DEFAULT_ADMIN.email,
        password: hashedPassword,
        name: DEFAULT_ADMIN.name,
      },
    });
    console.log("✓ New Admin created successfully:", created.email);
  }

  console.log("\n==========================================");
  console.log("Cleanergy Admin Login Credentials:");
  console.log("Email:    " + DEFAULT_ADMIN.email);
  console.log("Password: " + DEFAULT_ADMIN.password);
  console.log("==========================================\n");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
