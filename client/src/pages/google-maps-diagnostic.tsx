import React from 'react';
import { TestGoogleMapsApi } from '@/components/test-google-maps-api';

export default function GoogleMapsDiagnosticPage() {
  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Google Maps API Diagnostic</h1>
      <TestGoogleMapsApi />
    </div>
  );
}