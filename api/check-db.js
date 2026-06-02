import { prisma } from './src/prisma.js';

async function main() {
  try {
    const workflows = await prisma.workflow.findMany();
    console.log(`Found ${workflows.length} workflows`);
    if (workflows.length > 0) {
      console.log('Sample workflow:', workflows[0]);
    }
  } catch (err) {
    console.error('Error querying db:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
