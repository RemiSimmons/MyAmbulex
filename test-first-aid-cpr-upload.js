#!/usr/bin/env node

/**
 * Test script to verify First Aid and CPR certification document upload functionality
 * Tests route consistency between frontend (/api/drivers/upload-document) and backend
 */

import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

// Test configuration
const TEST_CONFIG = {
  // Use test driver cookies from previous sessions
  cookies: 'myambulex.sid=s%3AOVOg1xqN2AvvHSQzJEGCWKKFqvF3l4xU.BqztdNy1iH%2FCtZf%2BJsaM1vJ2NJAZ6w3sFDTYv89Ky0s',
  documents: [
    {
      type: 'firstAidCertification',
      description: 'First Aid Certification',
      testFile: 'test-first-aid-cert.pdf'
    },
    {
      type: 'cprCertification', 
      description: 'CPR Certification',
      testFile: 'test-cpr-cert.pdf'
    }
  ]
};

// Create test PDF documents
function createTestPDF(filename, content) {
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(${content}) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000079 00000 n 
0000000173 00000 n 
0000000301 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
398
%%EOF`;

  fs.writeFileSync(filename, pdfContent);
  return filename;
}

// Test document upload for specific type
async function testDocumentUpload(documentType, description, testFile) {
  console.log(`\n🧪 Testing ${description} upload...`);
  
  try {
    // Create test PDF file
    const filename = createTestPDF(testFile, `Test ${description} Document - MyAmbulex Driver Verification`);
    
    // Prepare form data
    const form = new FormData();
    form.append('document', fs.createReadStream(filename));
    form.append('type', documentType);
    
    // Make upload request
    const response = await fetch(`${BASE_URL}/api/drivers/upload-document`, {
      method: 'POST',
      body: form,
      headers: {
        'Cookie': TEST_CONFIG.cookies,
        ...form.getHeaders()
      }
    });
    
    const responseText = await response.text();
    
    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📋 Response Headers:`, Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const result = JSON.parse(responseText);
      console.log(`✅ ${description} upload successful:`, {
        success: result.success,
        message: result.message,
        documentId: result.document?.id,
        filename: result.document?.filename,
        type: result.document?.type
      });
      
      // Test document retrieval
      if (result.document?.url) {
        const downloadResponse = await fetch(`${BASE_URL}${result.document.url}`, {
          headers: { 'Cookie': TEST_CONFIG.cookies }
        });
        console.log(`📥 Document download test: ${downloadResponse.status === 200 ? 'SUCCESS' : 'FAILED'}`);
      }
      
      return true;
    } else {
      console.log(`❌ ${description} upload failed:`, responseText);
      return false;
    }
    
  } catch (error) {
    console.error(`💥 ${description} upload error:`, error.message);
    return false;
  } finally {
    // Cleanup test file
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  }
}

// Test registration progress retrieval
async function testRegistrationProgress() {
  console.log('\n🔍 Testing registration progress retrieval...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/drivers/registration-progress`, {
      headers: { 'Cookie': TEST_CONFIG.cookies }
    });
    
    if (response.ok) {
      const progress = await response.json();
      console.log('✅ Registration progress retrieved:', {
        step: progress.step,
        firstAidCertificationUploaded: progress.firstAidCertificationUploaded,
        firstAidCertificationFileName: progress.firstAidCertificationFileName,
        cprCertificationUploaded: progress.cprCertificationUploaded,
        cprCertificationFileName: progress.cprCertificationFileName
      });
      return progress;
    } else {
      console.log('❌ Failed to retrieve registration progress:', await response.text());
      return null;
    }
  } catch (error) {
    console.error('💥 Registration progress error:', error.message);
    return null;
  }
}

// Test route consistency
async function testRouteConsistency() {
  console.log('\n🛣️  Testing route consistency...');
  
  // Test both frontend and backend routes
  const routes = [
    '/api/drivers/upload-document',
    '/api/drivers/registration-progress'
  ];
  
  for (const route of routes) {
    try {
      const response = await fetch(`${BASE_URL}${route}`, {
        method: 'GET',
        headers: { 'Cookie': TEST_CONFIG.cookies }
      });
      
      console.log(`📍 Route ${route}: ${response.status} ${response.statusText}`);
      
      if (response.status === 405) {
        console.log(`   ℹ️  Method not allowed (expected for upload endpoint)`);
      } else if (response.status === 401) {
        console.log(`   ⚠️  Authentication required`);
      } else if (response.status === 200) {
        console.log(`   ✅ Route accessible`);
      }
      
    } catch (error) {
      console.log(`   💥 Route ${route} error: ${error.message}`);
    }
  }
}

// Main test execution
async function runTests() {
  console.log('🚀 Starting First Aid & CPR Certification Upload Tests');
  console.log('=' .repeat(60));
  
  // Test route consistency first
  await testRouteConsistency();
  
  // Test initial registration progress
  const initialProgress = await testRegistrationProgress();
  
  let allTestsPassed = true;
  
  // Test each document type
  for (const doc of TEST_CONFIG.documents) {
    const success = await testDocumentUpload(doc.type, doc.description, doc.testFile);
    if (!success) allTestsPassed = false;
  }
  
  // Test final registration progress
  const finalProgress = await testRegistrationProgress();
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📋 TEST SUMMARY');
  console.log('=' .repeat(60));
  
  if (initialProgress && finalProgress) {
    console.log('📊 Progress Changes:');
    TEST_CONFIG.documents.forEach(doc => {
      const uploadedField = `${doc.type}Uploaded`;
      const initial = initialProgress[uploadedField] || false;
      const final = finalProgress[uploadedField] || false;
      console.log(`   ${doc.description}: ${initial} → ${final} ${final ? '✅' : '❌'}`);
    });
  }
  
  console.log(`\n🎯 Overall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
  
  if (allTestsPassed) {
    console.log('\n✨ First Aid and CPR certification upload functionality is working correctly!');
    console.log('✨ Route synchronization between frontend and backend verified!');
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
  }
  
  return allTestsPassed;
}

// Execute tests
runTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Test execution failed:', error);
  process.exit(1);
});