import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

// Icons
import {
  CheckCircle2,
  Play,
  BookOpen,
  Award,
  AlertCircle,
  FileText,
  Video,
  Clock,
  HeartPulse,
  Accessibility,
  Car,
  BadgeDollarSign
} from "lucide-react";

interface ModuleQuiz {
  questions: {
    id: string;
    question: string;
    options: {
      id: string;
      text: string;
      isCorrect: boolean;
    }[];
  }[];
}

interface TrainingModule {
  id: string;
  title: string;
  description: string;
  duration: string;
  icon: React.ReactNode;
  content: {
    sections: {
      title: string;
      content: string;
      videoUrl?: string;
    }[];
  };
  quiz: ModuleQuiz;
  isCompleted?: boolean;
}

// Sample training modules (in a real app, these would come from the backend)
const trainingModules: TrainingModule[] = [
  {
    id: "patient-care",
    title: "Patient Care Essentials",
    description: "Learn the fundamentals of assisting patients with medical transportation needs",
    duration: "20 minutes",
    icon: <HeartPulse className="h-5 w-5" />,
    content: {
      sections: [
        {
          title: "Introduction to Medical Transportation",
          content: `
            <p>Medical transportation is a critical service that helps patients access healthcare services when they cannot transport themselves due to medical conditions, disabilities, or lack of transportation options.</p>
            
            <p>As a medical transportation driver, you play a vital role in the healthcare system by ensuring patients can attend their appointments safely and on time.</p>
            
            <h3 class="text-lg font-medium mt-4 mb-2">Your Responsibilities Include:</h3>
            <ul class="list-disc pl-5 space-y-1">
              <li>Providing safe, reliable transportation for patients</li>
              <li>Assisting patients with entering and exiting the vehicle</li>
              <li>Ensuring patient comfort throughout the journey</li>
              <li>Maintaining patient dignity and respecting privacy</li>
              <li>Following all healthcare and transportation regulations</li>
            </ul>
          `,
          videoUrl: "https://www.youtube.com/embed/sample-video-1"
        },
        {
          title: "Patient Communication",
          content: `
            <p>Effective communication is essential when working with patients who may have various healthcare needs and concerns.</p>
            
            <h3 class="text-lg font-medium mt-4 mb-2">Key Communication Guidelines:</h3>
            <ul class="list-disc pl-5 space-y-1">
              <li>Speak clearly and at an appropriate volume</li>
              <li>Use respectful language and address patients by their preferred name</li>
              <li>Listen attentively to patient needs and concerns</li>
              <li>Ask permission before providing physical assistance</li>
              <li>Explain procedures before you do them (e.g., "I'm going to help you into the vehicle now")</li>
              <li>Be patient and allow extra time for responses when needed</li>
            </ul>
            
            <p class="mt-4">Remember that many patients may be experiencing stress, anxiety, or pain. Your calm, professional demeanor can significantly impact their experience.</p>
          `,
        },
        {
          title: "Patient Safety During Transport",
          content: `
            <p>Ensuring patient safety throughout transportation is your highest priority.</p>
            
            <h3 class="text-lg font-medium mt-4 mb-2">Safety Protocols:</h3>
            <ul class="list-disc pl-5 space-y-1">
              <li>Always secure wheelchair locks, safety belts, and other restraints</li>
              <li>Drive smoothly, avoiding sudden starts, stops, or sharp turns</li>
              <li>Maintain appropriate temperature in the vehicle</li>
              <li>Keep pathways clear of obstacles during patient transfers</li>
              <li>Know the location of healthcare facilities and emergency routes</li>
              <li>Have emergency contact information readily available</li>
            </ul>
            
            <p class="mt-4">In case of medical emergency during transport:</p>
            <ol class="list-decimal pl-5 space-y-1">
              <li>Pull over safely and assess the situation</li>
              <li>Call 911 if appropriate</li>
              <li>Notify your dispatcher</li>
              <li>Remain with the patient until help arrives</li>
              <li>Document the incident thoroughly after it is resolved</li>
            </ol>
          `,
        }
      ]
    },
    quiz: {
      questions: [
        {
          id: "pc-q1",
          question: "What should you do when assisting a patient into your vehicle?",
          options: [
            { id: "pc-q1-a", text: "Rush to save time", isCorrect: false },
            { id: "pc-q1-b", text: "Ask permission and explain what you're going to do", isCorrect: true },
            { id: "pc-q1-c", text: "Avoid talking to minimize stress", isCorrect: false },
            { id: "pc-q1-d", text: "Tell the patient to hurry up", isCorrect: false }
          ]
        },
        {
          id: "pc-q2",
          question: "In case of a medical emergency during transport, what is the first action you should take?",
          options: [
            { id: "pc-q2-a", text: "Call the patient's doctor", isCorrect: false },
            { id: "pc-q2-b", text: "Continue to the destination faster", isCorrect: false },
            { id: "pc-q2-c", text: "Pull over safely and assess the situation", isCorrect: true },
            { id: "pc-q2-d", text: "Ask the patient what to do", isCorrect: false }
          ]
        },
        {
          id: "pc-q3",
          question: "Which of the following is a key responsibility of a medical transportation driver?",
          options: [
            { id: "pc-q3-a", text: "Providing medical advice", isCorrect: false },
            { id: "pc-q3-b", text: "Maintaining patient dignity and privacy", isCorrect: true },
            { id: "pc-q3-c", text: "Adjusting patient medications", isCorrect: false },
            { id: "pc-q3-d", text: "Diagnosing medical conditions", isCorrect: false }
          ]
        }
      ]
    }
  },
  {
    id: "accessibility",
    title: "Accessibility & Equipment",
    description: "Learn to properly use and maintain accessibility equipment for patient safety",
    duration: "25 minutes",
    icon: <Accessibility className="h-5 w-5" />,
    content: {
      sections: [
        {
          title: "Understanding Mobility Equipment",
          content: `
            <p>As a medical transportation driver, you'll encounter various types of mobility equipment. Understanding how to properly handle this equipment is essential for patient safety and comfort.</p>
            
            <h3 class="text-lg font-medium mt-4 mb-2">Common Types of Mobility Equipment:</h3>
            <ul class="list-disc pl-5 space-y-2">
              <li>
                <strong>Wheelchairs:</strong> 
                <ul class="list-circle pl-5 mt-1 space-y-1">
                  <li>Manual wheelchairs (self-propelled or attendant-propelled)</li>
                  <li>Electric/powered wheelchairs</li>
                  <li>Transport wheelchairs (compact, typically with smaller wheels)</li>
                </ul>
              </li>
              <li>
                <strong>Walkers:</strong>
                <ul class="list-circle pl-5 mt-1 space-y-1">
                  <li>Standard walkers</li>
                  <li>Two-wheeled walkers</li>
                  <li>Four-wheeled walkers (rollators)</li>
                </ul>
              </li>
              <li>
                <strong>Canes:</strong>
                <ul class="list-circle pl-5 mt-1 space-y-1">
                  <li>Standard single-point canes</li>
                  <li>Quad canes (four-point base)</li>
                  <li>Forearm crutches</li>
                </ul>
              </li>
              <li>
                <strong>Other Equipment:</strong>
                <ul class="list-circle pl-5 mt-1 space-y-1">
                  <li>Oxygen tanks and portable concentrators</li>
                  <li>Transfer boards</li>
                  <li>Gait belts</li>
                </ul>
              </li>
            </ul>
          `,
          videoUrl: "https://www.youtube.com/embed/sample-video-2"
        },
        {
          title: "Proper Handling of Wheelchairs",
          content: `
            <p>Wheelchairs require specific handling techniques to ensure patient safety and prevent equipment damage.</p>
            
            <h3 class="text-lg font-medium mt-4 mb-2">Wheelchair Handling Guidelines:</h3>
            <ol class="list-decimal pl-5 space-y-2">
              <li>Always engage the brakes when the wheelchair is stationary</li>
              <li>Remove or swing away footrests when transferring patients</li>
              <li>Use proper body mechanics when pushing or lifting (bend knees, not back)</li>
              <li>Move backward down ramps and curbs to prevent tipping</li>
              <li>Secure wheelchairs properly in the vehicle using appropriate restraints</li>
              <li>Never lift a wheelchair with a patient in it unless you have proper training and assistance</li>
            </ol>
            
            <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4">
              <p class="text-yellow-700">
                <strong>Important Safety Note:</strong> Always check that the wheelchair is fully unfolded and locked in the open position before a patient sits down. Listen for the audible "click" that indicates the chair is secure.
              </p>
            </div>
          `,
        },
        {
          title: "Vehicle Accessibility Features",
          content: `
            <p>Modern medical transportation vehicles have various accessibility features designed to safely transport patients with different mobility needs.</p>
            
            <h3 class="text-lg font-medium mt-4 mb-2">Key Vehicle Features and Their Use:</h3>
            <ul class="list-disc pl-5 space-y-2">
              <li>
                <strong>Wheelchair Lifts and Ramps:</strong>
                <ul class="list-circle pl-5 mt-1 space-y-1">
                  <li>Inspect for proper operation before each use</li>
                  <li>Keep the platform clear of obstacles</li>
                  <li>Follow weight limit guidelines</li>
                  <li>Use guards and barriers as designed</li>
                </ul>
              </li>
              <li>
                <strong>Wheelchair Securement Systems:</strong>
                <ul class="list-circle pl-5 mt-1 space-y-1">
                  <li>Use all four securement straps as designed</li>
                  <li>Attach to solid frame components of the wheelchair</li>
                  <li>Ensure proper tension on all straps</li>
                  <li>Use both lap and shoulder belts for the passenger</li>
                </ul>
              </li>
              <li>
                <strong>Oxygen Tank Holders:</strong>
                <ul class="list-circle pl-5 mt-1 space-y-1">
                  <li>Secure tanks in designated holders only</li>
                  <li>Keep tanks upright</li>
                  <li>Ensure valves are protected from impact</li>
                </ul>
              </li>
            </ul>
            
            <h3 class="text-lg font-medium mt-4 mb-2">Daily Equipment Inspection:</h3>
            <p>Before each shift, check that all accessibility equipment is:</p>
            <ul class="list-disc pl-5 space-y-1">
              <li>Clean and disinfected</li>
              <li>In good working condition</li>
              <li>Free from damage or excessive wear</li>
              <li>Properly stowed when not in use</li>
            </ul>
            
            <p class="mt-4">Report any equipment issues immediately and do not use damaged equipment.</p>
          `,
        }
      ]
    },
    quiz: {
      questions: [
        {
          id: "acc-q1",
          question: "When moving a patient in a wheelchair down a ramp, you should:",
          options: [
            { id: "acc-q1-a", text: "Go forward quickly to maintain momentum", isCorrect: false },
            { id: "acc-q1-b", text: "Push the wheelchair sideways", isCorrect: false },
            { id: "acc-q1-c", text: "Move backward down the ramp to prevent tipping", isCorrect: true },
            { id: "acc-q1-d", text: "Let the wheelchair roll down on its own", isCorrect: false }
          ]
        },
        {
          id: "acc-q2",
          question: "When securing a wheelchair in a vehicle, how many securement straps should typically be used?",
          options: [
            { id: "acc-q2-a", text: "Two straps", isCorrect: false },
            { id: "acc-q2-b", text: "Four straps", isCorrect: true },
            { id: "acc-q2-c", text: "One strap", isCorrect: false },
            { id: "acc-q2-d", text: "Three straps", isCorrect: false }
          ]
        },
        {
          id: "acc-q3",
          question: "Before allowing a patient to sit in a wheelchair, you should always:",
          options: [
            { id: "acc-q3-a", text: "Clean the wheelchair with disinfectant", isCorrect: false },
            { id: "acc-q3-b", text: "Check that it's fully unfolded and locked in position", isCorrect: true },
            { id: "acc-q3-c", text: "Remove the footrests completely", isCorrect: false },
            { id: "acc-q3-d", text: "Adjust the height of the seat", isCorrect: false }
          ]
        }
      ]
    }
  },
  {
    id: "driving-safety",
    title: "Specialized Driving Techniques",
    description: "Learn safe driving techniques specific to medical transportation",
    duration: "30 minutes",
    icon: <Car className="h-5 w-5" />,
    content: {
      sections: [
        {
          title: "Introduction to Medical Transportation Driving",
          content: `
            <p>Driving a medical transportation vehicle requires specialized skills beyond standard driving. Patients may have conditions that make them sensitive to vehicle movement, and you are responsible for their safety and comfort.</p>
            
            <h3 class="text-lg font-medium mt-4 mb-2">Key Differences in Medical Transportation Driving:</h3>
            <ul class="list-disc pl-5 space-y-1">
              <li>Smoother acceleration and deceleration</li>
              <li>More gradual turns</li>
              <li>Enhanced awareness of passenger comfort</li>
              <li>Special consideration for medical equipment</li>
              <li>Additional safety checks and protocols</li>
            </ul>
            
            <p class="mt-4">Remember: Your driving directly affects your patients' physical comfort and can impact their medical condition.</p>
          `,
          videoUrl: "https://www.youtube.com/embed/sample-video-3"
        },
        {
          title: "Defensive Driving for Patient Transport",
          content: `
            <p>Defensive driving takes on greater importance when transporting patients who may be physically vulnerable.</p>
            
            <h3 class="text-lg font-medium mt-4 mb-2">Defensive Driving Principles:</h3>
            <ol class="list-decimal pl-5 space-y-1">
              <li>Maintain a 3-4 second following distance (more in adverse conditions)</li>
              <li>Continuously scan the road environment (near, middle, far)</li>
              <li>Anticipate potential hazards and have an escape plan</li>
              <li>Avoid distractions completely</li>
              <li>Adjust driving to weather and road conditions</li>
              <li>Signal intentions well in advance</li>
            </ol>
            
            <div class="bg-blue-50 border-l-4 border-blue-400 p-4 my-4">
              <p class="text-blue-700">
                <strong>Professional Tip:</strong> Mentally narrate your driving environment as you go. This helps maintain focus and ensures you're actively scanning for hazards.
              </p>
            </div>
            
            <h3 class="text-lg font-medium mt-4 mb-2">Common Hazards to Watch For:</h3>
            <ul class="list-disc pl-5 space-y-1">
              <li>Distracted pedestrians near medical facilities</li>
              <li>Other vehicles stopping suddenly at hospitals or clinics</li>
              <li>Emergency vehicles that may require you to yield</li>
              <li>Congested parking areas with limited visibility</li>
              <li>Construction zones common around expanding medical facilities</li>
            </ul>
          `,
        },
        {
          title: "Patient Comfort While Driving",
          content: `
            <p>Many patients have conditions that make them especially sensitive to vehicle motion, temperature, or other environmental factors.</p>
            
            <h3 class="text-lg font-medium mt-4 mb-2">Techniques for Patient Comfort:</h3>
            <ul class="list-disc pl-5 space-y-2">
              <li>
                <strong>Smooth Driving Techniques:</strong>
                <ul class="list-circle pl-5 mt-1 space-y-1">
                  <li>Accelerate and brake gradually</li>
                  <li>Take turns at reduced speed</li>
                  <li>Avoid sudden lane changes</li>
                  <li>Anticipate stops early to allow gentle deceleration</li>
                  <li>Plan routes to avoid excessive stopping and starting</li>
                </ul>
              </li>
              <li>
                <strong>Road Selection:</strong>
                <ul class="list-circle pl-5 mt-1 space-y-1">
                  <li>Choose well-maintained roads when possible</li>
                  <li>Avoid roads with excessive bumps or potholes</li>
                  <li>Consider using highways for longer, smoother rides when appropriate</li>
                </ul>
              </li>
              <li>
                <strong>Environmental Controls:</strong>
                <ul class="list-circle pl-5 mt-1 space-y-1">
                  <li>Maintain appropriate temperature (usually 68-72°F)</li>
                  <li>Ask patients about their temperature preference</li>
                  <li>Ensure good ventilation without direct drafts on patients</li>
                  <li>Minimize strong odors (no air fresheners or perfumes)</li>
                </ul>
              </li>
            </ul>
            
            <p class="mt-4">Always ask patients about their comfort and make adjustments as needed and as safely possible.</p>
          `,
        }
      ]
    },
    quiz: {
      questions: [
        {
          id: "ds-q1",
          question: "When driving with a patient who has mobility issues, you should:",
          options: [
            { id: "ds-q1-a", text: "Drive exactly as you normally would", isCorrect: false },
            { id: "ds-q1-b", text: "Drive slowly at all times, even on highways", isCorrect: false },
            { id: "ds-q1-c", text: "Make gradual, smooth accelerations and decelerations", isCorrect: true },
            { id: "ds-q1-d", text: "Speed up quickly but brake very gradually", isCorrect: false }
          ]
        },
        {
          id: "ds-q2",
          question: "What is a recommended following distance when driving a medical transportation vehicle?",
          options: [
            { id: "ds-q2-a", text: "1-2 seconds", isCorrect: false },
            { id: "ds-q2-b", text: "3-4 seconds", isCorrect: true },
            { id: "ds-q2-c", text: "5-6 seconds in all conditions", isCorrect: false },
            { id: "ds-q2-d", text: "As close as possible to see traffic ahead", isCorrect: false }
          ]
        },
        {
          id: "ds-q3",
          question: "What should you do if a patient reports feeling too warm during transport?",
          options: [
            { id: "ds-q3-a", text: "Tell them to wait until reaching the destination", isCorrect: false },
            { id: "ds-q3-b", text: "Open all windows immediately", isCorrect: false },
            { id: "ds-q3-c", text: "Adjust the temperature to their comfort when safe to do so", isCorrect: true },
            { id: "ds-q3-d", text: "Explain that the temperature is standardized and cannot be changed", isCorrect: false }
          ]
        }
      ]
    }
  },
  {
    id: "billing-regulations",
    title: "Billing & Regulations",
    description: "Understand billing procedures and regulatory compliance requirements",
    duration: "15 minutes",
    icon: <BadgeDollarSign className="h-5 w-5" />,
    content: {
      sections: [
        {
          title: "Understanding Medical Transportation Regulations",
          content: `
            <p>Non-emergency medical transportation is subject to various regulations at the federal, state, and local levels. Understanding these regulations is critical to providing compliant services.</p>
            
            <h3 class="text-lg font-medium mt-4 mb-2">Key Regulatory Areas:</h3>
            <ul class="list-disc pl-5 space-y-1">
              <li>Driver qualifications and training requirements</li>
              <li>Vehicle safety standards and inspections</li>
              <li>Insurance coverage requirements</li>
              <li>Patient privacy regulations (HIPAA)</li>
              <li>Medicaid/Medicare transportation requirements (if applicable)</li>
              <li>Documentation and record-keeping requirements</li>
            </ul>
            
            <p class="mt-4">Compliance with these regulations is not just a legal requirement but also ensures the safety and quality of your service.</p>
          `,
        },
        {
          title: "Proper Documentation Practices",
          content: `
            <p>Accurate documentation is essential for regulatory compliance, billing, and quality service.</p>
            
            <h3 class="text-lg font-medium mt-4 mb-2">Required Documentation:</h3>
            <ol class="list-decimal pl-5 space-y-1">
              <li>Trip logs with pick-up and drop-off times and locations</li>
              <li>Mileage records</li>
              <li>Patient signature verifying service</li>
              <li>Any special assistance or equipment used</li>
              <li>Incidents or unusual occurrences during transport</li>
              <li>Vehicle inspection records</li>
            </ol>
            
            <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4">
              <p class="text-yellow-700">
                <strong>Important:</strong> Always document at the time of service, not later. This ensures accuracy and completeness.
              </p>
            </div>
            
            <p class="mt-4">The MyAmbulex platform will guide you through documentation requirements for each ride, but understanding what information is needed and why will help you provide complete records efficiently.</p>
          `,
        },
        {
          title: "Understanding Billing and Payment",
          content: `
            <p>Clear understanding of billing procedures helps provide transparent service to patients and ensures you receive proper compensation.</p>
            
            <h3 class="text-lg font-medium mt-4 mb-2">MyAmbulex Bidding and Billing Process:</h3>
            <ul class="list-disc pl-5 space-y-1">
              <li>Ride requests will include details about distance, special requirements, and timeframe</li>
              <li>You may submit bids based on these factors and your availability</li>
              <li>Standard rates vary based on distance, time, and services provided</li>
              <li>Additional charges may apply for wait time, extra assistance, or after-hours service</li>
              <li>Payment is processed through the MyAmbulex platform after service completion</li>
              <li>Any disputes are handled through the designated resolution process</li>
            </ul>
            
            <h3 class="text-lg font-medium mt-4 mb-2">Transparency with Patients:</h3>
            <p>Always be transparent about charges. The fare should be clear before the trip begins, and patients should be notified of any potential additional charges.</p>
          `,
        }
      ]
    },
    quiz: {
      questions: [
        {
          id: "br-q1",
          question: "Which of the following should be included in your trip documentation?",
          options: [
            { id: "br-q1-a", text: "The patient's medical diagnosis", isCorrect: false },
            { id: "br-q1-b", text: "Pick-up and drop-off times and locations", isCorrect: true },
            { id: "br-q1-c", text: "The patient's insurance ID number", isCorrect: false },
            { id: "br-q1-d", text: "The patient's medication list", isCorrect: false }
          ]
        },
        {
          id: "br-q2",
          question: "When should you document information about a completed ride?",
          options: [
            { id: "br-q2-a", text: "At the end of your shift", isCorrect: false },
            { id: "br-q2-b", text: "Within 24 hours", isCorrect: false },
            { id: "br-q2-c", text: "At the time of service", isCorrect: true },
            { id: "br-q2-d", text: "During the weekly report submission", isCorrect: false }
          ]
        },
        {
          id: "br-q3",
          question: "What should you do if a patient asks about the cost of additional services during a ride?",
          options: [
            { id: "br-q3-a", text: "Provide clear information about any additional charges", isCorrect: true },
            { id: "br-q3-b", text: "Tell them to check the app", isCorrect: false },
            { id: "br-q3-c", text: "Explain that prices are determined later", isCorrect: false },
            { id: "br-q3-d", text: "Provide the service and let billing handle the charges", isCorrect: false }
          ]
        }
      ]
    }
  }
];

interface TrainingModulesProps {
  registrationProgress: any;
  forceRefresh: () => void;
}

const TrainingModules: React.FC<TrainingModulesProps> = ({ 
  registrationProgress, 
  forceRefresh 
}) => {
  const { toast } = useToast();
  const [activeModule, setActiveModule] = useState<TrainingModule | null>(null);
  const [activeSection, setActiveSection] = useState(0);
  const [quizActive, setQuizActive] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizPassed, setQuizPassed] = useState(false);

  // Enhance training modules with completion status from registration progress
  const enhancedModules = trainingModules.map(module => ({
    ...module,
    isCompleted: registrationProgress?.completedTrainingModules?.includes(module.id) || false
  }));

  // Calculate training progress
  const totalModules = enhancedModules.length;
  const completedModules = enhancedModules.filter(module => module.isCompleted).length;
  const trainingProgress = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

  // Module completion mutation
  const completeModuleMutation = useMutation({
    mutationFn: async (moduleId: string) => {
      const response = await fetch("/api/drivers/complete-training-module", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ moduleId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to mark module as completed");
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Module completed",
        description: "Training module marked as completed",
      });
      
      // Reset quiz state
      setQuizActive(false);
      setQuizAnswers({});
      setQuizSubmitted(false);
      setQuizPassed(false);
      
      // Close the module view
      setActiveModule(null);
      
      // Refresh registration progress
      queryClient.invalidateQueries({ queryKey: ["/api/drivers/registration-progress"] });
      forceRefresh();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark module as completed",
        variant: "destructive",
      });
    },
  });

  // Handle starting a module
  const handleStartModule = (module: TrainingModule) => {
    setActiveModule(module);
    setActiveSection(0);
    setQuizActive(false);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizPassed(false);
  };

  // Handle quiz selection
  const handleQuizSelection = (questionId: string, optionId: string) => {
    setQuizAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  // Handle quiz submission
  const handleQuizSubmit = () => {
    if (!activeModule) return;
    
    // Check if all questions are answered
    const allQuestionsAnswered = activeModule.quiz.questions.every(
      question => quizAnswers[question.id]
    );
    
    if (!allQuestionsAnswered) {
      toast({
        title: "Incomplete quiz",
        description: "Please answer all questions before submitting",
        variant: "destructive",
      });
      return;
    }
    
    // Calculate score
    let correctAnswers = 0;
    
    activeModule.quiz.questions.forEach(question => {
      const selectedOption = question.options.find(
        option => option.id === quizAnswers[question.id]
      );
      
      if (selectedOption?.isCorrect) {
        correctAnswers++;
      }
    });
    
    const scorePercentage = (correctAnswers / activeModule.quiz.questions.length) * 100;
    const passed = scorePercentage >= 70; // 70% passing threshold
    
    setQuizSubmitted(true);
    setQuizPassed(passed);
    
    if (passed) {
      // Mark module as completed
      completeModuleMutation.mutate(activeModule.id);
    } else {
      toast({
        title: "Quiz not passed",
        description: "Please review the content and try again",
        variant: "destructive",
      });
    }
  };

  // Handle retry quiz
  const handleRetryQuiz = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizPassed(false);
  };

  // Check if a question is correctly answered
  const isAnswerCorrect = (questionId: string, optionId: string) => {
    if (!activeModule || !quizSubmitted) return false;
    
    const question = activeModule.quiz.questions.find(q => q.id === questionId);
    if (!question) return false;
    
    const option = question.options.find(o => o.id === optionId);
    return option?.isCorrect || false;
  };

  // Check if a specific answer was selected
  const isAnswerSelected = (questionId: string, optionId: string) => {
    return quizAnswers[questionId] === optionId;
  };

  return (
    <div className="space-y-6">
      {!activeModule ? (
        <>
          <div className="mb-4">
            <h2 className="text-2xl font-bold">Training Modules</h2>
            <p className="text-muted-foreground">
              Complete all required training to provide safe, high-quality service
            </p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Training Progress</CardTitle>
                <span className="text-sm font-medium">{trainingProgress}%</span>
              </div>
              <Progress value={trainingProgress} className="h-2" />
            </CardHeader>
            <CardContent className="grid gap-4">
              {enhancedModules.map((module) => (
                <div
                  key={module.id}
                  className="border rounded-lg p-4 relative hover:border-primary/50 transition-colors"
                >
                  <div className="flex justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="bg-primary/10 p-2 rounded-full mt-1">
                        {module.icon}
                      </div>
                      <div>
                        <h3 className="font-medium">{module.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {module.description}
                        </p>
                        <div className="flex items-center space-x-3 mt-2">
                          <Badge variant="outline" className="flex items-center space-x-1">
                            <Clock className="h-3 w-3 mr-1" />
                            {module.duration}
                          </Badge>
                          {module.isCompleted ? (
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                              <BookOpen className="h-3 w-3 mr-1" />
                              Optional
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <Button 
                        onClick={() => handleStartModule(module)}
                        variant={module.isCompleted ? "ghost" : "default"}
                        size="sm"
                      >
                        {module.isCompleted ? (
                          <>
                            <Award className="mr-2 h-4 w-4" />
                            Review
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            Start
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : (
        // Module view
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveModule(null)}
              >
                Back to Modules
              </Button>
              <span className="text-muted-foreground">|</span>
              <h2 className="text-xl font-bold">{activeModule.title}</h2>
            </div>
            <Badge variant="outline" className="flex items-center space-x-1">
              <Clock className="h-3 w-3 mr-1" />
              {activeModule.duration}
            </Badge>
          </div>

          <Separator />

          {!quizActive ? (
            <div className="grid grid-cols-12 gap-6">
              {/* Section navigation */}
              <div className="col-span-3">
                <div className="border rounded-lg">
                  <div className="p-3 border-b bg-muted/30">
                    <h3 className="font-medium">Content</h3>
                  </div>
                  <div className="p-1">
                    {activeModule.content.sections.map((section, index) => (
                      <button
                        key={index}
                        className={`w-full text-left p-2 rounded-md text-sm ${
                          activeSection === index
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => setActiveSection(index)}
                      >
                        {section.title}
                      </button>
                    ))}
                    <button
                      className={`w-full text-left p-2 rounded-md text-sm flex items-center space-x-2 ${
                        quizActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"
                      }`}
                      onClick={() => setQuizActive(true)}
                    >
                      <FileText className="h-4 w-4" />
                      <span>Knowledge Check</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Content area */}
              <div className="col-span-9">
                <Card>
                  <CardHeader>
                    <CardTitle>{activeModule.content.sections[activeSection].title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose max-w-none">
                      <div
                        dangerouslySetInnerHTML={{
                          __html: activeModule.content.sections[activeSection].content,
                        }}
                      />
                    </div>

                    {activeModule.content.sections[activeSection].videoUrl && (
                      <div className="mt-6 border rounded-lg overflow-hidden">
                        <div className="aspect-video">
                          <iframe
                            width="100%"
                            height="100%"
                            src={activeModule.content.sections[activeSection].videoUrl}
                            title="Training Video"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="border-0"
                          ></iframe>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex justify-between mt-4">
                  <Button
                    variant="outline"
                    disabled={activeSection === 0}
                    onClick={() => setActiveSection(activeSection - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    disabled={activeSection === activeModule.content.sections.length - 1}
                    onClick={() => setActiveSection(activeSection + 1)}
                  >
                    Next
                  </Button>
                </div>

                {activeSection === activeModule.content.sections.length - 1 && (
                  <div className="mt-6 flex justify-center">
                    <Button 
                      size="lg" 
                      onClick={() => setQuizActive(true)}
                      className="px-8"
                    >
                      Take Knowledge Check
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Quiz view
            <div className="grid grid-cols-12 gap-6">
              {/* Section navigation */}
              <div className="col-span-3">
                <div className="border rounded-lg">
                  <div className="p-3 border-b bg-muted/30">
                    <h3 className="font-medium">Content</h3>
                  </div>
                  <div className="p-1">
                    {activeModule.content.sections.map((section, index) => (
                      <button
                        key={index}
                        className={`w-full text-left p-2 rounded-md text-sm ${
                          activeSection === index && !quizActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => {
                          setActiveSection(index);
                          setQuizActive(false);
                        }}
                      >
                        {section.title}
                      </button>
                    ))}
                    <button
                      className={`w-full text-left p-2 rounded-md text-sm flex items-center space-x-2 ${
                        quizActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"
                      }`}
                      onClick={() => setQuizActive(true)}
                    >
                      <FileText className="h-4 w-4" />
                      <span>Knowledge Check</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Quiz area */}
              <div className="col-span-9">
                <Card>
                  <CardHeader>
                    <CardTitle>Knowledge Check: {activeModule.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Complete this quiz to demonstrate your understanding of the material.
                      A score of 70% or higher is required to pass.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {activeModule.quiz.questions.map((question, questionIndex) => (
                        <div 
                          key={question.id} 
                          className={`p-4 border rounded-lg ${
                            quizSubmitted && !isAnswerCorrect(question.id, quizAnswers[question.id])
                              ? "border-red-300 bg-red-50"
                              : quizSubmitted
                              ? "border-green-300 bg-green-50"
                              : ""
                          }`}
                        >
                          <div className="flex items-start space-x-2">
                            <span className="bg-primary/10 text-primary font-medium px-2 py-1 rounded text-sm">
                              Q{questionIndex + 1}
                            </span>
                            <div className="flex-1">
                              <p className="font-medium mb-3">{question.question}</p>
                              <div className="space-y-2">
                                {question.options.map((option) => (
                                  <div
                                    key={option.id}
                                    className={`flex items-center space-x-2 p-3 border rounded-md cursor-pointer ${
                                      isAnswerSelected(question.id, option.id)
                                        ? quizSubmitted
                                          ? isAnswerCorrect(question.id, option.id)
                                            ? "border-green-500 bg-green-50"
                                            : "border-red-500 bg-red-50"
                                          : "border-primary bg-primary/5"
                                        : quizSubmitted && option.isCorrect
                                        ? "border-green-500 bg-green-50"
                                        : ""
                                    }`}
                                    onClick={() => {
                                      if (!quizSubmitted) {
                                        handleQuizSelection(question.id, option.id);
                                      }
                                    }}
                                  >
                                    <div
                                      className={`w-5 h-5 flex items-center justify-center rounded-full border ${
                                        isAnswerSelected(question.id, option.id)
                                          ? quizSubmitted
                                            ? isAnswerCorrect(question.id, option.id)
                                              ? "border-green-500 bg-green-500 text-white"
                                              : "border-red-500 bg-red-500 text-white"
                                            : "border-primary bg-primary text-white"
                                          : quizSubmitted && option.isCorrect
                                          ? "border-green-500 bg-green-500 text-white"
                                          : "border-muted-foreground"
                                      }`}
                                    >
                                      {isAnswerSelected(question.id, option.id) ? (
                                        quizSubmitted ? (
                                          isAnswerCorrect(question.id, option.id) ? (
                                            <CheckCircle2 className="h-3 w-3" />
                                          ) : (
                                            <AlertCircle className="h-3 w-3" />
                                          )
                                        ) : (
                                          <CheckCircle2 className="h-3 w-3" />
                                        )
                                      ) : quizSubmitted && option.isCorrect ? (
                                        <CheckCircle2 className="h-3 w-3" />
                                      ) : null}
                                    </div>
                                    <span>{option.text}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-center mt-6">
                  {!quizSubmitted ? (
                    <Button 
                      size="lg" 
                      onClick={handleQuizSubmit}
                      className="px-8"
                      disabled={
                        completeModuleMutation.isPending ||
                        Object.keys(quizAnswers).length < activeModule.quiz.questions.length
                      }
                    >
                      {completeModuleMutation.isPending ? (
                        <>
                          <div className="animate-spin mr-2">
                            <Clock className="h-4 w-4" />
                          </div>
                          Submitting...
                        </>
                      ) : (
                        "Submit Answers"
                      )}
                    </Button>
                  ) : quizPassed ? (
                    <div className="text-center">
                      <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600">
                        <CheckCircle2 className="h-8 w-8" />
                      </div>
                      <h3 className="text-xl font-bold text-green-600 mb-2">
                        Quiz Passed!
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        You've successfully completed this training module.
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => setActiveModule(null)}
                      >
                        Return to Training Modules
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600">
                        <AlertCircle className="h-8 w-8" />
                      </div>
                      <h3 className="text-xl font-bold text-red-600 mb-2">
                        Quiz Not Passed
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Please review the content and try again. A score of 70% or higher is required.
                      </p>
                      <div className="flex gap-3 justify-center">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setQuizActive(false);
                            setActiveSection(0);
                          }}
                        >
                          Review Content
                        </Button>
                        <Button onClick={handleRetryQuiz}>
                          Try Again
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrainingModules;