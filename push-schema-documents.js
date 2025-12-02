const { execSync } = require('child_process');

try {
  // Push schema with automatic acceptance
  execSync('npx drizzle-kit push --force', { 
    stdio: 'inherit',
    cwd: process.cwd(),
    timeout: 60000
  });
  console.log('✅ Schema push completed successfully');
} catch (error) {
  console.error('❌ Schema push failed:', error.message);
  process.exit(1);
}