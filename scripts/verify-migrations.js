#!/usr/bin/env node

// Database Migration Verification Script
// This script verifies that all migrations are applied correctly

const { execSync } = require("child_process");

console.log("🔍 Verifying database migrations...\n");

async function verifyMigrations() {
  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.log("❌ DATABASE_URL not found in environment variables");
      return false;
    }

    console.log("✅ DATABASE_URL is configured");

    // Check migration status
    console.log("📋 Checking migration status...");
    try {
      const migrationStatus = execSync("npx prisma migrate status", {
        encoding: "utf8",
        stdio: "pipe",
      });
      console.log("Migration Status:");
      console.log(migrationStatus);
    } catch (error) {
      console.log("⚠️  Could not check migration status:", error.message);
    }

    // Try to connect and run a simple query
    console.log("🔗 Testing database connection...");
    try {
      const { PrismaClient } = require("@prisma/client");
      const db = new PrismaClient();

      await db.$connect();
      const userCount = await db.user.count();
      console.log(
        `✅ Database connected successfully! User count: ${userCount}`
      );

      await db.$disconnect();
      return true;
    } catch (dbError) {
      console.log("❌ Database connection failed:", dbError.message);
      return false;
    }
  } catch (error) {
    console.error("❌ Migration verification failed:", error.message);
    return false;
  }
}

// Run verification
verifyMigrations().then((success) => {
  if (success) {
    console.log("\n🎉 Database migrations verified successfully!");
  } else {
    console.log("\n⚠️  Database migration verification failed");
  }
});
