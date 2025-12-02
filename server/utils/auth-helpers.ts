import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import bcrypt from "bcrypt";
import { User as SelectUser } from "@shared/schema";

const scryptAsync = promisify(scrypt);

// Function to remove sensitive data from user object before sending to client
export function sanitizeUser(user: SelectUser | null | undefined) {
  if (!user) return null;

  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    emailVerified: user.emailVerified,
    phone: user.phone,
    phoneVerified: user.phoneVerified,
    role: user.role,
    stripeCustomerId: user.stripeCustomerId,
    isOnboarded: user.isOnboarded,
    profileImageUrl: user.profileImageUrl,
    createdAt: user.createdAt
  };
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  try {
    console.log("User password:", stored ? "Has password" : "No password", 
      stored ? { length: stored.length, hasDelimiter: stored.includes(".") } : {});

    if (!stored || !supplied) {
      console.error("Missing password data for comparison");
      return false;
    }

    // Check if this is a bcrypt hash (starts with $2b$, $2a$, etc.)
    if (stored.startsWith('$2') && stored.length === 60) {
      console.log("Using bcrypt password verification");
      try {
        const result = await bcrypt.compare(supplied, stored);
        console.log(`bcrypt password validation ${result ? 'succeeded' : 'failed'}`);
        return result;
      } catch (bcryptError) {
        console.error("bcrypt comparison error:", bcryptError);
        return false;
      }
    }

    // Legacy password format handling
    let hashed, salt;
    
    // Handle different password storage formats
    if (stored.includes(".")) {
      console.log("Password has delimiter, attempting to split");
      
      if (stored.includes("pbkdf2:sha256:")) {
        // Format: pbkdf2:sha256:iterations$salt$hash
        const parts = stored.split("$");
        if (parts.length >= 3) {
          salt = parts[1];
          hashed = parts[2];
        } else {
          console.error("Invalid pbkdf2 format");
          return false;
        }
      } else {
        // Simple salt.hash format
        [hashed, salt] = stored.split(".");
      }
    } else {
      console.error("Invalid password format: no delimiter found");
      return false;
    }

    console.log("Split password parts:", {
      hashedLength: hashed?.length,
      saltLength: salt?.length,
      hasValidParts: !!(hashed && salt)
    });

    if (!hashed || !salt) {
      console.error("Invalid password format in database, missing hash or salt");
      return false;
    }

    try {
      const hashedBuf = Buffer.from(hashed, "hex");
      
      // Try scrypt for legacy passwords
      let suppliedBuf;
      try {
        suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
        console.log("Using scrypt password verification");
      } catch (scryptError) {
        console.error("scrypt failed:", scryptError);
        return false;
      }

      console.log("Buffers created:", {
        hashedBufLength: hashedBuf.length,
        suppliedBufLength: suppliedBuf.length
      });

      const result = timingSafeEqual(hashedBuf, suppliedBuf);
      console.log(`Password validation ${result ? 'succeeded' : 'failed'}`);
      return result;
      
    } catch (error: any) {
      console.error("Password comparison error:", error);
      return false;
    }
  } catch (outerError: any) {
    console.error("Outer password comparison error:", outerError);
    return false;
  }
}
