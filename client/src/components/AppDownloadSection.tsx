import { QrCode, Smartphone, Download, Apple, Play, X, Share, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePWA } from '@/hooks/usePWA';
import { useState } from 'react';

export function AppDownloadSection() {
  const currentUrl = window.location.origin;
  const { isInstallable, isInstalled, installApp } = usePWA();
  const [showInstructions, setShowInstructions] = useState<'ios' | 'android' | null>(null);
  
  // Generate QR code URL using a reliable QR service
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentUrl)}`;

  return (
    <section className="bg-gradient-to-br from-gray-100 to-green-100 text-gray-800 py-12 lg:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left side - Content */}
          <div className="text-center lg:text-left">
            <div className="mb-4">
              <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                Download Our App
              </span>
            </div>
            <h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold mb-4 lg:mb-6">
              Need Medical Transport on the Go?
            </h2>
            <p className="text-lg lg:text-xl mb-6 lg:mb-8 text-gray-600 max-w-2xl">
              Our mobile app gives you the power to request rides, track your driver, and manage your medical transportation needs from anywhere.
            </p>
            
            {/* Download Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
              {isInstalled ? (
                <div className="inline-flex items-center justify-center px-6 py-3 text-lg font-medium text-green-700 bg-green-100 rounded-lg min-h-[48px]">
                  <Download className="w-5 h-5 mr-2 flex-shrink-0" />
                  <span>App Installed</span>
                </div>
              ) : isInstallable ? (
                <button 
                  className="inline-flex items-center justify-center px-6 py-3 text-lg font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors duration-200 min-h-[48px]"
                  onClick={async () => {
                    const success = await installApp();
                    if (!success) {
                      // Fallback: show installation instructions
                      alert('To install: Use your browser menu > "Add to Home Screen" or "Install App"');
                    }
                  }}
                >
                  <Download className="w-5 h-5 mr-2 flex-shrink-0" />
                  <span>Install App</span>
                </button>
              ) : (
                <>
                  <button 
                    className="inline-flex items-center justify-center px-6 py-3 text-lg font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors duration-200 min-h-[48px]"
                    onClick={() => setShowInstructions('ios')}
                  >
                    <Apple className="w-5 h-5 mr-2 flex-shrink-0" />
                    <span>Add to iPhone</span>
                  </button>
                  <button 
                    className="inline-flex items-center justify-center px-6 py-3 text-lg font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors duration-200 min-h-[48px]"
                    onClick={() => setShowInstructions('android')}
                  >
                    <Play className="w-5 h-5 mr-2 flex-shrink-0" />
                    <span>Add to Android</span>
                  </button>
                </>
              )}
            </div>

            {/* QR Code Section - Always visible */}
            <div className="bg-white backdrop-blur-sm rounded-xl p-4 lg:p-6 border border-green-200 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">
                    Quick Install
                  </h3>
                  <p className="text-sm text-gray-600">
                    Scan with your phone to install instantly
                  </p>
                </div>
              </div>

              <div className="text-center">
                <div className="bg-white p-3 rounded-lg border-2 border-white/20 inline-block mb-4">
                  <img 
                    src={qrCodeUrl} 
                    alt="QR Code to install MyAmbulex" 
                    className="w-32 h-32 lg:w-40 lg:h-40"
                    onError={(e) => {
                      // Fallback if QR service is down
                      (e.target as HTMLImageElement).src = "data:image/svg+xml,%3csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='200' height='200' fill='%23f3f4f6'/%3e%3ctext x='100' y='100' text-anchor='middle' dy='.3em' fill='%236b7280'%3eQR Code%3c/text%3e%3c/svg%3e";
                    }}
                  />
                </div>

              </div>
            </div>

            {/* App Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
              <div className="text-center">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Smartphone className="w-5 h-5 text-green-600" />
                </div>
                <h4 className="font-medium text-gray-900 mb-1">Easy to use</h4>
                <p className="text-xs text-gray-600">Simple interface designed for users of all ages and abilities.</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h4 className="font-medium text-gray-900 mb-1">Secure</h4>
                <p className="text-xs text-gray-600">Your medical information is protected with enterprise-grade security.</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="font-medium text-gray-900 mb-1">Real-time updates</h4>
                <p className="text-xs text-gray-600">Track your ride and get live ETAs.</p>
              </div>
            </div>
          </div>

          {/* Right side - Phone Mockup */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative">
              {/* Phone Frame */}
              <div className="bg-white/90 backdrop-blur-sm rounded-[2.5rem] p-2 border-4 border-gray-400 shadow-2xl ring-2 ring-gray-300/50">
                <div className="bg-white rounded-[2rem] w-64 h-[32rem] lg:w-80 lg:h-[40rem] overflow-hidden relative">
                  {/* Phone Header */}
                  <div className="bg-green-600 text-white p-4 text-center">
                    <h3 className="font-bold text-lg">MyAmbulex App</h3>
                  </div>
                  
                  {/* App Preview Content */}
                  <div className="p-6 h-full bg-gray-50 flex flex-col">
                    <div className="text-center mb-6">
                      <h4 className="text-lg font-semibold text-gray-800 mb-2">App Preview</h4>
                      <p className="text-sm text-gray-600">Book rides, track drivers, manage appointments</p>
                    </div>
                    
                    {/* Feature Cards */}
                    <div className="space-y-3 flex-1">
                      <div className="bg-white rounded-lg p-3 shadow-sm border">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-gray-800 text-sm leading-tight">Quick Booking</h5>
                            <p className="text-xs text-gray-600 leading-tight">Request rides instantly</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-lg p-3 shadow-sm border">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-gray-800 text-sm leading-tight">Driver Tracking</h5>
                            <p className="text-xs text-gray-600 leading-tight">Live location updates</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-lg p-3 shadow-sm border">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-gray-800 text-sm leading-tight">Transparent Pricing</h5>
                            <p className="text-xs text-gray-600 leading-tight">Clear Pricing</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-lg p-3 shadow-sm border">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-gray-800 text-sm leading-tight">Name Your Price</h5>
                            <p className="text-xs text-gray-600 leading-tight">Compare driver bids</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating App Icon */}
              <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center shadow-xl border-4 border-white">
                <span className="text-white font-bold text-xl">MY</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Installation Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setShowInstructions(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {showInstructions === 'ios' ? (
                  <Apple className="w-8 h-8 text-green-600" />
                ) : (
                  <Play className="w-8 h-8 text-green-600" />
                )}
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Install MyAmbulex on {showInstructions === 'ios' ? 'iPhone' : 'Android'}
              </h3>
              <p className="text-gray-600 mb-6">
                Follow these steps to add MyAmbulex to your home screen
              </p>

              {showInstructions === 'ios' ? (
                <div className="space-y-4 text-left">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    <div>
                      <p className="font-medium text-gray-900">Open in Safari</p>
                      <p className="text-sm text-gray-600">Make sure you're using Safari browser</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium text-gray-900">Tap Share button</p>
                        <p className="text-sm text-gray-600">Look for the square with arrow up</p>
                      </div>
                      <Share className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                    <div>
                      <p className="font-medium text-gray-900">Add to Home Screen</p>
                      <p className="text-sm text-gray-600">Scroll down and tap this option</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                    <div>
                      <p className="font-medium text-gray-900">Tap "Add"</p>
                      <p className="text-sm text-gray-600">Confirm to add MyAmbulex to your home screen</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-left">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium text-gray-900">Tap Browser Menu</p>
                        <p className="text-sm text-gray-600">Look for three dots (⋮) in browser</p>
                      </div>
                      <Menu className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <div>
                      <p className="font-medium text-gray-900">Add to Home Screen</p>
                      <p className="text-sm text-gray-600">Or "Install app" if available</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                    <div>
                      <p className="font-medium text-gray-900">Tap "Install"</p>
                      <p className="text-sm text-gray-600">Confirm when prompted</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                    <div>
                      <p className="font-medium text-gray-900">Find on Home Screen</p>
                      <p className="text-sm text-gray-600">MyAmbulex will appear on your home screen</p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowInstructions(null)}
                className="mt-6 w-full bg-[green-600] text-white py-3 px-4 rounded-lg font-medium hover:bg-[green-700] transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}