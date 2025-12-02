import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, CheckCheckIcon, DollarSignIcon, LineChartIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import DriverLayout from '@/components/layouts/driver-layout';
import { StaticContent } from '@/components/optimization/memo-helpers';
import { LoadingDashboard } from '@/components/ui/loading-skeletons';
import RetryableError from '@/components/ui/retryable-error';

// Type definitions
interface DriverStatistics {
  totalRides: number;
  completedRides: number;
  cancelledRides: number;
  averageRating: number;
  totalEarnings: number;
  currentMonthEarnings: number;
  lastMonthEarnings: number;
  onTimePercentage: number;
}

interface EarningsData {
  timeframe: string;
  data: Array<{
    date: string;
    amount: number;
    rides: number;
  }>;
  summary: {
    totalEarnings: number;
    totalRides: number;
    averagePerRide: number;
    comparisonPeriodChange: number;
  };
}

type TimeFrame = 'daily' | 'weekly' | 'monthly' | 'yearly';

const DriverAnalyticsDashboard: React.FC = () => {
  const { toast } = useToast();
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeFrame>('weekly');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  // Fetch driver statistics
  const {
    data: statistics,
    isLoading: isLoadingStatistics,
    error: statisticsError,
    refetch: refetchStatistics
  } = useQuery({
    queryKey: ['/api/analytics/driver/statistics'],
    enabled: true,
  });

  // Fetch earnings data
  const {
    data: earnings,
    isLoading: isLoadingEarnings,
    error: earningsError,
    refetch: refetchEarnings
  } = useQuery({
    queryKey: ['/api/analytics/driver/earnings', selectedTimeframe, dateRange.from, dateRange.to],
    queryFn: async () => {
      const params = new URLSearchParams({
        timeframe: selectedTimeframe,
      });
      
      if (dateRange.from) {
        params.append('startDate', dateRange.from.toISOString());
      }
      
      if (dateRange.to) {
        params.append('endDate', dateRange.to.toISOString());
      }
      
      const response = await fetch(`/api/analytics/driver/earnings?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch earnings data');
      }
      return response.json();
    },
    enabled: true,
  });

  const handleTimeframeChange = (value: string) => {
    setSelectedTimeframe(value as TimeFrame);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatEarningsDate = (dateString: string): string => {
    // Handle different date formats based on timeframe
    if (selectedTimeframe === 'daily') {
      // Format: "2023-5-15 14:00"
      const [datePart, timePart] = dateString.split(' ');
      return timePart ? timePart : datePart;
    } else if (selectedTimeframe === 'yearly') {
      // Format: "2023-5"
      const [year, month] = dateString.split('-');
      return `${new Date(0, parseInt(month) - 1).toLocaleString('default', { month: 'short' })} ${year}`;
    } else {
      // Format: "2023-5-15"
      try {
        return format(new Date(dateString), 'MMM d');
      } catch (e) {
        return dateString;
      }
    }
  };

  const isLoading = isLoadingStatistics || isLoadingEarnings;
  const hasError = statisticsError || earningsError;

  if (isLoading) {
    return (
      <DriverLayout>
        <LoadingDashboard />
      </DriverLayout>
    );
  }

  if (hasError) {
    return (
      <DriverLayout>
        <RetryableError 
          title="Could not load analytics data"
          description="We couldn't load your analytics data at this time. Please try again."
          onRetry={() => {
            refetchStatistics();
            refetchEarnings();
          }}
        />
      </DriverLayout>
    );
  }

  return (
    <DriverLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
            <p className="text-muted-foreground">
              View your ride statistics and earnings
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/driver/analytics/reports">
              <LineChartIcon className="mr-2 h-4 w-4" />
              View Detailed Reports
            </Link>
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Rides</CardTitle>
              <div className="h-4 w-4 text-muted-foreground">
                <CheckCheckIcon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics?.totalRides || 0}</div>
              <p className="text-xs text-muted-foreground">
                {statistics?.completedRides || 0} completed, {statistics?.cancelledRides || 0} cancelled
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <div className="h-4 w-4 text-muted-foreground">
                <DollarSignIcon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(statistics?.totalEarnings || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(statistics?.currentMonthEarnings || 0)} this month
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <div className="h-4 w-4 text-muted-foreground">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    fillRule="evenodd"
                    d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics?.averageRating.toFixed(1) || "N/A"}</div>
              <p className="text-xs text-muted-foreground">Out of 5 stars</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">On-Time Performance</CardTitle>
              <div className="h-4 w-4 text-muted-foreground">
                <CalendarIcon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics?.onTimePercentage.toFixed(0) || 0}%</div>
              <div className="mt-1 h-2 w-full rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-green-500"
                  style={{ width: `${statistics?.onTimePercentage || 0}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Earnings Analysis Section */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Earnings Analysis</CardTitle>
            <CardDescription>
              Analyze your earnings over time based on different timeframes
            </CardDescription>
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-x-2 sm:space-y-0">
              <Select value={selectedTimeframe} onValueChange={handleTimeframeChange}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily (24h)</SelectItem>
                  <SelectItem value="weekly">Weekly (7d)</SelectItem>
                  <SelectItem value="monthly">Monthly (30d)</SelectItem>
                  <SelectItem value="yearly">Yearly (12m)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={earnings?.data || []}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date"
                    tickFormatter={formatEarningsDate}
                    interval="preserveStartEnd"
                    minTickGap={10}
                  />
                  <YAxis yAxisId="left" tickFormatter={(value) => `$${value}`} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value}`} />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'amount') return formatCurrency(value as number);
                      return value;
                    }}
                    labelFormatter={(label) => formatEarningsDate(label as string)}
                  />
                  <Legend />
                  <Bar 
                    yAxisId="left" 
                    dataKey="amount" 
                    name="Earnings" 
                    fill="#00B2E3" 
                    radius={[4, 4, 0, 0]} 
                  />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="rides" 
                    name="Rides" 
                    stroke="#10b981" 
                    strokeWidth={2} 
                    dot={{ r: 4 }} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap justify-between gap-2 border-t bg-muted/50 p-4">
            <div>
              <p className="text-sm font-medium">Total Earnings</p>
              <p className="text-2xl font-bold">{formatCurrency(earnings?.summary?.totalEarnings || 0)}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Total Rides</p>
              <p className="text-2xl font-bold">{earnings?.summary?.totalRides || 0}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Average Per Ride</p>
              <p className="text-2xl font-bold">{formatCurrency(earnings?.summary?.averagePerRide || 0)}</p>
            </div>
            <div>
              <p className="text-sm font-medium">vs. Previous Period</p>
              <div className="flex items-center">
                <Badge variant={earnings?.summary?.comparisonPeriodChange >= 0 ? "success" : "destructive"}>
                  {earnings?.summary?.comparisonPeriodChange >= 0 ? "+" : ""}
                  {earnings?.summary?.comparisonPeriodChange.toFixed(1)}%
                </Badge>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>
    </DriverLayout>
  );
};

export default DriverAnalyticsDashboard;