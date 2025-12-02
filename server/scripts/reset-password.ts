import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { pool } from "../db";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function resetPassword(username: string, newPassword: string) {
  try {
    console.log(`Attempting to reset password for user: ${username}`);
    
    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);
    console.log(`New password hashed successfully`);
    
    // Update the user's password in the database
    const result = await pool.query(
      "UPDATE users SET password = $1 WHERE username = $2 RETURNING id, username",
      [hashedPassword, username]
    );
    
    if (result.rowCount === 0) {
      console.error(`User ${username} not found`);
      return false;
    }
    
    console.log(`Password reset successful for user: ${username} (ID: ${result.rows[0].id})`);
    return true;
  } catch (error) {
    console.error("Error resetting password:", error);
    return false;
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Reset password for the specified user
const username = process.argv[2] || "Remi";
const newPassword = process.argv[3] || "password123";

if (!username) {
  console.error("Please provide a username");
  process.exit(1);
}

resetPassword(username, newPassword)
  .then((success) => {
    if (success) {
      console.log(`Password for ${username} has been reset to '${newPassword}'`);
    } else {
      console.error(`Failed to reset password for ${username}`);
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });