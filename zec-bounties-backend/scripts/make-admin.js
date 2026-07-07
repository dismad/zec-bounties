const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function makeAdmin(githubId) {
  if (!githubId) {
    console.error('Usage: npm run make-admin -- <githubId>');
    process.exit(1);
  }

  try {
    // Find user first (githubId is not unique in schema)
    const existingUser = await prisma.user.findFirst({
      where: { githubId },
    });

    if (!existingUser) {
      console.error(`❌ User with githubId ${githubId} not found.`);
      console.log('Make sure you logged in at least once through the frontend.');
      process.exit(1);
    }

    // Update using the internal id
    const user = await prisma.user.update({
      where: { id: existingUser.id },
      data: { role: 'ADMIN' },
    });

    console.log(`✅ Success! User is now ADMIN`);
    console.log({
      id: user.id,
      githubId: user.githubId,
      role: user.role,
      name: user.name,
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

const githubId = process.argv[2];
makeAdmin(githubId);
