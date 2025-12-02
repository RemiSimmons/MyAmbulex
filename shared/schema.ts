import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, json, pgEnum, date, time, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage for express-session with connect-pg-simple
export const sessions = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire").notNull(),
}, (table) => ({
  expireIdx: index("idx_session_expire").on(table.expire),
}));

// User related tables
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false),
  phone: text("phone").notNull(),
  phoneVerified: boolean("phone_verified").default(false),
  role: text("role", { enum: ["rider", "driver", "admin"] }).notNull(),
  profileImageUrl: text("profile_image_url"),
  lastLogin: timestamp("last_login"),
  accountStatus: text("account_status", { 
    enum: ["active", "suspended", "inactive", "pending"] 
  }).default("active").notNull(),
  notificationPreferences: json("notification_preferences").default('{"email": true, "sms": true, "push": true}'),
  stripeCustomerId: text("stripe_customer_id"),
  preferredLanguage: text("preferred_language").default("English"),
  timezone: text("timezone").default("UTC"),
  isOnboarded: boolean("is_onboarded").default(false),
  referredBy: integer("referred_by").references(() => users.id),
  referralCode: text("referral_code"),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpiresAt: timestamp("email_verification_expires_at"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  backgroundCheckReferenceId: text("background_check_reference_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  roleIdx: index("idx_users_role").on(table.role),
  stripeCustomerIdx: index("idx_users_stripe_customer_id").on(table.stripeCustomerId),
  accountStatusIdx: index("idx_users_account_status").on(table.accountStatus),
}));

// Promo codes for beta testing and marketing
export const promoCodes = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description").notNull(),
  discountType: text("discount_type", { enum: ["fixed_amount", "percentage", "set_price"] }).notNull(),
  discountValue: doublePrecision("discount_value").notNull(),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").default(0).notNull(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true).notNull(),
  applicableRoles: json("applicable_roles").default('["rider", "driver"]'),
  minimumAmount: doublePrecision("minimum_amount").default(0),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Promo code usage tracking
export const promoCodeUsage = pgTable("promo_code_usage", {
  id: serial("id").primaryKey(),
  promoCodeId: integer("promo_code_id").notNull().references(() => promoCodes.id),
  userId: integer("user_id").notNull().references(() => users.id),
  rideId: integer("ride_id").references(() => rides.id),
  originalAmount: doublePrecision("original_amount").notNull(),
  discountAmount: doublePrecision("discount_amount").notNull(),
  finalAmount: doublePrecision("final_amount").notNull(),
  usedAt: timestamp("used_at").defaultNow().notNull(),
});

// Admin override system for manual control
export const adminOverrides = pgTable("admin_overrides", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").notNull().references(() => users.id),
  targetType: text("target_type", { enum: ["user", "driver", "ride", "system"] }).notNull(),
  targetId: integer("target_id"),
  overrideType: text("override_type", { 
    enum: ["verification_bypass", "permission_grant", "status_override", "system_config", "emergency_protocol"] 
  }).notNull(),
  originalValue: json("original_value"),
  overrideValue: json("override_value"),
  reason: text("reason").notNull(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const adminOverridesRelations = relations(adminOverrides, ({ one }) => ({
  admin: one(users, { fields: [adminOverrides.adminId], references: [users.id] }),
}));

// Enhanced driver permissions for granular control
export const driverPermissions = pgTable("driver_permissions", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull().references(() => driverDetails.id),
  permissionType: text("permission_type", { 
    enum: ["ride_accept", "view_requests", "service_area", "vehicle_type", "emergency_rides", "premium_rides", "bulk_transport"] 
  }).notNull(),
  isGranted: boolean("is_granted").default(false).notNull(),
  grantedBy: integer("granted_by").references(() => users.id),
  grantedAt: timestamp("granted_at"),
  expiresAt: timestamp("expires_at"),
  adminOverride: boolean("admin_override").default(false).notNull(),
  overrideReason: text("override_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const driverPermissionsRelations = relations(driverPermissions, ({ one }) => ({
  driverDetails: one(driverDetails, { fields: [driverPermissions.driverId], references: [driverDetails.id] }),
  grantedByAdmin: one(users, { fields: [driverPermissions.grantedBy], references: [users.id] }),
}));

// Admin action audit trail
export const adminAuditLog = pgTable("admin_audit_log", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: integer("target_id"),
  oldValue: json("old_value"),
  newValue: json("new_value"),
  reason: text("reason"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  sessionId: text("session_id"),
  severity: text("severity", { enum: ["low", "medium", "high", "critical"] }).default("medium").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Driver payouts for tracking platform fee distribution
export const driverPayouts = pgTable("driver_payouts", {
  id: serial("id").primaryKey(),
  rideId: integer("ride_id").notNull().references(() => rides.id),
  driverId: integer("driver_id").notNull().references(() => users.id),
  totalAmount: doublePrecision("total_amount").notNull(),
  driverAmount: doublePrecision("driver_amount").notNull(),
  platformFee: doublePrecision("platform_fee").notNull(),
  processingFee: doublePrecision("processing_fee").notNull(),
  stripeTransferId: text("stripe_transfer_id"),
  status: text("status", { enum: ["pending", "processing", "completed", "failed"] }).default("pending").notNull(),
  failureReason: text("failure_reason"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const adminAuditLogRelations = relations(adminAuditLog, ({ one }) => ({
  admin: one(users, { fields: [adminAuditLog.adminId], references: [users.id] }),
}));

export const driverPayoutsRelations = relations(driverPayouts, ({ one }) => ({
  ride: one(rides, { fields: [driverPayouts.rideId], references: [rides.id] }),
  driver: one(users, { fields: [driverPayouts.driverId], references: [users.id] }),
}));

// Platform settings for configurable system parameters
export const platformSettings = pgTable("platform_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  dataType: text("data_type", { enum: ["string", "number", "boolean", "json"] }).notNull(),
  description: text("description"),
  category: text("category").notNull(),
  isEditable: boolean("is_editable").default(true).notNull(),
  lastModifiedBy: integer("last_modified_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const platformSettingsRelations = relations(platformSettings, ({ one }) => ({
  lastModifiedBy: one(users, { fields: [platformSettings.lastModifiedBy], references: [users.id] }),
}));

export const userRelations = relations(users, ({ one, many }: { one: any, many: any }) => ({
  profile: one(userProfiles, { fields: [users.id], references: [userProfiles.userId] }),
  driverDetails: one(driverDetails, { fields: [users.id], references: [driverDetails.userId] }),
  ridesAsRider: many(rides, { relationName: "rider" }),
  ridesAsDriver: many(rides, { relationName: "driver" }),
  bids: many(bids),
}));

export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  dateOfBirth: timestamp("date_of_birth"),
  emergencyContact: text("emergency_contact"),
  emergencyPhone: text("emergency_phone"),
  
  // Enhanced medical needs fields
  medicalConditions: text("medical_conditions"),
  accessibilityNeeds: text("accessibility_needs"),
  mobilityLevel: text("mobility_level", { 
    enum: ["independent", "needs_assistance", "wheelchair_dependent", "bed_bound"]
  }),
  oxygenRequired: boolean("oxygen_required").default(false),
  dialysisPatient: boolean("dialysis_patient").default(false),
  bariatricCare: boolean("bariatric_care").default(false),
  mobilityAids: json("mobility_aids").default('[]'),
  allergies: text("allergies"),
  medications: text("medications"),
  specialTransportNeeds: json("special_transport_needs").default('{}'),
  
  // Medical information
  profilePicture: text("profile_picture"),
  insuranceProvider: text("insurance_provider"),
  insuranceNumber: text("insurance_number"),
  insuranceCoverageDetails: text("insurance_coverage_details"),
  primaryPhysician: text("primary_physician"),
  physicianPhone: text("physician_phone"),
  preferredHospital: text("preferred_hospital"),
  bloodType: text("blood_type", { enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] }),
  dnrStatus: boolean("dnr_status").default(false),
  medicalPowerOfAttorney: text("medical_power_of_attorney"),
  
  // Destination-related
  frequentDestinations: json("frequent_destinations").default('[]'),
  communicationPreferences: text("communication_preferences"),
  additionalNotes: text("additional_notes"),
  verificationStatus: text("verification_status", { 
    enum: ["unverified", "pending", "verified"] 
  }).default("unverified").notNull(),
  
  // Banking information for riders
  accountHolderName: text("account_holder_name"),
  accountType: text("account_type", { enum: ["checking", "savings"] }),
  bankName: text("bank_name"),
  routingNumber: text("routing_number"),
  accountNumber: text("account_number"),
  billingAddress: text("billing_address"),
  billingCity: text("billing_city"),
  billingState: text("billing_state"),
  billingZipCode: text("billing_zip_code"),
  paymentPreference: text("payment_preference", { enum: ["bank_account", "credit_card", "paypal"] }),
  
  // Stripe payment method storage
  stripeCustomerId: text("stripe_customer_id"),
  stripePaymentMethodId: text("stripe_payment_method_id"),
  paymentMethodSetupComplete: boolean("payment_method_setup_complete").default(false),
  paymentMethodBrand: text("payment_method_brand"), // visa, mastercard, etc.
  paymentMethodLast4: text("payment_method_last4"),
  paymentMethodExpMonth: integer("payment_method_exp_month"),
  paymentMethodExpYear: integer("payment_method_exp_year"),
});

export const userProfilesRelations = relations(userProfiles, ({ one }: { one: any }) => ({
  user: one(users, { fields: [userProfiles.userId], references: [users.id] }),
}));

export const driverDetails = pgTable("driver_details", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  // License information
  licenseNumber: text("license_number").notNull(),
  licenseState: text("license_state").notNull(),
  licenseExpiry: timestamp("license_expiry").notNull(),
  licenseClass: text("license_class"),
  licensePhotoFront: text("license_photo_front"),
  licensePhotoBack: text("license_photo_back"),
  
  // Insurance information
  insuranceProvider: text("insurance_provider").notNull(),
  insuranceNumber: text("insurance_number").notNull(),
  insuranceExpiry: timestamp("insurance_expiry").notNull(),
  insuranceDocumentUrl: text("insurance_document_url"),
  
  // Professional qualifications
  yearsOfExperience: integer("years_of_experience"),
  medicalTrainingLevel: text("medical_training_level", { 
    enum: ["none", "first_aid", "cpr_certified", "emt_basic", "emt_advanced", "paramedic"] 
  }),
  certifications: json("certifications").default('[]'),
  certificationDocuments: json("certification_documents").default('[]'),
  
  // Work preferences
  serviceArea: json("service_area").notNull(),
  serviceHours: json("service_hours").notNull(),
  preferredVehicleTypes: json("preferred_vehicle_types").default('["standard"]'),
  maxTravelDistance: integer("max_travel_distance"),
  
  // Biography and public profile
  biography: text("biography"),
  profilePhoto: text("profile_photo"),
  languages: json("languages").default('["English"]'),
  
  // Verification and status
  backgroundCheckStatus: text("background_check_status", { 
    enum: ["pending", "in_progress", "approved", "rejected", "expired"] 
  }).default("pending").notNull(),
  backgroundCheckDate: timestamp("background_check_date"),
  backgroundCheckProvider: text("background_check_provider"),
  backgroundCheckReferenceId: text("background_check_reference_id"),
  verified: boolean("verified").default(false).notNull(),
  accountStatus: text("account_status", {
    enum: ["pending", "active", "suspended", "rejected"]
  }).default("pending").notNull(),
  
  // Email verification
  emailVerificationToken: text("email_verification_token"),
  emailVerificationSentAt: timestamp("email_verification_sent_at"),
  emailVerificationExpiry: timestamp("email_verification_expiry"),
  
  // Driver permissions and restrictions
  canAcceptRides: boolean("can_accept_rides").default(false).notNull(),
  canViewRideRequests: boolean("can_view_ride_requests").default(false).notNull(),
  maxConcurrentRides: integer("max_concurrent_rides").default(1).notNull(),
  requiresApprovalForRides: boolean("requires_approval_for_rides").default(true).notNull(),
  
  // Document verification status
  licenseVerified: boolean("license_verified").default(false),
  licenseRejectionReason: text("license_rejection_reason"),
  insuranceVerified: boolean("insurance_verified").default(false),
  insuranceRejectionReason: text("insurance_rejection_reason"),
  vehicleVerified: boolean("vehicle_verified").default(false),
  vehicleRejectionReason: text("vehicle_rejection_reason"),
  profileVerified: boolean("profile_verified").default(false),
  profileRejectionReason: text("profile_rejection_reason"),
  medicalCertificationUrl: text("medical_certification_url"),
  medicalCertificationVerified: boolean("medical_certification_verified").default(false),
  medicalCertificationRejectionReason: text("medical_certification_rejection_reason"),
  backgroundCheckDocumentUrl: text("background_check_document_url"),
  backgroundCheckVerified: boolean("background_check_verified").default(false),
  backgroundCheckRejectionReason: text("background_check_rejection_reason"),
  vehicleRegistrationUrl: text("vehicle_registration_url"),
  drugTestDocumentUrl: text("drug_test_results_url"),
  drugTestVerified: boolean("drug_test_verified").default(false),
  // Combined CPR/First Aid certification (single requirement)
  cprFirstAidCertificationUrl: text("cpr_first_aid_certification_url"),
  cprFirstAidCertificationVerified: boolean("cpr_first_aid_certification_verified").default(false),
  cprFirstAidCertificationRejectionReason: text("cpr_first_aid_certification_rejection_reason"),
  
  // Medical certification fields (multi-selection support)
  basicLifeSupportUrl: text("basic_life_support_url"),
  basicLifeSupportVerified: boolean("basic_life_support_verified").default(false),
  basicLifeSupportRejectionReason: text("basic_life_support_rejection_reason"),
  advancedLifeSupportUrl: text("advanced_life_support_url"),
  advancedLifeSupportVerified: boolean("advanced_life_support_verified").default(false),
  advancedLifeSupportRejectionReason: text("advanced_life_support_rejection_reason"),
  emtCertificationUrl: text("emt_certification_url"),
  emtCertificationVerified: boolean("emt_certification_verified").default(false),
  emtCertificationRejectionReason: text("emt_certification_rejection_reason"),
  paramedicCertificationUrl: text("paramedic_certification_url"),
  paramedicCertificationVerified: boolean("paramedic_certification_verified").default(false),
  paramedicCertificationRejectionReason: text("paramedic_certification_rejection_reason"),
  
  drugTestRejectionReason: text("drug_test_rejection_reason"),
  mvrRecordUrl: text("mvr_record_url"),
  mvrRecordVerified: boolean("mvr_record_verified").default(false),
  mvrRecordRejectionReason: text("mvr_record_rejection_reason"),
  
  // Stripe Connect integration
  stripeConnectedAccountId: text("stripe_connected_account_id"),
}, (table) => ({
  userIdIdx: index("idx_driver_details_user_id").on(table.userId),
  verifiedIdx: index("idx_driver_details_verified").on(table.verified),
  accountStatusIdx: index("idx_driver_details_account_status").on(table.accountStatus),
  backgroundCheckStatusIdx: index("idx_driver_details_background_check_status").on(table.backgroundCheckStatus),
}));

// Adding a new table for driver registration progress
export const driverRegistrationProgress = pgTable("driver_registration_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  step: integer("step").default(0).notNull(),
  formData: json("form_data"),
  vehicleData: json("vehicle_data"),
  availabilitySettings: json("availability_settings"),
  lastSaved: timestamp("last_saved").defaultNow().notNull(),
});

export const driverRegistrationProgressRelations = relations(driverRegistrationProgress, ({ one }) => ({
  user: one(users, { fields: [driverRegistrationProgress.userId], references: [users.id] }),
}));

// Adding a table for rider onboarding progress
export const riderOnboardingProgress = pgTable("rider_onboarding_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  currentStep: text("current_step").notNull().default("welcome"),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  profileCompletionPercentage: integer("profile_completion_percentage").default(0),
  isFirstRide: boolean("is_first_ride").default(true),
  completedTours: json("completed_tours").default('[]'),
  savedProfileData: json("saved_profile_data").default('{}'),
  savedAccessibilityData: json("saved_accessibility_data").default('{}'),
  savedLocationsData: json("saved_locations_data").default('[]'),
  savedPaymentData: json("saved_payment_data").default('{}'),
  savedNotificationPreferences: json("saved_notification_preferences").default('{}'),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const riderOnboardingProgressRelations = relations(riderOnboardingProgress, ({ one }) => ({
  user: one(users, { fields: [riderOnboardingProgress.userId], references: [users.id] }),
}));

// Adding a table for driver onboarding progress
export const driverOnboardingProgress = pgTable("driver_onboarding_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  currentStep: text("current_step").notNull().default("welcome"),
  completedSteps: json("completed_steps").default('[]'),
  hasCompletedTour: boolean("has_completed_tour").default(false),
  hasCompletedFirstRide: boolean("has_completed_first_ride").default(false),
  hasCompletedProfile: boolean("has_completed_profile").default(false),
  hasSkippedOnboarding: boolean("has_skipped_onboarding").default(false),
  hasDisabledOnboarding: boolean("has_disabled_onboarding").default(false),
  seenFeatures: json("seen_features").default('[]'), 
  dismissedTooltips: json("dismissed_tooltips").default('[]'),
  savedNotificationPreferences: json("saved_notification_preferences").default('{}'),
  lastActiveAt: timestamp("last_active_at").defaultNow().notNull(),
});

export const driverOnboardingProgressRelations = relations(driverOnboardingProgress, ({ one }) => ({
  user: one(users, { fields: [driverOnboardingProgress.userId], references: [users.id] }),
}));

export const driverDetailsRelations = relations(driverDetails, ({ one, many }: { one: any, many: any }) => ({
  user: one(users, { fields: [driverDetails.userId], references: [users.id] }),
  vehicles: many(vehicles),
  availabilitySchedules: many(driverAvailabilitySchedules),
  blockedTimes: many(driverBlockedTimes),
  rideFilters: many(driverRideFilters),
}));

export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull().references(() => driverDetails.id),
  vehicleType: text("vehicle_type", { enum: ["standard", "wheelchair", "stretcher"] }).notNull(),
  make: text("make").notNull(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  licensePlate: text("license_plate").notNull(),
  color: text("color").notNull(),
  capacity: integer("capacity").notNull(),
  wheelchairCapacity: integer("wheelchair_capacity").default(0),
  stretcherCapacity: integer("stretcher_capacity").default(0),
  hasRamp: boolean("has_ramp").default(false),
  hasLift: boolean("has_lift").default(false),
  photo: text("photo"),
});

export const vehiclesRelations = relations(vehicles, ({ one }: { one: any }) => ({
  driverDetails: one(driverDetails, { fields: [vehicles.driverId], references: [driverDetails.id] }),
}));

// Driver Availability Scheduling
export const driverAvailabilitySchedules = pgTable("driver_availability_schedules", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull().references(() => driverDetails.id),
  name: text("name").notNull(), // e.g., "Weekday Morning Schedule", "Weekend Schedule"
  
  // Recurring pattern
  isRecurring: boolean("is_recurring").default(true).notNull(),
  frequency: text("frequency", { 
    enum: ["daily", "weekly", "biweekly", "monthly", "custom"] 
  }).notNull().default("weekly"),
  
  // Days of the week (for weekly schedules)
  monday: boolean("monday").default(false),
  tuesday: boolean("tuesday").default(false),
  wednesday: boolean("wednesday").default(false),
  thursday: boolean("thursday").default(false),
  friday: boolean("friday").default(false),
  saturday: boolean("saturday").default(false),
  sunday: boolean("sunday").default(false),
  
  // Time range
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const driverAvailabilitySchedulesRelations = relations(driverAvailabilitySchedules, ({ one }) => ({
  driverDetails: one(driverDetails, { fields: [driverAvailabilitySchedules.driverId], references: [driverDetails.id] }),
}));

// Driver Blocked Times (one-time unavailability periods)
export const driverBlockedTimes = pgTable("driver_blocked_times", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull().references(() => driverDetails.id),
  title: text("title").notNull(), // e.g., "Vacation", "Personal Time", "Maintenance"
  startDateTime: timestamp("start_date_time").notNull(),
  endDateTime: timestamp("end_date_time").notNull(),
  reason: text("reason", { 
    enum: ["vacation", "appointment", "maintenance", "personal", "other"] 
  }).default("personal"),
  description: text("description"),
  isFullDay: boolean("is_full_day").default(false),
  isRecurring: boolean("is_recurring").default(false),
  recurrencePattern: json("recurrence_pattern").default('{}'), // For complex recurring blocked times
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const driverBlockedTimesRelations = relations(driverBlockedTimes, ({ one }) => ({
  driverDetails: one(driverDetails, { fields: [driverBlockedTimes.driverId], references: [driverDetails.id] }),
}));

// Create insert schemas for the tables
export const insertDriverAvailabilityScheduleSchema = createInsertSchema(driverAvailabilitySchedules)
  .omit({ id: true, createdAt: true, updatedAt: true });

export const insertDriverBlockedTimeSchema = createInsertSchema(driverBlockedTimes)
  .omit({ id: true, createdAt: true });

export const insertRiderOnboardingProgressSchema = createInsertSchema(riderOnboardingProgress)
  .omit({ id: true, lastUpdated: true });

export const insertDriverOnboardingProgressSchema = createInsertSchema(driverOnboardingProgress)
  .omit({ id: true, lastActiveAt: true });

// Create types
export type DriverAvailabilitySchedule = typeof driverAvailabilitySchedules.$inferSelect;
export type InsertDriverAvailabilitySchedule = z.infer<typeof insertDriverAvailabilityScheduleSchema>;

export type DriverBlockedTime = typeof driverBlockedTimes.$inferSelect;
export type InsertDriverBlockedTime = z.infer<typeof insertDriverBlockedTimeSchema>;

export type RiderOnboardingProgress = typeof riderOnboardingProgress.$inferSelect;
export type InsertRiderOnboardingProgress = z.infer<typeof insertRiderOnboardingProgressSchema>;

export type DriverOnboardingProgress = typeof driverOnboardingProgress.$inferSelect;
export type InsertDriverOnboardingProgress = z.infer<typeof insertDriverOnboardingProgressSchema>;

// Recurring Appointments
export const recurringAppointments = pgTable("recurring_appointments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  pickupLocation: text("pickup_location").notNull(),
  pickupLocationLat: doublePrecision("pickup_location_lat"),
  pickupLocationLng: doublePrecision("pickup_location_lng"),
  dropoffLocation: text("dropoff_location").notNull(),
  dropoffLocationLat: doublePrecision("dropoff_location_lat"),
  dropoffLocationLng: doublePrecision("dropoff_location_lng"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  
  // Recurrence pattern
  frequency: text("frequency", { 
    enum: ["daily", "weekly", "biweekly", "monthly"] 
  }).notNull(),
  daysOfWeek: json("days_of_week").default('[]'), // For weekly recurrence
  dayOfMonth: integer("day_of_month"), // For monthly recurrence
  
  // Time details
  appointmentTime: timestamp("appointment_time").notNull(),
  isRoundTrip: boolean("is_round_trip").default(false),
  returnTime: timestamp("return_time"),
  
  // Trip requirements
  vehicleType: text("vehicle_type", { enum: ["standard", "wheelchair", "stretcher"] }).notNull(),
  needsRamp: boolean("needs_ramp").default(false),
  needsCompanion: boolean("needs_companion").default(false),
  needsStairChair: boolean("needs_stair_chair").default(false),
  needsWaitTime: boolean("needs_wait_time").default(false),
  waitTimeMinutes: integer("wait_time_minutes").default(0),
  specialInstructions: text("special_instructions"),
  
  isActive: boolean("is_active").default(true),
  lastGeneratedDate: timestamp("last_generated_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const recurringAppointmentsRelations = relations(recurringAppointments, ({ one, many }) => ({
  user: one(users, { fields: [recurringAppointments.userId], references: [users.id] }),
  generatedRides: many(rides),
}));

// Ride related tables
export const rides = pgTable("rides", {
  id: serial("id").primaryKey(),
  referenceNumber: text("reference_number").unique(),
  riderId: integer("rider_id").notNull().references(() => users.id),
  driverId: integer("driver_id").references(() => users.id),
  recurringAppointmentId: integer("recurring_appointment_id").references(() => recurringAppointments.id),
  status: text("status", { 
    enum: ["requested", "bidding", "scheduled", "payment_pending", "paid", "en_route", "arrived", "in_progress", "completed", "cancelled", "edit_pending"] 
  }).notNull(),
  pickupLocation: text("pickup_location").notNull(),
  pickupLocationLat: doublePrecision("pickup_location_lat"),
  pickupLocationLng: doublePrecision("pickup_location_lng"),
  dropoffLocation: text("dropoff_location").notNull(),
  dropoffLocationLat: doublePrecision("dropoff_location_lat"),
  dropoffLocationLng: doublePrecision("dropoff_location_lng"),
  scheduledTime: timestamp("scheduled_time").notNull(),
  estimatedDistance: doublePrecision("estimated_distance"),
  vehicleType: text("vehicle_type", { enum: ["standard", "wheelchair", "stretcher"] }).notNull(),
  riderBid: doublePrecision("rider_bid"),
  finalPrice: doublePrecision("final_price"),
  pickupStairs: text("pickup_stairs", { enum: ["none", "1-3", "4-10", "11+", "full_flight"] }),
  dropoffStairs: text("dropoff_stairs", { enum: ["none", "1-3", "4-10", "11+", "full_flight"] }),
  needsRamp: boolean("needs_ramp").default(false),
  needsCompanion: boolean("needs_companion").default(false),
  needsStairChair: boolean("needs_stair_chair").default(false),
  needsWaitTime: boolean("needs_wait_time").default(false),
  waitTimeMinutes: integer("wait_time_minutes").default(0),
  specialInstructions: text("special_instructions"),
  
  // Round trip related fields
  isRoundTrip: boolean("isRoundTrip").default(false),
  returnTime: timestamp("return_time"),
  returnPickupLocation: text("return_pickup_location"),
  returnDropoffLocation: text("return_dropoff_location"),
  returnPickupLocationLat: doublePrecision("return_pickup_location_lat"),
  returnPickupLocationLng: doublePrecision("return_pickup_location_lng"),
  returnDropoffLocationLat: doublePrecision("return_dropoff_location_lat"),
  returnDropoffLocationLng: doublePrecision("return_dropoff_location_lng"),
  returnEstimatedDistance: doublePrecision("return_estimated_distance"),
  
  // Promo code tracking
  promoCodeUsed: integer("promo_code_used").references(() => promoCodes.id),
  
  // Urgent ride flags and expiration
  isUrgent: boolean("is_urgent").default(false).notNull(),
  urgentCancellationFee: doublePrecision("urgent_cancellation_fee").default(50),
  expiresAt: timestamp("expires_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  riderIdIdx: index("idx_rides_rider_id").on(table.riderId),
  driverIdIdx: index("idx_rides_driver_id").on(table.driverId),
  statusIdx: index("idx_rides_status").on(table.status),
  scheduledTimeIdx: index("idx_rides_scheduled_time").on(table.scheduledTime),
  statusDriverIdx: index("idx_rides_status_driver").on(table.status, table.driverId),
  statusScheduledIdx: index("idx_rides_status_scheduled").on(table.status, table.scheduledTime),
  createdAtIdx: index("idx_rides_created_at").on(table.createdAt),
}));

export const ridesRelations = relations(rides, ({ one, many }: { one: any, many: any }) => ({
  rider: one(users, { fields: [rides.riderId], references: [users.id], relationName: "rider" }),
  driver: one(users, { fields: [rides.driverId], references: [users.id], relationName: "driver" }),
  bids: many(bids),
  recurringAppointment: one(recurringAppointments, { fields: [rides.recurringAppointmentId], references: [recurringAppointments.id] }),
}));

export const bids = pgTable("bids", {
  id: serial("id").primaryKey(),
  rideId: integer("ride_id").notNull().references(() => rides.id),
  driverId: integer("driver_id").notNull().references(() => users.id),
  amount: doublePrecision("amount").notNull(),
  notes: text("notes"),
  status: text("status", { enum: [
    "pending",       // Initial state, waiting for rider decision
    "selected",      // Rider has selected this bid
    "accepted",      // Final acceptance after selection
    "rejected",      // Rider rejected this bid
    "expired",       // Bid expired (time limit)
    "countered",     // A counter-offer was made
    "maxReached",    // Maximum counter-offers reached
    "withdrawn"      // Driver withdrew their bid
  ] }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // Counter-offer related fields
  parentBidId: integer("parent_bid_id").references(() => bids.id),
  counterParty: text("counter_party", { enum: ["rider", "driver"] }),
  bidCount: integer("bid_count").default(1),
  counterOfferCount: integer("counter_offer_count").default(0).notNull(),
  maxCounterOffers: integer("max_counter_offers").default(3).notNull(),
}, (table) => ({
  rideIdIdx: index("idx_bids_ride_id").on(table.rideId),
  driverIdIdx: index("idx_bids_driver_id").on(table.driverId),
  statusIdx: index("idx_bids_status").on(table.status),
  rideStatusIdx: index("idx_bids_ride_status").on(table.rideId, table.status),
  createdAtIdx: index("idx_bids_created_at").on(table.createdAt),
}));

// Extended bid type for queries that include driver information
export type BidWithDriver = typeof bids.$inferSelect & {
  driverName?: string;
};

export const bidsRelations = relations(bids, ({ one, many }: { one: any, many: any }) => ({
  ride: one(rides, { fields: [bids.rideId], references: [rides.id] }),
  driver: one(users, { fields: [bids.driverId], references: [users.id] }),
  // Self-referencing relation for counter-offers
  parentBid: one(bids, { fields: [bids.parentBidId], references: [bids.id], relationName: "counterOffers" }),
  counterOffers: many(bids, { relationName: "counterOffers" }),
}));

// Saved addresses for quick booking
export const savedAddresses = pgTable("saved_addresses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(), // e.g., "Home", "Work", "Doctor's Office"
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  addressType: text("address_type", { 
    enum: ["home", "work", "medical", "family", "other"] 
  }).notNull(),
  isDefault: boolean("is_default").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const savedAddressesRelations = relations(savedAddresses, ({ one }: { one: any }) => ({
  user: one(users, { fields: [savedAddresses.userId], references: [users.id] }),
}));

// Hidden rides for drivers
export const hiddenRides = pgTable("hidden_rides", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull().references(() => users.id),
  rideId: integer("ride_id").notNull().references(() => rides.id),
  hiddenAt: timestamp("hidden_at").defaultNow().notNull(),
});

export const hiddenRidesRelations = relations(hiddenRides, ({ one }: { one: any }) => ({
  driver: one(users, { fields: [hiddenRides.driverId], references: [users.id] }),
  ride: one(rides, { fields: [hiddenRides.rideId], references: [rides.id] }),
}));

// Ride edit proposals
export const rideEdits = pgTable("ride_edits", {
  id: serial("id").primaryKey(),
  rideId: integer("ride_id").notNull().references(() => rides.id),
  requestedById: integer("requested_by_id").notNull().references(() => users.id),
  status: text("status", { 
    enum: ["pending", "accepted", "rejected"] 
  }).notNull().default("pending"),
  originalData: json("original_data").notNull(),
  proposedData: json("proposed_data").notNull(),
  requestNotes: text("request_notes"),
  responseNotes: text("response_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  respondedAt: timestamp("responded_at"),
});

export const rideEditsRelations = relations(rideEdits, ({ one }: { one: any }) => ({
  ride: one(rides, { fields: [rideEdits.rideId], references: [rides.id] }),
  requestedBy: one(users, { fields: [rideEdits.requestedById], references: [users.id] }),
}));

// Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type", { 
    enum: ["RIDE_CANCELLED", "RIDE_CONFIRMED", "NEW_BID", "BID_ACCEPTED", 
           "DRIVER_ARRIVED", "RIDE_STARTED", "RIDE_COMPLETED", "COUNTER_OFFER_RECEIVED", 
           "PAYMENT_RECEIVED", "PAYMENT_FAILED", "RIDE_EDIT_REQUESTED", 
           "RIDE_EDIT_ACCEPTED", "RIDE_EDIT_REJECTED", "DRIVER_ETA_UPDATE",
           "BID_SELECTED", "BID_REJECTED", "MULTIPLE_BIDS_RECEIVED"]
  }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  imageUrl: text("image_url"),
  link: text("link"),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  metadata: json("metadata"),
}, (table) => ({
  userIdIdx: index("idx_notifications_user_id").on(table.userId),
  userUnreadIdx: index("idx_notifications_user_unread").on(table.userId, table.read),
  createdAtIdx: index("idx_notifications_created_at").on(table.createdAt),
}));

export const notificationsRelations = relations(notifications, ({ one }: { one: any }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

// Legal agreement signatures
export const legalAgreementSignatures = pgTable("legal_agreement_signatures", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  documentType: text("document_type", { 
    enum: ["platform_user_agreement", "privacy_policy", "driver_agreement", "terms_of_service", "rider_agreement", "beta_testing_agreement", "liability_waiver"] 
  }).notNull(),
  documentVersion: text("document_version").notNull(), // e.g., "1.0", "2.1"
  signedAt: timestamp("signed_at").defaultNow().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  isRequired: boolean("is_required").default(true).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const legalAgreementSignaturesRelations = relations(legalAgreementSignatures, ({ one }: { one: any }) => ({
  user: one(users, { fields: [legalAgreementSignatures.userId], references: [users.id] }),
}));

// Ratings
export const ratings = pgTable("ratings", {
  id: serial("id").primaryKey(),
  rideId: integer("ride_id").notNull().references(() => rides.id),
  fromUserId: integer("from_user_id").notNull().references(() => users.id),
  toUserId: integer("to_user_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(), // 1-5 star rating
  comment: text("comment"),
  categories: json("categories").default('{}'), // e.g. {"punctuality": 5, "cleanliness": 4, "vehicle_condition": 4}
  anonymous: boolean("anonymous").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  
  // Enhanced fields for detailed criteria
  detailedFeedback: text("detailed_feedback"), // More specific feedback beyond the general comment
  improvementAreas: json("improvement_areas").default('[]'), // Array of improvement suggestions
  
  // Fields for recognizing exceptional service
  highlightedStrengths: json("highlighted_strengths").default('[]'), // Array of exceptional service highlights
  recommendationScore: integer("recommendation_score"), // NPS-like score: 0-10 "How likely are you to recommend this driver?"
  taggedAttributes: json("tagged_attributes").default('[]'), // Positive tags like "friendly", "professional", "patient"
});

// New table for driver responses to ratings
export const ratingResponses = pgTable("rating_responses", {
  id: serial("id").primaryKey(),
  ratingId: integer("rating_id").notNull().references(() => ratings.id).unique(), // One response per rating
  responderId: integer("responder_id").notNull().references(() => users.id), // The driver responding
  response: text("response").notNull(), // The text response
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isFlagged: boolean("is_flagged").default(false), // For inappropriate responses
  isPublic: boolean("is_public").default(true), // Whether the response is visible to all users
});

// New table for performance incentives and achievements
export const driverAchievements = pgTable("driver_achievements", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull().references(() => users.id),
  achievementType: text("achievement_type", {
    enum: ["rating_milestone", "ride_count", "consistency", "improvement", "customer_favorite"]
  }).notNull(),
  title: text("title").notNull(), // e.g., "5-Star Excellence", "100 Rides Completed"
  description: text("description").notNull(),
  dateAwarded: timestamp("date_awarded").defaultNow().notNull(),
  expiryDate: timestamp("expiry_date"), // Optional expiration for time-limited achievements
  iconUrl: text("icon_url"),
  rewardPoints: integer("reward_points").default(0), // Points that can be used for rewards
  isActive: boolean("is_active").default(true),
  metadata: json("metadata").default('{}'), // Additional achievement data
});

export const ratingsRelations = relations(ratings, ({ one, many }: { one: any, many: any }) => ({
  ride: one(rides, { fields: [ratings.rideId], references: [rides.id] }),
  fromUser: one(users, { fields: [ratings.fromUserId], references: [users.id] }),
  toUser: one(users, { fields: [ratings.toUserId], references: [users.id] }),
  response: one(ratingResponses, { fields: [ratings.id], references: [ratingResponses.ratingId] }),
}));

export const ratingResponsesRelations = relations(ratingResponses, ({ one }: { one: any }) => ({
  rating: one(ratings, { fields: [ratingResponses.ratingId], references: [ratings.id] }),
  responder: one(users, { fields: [ratingResponses.responderId], references: [users.id] }),
}));

export const driverAchievementsRelations = relations(driverAchievements, ({ one }: { one: any }) => ({
  driver: one(users, { fields: [driverAchievements.driverId], references: [users.id] }),
}));

// Documents table for unified document storage
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  documentType: text("document_type").notNull(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  verificationStatus: text("verification_status", { 
    enum: ["pending", "approved", "rejected"] 
  }).default("pending").notNull(),
  rejectionReason: text("rejection_reason"),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: integer("verified_by").references(() => users.id),
}, (table) => ({
  userIdIdx: index("idx_documents_user_id").on(table.userId),
  documentTypeIdx: index("idx_documents_document_type").on(table.documentType),
  verificationStatusIdx: index("idx_documents_verification_status").on(table.verificationStatus),
}));

export const documentsRelations = relations(documents, ({ one }: { one: any }) => ({
  user: one(users, { fields: [documents.userId], references: [users.id] }),
  verifiedByUser: one(users, { fields: [documents.verifiedBy], references: [users.id] }),
}));

// Payment records
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  rideId: integer("ride_id").notNull().references(() => rides.id),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: doublePrecision("amount").notNull(),
  status: text("status", { 
    enum: ["pending", "processing", "succeeded", "failed", "refunded", "admin_override"] 
  }).notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  transactionFee: doublePrecision("transaction_fee"),
  refundAmount: doublePrecision("refund_amount"),
  notes: text("notes"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  rideIdIdx: index("idx_payments_ride_id").on(table.rideId),
  userIdIdx: index("idx_payments_user_id").on(table.userId),
  statusIdx: index("idx_payments_status").on(table.status),
  createdAtIdx: index("idx_payments_created_at").on(table.createdAt),
}));

export const paymentsRelations = relations(payments, ({ one }: { one: any }) => ({
  ride: one(rides, { fields: [payments.rideId], references: [rides.id] }),
  user: one(users, { fields: [payments.userId], references: [users.id] }),
}));

// Admin notes for system actions
export const adminNotes = pgTable("admin_notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  rideId: integer("ride_id").references(() => rides.id),
  paymentId: integer("payment_id").references(() => payments.id),
  note: text("note").notNull(),
  recordType: text("record_type", { 
    enum: ["user", "ride", "payment", "driver", "system"] 
  }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Enhanced Payment Methods Table
export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  stripePaymentMethodId: text("stripe_payment_method_id"),
  paypalPaymentMethodId: text("paypal_payment_method_id"),
  type: text("type").notNull(), // 'card', 'paypal', 'bank_account'
  provider: text("provider").notNull(), // 'stripe', 'paypal'
  last4: text("last4"),
  brand: text("brand"), // 'visa', 'mastercard', etc.
  expiryMonth: integer("expiry_month"),
  expiryYear: integer("expiry_year"),
  holderName: text("holder_name"),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Enhanced Payment Transactions Table
export const paymentTransactions = pgTable("payment_transactions", {
  id: serial("id").primaryKey(),
  transactionId: text("transaction_id").notNull().unique(),
  rideId: integer("ride_id").references(() => rides.id),
  userId: integer("user_id").notNull().references(() => users.id),
  paymentMethodId: integer("payment_method_id").references(() => paymentMethods.id),
  
  // Payment processor details
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeChargeId: text("stripe_charge_id"),
  paypalOrderId: text("paypal_order_id"),
  paypalCaptureId: text("paypal_capture_id"),
  
  // Transaction details
  amount: doublePrecision("amount").notNull(),
  currency: text("currency").default("USD").notNull(),
  type: text("type").notNull(), // 'payment', 'refund', 'partial_refund', 'chargeback'
  status: text("status").notNull(), // 'pending', 'processing', 'succeeded', 'failed', 'canceled', 'refunded'
  provider: text("provider").notNull(), // 'stripe', 'paypal'
  
  // Fees and net amounts
  platformFee: doublePrecision("platform_fee"),
  processingFee: doublePrecision("processing_fee"),
  netAmount: doublePrecision("net_amount"),
  
  // Admin overrides
  adminOverride: boolean("admin_override").default(false),
  adminUserId: integer("admin_user_id").references(() => users.id),
  adminNotes: text("admin_notes"),
  
  // Error handling
  failureCode: text("failure_code"),
  failureMessage: text("failure_message"),
  
  // Metadata and tracking
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Refunds Table
export const refunds = pgTable("refunds", {
  id: serial("id").primaryKey(),
  refundId: text("refund_id").notNull().unique(),
  originalTransactionId: integer("original_transaction_id").notNull().references(() => paymentTransactions.id),
  
  // Refund processor details
  stripeRefundId: text("stripe_refund_id"),
  paypalRefundId: text("paypal_refund_id"),
  
  // Refund details
  amount: doublePrecision("amount").notNull(),
  currency: text("currency").default("USD").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull(),
  type: text("type").notNull(), // 'full', 'partial'
  
  // Admin details
  initiatedBy: text("initiated_by").notNull(),
  adminUserId: integer("admin_user_id").references(() => users.id),
  adminNotes: text("admin_notes"),
  
  // Processing details
  processingFee: doublePrecision("processing_fee"),
  netRefund: doublePrecision("net_refund"),
  
  // Error handling
  failureCode: text("failure_code"),
  failureMessage: text("failure_message"),
  
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Cancellation Policies Table
export const cancellationPolicies = pgTable("cancellation_policies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  vehicleType: text("vehicle_type"),
  
  // Time-based rules (hours before pickup)
  freeCancel: integer("free_cancel_hours").default(24),
  partialRefund: integer("partial_refund_hours").default(4),
  noRefund: integer("no_refund_hours").default(1),
  
  // Refund percentages
  partialRefundPercentage: doublePrecision("partial_refund_percentage").default(50.00),
  
  // Special circumstances
  emergencyOverride: boolean("emergency_override").default(true),
  medicalOverride: boolean("medical_override").default(true),
  weatherOverride: boolean("weather_override").default(true),
  
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Payment Method Audits Table
export const paymentMethodAudits = pgTable("payment_method_audits", {
  id: serial("id").primaryKey(),
  paymentMethodId: integer("payment_method_id").notNull().references(() => paymentMethods.id),
  action: text("action").notNull(),
  userId: integer("user_id").references(() => users.id),
  adminUserId: integer("admin_user_id").references(() => users.id),
  oldData: json("old_data"),
  newData: json("new_data"),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertUserProfileSchema = createInsertSchema(userProfiles)
  .omit({ id: true })
  .extend({
    // Override date fields with union to handle string dates
    dateOfBirth: z.union([z.date(), z.string().transform(val => new Date(val))]).optional(),
    
    // Add validation for banking fields
    accountHolderName: z.string().optional(),
    accountType: z.enum(["checking", "savings"]).optional(),
    bankName: z.string().optional(),
    routingNumber: z.string().min(9).max(9).optional(),
    accountNumber: z.string().min(4).max(17).optional(),
    billingAddress: z.string().optional(),
    billingCity: z.string().optional(),
    billingState: z.string().optional(),
    billingZipCode: z.string().optional(),
    paymentPreference: z.enum(["bank_account", "credit_card", "paypal"]).optional(),
  });
export const insertRatingSchema = createInsertSchema(ratings).omit({ id: true, createdAt: true });
export const insertRatingResponseSchema = createInsertSchema(ratingResponses).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDriverAchievementSchema = createInsertSchema(driverAchievements).omit({ id: true, dateAwarded: true });
// Create schema with custom handling for date fields
export const insertDriverDetailsSchema = z.object({
  userId: z.number(),
  licenseNumber: z.string().min(1),
  licenseState: z.string().min(1),
  licenseExpiry: z.union([z.date(), z.string().transform(val => new Date(val))]),
  licenseClass: z.string().optional(),
  licensePhotoFront: z.string().optional(),
  licensePhotoBack: z.string().optional(),
  
  insuranceProvider: z.string().min(1),
  insuranceNumber: z.string().min(1),
  insuranceExpiry: z.union([z.date(), z.string().transform(val => new Date(val))]),
  insuranceDocumentUrl: z.string().optional(),
  
  yearsOfExperience: z.number().optional(),
  medicalTrainingLevel: z.enum(["none", "first_aid", "cpr_certified", "emt_basic", "emt_advanced", "paramedic"]).optional(),
  certifications: z.any().optional(),
  certificationDocuments: z.any().optional(),
  
  serviceArea: z.any(),
  serviceHours: z.any(),
  preferredVehicleTypes: z.any().optional(),
  maxTravelDistance: z.number().optional(),
  
  biography: z.string().optional(),
  profilePhoto: z.string().optional(),
  languages: z.any().optional(),
  
  backgroundCheckStatus: z.enum(["pending", "approved", "rejected"]),
  backgroundCheckDate: z.union([z.date(), z.string().transform(val => new Date(val))]).optional(),
  verified: z.boolean().optional(),
  accountStatus: z.enum(["pending", "active", "suspended", "rejected"]).default("pending"),
  
  completedRides: z.number().optional(),
  cancelledRides: z.number().optional(),
  averageRating: z.number().optional(),
});
export const insertVehicleSchema = z.object({
  driverId: z.number(),
  vehicleType: z.enum(["standard", "wheelchair", "stretcher"]),
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.union([z.number(), z.string().transform(val => parseInt(val, 10))]),
  licensePlate: z.string().min(1),
  color: z.string().min(1),
  capacity: z.union([z.number(), z.string().transform(val => parseInt(val, 10))]),
  wheelchairCapacity: z.union([z.number(), z.string().transform(val => parseInt(val, 10))]).optional(),
  stretcherCapacity: z.union([z.number(), z.string().transform(val => parseInt(val, 10))]).optional(),
  hasRamp: z.boolean().optional(),
  hasLift: z.boolean().optional(),
  photo: z.string().optional(),
});

// Schema for driver registration progress
export const insertDriverRegistrationProgressSchema = createInsertSchema(driverRegistrationProgress)
  .omit({ id: true, lastSaved: true });

// Create schema for recurring appointments
export const insertRecurringAppointmentSchema = createInsertSchema(recurringAppointments)
  .omit({ id: true, createdAt: true, updatedAt: true, lastGeneratedDate: true })
  .extend({
    // Handle date fields
    startDate: z.union([z.date(), z.string().transform(val => new Date(val))]),
    endDate: z.union([z.date(), z.string().transform(val => new Date(val))]).optional(),
    appointmentTime: z.union([z.date(), z.string().transform(val => new Date(val))]),
    returnTime: z.union([z.date(), z.string().transform(val => new Date(val))]).optional(),
    daysOfWeek: z.any().optional(),
  });

// Create schema for rides with custom date handling
export const insertRideSchema = z.object({
  riderId: z.number(),
  referenceNumber: z.string().optional(),
  driverId: z.number().optional(),
  recurringAppointmentId: z.number().optional(),
  status: z.enum([
    "requested", "bidding", "scheduled", "payment_pending", "paid", 
    "en_route", "arrived", "in_progress", "completed", "cancelled", "edit_pending"
  ]),
  pickupLocation: z.string(),
  pickupLocationLat: z.number().optional(),
  pickupLocationLng: z.number().optional(),
  dropoffLocation: z.string(),
  dropoffLocationLat: z.number().optional(),
  dropoffLocationLng: z.number().optional(),
  scheduledTime: z.union([z.date(), z.string().transform(val => new Date(val))]),
  estimatedDistance: z.number().optional(),
  vehicleType: z.enum(["standard", "wheelchair", "stretcher"]),
  riderBid: z.number().optional(),
  finalPrice: z.number().optional(),
  pickupStairs: z.enum(["none", "1-3", "4-10", "11+", "full_flight"]).optional(),
  dropoffStairs: z.enum(["none", "1-3", "4-10", "11+", "full_flight"]).optional(),
  needsRamp: z.boolean().optional().default(false),
  needsCompanion: z.boolean().optional().default(false),
  needsStairChair: z.boolean().optional().default(false),
  needsWaitTime: z.boolean().optional().default(false),
  waitTimeMinutes: z.number().optional().default(0),
  specialInstructions: z.string().optional(),
  
  // Round trip fields
  isRoundTrip: z.boolean().optional().default(false),
  returnTime: z.union([z.date(), z.string().transform(val => new Date(val))]).optional(),
  returnPickupLocation: z.string().optional(),
  returnDropoffLocation: z.string().optional(),
  returnPickupLocationLat: z.number().optional(),
  returnPickupLocationLng: z.number().optional(),
  returnDropoffLocationLat: z.number().optional(),
  returnDropoffLocationLng: z.number().optional(),
  returnEstimatedDistance: z.number().optional(),
});
export const insertBidSchema = createInsertSchema(bids).omit({ id: true, createdAt: true });
export const insertSavedAddressSchema = createInsertSchema(savedAddresses).omit({ id: true, createdAt: true });
export const insertRideEditSchema = createInsertSchema(rideEdits).omit({ id: true, createdAt: true, respondedAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });
export const insertAdminNoteSchema = createInsertSchema(adminNotes).omit({ id: true, createdAt: true });
export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPaymentTransactionSchema = createInsertSchema(paymentTransactions).omit({ id: true, createdAt: true });
export const insertRefundSchema = createInsertSchema(refunds).omit({ id: true, createdAt: true });
export const insertCancellationPolicySchema = createInsertSchema(cancellationPolicies).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPaymentMethodAuditSchema = createInsertSchema(paymentMethodAudits).omit({ id: true, createdAt: true });
export const insertLegalAgreementSignatureSchema = createInsertSchema(legalAgreementSignatures).omit({ id: true, signedAt: true });

// Authentication schema (for login)
export const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type InsertDriverDetails = z.infer<typeof insertDriverDetailsSchema>;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type InsertRide = z.infer<typeof insertRideSchema>;
export type InsertBid = z.infer<typeof insertBidSchema>;
export type InsertRating = z.infer<typeof insertRatingSchema>;
export type InsertRecurringAppointment = z.infer<typeof insertRecurringAppointmentSchema>;
export type LoginData = z.infer<typeof loginSchema>;

export type User = typeof users.$inferSelect & {
  // Extended properties for UI purposes
  hasPaymentMethod?: boolean;
  hasSavedAddresses?: boolean;
  // Any other UI-specific properties we need
};

// Create an extended user type for the frontend
export const extendedUserSchema = z.object({
  id: z.number(),
  username: z.string(),
  fullName: z.string(),
  email: z.string().email(),
  emailVerified: z.boolean().nullable(),
  phone: z.string(),
  phoneVerified: z.boolean().nullable(),
  role: z.enum(["rider", "driver", "admin"]),
  profileImageUrl: z.string().nullable(),
  lastLogin: z.date().nullable(),
  accountStatus: z.enum(["active", "suspended", "inactive", "pending"]),
  preferredLanguage: z.string(),
  timezone: z.string(),
  isOnboarded: z.boolean(),
  createdAt: z.date(),
  hasPaymentMethod: z.boolean().optional(),
  hasSavedAddresses: z.boolean().optional(),
});
export type UserProfile = typeof userProfiles.$inferSelect;
export type DriverDetails = typeof driverDetails.$inferSelect;
export type Vehicle = typeof vehicles.$inferSelect;
export type Ride = typeof rides.$inferSelect;
export type Bid = typeof bids.$inferSelect;
export type SavedAddress = typeof savedAddresses.$inferSelect;
export type RideEdit = typeof rideEdits.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Rating = typeof ratings.$inferSelect;
export type RecurringAppointment = typeof recurringAppointments.$inferSelect;
export type InsertSavedAddress = z.infer<typeof insertSavedAddressSchema>;
export type InsertRideEdit = z.infer<typeof insertRideEditSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Payment = typeof payments.$inferSelect;
export type AdminNote = typeof adminNotes.$inferSelect;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type Refund = typeof refunds.$inferSelect;
export type CancellationPolicy = typeof cancellationPolicies.$inferSelect;
export type PaymentMethodAudit = typeof paymentMethodAudits.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type InsertAdminNote = z.infer<typeof insertAdminNoteSchema>;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type InsertPaymentTransaction = z.infer<typeof insertPaymentTransactionSchema>;
export type InsertRefund = z.infer<typeof insertRefundSchema>;
export type InsertCancellationPolicy = z.infer<typeof insertCancellationPolicySchema>;
export type InsertPaymentMethodAudit = z.infer<typeof insertPaymentMethodAuditSchema>;

// Legal agreement signature types
export type LegalAgreementSignature = typeof legalAgreementSignatures.$inferSelect;
export type InsertLegalAgreementSignature = z.infer<typeof insertLegalAgreementSignatureSchema>;

// New rating-related types
export type RatingResponse = typeof ratingResponses.$inferSelect;
export type DriverAchievement = typeof driverAchievements.$inferSelect;
export type InsertRatingResponse = z.infer<typeof insertRatingResponseSchema>;
export type InsertDriverAchievement = z.infer<typeof insertDriverAchievementSchema>;

// Chat related tables
export const messageStatusEnum = pgEnum('message_status', ['sent', 'delivered', 'read']);

export const chatConversations = pgTable("chat_conversations", {
  id: serial("id").primaryKey(),
  rideId: integer("ride_id").references(() => rides.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const chatConversationsRelations = relations(chatConversations, ({ one, many }) => ({
  ride: one(rides, { fields: [chatConversations.rideId], references: [rides.id] }),
  participants: many(chatParticipants),
  messages: many(chatMessages),
}));

export const chatParticipants = pgTable("chat_participants", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => chatConversations.id),
  userId: integer("user_id").notNull().references(() => users.id),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  lastReadAt: timestamp("last_read_at"),
});

export const chatParticipantsRelations = relations(chatParticipants, ({ one }) => ({
  conversation: one(chatConversations, { fields: [chatParticipants.conversationId], references: [chatConversations.id] }),
  user: one(users, { fields: [chatParticipants.userId], references: [users.id] }),
}));

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => chatConversations.id),
  senderId: integer("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  status: messageStatusEnum("status").default('sent').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  attachmentUrl: text("attachment_url"),
  attachmentType: text("attachment_type"),
  isSystemMessage: boolean("is_system_message").default(false),
}, (table) => ({
  conversationIdIdx: index("idx_chat_messages_conversation_id").on(table.conversationId),
  createdAtIdx: index("idx_chat_messages_created_at").on(table.createdAt),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  conversation: one(chatConversations, { fields: [chatMessages.conversationId], references: [chatConversations.id] }),
  sender: one(users, { fields: [chatMessages.senderId], references: [users.id] }),
}));

// Add relationship to user for chat participants
export const userRelationsWithChat = relations(users, ({ many }) => ({
  chatParticipations: many(chatParticipants),
  sentMessages: many(chatMessages, { relationName: "sender" }),
}));

// Create insert schemas for chat tables
export const insertChatConversationSchema = createInsertSchema(chatConversations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertChatParticipantSchema = createInsertSchema(chatParticipants).omit({ id: true, joinedAt: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true });

// Export types for chat
export type ChatConversation = typeof chatConversations.$inferSelect;
export type ChatParticipant = typeof chatParticipants.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatConversation = z.infer<typeof insertChatConversationSchema>;
export type InsertChatParticipant = z.infer<typeof insertChatParticipantSchema>;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// Advanced Ride Filtering System
export const driverRideFilters = pgTable("driver_ride_filters", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull().references(() => driverDetails.id),
  name: text("name").notNull(),
  isDefault: boolean("is_default").default(false),
  
  // Distance filters
  maxDistance: integer("max_distance"), // in miles
  minDistance: integer("min_distance"), // in miles
  serviceBoundaries: json("service_boundaries").default('[]'), // Array of geocoordinates defining service area
  
  // Payment filters
  minPrice: doublePrecision("min_price"),
  pricePerMile: doublePrecision("price_per_mile"),
  pricePerMinute: doublePrecision("price_per_minute"),
  
  // Accessibility filters
  vehicleTypes: json("vehicle_types").default('["standard"]'), // Array of vehicle types
  canProvideRamp: boolean("can_provide_ramp"),
  canProvideCompanion: boolean("can_provide_companion"),
  canProvideStairChair: boolean("can_provide_stair_chair"),
  maxWaitTimeMinutes: integer("max_wait_time_minutes"),
  
  // Time filters
  timeWindows: json("time_windows").default('[]'), // JSON array of time windows
  excludeHolidays: boolean("exclude_holidays").default(false),
  
  // Patient condition filters
  patientConditions: json("patient_conditions").default('[]'), // Array of conditions driver can handle
  mobilityLevels: json("mobility_levels").default('[]'), // Array of mobility levels
  specialEquipment: json("special_equipment").default('[]'), // Array of special equipment
  
  // Other preferences
  preferRoundTrips: boolean("prefer_round_trips"),
  preferRegularClients: boolean("prefer_regular_clients"),
  notificationEnabled: boolean("notification_enabled").default(true),
  priority: integer("priority").default(1), // Priority level for matching (higher gets first notification)
  
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations for driver ride filters
export const driverRideFiltersRelations = relations(driverRideFilters, ({ one }) => ({
  driverDetails: one(driverDetails, { fields: [driverRideFilters.driverId], references: [driverDetails.id] }),
}));

// Add relation to driverDetailsRelations
// (Need to update the existing relation)

// Create insert schemas
export const insertDriverRideFilterSchema = createInsertSchema(driverRideFilters)
  .omit({ id: true, createdAt: true, updatedAt: true });

// Create types
export type DriverRideFilter = typeof driverRideFilters.$inferSelect;
export type InsertDriverRideFilter = z.infer<typeof insertDriverRideFilterSchema>;

// Hidden rides schema and types
export const insertHiddenRideSchema = createInsertSchema(hiddenRides).omit({ id: true, hiddenAt: true });
export type HiddenRide = typeof hiddenRides.$inferSelect;
export type InsertHiddenRide = z.infer<typeof insertHiddenRideSchema>;

// Promo code insert schemas
export const insertPromoCodeSchema = createInsertSchema(promoCodes)
  .omit({ id: true, usedCount: true, createdAt: true, updatedAt: true });

export const insertPromoCodeUsageSchema = createInsertSchema(promoCodeUsage)
  .omit({ id: true, usedAt: true });

// Promo code types
export type PromoCode = typeof promoCodes.$inferSelect;
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;
export type PromoCodeUsage = typeof promoCodeUsage.$inferSelect;
export type InsertPromoCodeUsage = z.infer<typeof insertPromoCodeUsageSchema>;

// Driver payout insert schema
export const insertDriverPayoutSchema = createInsertSchema(driverPayouts)
  .omit({ id: true, createdAt: true, updatedAt: true });

// Driver payout types
export type DriverPayout = typeof driverPayouts.$inferSelect;
export type InsertDriverPayout = z.infer<typeof insertDriverPayoutSchema>;

// Platform settings insert schema
export const insertPlatformSettingSchema = createInsertSchema(platformSettings)
  .omit({ id: true, createdAt: true, updatedAt: true });

// Platform settings types
export type PlatformSetting = typeof platformSettings.$inferSelect;
export type InsertPlatformSetting = z.infer<typeof insertPlatformSettingSchema>;

// Document insert schema and types
export const insertDocumentSchema = createInsertSchema(documents)
  .omit({ id: true, uploadedAt: true, verifiedAt: true });

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
