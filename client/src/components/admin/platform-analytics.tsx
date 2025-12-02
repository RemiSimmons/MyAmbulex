import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, Users, Car, DollarSign, Clock, AlertCircle } from 'lucide-react';

const mockAnalyticsData = [
  { month: 'Jan', revenue: 4500, rides: 145, users: 28 },
  { month: 'Feb', revenue: 5200, rides: 168, users: 35 },
  { month: 'Mar', revenue: 4800, rides: 152, users: 31 },
  { month: 'Apr', revenue: 6100, rides: 189, users: 42 },
  { month: 'May', revenue: 5900, rides: 178, users: 38 },
  { month: 'Jun', revenue: 6800, rides: 201, users: 45 },
];

const platformMetrics = [
  { metric: 'User Acquisition', value: 85, change: '+12%', trend: 'up' },
  { metric: 'Driver Retention', value: 92, change: '+3%', trend: 'up' },
  { metric: 'Ride Completion', value: 96, change: '-1%', trend: 'down' },
  { metric: 'Platform Uptime', value: 99.8, change: '+0.2%', trend: 'up' },
];

export function PlatformAnalytics() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Revenue Analytics
          </CardTitle>
          <CardDescription>Monthly revenue and ride volume trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockAnalyticsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} />
                <Line type="monotone" dataKey="rides" stroke="#dc2626" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            User Growth
          </CardTitle>
          <CardDescription>Monthly user acquisition and engagement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockAnalyticsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="users" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Platform Performance Metrics</CardTitle>
          <CardDescription>Key performance indicators and health metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {platformMetrics.map((metric, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">{metric.metric}</span>
                  <Badge variant={metric.trend === 'up' ? 'default' : 'destructive'}>
                    {metric.trend === 'up' ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {metric.change}
                  </Badge>
                </div>
                <div className="text-2xl font-bold mb-2">{metric.value}%</div>
                <Progress value={metric.value} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}