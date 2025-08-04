#!/usr/bin/env node

// Database Baseline Script
// This script helps baseline an existing database for Prisma migrations

require("dotenv").config({ path: ".env.local" });
const { execSync } = require("child_process");

console.log("🔧 Database Baseline Script\n");

async function baselineDatabase() {
  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }

    console.log("✅ DATABASE_URL is configured");

    // Check if database has existing tables
    console.log("🔍 Checking database state...");
    try {
      const { PrismaClient } = require("@prisma/client");
      const db = new PrismaClient();

      await db.$connect();
      const userCount = await db.user.count();
      console.log(`📊 Database has existing data: ${userCount} users found`);

      await db.$disconnect();

      if (userCount > 0) {
        console.log("\n⚠️  Database has existing data. You have two options:");
        console.log("\n1. Create a new database for production:");
        console.log("   - Create a new database in Neon/Supabase");
        console.log("   - Update DATABASE_URL in Vercel dashboard");
        console.log("   - Deploy again");

        console.log("\n2. Baseline the existing database:");
        console.log(
          "   - Run: npx prisma migrate resolve --applied 20250731145508_init"
        );
        console.log("   - This marks the initial migration as already applied");

        console.log("\n3. Use db push instead of migrations:");
        console.log('   - Update the build script to use "prisma db push"');
        console.log("   - This syncs schema without migration history");

        return;
      }
    } catch (error) {
      console.log("❌ Could not check database state:", error.message);
    }

    // If no existing data, proceed with normal migration
    console.log("🔄 Proceeding with normal migration setup...");
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
    console.log("✅ Database baseline completed successfully!");
  } catch (error) {
    console.error("\n❌ Database baseline failed:", error.message);
    process.exit(1);
  }
}

// Run the baseline
baselineDatabase();
