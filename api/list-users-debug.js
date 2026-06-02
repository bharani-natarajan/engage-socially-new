import { prisma } from './src/prisma.js';

async function main() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        unipileAccountId: true,
        firstName: true,
        lastName: true
      }
    });
    console.log('--- ALL USERS ---');
    console.log(JSON.stringify(users, null, 2));

    const workflows = await prisma.workflow.findMany({
      select: {
        id: true,
        name: true,
        userId: true,
        commentsGenerated: true
      }
    });
    console.log('--- ALL WORKFLOWS ---');
    console.log(JSON.stringify(workflows, null, 2));

    const comments = await prisma.workflowComment.findMany({
      select: {
        id: true,
        workflowId: true,
        status: true,
        postedAt: true
      }
    });
    console.log('--- ALL COMMENTS ---');
    console.log(`Total comments: ${comments.length}`);
    const statusCounts = comments.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {});
    console.log('Comments by status:', statusCounts);
  } catch (err) {
    console.error('Error debugging:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
