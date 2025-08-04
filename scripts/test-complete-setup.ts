#!/usr/bin/env node

console.log('🧪 Testing Complete Environment Setup')
console.log('=====================================')

// Test 1: Environment Variables Loading
console.log('\n1. Environment Variables:')
console.log('  DATABASE_URL:', !!process.env.DATABASE_URL ? '✅ Loaded' : '❌ Missing')
console.log('  GEMINI_API_KEY:', !!process.env.GEMINI_API_KEY ? '✅ Loaded' : '❌ Missing')
console.log('  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:', !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? '✅ Loaded' : '❌ Missing')
console.log('  NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN:', !!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ? '✅ Loaded' : '❌ Missing')
console.log('  WEATHER_API_KEY:', !!process.env.WEATHER_API_KEY ? '✅ Loaded' : '❌ Missing')

// Test 2: Service Configuration
console.log('\n2. Service Configuration:')
const useRealServices = !process.env.USE_MOCKS || process.env.USE_MOCKS === 'false'
console.log('  Services:', useRealServices ? '✅ REAL' : '⚠️  MOCK')
console.log('  Mock Mode:', process.env.USE_MOCKS || 'false')

// Test 3: Security Check
console.log('\n3. Security Status:')
const hasEnvFile = require('fs').existsSync('.env')
const hasEnvLocal = require('fs').existsSync('.env.local')
const hasEnvExample = require('fs').existsSync('.env.example')

console.log('  .env file exists:', hasEnvFile ? '❌ SECURITY RISK' : '✅ SECURE')
console.log('  .env.local exists:', hasEnvLocal ? '✅ CORRECT' : '❌ MISSING')
console.log('  .env.example exists:', hasEnvExample ? '✅ CORRECT' : '❌ MISSING')

console.log('\n✅ Environment setup test completed!')

if (!hasEnvLocal) {
  console.log('\n⚠️  Please copy .env.example to .env.local and configure your API keys')
  process.exit(1)
}

if (hasEnvFile) {
  console.log('\n🚨 WARNING: .env file exists and may contain sensitive data')
  process.exit(1)
}