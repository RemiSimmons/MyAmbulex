
import express from "express";
import { storage } from "../storage";

const wsRouter = express.Router();

// WebSocket session diagnostic endpoint
wsRouter.get('/api/websocket/session-test', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Not available in production' });
  }

  try {
    const sessionId = req.sessionID;
    
    // Check for multiple possible cookie names
    const cookies = req.headers.cookie || '';
    const myambulexSid = cookies
      .split(';')
      .find(row => row.trim().startsWith('myambulex.sid='))
      ?.split('=')[1];
    
    const connectSid = cookies
      .split(';')
      .find(row => row.trim().startsWith('connect.sid='))
      ?.split('=')[1];

    console.log("WebSocket diagnostic: Testing session authentication");

    const result = {
      sessionCheck: {
        requestSessionId: sessionId,
        cookieSessionIds: {
          myambulexSid: myambulexSid ? `${myambulexSid.substring(0, 8)}...` : null,
          connectSid: connectSid ? `${connectSid.substring(0, 8)}...` : null
        },
        allCookies: cookies.split(';').map(c => c.trim().split('=')[0]),
        rawCookieHeader: cookies.substring(0, 100) + (cookies.length > 100 ? '...' : '')
      },
      sessionStoreCheck: null,
      authentication: {
        isAuthenticated: req.isAuthenticated(),
        hasUser: !!req.user,
        userId: req.user?.id,
        userRole: req.user?.role
      }
    };

    // Test session store lookup (like WebSocket does)
    if (sessionId) {
      try {
        const sessionStore = storage.sessionStore;
        const sessionData = await new Promise((resolve, reject) => {
          sessionStore.get(sessionId, (err, session) => {
            if (err) reject(err);
            else resolve(session);
          });
        });
        
        result.sessionStoreCheck = {
          sessionFound: !!sessionData,
          hasPassport: !!(sessionData && sessionData.passport),
          hasUser: !!(sessionData && sessionData.passport && sessionData.passport.user),
          userId: sessionData && sessionData.passport ? sessionData.passport.user : null,
          sessionKeys: sessionData ? Object.keys(sessionData) : null
        };
      } catch (sessionError) {
        result.sessionStoreCheck = {
          error: sessionError.message,
          sessionFound: false
        };
      }
    }

    res.json(result);
  } catch (error) {
    console.error("WebSocket diagnostic error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default wsRouter;
