// Create a real session and test the admin documents endpoint
const express = require('express');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const passport = require('passport');
const LocalStrategy = require('passport-local');
const { storage } = require('./server/storage.js');

const app = express();

// Setup session
app.use(session({
  secret: 'test-secret',
  resave: false,
  saveUninitialized: false,
  store: new MemoryStore({ checkPeriod: 86400000 }),
  cookie: {
    maxAge: 86400000,
    httpOnly: false,
    secure: false,
    sameSite: 'lax'
  }
}));

// Setup passport
app.use(passport.initialize());
app.use(passport.session());

// Configure passport
passport.use(new LocalStrategy(
  async (username, password, done) => {
    try {
      const user = await storage.getUser(username);
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      
      // In a real app, you'd verify the password hash
      if (password === 'password123') {
        return done(null, user);
      } else {
        return done(null, false, { message: 'Incorrect password.' });
      }
    } catch (error) {
      return done(error);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Login endpoint
app.post('/login', passport.authenticate('local', {
  successRedirect: '/success',
  failureRedirect: '/failure'
}));

// Test the admin documents endpoint
app.get('/test-admin-documents', async (req, res) => {
  try {
    console.log('Session check:', {
      isAuthenticated: req.isAuthenticated(),
      user: req.user,
      sessionID: req.sessionID
    });
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not admin' });
    }
    
    // Call the storage method directly
    const driverDetails = await storage.getDriverDetailsByUserId(59);
    
    console.log('Driver details result:', {
      found: !!driverDetails,
      id: driverDetails?.id,
      userId: driverDetails?.userId,
      licensePhotoFront: driverDetails?.licensePhotoFront,
      licensePhotoBack: driverDetails?.licensePhotoBack,
      insuranceDocumentUrl: driverDetails?.insuranceDocumentUrl,
      profilePhoto: driverDetails?.profilePhoto
    });
    
    res.json({
      success: true,
      hasDriverDetails: !!driverDetails,
      documents: driverDetails ? {
        licensePhotoFront: driverDetails.licensePhotoFront,
        licensePhotoBack: driverDetails.licensePhotoBack,
        insuranceDocumentUrl: driverDetails.insuranceDocumentUrl,
        profilePhoto: driverDetails.profilePhoto,
        vehicleRegistrationUrl: driverDetails.vehicleRegistrationUrl,
        medicalCertificationUrl: driverDetails.medicalCertificationUrl,
        backgroundCheckDocumentUrl: driverDetails.backgroundCheckDocumentUrl,
        drugTestResultsUrl: driverDetails.drugTestResultsUrl,
        mvrRecordUrl: driverDetails.mvrRecordUrl
      } : null
    });
    
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/success', (req, res) => {
  res.json({ message: 'Login successful', user: req.user });
});

app.get('/failure', (req, res) => {
  res.status(401).json({ message: 'Login failed' });
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log('Steps:');
  console.log('1. POST to /login with {"username":"admin","password":"password123"}');
  console.log('2. GET to /test-admin-documents');
});