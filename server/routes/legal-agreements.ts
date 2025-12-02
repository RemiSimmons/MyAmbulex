import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { insertLegalAgreementSignatureSchema } from '../../shared/schema';

const router = Router();

// Get user's legal agreement signatures
router.get('/signatures', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const signatures = await storage.getUserLegalAgreementSignatures(req.user.id);
    res.json(signatures);
  } catch (error) {
    console.error('Error getting legal agreement signatures:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get required documents for user
router.get('/required-documents', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const requiredDocs = await storage.getRequiredDocumentsForUser(req.user.id);
    res.json({ requiredDocuments: requiredDocs });
  } catch (error) {
    console.error('Error getting required documents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check if user has signed all required documents
router.get('/completion-status', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const hasSignedAll = await storage.hasUserSignedAllRequiredDocuments(req.user.id);
    const requiredDocs = await storage.getRequiredDocumentsForUser(req.user.id);
    const signatures = await storage.getUserLegalAgreementSignatures(req.user.id);
    
    const signedDocTypes = signatures.map(sig => sig.documentType);
    const missingDocuments = requiredDocs.filter((docType: string) => !signedDocTypes.includes(docType));

    res.json({
      isComplete: hasSignedAll,
      requiredDocuments: requiredDocs,
      signedDocuments: signedDocTypes,
      missingDocuments
    });
  } catch (error) {
    console.error('Error checking completion status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sign a legal agreement
router.post('/sign', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const signatureData = insertLegalAgreementSignatureSchema.parse({
      ...req.body,
      userId: req.user.id,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || ''
    });

    const signature = await storage.createLegalAgreementSignature(signatureData);
    res.json(signature);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    console.error('Error signing legal agreement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check if user has signed a specific document
router.get('/signed/:documentType', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { documentType } = req.params;
    const hasSigned = await storage.hasUserSignedDocument(req.user.id, documentType);
    const signature = await storage.getLegalAgreementSignature(req.user.id, documentType);

    res.json({
      hasSigned,
      signature: signature || null
    });
  } catch (error) {
    console.error('Error checking document signature:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;