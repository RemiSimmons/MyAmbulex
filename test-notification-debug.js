/**
 * Debug the notification system directly
 */

const { execSync } = require('child_process');

async function debugNotifications() {
  console.log('🔧 Starting notification debug...');
  
  try {
    // Test 1: Login as Remi and check for notifications
    console.log('\n1️⃣ Testing login as Remi...');
    const loginCmd = `curl -X POST "http://localhost:5000/api/auth/login" \
      -H "Content-Type: application/json" \
      -d '{"username":"Remi","password":"myambulex123"}' \
      -c remi_session.txt \
      -s`;
    
    const loginResult = execSync(loginCmd, { encoding: 'utf8' });
    console.log('Login result:', loginResult);
    
    // Test 2: Check notifications using the session
    console.log('\n2️⃣ Testing notifications API...');
    const notifCmd = `curl -X GET "http://localhost:5000/api/notifications" \
      -b remi_session.txt \
      -s`;
    
    const notifResult = execSync(notifCmd, { encoding: 'utf8' });
    console.log('Notifications result:', notifResult);
    
    console.log('\n✅ Debug completed');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugNotifications();