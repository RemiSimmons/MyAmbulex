
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TestResult {
  name: string;
  status: 'running' | 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export default function WebSocketInfrastructureTest() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const updateResult = (name: string, updates: Partial<TestResult>) => {
    setResults(prev => prev.map(r => r.name === name ? { ...r, ...updates } : r));
  };

  const runInfrastructureTests = async () => {
    setIsRunning(true);
    setResults([]);

    // Test 1: Environment Detection
    addResult({
      name: 'Environment Detection',
      status: 'running',
      message: 'Analyzing runtime environment...'
    });

    const envInfo = {
      inIframe: window.self !== window.top,
      hostname: window.location.hostname,
      protocol: window.location.protocol,
      isReplit: window.location.hostname.includes('replit'),
      userAgent: navigator.userAgent.substring(0, 100),
      websocketSupport: typeof WebSocket !== 'undefined',
      secureContext: window.isSecureContext
    };

    updateResult('Environment Detection', {
      status: envInfo.inIframe ? 'warning' : 'success',
      message: envInfo.inIframe 
        ? 'Running inside iframe - may have WebSocket restrictions'
        : 'Running in main window',
      details: envInfo
    });

    // Test 2: Security Headers Check
    addResult({
      name: 'Security Headers',
      status: 'running',
      message: 'Checking CSP and security headers...'
    });

    try {
      const response = await fetch(window.location.href, { method: 'HEAD' });
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      const hasCSP = headers['content-security-policy'];
      const hasFrameOptions = headers['x-frame-options'];

      updateResult('Security Headers', {
        status: hasCSP || hasFrameOptions ? 'warning' : 'success',
        message: hasCSP || hasFrameOptions 
          ? 'Security restrictions detected'
          : 'No blocking security headers',
        details: {
          csp: hasCSP || 'None',
          frameOptions: hasFrameOptions || 'None',
          allHeaders: headers
        }
      });
    } catch (error) {
      updateResult('Security Headers', {
        status: 'error',
        message: 'Failed to check headers',
        details: error
      });
    }

    // Test 3: Basic WebSocket Test (no auth)
    addResult({
      name: 'Basic WebSocket',
      status: 'running',
      message: 'Testing raw WebSocket connection...'
    });

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const testWsUrl = `${wsProtocol}//${window.location.host}/ws`;

    try {
      const testWs = new WebSocket(testWsUrl);
      let connected = false;
      let closeCode: number | null = null;
      let closeReason: string | null = null;

      const connectionTimeout = setTimeout(() => {
        if (!connected) {
          testWs.close();
          updateResult('Basic WebSocket', {
            status: 'error',
            message: 'Connection timeout (5s)',
            details: { timeout: true }
          });
        }
      }, 5000);

      testWs.onopen = () => {
        connected = true;
        clearTimeout(connectionTimeout);
        
        // Keep connection alive briefly
        setTimeout(() => {
          testWs.close(1000, 'Test complete');
        }, 2000);
      };

      testWs.onclose = (event) => {
        closeCode = event.code;
        closeReason = event.reason;
        
        if (connected) {
          updateResult('Basic WebSocket', {
            status: closeCode === 1000 ? 'success' : 'warning',
            message: closeCode === 1000 
              ? 'Connected successfully, clean close'
              : `Connected but abnormal close: ${closeCode}`,
            details: { 
              connected: true, 
              closeCode, 
              closeReason,
              wasClean: event.wasClean
            }
          });
        } else {
          updateResult('Basic WebSocket', {
            status: 'error',
            message: `Failed to connect: ${closeCode} ${closeReason}`,
            details: { 
              connected: false, 
              closeCode, 
              closeReason,
              wasClean: event.wasClean
            }
          });
        }
      };

      testWs.onerror = (error) => {
        updateResult('Basic WebSocket', {
          status: 'error',
          message: 'WebSocket error occurred',
          details: error
        });
      };

    } catch (error) {
      updateResult('Basic WebSocket', {
        status: 'error',
        message: 'WebSocket creation failed',
        details: error
      });
    }

    // Test 4: Cookie and Session Test
    addResult({
      name: 'Session & Cookies',
      status: 'running',
      message: 'Checking session and cookie handling...'
    });

    const cookies = document.cookie;
    const sessionCookie = cookies
      .split(';')
      .find(row => row.trim().startsWith('myambulex.sid='))
      ?.split('=')[1];

    updateResult('Session & Cookies', {
      status: sessionCookie ? 'success' : 'warning',
      message: sessionCookie 
        ? 'Session cookie found'
        : 'No session cookie - authentication may fail',
      details: {
        hasCookies: !!cookies,
        hasSessionCookie: !!sessionCookie,
        sessionPrefix: sessionCookie ? sessionCookie.substring(0, 15) + '...' : null,
        allCookieNames: cookies.split(';').map(c => c.trim().split('=')[0]).filter(Boolean)
      }
    });

    // Test 5: Replit-specific Tests
    addResult({
      name: 'Replit Infrastructure',
      status: 'running',
      message: 'Testing Replit-specific configurations...'
    });

    const replitTests = {
      isReplitDomain: window.location.hostname.includes('replit'),
      hasReplitId: window.location.hostname.includes('-'),
      domainPattern: window.location.hostname,
      portAccess: window.location.port || 'default',
      httpsUpgrade: window.location.protocol === 'https:'
    };

    updateResult('Replit Infrastructure', {
      status: replitTests.isReplitDomain ? 'success' : 'warning',
      message: replitTests.isReplitDomain 
        ? 'Running on Replit infrastructure'
        : 'Not on Replit - infrastructure tests may not apply',
      details: replitTests
    });

    // Test 6: WebSocket with Session Test
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for basic test

    if (sessionCookie) {
      addResult({
        name: 'WebSocket with Session',
        status: 'running',
        message: 'Testing WebSocket with session authentication...'
      });

      try {
        const authWsUrl = `${testWsUrl}?sessionId=${encodeURIComponent(sessionCookie)}`;
        const authWs = new WebSocket(authWsUrl);
        let authConnected = false;
        let authCloseCode: number | null = null;

        const authTimeout = setTimeout(() => {
          if (!authConnected) {
            authWs.close();
            updateResult('WebSocket with Session', {
              status: 'error',
              message: 'Authentication timeout (10s)',
              details: { timeout: true, sessionUsed: true }
            });
          }
        }, 10000);

        authWs.onopen = () => {
          authConnected = true;
          clearTimeout(authTimeout);
          
          setTimeout(() => {
            authWs.close(1000, 'Auth test complete');
          }, 3000);
        };

        authWs.onclose = (event) => {
          authCloseCode = event.code;
          
          if (authConnected) {
            updateResult('WebSocket with Session', {
              status: authCloseCode === 1000 ? 'success' : 'warning',
              message: authCloseCode === 1000 
                ? 'Authenticated connection successful'
                : `Connected but abnormal close: ${authCloseCode}`,
              details: { 
                authenticated: true, 
                closeCode: authCloseCode, 
                closeReason: event.reason,
                sessionUsed: true
              }
            });
          } else {
            updateResult('WebSocket with Session', {
              status: 'error',
              message: `Authentication failed: ${authCloseCode}`,
              details: { 
                authenticated: false, 
                closeCode: authCloseCode,
                closeReason: event.reason,
                sessionUsed: true
              }
            });
          }
        };

      } catch (error) {
        updateResult('WebSocket with Session', {
          status: 'error',
          message: 'Session WebSocket creation failed',
          details: error
        });
      }
    }

    setIsRunning(false);
  };

  const openInNewWindow = () => {
    window.open(window.location.href.replace('/websocket-infrastructure-test', ''), '_blank');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>WebSocket Infrastructure Diagnostic</CardTitle>
          <div className="flex gap-4">
            <Button onClick={runInfrastructureTests} disabled={isRunning}>
              {isRunning ? 'Running Tests...' : 'Run Infrastructure Tests'}
            </Button>
            <Button variant="outline" onClick={openInNewWindow}>
              Open App in New Window
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {results.map((result, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{result.name}</h3>
                  <Badge className={getStatusColor(result.status)}>
                    {result.status}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mb-2">{result.message}</p>
                {result.details && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-blue-600">
                      View Details
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
