import { useState, useRef, useCallback } from 'react';
import { Upload, X, FileUp, Check, AlertCircle, Info, FileText, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

interface FileRequirements {
  title: string;
  formats: string[];
  maxSize: string;
  tips: string[];
}

interface DocumentUploadProps {
  documentType: string;
  title: string;
  required?: boolean;
  onFileSelect: (file: File | null) => void;
  onUpload?: (file: File) => Promise<void>;
  initialFile?: File | null;
  disabled?: boolean;
  uploadProgress?: number;
  uploadStatus?: 'idle' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

export function EnhancedDocumentUpload({
  documentType,
  title,
  required = false,
  onFileSelect,
  onUpload,
  initialFile,
  disabled = false,
  uploadProgress = 0,
  uploadStatus = 'idle',
  errorMessage
}: DocumentUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(initialFile || null);
  const [dragOver, setDragOver] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch document requirements
  const { data: requirementsData } = useQuery({
    queryKey: [`/api/documents/requirements/${documentType}`],
    enabled: !!documentType
  });

  const requirements: FileRequirements = requirementsData?.requirements || {
    title: title,
    formats: ['PDF', 'JPG', 'PNG'],
    maxSize: '10MB',
    tips: ['Please upload a clear, readable document']
  };

  // Validate file before setting
  const validateFile = useCallback(async (file: File): Promise<boolean> => {
    try {
      const response = await fetch('/api/documents/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          documentType
        })
      });

      const result = await response.json();
      
      if (!result.valid) {
        setValidationErrors(result.errors || [result.error]);
        return false;
      }
      
      setValidationErrors([]);
      return true;
    } catch (error) {
      setValidationErrors(['Unable to validate file. Please try again.']);
      return false;
    }
  }, [documentType]);

  const handleFileSelect = useCallback(async (file: File) => {
    const isValid = await validateFile(file);
    
    if (isValid) {
      setSelectedFile(file);
      onFileSelect(file);
    } else {
      setSelectedFile(null);
      onFileSelect(null);
    }
  }, [validateFile, onFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const clearFile = useCallback(() => {
    setSelectedFile(null);
    setValidationErrors([]);
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFileSelect]);

  const triggerFileInput = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const handleUpload = useCallback(async () => {
    if (selectedFile && onUpload) {
      try {
        await onUpload(selectedFile);
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
  }, [selectedFile, onUpload]);

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-8 w-8 text-blue-500" />;
    }
    return <FileText className="h-8 w-8 text-red-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">
            {title}
            {required && <span className="text-destructive ml-1">*</span>}
          </CardTitle>
          <Badge variant={required ? 'destructive' : 'secondary'}>
            {required ? 'Required' : 'Optional'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* File Requirements */}
        <div className="text-sm space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Info className="h-4 w-4" />
            <span>Accepted: {requirements.formats.join(', ')} • Max size: {requirements.maxSize}</span>
          </div>
          
          {requirements.tips.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {requirements.tips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Upload Area */}
        {!selectedFile ? (
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              if (!disabled) setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onClick={triggerFileInput}
          >
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Drop your file here</p>
            <p className="text-sm text-muted-foreground mb-4">
              or click to browse your files
            </p>
            <Button variant="outline" size="sm" disabled={disabled}>
              <FileUp className="h-4 w-4 mr-2" />
              Choose File
            </Button>
          </div>
        ) : (
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              {getFileIcon(selectedFile)}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={clearFile}
                disabled={disabled || uploadStatus === 'uploading'}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Upload Progress */}
            {uploadStatus === 'uploading' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {/* Upload Status */}
            {uploadStatus === 'success' && (
              <Alert>
                <Check className="h-4 w-4" />
                <AlertDescription>
                  Document uploaded successfully!
                </AlertDescription>
              </Alert>
            )}

            {uploadStatus === 'error' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {errorMessage || 'Upload failed. Please try again.'}
                </AlertDescription>
              </Alert>
            )}

            {/* Upload Button */}
            {onUpload && uploadStatus !== 'success' && (
              <Button 
                onClick={handleUpload}
                disabled={disabled || uploadStatus === 'uploading'}
                className="w-full"
              >
                {uploadStatus === 'uploading' ? 'Uploading...' : 'Upload Document'}
              </Button>
            )}
          </div>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileInputChange}
          accept={requirements.formats.map(format => {
            switch (format) {
              case 'PDF': return '.pdf';
              case 'JPG': return '.jpg,.jpeg';
              case 'PNG': return '.png';
              case 'WebP': return '.webp';
              default: return '';
            }
          }).join(',')}
          disabled={disabled}
        />
      </CardContent>
    </Card>
  );
}