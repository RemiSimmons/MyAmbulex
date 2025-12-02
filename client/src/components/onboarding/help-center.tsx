import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Search, MessageCircle, Phone, Mail, FileText, VideoIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const HelpCenter: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Search results",
      description: `Showing results for "${searchQuery}"`,
    });
  };
  
  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message sent",
      description: "Our support team will get back to you shortly.",
    });
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-2">MyAmbulex Help Center</h1>
        <p className="text-lg text-muted-foreground mb-6">Find answers, resources, and support for your medical transportation needs</p>
        
        <form onSubmit={handleSearch} className="flex max-w-md mx-auto">
          <Input
            type="text"
            placeholder="Search for help topics..."
            className="rounded-r-none focus-visible:ring-0"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button type="submit" className="rounded-l-none">
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </form>
      </div>
      
      <Tabs defaultValue="faq">
        <TabsList className="grid grid-cols-4 mb-8">
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="guides">Guides</TabsTrigger>
          <TabsTrigger value="contact">Contact Us</TabsTrigger>
          <TabsTrigger value="videos">Video Tutorials</TabsTrigger>
        </TabsList>
        
        <TabsContent value="faq" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>For New Users</CardTitle>
                <CardDescription>Frequently asked questions for riders just getting started</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>What is MyAmbulex?</AccordionTrigger>
                    <AccordionContent>
                      MyAmbulex is a non-emergency medical transportation (NEMT) platform that connects patients with qualified drivers. We provide safe, reliable transportation to medical appointments, treatments, and other healthcare-related destinations.
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="item-2">
                    <AccordionTrigger>How do I book my first ride?</AccordionTrigger>
                    <AccordionContent>
                      To book your first ride, go to your dashboard and click on "Request Ride." Enter your pickup and drop-off locations, desired date and time, and any special requirements. You'll receive bids from qualified drivers, and you can select the one that best meets your needs.
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="item-3">
                    <AccordionTrigger>What if I need special accommodations?</AccordionTrigger>
                    <AccordionContent>
                      During the booking process, you can specify any special requirements you may have, such as wheelchair accessibility, oxygen tank support, or door-to-door assistance. Our platform will match you with drivers who can accommodate these needs.
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="item-4">
                    <AccordionTrigger>How does the bidding system work?</AccordionTrigger>
                    <AccordionContent>
                      After you request a ride, qualified drivers in your area can submit bids with their rates and services. You can review these bids and select the one that best suits your needs and budget. You can also counter-offer if you'd like to negotiate the price.
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="item-5">
                    <AccordionTrigger>Is my personal information secure?</AccordionTrigger>
                    <AccordionContent>
                      Yes, MyAmbulex takes data security seriously. We use industry-standard encryption and security practices to protect your personal and medical information. We only share necessary details with the driver you select for your ride.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">View All New User FAQs</Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Ride Booking & Management</CardTitle>
                <CardDescription>Questions about booking, modifying, and tracking your rides</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>How far in advance should I book my ride?</AccordionTrigger>
                    <AccordionContent>
                      We recommend booking at least 24-48 hours in advance to ensure you have plenty of time to receive and review bids from drivers. For regular appointments, you can book up to 30 days in advance.
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="item-2">
                    <AccordionTrigger>Can I modify my ride after booking?</AccordionTrigger>
                    <AccordionContent>
                      Yes, you can modify your ride details up to 6 hours before the scheduled pickup time. Go to "My Rides" in your dashboard, select the ride you want to modify, and click "Edit Ride." The driver will be notified and must accept the changes.
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="item-3">
                    <AccordionTrigger>How do I track my driver's arrival?</AccordionTrigger>
                    <AccordionContent>
                      On the day of your ride, you'll receive real-time updates about your driver's location and estimated arrival time. You can track your driver through the app or receive text notifications if you prefer.
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="item-4">
                    <AccordionTrigger>What if I need to cancel my ride?</AccordionTrigger>
                    <AccordionContent>
                      You can cancel your ride through the app up to 6 hours before the scheduled pickup without any cancellation fee. Cancellations made within 6 hours may incur a fee depending on the driver's cancellation policy.
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="item-5">
                    <AccordionTrigger>Can I request a recurring ride for regular appointments?</AccordionTrigger>
                    <AccordionContent>
                      Yes, if you have regular medical appointments, you can set up recurring rides. Go to "Recurring Appointments" in your dashboard and set your schedule. You can specify the same driver for all rides or receive new bids each time.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">View All Booking FAQs</Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Payments & Billing</CardTitle>
                <CardDescription>Questions about pricing, payment methods, and receipts</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>What payment methods are accepted?</AccordionTrigger>
                    <AccordionContent>
                      MyAmbulex accepts all major credit and debit cards, as well as HSA/FSA cards for eligible medical transportation. You can also set up payment through Medicare, Medicaid, or private insurance if you qualify.
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="item-2">
                    <AccordionTrigger>When am I charged for my ride?</AccordionTrigger>
                    <AccordionContent>
                      Your payment method is authorized when you accept a bid, but you're only charged after the ride is completed. This ensures you only pay for services you actually receive.
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="item-3">
                    <AccordionTrigger>How do I get a receipt for insurance reimbursement?</AccordionTrigger>
                    <AccordionContent>
                      After each completed ride, a detailed receipt is automatically emailed to you. You can also access all your receipts under "Ride History" in your dashboard. These receipts contain all the information needed for insurance reimbursement.
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="item-4">
                    <AccordionTrigger>What factors affect the price of my ride?</AccordionTrigger>
                    <AccordionContent>
                      Ride prices are determined by distance, time of day, special requirements (wheelchair, stretcher, etc.), wait time, and driver availability. Prices may also vary depending on the driver's experience and vehicle type.
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="item-5">
                    <AccordionTrigger>Is tipping expected or included?</AccordionTrigger>
                    <AccordionContent>
                      Tipping is optional and not included in the ride price. After your ride, you'll have the option to add a tip if you were satisfied with the service. You can set a default tipping preference in your account settings.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">View All Payment FAQs</Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Driver Information</CardTitle>
                <CardDescription>Questions about our drivers, qualifications, and vehicle standards</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>How are drivers vetted for safety?</AccordionTrigger>
                    <AccordionContent>
                      All MyAmbulex drivers undergo rigorous background checks, including criminal history, driving record, and professional references. They must also complete training in patient assistance, medical sensitivity, and safe transportation.
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="item-2">
                    <AccordionTrigger>What qualifications do drivers have?</AccordionTrigger>
                    <AccordionContent>
                      Our drivers are required to have clean driving records, valid insurance, and vehicles that meet our safety standards. Many have healthcare backgrounds or specialized training in patient transport, and all complete our NEMT certification program.
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="item-3">
                    <AccordionTrigger>Can I request a specific driver?</AccordionTrigger>
                    <AccordionContent>
                      Yes, if you've had a positive experience with a particular driver, you can add them to your "Preferred Drivers" list. When you request a ride, these drivers will be notified first and given priority to bid on your ride.
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="item-4">
                    <AccordionTrigger>What vehicle standards are required?</AccordionTrigger>
                    <AccordionContent>
                      All vehicles in the MyAmbulex network must be less than 10 years old, pass a rigorous inspection, and be properly equipped for medical transportation. Specialized vehicles (wheelchair accessible, etc.) undergo additional certification.
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="item-5">
                    <AccordionTrigger>How can I rate or provide feedback about my driver?</AccordionTrigger>
                    <AccordionContent>
                      After each ride, you'll be prompted to rate your driver and provide feedback. This helps maintain our high quality standards and helps other riders choose the best drivers for their needs.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">View All Driver FAQs</Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="guides" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Getting Started Guide</CardTitle>
                <CardDescription>Complete walkthrough for new users</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <FileText className="h-24 w-24 text-primary mb-4" />
                <p className="text-sm text-center text-muted-foreground">
                  A comprehensive guide to setting up your account, completing your profile, and booking your first ride.
                </p>
              </CardContent>
              <CardFooter>
                <Button className="w-full">Read Guide</Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Accessibility Features</CardTitle>
                <CardDescription>Guide to special assistance options</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <FileText className="h-24 w-24 text-primary mb-4" />
                <p className="text-sm text-center text-muted-foreground">
                  Learn about wheelchair accessibility, stretcher transport, oxygen support, and other medical assistance options.
                </p>
              </CardContent>
              <CardFooter>
                <Button className="w-full">Read Guide</Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Insurance & Billing</CardTitle>
                <CardDescription>Understanding payment options</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <FileText className="h-24 w-24 text-primary mb-4" />
                <p className="text-sm text-center text-muted-foreground">
                  Detailed information about insurance coverage, Medicaid/Medicare, and how to get reimbursed for eligible rides.
                </p>
              </CardContent>
              <CardFooter>
                <Button className="w-full">Read Guide</Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="contact" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Our Support Team</CardTitle>
              <CardDescription>We're here to help with any questions or concerns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="name" className="text-sm font-medium">Your Name</label>
                      <Input id="name" placeholder="Enter your name" />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="email" className="text-sm font-medium">Email Address</label>
                      <Input id="email" type="email" placeholder="Enter your email" />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="subject" className="text-sm font-medium">Subject</label>
                      <Input id="subject" placeholder="What is your question about?" />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="message" className="text-sm font-medium">Message</label>
                      <textarea
                        id="message"
                        rows={4}
                        className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="How can we help you?"
                      ></textarea>
                    </div>
                    
                    <Button type="submit" className="w-full">Send Message</Button>
                  </form>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Other Ways to Reach Us</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Our support team is available 24/7 to assist you with any questions or concerns.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <Phone className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">Phone Support</h4>
                        <p className="text-sm text-muted-foreground">1-800-555-7890</p>
                        <p className="text-xs text-muted-foreground">Available 24/7 for urgent issues</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">Email Support</h4>
                        <p className="text-sm text-muted-foreground">support@myambulex.com</p>
                        <p className="text-xs text-muted-foreground">We respond within 24 hours</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <MessageCircle className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">Live Chat</h4>
                        <p className="text-sm text-muted-foreground">Available in the app</p>
                        <p className="text-xs text-muted-foreground">Chat with our support team in real-time</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="videos" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Booking Your First Ride</CardTitle>
                <CardDescription>Step-by-step video tutorial</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="bg-gray-200 w-full aspect-video flex items-center justify-center rounded-md mb-4">
                  <VideoIcon className="h-16 w-16 text-primary" />
                </div>
                <p className="text-sm text-center text-muted-foreground">
                  This video walks you through the process of requesting a ride and selecting the best driver for your needs.
                </p>
              </CardContent>
              <CardFooter>
                <Button className="w-full">Watch Video</Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Using Special Assistance Features</CardTitle>
                <CardDescription>Accessibility options explained</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="bg-gray-200 w-full aspect-video flex items-center justify-center rounded-md mb-4">
                  <VideoIcon className="h-16 w-16 text-primary" />
                </div>
                <p className="text-sm text-center text-muted-foreground">
                  Learn how to request special accommodations like wheelchair accessibility, oxygen support, and more.
                </p>
              </CardContent>
              <CardFooter>
                <Button className="w-full">Watch Video</Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Bidding System Tutorial</CardTitle>
                <CardDescription>How to get the best rates</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="bg-gray-200 w-full aspect-video flex items-center justify-center rounded-md mb-4">
                  <VideoIcon className="h-16 w-16 text-primary" />
                </div>
                <p className="text-sm text-center text-muted-foreground">
                  This tutorial explains how our bidding system works and how to negotiate rates with drivers.
                </p>
              </CardContent>
              <CardFooter>
                <Button className="w-full">Watch Video</Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};