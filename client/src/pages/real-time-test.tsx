import React from 'react';
import { RealTimeTest } from '@/components/testing/real-time-test';

export default function RealTimeTestPage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Real-Time Communication Testing</h1>
        <p className="text-gray-600 mt-2">
          Test and validate the real-time communication systems including HTTP polling, 
          Server-Sent Events, and notification delivery.
        </p>
      </div>
      <RealTimeTest />
    </div>
  );
}