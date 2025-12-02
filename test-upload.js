const fs = require('fs');
const path = require('path');

// Create a simple test image file
const testImageContent = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9j9yJqAAAAABJRU5ErkJggg==', 'base64');
fs.writeFileSync(path.join(__dirname, 'test-license.png'), testImageContent);

console.log('Test image file created: test-license.png');

// Test the document upload API
async function testDocumentUpload() {
    const FormData = require('form-data');
    const axios = require('axios');
    
    const form = new FormData();
    form.append('document', fs.createReadStream('test-license.png'));
    form.append('docType', 'licensePhotoFront');
    
    try {
        const response = await axios.post('http://localhost:5000/api/driver/documents/upload', form, {
            headers: {
                ...form.getHeaders(),
                'Cookie': 'myambulex.sid=test-session-id'
            }
        });
        
        console.log('Upload successful:', response.data);
    } catch (error) {
        console.log('Upload error:', error.response?.data || error.message);
    }
}

testDocumentUpload();