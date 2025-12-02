import { Info, FileText, Image, Download } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';

interface DocumentRequirementsDisplayProps {
  documentType: string;
  className?: string;
  compact?: boolean;
}

interface FileRequirements {
  title: string;
  formats: string[];
  maxSize: string;
  tips: string[];
}

export function DocumentRequirementsDisplay({ 
  documentType, 
  className,
  compact = false 
}: DocumentRequirementsDisplayProps) {
  // Fetch document requirements
  const { data: requirementsData, isLoading } = useQuery({
    queryKey: [`/api/documents/requirements/${documentType}`],
    enabled: !!documentType
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  const requirements: FileRequirements = (requirementsData as any)?.requirements || {
    title: 'Document',
    formats: ['PDF', 'JPG', 'PNG'],
    maxSize: '10MB',
    tips: ['Please upload a clear, readable document']
  };

  const getFormatIcon = (format: string) => {
    if (format === 'PDF') return <FileText className="h-4 w-4 text-red-500" />;
    return <Image className="h-4 w-4 text-blue-500" />;
  };

  if (compact) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Info className="h-4 w-4" />
          <span>
            Accepted: {requirements.formats.join(', ')} • 
            Max size: {requirements.maxSize}
          </span>
        </div>
        
        {requirements.tips.length > 0 && (
          <Alert className="mb-4">
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
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Info className="h-5 w-5" />
          File Requirements
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Accepted Formats */}
        <div>
          <h4 className="text-sm font-medium mb-2">Accepted Formats</h4>
          <div className="flex flex-wrap gap-2">
            {requirements.formats.map((format) => (
              <Badge key={format} variant="outline" className="flex items-center gap-1">
                {getFormatIcon(format)}
                {format}
              </Badge>
            ))}
          </div>
        </div>

        {/* File Size */}
        <div>
          <h4 className="text-sm font-medium mb-1">Maximum File Size</h4>
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{requirements.maxSize}</span>
          </div>
        </div>

        {/* Upload Tips */}
        {requirements.tips.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Upload Tips</h4>
            <Alert>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {requirements.tips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DocumentRequirementsDisplay;