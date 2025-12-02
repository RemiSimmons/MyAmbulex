import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { pool } from "../db";

const scryptAsync = promisify(scrypt);

async function comparePasswords(supplied: string, stored: string) {
  try {
    const [hashed, salt] = stored.split(".");
    
    if (!hashed || !salt) {
      console.error("Invalid password format in database, missing hash or salt");
      return false;
    }
    
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    
    const result = timingSafeEqual(hashedBuf, suppliedBuf);
    return result;
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
}

async function tryCommonPasswords(storedPassword: string) {
  // Common test passwords to try
  const commonPasswords = [
    'password',
    'password123',
    'admin',
    'admin123',
    '123456',
    'qwerty',
    'test',
    'test123',
    'letmein',
    'welcome',
    'welcome123',
    'rider123',
    'driver123',
    'Text1234',
    'Password1',
    'Pass123'
  ];

  for (const password of commonPasswords) {
    const isMatch = await comparePasswords(password, storedPassword);
    if (isMatch) {
      return password;
    }
  }
  
  return null;
}

async function debugAccounts() {
  try {
    // Get all users
    const { rows } = await pool.query("SELECT id, username, password FROM users");
    
    console.log("Testing common passwords against user accounts...");

    for (const user of rows) {
      const matchedPassword = await tryCommonPasswords(user.password);
      
      if (matchedPassword) {
        console.log(`User: ${user.username} | Password: ${matchedPassword}`);
      } else {
        console.log(`User: ${user.username} | Password: Could not determine`);
      }
    }
  } catch (error) {
    console.error("Error debugging passwords:", error);
  } finally {
    pool.end();
  }
}

debugAccounts();