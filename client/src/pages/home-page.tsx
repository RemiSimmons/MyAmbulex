import { Link } from "wouter";
import Footer from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useHelp } from "@/context/help-context";
import { AppDownloadSection } from "@/components/AppDownloadSection";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const { openHelp } = useHelp();

  // Beta detection logic - checking URL for beta parameter
  const checkBetaCode = () => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const beta = urlParams.get('beta');
      return beta;
    }
    return null;
  };
  
  const betaCode = checkBetaCode();
  
  // Force show beta banner for testing (disabled for production)
  const forceBeta = false;
  const displayBetaCode = betaCode || (forceBeta ? 'FORCED-TEST' : null);

  return (
    <div className="flex flex-col min-h-screen">

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#00B2E3] to-[#0090BE] text-white py-8 sm:py-12 lg:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Beta Invitation Banner - Integrated into hero section */}
          {displayBetaCode && (
            <div className="bg-blue-800 text-white py-3 px-4 sm:py-4 sm:px-6 rounded-lg mb-4 sm:mb-6 text-center shadow-lg border border-blue-300">
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3">
                <div className="bg-white/20 rounded-full px-3 py-1">
                  <span className="text-sm font-bold">BETA</span>
                </div>
                <span className="font-semibold text-sm sm:text-lg">
                  🎉 Beta Invitation Recognized! Code: <span className="font-mono bg-white/30 px-2 py-1 rounded text-xs sm:text-sm">{displayBetaCode}</span>
                </span>
              </div>
            </div>
          )}
          
          <div className="flex flex-col items-center text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 leading-tight">Safe and Reliable Healthcare Transportation</h1>
            <p className="text-base sm:text-lg lg:text-xl mb-6 sm:mb-8 max-w-2xl lg:max-w-3xl px-4 sm:px-0">Schedule reliable rides to your medical appointments with MyAmbulex. Set your price and get matched with professional drivers.</p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full sm:w-auto">
              {isLoading ? (
                <Button disabled>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading
                </Button>
              ) : user ? (
                <>
                  {user.role === "rider" ? (
                    <Link href="/rider/book-ride">
                      <Button size="lg" variant="default" className="btn-primary bg-white text-primary hover:bg-gray-100">
                        Book Ride
                      </Button>
                    </Link>
                  ) : (
                    <Link href={`/${user.role}/dashboard`}>
                      <Button size="lg" variant="default" className="btn-primary bg-white text-primary hover:bg-gray-100">
                        Go to Dashboard
                      </Button>
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Button 
                    size="lg" 
                    variant="default" 
                    type="button"
                    className="btn-primary bg-white text-primary hover:bg-gray-100"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log("Homepage Get Started button clicked, navigating to:", "/auth?tab=register");
                      window.location.href = "/auth?tab=register";
                    }}
                  >
                    Get Started
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    type="button"
                    className="border-white text-white hover:bg-white hover:text-primary bg-white/20"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log("Homepage Learn More button clicked, scrolling to how it works");
                      const howItWorksSection = document.getElementById('how-it-works');
                      if (howItWorksSection) {
                        howItWorksSection.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                  >
                    Learn More
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
      
      {/* How It Works Section */}
      <section className="section-white" id="how-it-works">
        <div className="container-custom">
          <h2 
            className="heading-section cursor-pointer hover:text-primary transition-colors" 
            onClick={() => openHelp('welcome')}
          >
            How It Works
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {/* Step 1 */}
            <div className="text-center px-2 sm:px-4 group cursor-pointer" onClick={() => openHelp('locations')}>
              <div className="bg-blue-50 rounded-full w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-sm border border-blue-100 group-hover:shadow-md group-hover:border-primary/40 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-medium mb-2 group-hover:text-primary transition-colors">Request</h3>
              <p className="text-sm sm:text-base text-gray-600">Enter your pickup location, destination, and special requirements for your medical transportation.</p>
            </div>
            
            {/* Step 2 */}
            <div className="text-center px-2 sm:px-4 group cursor-pointer" onClick={() => openHelp('payment')}>
              <div className="bg-blue-50 rounded-full w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-sm border border-blue-100 group-hover:shadow-md group-hover:border-primary/40 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-medium mb-2 group-hover:text-primary transition-colors">Compare</h3>
              <p className="text-sm sm:text-base text-gray-600">Qualified drivers in your area will place bids on your ride request with transparent pricing.</p>
            </div>
            
            {/* Step 3 */}
            <div className="text-center px-2 sm:px-4 group cursor-pointer" onClick={() => openHelp('wait-times')}>
              <div className="bg-blue-50 rounded-full w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-sm border border-blue-100 group-hover:shadow-md group-hover:border-primary/40 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-medium mb-2 group-hover:text-primary transition-colors">Choose</h3>
              <p className="text-sm sm:text-base text-gray-600">Select the driver that best meets your needs and budget based on price and service ratings.</p>
            </div>
            
            {/* Step 4 */}
            <div className="text-center px-2 sm:px-4 group cursor-pointer" onClick={() => openHelp('notifications')}>
              <div className="bg-blue-50 rounded-full w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-sm border border-blue-100 group-hover:shadow-md group-hover:border-primary/40 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-medium mb-2 group-hover:text-primary transition-colors">Go</h3>
              <p className="text-sm sm:text-base text-gray-600">Track your ride in real-time and enjoy safe, reliable transportation to your medical appointment.</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Services Section */}
      <section className="section-light" id="services">
        <div className="container-custom">
          <h2 className="heading-section">Services Offered</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Standard Vehicle */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
              <div className="w-full h-48 overflow-hidden">
                <img 
                  src="/images/standard-transport.png" 
                  alt="Professional caregiver helping patient from NEMT van" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('Image failed to load:', e.target.src);
                    e.target.style.display = 'none';
                  }}
                />
              </div>
              <div className="p-5">
                <h3 className="text-xl font-medium mb-2 text-primary">Ambulatory Transport</h3>
                <p className="text-gray-600 mb-4">For ambulatory patients who can walk with minimal assistance. Our trained staff helps patients enter and exit the vehicle safely.</p>
                <ul className="text-sm text-gray-700 mb-4 space-y-2">
                  <li className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Caring support staff
                  </li>
                  <li className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Door-to-door service
                  </li>
                  <li className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Professional drivers
                  </li>
                </ul>
              </div>
            </div>
            
            {/* Wheelchair Vehicle */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
              <div className="w-full h-48 overflow-hidden">
                <img 
                  src="/images/wheelchair-transport.png" 
                  alt="Healthcare professionals assisting a patient in wheelchair near a transport van" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('Image failed to load:', e.target.src);
                    e.target.style.display = 'none';
                  }}
                />
              </div>
              <div className="p-5">
                <h3 className="text-xl font-medium mb-2 text-primary">Wheelchair Access</h3>
                <p className="text-gray-600 mb-4">Compassionate care for passengers in wheelchairs with trained staff providing attentive assistance throughout your journey.</p>
                <ul className="text-sm text-gray-700 mb-4 space-y-2">
                  <li className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Wheelchair ramps or lifts
                  </li>
                  <li className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Team of caring professionals
                  </li>
                  <li className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Trained in mobility assistance
                  </li>
                </ul>
              </div>
            </div>
            
            {/* Stretcher Vehicle */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
              <div className="w-full h-48 overflow-hidden">
                <img 
                  src="/images/stretcher-transport.png" 
                  alt="Medical professionals transferring patient on stretcher to medical transport van" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('Image failed to load:', e.target.src);
                    e.target.style.display = 'none';
                  }}
                />
              </div>
              <div className="p-5">
                <h3 className="text-xl font-medium mb-2 text-primary">Stretcher Transport</h3>
                <p className="text-gray-600 mb-4">Professional medical assistance for patients requiring stretcher transportation with specialized equipment and trained personnel.</p>
                <ul className="text-sm text-gray-700 mb-4 space-y-2">
                  <li className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Professional EMT personnel
                  </li>
                  <li className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Modern hydraulic stretchers
                  </li>
                  <li className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Careful patient handling
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Why Choose MyAmbulex Section */}
      <section className="section-white" id="why-choose">
        <div className="container-custom">
          <h2 className="heading-section">Why Choose MyAmbulex</h2>
          <p className="text-center text-gray-600 mb-8 md:mb-12 max-w-3xl mx-auto px-4">Experience safe, reliable, and comfortable medical transportation services</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {/* Easy Scheduling */}
            <div className="bg-white p-5 md:p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-green-50 rounded-full w-12 h-12 flex items-center justify-center mb-3 md:mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Easy Scheduling</h3>
              <p className="text-gray-600 text-sm">Book your medical transportation in advance with our intuitive scheduling system</p>
            </div>
            
            {/* Safe & Reliable */}
            <div className="bg-white p-5 md:p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-green-50 rounded-full w-12 h-12 flex items-center justify-center mb-3 md:mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Safe & Reliable</h3>
              <p className="text-gray-600 text-sm">All our drivers are thoroughly vetted, trained, and certified for medical transport</p>
            </div>
            
            {/* Competitive Pricing */}
            <div className="bg-white p-5 md:p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-green-50 rounded-full w-12 h-12 flex items-center justify-center mb-3 md:mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Competitive Pricing</h3>
              <p className="text-gray-600 text-sm">Transparent pricing with our unique bidding system to find the best rates</p>
            </div>
            
            {/* 24/7 Availability */}
            <div className="bg-white p-5 md:p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-green-50 rounded-full w-12 h-12 flex items-center justify-center mb-3 md:mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">24/7 Availability</h3>
              <p className="text-gray-600 text-sm">Round-the-clock service for all your medical transportation needs</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-4 gap-6 mt-6">
            {/* Specialized Care */}
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-blue-50 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Specialized Care</h3>
              <p className="text-gray-600 text-sm">Drivers trained to assist patients with various medical conditions and mobility needs</p>
            </div>
            
            {/* Quality Service */}
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-blue-50 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Quality Service</h3>
              <p className="text-gray-600 text-sm">Consistently high-rated service with a focus on patient comfort and satisfaction</p>
            </div>
            
            {/* Experienced Team */}
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-blue-50 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Experienced Team</h3>
              <p className="text-gray-600 text-sm">Professional drivers with extensive experience in medical transportation</p>
            </div>
            
            {/* Patient-Focused */}
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-blue-50 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Patient-Focused</h3>
              <p className="text-gray-600 text-sm">Personalized care and attention for every passenger's unique needs</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* App Download Section */}
      <AppDownloadSection />
      
      {/* Rewards & Referrals Section */}
      <section className="section-light" id="rewards">
        <div className="container-custom">
          <h2 className="heading-section">Rewards & Referrals</h2>
          <p className="text-center text-gray-600 mb-8 md:mb-12 max-w-3xl mx-auto px-4">Earn rewards for referring friends and family to MyAmbulex, and enjoy our loyalty program benefits.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {/* Referral Program */}
            <div className="bg-blue-50 rounded-xl p-5 md:p-6 border border-blue-100">
              <div className="flex items-center mb-4">
                <div className="bg-white rounded-full w-10 h-10 flex items-center justify-center mr-3 shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold">Referral Program</h3>
              </div>
              <p className="text-gray-700 mb-5">Share MyAmbulex with friends and family and earn rewards for every successful referral.</p>
              
              <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
                <div className="flex items-start">
                  <div className="bg-blue-100 rounded-full w-7 h-7 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Refer a Rider</h4>
                    <p className="text-sm text-gray-600">Get $15 in ride credits when someone signs up using your referral code and completes their first ride.</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 mb-5 shadow-sm">
                <div className="flex items-start">
                  <div className="bg-blue-100 rounded-full w-7 h-7 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Refer a Driver</h4>
                    <p className="text-sm text-gray-600">Earn $150 when you refer a driver who completes 20 rides in their first 30 days.</p>
                  </div>
                </div>
              </div>
              
              <Link href="/auth?type=signup">
                <Button className="bg-primary text-white hover:bg-primary/90 w-full">
                  Sign Up to Get Your Code
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Button>
              </Link>
            </div>
            
            {/* Loyalty Program */}
            <div className="bg-white rounded-xl p-5 md:p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center mb-4">
                <div className="bg-blue-50 rounded-full w-10 h-10 flex items-center justify-center mr-3 shadow-sm border border-blue-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold">Loyalty Program</h3>
              </div>
              <p className="text-gray-700 mb-5">Our loyalty program rewards our frequent users with increasing benefits the more you ride.</p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-3 border border-gray-100 relative">
                <div className="flex flex-wrap justify-between items-center mb-2">
                  <h4 className="font-semibold text-gray-900">Silver Status</h4>
                  <span className="bg-blue-100 text-primary text-xs font-medium px-2 py-1 rounded">5+ Rides</span>
                </div>
                <ul className="space-y-1.5">
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">5% off all rides</span>
                  </li>
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">Priority customer support</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-3 border border-gray-100 relative">
                <div className="flex flex-wrap justify-between items-center mb-2">
                  <h4 className="font-semibold text-gray-900">Gold Status</h4>
                  <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded">15+ Rides</span>
                </div>
                <ul className="space-y-1.5">
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">10% off all rides</span>
                  </li>
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">Dedicated customer support line</span>
                  </li>
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">Free cancellation (up to 2 per month)</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-5 border border-gray-100 relative">
                <div className="flex flex-wrap justify-between items-center mb-2">
                  <h4 className="font-semibold text-gray-900">Platinum Status</h4>
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">30+ Rides</span>
                </div>
                <ul className="space-y-1.5">
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">15% off all rides</span>
                  </li>
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">VIP customer support</span>
                  </li>
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">Free cancellation (unlimited)</span>
                  </li>
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">Priority driver matching</span>
                  </li>
                </ul>
              </div>
              
              <Link href="/auth?type=signup">
                <Button className="bg-primary text-white hover:bg-primary/90 w-full">
                  Sign Up to Start Earning
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
      
      {/* Driver Signup Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-green-50 border-t border-b border-green-200" id="become-driver">
        <div className="container-custom">
          <div className="md:flex items-center">
            <div className="md:w-1/2 mb-8 md:mb-0">
              <h2 className="text-3xl font-bold mb-4 text-gray-800">Become a MyAmbulex Driver</h2>
              <p className="text-lg mb-6 text-gray-700">Join our network of professional drivers and earn by providing essential medical transportation services. Set your own prices and choose your schedule.</p>
              
              <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-green-200">
                <h3 className="text-xl font-medium mb-4 text-primary">Driver Requirements</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-medium">Valid Driver's License</p>
                      <p className="text-sm text-gray-600">Current state-issued driver's license with clean record</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-medium">Vehicle Requirements</p>
                      <p className="text-sm text-gray-600">2010 or newer model with proof of insurance and registration</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-medium">Background Check</p>
                      <p className="text-sm text-gray-600">Pass criminal background and driving record checks</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-medium">Medical Transport Training</p>
                      <p className="text-sm text-gray-600">Complete our free online training course for medical transportation</p>
                    </div>
                  </li>
                </ul>
              </div>
              
              {user && user.role === "driver" ? (
                <Link href="/driver/dashboard">
                  <Button size="lg" className="bg-green-600 text-white hover:bg-green-700 shadow-md">Go to Driver Dashboard</Button>
                </Link>
              ) : (
                <Link href="/auth?role=driver">
                  <Button size="lg" className="bg-white text-green-600 hover:bg-gray-100 shadow-md border border-green-600">Apply to Drive</Button>
                </Link>
              )}
            </div>
            
            <div className="md:w-1/2 md:pl-8">
              <img 
                src="/images/nemt-drivers.png" 
                alt="NEMT drivers with patients smiling in transportation vehicle" 
                className="rounded-xl shadow-md w-full"
                onError={(e) => {
                  console.error('Image failed to load:', e.target.src);
                  e.target.style.display = 'none';
                }}
              />
            </div>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
}
