import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileText, Download, AlertCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import Header from "@/components/layout/header";

interface LegalDocument {
  id: string;
  name: string;
  description: string;
  downloadUrl: string;
  signed: boolean;
  signedAt?: string;
}

interface CompletionStatus {
  allSigned: boolean;
  totalDocuments: number;
  signedDocuments: number;
  missingDocuments: string[];
}

export default function LegalAgreementsPage() {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [completionStatus, setCompletionStatus] = useState<CompletionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    loadDocuments();
    loadCompletionStatus();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await apiRequest('/api/legal-agreements/required-documents', {
        method: 'GET'
      });
      setDocuments(response.documents || []);
    } catch (error) {
      console.error('Failed to load documents:', error);
      toast({
        title: "Error",
        description: "Failed to load legal documents. Please try again.",
        variant: "destructive",
      });
    }
  };

  const loadCompletionStatus = async () => {
    try {
      const response = await apiRequest('/api/legal-agreements/completion-status', {
        method: 'GET'
      });
      setCompletionStatus(response);
    } catch (error) {
      console.error('Failed to load completion status:', error);
    } finally {
      setLoading(false);
    }
  };

  const signDocument = async (documentId: string) => {
    setSigning(documentId);
    try {
      await apiRequest('/api/legal-agreements/sign', {
        method: 'POST',
        body: JSON.stringify({
          documentType: documentId,
          ipAddress: 'unknown', // Will be captured on server
          userAgent: navigator.userAgent
        })
      });

      // Reload data
      await Promise.all([loadDocuments(), loadCompletionStatus()]);

      toast({
        title: "Document Signed",
        description: "Legal agreement has been successfully signed.",
      });
    } catch (error: any) {
      console.error('Failed to sign document:', error);
      toast({
        title: "Signing Failed",
        description: error.message || "Failed to sign document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSigning(null);
    }
  };

  const downloadDocument = (downloadUrl: string, fileName: string) => {
    window.open(downloadUrl, '_blank');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <p>Please log in to view legal agreements.</p>
            <Button onClick={() => setLocation('/auth')} className="mt-4">
              Log In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
            <p className="mt-2">Loading legal agreements...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Legal Agreements</h1>
          <p className="text-gray-600">
            Please review and sign all required legal agreements to continue using MyAmbulex services.
          </p>
        </div>

        {/* Completion Status */}
        {completionStatus && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                {completionStatus.allSigned ? (
                  <CheckCircle className="h-8 w-8 text-green-500" />
                ) : (
                  <AlertCircle className="h-8 w-8 text-amber-500" />
                )}
                <div>
                  <h3 className="font-semibold text-lg">
                    {completionStatus.allSigned ? 'All Agreements Signed' : 'Action Required'}
                  </h3>
                  <p className="text-gray-600">
                    {completionStatus.signedDocuments} of {completionStatus.totalDocuments} agreements signed
                  </p>
                  {!completionStatus.allSigned && completionStatus.missingDocuments.length > 0 && (
                    <p className="text-sm text-amber-600 mt-1">
                      Missing: {completionStatus.missingDocuments.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Legal Documents */}
        <div className="space-y-4">
          {documents.map((document) => (
            <Card key={document.id} className={document.signed ? 'border-green-200 bg-green-50' : 'border-gray-200'}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-gray-500" />
                    <div>
                      <CardTitle className="text-lg">{document.name}</CardTitle>
                      <CardDescription>{document.description}</CardDescription>
                    </div>
                  </div>
                  {document.signed && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="text-sm font-medium">Signed</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadDocument(document.downloadUrl, document.name)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    View Document
                  </Button>

                  {!document.signed && (
                    <Button
                      onClick={() => signDocument(document.id)}
                      disabled={signing === document.id}
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      {signing === document.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Signing...
                        </>
                      ) : (
                        'Sign Agreement'
                      )}
                    </Button>
                  )}

                  {document.signed && document.signedAt && (
                    <span className="text-sm text-gray-500">
                      Signed on {new Date(document.signedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Navigation Actions */}
        <div className="mt-8 flex justify-between">
          <Button variant="outline" onClick={() => window.history.back()}>
            Back
          </Button>
          
          {completionStatus?.allSigned && (
            <Button 
              onClick={() => setLocation('/rider/dashboard')}
              className="bg-teal-600 hover:bg-teal-700"
            >
              Continue to Dashboard
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}