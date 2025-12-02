import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, 
  FileText, 
  Shield, 
  Users, 
  Truck, 
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface LegalDocument {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  filename: string;
  category: 'essential' | 'operational' | 'compliance';
  content: string;
}

export default function DocumentsDownloadPage() {
  const [downloadedDocs, setDownloadedDocs] = useState<Set<string>>(new Set());

  const legalDocuments: LegalDocument[] = [
    {
      id: 'beta-testing-agreement',
      title: 'Beta Testing Agreement',
      description: 'Agreement for beta testers participating in the MyAmbulex testing program',
      icon: <Users className="h-5 w-5" />,
      filename: 'MyAmbulex_Beta_Testing_Agreement.txt',
      category: 'operational',
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
    {
      id: 'privacy-policy',
      title: 'Privacy Policy',
      description: 'How MyAmbulex collects, uses, and protects user information',
      icon: <Shield className="h-5 w-5" />,
      filename: 'MyAmbulex_Privacy_Policy.txt',
      category: 'essential',
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
    {
      id: 'terms-of-service',
      title: 'Terms of Service',
      description: 'Terms and conditions for using the MyAmbulex platform',
      icon: <FileText className="h-5 w-5" />,
      filename: 'MyAmbulex_Terms_of_Service.txt',
      category: 'essential',
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
    {
      id: 'driver-agreement',
      title: 'Driver Agreement',
      description: 'Service agreement for drivers providing transportation services',
      icon: <Truck className="h-5 w-5" />,
      filename: 'MyAmbulex_Driver_Agreement.txt',
      category: 'operational',
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
    {
      id: 'liability-waiver',
      title: 'Liability Waiver',
      description: 'Transportation liability waiver for medical transport services',
      icon: <AlertTriangle className="h-5 w-5" />,
      filename: 'MyAmbulex_Liability_Waiver.txt',
      category: 'compliance',
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
  ];

  const downloadDocument = (doc: LegalDocument) => {
    const blob = new Blob([doc.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = doc.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadedDocs(prev => new Set(prev).add(doc.id));
  };

  const downloadAllDocuments = () => {
    legalDocuments.forEach(doc => {
      setTimeout(() => downloadDocument(doc), 100 * legalDocuments.indexOf(doc));
    });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'essential':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'operational':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'compliance':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Legal Documents Download</h1>
        <p className="text-gray-600 mb-6">
          Download individual legal documents or all documents at once. These templates 
          require customization and legal review before implementation.
        </p>
        
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> These are template documents that require professional 
            legal review and customization for your jurisdiction before use. Consult with a 
            healthcare law attorney familiar with medical transportation regulations.
          </AlertDescription>
        </Alert>

        <div className="flex items-center gap-4 mb-6">
          <Button onClick={downloadAllDocuments} size="lg">
            <Download className="h-4 w-4 mr-2" />
            Download All Documents
          </Button>
          <Badge variant="outline" className="text-sm">
            {legalDocuments.length} Documents Available
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {legalDocuments.map((doc) => (
          <Card key={doc.id} className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {doc.icon}
                  <span className="text-lg">{doc.title}</span>
                </div>
                {downloadedDocs.has(doc.id) && (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 flex-1">
                {doc.description}
              </p>
              
              <div className="flex items-center justify-between">
                <Badge className={getCategoryColor(doc.category)}>
                  {doc.category}
                </Badge>
                <span className="text-xs text-gray-500">
                  {doc.filename}
                </span>
              </div>

              <Button 
                onClick={() => downloadDocument(doc)}
                variant="outline" 
                className="w-full"
                disabled={downloadedDocs.has(doc.id)}
              >
                <Download className="h-4 w-4 mr-2" />
                {downloadedDocs.has(doc.id) ? 'Downloaded' : 'Download'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 space-y-4">
        <h2 className="text-2xl font-semibold">Customization Requirements</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Required Customizations</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>• Replace [STATE] with your operating jurisdiction</li>
                <li>• Update all email addresses and contact details</li>
                <li>• Specify minimum insurance coverage amounts</li>
                <li>• Add effective dates and review schedules</li>
                <li>• Customize for your specific business model</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Legal Review Recommended</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>• Healthcare law attorney consultation</li>
                <li>• State/local transportation licensing requirements</li>
                <li>• HIPAA compliance for medical information</li>
                <li>• ADA compliance for accessibility</li>
                <li>• Insurance and liability coverage review</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}