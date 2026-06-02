import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const sourceEmail = 'admin@engagesocially.com';
const targetEmail = process.argv[2];

if (!targetEmail) {
  console.log('Error: Please specify the target user email.');
  console.log('Usage: node migrate-workflows.js <target-email>');
  process.exit(1);
}

async function main() {
  const sourceUser = await prisma.user.findUnique({ where: { email: sourceEmail } });
  const targetUser = await prisma.user.findUnique({ where: { email: targetEmail } });

  if (!sourceUser) {
    console.error(`Error: Source user ${sourceEmail} not found.`);
    return;
  }
  if (!targetUser) {
    console.error(`Error: Target user ${targetEmail} not found. Please register/create the account first!`);
    return;
  }

  const result = await prisma.workflow.updateMany({
    where: { userId: sourceUser.id },
    data: { userId: targetUser.id }
  });

  console.log(`SUCCESS: Migrated ${result.count} workflows from ${sourceEmail} to ${targetEmail}.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
