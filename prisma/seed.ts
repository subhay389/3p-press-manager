import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DIRECT_URL! }),
});

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error("SEED_ADMIN_EMAIL is not set");

  await prisma.allowedUser.upsert({
    where: { email },
    update: { role: "ADMIN" },
    create: { email, role: "ADMIN" },
  });
  console.log(`Seeded admin: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
