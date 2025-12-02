import React, { useState, useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DocumentRequirementsDisplay } from './document-requirements-display';
import { 
  Upload, 
  Camera, 
  FileText, 
  Image as ImageIcon, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartUploadComponentProps {
  documentType: string;
  title: string;
  description?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  className?: string;
}

interface ValidationResult {
  valid: boolean;
  errors?: string[];
  suggestions?: string[];
  message?: string;
}

export function SmartUploadComponent({
  documentType,
  title,
  description,
  onSuccess,
  onError,
  className
}: SmartUploadComponentProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch document requirements
  const { data: requirementsData } = useQuery({
    queryKey: [`/api/documents/requirements/${documentType}`]
  });

  // Real-time validation mutation
  const validateMutation = useMutation({
    mutationFn: async (file: File) => {
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
      return response.json();
    },
    onSuccess: (data: ValidationResult) => {
      setValidationResult(data);
      if (!data.valid && data.errors) {
        toast({
          title: "File Issues Found",
          description: data.errors[0],
          variant: "destructive"
        });
      }
    }
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('documentType', documentType);

      // Simulate progress tracking
      setUploadProgress(0);
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Upload failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Upload Successful",
        description: "Your document has been uploaded and is being reviewed."
      });
      setSelectedFile(null);
      setPreviewUrl(null);
      setValidationResult(null);
      setUploadProgress(0);
      onSuccess?.(data);
      queryClient.invalidateQueries({ queryKey: ['/api/documents/dashboard'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive"
      });
      setUploadProgress(0);
      onError?.(error.message);
    }
  });

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setUploadProgress(0);
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }

    // Validate file immediately
    validateMutation.mutate(file);
  }, [validateMutation]);

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // File input change handler
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // Camera capture (mobile)
  const handleCameraCapture = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'camera');
      fileInputRef.current.click();
    }
  }, []);

  // Upload handler
  const handleUpload = useCallback(() => {
    if (selectedFile && validationResult?.valid) {
      uploadMutation.mutate(selectedFile);
    }
  }, [selectedFile, validationResult, uploadMutation]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setValidationResult(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <ImageIcon className="h-8 w-8" />;
    if (file.type === 'application/pdf') return <FileText className="h-8 w-8" />;
    return <FileText className="h-8 w-8" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {title}
          {selectedFile && validationResult?.valid && (
            <Badge variant="outline" className="text-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Ready to Upload
            </Badge>
          )}
        </CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Requirements Display */}
        <DocumentRequirementsDisplay documentType={documentType} compact />

        {/* Upload Area */}
        {!selectedFile && (
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
              dragActive ? "border-primary bg-primary/10" : "border-gray-300 hover:border-primary/50",
              uploadMutation.isPending && "pointer-events-none opacity-50"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <div className="space-y-2">
              <p className="text-lg font-medium">Drop your file here or click to browse</p>
              <p className="text-sm text-muted-foreground">
                {(requirementsData as any)?.requirements ? 
                  `Accepts ${(requirementsData as any).requirements.formats.join(', ')} • Max ${(requirementsData as any).requirements.maxSize}` :
                  'Select a file to upload'
                }
              </p>
            </div>
            
            <div className="flex justify-center space-x-2 mt-4">
              <Button variant="outline" size="sm" type="button">
                <Upload className="h-4 w-4 mr-2" />
                Browse Files
              </Button>
              {/* Mobile camera capture */}
              <Button 
                variant="outline" 
                size="sm" 
                type="button"
                onClick={handleCameraCapture}
                className="md:hidden"
              >
                <Camera className="h-4 w-4 mr-2" />
                Take Photo
              </Button>
            </div>
          </div>
        )}

        {/* File Preview */}
        {selectedFile && (
          <div className="space-y-4">
            <div className="flex items-start space-x-4 p-4 border rounded-lg">
              <div className="flex-shrink-0">
                {previewUrl ? (
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="w-16 h-16 object-cover rounded"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                    {getFileIcon(selectedFile)}
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(selectedFile.size)} • {selectedFile.type}
                </p>
                
                {/* Validation Status */}
                {validationResult && (
                  <div className="mt-2">
                    {validationResult.valid ? (
                      <div className="flex items-center text-green-600 text-sm">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        File meets all requirements
                      </div>
                    ) : (
                      <div className="flex items-center text-red-600 text-sm">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {validationResult.errors?.[0] || 'File validation failed'}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                disabled={uploadMutation.isPending}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Upload Progress */}
            {uploadMutation.isPending && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {/* Validation Errors */}
            {validationResult && !validationResult.valid && validationResult.errors && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {validationResult.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Upload Button */}
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={clearSelection}
                disabled={uploadMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!validationResult?.valid || uploadMutation.isPending}
                className="min-w-24"
              >
                {uploadMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Uploading
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleInputChange}
          accept={(requirementsData as any)?.requirements?.formats?.map((f: string) => 
            f.toLowerCase() === 'jpg' ? 'image/jpeg' :
            f.toLowerCase() === 'png' ? 'image/png' :
            f.toLowerCase() === 'pdf' ? 'application/pdf' :
            f.toLowerCase() === 'webp' ? 'image/webp' : ''
          ).filter(Boolean).join(',')}
        />
      </CardContent>
    </Card>
  );
}

export default SmartUploadComponent;