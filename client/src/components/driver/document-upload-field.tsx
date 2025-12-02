import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormMessage } from '@/components/ui/form';
import { Loader2, CheckCircle, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { uploadDocument, getDocumentTypeFromField } from '@/utils/document-upload';

// Helper function to format accepted file types in a user-friendly way
const formatAcceptedTypes = (accept: string): string => {
  if (!accept) return 'All files';
  
  const types = accept.split(',');
  const formatted = types.map(type => {
    const cleanType = type.trim();
    if (cleanType === 'image/*') return 'Images (JPG, PNG, etc.)';
    if (cleanType === 'application/pdf') return 'PDF documents';
    return cleanType;
  });
  return formatted.join(' or ');
};

interface DocumentUploadFieldProps {
  fieldName: string;
  label: string;
  value?: string;
  onChange: (url: string) => void;
  accept?: string;
  disabled?: boolean;
}

export function DocumentUploadField({
  fieldName,
  label,
  value,
  onChange,
  accept = "image/*,application/pdf",
  disabled = false
}: DocumentUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file first",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsUploading(true);
      
      const documentType = getDocumentTypeFromField(fieldName);
      const result = await uploadDocument(selectedFile, documentType);
      
      onChange(result.url);
      
      toast({
        title: "File uploaded successfully",
        description: `${label} has been uploaded`,
      });
      
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          disabled={disabled || isUploading}
          className="flex-1"
        />
        <Button
          type="button"
          size="sm"
          disabled={!selectedFile || isUploading || disabled}
          onClick={handleUpload}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : value ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Re-upload
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </>
          )}
        </Button>
      </div>
      
      <div className="text-xs text-muted-foreground">
        Accepted files: {formatAcceptedTypes(accept)}
      </div>
      
      {value && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle className="h-4 w-4" />
          Document uploaded successfully
        </div>
      )}
      
      <FormMessage />
    </div>
  );
}