import React from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  FileText, 
  Shield, 
  Users, 
  ExternalLink,
  ArrowLeft,
  Home
} from 'lucide-react';

export default function LegalIndexPage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="outline" size="sm">
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
          </Link>
          <Link href="javascript:history.back()">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>
        <h1 className="text-3xl font-bold mb-4">Legal Documents</h1>
        <p className="text-gray-600">
          Access all legal documents, policies, and agreements for the MyAmbulex platform.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Download Legal Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Download individual legal documents or all documents at once. Templates 
              require customization and legal review before implementation.
            </p>
            <Link href="/legal/download">
              <Button className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Access Download Center
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Terms of Service
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              View the current terms and conditions for using the MyAmbulex platform.
            </p>
            <Link href="/legal/terms-of-service">
              <Button variant="outline" className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Terms
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy Policy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Learn how we collect, use, and protect your personal information.
            </p>
            <Link href="/legal/privacy-policy">
              <Button variant="outline" className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Privacy Policy
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Driver Agreement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Service agreement for drivers providing transportation services.
            </p>
            <Link href="/legal/driver-agreement">
              <Button variant="outline" className="w-full">
                <Users className="h-4 w-4 mr-2" />
                View Driver Agreement
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 p-6 bg-amber-50 border border-amber-200 rounded-lg">
        <h3 className="font-semibold mb-2 text-amber-800">Important Notice</h3>
        <p className="text-amber-700 text-sm">
          All legal documents are templates that require professional legal review and 
          customization for your specific jurisdiction and business requirements. Consult 
          with a healthcare law attorney before implementation.
        </p>
      </div>
    </div>
  );
}