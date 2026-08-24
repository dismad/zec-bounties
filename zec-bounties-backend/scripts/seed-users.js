require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();
const PASSWORD = "test1234";

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 10);

  for (let n = 1; n <= 10; n++) {
    const user = await prisma.user.upsert({
      where: { email: `user${n}@test.local` },
      update: {
        name: `Test User ${n}`,
        nickname: `user${n}`,
        role: "CLIENT",
        password: hash,
      },
      create: {
        name: `Test User ${n}`,
        email: `user${n}@test.local`,
        nickname: `user${n}`,
        role: "CLIENT",
        password: hash,
      },
    });
    console.log(`ok  ${user.email}  /  ${PASSWORD}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());