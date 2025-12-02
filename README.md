# MyAmbulex - Medical Transportation Bidding Platform

A modern, full-featured medical transportation platform that connects riders with qualified drivers through a competitive bidding system. MyAmbulex revolutionizes Non-Emergency Medical Transportation (NEMT) with real-time tracking, secure payments, and comprehensive PWA capabilities.

## Features

### 🚑 Core Ride Management
- **Competitive Bidding System**: Drivers submit bids for medical transport requests
- **Real-Time Tracking**: Live GPS tracking during rides
- **Multi-Step Booking**: Intuitive appointment scheduling with automatic expiration
- **Recurring Appointments**: Schedule regular medical transportation
- **Round-Trip Support**: Seamless return journey management
- **Urgent Ride Alerts**: Priority notifications for time-sensitive requests

### 👥 Multi-Role System
- **Riders**: Book medical transportation with ease
- **Drivers**: Accept bids and manage schedules
- **Administrators**: Comprehensive dashboard for platform management and oversight

### 💳 Payment Processing
- **Stripe Integration**: Secure, industry-standard payment processing
- **Automatic Payments**: Charge payment methods when bids are accepted
- **Stripe Connect**: Driver payout management
- **PayPal Support**: Alternative payment method

### 📱 Progressive Web App (PWA)
- **Offline Support**: Full functionality without internet connection
- **Push Notifications**: Real-time updates for ride status
- **Installable App**: Add to home screen for native app experience
- **Mobile Optimized**: Responsive design for all devices

### 🔐 Security & Authentication
- **Session Management**: Persistent, secure session handling with PostgreSQL store
- **Multi-Strategy Authentication**: Local strategy and OAuth (Google)
- **Role-Based Access Control**: Granular permission system
- **Driver Verification**: Admin approval process with background checks, drug tests, and certifications
- **Document Verification**: Secure handling and verification of required documents

### 📞 Communication
- **In-App Messaging**: Real-time chat between riders and drivers
- **Multi-Channel Notifications**: Email, SMS (Twilio), and push notifications
- **File Sharing**: Share documents and photos in chat
- **Automated Reminders**: Ride reminder notifications

### 🛠️ Admin Tools
- **User Management**: Manage riders, drivers, and administrators
- **Driver Verification**: Review certifications and background checks
- **Document Management**: View and verify required documents with bulk operations
- **Ride Monitoring**: Track all rides and manage disputes
- **Promo Codes**: Create and manage promotional offers
- **System Analytics**: Monitor platform performance

### ⚖️ Legal Compliance
- **Terms of Service**: Customizable agreement system
- **Privacy Policy**: Comprehensive data protection terms
- **Driver Agreement**: Role-specific terms and conditions
- **Electronic Signatures**: Capture user consent and signatures

## Tech Stack

### Frontend
- **React** with TypeScript
- **Vite** - Fast build tool
- **Wouter** - Client-side routing
- **TanStack Query (React Query)** - Server state management
- **React Hook Form** - Form state management
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component library
- **Zod** - Runtime type validation
- **Google Maps API** - Geocoding and directions
- **Uppy** - File upload handling

### Backend
- **Express.js** - REST API framework
- **Node.js** with TypeScript
- **Passport.js** - Authentication
- **Drizzle ORM** - Type-safe database queries
- **PostgreSQL** - Data persistence
- **Multer** - File upload processing
- **Sharp** - Image processing and thumbnails

### Services & Integrations
- **Stripe** - Payment processing and payouts
- **PayPal** - Alternative payments
- **SendGrid** - Email notifications
- **Twilio** - SMS notifications
- **Google OAuth** - Social authentication
- **Google Maps** - Location services

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Environment variables configured (see `.env.example`)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/MyAmbulex/MyAmbulexDashboard.git
   cd MyAmbulexDashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Create `.env` file with required secrets:
     - `DATABASE_URL` - PostgreSQL connection string
     - `ADMIN_INITIAL_PASSWORD` - Admin setup password
     - `GOOGLE_CLIENT_ID` - Google OAuth credentials
     - `GOOGLE_CLIENT_SECRET` - Google OAuth credentials
     - `STRIPE_SECRET_KEY` - Stripe API key
     - `STRIPE_PUBLISHABLE_KEY` - Stripe public key
     - And others (SendGrid, Twilio, PayPal keys)

4. **Initialize database**
   ```bash
   npm run db:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:5000`

## Project Structure

```
.
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Route pages
│   │   ├── hooks/         # Custom React hooks
│   │   └── App.tsx        # Main app component
│   └── index.html
├── server/                # Backend Express application
│   ├── auth.ts            # Authentication logic
│   ├── routes.ts          # API route handlers
│   ├── storage.ts         # Data persistence layer
│   ├── index.ts           # Express server setup
│   └── vite.ts            # Vite integration
├── shared/
│   └── schema.ts          # Drizzle ORM schemas & Zod types
├── tests/                 # Integration test suite
│   ├── integration/       # End-to-end tests
│   └── helpers/           # Test utilities
├── package.json
├── tsconfig.json
└── README.md
```

## API Documentation

Key endpoints include:
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/rides` - Create ride request
- `POST /api/bids` - Submit driver bid
- `GET /api/rides/:id` - Get ride details
- `POST /api/payments` - Process payment
- And many more...

See `API.md` for complete documentation.

## Testing

The project includes comprehensive integration tests covering:
- Authentication workflows
- Ride creation and management
- Bidding system
- Payment processing
- Admin operations

Run tests:
```bash
npm test
```

See `TEST_GUIDE.md` for detailed testing information.

## Development Guidelines

- Follow TypeScript strict mode
- Use Zod for runtime validation
- Implement proper error handling
- Add test IDs to interactive elements
- Keep components focused and reusable
- Use Tailwind CSS utilities for styling

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests to ensure everything works
4. Submit a pull request with a clear description

## Security

This platform handles sensitive health and financial information. Security features include:
- Secure session management
- HTTPS-only cookies (in production)
- Rate limiting on authentication endpoints
- CSRF protection
- SQL injection prevention (via Drizzle ORM)
- Secure password hashing with bcrypt
- Environment variable management for secrets

See `SECURITY_NOTES.md` for detailed security information.

## Performance

The platform includes several optimizations:
- 33+ database indexes for fast queries
- Efficient query patterns with Drizzle
- Image compression and caching
- Optimized bundle size with tree-shaking
- Service worker caching strategies

## License

This project is proprietary software. Unauthorized copying or distribution is prohibited.

## Support

For issues, questions, or feature requests, please contact the development team or open an issue on GitHub.

---

**MyAmbulex** - Transforming Medical Transportation
