import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Stop, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Zap, 
  Monitor, 
  Smartphone,
  Users,
  AlertTriangle
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface TestResult {
  id: string;
  name: string;
  type: 'unit' | 'integration' | 'e2e' | 'mobile' | 'load';
  status: 'running' | 'passed' | 'failed' | 'pending';
  duration: number;
  coverage?: number;
  errors?: string[];
  timestamp: string;
}

interface TestSuite {
  name: string;
  type: string;
  status: 'idle' | 'running' | 'completed';
  progress: number;
  results: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
}

export default function TestingDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Fetch test status and results
  const { data: testSuites, isLoading, refetch } = useQuery<TestSuite[]>({
    queryKey: ['/api/testing/suites'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: systemHealth } = useQuery({
    queryKey: ['/api/testing/health'],
    refetchInterval: 10000,
  });

  // Run test suite mutation
  const runTestMutation = useMutation({
    mutationFn: async (suiteType: string) => {
      return apiRequest('POST', '/api/testing/run', { suite: suiteType });
    },
    onSuccess: (data, suiteType) => {
      toast({
        title: 'Test Started',
        description: `${suiteType} test suite is now running`,
      });
      setRunningTests(prev => new Set([...prev, suiteType]));
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: 'Test Failed to Start',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Stop test suite mutation
  const stopTestMutation = useMutation({
    mutationFn: async (suiteType: string) => {
      return apiRequest('POST', '/api/testing/stop', { suite: suiteType });
    },
    onSuccess: (data, suiteType) => {
      toast({
        title: 'Test Stopped',
        description: `${suiteType} test suite has been stopped`,
      });
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(suiteType);
        return newSet;
      });
      refetch();
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'running':
        return <Clock className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Testing Dashboard</h1>
          <p className="text-gray-600">Comprehensive test suite management and monitoring</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => runTestMutation.mutate('all')}
            disabled={runTestMutation.isPending}
            className="flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Run All Tests
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      {systemHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {(systemHealth.uptime * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {systemHealth.responseTime}ms
                </div>
                <div className="text-sm text-gray-600">Avg Response Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {systemHealth.activeUsers}
                </div>
                <div className="text-sm text-gray-600">Active Users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {systemHealth.errorRate.toFixed(2)}%
                </div>
                <div className="text-sm text-gray-600">Error Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="unit">Unit Tests</TabsTrigger>
          <TabsTrigger value="e2e">E2E Tests</TabsTrigger>
          <TabsTrigger value="mobile">Mobile Tests</TabsTrigger>
          <TabsTrigger value="load">Load Tests</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {testSuites?.map((suite) => (
              <Card key={suite.name}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {suite.name}
                  </CardTitle>
                  {suite.type === 'unit' && <Zap className="h-4 w-4 text-yellow-600" />}
                  {suite.type === 'e2e' && <Monitor className="h-4 w-4 text-blue-600" />}
                  {suite.type === 'mobile' && <Smartphone className="h-4 w-4 text-green-600" />}
                  {suite.type === 'load' && <Users className="h-4 w-4 text-purple-600" />}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Badge className={getStatusColor(suite.status)}>
                        {suite.status}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {suite.passedTests}/{suite.totalTests}
                      </span>
                    </div>
                    {suite.status === 'running' && (
                      <Progress value={suite.progress} className="w-full" />
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => runTestMutation.mutate(suite.type)}
                        disabled={suite.status === 'running' || runTestMutation.isPending}
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Run
                      </Button>
                      {suite.status === 'running' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => stopTestMutation.mutate(suite.type)}
                        >
                          <Stop className="w-3 h-3 mr-1" />
                          Stop
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent Test Results */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Test Results</CardTitle>
              <CardDescription>Latest test execution results across all suites</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {testSuites?.flatMap(suite => suite.results)
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .slice(0, 10)
                  .map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(result.status)}
                        <div>
                          <div className="font-medium">{result.name}</div>
                          <div className="text-sm text-gray-600">
                            {result.type} • {result.duration}ms
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {result.coverage && (
                          <Badge variant="outline">
                            {result.coverage}% coverage
                          </Badge>
                        )}
                        <Badge className={getStatusColor(result.status)}>
                          {result.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-600" />
                Unit Test Suite
              </CardTitle>
              <CardDescription>
                Fast unit tests for individual components and functions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    onClick={() => runTestMutation.mutate('unit')}
                    disabled={runningTests.has('unit')}
                  >
                    Run Unit Tests
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => runTestMutation.mutate('unit-payment')}
                  >
                    Payment Tests Only
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => runTestMutation.mutate('unit-auth')}
                  >
                    Auth Tests Only
                  </Button>
                </div>

                {/* Unit test results would be displayed here */}
                <div className="text-sm text-gray-600">
                  Unit tests focus on payment processing, authentication, database operations, 
                  and business logic validation.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="e2e" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5 text-blue-600" />
                End-to-End Test Suite
              </CardTitle>
              <CardDescription>
                Complete user journey testing across all interfaces
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    onClick={() => runTestMutation.mutate('e2e')}
                    disabled={runningTests.has('e2e')}
                  >
                    Run E2E Tests
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => runTestMutation.mutate('e2e-rider')}
                  >
                    Rider Journey
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => runTestMutation.mutate('e2e-driver')}
                  >
                    Driver Journey
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => runTestMutation.mutate('e2e-admin')}
                  >
                    Admin Journey
                  </Button>
                </div>

                <div className="text-sm text-gray-600">
                  E2E tests validate complete user workflows from registration to ride completion 
                  across multiple browsers and devices.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mobile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-green-600" />
                Mobile Device Testing
              </CardTitle>
              <CardDescription>
                Cross-device and cross-browser mobile compatibility testing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    onClick={() => runTestMutation.mutate('mobile')}
                    disabled={runningTests.has('mobile')}
                  >
                    Run Mobile Tests
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => runTestMutation.mutate('mobile-ios')}
                  >
                    iOS Safari
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => runTestMutation.mutate('mobile-android')}
                  >
                    Android Chrome
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => runTestMutation.mutate('mobile-tablet')}
                  >
                    Tablet Testing
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium">Touch Interface</div>
                    <div className="text-sm text-gray-600">
                      Touch targets, gestures, navigation
                    </div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium">Performance</div>
                    <div className="text-sm text-gray-600">
                      Load times, battery usage, offline
                    </div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium">Compatibility</div>
                    <div className="text-sm text-gray-600">
                      iOS, Android, various screen sizes
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="load" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Load Testing Suite
              </CardTitle>
              <CardDescription>
                Concurrent user simulation and performance validation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    onClick={() => runTestMutation.mutate('load')}
                    disabled={runningTests.has('load')}
                  >
                    Run Load Tests
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => runTestMutation.mutate('load-light')}
                  >
                    Light Load (10 users)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => runTestMutation.mutate('load-heavy')}
                  >
                    Heavy Load (100 users)
                  </Button>
                </div>

                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-amber-800">Load Testing Notice</div>
                      <div className="text-amber-700 text-sm">
                        Load tests simulate high user concurrency and may impact system performance. 
                        Run during maintenance windows or off-peak hours.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  Load tests validate system performance under concurrent user load, 
                  measuring response times, throughput, and stability.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}