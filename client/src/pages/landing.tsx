import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Clock, 
  Users, 
  Award, 
  CheckCircle, 
  Star, 
  Heart, 
  MapPin,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Zap,
  Play
} from 'lucide-react';

// YouTube Video Player Component - Shows thumbnail, plays inline on click
function VideoPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoId = 'EiqJLRkLa7U';

  return (
    <div className="mb-8 max-w-4xl mx-auto">
      <div className="relative bg-black rounded-lg overflow-hidden shadow-2xl">
        <div className="aspect-video relative">
          {!isPlaying ? (
            <>
              {/* YouTube Thumbnail */}
              <img 
                src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                alt="MyAmbulex Platform Demo Video"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                }}
              />
              {/* Play Button Overlay */}
              <button
                onClick={() => setIsPlaying(true)}
                className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors cursor-pointer group"
                aria-label="Play video"
              >
                <div className="w-20 h-20 bg-red-600 group-hover:bg-red-500 group-hover:scale-110 rounded-full flex items-center justify-center transition-all shadow-lg">
                  <Play className="w-10 h-10 text-white ml-1" fill="white" />
                </div>
              </button>
              {/* Duration Badge */}
              <div className="absolute bottom-3 right-3 bg-black/80 text-white text-xs px-2 py-1 rounded">
                0:29
              </div>
            </>
          ) : (
            /* YouTube Iframe - loads when play is clicked */
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
              title="Drive with Purpose | Drive with MyAmbulex"
              style={{ border: 'none' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showDriverEmailForm, setShowDriverEmailForm] = useState(false);
  const [showRiderEmailForm, setShowRiderEmailForm] = useState(false);
  const [driverEmail, setDriverEmail] = useState('');
  const [riderEmail, setRiderEmail] = useState('');
  const [driverSubmitted, setDriverSubmitted] = useState(false);
  const [riderSubmitted, setRiderSubmitted] = useState(false);
  const [showRiderFormInSection, setShowRiderFormInSection] = useState(false);
  const [riderSectionEmail, setRiderSectionEmail] = useState('');

  const handleEmailSubmit = async (e: React.FormEvent, type: 'general' | 'driver' | 'rider') => {
    e.preventDefault();
    const emailToSubmit = type === 'driver' ? driverEmail : type === 'rider' ? (riderEmail || riderSectionEmail) : email;
    
    try {
      const response = await fetch('/api/beta-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: emailToSubmit,
          type: type
        }),
      });
      
      if (response.ok) {
        if (type === 'driver') {
          setDriverSubmitted(true);
        } else if (type === 'rider') {
          setRiderSubmitted(true);
        } else {
          setIsSubmitted(true);
        }
      } else {
        console.error('Failed to submit beta signup');
      }
    } catch (error) {
      console.error('Error submitting beta signup:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge className="bg-yellow-500 text-black mb-4 px-4 py-2 text-sm font-semibold">
              Only 100 founding driver spots available — apply now
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Join Atlanta's Medical Transport Revolution
            </h1>
            <p className="text-xl md:text-2xl mb-4 text-yellow-300 font-semibold">
              Direct Connections. No More Brokers.
            </p>
            <p className="text-lg md:text-xl mb-2 text-blue-100 font-semibold">
              Get approved and start earning in just 7 days
            </p>
            <p className="text-lg md:text-xl mb-8 text-blue-100">
              Founding members lock in lifetime perks, priority rides, and low fees.
            </p>
            
            {/* Video Section - Click to Play Inline */}
            <VideoPlayer />
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-4 mb-8">
              <p className="text-blue-100 text-sm">
                Watch how drivers and riders connect on our platform
              </p>
              <a 
                href="https://www.youtube.com/@MyAmbulex" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-yellow-400 hover:text-yellow-300 text-sm font-medium flex items-center gap-1 transition-colors"
              >
                <Play className="w-4 h-4" />
                View more videos on our channel
              </a>
            </div>
            
            <div className="flex justify-center">
              {!showDriverEmailForm && !driverSubmitted ? (
                <Button 
                  size="lg" 
                  className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-8 py-4 text-lg"
                  onClick={() => setShowDriverEmailForm(true)}
                >
                  <Users className="mr-2 h-5 w-5" />
                  Secure Your Founding Driver Spot
                </Button>
              ) : driverSubmitted ? (
                <div className="bg-green-100 text-green-800 px-8 py-4 rounded-lg text-lg font-semibold">
                  <CheckCircle className="mr-2 h-5 w-5 inline" />
                  Application Submitted!
                </div>
              ) : (
                <form onSubmit={(e) => handleEmailSubmit(e, 'driver')} className="flex flex-col gap-3 max-w-sm mx-auto">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={driverEmail}
                    onChange={(e) => setDriverEmail(e.target.value)}
                    required
                    className="px-4 py-3 text-lg bg-white text-gray-800 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-yellow-500 placeholder-gray-500"
                  />
                  <Button 
                    type="submit"
                    size="lg" 
                    className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-8 py-3 text-lg rounded-lg"
                  >
                    Get Approved in 7 Days
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Launch Timing Section */}
      <section className="py-12 bg-yellow-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <Zap className="h-8 w-8 text-yellow-600 mr-3" />
            <h2 className="text-3xl font-bold text-gray-900">Go Live in 7 Days</h2>
          </div>
          <p className="text-lg text-gray-600">
            Get fully approved and ready to take rides or book transport within one week.
          </p>
        </div>
      </section>

      {/* Founding Member Value Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="bg-purple-100 text-purple-800 mb-4 px-4 py-2 text-sm font-semibold">
              <Award className="mr-2 h-4 w-4" />
              FOUNDING MEMBER
            </Badge>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Become a Founding Member — Shape the Future of NEMT</h2>
            <p className="text-lg text-gray-600">Lock in lifetime advantages that grow with the platform</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-purple-200">
              <CardHeader className="text-center">
                <DollarSign className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <CardTitle className="text-lg">Lock in 2.5% fees forever</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center">While others pay 4-6%, you keep 97.5% of every ride forever. No surprise fee hikes.</p>
              </CardContent>
            </Card>
            <Card className="border-purple-200">
              <CardHeader className="text-center">
                <Zap className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <CardTitle className="text-lg">Priority Ride Selection</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center">Get first choice on premium rides before other drivers.</p>
              </CardContent>
            </Card>
            <Card className="border-purple-200">
              <CardHeader className="text-center">
                <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <CardTitle className="text-lg">Help Build Your Ideal Platform</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center">Get exclusive input on new features. Your feedback directly shapes the features and tools we build—because this platform is built for you.</p>
              </CardContent>
            </Card>
            <Card className="border-purple-200">
              <CardHeader className="text-center">
                <CheckCircle className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <CardTitle className="text-lg">Transparent Earnings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center">Know exactly what you make on every trip. No hidden deductions or broker cuts.</p>
              </CardContent>
            </Card>
            <Card className="border-purple-200">
              <CardHeader className="text-center">
                <Star className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <CardTitle className="text-lg">Early Feature Access</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center">Be the first to test new ride types, bidding tools, and payout features.</p>
              </CardContent>
            </Card>
            <Card className="border-purple-200">
              <CardHeader className="text-center">
                <Award className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <CardTitle className="text-lg">Founding Member Badge</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center">Stand out with a special badge on your profile showing you were here from the start.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Driver Benefits Section */}
      <section id="drivers" className="py-16 bg-green-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Keep More of What You Earn
              </h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Lock in 2.5% fees forever</h3>
                    <p className="text-gray-600">Keep 97.5% of every ride while others pay 4-6%</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Choose your rides and set your availability</h3>
                    <p className="text-gray-600">Work on your own schedule</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Negotiate your price directly with riders</h3>
                    <p className="text-gray-600">Set competitive rates without broker interference</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Weekly payouts, transparent earnings</h3>
                    <p className="text-gray-600">Know exactly what you earn with reliable payments</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Get approved in 7 days or less</h3>
                    <p className="text-gray-600">Streamlined onboarding process</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">No middlemen or dispatch interference</h3>
                    <p className="text-gray-600">Direct connections with riders</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Ready to Drive?</h3>
              <p className="text-gray-600 mb-6">Join our founding driver program and start earning more today. Only 100 spots available!</p>
              
              {!showDriverEmailForm && !driverSubmitted ? (
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
                  onClick={() => {
                    console.log('Driver button clicked, showing email form');
                    setShowDriverEmailForm(true);
                  }}
                >
                  Secure Your Founding Driver Spot
                </Button>
              ) : driverSubmitted ? (
                <div className="bg-green-100 text-green-800 px-4 py-3 rounded-lg text-center font-semibold">
                  <CheckCircle className="mr-2 h-5 w-5 inline" />
                  Application Submitted! Check your email.
                </div>
              ) : (
                <form onSubmit={(e) => handleEmailSubmit(e, 'driver')} className="space-y-4">
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    value={driverEmail}
                    onChange={(e) => setDriverEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-white text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <Button 
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
                  >
                    Get Approved in 7 Days
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Rider Value Proposition */}
      <section id="riders" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="bg-blue-50 rounded-lg shadow-lg p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Need a Reliable Ride?</h3>
              <p className="text-gray-600 mb-6">Get early access to Atlanta's most reliable medical transport platform.</p>
              {!showRiderFormInSection && !riderSubmitted ? (
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  onClick={() => setShowRiderFormInSection(true)}
                >
                  Request Early Access
                </Button>
              ) : riderSubmitted ? (
                <div className="bg-green-100 text-green-800 px-4 py-3 rounded-lg text-center font-semibold">
                  <CheckCircle className="mr-2 h-5 w-5 inline" />
                  Access Request Submitted!
                </div>
              ) : (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleEmailSubmit(e, 'rider');
                  setRiderSectionEmail('');
                }} className="space-y-3">
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    value={riderSectionEmail}
                    onChange={(e) => setRiderSectionEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-white text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: 'white', color: 'black' }}
                  />
                  <Button 
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  >
                    Submit Request
                  </Button>
                </form>
              )}
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Reliable Medical Rides, On Your Terms
              </h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Quick Booking</h3>
                    <p className="text-gray-600">Book in minutes, track rides, and get real-time notifications</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Vetted Drivers</h3>
                    <p className="text-gray-600">All drivers are licensed, insured, and HIPAA-aware</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Complete History</h3>
                    <p className="text-gray-600">Access ride history and feedback system for peace of mind</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Safety Section */}
      <section id="safety" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Trust Comes Standard</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Our team includes both riders and drivers — we understand both sides of medical transportation.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="text-center">
                <Shield className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <CardTitle className="text-lg">Licensed & Insured</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center">Every provider is fully licensed, insured, and vetted</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="text-center">
                <CheckCircle className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <CardTitle className="text-lg">Safety Protocols</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center">Active safety protocols and rider protections in place</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="text-center">
                <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <CardTitle className="text-lg">Built by Users</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center">Created by people who actually use medical transportation</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="text-center">
                <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <CardTitle className="text-lg">Secure Verification</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center">Secure document upload and identity verification process</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-xl font-bold">MyAmbulex</span>
              </div>
              <p className="text-gray-400 mb-4">
                Built by the people who use it.
              </p>
              <p className="text-sm text-gray-500">
                Revolutionizing medical transportation in Atlanta through direct connections between riders and drivers.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Contact Us</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Stay Updated</h4>
              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="Your email"
                  className="bg-gray-800 border-gray-700 text-white"
                />
                <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
                  Subscribe
                </Button>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-sm text-gray-400">
              © 2025 MyAmbulex. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}