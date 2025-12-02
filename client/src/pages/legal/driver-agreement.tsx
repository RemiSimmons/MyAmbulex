import React from 'react';
import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DriverAgreementPage() {
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
        <h1>MyAmbulex LLC Driver Services Agreement</h1>
        
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <p><strong>Effective Date:</strong> [DATE]</p>
          <p><strong>Company:</strong> MyAmbulex LLC</p>
          <p><strong>Address:</strong> 1441 Woodmont Lane NW, #749, Atlanta, GA 30318</p>
          <p><strong>Phone:</strong> 404-301-0535</p>
          <p><strong>Email:</strong> info@MyAmbulex.com</p>
        </div>

        <h2>1. PLATFORM SERVICES AND INDEPENDENT CONTRACTOR RELATIONSHIP</h2>
        <h3>1.1 Platform Service</h3>
        <p>MyAmbulex LLC ("Platform") operates a technology platform that connects individuals requiring non-emergency medical transportation with independent transportation providers ("Driver"). Platform is NOT a medical transportation provider, medical service provider, or common carrier.</p>
        
        <h3>1.2 Independent Contractor Status</h3>
        <p>Driver is an independent contractor providing transportation services directly to riders. Driver is NOT an employee, agent, or representative of Platform. Platform does not control the manner, method, or means by which Driver performs transportation services.</p>
        
        <h3>1.3 Direct Service Relationship</h3>
        <p>All transportation services are provided directly between Driver and riders. Platform facilitates connections only.</p>

        <h2>2. DRIVER REQUIREMENTS AND QUALIFICATIONS</h2>
        <h3>2.1 Licensing and Legal Requirements</h3>
        <ul>
          <li>Valid Georgia driver's license (or license valid in Georgia)</li>
          <li>Current vehicle registration and title</li>
          <li>Clean driving record (no DUI/DWI within 5 years, no reckless driving within 3 years)</li>
          <li>Successful completion of Platform-approved background check</li>
          <li>Vehicle age not exceeding 15 years unless specifically approved</li>
        </ul>
        
        <h3>2.2 Insurance Requirements (MANDATORY)</h3>
        <p>Driver must maintain and provide proof of:</p>
        <ul>
          <li>Commercial Auto Liability: Minimum $100,000/$300,000/$100,000 (exceeding Georgia's 25/50/25 minimum)</li>
          <li>General Liability: Minimum $1,000,000 per occurrence</li>
          <li>Professional Liability: Minimum $1,000,000 (if transporting medical patients)</li>
          <li>Workers' Compensation: As required by Georgia law if Driver employs others</li>
          <li>All policies must name MyAmbulex LLC as additional insured for vicarious liability only</li>
        </ul>
        
        <h3>2.3 Vehicle Requirements</h3>
        <ul>
          <li>Current Georgia vehicle inspection and safety certification</li>
          <li>Vehicle must accommodate medical equipment/mobility devices as applicable</li>
          <li>Regular maintenance documentation</li>
          <li>Compliance with all applicable DOT regulations</li>
        </ul>
        
        <h3>2.4 Training and Certification</h3>
        <ul>
          <li>Complete Platform-approved medical transport orientation</li>
          <li>First Aid/CPR certification (preferred but not required)</li>
          <li>Training on Americans with Disabilities Act (ADA) compliance</li>
          <li>Annual safety training updates</li>
        </ul>

        <h2>3. SERVICE STANDARDS AND COMPLIANCE</h2>
        <h3>3.1 Professional Standards</h3>
        <ul>
          <li>Maintain professional appearance and conduct</li>
          <li>Provide assistance with mobility equipment as needed and within capabilities</li>
          <li>Respect patient privacy and confidentiality</li>
          <li>Comply with all applicable federal, state, and local laws</li>
        </ul>
        
        <h3>3.2 Medical Transport Protocols</h3>
        <ul>
          <li>Driver is NOT authorized to provide medical services or advice</li>
          <li>Medical emergencies require immediate contact with 911</li>
          <li>Driver must have emergency contact information for all riders</li>
          <li>Compliance with HIPAA privacy requirements for any medical information encountered</li>
        </ul>
        
        <h3>3.3 Georgia Law Compliance</h3>
        <ul>
          <li>Adherence to Georgia Commercial Vehicle regulations</li>
          <li>Compliance with Georgia Department of Public Health medical transport guidelines</li>
          <li>Following all traffic and transportation laws</li>
        </ul>

        <h2>4. PLATFORM USE AND BIDDING SYSTEM</h2>
        <h3>4.1 Platform Access</h3>
        <p>Driver may access the Platform to view available transportation requests and submit bids for services.</p>
        
        <h3>4.2 Bidding Process</h3>
        <p>All transportation arrangements are direct contracts between Driver and rider, facilitated through Platform technology.</p>
        
        <h3>4.3 Communication</h3>
        <p>Driver must use Platform communication tools for initial coordination, maintaining records for safety and quality purposes.</p>

        <h2>5. COMPENSATION AND PAYMENT</h2>
        <h3>5.1 Fee Structure</h3>
        <p>Driver retains [X]% of the agreed fare amount, with Platform retaining [X]% as technology service fee.</p>
        
        <h3>5.2 Payment Processing</h3>
        <p>Payments processed weekly via ACH transfer to Driver's designated account.</p>
        
        <h3>5.3 Tax Obligations</h3>
        <p>Driver is solely responsible for all tax obligations, including self-employment taxes, and will receive Form 1099 for tax reporting.</p>

        <h2>6. LIMITATION OF LIABILITY AND INDEMNIFICATION</h2>
        <h3>6.1 Platform Liability Limitation</h3>
        <p><strong>PLATFORM'S LIABILITY IS LIMITED TO THE MAXIMUM EXTENT PERMITTED BY GEORGIA LAW. PLATFORM IS NOT LIABLE FOR:</strong></p>
        <ul>
          <li>Transportation services provided by Driver</li>
          <li>Medical emergencies or health-related incidents</li>
          <li>Vehicle accidents or injuries</li>
          <li>Driver's compliance with laws and regulations</li>
          <li>Quality or safety of transportation services</li>
        </ul>
        
        <h3>6.2 Driver Indemnification</h3>
        <p>Driver agrees to indemnify and hold harmless MyAmbulex LLC from all claims, damages, losses, and expenses arising from:</p>
        <ul>
          <li>Driver's provision of transportation services</li>
          <li>Driver's breach of this Agreement</li>
          <li>Driver's violation of laws or regulations</li>
          <li>Any actions or omissions in connection with transportation services</li>
        </ul>

        <h2>7. INSURANCE VERIFICATION AND MONITORING</h2>
        <h3>7.1 Ongoing Verification</h3>
        <p>Driver must provide updated insurance certificates annually and upon request.</p>
        
        <h3>7.2 Coverage Lapses</h3>
        <p>Any lapse in required insurance coverage results in immediate suspension from Platform until coverage is restored.</p>
        
        <h3>7.3 Claims Notification</h3>
        <p>Driver must immediately notify Platform of any insurance claims, accidents, or incidents involving Platform-facilitated rides.</p>

        <h2>8. TERMINATION</h2>
        <h3>8.1 Termination Rights</h3>
        <p>Either party may terminate this Agreement with 30 days written notice.</p>
        
        <h3>8.2 Immediate Termination</h3>
        <p>Platform may immediately terminate for:</p>
        <ul>
          <li>Insurance coverage lapses</li>
          <li>Safety violations or accidents</li>
          <li>Legal violations or criminal activity</li>
          <li>Breach of Agreement terms</li>
          <li>Failure to maintain required qualifications</li>
        </ul>

        <h2>9. DISPUTE RESOLUTION</h2>
        <h3>9.1 Governing Law</h3>
        <p>This Agreement is governed by Georgia law.</p>
        
        <h3>9.2 Arbitration</h3>
        <p>All disputes shall be resolved through binding arbitration in Atlanta, Georgia, under American Arbitration Association Commercial Rules.</p>
        
        <h3>9.3 Legal Fees</h3>
        <p>Prevailing party entitled to reasonable attorney fees and costs.</p>

        <h2>Driver Information</h2>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>Name:</strong> _________________________________</p>
              <p><strong>License Number:</strong> ________________________</p>
              <p><strong>Phone:</strong> ________________________________</p>
              <p><strong>Email:</strong> _________________________________</p>
            </div>
            <div>
              <p><strong>Vehicle Information:</strong> ____________________</p>
              <p><strong>Insurance Carrier:</strong> ______________________</p>
              <p><strong>Policy Number:</strong> _________________________</p>
            </div>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <p><strong>Driver Signature:</strong> _________________________________ <strong>Date:</strong> __________</p>
            <p><strong>MyAmbulex LLC Representative:</strong> _________________________ <strong>Date:</strong> __________</p>
            <p><strong>Print Name:</strong> _________________________________ <strong>Title:</strong> ______________________________________</p>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-8">
          <p className="text-green-800 text-sm m-0">
            <strong>Legal Review:</strong> This agreement has been reviewed by healthcare legal counsel and complies with Georgia law and medical transportation regulations.
          </p>
        </div>
      </div>
    </div>
  );
}