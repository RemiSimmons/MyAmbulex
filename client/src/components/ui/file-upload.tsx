import * as React from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  onFileChange?: (file: File) => void;
  maxSizeMB?: number;
  accept?: string;
  multiple?: boolean;
}

export const FileUpload = React.forwardRef<HTMLInputElement, FileUploadProps>(
  (
    {
      className,
      onFileChange,
      maxSizeMB = 5,
      accept,
      multiple = false,
      ...props
    },
    ref
  ) => {
    const [dragActive, setDragActive] = React.useState(false);
    const [fileError, setFileError] = React.useState<string | null>(null);
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    
    // Function to handle file selection
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      
      // Check file size
      const maxSize = maxSizeMB * 1024 * 1024; // Convert MB to bytes
      const file = files[0];
      
      if (file.size > maxSize) {
        setFileError(`File size exceeds ${maxSizeMB}MB limit`);
        return;
      }
      
      setFileError(null);
      if (onFileChange) {
        onFileChange(file);
      }
    };
    
    // Handle drag events
    const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "dragenter" || e.type === "dragover") {
        setDragActive(true);
      } else if (e.type === "dragleave") {
        setDragActive(false);
      }
    };
    
    // Handle drop event
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      
      const files = e.dataTransfer.files;
      if (!files || files.length === 0) return;
      
      // Check if multiple files or single file
      if (!multiple && files.length > 1) {
        setFileError("Only one file can be uploaded");
        return;
      }
      
      // Check file types if accept is provided
      if (accept) {
        const acceptedTypes = accept.split(",").map(type => type.trim());
        const file = files[0];
        const fileType = file.type;
        
        if (!acceptedTypes.some(type => {
          if (type.startsWith(".")) {
            // Handle file extensions
            return file.name.endsWith(type);
          } else if (type.includes("*")) {
            // Handle wildcards like image/*
            return fileType.startsWith(type.split("*")[0]);
          } else {
            // Handle exact matches
            return fileType === type;
          }
        })) {
          setFileError(`File type not accepted. Allowed: ${accept}`);
          return;
        }
      }
      
      // Check file size
      const maxSize = maxSizeMB * 1024 * 1024; // Convert MB to bytes
      const file = files[0];
      
      if (file.size > maxSize) {
        setFileError(`File size exceeds ${maxSizeMB}MB limit`);
        return;
      }
      
      setFileError(null);
      if (onFileChange) {
        onFileChange(file);
      }
      
      // Update the input's files
      if (inputRef.current) {
        // Use this approach to avoid the read-only error
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        // We'll simulate the file being selected rather than directly setting files
        handleFileChange({ target: { files: dataTransfer.files } } as React.ChangeEvent<HTMLInputElement>);
      }
    };
    
    // Setup refs properly
    const handleInputRef = (el: HTMLInputElement | null) => {
      inputRef.current = el;
      
      // Forward the ref
      if (typeof ref === 'function') {
        ref(el);
      } else if (ref) {
        // Safe assignment that follows React's ref pattern
        const mutableRef = ref as React.MutableRefObject<HTMLInputElement | null>;
        mutableRef.current = el;
      }
    };
    
    return (
      <div className="w-full">
        <div
          className={cn(
            "flex flex-col items-center justify-center w-full border-2 border-dashed rounded-md p-6 transition-colors",
            dragActive 
              ? "border-primary bg-primary/5" 
              : "border-border hover:border-primary/50 hover:bg-background",
            className
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-2">
            Drag & drop your file here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            Maximum file size: {maxSizeMB}MB
            {accept && <span> | Accepted formats: {accept}</span>}
          </p>
          {fileError && (
            <p className="text-sm text-destructive mt-2">{fileError}</p>
          )}
        </div>
        <input
          type="file"
          ref={handleInputRef}
          className="hidden"
          onChange={handleFileChange}
          accept={accept}
          multiple={multiple}
          {...props}
        />
      </div>
    );
  }
);

FileUpload.displayName = "FileUpload";