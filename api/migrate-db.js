import { prisma } from './src/prisma.js';
import bcrypt from 'bcrypt';

async function main() {
  console.log('Starting migration script...');

  try {
    // 1. Create users table if it doesn't exist
    console.log('Creating users table if not exists...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "first_name" TEXT NOT NULL,
        "last_name" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "phone" TEXT NOT NULL DEFAULT '',
        "role" TEXT NOT NULL DEFAULT 'user',
        "verified" BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "users_pkey" PRIMARY KEY ("id")
      );
    `);

    console.log('Dropping password column from users table if exists...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "password";
    `);
    
    // Create unique index on email if not exists
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
    `);

    // 2. Create otps table if it doesn't exist
    console.log('Creating otps table if not exists...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "otps" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "email" TEXT NOT NULL,
        "code" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "expires_at" TIMESTAMP(3) NOT NULL,
        "used" BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "otps_pkey" PRIMARY KEY ("id")
      );
    `);

    // Create index on otps if not exists
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "otps_email_type_idx" ON "otps"("email", "type");
    `);

    const adminEmail = 'admin@engagesocially.com';
    console.log(`Checking if admin user ${adminEmail} exists...`);
    const existingAdmins = await prisma.$queryRawUnsafe(
      `SELECT id FROM "users" WHERE email = $1`,
      adminEmail
    );

    let adminId;
    if (existingAdmins.length === 0) {
      console.log('Creating default admin user...');
      const insertResult = await prisma.$queryRawUnsafe(`
        INSERT INTO "users" (first_name, last_name, email, phone, role, verified)
        VALUES ('Admin', 'User', 'admin@engagesocially.com', '+1234567890', 'admin', true)
        RETURNING id;
      `);
      adminId = insertResult[0].id;
      console.log('Admin user created successfully with ID:', adminId);
    } else {
      adminId = existingAdmins[0].id;
      console.log('Admin user already exists with ID:', adminId);
    }

    // 4. Update workflows table
    console.log('Updating workflows userId format/values...');
    // We update all workflows to reference the admin user before converting the column to UUID
    await prisma.$executeRawUnsafe(`
      UPDATE "workflows" SET "user_id" = '${adminId}' WHERE "user_id" IS NOT NULL;
    `);

    // Convert the user_id column in workflows to UUID type
    console.log('Altering workflows.user_id to UUID...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "workflows" ALTER COLUMN "user_id" TYPE UUID USING "user_id"::UUID;
    `);

    // Add foreign key constraint if it doesn't exist
    console.log('Adding foreign key constraint...');
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "workflows" 
        ADD CONSTRAINT "workflows_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      `);
      console.log('Foreign key constraint added successfully.');
    } catch (fkErr) {
      console.log('Foreign key constraint might already exist:', fkErr.message);
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
