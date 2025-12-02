/**
 * Test App Setup for Integration Testing
 * Creates an Express app instance configured for testing with supertest
 */

import express from 'express';
import session from 'express-session';
import { setupAuth } from '../../server/auth';
import { registerRoutes } from '../../server/routes/index';

export function createTestApp() {
  const app = express();

  // Parse JSON bodies
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Session setup for testing
  app.use(
    session({
      secret: 'test-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false, // Allow HTTP in tests
        httpOnly: true,
        maxAge: 86400000 // 24 hours
      }
    })
  );

  // Setup authentication (Passport.js)
  setupAuth(app);

  // Register all routes
  registerRoutes(app);

  return app;
}

/**
 * Helper to create an authenticated supertest agent
 * @param request - The supertest request object
 * @param app - The Express app instance
 * @param userData - User credentials for login
 * @returns Authenticated agent for making requests
 */
export async function createAuthenticatedAgent(
  request: any,
  app: any,
  userData: { username: string; password: string }
) {
  const agent = request.agent(app);
  
  await agent
    .post('/api/auth/login')
    .send(userData)
    .expect(200);
  
  return agent;
}
