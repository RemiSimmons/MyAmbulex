-- Add new fields to users table
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMP,
  ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "sms": true, "push": true}',
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'English',
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS referred_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS referral_code TEXT;

-- Add new fields to user_profiles table
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS insurance_provider TEXT,
  ADD COLUMN IF NOT EXISTS insurance_number TEXT,
  ADD COLUMN IF NOT EXISTS insurance_coverage_details TEXT,
  ADD COLUMN IF NOT EXISTS primary_physician TEXT,
  ADD COLUMN IF NOT EXISTS physician_phone TEXT,
  ADD COLUMN IF NOT EXISTS preferred_hospital TEXT,
  ADD COLUMN IF NOT EXISTS frequent_destinations JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS mobility_aids JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS communication_preferences TEXT,
  ADD COLUMN IF NOT EXISTS allergies TEXT,
  ADD COLUMN IF NOT EXISTS medications TEXT,
  ADD COLUMN IF NOT EXISTS additional_notes TEXT,
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified';

-- Add new fields to driver_details table
ALTER TABLE driver_details
  ADD COLUMN IF NOT EXISTS license_class TEXT,
  ADD COLUMN IF NOT EXISTS license_photo_front TEXT,
  ADD COLUMN IF NOT EXISTS license_photo_back TEXT,
  ADD COLUMN IF NOT EXISTS insurance_document_url TEXT,
  ADD COLUMN IF NOT EXISTS years_of_experience INTEGER,
  ADD COLUMN IF NOT EXISTS medical_training_level TEXT,
  ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS certification_documents JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS preferred_vehicle_types JSONB DEFAULT '["standard"]',
  ADD COLUMN IF NOT EXISTS max_travel_distance INTEGER,
  ADD COLUMN IF NOT EXISTS biography TEXT,
  ADD COLUMN IF NOT EXISTS profile_photo TEXT,
  ADD COLUMN IF NOT EXISTS languages JSONB DEFAULT '["English"]',
  ADD COLUMN IF NOT EXISTS background_check_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS completed_rides INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancelled_rides INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS average_rating DOUBLE PRECISION;

-- Create saved addresses table if it doesn't exist
CREATE TABLE IF NOT EXISTS saved_addresses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address_type TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);