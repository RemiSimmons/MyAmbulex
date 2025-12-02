import { useState, useRef, useEffect } from 'react';
import { Upload, X, FileUp, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DocumentUploadProps {
  title: string;
  description: string;
  acceptedTypes: Record<string, string[]>;
  onChange: (file: File | null) => void;
  initialFile?: File | null;
  maxSizeMB?: number;
  required?: boolean;
}

export function DocumentUpload({
  title,
  description,
  acceptedTypes,
  onChange,
  initialFile = null,
  maxSizeMB = 5,
  required = false
}: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(initialFile);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Create a preview URL when file changes
  useEffect(() => {
    if (file && isImageFile(file)) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  const isImageFile = (file: File) => {
    return file.type.startsWith('image/');
  };

  const isPdfFile = (file: File) => {
    return file.type === 'application/pdf';
  };

  const handleFileChange = (selectedFile: File | null) => {
    setError(null);
    
    if (!selectedFile) {
      setFile(null);
      onChange(null);
      return;
    }
    
    // Validate file type
    const fileTypeAccepted = Object.keys(acceptedTypes).some(type => {
      if (type.includes('*')) {
        // Handle wildcard type like 'image/*'
        const baseMimeType = type.split('/')[0];
        return selectedFile.type.startsWith(`${baseMimeType}/`);
      }
      return type === selectedFile.type;
    });
    
    if (!fileTypeAccepted) {
      setError(`File type not accepted. Please upload ${Object.keys(acceptedTypes).join(', ')}`);
      return;
    }
    
    // Validate file size
    const fileSizeMB = selectedFile.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      setError(`File size exceeds ${maxSizeMB}MB limit`);
      return;
    }
    
    setFile(selectedFile);
    onChange(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    onChange(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <div className="mb-2">
        <div className="text-sm font-medium">{title} {required && <span className="text-destructive">*</span>}</div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>

      {!file ? (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors",
            isDragging 
              ? "border-primary bg-primary/5" 
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
            error && "border-destructive/50 bg-destructive/5"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="py-4">
            <div className="mb-3 flex justify-center">
              {error ? (
                <AlertCircle className="h-10 w-10 text-destructive/70" />
              ) : (
                <Upload className="h-10 w-10 text-muted-foreground/70" />
              )}
            </div>
            
            <div className="text-sm font-medium mb-1">
              {error ? 'Upload Error' : 'Drag & drop or click to upload'}
            </div>
            
            <div className="text-xs text-muted-foreground">
              {error ? error : `Accepted formats: ${Object.keys(acceptedTypes).join(', ')} (max ${maxSizeMB}MB)`}
            </div>
            
            <Button variant="outline" size="sm" className="mt-3">
              <FileUp className="h-4 w-4 mr-2" />
              Browse file
            </Button>
          </div>
          
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept={Object.keys(acceptedTypes).join(',')}
            onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
          />
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="p-3 bg-muted/50 flex items-center justify-between">
            <div className="flex items-center">
              <Check className="h-4 w-4 text-green-500 mr-2" />
              <span className="text-sm font-medium">{file.name}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleRemoveFile}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {previewUrl && (
            <div className="p-2">
              <div className="aspect-[16/9] overflow-hidden rounded-md">
                <img 
                  src={previewUrl} 
                  alt="Document preview" 
                  className="w-full h-full object-contain bg-black/5" 
                />
              </div>
            </div>
          )}
          
          {isPdfFile(file) && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <span className="font-medium">{file.name}</span> ({(file.size / (1024 * 1024)).toFixed(2)}MB)
            </div>
          )}
        </div>
      )}
    </div>
  );
}