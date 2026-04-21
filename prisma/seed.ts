import { PrismaClient } from "@prisma/client";
import { seedDatabase } from "../src/server/seed-data";

const prisma = new PrismaClient();

async function main() {
  const result = await seedDatabase(prisma);
  console.log("Seed completed successfully.");
  console.log(result);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
