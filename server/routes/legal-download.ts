import { Router } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';

const router = Router();
console.log('Legal download router initialized');

// Legal document content
const legalDocuments = {
  'beta-testing-agreement': {
    filename: 'MyAmbulex_Beta_Testing_Agreement.txt',
    title: 'Beta Testing Agreement',
    content: `MyAmbulex Beta Testing Agreement

Effective Date: [DATE]

Parties: MyAmbulex, Inc. ("Company") and Beta Tester ("Tester")

1. Purpose and Scope
This Agreement governs Tester's participation in the beta testing program for MyAmbulex's medical transportation platform ("Service"). The beta testing period runs from [START DATE] to [END DATE].

2. Beta Tester Responsibilities
- Provide genuine feedback on platform functionality, usability, and performance
- Test core features including ride booking, payment processing, and communication systems
- Report bugs, issues, and suggestions through designated feedback channels
- Participate in weekly check-ins and provide timely responses to surveys
- Use the platform in good faith for legitimate medical transportation needs

3. Company Responsibilities
- Provide access to the beta platform and technical support
- Respond to critical issues within 24 hours
- Maintain platform uptime of 99%+ during testing period
- Protect Tester's personal information per Privacy Policy
- Provide emergency support for safety-related issues

4. Data Collection and Use
Company will collect usage data, feedback, and performance metrics to improve the Service. All data collection complies with applicable privacy laws and Company's Privacy Policy.

5. Confidentiality
Tester agrees to keep confidential all non-public information about the Service, including features, pricing, and business strategies. This obligation survives termination of this Agreement.

6. Limitation of Liability
THE BETA SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES. COMPANY'S LIABILITY IS LIMITED TO THE MAXIMUM EXTENT PERMITTED BY LAW.

7. Termination
Either party may terminate participation with 48 hours notice. Company may terminate immediately for violations of this Agreement.

Tester Signature: _________________ Date: _________

Company Representative: _________________ Date: _________`
  },
  'privacy-policy': {
    filename: 'MyAmbulex_Privacy_Policy.txt',
    title: 'Privacy Policy',
    content: `MyAmbulex Privacy Policy

Last Updated: [DATE]

Information We Collect
- Account Information: Name, email, phone number, medical transport requirements
- Location Data: GPS coordinates during ride booking and execution
- Payment Information: Processed securely through Stripe/PayPal (not stored locally)
- Communication Data: Messages between riders and drivers
- Usage Analytics: Platform interaction data for service improvement

How We Use Information
- Facilitate medical transportation services
- Process payments and provide receipts
- Ensure safety and security of all users
- Improve platform functionality based on usage patterns
- Comply with legal and regulatory requirements

Information Sharing
We do not sell personal information. We may share data with:
- Service Providers: Payment processors, mapping services, email providers
- Legal Requirements: When required by law or to protect safety
- Business Transfers: In case of merger or acquisition (with notice)

Data Security
- End-to-end encryption for sensitive communications
- Secure payment processing through certified providers
- Regular security audits and penetration testing
- Access controls limiting employee data access

Your Rights
- Access and download your personal data
- Correct inaccurate information
- Delete your account and associated data
- Opt out of non-essential communications
- Request data portability

Contact Information
Data Protection Officer: privacy@myambulex.com
General Inquiries: support@myambulex.com`
  },
  'terms-of-service': {
    filename: 'MyAmbulex_Terms_of_Service.txt',
    title: 'Terms of Service',
    content: `MyAmbulex Terms of Service

Last Updated: [DATE]

1. Acceptance of Terms
By using MyAmbulex ("Service"), you agree to these Terms of Service ("Terms"). If you disagree with any part, please discontinue use.

2. Service Description
MyAmbulex connects individuals needing medical transportation with qualified drivers through a competitive bidding platform.

3. User Accounts
- Eligibility: Must be 18+ and legally able to enter contracts
- Registration: Provide accurate, current information
- Security: Maintain confidentiality of login credentials
- Verification: Complete identity and background verification as required

4. User Conduct
Users must not:
- Violate laws or regulations
- Harass, threaten, or discriminate against others
- Provide false information or impersonate others
- Interfere with platform operation or security
- Use the service for unauthorized commercial purposes

5. Medical Transportation Services
- Platform facilitates connections; Company is not a medical transport provider
- Drivers are independent contractors, not Company employees
- Users assume responsibility for medical readiness to travel
- Emergency medical situations require immediate contact with emergency services

6. Payments and Fees
- Riders: Pay agreed fare plus applicable fees
- Drivers: Receive fare minus platform commission
- Payment Processing: Handled by third-party providers
- Refunds: Subject to cancellation policy

7. Liability and Insurance
- Platform users maintain appropriate insurance coverage
- Company liability limited to maximum extent permitted by law
- Users release Company from claims arising from transportation services

8. Intellectual Property
All platform content, trademarks, and technology remain Company property. Users grant license to use their content for service operation.

9. Termination
Company may suspend or terminate accounts for Terms violations. Users may close accounts with notice.

10. Governing Law
These Terms are governed by [STATE] law. Disputes resolved through arbitration.

Contact: legal@myambulex.com`
  },
  'driver-agreement': {
    filename: 'MyAmbulex_Driver_Agreement.txt',
    title: 'Driver Agreement',
    content: `MyAmbulex Driver Services Agreement

Effective Date: [DATE]

1. Independent Contractor Relationship
Driver provides transportation services as an independent contractor, not as Company employee.

2. Driver Requirements
- Valid driver's license and vehicle registration
- Current auto insurance meeting minimum requirements
- Vehicle inspection and safety certification
- Background check clearance
- Medical transport training (preferred)

3. Service Standards
- Professional conduct and appearance
- Punctuality and reliability
- Vehicle cleanliness and maintenance
- Assistance with mobility equipment as needed
- Compliance with all traffic and transportation laws

4. Platform Use
- Accept rides through platform bidding system
- Update availability and location accurately
- Complete rides as agreed with riders
- Use in-app communication for coordination

5. Compensation
- Receive percentage of ride fare as specified
- Payment processed weekly via ACH transfer
- Responsible for own tax obligations
- May receive bonuses for exceptional service

6. Vehicle and Equipment
- Maintain vehicle in safe, clean condition
- Provide required safety and accessibility equipment
- Regular vehicle inspections as required
- Insurance coverage meeting platform standards

7. Termination
Either party may terminate with notice. Company may terminate immediately for safety violations or Terms breaches.

Driver Signature: _________________ Date: _________`
  },
  'liability-waiver': {
    filename: 'MyAmbulex_Liability_Waiver.txt',
    title: 'Liability Waiver',
    content: `MyAmbulex Transportation Liability Waiver

Participant: [NAME] Date: [DATE]

Assumption of Risk
I understand that medical transportation involves inherent risks including, but not limited to, vehicle accidents, medical emergencies, and equipment malfunctions.

Release of Claims
I release MyAmbulex, its officers, employees, and drivers from all claims, damages, or injuries arising from my use of transportation services, except those caused by gross negligence or willful misconduct.

Medical Fitness
I certify that I am medically fit to travel and have disclosed all relevant medical conditions affecting safe transportation.

Emergency Contact
Name: _____________ Phone: _____________
Relationship: _____________ Medical Provider: _____________

Signature: _________________ Date: _________`
  }
};

// Download individual document
router.get('/download/:documentId', (req, res) => {
  console.log('Legal document request for:', req.params.documentId);
  const { documentId } = req.params;
  const document = legalDocuments[documentId as keyof typeof legalDocuments];

  if (!document) {
    console.log('Document not found:', documentId);
    return res.status(404).json({ error: 'Document not found' });
  }

  console.log('Serving legal document:', document.title);
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `inline; filename="${document.filename}"`);
  res.send(document.content);
});

// Download all documents as ZIP
router.get('/download-all', (req, res) => {
  // For simplicity, we'll return a JSON response with all documents
  // In a production environment, you might want to create an actual ZIP file
  const allDocuments = Object.entries(legalDocuments).map(([id, doc]) => ({
    id,
    filename: doc.filename,
    title: doc.title,
    content: doc.content
  }));

  res.json({
    documents: allDocuments,
    downloadDate: new Date().toISOString(),
    note: 'These documents require legal review and customization before use.'
  });
});

// Get document list
router.get('/list', (req, res) => {
  console.log('Legal document list requested');
  const documentList = Object.entries(legalDocuments).map(([id, doc]) => ({
    id,
    filename: doc.filename,
    title: doc.title
  }));

  console.log('Returning document list:', documentList.length, 'documents');
  res.json({ documents: documentList });
});

console.log('Legal download router export - routes defined:', router.stack?.length || 'unknown');
export default router;