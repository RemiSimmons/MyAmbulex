const fs = require('fs');
const path = require('path');

// Create test image files for different document types
const testImageContent = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9j9yJqAAAAABJRU5ErkJggg==', 'base64');

// Create different test documents
const testDocuments = [
    { name: 'test-license-front.png', type: 'licensePhotoFront' },
    { name: 'test-license-back.png', type: 'licensePhotoBack' },
    { name: 'test-insurance.png', type: 'insuranceDocument' },
    { name: 'test-vehicle-registration.png', type: 'vehicleRegistration' },
    { name: 'test-mvr.png', type: 'mvrRecord' },
    { name: 'test-background-check.png', type: 'backgroundCheck' },
    { name: 'test-medical-cert.png', type: 'medicalCertification' }
];

// Create test files
testDocuments.forEach(doc => {
    fs.writeFileSync(path.join(__dirname, doc.name), testImageContent);
    console.log(`Created test file: ${doc.name}`);
});

console.log('All test documents created successfully!');
console.log('Files created:', testDocuments.map(d => d.name).join(', '));

// Test the document fetch API
async function testDocumentFetch() {
    const axios = require('axios');
    
    try {
        const response = await axios.get('http://localhost:5000/api/driver/documents', {
            headers: {
                'Cookie': 'myambulex.sid=test-session-id'
            }
        });
        
        console.log('\nDocument fetch successful:', response.data);
    } catch (error) {
        console.log('\nDocument fetch error:', error.response?.status, error.response?.data || error.message);
    }
}

testDocumentFetch();