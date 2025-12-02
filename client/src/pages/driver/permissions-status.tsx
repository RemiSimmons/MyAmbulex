import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DriverPermissionsStatus from '@/components/driver-permissions-status';

export default function DriverPermissionsStatusPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Driver Status & Permissions</h1>
      </div>
      
      <DriverPermissionsStatus showActions={true} />
    </div>
  );
}