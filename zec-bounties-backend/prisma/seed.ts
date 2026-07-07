import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const defaultCategories = [
    'Development',
    'Design',
    'Marketing',
    'Research',
    'Content',
    'Community',
  ];

  for (const name of defaultCategories) {
    await prisma.bountyCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log('✅ Default categories seeded');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });