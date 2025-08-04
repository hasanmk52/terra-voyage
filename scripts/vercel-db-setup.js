#!/usr/bin/env node

// Vercel Production Database Setup Script
// This script runs during Vercel builds and uses Vercel's environment variables

const { execSync } = require('child_process');

console.log('🚀 Setting up Vercel production database...\n');

async function setupVercelDatabase() {
  try {
    // Check if DATABASE_URL is set (from Vercel environment variables)
    if (!process.env.DATABASE_URL) {
      console.log('⚠️  DATABASE_URL not found in environment variables');
      console.log('   This is normal if you haven\'t set it in Vercel dashboard yet');
      console.log('   Database migrations will be skipped for now');
      return;
    }

    console.log('✅ DATABASE_URL is configured from Vercel environment');

    // Generate Prisma client
    console.log('📦 Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Prisma client generated');

    // Deploy migrations
    console.log('🔄 Deploying database migrations...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('✅ Database migrations deployed');

    // Verify database connection
    console.log('🔍 Verifying database connection...');
    try {
      execSync('npx prisma db pull', { stdio: 'inherit' });
      console.log('✅ Database connection verified');
    } catch (pullError) {
      console.log('⚠️  Database pull failed, but migrations were successful');
    }

    console.log('\n🎉 Vercel production database setup completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Vercel database setup failed:', error.message);
    console.log('   This will not stop the build, but database features may not work');
    // Don't exit with error code to allow build to continue
  }
}

// Run the setup
setupVercelDatabase(); 