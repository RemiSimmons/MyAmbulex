// Simple test to verify legal agreement status for debugging
import { execSync } from 'child_process';

console.log('Testing legal agreement status...\n');

// Test database query directly
console.log('=== DATABASE VERIFICATION ===');
const dbResults = execSync(`psql "${process.env.DATABASE_URL}" -c "
SELECT 
  u.id as user_id, 
  u.username, 
  u.role,
  las.document_type,
  las.signed_at,
  las.is_active
FROM users u 
LEFT JOIN legal_agreement_signatures las ON u.id = las.user_id AND las.is_active = true
WHERE u.username = 'Remi' OR u.id = 3
ORDER BY las.signed_at DESC;
"`, { encoding: 'utf8' });

console.log('User and signatures:');
console.log(dbResults);

// Test required documents
console.log('\n=== REQUIRED DOCUMENTS ===');
const requiredDocs = execSync(`psql "${process.env.DATABASE_URL}" -c "
SELECT DISTINCT document_type 
FROM legal_agreement_signatures 
WHERE is_required = true 
ORDER BY document_type;
"`, { encoding: 'utf8' });

console.log('Required document types:');
console.log(requiredDocs);

console.log('\n=== COMPLETION STATUS CHECK ===');
console.log('A user has signed all required documents if they have active signatures for:');
console.log('- terms_of_service (Platform User Agreement)');
console.log('- privacy_policy (Privacy Policy)');

console.log('\nBased on the above data:');
console.log('- User "Remi" (ID: 3) should have both required signatures');
console.log('- Both signatures should be active (is_active = t)');
console.log('- The hasUserSignedAllRequiredDocuments function should return true');

console.log('\nIf the function returns false, the issue is in the storage layer logic.');
console.log('The legal agreement middleware will block ride creation until this returns true.');