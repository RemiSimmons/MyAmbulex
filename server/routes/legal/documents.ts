import { Router } from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

// Legal document download endpoints
router.get('/api/legal/download/platform-user-agreement', (req: Request, res: Response) => {
  const filePath = path.resolve('attached_assets', 'MyAmbulex Platform User Agreement_1753393371719.pdf');
  res.download(filePath, 'MyAmbulex_Platform_User_Agreement_2025.pdf', (err) => {
    if (err) {
      console.error('Error downloading platform user agreement:', err);
      res.status(404).json({ error: 'Platform User Agreement document not found' });
    }
  });
});

router.get('/api/legal/download/privacy-policy', (req: Request, res: Response) => {
  const filePath = path.resolve('attached_assets', 'MyAmbulex Privacy Policy_1753393371720.pdf');
  res.download(filePath, 'MyAmbulex_Privacy_Policy_2025.pdf', (err) => {
    if (err) {
      console.error('Error downloading privacy policy:', err);
      res.status(404).json({ error: 'Privacy Policy document not found' });
    }
  });
});

router.get('/api/legal/download/driver-agreement', (req: Request, res: Response) => {
  const filePath = path.join(__dirname, '../../../attached_assets/MyAmbulex Driver Services Agreement_1750784075728.pdf');
  res.download(filePath, 'MyAmbulex_Driver_Services_Agreement.pdf', (err) => {
    if (err) {
      console.error('Error downloading driver agreement:', err);
      res.status(404).json({ error: 'Driver Services Agreement document not found' });
    }
  });
});

// List available legal documents
router.get('/api/legal/list', (req: Request, res: Response) => {
  const documents = [
    { id: 'platform-user-agreement', name: 'Platform User Agreement', url: '/api/legal/download/platform-user-agreement' },
    { id: 'privacy-policy', name: 'Privacy Policy', url: '/api/legal/download/privacy-policy' },
    { id: 'driver-agreement', name: 'Driver Services Agreement', url: '/api/legal/download/driver-agreement' }
  ];
  
  res.json({ documents });
});

export default router;