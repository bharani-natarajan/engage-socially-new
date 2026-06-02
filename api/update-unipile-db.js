import { prisma } from './src/prisma.js';

async function main() {
  console.log('Running DB update script for Unipile support...');
  try {
    // 1. Add unipile_account_id column to users table if it does not exist
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "unipile_account_id" TEXT;
    `);
    console.log('Column "unipile_account_id" added to "users" table successfully (if it did not exist).');

    // 2. Set the default admin's unipile_account_id to the most common Unipile account ID used before (or we can let it sync on login)
    // Wait, let's look at the active workflows in the database. Are they already pointing to the admin user?
    // Yes, they are.
    console.log('DB update completed successfully!');
  } catch (err) {
    console.error('Error updating DB:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
