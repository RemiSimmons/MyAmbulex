import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

// Middleware to check if user has signed all required legal agreements
export const requireLegalAgreements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user has signed all required documents
    const hasSignedAll = await storage.hasUserSignedAllRequiredDocuments(req.user.id);
    
    if (!hasSignedAll) {
      return res.status(403).json({ 
        error: 'Legal agreements required',
        message: 'You must sign all required legal agreements before using this feature.',
        code: 'LEGAL_AGREEMENTS_REQUIRED'
      });
    }

    next();
  } catch (error) {
    console.error('Error checking legal agreements:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Middleware to check specific document types
export const requireSpecificAgreement = (documentType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const hasSigned = await storage.hasUserSignedDocument(req.user.id, documentType);
      
      if (!hasSigned) {
        return res.status(403).json({ 
          error: 'Specific legal agreement required',
          message: `You must sign the ${documentType.replace('_', ' ')} before using this feature.`,
          code: 'SPECIFIC_AGREEMENT_REQUIRED',
          requiredDocument: documentType
        });
      }

      next();
    } catch (error) {
      console.error('Error checking specific legal agreement:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Middleware to attach legal agreement status to user object
export const attachLegalAgreementStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user) {
      const hasSignedAll = await storage.hasUserSignedAllRequiredDocuments(req.user.id);
      const signatures = await storage.getUserLegalAgreementSignatures(req.user.id);
      
      // Attach legal agreement status to user object
      (req.user as any).legalAgreementStatus = {
        hasSignedAll,
        signatures: signatures.map(sig => ({
          documentType: sig.documentType,
          signedAt: sig.signedAt,
          version: sig.documentVersion
        }))
      };
    }

    next();
  } catch (error) {
    console.error('Error attaching legal agreement status:', error);
    next(); // Continue without legal agreement status
  }
};