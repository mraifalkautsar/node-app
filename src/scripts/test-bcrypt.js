#!/usr/bin/env node

const bcrypt = require('bcryptjs');

/**
 * Bcrypt Testing Script
 * Tests bcrypt hashing with different round counts
 * Usage: node src/scripts/test-bcrypt.js
 */

async function testBcrypt() {
  const testPassword = 'admin123';
  const rounds = [8, 10, 12, 14];

  console.log('\n🔐 Bcrypt Hashing Test\n');
  console.log('Test Password:', testPassword);
  console.log('='.repeat(80));

  for (const roundCount of rounds) {
    try {
      console.log(`\n⏱️  Testing with ${roundCount} rounds:`);

      // Measure hashing time
      const startHash = Date.now();
      const hashedPassword = await bcrypt.hash(testPassword, roundCount);
      const hashTime = Date.now() - startHash;

      console.log(`  Hash Time: ${hashTime}ms`);
      console.log(`  Hash: ${hashedPassword}`);

      // Measure comparison time
      const startCompare = Date.now();
      const isValidPassword = await bcrypt.compare(testPassword, hashedPassword);
      const compareTime = Date.now() - startCompare;

      console.log(`  Compare Time: ${compareTime}ms`);
      console.log(`  ✅ Password Match: ${isValidPassword}`);

      // Test wrong password
      const isWrongPassword = await bcrypt.compare(
        'wrongpassword',
        hashedPassword
      );
      console.log(`  ✅ Wrong Password Match: ${isWrongPassword}`);
    } catch (error) {
      console.error(`  ❌ Error with ${roundCount} rounds:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Recommendations:');
  console.log('  • 8 rounds:  Fast, lower security (not recommended)');
  console.log('  • 10 rounds: Default, balanced (acceptable)');
  console.log('  • 12 rounds: Recommended for admin accounts');
  console.log('  • 14 rounds: Very secure, slower (overkill for most cases)');
  console.log('\n');
}

testBcrypt().catch(console.error);