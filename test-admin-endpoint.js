import express from 'express';
import session from 'express-session';
import { adminDocumentsRouter } from './server/routes/admin-documents.js';

// Create a minimal Express app to test the admin route
const app = express();

// Mock session middleware
app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: true
}));

// Mock authentication middleware
app.use((req, res, next) => {
    req.user = { id: 1, username: 'admin', role: 'admin' };
    next();
});

// Test the admin documents route
app.use('/api/admin/documents', adminDocumentsRouter);

// Test endpoint
app.get('/test', async (req, res) => {
    try {
        console.log('=== TESTING ADMIN DOCUMENTS ENDPOINT ===');
        
        // Simulate the admin documents request
        const mockReq = {
            user: { id: 1, username: 'admin', role: 'admin' },
            params: { driverId: 59 }
        };
        
        const mockRes = {
            json: (data) => {
                console.log('Response data:', JSON.stringify(data, null, 2));
                res.json(data);
            },
            status: (code) => ({
                json: (data) => {
                    console.log(`Response status: ${code}`);
                    console.log('Response data:', JSON.stringify(data, null, 2));
                    res.status(code).json(data);
                }
            })
        };
        
        // Call the route handler directly
        await adminDocumentsRouter(mockReq, mockRes);
        
    } catch (error) {
        console.error('Test error:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
    console.log('Visit http://localhost:3001/test to run the test');
});