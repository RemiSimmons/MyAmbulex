# Medical Transportation Platform - Design Guidelines

## Design Approach: Material Design System with Healthcare Trust

**Rationale**: Medical transportation demands reliability, accessibility, and clear information hierarchy. Material Design provides excellent form components, accessibility features, and professional structure while allowing customization for healthcare context.

**References**: Uber Health for transportation UX patterns, Material Design for component foundation, healthcare portal aesthetics for trust-building.

**Key Principles**: 
- Clarity over decoration
- Trust through professionalism  
- Mobile-first accessibility
- Efficient task completion

---

## Typography System

**Font Family**: Inter (Google Fonts) - excellent readability, professional, healthcare-appropriate

**Hierarchy**:
- H1: 2.5rem (40px), font-weight 700 - Hero headlines
- H2: 2rem (32px), font-weight 600 - Page titles  
- H3: 1.5rem (24px), font-weight 600 - Section headers
- H4: 1.25rem (20px), font-weight 500 - Card titles
- Body: 1rem (16px), font-weight 400 - General content
- Small: 0.875rem (14px), font-weight 400 - Helper text, labels
- Button: 1rem (16px), font-weight 500 - CTAs

---

## Layout & Spacing System

**Tailwind Units**: Consistently use 4, 6, 8, 12, 16, 20, 24 for spacing
- Component padding: p-6 (forms), p-8 (cards)
- Section spacing: py-16 (desktop), py-12 (mobile)
- Element gaps: gap-4 (form fields), gap-6 (cards), gap-8 (sections)

**Container Strategy**:
- Max-width: max-w-7xl for full sections, max-w-md for login forms
- Grid: 12-column responsive grid for dashboard layouts

---

## Core Components

### Login/Sign-up Page

**Layout**: Centered card (max-w-md) on clean background, split-screen option for desktop with image showcase

**Google Sign-In Button**:
- Official Google branding: White background, Google logo left-aligned, "Sign in with Google" text
- Dimensions: Full-width, h-12, rounded-lg
- Border: 1px solid subtle gray
- Position: Prominent placement ABOVE traditional login form
- Spacing: mb-6 separation from divider

**Divider**: "OR" text centered with horizontal lines (common OAuth pattern)

**Email/Password Form**:
- Input fields: h-12, rounded-lg, clear labels (text-sm, mb-2)
- Password field: Right-aligned eye icon toggle for visibility (show/hide)
- Inputs have focus states with border emphasis
- Spacing: gap-4 between fields

**CTA Button**: 
- Primary action, full-width, h-12, rounded-lg
- Text: "Sign In" or "Create Account"
- Positioned below form fields

**Footer Links**: "Forgot password?" and "Need an account?" links in small text, subtle color

### Landing Page Structure

**Hero Section** (h-screen on desktop, h-auto mobile):
- Large hero image: Professional medical transport vehicle with patient/caregiver (conveys trust and service)
- Overlay: Subtle dark gradient for text readability
- Headline: Large, bold value proposition "Safe, Reliable Medical Transportation"
- Subheadline: Supporting benefit statement
- Dual CTAs: Primary "Book a Ride" + Secondary "Learn More" with blurred backgrounds (backdrop-blur-md, semi-transparent white/dark)
- No hover states on hero CTAs

**Trust Indicators** (py-12):
- Single row: Certifications, partnerships, years of service
- Grid: grid-cols-3 md:grid-cols-6

**Features Grid** (py-20):
- 3-column layout (grid-cols-1 md:grid-cols-3)
- Each card: Icon (top), title (h4), description (body text)
- Icons from Material Icons library
- Features: "24/7 Availability", "Professional Drivers", "Insurance Verified", "Real-time Tracking", "Wheelchair Accessible", "Medical Equipment Ready"

**How It Works** (py-20):
- 4-step process, numbered cards in grid-cols-1 md:grid-cols-4
- Progressive flow visualization

**Social Proof** (py-16):
- Testimonial cards: 2-column grid (grid-cols-1 md:grid-cols-2)
- Include patient/caregiver photos, names, quote, star ratings

**CTA Section** (py-24):
- Centered content with supporting text
- Primary CTA button
- Secondary contact information

**Footer** (py-12):
- Multi-column: Services, Company, Legal, Contact
- Newsletter signup included
- Trust badges: HIPAA compliant, insurance partners
- Social media links

### Dashboard Components

**Navigation**: Top app bar with logo, user menu, notifications
**Booking Card**: Prominent, clear form sections with date/time pickers, address inputs
**Ride Status Cards**: Visual timeline showing pickup → in-transit → completed
**Quick Actions**: Icon buttons for repeat rides, saved addresses

---

## Images

**Hero Image**: 
- Description: Professional medical transport van with caregiver assisting patient, daylight setting, welcoming atmosphere
- Placement: Full-width background spanning hero section
- Treatment: Subtle dark overlay (opacity 40%) for text legibility

**Feature Section Images**: 
- Optional supporting imagery showing: fleet vehicles, driver with patient interaction, accessible features
- If used: grid-cols-2 layout alternating with text content

**Testimonial Photos**:
- Circular headshots (w-16 h-16) of patients/caregivers
- Authentic, diverse representation

---

## Mobile Optimizations

- Single-column layouts (grid-cols-1) below md breakpoint
- Touch-friendly targets: Minimum 44px tap areas
- Simplified navigation: Hamburger menu
- Stacked hero content with reduced height
- Form inputs: Large, easy-to-tap
- Google button maintains full-width prominence