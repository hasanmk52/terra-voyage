#!/usr/bin/env node

// Production Database Setup Script
// This script ensures the database is properly set up in production

require("dotenv").config({ path: ".env.local" });
const { execSync } = require("child_process");
const path = require("path");

console.log("🚀 Setting up production database...\n");

async function setupDatabase() {
  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }

    console.log("✅ DATABASE_URL is configured");

    // Generate Prisma client
    console.log("📦 Generating Prisma client...");
    execSync("npx prisma generate", { stdio: "inherit" });
    console.log("✅ Prisma client generated");

    // Deploy migrations
    console.log("🔄 Deploying database migrations...");
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
    console.log("✅ Database migrations deployed");

    // Verify database connection
    console.log("🔍 Verifying database connection...");
    execSync("npx prisma db pull", { stdio: "inherit" });
    console.log("✅ Database connection verified");

    // Optional: Run seed script if it exists
    try {
      console.log("🌱 Running database seed...");
      execSync("npm run db:seed", { stdio: "inherit" });
      console.log("✅ Database seeded successfully");
    } catch (seedError) {
      console.log("⚠️  Seed script failed or not found, continuing...");
    }

    console.log("\n🎉 Production database setup completed successfully!");
  } catch (error) {
    console.error("\n❌ Database setup failed:", error.message);
    process.exit(1);
  }
}

// Run the setup
setupDatabase();
