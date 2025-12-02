import React from 'react';
import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Link href="/legal">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Legal Documents
          </Button>
        </Link>
      </div>
      
      <div className="prose prose-gray max-w-none">
        <h1>MyAmbulex LLC Privacy Policy</h1>
        
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <p><strong>Last Updated:</strong> [DATE]</p>
          <p><strong>Company:</strong> MyAmbulex LLC</p>
          <p><strong>Address:</strong> 1441 Woodmont Lane NW, #749, Atlanta, GA 30318</p>
          <p><strong>Phone:</strong> 404-301-0535</p>
          <p><strong>Email:</strong> info@MyAmbulex.com</p>
        </div>

        <h2>1. INTRODUCTION</h2>
        <p>MyAmbulex LLC ("we," "our," "us") operates a technology platform connecting individuals needing medical transportation with independent transportation providers. This Privacy Policy explains how we collect, use, protect, and share your information.</p>

        <h2>2. SCOPE AND APPLICABILITY</h2>
        <h3>2.1 Platform Service</h3>
        <p>This policy applies to our technology platform only. Independent drivers have their own privacy practices for which we are not responsible.</p>
        
        <h3>2.2 Medical Information</h3>
        <p>As a platform facilitating medical transportation, we may handle limited medical information necessary for transportation coordination.</p>
        
        <h3>2.3 Legal Compliance</h3>
        <p>Our practices comply with federal and Georgia privacy laws, including HIPAA where applicable.</p>

        <h2>3. INFORMATION WE COLLECT</h2>
        <h3>3.1 Account Information</h3>
        <ul>
          <li>Name, email address, phone number</li>
          <li>Payment information (processed by third parties)</li>
          <li>Profile information and preferences</li>
          <li>Identity verification documents</li>
        </ul>
        
        <h3>3.2 Transportation Information</h3>
        <ul>
          <li>Pickup and destination addresses</li>
          <li>Medical transportation requirements and accessibility needs</li>
          <li>Emergency contact information</li>
          <li>Special instructions for drivers</li>
        </ul>
        
        <h3>3.3 Location Data</h3>
        <ul>
          <li>GPS coordinates during ride booking and execution</li>
          <li>Location history for service improvement</li>
          <li>Route information for completed trips</li>
        </ul>
        
        <h3>3.4 Communication Data</h3>
        <ul>
          <li>Messages between riders and drivers through Platform</li>
          <li>Customer service communications</li>
          <li>Feedback and reviews</li>
        </ul>
        
        <h3>3.5 Usage Analytics</h3>
        <ul>
          <li>Platform interaction data</li>
          <li>Feature usage statistics</li>
          <li>Performance metrics</li>
          <li>Device and browser information</li>
        </ul>
        
        <h3>3.6 Medical Information (Limited)</h3>
        <ul>
          <li>Mobility equipment needs</li>
          <li>Basic accessibility requirements</li>
          <li>General medical transportation needs</li>
          <li>Emergency medical contact information</li>
        </ul>

        <h2>4. HOW WE USE INFORMATION</h2>
        <h3>4.1 Primary Purposes</h3>
        <ul>
          <li>Facilitate medical transportation connections</li>
          <li>Process payments and provide receipts</li>
          <li>Verify user identity and qualifications</li>
          <li>Provide customer support services</li>
          <li>Ensure safety and security of all users</li>
        </ul>
        
        <h3>4.2 Platform Improvement</h3>
        <ul>
          <li>Analyze usage patterns to improve functionality</li>
          <li>Develop new features and services</li>
          <li>Conduct research and analytics</li>
          <li>Enhance user experience</li>
        </ul>
        
        <h3>4.3 Legal and Safety Compliance</h3>
        <ul>
          <li>Comply with legal and regulatory requirements</li>
          <li>Investigate safety incidents and violations</li>
          <li>Prevent fraud and unauthorized use</li>
          <li>Protect rights and property</li>
        </ul>
        
        <h3>4.4 Communications</h3>
        <ul>
          <li>Send service-related notifications</li>
          <li>Provide customer support</li>
          <li>Share important updates and announcements</li>
          <li>Marketing communications (with consent)</li>
        </ul>

        <h2>5. INFORMATION SHARING AND DISCLOSURE</h2>
        <h3>5.1 We Do Not Sell Personal Information</h3>
        <p>We do not sell, rent, or trade personal information to third parties for their marketing purposes.</p>
        
        <h3>5.2 Service Providers and Partners</h3>
        <ul>
          <li>Payment processors (Stripe, PayPal) for transaction processing</li>
          <li>Mapping and GPS services for location functionality</li>
          <li>Email and communication service providers</li>
          <li>Cloud hosting and data storage providers</li>
          <li>Analytics and performance monitoring services</li>
        </ul>
        
        <h3>5.3 Independent Drivers</h3>
        <ul>
          <li>Contact information necessary for transportation coordination</li>
          <li>Pickup and destination information</li>
          <li>Special transportation requirements</li>
          <li>Emergency contact information when relevant</li>
        </ul>
        
        <h3>5.4 Legal Requirements</h3>
        <ul>
          <li>When required by law, court order, or legal process</li>
          <li>To protect safety and prevent harm</li>
          <li>To investigate violations of Terms of Service</li>
          <li>In connection with legal proceedings</li>
        </ul>
        
        <h3>5.5 Business Transfers</h3>
        <ul>
          <li>In case of merger, acquisition, or sale of assets</li>
          <li>Users will receive notice of any such transfer</li>
          <li>Privacy protections will continue under new ownership</li>
        </ul>
        
        <h3>5.6 Emergency Situations</h3>
        <ul>
          <li>To emergency responders when necessary for safety</li>
          <li>To medical professionals when required for care</li>
          <li>To law enforcement for safety or legal investigations</li>
        </ul>

        <h2>6. DATA SECURITY AND PROTECTION</h2>
        <h3>6.1 Security Measures</h3>
        <ul>
          <li>End-to-end encryption for sensitive communications</li>
          <li>Secure payment processing through certified providers</li>
          <li>Regular security audits and vulnerability assessments</li>
          <li>Access controls limiting employee data access</li>
          <li>Secure data transmission and storage protocols</li>
        </ul>
        
        <h3>6.2 Medical Information Protection</h3>
        <ul>
          <li>HIPAA-compliant handling of health information where applicable</li>
          <li>Minimal collection of medical data</li>
          <li>Secure storage and limited access to medical information</li>
          <li>Automatic deletion of unnecessary medical data</li>
        </ul>
        
        <h3>6.3 Data Retention</h3>
        <ul>
          <li>Account information retained while accounts are active</li>
          <li>Transaction records retained for 7 years for tax and legal purposes</li>
          <li>Communications retained for 2 years for quality and safety purposes</li>
          <li>Analytics data aggregated and anonymized for long-term use</li>
        </ul>

        <h2>7. YOUR PRIVACY RIGHTS</h2>
        <h3>7.1 Access and Download</h3>
        <ul>
          <li>Request access to your personal data</li>
          <li>Download a copy of your information</li>
          <li>Review data we have collected about you</li>
        </ul>
        
        <h3>7.2 Correction and Updates</h3>
        <ul>
          <li>Correct inaccurate information</li>
          <li>Update your profile and preferences</li>
          <li>Modify privacy settings</li>
        </ul>
        
        <h3>7.3 Deletion Rights</h3>
        <ul>
          <li>Delete your account and associated data</li>
          <li>Request removal of specific information</li>
          <li>Right to be forgotten (subject to legal retention requirements)</li>
        </ul>
        
        <h3>7.4 Communication Preferences</h3>
        <ul>
          <li>Opt out of marketing communications</li>
          <li>Manage notification settings</li>
          <li>Control how we contact you</li>
        </ul>
        
        <h3>7.5 Data Portability</h3>
        <ul>
          <li>Request your data in a portable format</li>
          <li>Transfer information to another service</li>
          <li>Export your transportation history</li>
        </ul>

        <h2>8. GEORGIA-SPECIFIC PRIVACY RIGHTS</h2>
        <h3>8.1 Georgia Consumer Privacy</h3>
        <p>We comply with applicable Georgia privacy laws and regulations.</p>
        
        <h3>8.2 Medical Privacy</h3>
        <p>Georgia medical privacy laws apply to any health information we handle.</p>
        
        <h3>8.3 State Law Compliance</h3>
        <p>Our practices meet all applicable Georgia state privacy requirements.</p>

        <h2>9. CHILDREN'S PRIVACY</h2>
        <h3>9.1 Age Restrictions</h3>
        <p>Our Platform is not intended for children under 18. We do not knowingly collect information from minors.</p>
        
        <h3>9.2 Parental Consent</h3>
        <p>If a minor's information is discovered, we will delete it unless proper parental consent is obtained.</p>
        
        <h3>9.3 Medical Transport</h3>
        <p>Minors may be transported with proper adult supervision and consent.</p>

        <h2>10. THIRD-PARTY LINKS AND SERVICES</h2>
        <h3>10.1 External Links</h3>
        <p>Our Platform may contain links to third-party websites with their own privacy practices.</p>
        
        <h3>10.2 Independent Drivers</h3>
        <p>Drivers are independent contractors with their own privacy practices for which we are not responsible.</p>
        
        <h3>10.3 Payment Processors</h3>
        <p>Third-party payment processors have their own privacy policies governing payment information.</p>

        <h2>11. INTERNATIONAL DATA TRANSFERS</h2>
        <h3>11.1 Domestic Operations</h3>
        <p>We primarily operate within the United States and store data domestically.</p>
        
        <h3>11.2 Service Providers</h3>
        <p>Some service providers may process data internationally with appropriate safeguards.</p>
        
        <h3>11.3 Cross-Border Protection</h3>
        <p>International transfers include appropriate privacy protections.</p>

        <h2>12. PRIVACY POLICY UPDATES</h2>
        <h3>12.1 Notification</h3>
        <p>We will notify users of material changes to this Privacy Policy.</p>
        
        <h3>12.2 Effective Date</h3>
        <p>Updates become effective 30 days after notification unless otherwise specified.</p>
        
        <h3>12.3 Continued Use</h3>
        <p>Continued use of Platform after updates constitutes acceptance of changes.</p>

        <h2>13. CONTACT INFORMATION</h2>
        <ul>
          <li><strong>Data Protection Officer:</strong> privacy@MyAmbulex.com</li>
          <li><strong>General Privacy Questions:</strong> info@MyAmbulex.com</li>
          <li><strong>Phone:</strong> 404-301-0535</li>
          <li><strong>Mail:</strong> 1441 Woodmont Lane NW, #749, Atlanta, GA 30318</li>
          <li><strong>Business Hours:</strong> Monday-Friday, 9:00 AM - 5:00 PM EST</li>
          <li><strong>Emergency Privacy Concerns:</strong> Available 24/7 through our emergency contact system</li>
        </ul>

        <h2>14. COMPLIANCE AND CERTIFICATION</h2>
        <h3>14.1 HIPAA Compliance</h3>
        <p>We maintain HIPAA compliance for any protected health information handled through our Platform.</p>
        
        <h3>14.2 Security Certifications</h3>
        <p>Our systems undergo regular security audits and maintain appropriate security certifications.</p>
        
        <h3>14.3 Georgia Law Compliance</h3>
        <p>All practices comply with applicable Georgia state privacy and medical information laws.</p>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-8">
          <p className="text-green-800 text-sm m-0">
            <strong>Legal Review:</strong> This Privacy Policy has been reviewed by healthcare legal counsel and complies with Georgia law and medical transportation regulations.
          </p>
        </div>
      </div>
    </div>
  );
}