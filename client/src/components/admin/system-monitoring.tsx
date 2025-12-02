import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Server, Database, Wifi, Shield, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const systemHealthData = [
  { time: '00:00', cpu: 45, memory: 62, requests: 120 },
  { time: '04:00', cpu: 38, memory: 58, requests: 95 },
  { time: '08:00', cpu: 72, memory: 78, requests: 280 },
  { time: '12:00', cpu: 68, memory: 75, requests: 350 },
  { time: '16:00', cpu: 85, memory: 82, requests: 420 },
  { time: '20:00', cpu: 55, memory: 68, requests: 200 },
];

const systemServices = [
  { name: 'Database', status: 'operational', uptime: '99.9%', lastCheck: '2 mins ago' },
  { name: 'Payment Gateway', status: 'operational', uptime: '99.8%', lastCheck: '1 min ago' },
  { name: 'Google Maps API', status: 'operational', uptime: '99.7%', lastCheck: '3 mins ago' },
  { name: 'SMS Service', status: 'operational', uptime: '99.5%', lastCheck: '5 mins ago' },
  { name: 'Email Service', status: 'operational', uptime: '99.9%', lastCheck: '1 min ago' },
  { name: 'WebSocket', status: 'degraded', uptime: '98.2%', lastCheck: '2 mins ago' },
];

const securityMetrics = [
  { metric: 'Failed Login Attempts', value: 3, threshold: 10, status: 'normal' },
  { metric: 'Suspicious IP Blocks', value: 2, threshold: 5, status: 'normal' },
  { metric: 'API Rate Limit Hits', value: 12, threshold: 50, status: 'normal' },
  { metric: 'Session Anomalies', value: 1, threshold: 3, status: 'normal' },
];

export function SystemMonitoring() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-100 text-green-800';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'down':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'down':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            System Performance
          </CardTitle>
          <CardDescription>Real-time server metrics and resource usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={systemHealthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="cpu" stroke="#dc2626" strokeWidth={2} name="CPU %" />
                <Line type="monotone" dataKey="memory" stroke="#2563eb" strokeWidth={2} name="Memory %" />
                <Line type="monotone" dataKey="requests" stroke="#16a34a" strokeWidth={2} name="Requests/min" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Service Health
          </CardTitle>
          <CardDescription>Status of critical platform services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {systemServices.map((service, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(service.status)}
                  <div>
                    <div className="font-medium">{service.name}</div>
                    <div className="text-sm text-gray-600">Last check: {service.lastCheck}</div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={getStatusColor(service.status)}>
                    {service.status}
                  </Badge>
                  <div className="text-sm text-gray-600 mt-1">{service.uptime} uptime</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Monitoring
          </CardTitle>
          <CardDescription>Security metrics and threat detection</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {securityMetrics.map((metric, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">{metric.metric}</span>
                  <Badge variant={metric.status === 'normal' ? 'default' : 'destructive'}>
                    {metric.status}
                  </Badge>
                </div>
                <div className="text-2xl font-bold mb-2">{metric.value}</div>
                <Progress value={(metric.value / metric.threshold) * 100} className="h-2" />
                <div className="text-xs text-gray-500 mt-1">
                  Threshold: {metric.threshold}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}