-- ============================================
-- MyAmbulex - Enable Row Level Security (RLS)
-- ============================================
-- This script enables RLS on all tables and creates policies
-- that allow your backend (using service_role) full access.
-- 
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

-- First, let's create a helper function to check if user is authenticated via service role
-- This allows your Express backend to have full access while protecting against
-- unauthorized direct Supabase client access

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

-- Session table
ALTER TABLE IF EXISTS public.session ENABLE ROW LEVEL SECURITY;

-- User related tables
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.promo_code_usage ENABLE ROW LEVEL SECURITY;

-- Admin tables
ALTER TABLE IF EXISTS public.admin_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_notes ENABLE ROW LEVEL SECURITY;

-- Driver tables
ALTER TABLE IF EXISTS public.driver_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.driver_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.driver_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.driver_registration_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.driver_onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.driver_availability_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.driver_blocked_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.driver_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.driver_ride_filters ENABLE ROW LEVEL SECURITY;

-- Rider tables
ALTER TABLE IF EXISTS public.rider_onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Platform tables
ALTER TABLE IF EXISTS public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Vehicle tables
ALTER TABLE IF EXISTS public.vehicles ENABLE ROW LEVEL SECURITY;

-- Ride related tables
ALTER TABLE IF EXISTS public.recurring_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.saved_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hidden_rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ride_edits ENABLE ROW LEVEL SECURITY;

-- Communication tables
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Legal tables
ALTER TABLE IF EXISTS public.legal_agreement_signatures ENABLE ROW LEVEL SECURITY;

-- Rating tables
ALTER TABLE IF EXISTS public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rating_responses ENABLE ROW LEVEL SECURITY;

-- Document tables
ALTER TABLE IF EXISTS public.documents ENABLE ROW LEVEL SECURITY;

-- Payment tables
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cancellation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_method_audits ENABLE ROW LEVEL SECURITY;


-- ============================================
-- CREATE POLICIES FOR SERVICE ROLE ACCESS
-- ============================================
-- These policies allow your backend (which uses the service_role key via DATABASE_URL)
-- to have full CRUD access to all tables.

-- Session table
DROP POLICY IF EXISTS "Service role full access" ON public.session;
CREATE POLICY "Service role full access" ON public.session FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Users table
DROP POLICY IF EXISTS "Service role full access" ON public.users;
CREATE POLICY "Service role full access" ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true);

-- User profiles
DROP POLICY IF EXISTS "Service role full access" ON public.user_profiles;
CREATE POLICY "Service role full access" ON public.user_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Promo codes
DROP POLICY IF EXISTS "Service role full access" ON public.promo_codes;
CREATE POLICY "Service role full access" ON public.promo_codes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Promo code usage
DROP POLICY IF EXISTS "Service role full access" ON public.promo_code_usage;
CREATE POLICY "Service role full access" ON public.promo_code_usage FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Admin overrides
DROP POLICY IF EXISTS "Service role full access" ON public.admin_overrides;
CREATE POLICY "Service role full access" ON public.admin_overrides FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Admin audit log
DROP POLICY IF EXISTS "Service role full access" ON public.admin_audit_log;
CREATE POLICY "Service role full access" ON public.admin_audit_log FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Admin notes
DROP POLICY IF EXISTS "Service role full access" ON public.admin_notes;
CREATE POLICY "Service role full access" ON public.admin_notes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Driver permissions
DROP POLICY IF EXISTS "Service role full access" ON public.driver_permissions;
CREATE POLICY "Service role full access" ON public.driver_permissions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Driver payouts
DROP POLICY IF EXISTS "Service role full access" ON public.driver_payouts;
CREATE POLICY "Service role full access" ON public.driver_payouts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Driver details
DROP POLICY IF EXISTS "Service role full access" ON public.driver_details;
CREATE POLICY "Service role full access" ON public.driver_details FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Driver registration progress
DROP POLICY IF EXISTS "Service role full access" ON public.driver_registration_progress;
CREATE POLICY "Service role full access" ON public.driver_registration_progress FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Driver onboarding progress
DROP POLICY IF EXISTS "Service role full access" ON public.driver_onboarding_progress;
CREATE POLICY "Service role full access" ON public.driver_onboarding_progress FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Driver availability schedules
DROP POLICY IF EXISTS "Service role full access" ON public.driver_availability_schedules;
CREATE POLICY "Service role full access" ON public.driver_availability_schedules FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Driver blocked times
DROP POLICY IF EXISTS "Service role full access" ON public.driver_blocked_times;
CREATE POLICY "Service role full access" ON public.driver_blocked_times FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Driver achievements
DROP POLICY IF EXISTS "Service role full access" ON public.driver_achievements;
CREATE POLICY "Service role full access" ON public.driver_achievements FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Driver ride filters
DROP POLICY IF EXISTS "Service role full access" ON public.driver_ride_filters;
CREATE POLICY "Service role full access" ON public.driver_ride_filters FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Rider onboarding progress
DROP POLICY IF EXISTS "Service role full access" ON public.rider_onboarding_progress;
CREATE POLICY "Service role full access" ON public.rider_onboarding_progress FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Platform settings
DROP POLICY IF EXISTS "Service role full access" ON public.platform_settings;
CREATE POLICY "Service role full access" ON public.platform_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Vehicles
DROP POLICY IF EXISTS "Service role full access" ON public.vehicles;
CREATE POLICY "Service role full access" ON public.vehicles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Recurring appointments
DROP POLICY IF EXISTS "Service role full access" ON public.recurring_appointments;
CREATE POLICY "Service role full access" ON public.recurring_appointments FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Rides
DROP POLICY IF EXISTS "Service role full access" ON public.rides;
CREATE POLICY "Service role full access" ON public.rides FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Bids
DROP POLICY IF EXISTS "Service role full access" ON public.bids;
CREATE POLICY "Service role full access" ON public.bids FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Saved addresses
DROP POLICY IF EXISTS "Service role full access" ON public.saved_addresses;
CREATE POLICY "Service role full access" ON public.saved_addresses FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Hidden rides
DROP POLICY IF EXISTS "Service role full access" ON public.hidden_rides;
CREATE POLICY "Service role full access" ON public.hidden_rides FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Ride edits
DROP POLICY IF EXISTS "Service role full access" ON public.ride_edits;
CREATE POLICY "Service role full access" ON public.ride_edits FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Notifications
DROP POLICY IF EXISTS "Service role full access" ON public.notifications;
CREATE POLICY "Service role full access" ON public.notifications FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Chat conversations
DROP POLICY IF EXISTS "Service role full access" ON public.chat_conversations;
CREATE POLICY "Service role full access" ON public.chat_conversations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Chat participants
DROP POLICY IF EXISTS "Service role full access" ON public.chat_participants;
CREATE POLICY "Service role full access" ON public.chat_participants FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Chat messages
DROP POLICY IF EXISTS "Service role full access" ON public.chat_messages;
CREATE POLICY "Service role full access" ON public.chat_messages FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Legal agreement signatures
DROP POLICY IF EXISTS "Service role full access" ON public.legal_agreement_signatures;
CREATE POLICY "Service role full access" ON public.legal_agreement_signatures FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Ratings
DROP POLICY IF EXISTS "Service role full access" ON public.ratings;
CREATE POLICY "Service role full access" ON public.ratings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Rating responses
DROP POLICY IF EXISTS "Service role full access" ON public.rating_responses;
CREATE POLICY "Service role full access" ON public.rating_responses FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Documents
DROP POLICY IF EXISTS "Service role full access" ON public.documents;
CREATE POLICY "Service role full access" ON public.documents FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Payments
DROP POLICY IF EXISTS "Service role full access" ON public.payments;
CREATE POLICY "Service role full access" ON public.payments FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Payment methods
DROP POLICY IF EXISTS "Service role full access" ON public.payment_methods;
CREATE POLICY "Service role full access" ON public.payment_methods FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Payment transactions
DROP POLICY IF EXISTS "Service role full access" ON public.payment_transactions;
CREATE POLICY "Service role full access" ON public.payment_transactions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Refunds
DROP POLICY IF EXISTS "Service role full access" ON public.refunds;
CREATE POLICY "Service role full access" ON public.refunds FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Cancellation policies
DROP POLICY IF EXISTS "Service role full access" ON public.cancellation_policies;
CREATE POLICY "Service role full access" ON public.cancellation_policies FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Payment method audits
DROP POLICY IF EXISTS "Service role full access" ON public.payment_method_audits;
CREATE POLICY "Service role full access" ON public.payment_method_audits FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- GRANT USAGE TO AUTHENTICATED ROLE (Optional)
-- ============================================
-- If you plan to use Supabase Auth in the future, you can add
-- more granular policies for authenticated users here.
-- For now, all access goes through your Express backend.

-- ============================================
-- VERIFICATION
-- ============================================
-- Run this query to verify RLS is enabled on all tables:

SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================
-- SUCCESS!
-- ============================================
-- After running this script:
-- 1. Refresh the Supabase Security Advisor
-- 2. All 40 RLS warnings should be resolved
-- 3. Your backend will continue to work normally
-- 4. Direct unauthorized access to your database is now blocked

