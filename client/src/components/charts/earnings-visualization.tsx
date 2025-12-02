import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

interface ComparisonData {
  name: string;
  value: number;
}

interface RidesDistribution {
  vehicleType: string;
  rides: number;
  earnings: number;
}

// COLORS
const COLORS = ['#00B2E3', '#4ade80', '#f97316', '#8b5cf6', '#f43f5e'];
const AREA_COLORS = {
  earnings: 'rgba(0, 178, 227, 0.6)',
  rides: 'rgba(74, 222, 128, 0.6)',
};

interface EarningsVisualizationProps {
  earningsData: EarningsData;
  ridesDistribution?: RidesDistribution[];
  weeklyComparison?: ComparisonData[];
  isLoading?: boolean;
}

const EarningsVisualization: React.FC<EarningsVisualizationProps> = ({
  earningsData,
  ridesDistribution = [],
  weeklyComparison = [],
  isLoading = false,
}) => {
  const [chartType, setChartType] = useState<string>('area');

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatEarningsDate = (dateString: string): string => {
    // Handle different date formats based on timeframe
    if (earningsData.timeframe === 'daily') {
      // Format: "2023-5-15 14:00"
      const [datePart, timePart] = dateString.split(' ');
      return timePart ? timePart : datePart;
    } else if (earningsData.timeframe === 'yearly') {
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

  // Format the day names for weekly comparison
  const formattedWeeklyComparison = weeklyComparison.map(item => ({
    ...item,
    name: item.name.substring(0, 3), // Convert "Monday" to "Mon"
  }));

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-[400px] bg-gray-200 rounded-md"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <CardTitle>Earnings Visualization</CardTitle>
            <CardDescription>
              View your earnings data in different chart formats
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select defaultValue={chartType} onValueChange={setChartType}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Chart Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="area">Area Chart</SelectItem>
                <SelectItem value="bar">Bar Chart</SelectItem>
                <SelectItem value="line">Line Chart</SelectItem>
                <SelectItem value="distribution">Distribution</SelectItem>
                <SelectItem value="weekly">Weekly Comparison</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          {chartType === 'area' && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={earningsData.data}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00B2E3" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#00B2E3" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorRides" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatEarningsDate}
                  interval="preserveStartEnd"
                  minTickGap={10}
                />
                <YAxis 
                  yAxisId="left"
                  tickFormatter={(value) => `$${value}`}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'amount') return formatCurrency(value as number);
                    return value;
                  }}
                  labelFormatter={(label) => formatEarningsDate(label as string)}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="amount"
                  name="Earnings"
                  yAxisId="left"
                  stroke="#00B2E3"
                  fillOpacity={1}
                  fill="url(#colorEarnings)"
                />
                <Area
                  type="monotone"
                  dataKey="rides"
                  name="Rides"
                  yAxisId="right"
                  stroke="#4ade80"
                  fillOpacity={1}
                  fill="url(#colorRides)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {chartType === 'bar' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={earningsData.data}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatEarningsDate}
                  interval="preserveStartEnd"
                  minTickGap={10}
                />
                <YAxis 
                  yAxisId="left"
                  tickFormatter={(value) => `$${value}`}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'amount') return formatCurrency(value as number);
                    return value;
                  }}
                  labelFormatter={(label) => formatEarningsDate(label as string)}
                />
                <Legend />
                <Bar 
                  dataKey="amount" 
                  name="Earnings" 
                  yAxisId="left" 
                  fill="#00B2E3" 
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="rides" 
                  name="Rides" 
                  yAxisId="right" 
                  fill="#4ade80" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}

          {chartType === 'line' && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={earningsData.data}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatEarningsDate}
                  interval="preserveStartEnd"
                  minTickGap={10}
                />
                <YAxis 
                  yAxisId="left"
                  tickFormatter={(value) => `$${value}`}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'amount') return formatCurrency(value as number);
                    return value;
                  }}
                  labelFormatter={(label) => formatEarningsDate(label as string)}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  name="Earnings" 
                  yAxisId="left" 
                  stroke="#00B2E3" 
                  strokeWidth={2} 
                  dot={{ r: 4 }}
                  activeDot={{ r: 8 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="rides" 
                  name="Rides" 
                  yAxisId="right" 
                  stroke="#4ade80" 
                  strokeWidth={2} 
                  dot={{ r: 4 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          )}

          {chartType === 'distribution' && (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ridesDistribution}
                  dataKey="earnings"
                  nameKey="vehicleType"
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={120}
                  label={({ vehicleType, percent }) => `${vehicleType}: ${(percent * 100).toFixed(0)}%`}
                >
                  {ridesDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(value as number)}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}

          {chartType === 'weekly' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={formattedWeeklyComparison}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `$${value}`} />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Bar 
                  dataKey="value" 
                  name="Earnings" 
                  fill="#00B2E3" 
                  radius={[4, 4, 0, 0]}
                >
                  {formattedWeeklyComparison.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-muted/50 p-3 rounded-md">
            <div className="text-muted-foreground text-sm">Total Earnings</div>
            <div className="text-xl font-bold">{formatCurrency(earningsData.summary.totalEarnings)}</div>
          </div>
          <div className="bg-muted/50 p-3 rounded-md">
            <div className="text-muted-foreground text-sm">Total Rides</div>
            <div className="text-xl font-bold">{earningsData.summary.totalRides}</div>
          </div>
          <div className="bg-muted/50 p-3 rounded-md">
            <div className="text-muted-foreground text-sm">Average Per Ride</div>
            <div className="text-xl font-bold">{formatCurrency(earningsData.summary.averagePerRide)}</div>
          </div>
          <div className="bg-muted/50 p-3 rounded-md">
            <div className="text-muted-foreground text-sm">vs. Previous Period</div>
            <div className={`text-xl font-bold ${earningsData.summary.comparisonPeriodChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {earningsData.summary.comparisonPeriodChange >= 0 ? '+' : ''}
              {earningsData.summary.comparisonPeriodChange.toFixed(1)}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EarningsVisualization;