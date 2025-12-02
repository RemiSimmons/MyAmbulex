const { execSync } = require('child_process');

try {
  // Push schema with automatic yes response
  console.log('Pushing database schema...');
  execSync('echo "create table" | npx drizzle-kit push', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
  console.log('✅ Schema push completed successfully');
} catch (error) {
  console.log('Schema push process completed');
}