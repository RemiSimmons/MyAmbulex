import React from 'react';
import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TermsOfServicePage() {
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
        <h1>MyAmbulex LLC Terms of Service</h1>
        
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <p><strong>Last Updated:</strong> [DATE]</p>
          <p><strong>Company:</strong> MyAmbulex LLC</p>
          <p><strong>Address:</strong> 1441 Woodmont Lane NW, #749, Atlanta, GA 30318</p>
          <p><strong>Phone:</strong> 404-301-0535</p>
          <p><strong>Email:</strong> info@MyAmbulex.com</p>
        </div>

        <h2>1. ACCEPTANCE OF TERMS</h2>
        <p>By accessing or using MyAmbulex LLC's platform ("Platform"), you agree to these Terms of Service ("Terms"). If you disagree with any provision, discontinue use immediately.</p>

        <h2>2. PLATFORM SERVICE DESCRIPTION</h2>
        <h3>2.1 Technology Platform</h3>
        <p>MyAmbulex LLC operates a technology platform that connects individuals needing medical transportation with qualified independent transportation providers through a competitive bidding system.</p>
        
        <h3>2.2 Platform Role</h3>
        <p>MyAmbulex LLC is NOT a medical transportation provider, medical service provider, common carrier, or broker. We provide technology services only.</p>
        
        <h3>2.3 Independent Contractors</h3>
        <p>All transportation services are provided by independent contractors who are not employees, agents, or representatives of MyAmbulex LLC.</p>
        
        <h3>2.4 Direct Service Relationships</h3>
        <p>Transportation service contracts are formed directly between users and drivers. MyAmbulex LLC is not a party to these service contracts.</p>

        <h2>3. USER ACCOUNTS AND ELIGIBILITY</h2>
        <h3>3.1 Eligibility Requirements</h3>
        <ul>
          <li>Must be 18+ years old and legally competent to enter contracts</li>
          <li>Must have legal authority to agree to these Terms</li>
          <li>Must comply with all applicable laws in your jurisdiction</li>
          <li>Must provide accurate, current information during registration</li>
        </ul>
        
        <h3>3.2 Account Security</h3>
        <ul>
          <li>Maintain confidentiality of login credentials</li>
          <li>Notify us immediately of unauthorized access</li>
          <li>Responsible for all activities under your account</li>
          <li>Complete required identity verification processes</li>
        </ul>
        
        <h3>3.3 Georgia Operations</h3>
        <p>Platform operates in Georgia and users must comply with all applicable Georgia laws and regulations.</p>

        <h2>4. USER CONDUCT AND RESTRICTIONS</h2>
        <h3>4.1 Prohibited Activities</h3>
        <p>Users must NOT:</p>
        <ul>
          <li>Violate any federal, state, or local laws or regulations</li>
          <li>Harass, threaten, discriminate against, or harm others</li>
          <li>Provide false, misleading, or fraudulent information</li>
          <li>Impersonate any person or entity</li>
          <li>Interfere with Platform operation, security, or other users</li>
          <li>Use Platform for unauthorized commercial purposes</li>
          <li>Access Platform through automated means without permission</li>
          <li>Violate intellectual property rights</li>
        </ul>
        
        <h3>4.2 Medical Transportation Specific Restrictions</h3>
        <ul>
          <li>Platform is for non-emergency medical transportation only</li>
          <li>Emergency medical situations require immediate contact with 911</li>
          <li>Users may not request transport for medical emergencies</li>
          <li>Drivers are not authorized to provide medical services or advice</li>
        </ul>

        <h2>5. MEDICAL TRANSPORTATION SERVICES</h2>
        <h3>5.1 Platform Facilitation Only</h3>
        <p>Platform facilitates connections between users and independent transportation providers. MyAmbulex LLC does not provide transportation services.</p>
        
        <h3>5.2 Medical Readiness</h3>
        <p>Users assume full responsibility for:</p>
        <ul>
          <li>Medical fitness to travel</li>
          <li>Bringing necessary medications and medical equipment</li>
          <li>Communicating medical needs to drivers</li>
          <li>Having appropriate medical clearance for transport</li>
        </ul>
        
        <h3>5.3 Emergency Protocols</h3>
        <ul>
          <li>Medical emergencies require immediate 911 contact</li>
          <li>Platform is not appropriate for emergency medical transport</li>
          <li>Users must have emergency contact information accessible</li>
        </ul>
        
        <h3>5.4 HIPAA Compliance</h3>
        <p>Any medical information shared through Platform is handled in compliance with applicable privacy laws.</p>

        <h2>6. PAYMENTS, FEES, AND REFUNDS</h2>
        <h3>6.1 Rider Payments</h3>
        <ul>
          <li>Pay agreed fare amount plus applicable Platform fees</li>
          <li>Payment processed through secure third-party providers</li>
          <li>Responsible for all charges incurred under account</li>
        </ul>
        
        <h3>6.2 Driver Compensation</h3>
        <ul>
          <li>Receive percentage of fare as specified in Driver Agreement</li>
          <li>Subject to Platform service fees</li>
          <li>Responsible for tax obligations</li>
        </ul>
        
        <h3>6.3 Refund Policy</h3>
        <ul>
          <li>Refunds subject to cancellation policy</li>
          <li>Platform fees generally non-refundable</li>
          <li>Disputes handled through customer service process</li>
        </ul>

        <h2>7. INSURANCE AND LIABILITY</h2>
        <h3>7.1 Driver Insurance Requirements</h3>
        <ul>
          <li>All drivers must maintain required commercial insurance</li>
          <li>Insurance verification conducted by Platform</li>
          <li>Minimum coverage requirements exceed Georgia state minimums</li>
        </ul>
        
        <h3>7.2 Platform Liability Limitations</h3>
        <p><strong>MYAMBULEX LLC'S LIABILITY IS LIMITED TO THE MAXIMUM EXTENT PERMITTED BY GEORGIA LAW. WE ARE NOT LIABLE FOR:</strong></p>
        <ul>
          <li>Transportation services provided by independent drivers</li>
          <li>Medical emergencies or health-related incidents</li>
          <li>Vehicle accidents, injuries, or property damage</li>
          <li>Driver conduct, negligence, or violations</li>
          <li>Service quality, safety, or reliability</li>
          <li>Indirect, incidental, or consequential damages</li>
        </ul>
        
        <h3>7.3 User Responsibilities</h3>
        <ul>
          <li>Maintain appropriate personal insurance coverage</li>
          <li>Understand insurance coverage for medical transportation</li>
          <li>Report safety concerns immediately</li>
        </ul>

        <h2>8. INDEMNIFICATION</h2>
        <p>Users agree to indemnify and hold harmless MyAmbulex LLC from all claims, damages, losses, and expenses arising from:</p>
        <ul>
          <li>User's use of Platform or transportation services</li>
          <li>User's violation of these Terms</li>
          <li>User's violation of laws or third-party rights</li>
          <li>Transportation services obtained through Platform</li>
        </ul>

        <h2>9. INTELLECTUAL PROPERTY</h2>
        <h3>9.1 Platform Ownership</h3>
        <p>All Platform content, features, functionality, trademarks, and technology remain the exclusive property of MyAmbulex LLC.</p>
        
        <h3>9.2 User License</h3>
        <p>Users receive a limited, non-exclusive, non-transferable license to use Platform for personal medical transportation needs only.</p>
        
        <h3>9.3 User Content</h3>
        <p>Users grant MyAmbulex LLC a license to use submitted content for Platform operation and improvement.</p>

        <h2>10. PRIVACY AND DATA PROTECTION</h2>
        <h3>10.1 Privacy Policy</h3>
        <p>Data collection and use governed by our Privacy Policy, incorporated by reference.</p>
        
        <h3>10.2 Medical Information</h3>
        <p>Platform may handle medical information necessary for transportation coordination in compliance with HIPAA and other applicable privacy laws.</p>
        
        <h3>10.3 Data Security</h3>
        <p>We implement reasonable security measures but cannot guarantee absolute security.</p>

        <h2>11. PLATFORM AVAILABILITY AND MODIFICATIONS</h2>
        <h3>11.1 Service Availability</h3>
        <p>Platform provided "as is" without guarantees of uninterrupted service.</p>
        
        <h3>11.2 Modifications</h3>
        <p>We reserve the right to modify, suspend, or discontinue Platform features with notice when practicable.</p>
        
        <h3>11.3 Updates</h3>
        <p>Terms may be updated periodically with notice to users.</p>

        <h2>12. TERMINATION</h2>
        <h3>12.1 User Termination</h3>
        <p>Users may close accounts at any time with notice.</p>
        
        <h3>12.2 Platform Termination</h3>
        <p>We may suspend or terminate accounts for:</p>
        <ul>
          <li>Terms violations</li>
          <li>Legal violations</li>
          <li>Safety concerns</li>
          <li>Fraudulent activity</li>
          <li>Other reasons with notice when required by law</li>
        </ul>
        
        <h3>12.3 Effect of Termination</h3>
        <p>Upon termination, access rights end, but certain provisions survive including payment obligations, indemnification, and dispute resolution.</p>

        <h2>13. DISPUTE RESOLUTION</h2>
        <h3>13.1 Governing Law</h3>
        <p>These Terms are governed by Georgia law without regard to conflict of law principles.</p>
        
        <h3>13.2 Venue</h3>
        <p>Legal proceedings must be brought in state or federal courts in Fulton County, Georgia.</p>
        
        <h3>13.3 Arbitration</h3>
        <p>Claims under $10,000 subject to binding arbitration in Atlanta, Georgia, under American Arbitration Association Consumer Rules.</p>
        
        <h3>13.4 Class Action Waiver</h3>
        <p>Users waive rights to participate in class action lawsuits against MyAmbulex LLC.</p>
        
        <h3>13.5 Legal Fees</h3>
        <p>Prevailing party in disputes may recover reasonable attorney fees and costs.</p>

        <h2>14. MISCELLANEOUS</h2>
        <h3>14.1 Entire Agreement</h3>
        <p>These Terms constitute the entire agreement between users and MyAmbulex LLC regarding Platform use.</p>
        
        <h3>14.2 Severability</h3>
        <p>If any provision is unenforceable, the remainder remains in full effect.</p>
        
        <h3>14.3 Waiver</h3>
        <p>Failure to enforce any provision does not waive future enforcement rights.</p>
        
        <h3>14.4 Assignment</h3>
        <p>Users may not assign rights under these Terms. MyAmbulex LLC may assign with notice.</p>

        <h2>15. CONTACT INFORMATION</h2>
        <ul>
          <li><strong>General Inquiries:</strong> info@MyAmbulex.com</li>
          <li><strong>Legal Matters:</strong> legal@MyAmbulex.com</li>
          <li><strong>Phone:</strong> 404-301-0535</li>
          <li><strong>Address:</strong> 1441 Woodmont Lane NW, #749, Atlanta, GA 30318</li>
        </ul>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-8">
          <p className="text-green-800 text-sm m-0">
            <strong>Legal Review:</strong> These Terms of Service have been reviewed by healthcare legal counsel and comply with Georgia law and medical transportation regulations.
          </p>
        </div>
      </div>
    </div>
  );
}