import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Wifi, 
  WifiOff, 
  Bell, 
  Activity, 
  CheckCircle, 
  AlertTriangle,
  Clock
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

interface TestResult {
  name: string;
  status: 'idle' | 'running' | 'success' | 'error';
  message: string;
  duration?: number;
}

export function RealTimeTest() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [connections, setConnections] = useState({
    polling: false,
    sse: false
  });
  
  const sseRef = useRef<EventSource | null>(null);
  const pollIntervalRef = useRef<number | null>(null);

  const addTest = (test: TestResult) => {
    setTests(prev => [...prev, test]);
  };

  const updateTest = (name: string, updates: Partial<TestResult>) => {
    setTests(prev => prev.map(t => t.name === name ? { ...t, ...updates } : t));
  };

  const testPolling = async () => {
    const startTime = Date.now();
    addTest({
      name: 'HTTP Polling',
      status: 'running',
      message: 'Testing API polling mechanism...'
    });

    try {
      // Test multiple API calls
      const responses = await Promise.all([
        fetch('/api/notifications', { credentials: 'include' }),
        fetch('/api/rides', { credentials: 'include' }),
        fetch('/api/user', { credentials: 'include' })
      ]);

      const allSuccessful = responses.every(r => r.ok);
      const duration = Date.now() - startTime;

      if (allSuccessful) {
        updateTest('HTTP Polling', {
          status: 'success',
          message: `All API endpoints responding correctly`,
          duration
        });
        setConnections(prev => ({ ...prev, polling: true }));
        return true;
      } else {
        updateTest('HTTP Polling', {
          status: 'error',
          message: 'Some API endpoints failed',
          duration
        });
        return false;
      }
    } catch (error) {
      updateTest('HTTP Polling', {
        status: 'error',
        message: `Polling failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime
      });
      return false;
    }
  };

  const testSSE = async () => {
    const startTime = Date.now();
    addTest({
      name: 'Server-Sent Events',
      status: 'running',
      message: 'Testing SSE connection...'
    });

    return new Promise<boolean>((resolve) => {
      if (!user) {
        updateTest('Server-Sent Events', {
          status: 'error',
          message: 'No user authenticated',
          duration: Date.now() - startTime
        });
        resolve(false);
        return;
      }

      try {
        const eventSource = new EventSource(`/api/sse/updates?userId=${user.id}`);
        
        const timeout = setTimeout(() => {
          eventSource.close();
          updateTest('Server-Sent Events', {
            status: 'error',
            message: 'SSE connection timeout',
            duration: Date.now() - startTime
          });
          resolve(false);
        }, 5000);

        eventSource.onopen = () => {
          clearTimeout(timeout);
          const duration = Date.now() - startTime;
          updateTest('Server-Sent Events', {
            status: 'success',
            message: 'SSE connection established',
            duration
          });
          setConnections(prev => ({ ...prev, sse: true }));
          eventSource.close();
          resolve(true);
        };

        eventSource.onerror = () => {
          clearTimeout(timeout);
          eventSource.close();
          updateTest('Server-Sent Events', {
            status: 'error',
            message: 'SSE connection failed',
            duration: Date.now() - startTime
          });
          resolve(false);
        };

        sseRef.current = eventSource;
      } catch (error) {
        updateTest('Server-Sent Events', {
          status: 'error',
          message: `SSE not supported: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: Date.now() - startTime
        });
        resolve(false);
      }
    });
  };

  const testNotifications = async () => {
    const startTime = Date.now();
    addTest({
      name: 'Notification System',
      status: 'running',
      message: 'Testing notification delivery...'
    });

    try {
      // Test toast notification
      toast({
        title: "Test Notification",
        description: "This is a test notification from the real-time testing system",
        duration: 3000,
      });

      updateTest('Notification System', {
        status: 'success',
        message: 'Toast notification displayed successfully',
        duration: Date.now() - startTime
      });
      return true;
    } catch (error) {
      updateTest('Notification System', {
        status: 'error',
        message: `Notification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime
      });
      return false;
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTests([]);
    setConnections({ polling: false, sse: false });

    try {
      await testPolling();
      await testSSE();
      await testNotifications();
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Activity className="h-4 w-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'success':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sseRef.current) {
        sseRef.current.close();
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Real-Time Communication Test
            <Button onClick={runAllTests} disabled={isRunning || !user}>
              {isRunning ? 'Running Tests...' : 'Run Tests'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!user && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Please log in to run real-time tests
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                {connections.polling ? <Wifi className="h-5 w-5 text-green-600" /> : <WifiOff className="h-5 w-5 text-gray-400" />}
                <span className="font-medium">HTTP Polling</span>
              </div>
              <Badge variant={connections.polling ? 'default' : 'secondary'}>
                {connections.polling ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                {connections.sse ? <Bell className="h-5 w-5 text-green-600" /> : <WifiOff className="h-5 w-5 text-gray-400" />}
                <span className="font-medium">Server-Sent Events</span>
              </div>
              <Badge variant={connections.sse ? 'default' : 'secondary'}>
                {connections.sse ? 'Available' : 'Unavailable'}
              </Badge>
            </div>
          </div>

          <div className="space-y-3">
            {tests.map((test, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(test.status)}
                  <div>
                    <div className="font-medium">{test.name}</div>
                    <div className="text-sm text-gray-600">{test.message}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {test.duration && (
                    <span className="text-xs text-gray-500">{test.duration}ms</span>
                  )}
                  <Badge className={getStatusColor(test.status)}>
                    {test.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          {tests.length === 0 && !isRunning && (
            <div className="text-center py-8 text-gray-500">
              Click "Run Tests" to test real-time communication systems
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}