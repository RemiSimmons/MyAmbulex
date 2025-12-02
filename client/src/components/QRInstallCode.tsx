import { useState } from 'react';
import { QrCode, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function QRInstallCode() {
  const [showQR, setShowQR] = useState(false);
  const currentUrl = window.location.origin;
  
  // Generate QR code URL using a reliable QR service
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentUrl)}`;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
          <QrCode className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">
            Install on Mobile
          </h3>
          <p className="text-sm text-gray-600">
            Scan with your phone to install MyAmbulex
          </p>
        </div>
      </div>

      {!showQR ? (
        <Button 
          onClick={() => setShowQR(true)}
          variant="outline"
          className="w-full"
        >
          <Smartphone className="w-4 h-4 mr-2" />
          Show QR Code
        </Button>
      ) : (
        <div className="text-center">
          <div className="bg-white p-3 rounded-lg border-2 border-gray-200 inline-block mb-3">
            <img 
              src={qrCodeUrl} 
              alt="QR Code to install MyAmbulex" 
              className="w-48 h-48"
              onError={(e) => {
                // Fallback if QR service is down
                (e.target as HTMLImageElement).src = "data:image/svg+xml,%3csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='200' height='200' fill='%23f3f4f6'/%3e%3ctext x='100' y='100' text-anchor='middle' dy='.3em' fill='%236b7280'%3eQR Code%3c/text%3e%3c/svg%3e";
              }}
            />
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <p className="font-medium">📱 How to scan:</p>
            <div className="text-left space-y-1">
              <p>• <strong>iPhone:</strong> Open Camera app, point at QR code</p>
              <p>• <strong>Android:</strong> Open Camera or Google Lens</p>
              <p>• Tap the notification to open MyAmbulex</p>
              <p>• Follow install steps shown earlier</p>
            </div>
          </div>
          <Button 
            onClick={() => setShowQR(false)}
            variant="ghost"
            size="sm"
            className="mt-3"
          >
            Hide QR Code
          </Button>
        </div>
      )}
    </div>
  );
}