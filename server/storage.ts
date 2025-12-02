import { 
  users, 
  userProfiles, 
  driverDetails,
  driverRegistrationProgress,
  riderOnboardingProgress,
  driverOnboardingProgress,
  vehicles, 
  rides, 
  bids,
  savedAddresses,
  rideEdits,
  ratings,
  ratingResponses,
  driverAchievements,
  chatConversations,
  chatParticipants,
  chatMessages,
  payments,
  adminNotes,
  paymentMethods,
  paymentTransactions,
  refunds,
  cancellationPolicies,
  paymentMethodAudits,
  recurringAppointments,
  driverAvailabilitySchedules,
  driverBlockedTimes,
  driverRideFilters,
  hiddenRides,
  promoCodes,
  promoCodeUsage,
  legalAgreementSignatures,
  documents,
  type User, 
  type UserProfile, 
  type DriverDetails, 
  type Vehicle, 
  type Ride, 
  type Bid, 
  type SavedAddress,
  type RideEdit,
  type Rating,
  type ChatConversation,
  type ChatParticipant,
  type ChatMessage,
  type Payment,
  type AdminNote,
  type PaymentMethod,
  type PaymentTransaction,
  type Refund,
  type CancellationPolicy,
  type PaymentMethodAudit,
  type RecurringAppointment,
  type DriverAvailabilitySchedule,
  type DriverBlockedTime,
  type RatingResponse,
  type DriverAchievement,
  type RiderOnboardingProgress,
  type DriverOnboardingProgress,
  type PromoCode,
  type PromoCodeUsage,
  type LegalAgreementSignature,
  type InsertLegalAgreementSignature,
  type InsertUser,
  type InsertUserProfile,
  type InsertDriverDetails,
  type InsertVehicle,
  type InsertRide,
  type InsertBid,
  type InsertSavedAddress,
  type InsertRideEdit,
  type InsertRating,
  type InsertPayment,
  type InsertAdminNote,
  type InsertRecurringAppointment,
  type InsertChatConversation,
  type InsertChatParticipant,
  type InsertChatMessage,
  type InsertDriverAvailabilitySchedule,
  type InsertDriverBlockedTime,
  type DriverRideFilter,
  type InsertDriverRideFilter,
  type HiddenRide,
  type InsertHiddenRide,
  type InsertRatingResponse,
  type InsertDriverAchievement,
  type InsertRiderOnboardingProgress,
  type InsertDriverOnboardingProgress,
  type InsertPromoCode,
  type InsertPromoCodeUsage,
  driverPayouts,
  type DriverPayout,
  type InsertDriverPayout,
  platformSettings,
  type PlatformSetting,
  type InsertPlatformSetting,
  type Document,
  type InsertDocument
} from "@shared/schema";
import session from "express-session";
import { Store } from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { db } from "./db";
import { and, asc, count, desc, eq, exists, gte, lte, ne, not, or, sql, isNull, inArray } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

// Analytics response types
export interface DriverStatistics {
  totalRides: number;
  completedRides: number;
  cancelledRides: number;
  averageRating: number;
  totalEarnings: number;
  currentMonthEarnings: number;
  lastMonthEarnings: number;
  onTimePercentage: number;
}

export interface EarningsData {
  timeframe: string;
  data: Array<{
    date: string;
    amount: number;
    rides: number;
  }>;
  summary: {
    totalEarnings: number;
    totalRides: number;
    averagePerRide: number;
    comparisonPeriodChange: number; // percentage change from previous period
  };
}

export interface RideHistoryOptions {
  status?: string;
  startDate?: Date;
  endDate?: Date;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface RideHistoryResult {
  rides: Ride[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export interface RiderStatistics {
  totalRides: number;
  completedRides: number;
  cancelledRides: number;
  totalSpent: number;
  averageRidePrice: number;
  mostFrequentDestination: string;
  averageDriverRating: number;
}

export interface AdminDashboardData {
  overviewStats: {
    totalUsers: number;
    totalRiders: number;
    totalDrivers: number;
    totalRides: number;
    ridesThisMonth: number;
    ridesLastMonth: number;
    pendingDriverVerifications: number;
    activeRides: number;
  };
  revenueData: {
    timeframe: string;
    data: Array<{
      date: string;
      revenue: number;
      rides: number;
    }>;
    totalRevenue: number;
    comparisonToLastPeriod: number;
  };
  userGrowth: {
    timeframe: string;
    data: Array<{
      date: string;
      riders: number;
      drivers: number;
    }>;
  };
  rideStatistics: {
    byVehicleType: Array<{
      vehicleType: string;
      count: number;
      percentage: number;
    }>;
    byStatus: Array<{
      status: string;
      count: number;
      percentage: number;
    }>;
  };
}

export interface IStorage {
  // User related methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  
  // UserProfile methods
  getUserProfile(userId: number): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: number, profile: Partial<UserProfile>): Promise<UserProfile | undefined>;
  
  // Driver Registration Progress methods
  getDriverRegistrationProgress(userId: number): Promise<any | undefined>;
  saveDriverRegistrationProgress(userId: number, progress: any): Promise<any>;
  clearDriverRegistrationProgress(userId: number): Promise<boolean>;
  saveDriverDocument(userId: number, documentData: {
    type: string;
    filePath: string;
    fileName: string;
    originalName: string;
    mimeType: string;
    size: number;
  }): Promise<any>;
  getPricingSettings(): Promise<any>;
  
  // DriverDetails methods
  getDriverDetails(userId: number): Promise<DriverDetails | undefined>;
  getDriverDetailsByDriverId(driverDetailsId: number): Promise<DriverDetails | undefined>;
  getVerifiedDrivers(): Promise<DriverDetails[]>;
  getPendingDrivers(): Promise<DriverDetails[]>;
  createDriverDetails(details: InsertDriverDetails): Promise<DriverDetails>;
  updateDriverDetails(userId: number, details: Partial<DriverDetails>): Promise<DriverDetails | undefined>;
  
  // Vehicle methods
  getVehicle(id: number): Promise<Vehicle | undefined>;
  getVehiclesByDriver(driverId: number): Promise<Vehicle[]>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  
  // Analytics methods
  getDriverStatistics(driverId: number): Promise<DriverStatistics>;
  getDriverEarnings(driverId: number, timeframe: string, startDate?: Date, endDate?: Date): Promise<EarningsData>;
  getDriverRideHistory(driverId: number, page: number, limit: number, options?: RideHistoryOptions): Promise<RideHistoryResult>;
  getRiderStatistics(riderId: number): Promise<RiderStatistics>;
  getRiderRideHistory(riderId: number, page: number, limit: number, options?: RideHistoryOptions): Promise<RideHistoryResult>;
  getAdminDashboardData(timeframe: string): Promise<AdminDashboardData>;
  updateVehicle(id: number, vehicle: Partial<Vehicle>): Promise<Vehicle | undefined>;
  
  // Ride methods
  getRide(id: number): Promise<Ride | undefined>;
  getRidesByRider(riderId: number): Promise<Ride[]>;
  getRidesByDriver(driverId: number): Promise<Ride[]>;
  getActiveRideRequests(): Promise<Ride[]>;
  createRide(ride: InsertRide): Promise<Ride>;
  updateRide(id: number, ride: Partial<Ride>): Promise<Ride | undefined>;
  deleteRide(id: number): Promise<boolean>;
  
  // Bid methods
  getBid(id: number): Promise<Bid | undefined>;
  getBidsByRide(rideId: number): Promise<Bid[]>;
  getBidsByDriver(driverId: number): Promise<Bid[]>;
  createBid(bid: InsertBid): Promise<Bid>;
  updateBid(id: number, bid: Partial<Bid>): Promise<Bid | undefined>;
  getDriverBidForRide(driverId: number, rideId: number): Promise<Bid | undefined>;
  updateBidStatus(bidId: number, status: string): Promise<Bid | undefined>;
  getRideBids(rideId: number): Promise<Bid[]>;
  updateRideStatus(rideId: number, status: string): Promise<Ride | undefined>;
  getCounterOffers(bidId: number): Promise<Bid[]>;
  createCounterOffer(
    originalBidId: number, 
    counterParty: 'rider' | 'driver',
    amount: number,
    notes?: string
  ): Promise<Bid | undefined>;
  getBidHistory(bidId: number): Promise<Bid[]>;
  acceptBid(bidId: number, rideId: number): Promise<Ride | undefined>;
  
  // Saved Address methods
  getSavedAddressById(id: number): Promise<SavedAddress | undefined>;
  getSavedAddressesByUserId(userId: number): Promise<SavedAddress[]>;
  createSavedAddress(address: InsertSavedAddress): Promise<SavedAddress>;
  updateSavedAddress(id: number, address: Partial<SavedAddress>): Promise<SavedAddress | undefined>;
  deleteSavedAddress(id: number): Promise<void>;
  unsetDefaultAddress(userId: number): Promise<void>;
  
  // Ride Edit methods
  getRideEdit(id: number): Promise<RideEdit | undefined>;
  getPendingRideEditsByRide(rideId: number): Promise<RideEdit[]>;
  createRideEdit(edit: InsertRideEdit): Promise<RideEdit>;
  respondToRideEdit(id: number, isAccepted: boolean, responseNotes?: string): Promise<RideEdit | undefined>;
  
  // Rating methods
  getRating(id: number): Promise<Rating | undefined>;
  getRatingsByUser(userId: number): Promise<Rating[]>;
  getRatingsByRide(rideId: number): Promise<Rating[]>;
  getUserRatings(userId: number, isRatingReceived: boolean): Promise<Rating[]>;
  createRating(rating: InsertRating): Promise<Rating>;
  
  // Rating responses methods
  getRatingResponse(ratingId: number): Promise<RatingResponse | undefined>;
  createRatingResponse(response: InsertRatingResponse): Promise<RatingResponse>;
  getRatingResponsesByUser(userId: number): Promise<RatingResponse[]>;

  // Driver achievements methods
  getDriverAchievements(driverId: number): Promise<DriverAchievement[]>;
  createDriverAchievement(achievement: InsertDriverAchievement): Promise<DriverAchievement>;
  checkAndCreateRatingAchievements(driverId: number, averageRating: number, totalRatings: number): Promise<void>;
  
  // Enhanced rating analytics
  getDetailedRatingAnalytics(userId: number): Promise<any>;
  
  // Stats methods
  getActiveRidersCount(): Promise<number>;
  getActiveDriversCount(): Promise<number>;
  getCompletedRidesCount(): Promise<number>;
  countUsersByRole(role: 'rider' | 'driver' | 'admin'): Promise<number>;
  countActiveDrivers(): Promise<number>;
  countPendingDrivers(): Promise<number>;
  countRidesByStatus(status: string): Promise<number>;
  calculateTotalRevenue(): Promise<number>;
  
  // Admin management methods
  getActiveRides(): Promise<Ride[]>;
  getActiveRideForDriver(driverId: number): Promise<Ride | undefined>;
  getAllUsers(): Promise<User[]>;
  updateUserStatus(userId: number, status: string): Promise<User | undefined>;
  hashPassword(password: string): Promise<string>;
  getPricingSettings(): Promise<Record<string, any>>;
  updatePricingSettings(settings: Record<string, any>): Promise<Record<string, any>>;
  
  // Chat methods
  // Conversation methods
  createChatConversation(conversation: InsertChatConversation): Promise<ChatConversation>;
  getChatConversation(id: number): Promise<ChatConversation | undefined>;
  getChatConversationByRide(rideId: number): Promise<ChatConversation | undefined>;
  getUserChatConversations(userId: number): Promise<ChatConversation[]>;
  
  // Chat participant methods
  addChatParticipant(participant: InsertChatParticipant): Promise<ChatParticipant>;
  getChatParticipants(conversationId: number): Promise<ChatParticipant[]>;
  getChatParticipant(conversationId: number, userId: number): Promise<ChatParticipant | undefined>;
  updateChatParticipantLastRead(conversationId: number, userId: number, lastReadMessageId: number): Promise<ChatParticipant | undefined>;
  
  // Chat message methods
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(conversationId: number, limit?: number, before?: number): Promise<ChatMessage[]>;
  getChatMessage(id: number): Promise<ChatMessage | undefined>;
  getUnreadMessageCount(conversationId: number, userId: number): Promise<number>;
  
  // Payment methods
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPayment(id: number): Promise<Payment | undefined>;
  getPaymentsByUser(userId: number): Promise<Payment[]>;
  getPaymentsByRide(rideId: number): Promise<Payment[]>;
  updatePayment(id: number, payment: Partial<Payment>): Promise<Payment | undefined>;
  
  // Admin notes methods
  createAdminNote(note: InsertAdminNote): Promise<AdminNote>;
  getAdminNotes(recordType: string, recordId: number): Promise<AdminNote[]>;
  
  // Recurring appointment methods
  getRecurringAppointment(id: number): Promise<RecurringAppointment | undefined>;
  getRecurringAppointmentsByUser(userId: number): Promise<RecurringAppointment[]>;
  createRecurringAppointment(appointment: InsertRecurringAppointment): Promise<RecurringAppointment>;
  updateRecurringAppointment(id: number, appointment: Partial<RecurringAppointment>): Promise<RecurringAppointment | undefined>;
  deleteRecurringAppointment(id: number): Promise<boolean>;
  
  // Driver availability schedule methods
  getDriverAvailabilitySchedule(id: number): Promise<DriverAvailabilitySchedule | undefined>;
  getDriverAvailabilitySchedules(driverId: number): Promise<DriverAvailabilitySchedule[]>;
  createDriverAvailabilitySchedule(schedule: InsertDriverAvailabilitySchedule): Promise<DriverAvailabilitySchedule>;
  updateDriverAvailabilitySchedule(id: number, schedule: Partial<DriverAvailabilitySchedule>): Promise<DriverAvailabilitySchedule | undefined>;
  deleteDriverAvailabilitySchedule(id: number): Promise<boolean>;
  
  // Driver blocked time methods
  getDriverBlockedTime(id: number): Promise<DriverBlockedTime | undefined>;
  getDriverBlockedTimes(driverId: number): Promise<DriverBlockedTime[]>;
  getDriverBlockedTimesByDateRange(driverId: number, startDate: Date, endDate: Date): Promise<DriverBlockedTime[]>;
  createDriverBlockedTime(blockedTime: InsertDriverBlockedTime): Promise<DriverBlockedTime>;
  
  // Rider onboarding progress methods
  getRiderOnboardingProgress(userId: number): Promise<RiderOnboardingProgress | undefined>;
  createRiderOnboardingProgress(progress: InsertRiderOnboardingProgress): Promise<RiderOnboardingProgress>;
  updateRiderOnboardingProgress(userId: number, progress: Partial<RiderOnboardingProgress>): Promise<RiderOnboardingProgress | undefined>;
  
  // Driver onboarding progress methods
  getDriverOnboardingProgress(userId: number): Promise<DriverOnboardingProgress | undefined>;
  createDriverOnboardingProgress(progress: InsertDriverOnboardingProgress): Promise<DriverOnboardingProgress>;
  updateDriverOnboardingProgress(userId: number, progress: Partial<DriverOnboardingProgress>): Promise<DriverOnboardingProgress | undefined>;
  updateDriverBlockedTime(id: number, blockedTime: Partial<DriverBlockedTime>): Promise<DriverBlockedTime | undefined>;
  deleteDriverBlockedTime(id: number): Promise<boolean>;
  
  // Driver ride filter methods
  getDriverRideFilterById(id: number): Promise<DriverRideFilter | undefined>;
  getDriverRideFilters(driverId: number): Promise<DriverRideFilter[]>;
  createDriverRideFilter(filter: InsertDriverRideFilter): Promise<DriverRideFilter>;
  updateDriverRideFilter(id: number, filter: Partial<DriverRideFilter>): Promise<DriverRideFilter | undefined>;
  deleteDriverRideFilter(id: number): Promise<boolean>;
  updateDriverRideFiltersDefaultStatus(driverId: number, filterId: number): Promise<boolean>;
  getFilteredRidesByDriver(driverId: number, filterId: number): Promise<Ride[]>;
  getDriverDetailsByUserId(userId: number): Promise<DriverDetails | undefined>;
  
  // Hidden rides methods
  hideRideForDriver(driverId: number, rideId: number): Promise<HiddenRide>;
  getHiddenRidesForDriver(driverId: number): Promise<HiddenRide[]>;
  isRideHiddenForDriver(driverId: number, rideId: number): Promise<boolean>;
  
  // Recurring appointment generation
  generateRidesFromAppointment(appointmentId: number, startDate: Date, endDate: Date): Promise<Ride[]>;

  // Analytics methods - Driver
  getDriverStatistics(driverId: number): Promise<{
    totalRides: number;
    completedRides: number;
    cancelledRides: number;
    totalEarnings: number;
    currentMonthEarnings: number;
    averageRating: number;
    onTimePercentage: number;
  }>;
  
  getDriverEarnings(
    driverId: number, 
    timeframe: string
  ): Promise<{
    timeframe: string;
    data: Array<{
      date: string;
      amount: number;
      rides: number;
    }>;
    summary: {
      totalEarnings: number;
      totalRides: number;
      averagePerRide: number;
      comparisonPeriodChange: number;
    };
  }>;
  
  getDriverRideHistory(
    driverId: number, 
    options: {
      page: number;
      pageSize: number;
      startDate?: Date;
      endDate?: Date;
      status?: string;
      sort: string;
      order: 'asc' | 'desc';
    }
  ): Promise<{
    rides: Ride[];
    total: number;
    totalPages: number;
  }>;

  // Analytics methods - Rider
  getRiderStatistics(riderId: number): Promise<{
    totalRides: number;
    completedRides: number;
    cancelledRides: number;
    totalSpent: number;
    currentMonthSpent: number;
    averageRating: number;
  }>;
  
  getRiderRideHistory(
    riderId: number, 
    options: {
      page: number;
      pageSize: number;
      startDate?: Date;
      endDate?: Date;
      status?: string;
      sort: string;
      order: 'asc' | 'desc';
    }
  ): Promise<{
    rides: Ride[];
    total: number;
    totalPages: number;
  }>;

  // Analytics methods - Admin
  getAdminDashboardData(): Promise<{
    userStats: {
      totalUsers: number;
      newUsersThisMonth: number;
      activeDrivers: number;
      activeRiders: number;
    };
    rideStats: {
      totalRides: number;
      completedRides: number;
      cancelledRides: number;
      ridesThisMonth: number;
    };
    financialStats: {
      totalRevenue: number;
      revenueThisMonth: number;
      averageFarePrice: number;
    };
    platformStats: {
      averageRating: number;
      disputeRate: number;
      avgResponseTime: number;
    };
  }>;

  // Driver membership management
  cancelDriverMembership(userId: number, reason: string): Promise<boolean>;
  
  // Promo code methods
  getPromoCodeByCode(code: string): Promise<PromoCode | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  recordPromoCodeUsage(usage: InsertPromoCodeUsage): Promise<PromoCodeUsage>;
  createPromoCodeUsage(usage: InsertPromoCodeUsage): Promise<PromoCodeUsage>;
  incrementPromoCodeUsage(promoCodeId: number): Promise<void>;
  updateRideWithPromoCode(rideId: number, finalAmount: number, promoCodeId: number): Promise<Ride | undefined>;
  incrementPromoCodeUsage(promoCodeId: number): Promise<void>;
  
  // Document storage methods
  saveDocument(document: InsertDocument): Promise<Document>;
  getUserDocuments(userId: number, documentType?: string): Promise<Document[]>;
  updateDocumentVerification(documentId: number, status: 'pending' | 'approved' | 'rejected', verifiedBy?: number, rejectionReason?: string): Promise<Document | undefined>;
  getDocumentById(documentId: number): Promise<Document | undefined>;
  deleteDocument(documentId: number): Promise<boolean>;
  
  // Session store
  sessionStore: Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: Store;
  
  constructor() {
    // Use PostgreSQL session store for production-ready session persistence
    console.log("Initializing PostgreSQL session store...");
    
    const pgSessionStore = new PostgresSessionStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      tableName: 'session',
      createTableIfMissing: false, // We manage schema via Drizzle
      pruneSessionInterval: 60 * 15, // Prune expired sessions every 15 minutes
    });

    this.sessionStore = pgSessionStore;
    console.log("✅ PostgreSQL session store initialized");
    
    // Bootstrap admin user from environment variable
    this.bootstrapAdminUser();
  }

  private async bootstrapAdminUser() {
    try {
      const existingAdmin = await this.getUserByUsername("admin");
      
      if (existingAdmin) {
        console.log("Admin user already exists, skipping creation");
        return;
      }

      const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;
      
      if (!adminPassword) {
        console.warn("⚠️  WARNING: ADMIN_INITIAL_PASSWORD not set. Admin user will not be created.");
        console.warn("⚠️  Please set ADMIN_INITIAL_PASSWORD environment variable to create admin account.");
        return;
      }

      console.log("Creating admin user from ADMIN_INITIAL_PASSWORD...");
      
      // Import hashPassword from auth module
      const { hashPassword } = await import("./auth");
      const hashedPassword = await hashPassword(adminPassword);
      
      await this.createUser({
        username: "admin",
        password: hashedPassword,
        fullName: "System Administrator",
        email: process.env.ADMIN_INITIAL_EMAIL || "admin@myambulex.com",
        phone: "555-123-4567",
        role: "admin",
      });
      
      console.log("✅ Admin user created successfully");
      console.log("⚠️  SECURITY: Please log in and change the admin password, then remove ADMIN_INITIAL_PASSWORD from your environment");
    } catch (err) {
      console.error("❌ Error during admin user bootstrap:", err);
    }
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      console.log(`Getting user with ID: ${id}`);
      
      if (!id || typeof id !== 'number') {
        console.error(`Invalid user ID: ${id}, type: ${typeof id}`);
        return undefined;
      }
      
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id));
      
      console.log(`User query result for ID ${id}: ${user ? "Found" : "Not found"}`);
      return user;
    } catch (error) {
      console.error(`Error retrieving user with ID ${id}:`, error);
      throw error;
    }
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      console.log(`Getting user with username: ${username}`);
      
      if (!username || typeof username !== 'string') {
        console.error(`Invalid username: ${username}, type: ${typeof username}`);
        return undefined;
      }
      
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username));
      
      console.log(`User query result for username ${username}: ${user ? "Found" : "Not found"}`);
      return user;
    } catch (error) {
      console.error(`Error retrieving user with username ${username}:`, error);
      throw error;
    }
  }

  async getLastUsernameChange(userId: number): Promise<Date | undefined> {
    try {
      // For now, return undefined to allow username changes
      // In production, you'd implement proper tracking
      return undefined;
    } catch (error) {
      console.error(`Error retrieving last username change for user ${userId}:`, error);
      return undefined;
    }
  }

  async recordUsernameChange(userId: number): Promise<void> {
    try {
      // For now, just log the change
      console.log(`Username changed for user ${userId} at ${new Date()}`);
    } catch (error) {
      console.error(`Error recording username change for user ${userId}:`, error);
      // Don't throw error to avoid blocking the update
    }
  }
  
  async getUsersByRole(role: string): Promise<User[]> {
    // Using raw SQL to avoid type issues
    const result = await db.execute(sql`SELECT * FROM users WHERE role = ${role}`);
    return result as unknown as User[];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      console.log(`Getting user with email: ${email}`);
      
      if (!email || typeof email !== 'string') {
        console.error(`Invalid email: ${email}, type: ${typeof email}`);
        return undefined;
      }
      
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
      
      console.log(`User query result for email ${email}: ${user ? "Found" : "Not found"}`);
      return user;
    } catch (error) {
      console.error(`Error retrieving user with email ${email}:`, error);
      throw error;
    }
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    try {
      console.log(`Getting user with reset token: ${token.substring(0, 8)}...`);
      
      if (!token || typeof token !== 'string') {
        console.error(`Invalid reset token: ${token}, type: ${typeof token}`);
        return undefined;
      }
      
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.passwordResetToken, token));
      
      console.log(`User query result for reset token: ${user ? "Found" : "Not found"}`);
      return user;
    } catch (error) {
      console.error(`Error retrieving user with reset token:`, error);
      throw error;
    }
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }
  
  // UserProfile methods
  async getUserProfile(userId: number): Promise<UserProfile | undefined> {
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    return profile;
  }
  
  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const [userProfile] = await db
      .insert(userProfiles)
      .values(profile)
      .returning();
    return userProfile;
  }
  
  async updateUserProfile(userId: number, profileData: Partial<UserProfile>): Promise<UserProfile | undefined> {
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    
    if (!profile) return undefined;
    
    const [updatedProfile] = await db
      .update(userProfiles)
      .set(profileData)
      .where(eq(userProfiles.id, profile.id))
      .returning();
    
    return updatedProfile;
  }
  
  // Driver Registration Progress methods
  async getDriverRegistrationProgress(userId: number): Promise<any | undefined> {
    try {
      const [progress] = await db
        .select()
        .from(driverRegistrationProgress)
        .where(eq(driverRegistrationProgress.userId, userId));
      return progress;
    } catch (error) {
      console.error("Error getting driver registration progress:", error);
      return undefined;
    }
  }
  
  async saveDriverRegistrationProgress(userId: number, progress: { step: number, formData: any, vehicleData: any, availabilitySettings?: any }): Promise<any> {
    try {
      console.log(`Saving registration progress for user ${userId}, step ${progress.step}`);
      
      // Check if there's already a progress record for this user
      const existingProgress = await this.getDriverRegistrationProgress(userId);
      
      if (existingProgress) {
        console.log("Updating existing registration progress record");
        // Update existing record
        const [updatedProgress] = await db
          .update(driverRegistrationProgress)
          .set({
            step: progress.step,
            formData: progress.formData,
            vehicleData: progress.vehicleData,
            availabilitySettings: progress.availabilitySettings,
            lastSaved: new Date()
          })
          .where(eq(driverRegistrationProgress.userId, userId))
          .returning();
        
        console.log("Updated progress:", updatedProgress);
        return updatedProgress;
      } else {
        console.log("Creating new registration progress record");
        // Create new record
        const [newProgress] = await db
          .insert(driverRegistrationProgress)
          .values({
            userId: userId,
            step: progress.step,
            formData: progress.formData,
            vehicleData: progress.vehicleData,
            availabilitySettings: progress.availabilitySettings,
            lastSaved: new Date()
          })
          .returning();
        
        console.log("New progress created:", newProgress);
        return newProgress;
      }
    } catch (error) {
      console.error("Error saving driver registration progress:", error);
      throw error;
    }
  }
  
  async clearDriverRegistrationProgress(userId: number): Promise<boolean> {
    try {
      console.log(`Clearing registration progress for user ${userId}`);
      const result = await db
        .delete(driverRegistrationProgress)
        .where(eq(driverRegistrationProgress.userId, userId));
      
      console.log("Registration progress cleared");
      return true;
    } catch (error) {
      console.error("Error clearing driver registration progress:", error);
      return false;
    }
  }
  
  async saveDriverDocument(userId: number, documentData: {
    type: string;
    filePath: string;
    fileName: string;
    originalName: string;
    mimeType: string;
    size: number;
  }): Promise<any> {
    try {
      console.log(`Saving ${documentData.type} document for user ${userId}`);
      
      // Create a generic document entry in the system
      // In a real system, we'd store this in a documents table
      // For this proof of concept, we'll just update the driver registration progress
      
      const existingProgress = await this.getDriverRegistrationProgress(userId);
      
      if (!existingProgress) {
        // Create a new progress record with the document information
        return await this.saveDriverRegistrationProgress(userId, {
          step: 1, // Set to verification step
          formData: {},
          vehicleData: {},
          [`${documentData.type}Uploaded`]: true,
          [`${documentData.type}FilePath`]: documentData.filePath,
          [`${documentData.type}FileName`]: documentData.fileName
        });
      } else {
        // Update existing progress record
        const updatedProgress = {
          ...existingProgress,
          [`${documentData.type}Uploaded`]: true,
          [`${documentData.type}FilePath`]: documentData.filePath,
          [`${documentData.type}FileName`]: documentData.fileName,
          lastSaved: new Date()
        };
        
        // Save the updated progress
        const [result] = await db
          .update(driverRegistrationProgress)
          .set(updatedProgress)
          .where(eq(driverRegistrationProgress.userId, userId))
          .returning();
        
        return result;
      }
    } catch (error) {
      console.error("Error saving driver document:", error);
      throw error;
    }
  }
  
  async getPricingSettings(): Promise<any> {
    // In a production system, this would come from a database table
    // For now, we'll return hardcoded values for the earnings calculator
    return {
      baseRatePerHour: 25,
      weekendBonus: 1.2,
      vehicleRates: {
        sedan: 1.0,
        suv: 1.2,
        van: 1.3,
        "wheelchair-accessible": 1.5
      },
      longDistanceMultiplier: 1.15,
      baseWaitTimeRate: 15,
      perMinuteWaitTimeRate: 0.25,
      roundTripMultiplier: 1.8,
      cancellationFee: 10,
      minimumFare: 15
    };
  }
  
  // DriverDetails methods
  async getDriverDetails(userId: number): Promise<DriverDetails | undefined> {
    try {
      console.log(`🔍 STORAGE: getDriverDetails called with userId=${userId}`);
      const [details] = await db
        .select()
        .from(driverDetails)
        .where(eq(driverDetails.userId, userId));
      console.log(`🔍 STORAGE: getDriverDetails result - Found: ${!!details}`);
      if (details) {
        console.log(`🔍 STORAGE: Driver detail found - ID: ${details.id}, UserId: ${details.userId}`);
      }
      return details;
    } catch (error) {
      console.error('Error fetching driver details:', error);
      return undefined;
    }
  }

  async getDriverDetailsByDriverId(driverDetailsId: number): Promise<DriverDetails | undefined> {
    try {
      console.log(`🔍 STORAGE: getDriverDetailsByDriverId called with driverDetailsId=${driverDetailsId}`);
      const [details] = await db
        .select()
        .from(driverDetails)
        .where(eq(driverDetails.id, driverDetailsId));
      console.log(`🔍 STORAGE: getDriverDetailsByDriverId result - Found: ${!!details}`);
      if (details) {
        console.log(`🔍 STORAGE: Driver detail found - ID: ${details.id}, UserId: ${details.userId}`);
      }
      return details;
    } catch (error) {
      console.error('Error fetching driver details by driver ID:', error);
      return undefined;
    }
  }
  
  async getVerifiedDrivers(): Promise<DriverDetails[]> {
    return await db
      .select()
      .from(driverDetails)
      .where(eq(driverDetails.verified, true));
  }
  
  async getPendingDrivers(): Promise<DriverDetails[]> {
    return await db
      .select()
      .from(driverDetails)
      .where(eq(driverDetails.verified, false));
  }
  
  async createDriverDetails(details: InsertDriverDetails): Promise<DriverDetails> {
    // Ensure all dates are properly handled
    const sanitizedData = { ...details };
    
    // Handle specific date fields - make sure they're valid Date objects
    const dateFields = ['licenseExpiry', 'insuranceExpiry', 'backgroundCheckDate'];
    for (const field of dateFields) {
      if (sanitizedData[field] !== undefined) {
        try {
          // Ensure it's a proper date object
          if (!(sanitizedData[field] instanceof Date) && sanitizedData[field] !== null) {
            const dateValue = new Date(sanitizedData[field]);
            if (!isNaN(dateValue.getTime())) { // Valid date
              sanitizedData[field] = dateValue;
            } else {
              delete sanitizedData[field]; // Remove invalid date
              console.warn(`Removed invalid date for field ${field}`);
            }
          }
        } catch (e) {
          delete sanitizedData[field]; // Remove problematic field
          console.warn(`Error processing date field ${field}:`, e);
        }
      }
    }
    
    console.log("Sanitized data for creation:", sanitizedData);
    
    const [driverDetail] = await db
      .insert(driverDetails)
      .values(sanitizedData)
      .returning();
    return driverDetail;
  }
  
  async updateDriverDetails(userId: number, detailsData: Partial<DriverDetails>): Promise<DriverDetails | undefined> {
    const [details] = await db
      .select()
      .from(driverDetails)
      .where(eq(driverDetails.userId, userId));
    
    if (!details) return undefined;
    
    // Ensure all dates are properly handled
    const sanitizedData = { ...detailsData };
    
    // Handle specific date fields - make sure they're valid Date objects
    const dateFields = ['licenseExpiry', 'insuranceExpiry', 'backgroundCheckDate'];
    for (const field of dateFields) {
      if (sanitizedData[field] !== undefined) {
        try {
          // Ensure it's a proper date object
          if (!(sanitizedData[field] instanceof Date) && sanitizedData[field] !== null) {
            const dateValue = new Date(sanitizedData[field]);
            if (!isNaN(dateValue.getTime())) { // Valid date
              sanitizedData[field] = dateValue;
            } else {
              delete sanitizedData[field]; // Remove invalid date
              console.warn(`Removed invalid date for field ${field}`);
            }
          }
        } catch (e) {
          delete sanitizedData[field]; // Remove problematic field
          console.warn(`Error processing date field ${field}:`, e);
        }
      }
    }
    
    console.log("Sanitized data:", sanitizedData);
    
    // Add validation to ensure we have data to update
    if (Object.keys(sanitizedData).length === 0) {
      console.warn("No data to update, returning existing details");
      return details;
    }
    
    try {
      const [updatedDetails] = await db
        .update(driverDetails)
        .set(sanitizedData)
        .where(eq(driverDetails.id, details.id))
        .returning();
      
      console.log("Successfully updated driver details:", updatedDetails);
      return updatedDetails;
    } catch (error) {
      console.error("SQL Update Error:", error);
      console.error("Update data:", sanitizedData);
      console.error("Details ID:", details.id);
      throw error;
    }
  }
  
  // Vehicle methods
  async getVehicle(id: number): Promise<Vehicle | undefined> {
    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, id));
    return vehicle;
  }
  
  async getVehiclesByDriver(driverId: number): Promise<Vehicle[]> {
    return await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.driverId, driverId));
  }
  
  async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
    const [newVehicle] = await db
      .insert(vehicles)
      .values(vehicle)
      .returning();
    return newVehicle;
  }
  
  async updateVehicle(id: number, vehicleData: Partial<Vehicle>): Promise<Vehicle | undefined> {
    const [updatedVehicle] = await db
      .update(vehicles)
      .set(vehicleData)
      .where(eq(vehicles.id, id))
      .returning();
    return updatedVehicle;
  }
  
  // Ride methods
  async getRide(id: number): Promise<Ride | undefined> {
    const [ride] = await db
      .select()
      .from(rides)
      .where(eq(rides.id, id));
    return ride;
  }

  async getRidesByDateRange(startDate: Date, endDate: Date): Promise<Ride[]> {
    try {
      const result = await db
        .select()
        .from(rides)
        .where(
          and(
            gte(rides.scheduledTime, startDate),
            lte(rides.scheduledTime, endDate)
          )
        )
        .orderBy(asc(rides.scheduledTime));
      return result;
    } catch (error) {
      console.error("Error getting rides by date range:", error);
      return [];
    }
  }
  
  async getRidesByRider(riderId: number): Promise<Ride[]> {
    return await db
      .select()
      .from(rides)
      .where(eq(rides.riderId, riderId))
      .orderBy(desc(rides.createdAt));
  }
  
  async getRidesByDriver(driverId: number): Promise<Ride[]> {
    return await db
      .select()
      .from(rides)
      .where(eq(rides.driverId, driverId))
      .orderBy(desc(rides.createdAt));
  }
  
  async getActiveRideRequests(): Promise<Ride[]> {
    return await db
      .select()
      .from(rides)
      .where(or(
        eq(rides.status, "requested"),
        eq(rides.status, "bidding"),
        eq(rides.status, "edit_pending")
      ))
      .orderBy(asc(rides.scheduledTime));
  }
  
  async createRide(ride: InsertRide): Promise<Ride> {
    // Generate a reference number if not provided
    if (!ride.referenceNumber) {
      // Generate a unique reference number - Format: MA-YYMM-XXXX (XX = random alphanumeric)
      const now = new Date();
      const yearMonth = `${now.getFullYear().toString().slice(2)}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
      const randomPart = randomBytes(2).toString('hex').toUpperCase().slice(0, 4);
      ride.referenceNumber = `MA-${yearMonth}-${randomPart}`;
    }
    
    const [newRide] = await db
      .insert(rides)
      .values(ride)
      .returning();
    return newRide;
  }
  
  async updateRide(id: number, rideData: Partial<Ride>): Promise<Ride | undefined> {
    const [updatedRide] = await db
      .update(rides)
      .set(rideData)
      .where(eq(rides.id, id))
      .returning();
    return updatedRide;
  }

  async updateRidePromoCode(rideId: number, promoCodeId: number, finalPrice: number): Promise<void> {
    await db
      .update(rides)
      .set({ 
        promoCodeUsed: promoCodeId,
        finalPrice: finalPrice
      })
      .where(eq(rides.id, rideId));
  }
  
  async deleteRide(id: number): Promise<boolean> {
    try {
      console.log(`Starting ride cancellation for ride ID: ${id}`);
      
      // First, let's check if the ride exists
      const existingRide = await db.select().from(rides).where(eq(rides.id, id));
      if (existingRide.length === 0) {
        console.log(`Ride ${id} not found`);
        return false;
      }
      
      console.log(`Found ride ${id} with status: ${existingRide[0].status}`);
      
      // Instead of deleting the ride, set its status to "cancelled"
      // This preserves the ride record for history and analytics
      const result = await db
        .update(rides)
        .set({ 
          status: 'cancelled',
          driverId: null // Clear driver assignment if any
        })
        .where(eq(rides.id, id));
      
      console.log(`Database update result:`, result);
      
      // Update any pending bids to "withdrawn" status  
      await db
        .update(bids)
        .set({ status: 'withdrawn' })
        .where(eq(bids.rideId, id));
      
      // Verify the update worked
      const updatedRide = await db.select().from(rides).where(eq(rides.id, id));
      console.log(`Updated ride ${id} new status: ${updatedRide[0]?.status}`);
      
      console.log(`Ride ${id} status updated to cancelled`);
      return true;
    } catch (error) {
      console.error('Error cancelling ride:', error);
      return false;
    }
  }
  
  // Bid methods
  async getBid(id: number): Promise<Bid | undefined> {
    const [bid] = await db
      .select()
      .from(bids)
      .where(eq(bids.id, id));
    return bid;
  }
  
  async getBidsByRide(rideId: number): Promise<Bid[]> {
    return await db
      .select({
        id: bids.id,
        rideId: bids.rideId,
        driverId: bids.driverId,
        amount: bids.amount,
        notes: bids.notes,
        status: bids.status,
        createdAt: bids.createdAt,
        parentBidId: bids.parentBidId,
        counterParty: bids.counterParty,
        bidCount: bids.bidCount,
        counterOfferCount: bids.counterOfferCount,
        maxCounterOffers: bids.maxCounterOffers,
        driverName: users.fullName
      })
      .from(bids)
      .leftJoin(users, eq(bids.driverId, users.id))
      .where(eq(bids.rideId, rideId))
      .orderBy(asc(bids.amount));
  }
  
  async getBidsByDriver(driverId: number): Promise<Bid[]> {
    try {
      console.log(`Getting bids for driver ID: ${driverId}`);
      
      // First, check if this is a driver_details.id (needs conversion to user.id)
      // or if it's already a user.id (can use directly)
      let userIdToQuery = driverId;
      
      // Try to find if this ID exists in driver_details table
      const driverDetailsRecord = await db
        .select({ userId: driverDetails.userId })
        .from(driverDetails)
        .where(eq(driverDetails.id, driverId))
        .limit(1);
      
      if (driverDetailsRecord.length > 0) {
        // This was a driver_details.id, use the corresponding user.id
        userIdToQuery = driverDetailsRecord[0].userId;
        console.log(`Converted driver_details.id ${driverId} to user.id ${userIdToQuery}`);
      }
      
      const result = await db
        .select()
        .from(bids)
        .where(eq(bids.driverId, userIdToQuery))
        .orderBy(desc(bids.createdAt));
      console.log(`Found ${result.length} bids for driver ${driverId} (using user.id: ${userIdToQuery})`);
      return result;
    } catch (error) {
      console.error(`Error fetching bids for driver ${driverId}:`, error);
      throw error;
    }
  }
  
  async createBid(bid: InsertBid): Promise<Bid> {
    try {
      // Check if driver already has bid on this ride
      const existingBids = await db
        .select()
        .from(bids)
        .where(and(
          eq(bids.rideId, bid.rideId),
          eq(bids.driverId, bid.driverId),
          not(eq(bids.status, "rejected")),
          not(eq(bids.status, "withdrawn"))
        ));
      
      // If driver already has a bid on this ride, prevent duplicate bidding
      if (existingBids.length > 0) {
        throw new Error("Driver has already placed a bid on this ride");
      }
      
      // Check total bid count for the ride (including original and counter offers)
      const [rideBidCount] = await db
        .select({ count: count() })
        .from(bids)
        .where(and(
          eq(bids.rideId, bid.rideId),
          eq(bids.driverId, bid.driverId)
        ));
      
      // If this is a counter offer, check total bid limit (max 3 bids total)
      if (bid.parentBidId) {
        const maxTotalBids = 3;
        if (rideBidCount.count >= maxTotalBids) {
          throw new Error(`Maximum total bids reached for this ride (${maxTotalBids})`);
        }
      }
      
      // Remove ETA fields if they exist (schema mismatch with DB)
      const { estimatedArrivalTime, estimatedPickupMinutes, ...cleanedBid } = bid as any;
      
      // Set default counter offer values
      const bidWithDefaults = {
        ...cleanedBid,
        counterOfferCount: bid.counterOfferCount || 0,
        maxCounterOffers: bid.maxCounterOffers || 3
      };
      
      // Create the bid with clean data
      const [newBid] = await db
        .insert(bids)
        .values(bidWithDefaults)
        .returning();
      
      return newBid;
    } catch (error) {
      console.error("Error creating bid:", error);
      throw error;
    }
  }
  
  async getDriverBidForRide(driverId: number, rideId: number): Promise<Bid | undefined> {
    try {
      const [bid] = await db
        .select()
        .from(bids)
        .where(and(
          eq(bids.driverId, driverId),
          eq(bids.rideId, rideId),
          // Only return active (non-withdrawn) bids
          ne(bids.status, "withdrawn")
        ));
      return bid;
    } catch (error) {
      console.error("Error getting driver bid for ride:", error);
      return undefined;
    }
  }

  async updateBidStatus(bidId: number, status: string): Promise<Bid | undefined> {
    try {
      const [updatedBid] = await db
        .update(bids)
        .set({ status })
        .where(eq(bids.id, bidId))
        .returning();
      return updatedBid;
    } catch (error) {
      console.error("Error updating bid status:", error);
      return undefined;
    }
  }

  async getRideBids(rideId: number): Promise<Bid[]> {
    try {
      return await db
        .select()
        .from(bids)
        .where(eq(bids.rideId, rideId))
        .orderBy(asc(bids.amount));
    } catch (error) {
      console.error("Error getting ride bids:", error);
      return [];
    }
  }

  async updateRideStatus(rideId: number, status: string): Promise<Ride | undefined> {
    try {
      const [updatedRide] = await db
        .update(rides)
        .set({ status })
        .where(eq(rides.id, rideId))
        .returning();
      return updatedRide;
    } catch (error) {
      console.error("Error updating ride status:", error);
      return undefined;
    }
  }

  async getCounterOffers(bidId: number): Promise<Bid[]> {
    try {
      return await db
        .select()
        .from(bids)
        .where(eq(bids.parentBidId, bidId))
        .orderBy(desc(bids.createdAt));
    } catch (error) {
      console.error("Error getting counter offers:", error);
      return [];
    }
  }

  async getBid(id: number): Promise<Bid | undefined> {
    try {
      const [bid] = await db
        .select()
        .from(bids)
        .where(eq(bids.id, id));
      return bid;
    } catch (error) {
      console.error("Error getting bid:", error);
      return undefined;
    }
  }

  async updateBid(id: number, bidData: Partial<Bid>): Promise<Bid | undefined> {
    const [updatedBid] = await db
      .update(bids)
      .set(bidData)
      .where(eq(bids.id, id))
      .returning();
    return updatedBid;
  }
  
  async createCounterOffer(
    originalBidId: number, 
    counterParty: 'rider' | 'driver', 
    amount: number, 
    notes?: string
  ): Promise<Bid | undefined> {
    // First get the original bid
    const [originalBid] = await db
      .select()
      .from(bids)
      .where(eq(bids.id, originalBidId));
      
    if (!originalBid) return undefined;
    
    // Get all bids for this ride to check total count
    const allBids = await this.getBidsByRide(originalBid.rideId);
    
    // Max 3 bids allowed in total (between both users)
    const MAX_TOTAL_BIDS = 3;
    if (allBids.length >= MAX_TOTAL_BIDS) {
      // If we've reached max, update the original bid to show it's at max
      await this.updateBid(originalBidId, { status: 'maxReached' });
      return undefined;
    }
    
    // Mark the original bid as countered
    await this.updateBid(originalBidId, { status: 'countered' });
    
    // Determine the status for the new counter offer
    // If rider is making the counter offer, driver should be able to accept it (set to "selected")
    // If driver is making the counter offer, rider should be able to accept it (set to "selected")
    const newBidStatus = counterParty === 'rider' ? 'selected' : 'selected';
    
    // Create the counter-offer
    const [counterOffer] = await db
      .insert(bids)
      .values({
        rideId: originalBid.rideId,
        driverId: originalBid.driverId,
        amount: amount,
        notes: notes || null,
        status: newBidStatus, // Set to "selected" so the other party can accept
        parentBidId: originalBidId,
        counterParty: counterParty,
        bidCount: (originalBid.bidCount || 0) + 1
      })
      .returning();
    
    return counterOffer;
  }
  
  // Get full bid history for a bid chain (original bid + all counter-offers)
  async getBidHistory(bidId: number): Promise<Bid[]> {
    // Get the root bid first (if this is a counter-offer)
    const bid = await this.getBid(bidId);
    if (!bid) return [];
    
    // Check if this is a counter-offer, and if so, get the root bid
    let rootBidId = bidId;
    if (bid.parentBidId) {
      // This is a counter-offer, find the root bid
      const parentBid = await this.getBid(bid.parentBidId);
      if (parentBid?.parentBidId) {
        // If parent also has a parent, keep going up the chain
        const rootBid = await this.getBid(parentBid.parentBidId);
        if (rootBid) rootBidId = rootBid.id;
      } else if (parentBid) {
        rootBidId = parentBid.id;
      }
    }
    
    // Now get all bids in this chain
    const bidChain = await db
      .select()
      .from(bids)
      .where(
        or(
          eq(bids.id, rootBidId),
          eq(bids.parentBidId, rootBidId),
          // Also get grand-children (counter-offers of counter-offers)
          exists(
            db.select()
              .from(bids)
              .where(
                and(
                  eq(bids.parentBidId, bids.id),
                  eq(bids.parentBidId, rootBidId)
                )
              )
          )
        )
      )
      .orderBy(asc(bids.bidCount));
      
    return bidChain;
  }
  
  async acceptBid(bidId: number, rideId: number): Promise<Ride | undefined> {
    // First get the bid and ride
    const [bid] = await db
      .select()
      .from(bids)
      .where(eq(bids.id, bidId));
    
    if (!bid) return undefined;
    
    // Update all bids for this ride
    await db
      .update(bids)
      .set({ status: "rejected" })
      .where(and(
        eq(bids.rideId, rideId),
        or(eq(bids.status, "pending"), eq(bids.status, "expired"))
      ));
    
    // Update the accepted bid
    await db
      .update(bids)
      .set({ status: "accepted" })
      .where(eq(bids.id, bidId));
    
    // Update the ride
    const [updatedRide] = await db
      .update(rides)
      .set({
        driverId: bid.driverId,
        status: "scheduled",
        finalPrice: bid.amount
      })
      .where(eq(rides.id, rideId))
      .returning();
    
    return updatedRide;
  }
  
  /**
   * Check if a driver has placed a bid on a specific ride
   * @param rideId - The ID of the ride
   * @param driverId - The ID of the driver
   * @returns true if the driver has placed a bid, false otherwise
   */
  async hasDriverPlacedBid(rideId: number, driverId: number): Promise<boolean> {
    const [result] = await db
      .select({ count: count() })
      .from(bids)
      .where(and(
        eq(bids.rideId, rideId),
        eq(bids.driverId, driverId)
      ));
    
    return result.count > 0;
  }
  
  /**
   * Count all bids (including counter-offers) for a specific ride
   * This is used for bid limit enforcement
   * @param rideId - The ID of the ride
   * @returns The total number of bids for the ride
   */
  async countBidsForRide(rideId: number): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(bids)
      .where(eq(bids.rideId, rideId));
    
    return result.count;
  }
  
  // Stats methods
  async getActiveRidersCount(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Use drizzle's select with count() instead of raw SQL
    const [result] = await db
      .select({ count: count() })
      .from(users)
      .where(and(
        eq(users.role, "rider"),
        gte(users.createdAt, thirtyDaysAgo)
      ));
    
    return result?.count || 0;
  }
  
  async getActiveDriversCount(): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(driverDetails)
      .where(eq(driverDetails.verified, true));
    
    return result?.count || 0;
  }
  
  async getCompletedRidesCount(): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(rides)
      .where(eq(rides.status, "completed"));
    
    return result?.count || 0;
  }
  
  // Ride Edit methods
  async getRideEdit(id: number): Promise<RideEdit | undefined> {
    const [edit] = await db
      .select()
      .from(rideEdits)
      .where(eq(rideEdits.id, id));
    return edit;
  }
  
  async getPendingRideEditsByRide(rideId: number): Promise<RideEdit[]> {
    return await db
      .select()
      .from(rideEdits)
      .where(
        and(
          eq(rideEdits.rideId, rideId),
          eq(rideEdits.status, "pending")
        )
      )
      .orderBy(desc(rideEdits.createdAt));
  }
  
  async createRideEdit(edit: InsertRideEdit): Promise<RideEdit> {
    const [newEdit] = await db
      .insert(rideEdits)
      .values(edit)
      .returning();
    return newEdit;
  }
  
  async respondToRideEdit(id: number, isAccepted: boolean, responseNotes?: string): Promise<RideEdit | undefined> {
    // Get the edit first
    const [edit] = await db
      .select()
      .from(rideEdits)
      .where(eq(rideEdits.id, id));
    
    if (!edit || edit.status !== "pending") return undefined;
    
    // Update the edit status
    const status = isAccepted ? "accepted" : "rejected";
    
    const [updatedEdit] = await db
      .update(rideEdits)
      .set({ 
        status, 
        responseNotes,
        respondedAt: new Date() 
      })
      .where(eq(rideEdits.id, id))
      .returning();
    
    if (isAccepted) {
      // If accepted, update the ride with the proposed changes
      const proposedData = edit.proposedData as Partial<Ride>;
      
      // Update the ride status from edit_pending back to original status
      const originalData = edit.originalData as Ride;
      const originalStatus = originalData.status === "edit_pending" ? "scheduled" : originalData.status;
      
      // Extract only the fields we need to update to avoid type issues
      const updateData: Partial<Ride> = {
        pickupLocation: proposedData.pickupLocation,
        dropoffLocation: proposedData.dropoffLocation,
        pickupLocationLat: proposedData.pickupLocationLat,
        pickupLocationLng: proposedData.pickupLocationLng,
        dropoffLocationLat: proposedData.dropoffLocationLat,
        dropoffLocationLng: proposedData.dropoffLocationLng,
        scheduledTime: proposedData.scheduledTime instanceof Date ? 
          proposedData.scheduledTime : 
          new Date(proposedData.scheduledTime as unknown as string),
        specialInstructions: proposedData.specialInstructions,
        status: originalStatus,
      };
      
      await db
        .update(rides)
        .set(updateData)
        .where(eq(rides.id, edit.rideId));
    } else {
      // If rejected, first set the ride status to cancelled
      await db
        .update(rides)
        .set({ status: "cancelled" })
        .where(eq(rides.id, edit.rideId));
      
      // Then also delete the ride completely so it doesn't show up in scheduled rides
      // But we need to handle it in the right order to avoid foreign key violations
      
      // First, make sure all ride_edits are updated to a final status (not pending)
      await db
        .update(rideEdits)
        .set({ status: "rejected" })
        .where(and(
          eq(rideEdits.rideId, edit.rideId),
          eq(rideEdits.status, "pending")
        ));
      
      // Second, delete any bids associated with this ride
      await db.delete(bids).where(eq(bids.rideId, edit.rideId));
      
      // Finally delete the ride itself (we no longer delete the ride to avoid cascading issues)
      // Just keep it with cancelled status
    }
    
    return updatedEdit;
  }
  
  // Saved Address methods
  async getSavedAddressById(id: number): Promise<SavedAddress | undefined> {
    const [address] = await db
      .select()
      .from(savedAddresses)
      .where(eq(savedAddresses.id, id));
    return address;
  }
  
  async getSavedAddressesByUserId(userId: number): Promise<SavedAddress[]> {
    return await db
      .select()
      .from(savedAddresses)
      .where(eq(savedAddresses.userId, userId))
      .orderBy(desc(savedAddresses.createdAt));
  }
  
  async createSavedAddress(address: InsertSavedAddress): Promise<SavedAddress> {
    const [newAddress] = await db
      .insert(savedAddresses)
      .values(address)
      .returning();
    return newAddress;
  }
  
  async updateSavedAddress(id: number, addressData: Partial<SavedAddress>): Promise<SavedAddress | undefined> {
    const [updatedAddress] = await db
      .update(savedAddresses)
      .set(addressData)
      .where(eq(savedAddresses.id, id))
      .returning();
    return updatedAddress;
  }
  
  async deleteSavedAddress(id: number): Promise<void> {
    await db
      .delete(savedAddresses)
      .where(eq(savedAddresses.id, id));
  }
  
  async unsetDefaultAddress(userId: number): Promise<void> {
    await db
      .update(savedAddresses)
      .set({ isDefault: false })
      .where(eq(savedAddresses.userId, userId));
  }
  
  // Rating methods
  async getRating(id: number): Promise<Rating | undefined> {
    const [rating] = await db
      .select()
      .from(ratings)
      .where(eq(ratings.id, id));
    return rating;
  }
  
  async getRatingsByUser(userId: number): Promise<Rating[]> {
    return await db
      .select()
      .from(ratings)
      .where(eq(ratings.fromUserId, userId))
      .orderBy(desc(ratings.createdAt));
  }
  
  async getRatingsByRide(rideId: number): Promise<Rating[]> {
    return await db
      .select()
      .from(ratings)
      .where(eq(ratings.rideId, rideId))
      .orderBy(desc(ratings.createdAt));
  }
  
  async getUserRatings(userId: number, isRatingReceived: boolean): Promise<Rating[]> {
    // Get ratings received by this user (they are the subject of the rating)
    if (isRatingReceived) {
      return await db
        .select()
        .from(ratings)
        .where(eq(ratings.toUserId, userId))
        .orderBy(desc(ratings.createdAt));
    } 
    // Get ratings given by this user (they are the author)
    else {
      return await db
        .select()
        .from(ratings)
        .where(eq(ratings.fromUserId, userId))
        .orderBy(desc(ratings.createdAt));
    }
  }
  
  async createRating(rating: InsertRating): Promise<Rating> {
    // Save the rating
    const [newRating] = await db
      .insert(ratings)
      .values(rating)
      .returning();
    
    // After a rating is created, we need to update the user's average rating
    // First, get all ratings for this user
    const userRatings = await db
      .select()
      .from(ratings)
      .where(eq(ratings.toUserId, rating.toUserId));
    
    // Calculate the average rating
    if (userRatings.length > 0) {
      const totalRating = userRatings.reduce((sum, r) => sum + r.rating, 0);
      const averageRating = totalRating / userRatings.length;
      
      // Update the user's average rating
      const user = await this.getUser(rating.toUserId);
      if (user) {
        await this.updateUser(user.id, { averageRating });
        
        // If the user is a driver, also update their driver details and check for achievements
        if (user.role === 'driver') {
          const driverDetails = await this.getDriverDetails(user.id);
          if (driverDetails) {
            await this.updateDriverDetails(user.id, { averageRating });
            
            // Check if driver qualifies for any achievements based on their rating
            await this.checkAndCreateRatingAchievements(user.id, averageRating, userRatings.length);
          }
        }
      }
    }
    
    return newRating;
  }
  
  // Rating response methods
  async getRatingResponse(ratingId: number): Promise<RatingResponse | undefined> {
    const [response] = await db
      .select()
      .from(ratingResponses)
      .where(eq(ratingResponses.ratingId, ratingId));
    return response;
  }
  
  async createRatingResponse(response: InsertRatingResponse): Promise<RatingResponse> {
    // Check if a response already exists for this rating
    const existingResponse = await this.getRatingResponse(response.ratingId);
    
    if (existingResponse) {
      // If there's already a response, update it instead of creating a new one
      const [updatedResponse] = await db
        .update(ratingResponses)
        .set({
          response: response.response,
          updatedAt: new Date(),
          isFlagged: response.isFlagged,
          isPublic: response.isPublic
        })
        .where(eq(ratingResponses.id, existingResponse.id))
        .returning();
      return updatedResponse;
    } else {
      // Create a new response
      const [newResponse] = await db
        .insert(ratingResponses)
        .values(response)
        .returning();
      return newResponse;
    }
  }
  
  async getRatingResponsesByUser(userId: number): Promise<RatingResponse[]> {
    return await db
      .select()
      .from(ratingResponses)
      .where(eq(ratingResponses.responderId, userId));
  }
  
  // Driver achievement methods
  async getDriverAchievements(driverId: number): Promise<DriverAchievement[]> {
    return await db
      .select()
      .from(driverAchievements)
      .where(eq(driverAchievements.driverId, driverId))
      .orderBy(desc(driverAchievements.dateAwarded));
  }
  
  async createDriverAchievement(achievement: InsertDriverAchievement): Promise<DriverAchievement> {
    const [newAchievement] = await db
      .insert(driverAchievements)
      .values(achievement)
      .returning();
    return newAchievement;
  }
  
  async checkAndCreateRatingAchievements(driverId: number, averageRating: number, totalRatings: number): Promise<void> {
    // Define achievement milestones
    const ratingMilestones = [
      { 
        minRating: 4.8, 
        minRatings: 20, 
        type: "rating_milestone", 
        title: "5-Star Excellence", 
        description: "Maintained an exceptional average rating of 4.8 or higher with at least 20 ratings" 
      },
      { 
        minRating: 4.5, 
        minRatings: 10, 
        type: "rating_milestone", 
        title: "Top-Rated Driver", 
        description: "Achieved an outstanding average rating of 4.5 or higher with at least 10 ratings" 
      }
    ];
    
    // Rating count milestones
    const countMilestones = [
      { count: 100, type: "ride_count", title: "Century Club", description: "Received 100 ratings from satisfied customers" },
      { count: 50, type: "ride_count", title: "Feedback Champion", description: "Received 50 ratings from satisfied customers" },
      { count: 25, type: "ride_count", title: "Rising Star", description: "Received 25 ratings from riders" },
      { count: 10, type: "ride_count", title: "Feedback Starter", description: "Received 10 ratings from riders" }
    ];
    
    // Check for rating excellence achievements
    for (const milestone of ratingMilestones) {
      if (averageRating >= milestone.minRating && totalRatings >= milestone.minRatings) {
        // Check if the driver already has this achievement
        const existingAchievements = await db
          .select()
          .from(driverAchievements)
          .where(and(
            eq(driverAchievements.driverId, driverId),
            eq(driverAchievements.title, milestone.title),
            eq(driverAchievements.isActive, true)
          ));
        
        if (existingAchievements.length === 0) {
          // Award the achievement
          await this.createDriverAchievement({
            driverId,
            achievementType: milestone.type as any,
            title: milestone.title,
            description: milestone.description,
            rewardPoints: 100, // Default points
            iconUrl: `/assets/achievement-icons/${milestone.type.toLowerCase().replace("_", "-")}.svg`
          });
          
          // Create notification for the driver
          await this.createNotification({
            userId: driverId,
            type: "BID_ACCEPTED", // Reusing existing type - we could add ACHIEVEMENT_EARNED
            title: "New Achievement Earned!",
            message: `Congratulations! You've earned the "${milestone.title}" achievement!`,
            metadata: {
              achievementType: milestone.type,
              achievementTitle: milestone.title
            }
          });
        }
      }
    }
    
    // Check for rating count achievements
    for (const milestone of countMilestones) {
      if (totalRatings >= milestone.count) {
        // Check if the driver already has this achievement
        const existingAchievements = await db
          .select()
          .from(driverAchievements)
          .where(and(
            eq(driverAchievements.driverId, driverId),
            eq(driverAchievements.title, milestone.title),
            eq(driverAchievements.isActive, true)
          ));
        
        if (existingAchievements.length === 0) {
          // Award the achievement
          await this.createDriverAchievement({
            driverId,
            achievementType: milestone.type as any,
            title: milestone.title,
            description: milestone.description,
            rewardPoints: milestone.count, // Points based on the milestone count
            iconUrl: `/assets/achievement-icons/${milestone.type.toLowerCase().replace("_", "-")}.svg`
          });
          
          // Create notification for the driver
          await this.createNotification({
            userId: driverId,
            type: "BID_ACCEPTED", // Reusing existing type
            title: "New Achievement Earned!",
            message: `Congratulations! You've earned the "${milestone.title}" achievement!`,
            metadata: {
              achievementType: milestone.type,
              achievementTitle: milestone.title
            }
          });
        }
      }
    }
  }
  
  // Enhanced rating analytics
  async getDetailedRatingAnalytics(userId: number): Promise<any> {
    // Get all ratings for this user
    const userRatings = await db
      .select()
      .from(ratings)
      .where(eq(ratings.toUserId, userId));
    
    if (userRatings.length === 0) {
      return {
        averageRating: 0,
        totalRatings: 0,
        ratingsDistribution: {
          5: 0, 4: 0, 3: 0, 2: 0, 1: 0
        },
        categoryAverages: {},
        recommendationScoreAvg: 0,
        topStrengths: [],
        improvementAreas: [],
        commonTags: []
      };
    }
    
    // Calculate ratings distribution
    const ratingsDistribution = {
      5: 0, 4: 0, 3: 0, 2: 0, 1: 0
    };
    
    userRatings.forEach(r => {
      if (r.rating >= 1 && r.rating <= 5) {
        ratingsDistribution[r.rating as keyof typeof ratingsDistribution]++;
      }
    });
    
    // Calculate average rating
    const totalRatingPoints = userRatings.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRatingPoints / userRatings.length;
    
    // Process category ratings
    const categoryScores: Record<string, number[]> = {};
    
    userRatings.forEach(r => {
      if (r.categories && typeof r.categories === 'object') {
        const categories = r.categories as Record<string, number>;
        
        Object.entries(categories).forEach(([category, score]) => {
          if (!categoryScores[category]) {
            categoryScores[category] = [];
          }
          categoryScores[category].push(score);
        });
      }
    });
    
    // Calculate category averages
    const categoryAverages: Record<string, number> = {};
    
    Object.entries(categoryScores).forEach(([category, scores]) => {
      const total = scores.reduce((sum, score) => sum + score, 0);
      categoryAverages[category] = total / scores.length;
    });
    
    // Process recommendation scores
    const recommendationScores = userRatings
      .filter(r => r.recommendationScore !== null && r.recommendationScore !== undefined)
      .map(r => r.recommendationScore as number);
    
    const recommendationScoreAvg = recommendationScores.length > 0 
      ? recommendationScores.reduce((sum, score) => sum + score, 0) / recommendationScores.length
      : 0;
    
    // Process strengths and improvement areas
    let allStrengths: string[] = [];
    let allImprovementAreas: string[] = [];
    let allTags: string[] = [];
    
    userRatings.forEach(r => {
      // Process highlighted strengths
      if (r.highlightedStrengths) {
        try {
          const strengths = JSON.parse(r.highlightedStrengths as string);
          if (Array.isArray(strengths)) {
            allStrengths = [...allStrengths, ...strengths];
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
      
      // Process improvement areas
      if (r.improvementAreas) {
        try {
          const areas = JSON.parse(r.improvementAreas as string);
          if (Array.isArray(areas)) {
            allImprovementAreas = [...allImprovementAreas, ...areas];
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
      
      // Process tags
      if (r.taggedAttributes) {
        try {
          const tags = JSON.parse(r.taggedAttributes as string);
          if (Array.isArray(tags)) {
            allTags = [...allTags, ...tags];
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    });
    
    // Count occurrences of each item
    const countOccurrences = (items: string[]) => {
      const counts: Record<string, number> = {};
      items.forEach(item => {
        counts[item] = (counts[item] || 0) + 1;
      });
      return counts;
    };
    
    const strengthCounts = countOccurrences(allStrengths);
    const improvementCounts = countOccurrences(allImprovementAreas);
    const tagCounts = countOccurrences(allTags);
    
    // Get top items by count
    const getTopItems = (counts: Record<string, number>, limit = 5) => {
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([item, count]) => ({ item, count }));
    };
    
    return {
      averageRating,
      totalRatings: userRatings.length,
      ratingsDistribution,
      categoryAverages,
      recommendationScoreAvg,
      topStrengths: getTopItems(strengthCounts),
      improvementAreas: getTopItems(improvementCounts),
      commonTags: getTopItems(tagCounts)
    };
  }
  
  // Stats methods
  // Using the original implementations defined earlier in the file
  
  async getCompletedRidesCount(): Promise<number> {
    const result = await db.select({ count: count() }).from(rides).where(eq(rides.status, 'completed'));
    return result[0].count;
  }
  
  // Additional statistics methods for admin dashboard
  async countUsersByRole(role: 'rider' | 'driver' | 'admin'): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(users)
      .where(and(eq(users.role, role), ne(users.accountStatus, 'rejected')));
    
    return result[0].count;
  }
  
  async countActiveDrivers(): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(driverDetails)
      .where(
        and(
          eq(driverDetails.verified, true),
          eq(driverDetails.accountStatus, 'active')
        )
      );
    
    return result[0].count;
  }
  
  async countPendingDrivers(): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(driverDetails)
      .where(
        and(
          eq(driverDetails.verified, false),
          eq(driverDetails.accountStatus, 'pending')
        )
      );
    
    return result[0].count;
  }
  
  async countRidesByStatus(status: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(rides)
      .where(eq(rides.status, status));
    
    return result[0].count;
  }
  
  async calculateTotalRevenue(): Promise<number> {
    const completedRides = await db
      .select({ finalPrice: rides.finalPrice })
      .from(rides)
      .where(eq(rides.status, 'completed'));
    
    // Calculate total revenue (platform fee is 10% of each ride)
    const totalRevenue = completedRides.reduce((sum, ride) => {
      return sum + (ride.finalPrice ? ride.finalPrice * 0.10 : 0);
    }, 0);
    
    return Math.round(totalRevenue * 100) / 100; // Round to 2 decimal places
  }
  
  // Chat conversation methods
  async createChatConversation(conversation: InsertChatConversation): Promise<ChatConversation> {
    try {
      const [newConversation] = await db
        .insert(chatConversations)
        .values(conversation)
        .returning();
      
      return newConversation;
    } catch (error) {
      console.error("Error creating chat conversation:", error);
      throw error;
    }
  }
  
  async getChatConversation(id: number): Promise<ChatConversation | undefined> {
    try {
      const [conversation] = await db
        .select()
        .from(chatConversations)
        .where(eq(chatConversations.id, id));
      
      return conversation;
    } catch (error) {
      console.error("Error getting chat conversation:", error);
      return undefined;
    }
  }
  
  async getChatConversationByRide(rideId: number): Promise<ChatConversation | undefined> {
    try {
      const [conversation] = await db
        .select()
        .from(chatConversations)
        .where(eq(chatConversations.rideId, rideId));
      
      return conversation;
    } catch (error) {
      console.error("Error getting chat conversation by ride:", error);
      return undefined;
    }
  }
  
  async getUserChatConversations(userId: number): Promise<ChatConversation[]> {
    try {
      // Get all conversations where the user is a participant
      const participantRecords = await db
        .select()
        .from(chatParticipants)
        .where(eq(chatParticipants.userId, userId));
      
      if (!participantRecords.length) {
        return [];
      }
      
      // Get the conversation IDs
      const conversationIds = participantRecords.map(p => p.conversationId);
      
      // Get the actual conversations
      const userConversations = await db
        .select()
        .from(chatConversations)
        .where(sql`${chatConversations.id} IN (${conversationIds.join(',')})`);
      
      return userConversations;
    } catch (error) {
      console.error("Error getting user chat conversations:", error);
      return [];
    }
  }
  
  // Admin method to get all conversations in the system
  async getAllChatConversationsForAdmin(): Promise<any[]> {
    try {
      const conversations = await db
        .select({
          id: chatConversations.id,
          rideId: chatConversations.rideId,
          createdAt: chatConversations.createdAt,
          updatedAt: chatConversations.updatedAt,
          // Get ride reference number for easy identification
          rideReference: rides.referenceNumber,
          pickupLocation: rides.pickupLocation,
          dropoffLocation: rides.dropoffLocation,
        })
        .from(chatConversations)
        .leftJoin(rides, eq(chatConversations.rideId, rides.id))
        .orderBy(desc(chatConversations.updatedAt));
      
      // Get participants for each conversation
      for (const conversation of conversations) {
        const participants = await db
          .select({
            userId: chatParticipants.userId,
            joinedAt: chatParticipants.joinedAt,
            userName: users.fullName,
            userRole: users.role
          })
          .from(chatParticipants)
          .leftJoin(users, eq(chatParticipants.userId, users.id))
          .where(eq(chatParticipants.conversationId, conversation.id));
          
        (conversation as any).participants = participants;
      }
      
      return conversations;
    } catch (error) {
      console.error("Error getting all chat conversations for admin:", error);
      return [];
    }
  }
  
  // Chat participant methods
  async addChatParticipant(participant: InsertChatParticipant): Promise<ChatParticipant> {
    try {
      const [newParticipant] = await db
        .insert(chatParticipants)
        .values(participant)
        .returning();
      
      return newParticipant;
    } catch (error) {
      console.error("Error adding chat participant:", error);
      throw error;
    }
  }
  
  async getChatParticipants(conversationId: number): Promise<ChatParticipant[]> {
    try {
      const participants = await db
        .select()
        .from(chatParticipants)
        .where(eq(chatParticipants.conversationId, conversationId));
      
      return participants;
    } catch (error) {
      console.error("Error getting chat participants:", error);
      return [];
    }
  }
  
  async getChatParticipant(conversationId: number, userId: number): Promise<ChatParticipant | undefined> {
    try {
      const [participant] = await db
        .select()
        .from(chatParticipants)
        .where(
          and(
            eq(chatParticipants.conversationId, conversationId),
            eq(chatParticipants.userId, userId)
          )
        );
      
      return participant;
    } catch (error) {
      console.error("Error getting chat participant:", error);
      return undefined;
    }
  }
  
  async updateChatParticipantLastRead(conversationId: number, userId: number, lastReadMessageId: number): Promise<ChatParticipant | undefined> {
    try {
      const participant = await this.getChatParticipant(conversationId, userId);
      
      if (!participant) {
        return undefined;
      }
      
      const [updatedParticipant] = await db
        .update(chatParticipants)
        .set({
          lastReadAt: new Date()
        })
        .where(eq(chatParticipants.id, participant.id))
        .returning();
      
      return updatedParticipant;
    } catch (error) {
      console.error("Error updating chat participant last read:", error);
      return undefined;
    }
  }
  
  // Chat message methods
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    try {
      const [newMessage] = await db
        .insert(chatMessages)
        .values(message)
        .returning();
      
      return newMessage;
    } catch (error) {
      console.error("Error creating chat message:", error);
      throw error;
    }
  }
  
  async getChatMessages(conversationId: number, limit = 50, before?: number): Promise<ChatMessage[]> {
    try {
      let query = db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.conversationId, conversationId))
        .orderBy(desc(chatMessages.createdAt))
        .limit(limit);
      
      if (before) {
        query = query.where(sql`${chatMessages.id} < ${before}`);
      }
      
      const messages = await query;
      
      // Return in chronological order
      return messages.reverse();
    } catch (error) {
      console.error("Error getting chat messages:", error);
      return [];
    }
  }
  
  async getChatMessage(id: number): Promise<ChatMessage | undefined> {
    try {
      const [message] = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.id, id));
      
      return message;
    } catch (error) {
      console.error("Error getting chat message:", error);
      return undefined;
    }
  }
  
  async getUnreadMessageCount(conversationId: number, userId: number): Promise<number> {
    try {
      // Get the participant to find the last read time
      const participant = await this.getChatParticipant(conversationId, userId);
      
      if (!participant || !participant.lastReadAt) {
        // If the participant has never read any messages, count all messages not sent by them
        const messageCount = await db
          .select({ count: count() })
          .from(chatMessages)
          .where(
            and(
              eq(chatMessages.conversationId, conversationId),
              sql`${chatMessages.senderId} != ${userId}`
            )
          );
        
        return messageCount[0]?.count || 0;
      }
      
      // Count messages that are newer than the last read time and not sent by this user
      const messageCount = await db
        .select({ count: count() })
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.conversationId, conversationId),
            sql`${chatMessages.createdAt} > ${participant.lastReadAt}`,
            sql`${chatMessages.senderId} != ${userId}`
          )
        );
      
      return messageCount[0]?.count || 0;
    } catch (error) {
      console.error("Error getting unread message count:", error);
      return 0;
    }
  }

  // Admin management methods
  async getAllRides(): Promise<Ride[]> {
    try {
      return await db
        .select()
        .from(rides)
        .orderBy(desc(rides.createdAt));
    } catch (error) {
      console.error("Error getting all rides:", error);
      return [];
    }
  }

  // Optimized admin method to avoid N+1 queries
  async getAllRidesWithUserData(): Promise<any[]> {
    try {
      // Get all rides first
      const allRides = await db
        .select()
        .from(rides)
        .orderBy(desc(rides.createdAt));

      if (allRides.length === 0) return [];

      // Get unique user IDs
      const userIds = new Set<number>();
      allRides.forEach(ride => {
        if (ride.riderId) userIds.add(ride.riderId);
        if (ride.driverId) userIds.add(ride.driverId);
      });

      // Batch fetch all users in one query
      const userMap = new Map<number, User>();
      if (userIds.size > 0) {
        const userList = await db
          .select()
          .from(users)
          .where(sql`${users.id} IN (${Array.from(userIds).join(',')})`);
        
        userList.forEach(user => userMap.set(user.id, user));
      }

      // Combine data without additional queries
      return allRides.map(ride => ({
        id: ride.id,
        referenceNumber: ride.referenceNumber,
        riderId: ride.riderId,
        driverId: ride.driverId,
        status: ride.status,
        pickupAddress: ride.pickupAddress,
        dropoffAddress: ride.dropoffAddress,
        scheduledTime: ride.scheduledTime,
        estimatedPrice: ride.estimatedPrice,
        finalPrice: ride.finalPrice,
        createdAt: ride.createdAt,
        completedAt: ride.completedAt,
        riderName: ride.riderId ? (userMap.get(ride.riderId)?.fullName || 'Unknown') : 'Unknown',
        driverName: ride.driverId ? (userMap.get(ride.driverId)?.fullName || 'Unassigned') : 'Unassigned'
      }));
    } catch (error) {
      console.error("Error getting all rides with user data:", error);
      return [];
    }
  }

  async getActiveRides(): Promise<Ride[]> {
    try {
      return await db
        .select()
        .from(rides)
        .where(or(
          eq(rides.status, 'en_route'),
          eq(rides.status, 'arrived'),
          eq(rides.status, 'in_progress')
        ))
        .orderBy(rides.scheduledTime);
    } catch (error) {
      console.error("Error getting active rides:", error);
      return [];
    }
  }
  
  async getActiveRideForDriver(driverId: number): Promise<Ride | undefined> {
    try {
      const [activeRide] = await db
        .select()
        .from(rides)
        .where(and(
          eq(rides.driverId, driverId),
          or(
            eq(rides.status, 'en_route'),
            eq(rides.status, 'arrived'),
            eq(rides.status, 'in_progress')
          )
        ))
        .orderBy(rides.scheduledTime);
      
      return activeRide;
    } catch (error) {
      console.error("Error getting active ride for driver:", error);
      return undefined;
    }
  }
  
  async getAllUsers(): Promise<User[]> {
    try {
      return await db
        .select()
        .from(users)
        .orderBy(users.createdAt);
    } catch (error) {
      console.error("Error getting all users:", error);
      return [];
    }
  }
  
  async updateUserStatus(userId: number, status: string): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({ accountStatus: status })
        .where(eq(users.id, userId))
        .returning();
      
      return updatedUser;
    } catch (error) {
      console.error(`Error updating user status to ${status}:`, error);
      return undefined;
    }
  }
  
  async hashPassword(password: string): Promise<string> {
    // Implementation of password hashing using Node.js crypto
    const salt = randomBytes(16).toString("hex");
    const buf = await scryptAsync(password, salt, 64) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  }
  
  // Pricing settings stored in memory for prototype
  private pricingSettings: Record<string, any> = {
    baseFare: 5.00,
    perMileRate: 2.50, 
    perMinuteRate: 0.35,
    minimumFare: 10.00,
    cancellationFee: 7.50,
    waitingPerMinute: 0.25,
    waitingBaseFee: 15.00,
    nighttimeSurgeMultiplier: 1.25,
    weekendSurgeMultiplier: 1.15,
    highDemandSurgeMultiplier: 1.3,
    roundTripMultiplier: 1.8,
    longDistanceMultiplier: 1.1,
    longDistanceThreshold: 20, // miles
    extendedWaitTime: 15, // minutes
    taxRate: 0.08,
    platformFee: 1.99,
    specialEquipmentFees: {
      wheelchair: 5,
      oxygen: 3,
      stretcher: 15
    },
    lastUpdated: new Date().toISOString()
  };
  
  async getPricingSettings(): Promise<Record<string, any>> {
    return this.pricingSettings;
  }
  
  async updatePricingSettings(settings: Record<string, any>): Promise<Record<string, any>> {
    this.pricingSettings = {
      ...this.pricingSettings,
      ...settings,
      lastUpdated: new Date().toISOString()
    };
    return this.pricingSettings;
  }
  
  // Payment methods
  async createPayment(payment: InsertPayment): Promise<Payment> {
    try {
      const [newPayment] = await db
        .insert(payments)
        .values(payment)
        .returning();
      return newPayment;
    } catch (error) {
      console.error("Error creating payment:", error);
      throw error;
    }
  }
  
  async getPayment(id: number): Promise<Payment | undefined> {
    try {
      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.id, id));
      return payment;
    } catch (error) {
      console.error("Error getting payment:", error);
      return undefined;
    }
  }
  
  async getPaymentsByUser(userId: number): Promise<Payment[]> {
    try {
      return await db
        .select()
        .from(payments)
        .where(eq(payments.userId, userId))
        .orderBy(desc(payments.createdAt));
    } catch (error) {
      console.error("Error getting payments by user:", error);
      return [];
    }
  }
  
  async getPaymentsByRide(rideId: number): Promise<Payment[]> {
    try {
      return await db
        .select()
        .from(payments)
        .where(eq(payments.rideId, rideId))
        .orderBy(desc(payments.createdAt));
    } catch (error) {
      console.error("Error getting payments by ride:", error);
      return [];
    }
  }
  
  async updatePayment(id: number, paymentData: Partial<Payment>): Promise<Payment | undefined> {
    try {
      const [updatedPayment] = await db
        .update(payments)
        .set({
          ...paymentData,
          ...(paymentData.status === 'succeeded' || paymentData.status === 'refunded' 
            ? { completedAt: new Date() } 
            : {})
        })
        .where(eq(payments.id, id))
        .returning();
      
      return updatedPayment;
    } catch (error) {
      console.error("Error updating payment:", error);
      return undefined;
    }
  }
  
  // Admin notes methods
  async createAdminNote(note: InsertAdminNote): Promise<AdminNote> {
    try {
      const [newNote] = await db
        .insert(adminNotes)
        .values(note)
        .returning();
      return newNote;
    } catch (error) {
      console.error("Error creating admin note:", error);
      throw error;
    }
  }
  
  async getAdminNotes(recordType: string, recordId: number): Promise<AdminNote[]> {
    try {
      // Determine which field to filter on based on recordType
      let query;
      
      if (recordType === 'user') {
        query = eq(adminNotes.userId, recordId);
      } else if (recordType === 'ride') {
        query = eq(adminNotes.rideId, recordId);
      } else if (recordType === 'payment') {
        query = eq(adminNotes.paymentId, recordId);
      } else {
        throw new Error(`Invalid record type: ${recordType}`);
      }
      
      return await db
        .select()
        .from(adminNotes)
        .where(and(
          eq(adminNotes.recordType, recordType),
          query
        ))
        .orderBy(desc(adminNotes.createdAt));
    } catch (error) {
      console.error(`Error getting admin notes for ${recordType} #${recordId}:`, error);
      return [];
    }
  }
  
  // Recurring Appointment methods
  async getRecurringAppointment(id: number): Promise<RecurringAppointment | undefined> {
    const [appointment] = await db
      .select()
      .from(recurringAppointments)
      .where(eq(recurringAppointments.id, id));
    return appointment;
  }
  
  async getRecurringAppointmentsByUser(userId: number): Promise<RecurringAppointment[]> {
    return await db
      .select()
      .from(recurringAppointments)
      .where(eq(recurringAppointments.userId, userId))
      .orderBy(desc(recurringAppointments.createdAt));
  }
  
  async createRecurringAppointment(appointment: InsertRecurringAppointment): Promise<RecurringAppointment> {
    const [newAppointment] = await db
      .insert(recurringAppointments)
      .values({
        ...appointment,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return newAppointment;
  }
  
  async updateRecurringAppointment(id: number, appointmentData: Partial<RecurringAppointment>): Promise<RecurringAppointment | undefined> {
    const [updatedAppointment] = await db
      .update(recurringAppointments)
      .set({
        ...appointmentData,
        updatedAt: new Date()
      })
      .where(eq(recurringAppointments.id, id))
      .returning();
    return updatedAppointment;
  }
  
  async deleteRecurringAppointment(id: number): Promise<boolean> {
    try {
      await db
        .delete(recurringAppointments)
        .where(eq(recurringAppointments.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting recurring appointment:", error);
      return false;
    }
  }
  
  async generateRidesFromAppointment(appointmentId: number, startDate: Date, endDate: Date): Promise<Ride[]> {
    try {
      const appointment = await this.getRecurringAppointment(appointmentId);
      if (!appointment) {
        throw new Error(`Recurring appointment with ID ${appointmentId} not found`);
      }
      
      const rides: Ride[] = [];
      let currentDate = new Date(startDate);
      const targetEndDate = new Date(endDate);
      
      // Validate date range
      if (currentDate > targetEndDate) {
        throw new Error('Start date must be before end date');
      }
      
      // Helper function to advance date based on frequency
      const advanceDate = (date: Date, frequency: string, dayOfMonth?: number, daysOfWeek?: number[]): Date => {
        const newDate = new Date(date);
        
        switch (frequency) {
          case 'daily':
            newDate.setDate(newDate.getDate() + 1);
            break;
          case 'weekly':
            if (daysOfWeek && daysOfWeek.length > 0) {
              // Find the next day of the week from the list
              let found = false;
              for (let i = 1; i <= 7; i++) {
                newDate.setDate(newDate.getDate() + 1);
                if (daysOfWeek.includes(newDate.getDay())) {
                  found = true;
                  break;
                }
              }
              if (!found) {
                // If no day found, default to +7 days
                newDate.setDate(date.getDate() + 7);
              }
            } else {
              // Default weekly is every 7 days
              newDate.setDate(newDate.getDate() + 7);
            }
            break;
          case 'biweekly':
            newDate.setDate(newDate.getDate() + 14);
            break;
          case 'monthly':
            if (dayOfMonth) {
              // Set to specific day of next month
              newDate.setMonth(newDate.getMonth() + 1);
              // Adjust day to the specified day of month or last day if out of range
              const lastDayOfMonth = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();
              newDate.setDate(Math.min(dayOfMonth, lastDayOfMonth));
            } else {
              // Default is same day next month
              newDate.setMonth(newDate.getMonth() + 1);
            }
            break;
          default:
            newDate.setDate(newDate.getDate() + 7); // Default to weekly
        }
        
        return newDate;
      };
      
      // Generate rides from start date to end date
      while (currentDate <= targetEndDate) {
        // Extract the time from appointment time
        const appointmentTime = new Date(appointment.appointmentTime);
        const scheduledTime = new Date(currentDate);
        scheduledTime.setHours(
          appointmentTime.getHours(),
          appointmentTime.getMinutes(),
          appointmentTime.getSeconds()
        );
        
        // Create a ride for this date
        const rideData: InsertRide = {
          riderId: appointment.userId,
          recurringAppointmentId: appointment.id,
          status: 'requested',
          pickupLocation: appointment.pickupLocation,
          pickupLocationLat: appointment.pickupLocationLat || undefined,
          pickupLocationLng: appointment.pickupLocationLng || undefined,
          dropoffLocation: appointment.dropoffLocation,
          dropoffLocationLat: appointment.dropoffLocationLat || undefined,
          dropoffLocationLng: appointment.dropoffLocationLng || undefined,
          scheduledTime: scheduledTime,
          vehicleType: appointment.vehicleType,
          needsRamp: appointment.needsRamp,
          needsCompanion: appointment.needsCompanion,
          needsStairChair: appointment.needsStairChair,
          needsWaitTime: appointment.needsWaitTime,
          waitTimeMinutes: appointment.waitTimeMinutes,
          specialInstructions: appointment.specialInstructions || undefined,
          isRoundTrip: appointment.isRoundTrip,
        };
        
        // Add return trip info if it's a round trip
        if (appointment.isRoundTrip && appointment.returnTime) {
          const returnTime = new Date(appointment.returnTime);
          const actualReturnTime = new Date(currentDate);
          actualReturnTime.setHours(
            returnTime.getHours(),
            returnTime.getMinutes(),
            returnTime.getSeconds()
          );
          
          rideData.returnTime = actualReturnTime;
          rideData.returnPickupLocation = appointment.dropoffLocation;
          rideData.returnDropoffLocation = appointment.pickupLocation;
          rideData.returnPickupLocationLat = appointment.dropoffLocationLat || undefined;
          rideData.returnPickupLocationLng = appointment.dropoffLocationLng || undefined;
          rideData.returnDropoffLocationLat = appointment.pickupLocationLat || undefined;
          rideData.returnDropoffLocationLng = appointment.pickupLocationLng || undefined;
        }
        
        // Create the ride and add to result array
        try {
          const ride = await this.createRide(rideData);
          rides.push(ride);
        } catch (error) {
          console.error(`Error creating ride for date ${scheduledTime}:`, error);
        }
        
        // Advance to next occurrence based on frequency
        currentDate = advanceDate(
          currentDate, 
          appointment.frequency, 
          appointment.dayOfMonth || undefined, 
          appointment.daysOfWeek as number[] || undefined
        );
      }
      
      // Update the last generated date
      await this.updateRecurringAppointment(appointmentId, {
        lastGeneratedDate: new Date()
      });
      
      return rides;
    } catch (error) {
      console.error("Error generating rides from appointment:", error);
      throw error;
    }
  }

  // Driver availability schedule methods
  async getDriverAvailabilitySchedule(id: number): Promise<DriverAvailabilitySchedule | undefined> {
    try {
      const [schedule] = await db
        .select()
        .from(driverAvailabilitySchedules)
        .where(eq(driverAvailabilitySchedules.id, id));
      return schedule;
    } catch (error) {
      console.error("Error getting driver availability schedule:", error);
      return undefined;
    }
  }

  async getDriverAvailabilitySchedules(driverId: number): Promise<DriverAvailabilitySchedule[]> {
    try {
      return await db
        .select()
        .from(driverAvailabilitySchedules)
        .where(eq(driverAvailabilitySchedules.driverId, driverId))
        .orderBy(desc(driverAvailabilitySchedules.createdAt));
    } catch (error) {
      console.error("Error getting driver availability schedules:", error);
      return [];
    }
  }

  async createDriverAvailabilitySchedule(schedule: InsertDriverAvailabilitySchedule): Promise<DriverAvailabilitySchedule> {
    try {
      const [createdSchedule] = await db
        .insert(driverAvailabilitySchedules)
        .values({
          ...schedule,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return createdSchedule;
    } catch (error) {
      console.error("Error creating driver availability schedule:", error);
      throw error;
    }
  }

  async updateDriverAvailabilitySchedule(id: number, schedule: Partial<DriverAvailabilitySchedule>): Promise<DriverAvailabilitySchedule | undefined> {
    try {
      const [updatedSchedule] = await db
        .update(driverAvailabilitySchedules)
        .set({
          ...schedule,
          updatedAt: new Date()
        })
        .where(eq(driverAvailabilitySchedules.id, id))
        .returning();
      return updatedSchedule;
    } catch (error) {
      console.error("Error updating driver availability schedule:", error);
      return undefined;
    }
  }

  async deleteDriverAvailabilitySchedule(id: number): Promise<boolean> {
    try {
      await db
        .delete(driverAvailabilitySchedules)
        .where(eq(driverAvailabilitySchedules.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting driver availability schedule:", error);
      return false;
    }
  }
  
  // Driver blocked time methods
  async getDriverBlockedTime(id: number): Promise<DriverBlockedTime | undefined> {
    try {
      const [blockedTime] = await db
        .select()
        .from(driverBlockedTimes)
        .where(eq(driverBlockedTimes.id, id));
      return blockedTime;
    } catch (error) {
      console.error("Error getting driver blocked time:", error);
      return undefined;
    }
  }

  async getDriverBlockedTimes(driverId: number): Promise<DriverBlockedTime[]> {
    try {
      return await db
        .select()
        .from(driverBlockedTimes)
        .where(eq(driverBlockedTimes.driverId, driverId))
        .orderBy(asc(driverBlockedTimes.startDateTime));
    } catch (error) {
      console.error("Error getting driver blocked times:", error);
      return [];
    }
  }

  async getDriverBlockedTimesByDateRange(driverId: number, startDate: Date, endDate: Date): Promise<DriverBlockedTime[]> {
    try {
      return await db
        .select()
        .from(driverBlockedTimes)
        .where(
          and(
            eq(driverBlockedTimes.driverId, driverId),
            // Either start date is in range
            or(
              // Start date is between start and end range
              and(
                gte(driverBlockedTimes.startDateTime, startDate),
                gte(endDate, driverBlockedTimes.startDateTime)
              ),
              // End date is between start and end range
              and(
                gte(driverBlockedTimes.endDateTime, startDate),
                gte(endDate, driverBlockedTimes.endDateTime)
              ),
              // Blocked time completely encompasses the range
              and(
                gte(startDate, driverBlockedTimes.startDateTime),
                gte(driverBlockedTimes.endDateTime, endDate)
              )
            )
          )
        )
        .orderBy(asc(driverBlockedTimes.startDateTime));
    } catch (error) {
      console.error("Error getting driver blocked times by date range:", error);
      return [];
    }
  }

  async createDriverBlockedTime(blockedTime: InsertDriverBlockedTime): Promise<DriverBlockedTime> {
    try {
      const [createdBlockedTime] = await db
        .insert(driverBlockedTimes)
        .values({
          ...blockedTime,
          createdAt: new Date()
        })
        .returning();
      return createdBlockedTime;
    } catch (error) {
      console.error("Error creating driver blocked time:", error);
      throw error;
    }
  }

  async updateDriverBlockedTime(id: number, blockedTime: Partial<DriverBlockedTime>): Promise<DriverBlockedTime | undefined> {
    try {
      const [updatedBlockedTime] = await db
        .update(driverBlockedTimes)
        .set(blockedTime)
        .where(eq(driverBlockedTimes.id, id))
        .returning();
      return updatedBlockedTime;
    } catch (error) {
      console.error("Error updating driver blocked time:", error);
      return undefined;
    }
  }

  async deleteDriverBlockedTime(id: number): Promise<boolean> {
    try {
      await db
        .delete(driverBlockedTimes)
        .where(eq(driverBlockedTimes.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting driver blocked time:", error);
      return false;
    }
  }

  // Get available rides for driver
  async getAvailableRidesForDriver(driverId: number): Promise<Ride[]> {
    try {
      console.log(`🔍 STORAGE: getAvailableRidesForDriver called with driverId=${driverId}`);
      
      // Check if this is a driver_details.id and convert to user.id for bid filtering
      let userIdForBidFiltering = driverId;
      
      // Try to find if this ID exists in driver_details table
      const driverDetailsRecord = await db
        .select({ userId: driverDetails.userId })
        .from(driverDetails)
        .where(eq(driverDetails.id, driverId))
        .limit(1);
      
      if (driverDetailsRecord.length > 0) {
        // This was a driver_details.id, use the corresponding user.id for bid filtering
        userIdForBidFiltering = driverDetailsRecord[0].userId;
        console.log(`🔍 STORAGE: Converted driver_details.id ${driverId} to user.id ${userIdForBidFiltering} for bid filtering`);
      }
      
      const availableRides = await db
        .select()
        .from(rides)
        .where(
          and(
            // Only get requested or bidding rides that don't have a driver assigned yet
            or(
              eq(rides.status, "requested"),
              eq(rides.status, "bidding")
            ),
            // Make sure no driver is assigned
            isNull(rides.driverId),
            // Filter out rides that already have this driver's active bid (using user.id)
            not(
              exists(
                db.select()
                  .from(bids)
                  .where(
                    and(
                      eq(bids.rideId, rides.id),
                      eq(bids.driverId, userIdForBidFiltering),
                      // Only exclude rides with active (non-withdrawn) bids
                      inArray(bids.status, ["pending", "accepted", "rejected", "selected"])
                    )
                  )
              )
            ),
            // Filter out rides that have been hidden by this driver
            not(
              exists(
                db.select()
                  .from(hiddenRides)
                  .where(
                    and(
                      eq(hiddenRides.rideId, rides.id),
                      eq(hiddenRides.driverId, userIdForBidFiltering)
                    )
                  )
              )
            )
          )
        )
        .orderBy(desc(rides.createdAt));
      
      console.log(`🔍 STORAGE: Found ${availableRides.length} available rides for driver ${driverId} (user.id: ${userIdForBidFiltering})`);
      console.log(`🔍 STORAGE: ID Conversion - original driverId: ${driverId}, userIdForBidFiltering: ${userIdForBidFiltering}, conversion happened: ${driverId !== userIdForBidFiltering}`);
      
      return availableRides;
    } catch (error) {
      console.error("Error getting available rides for driver:", error);
      return [];
    }
  }

  // Get driver online status
  async getDriverOnlineStatus(driverId: number): Promise<{ isOnline: boolean } | undefined> {
    try {
      console.log(`🔍 STORAGE: getDriverOnlineStatus called with driverId=${driverId}`);
      
      // Check if driver_online_status table exists and get status
      const result = await db.execute(
        sql`SELECT is_online FROM driver_online_status WHERE driver_id = ${driverId}`
      );
      
      if (result.rows && result.rows.length > 0) {
        const isOnline = result.rows[0].is_online;
        console.log(`🔍 STORAGE: Driver ${driverId} online status: ${isOnline}`);
        return { isOnline: Boolean(isOnline) };
      }
      
      console.log(`🔍 STORAGE: No online status found for driver ${driverId}`);
      return undefined;
    } catch (error) {
      console.error("Error getting driver online status:", error);
      return undefined;
    }
  }
  
  // Driver ride filter methods
  async getDriverDetailsByUserId(userId: number): Promise<DriverDetails | undefined> {
    try {
      console.log(`🔍 STORAGE: getDriverDetailsByUserId called with userId=${userId}`);
      console.log(`🔍 STORAGE: Query - SELECT * FROM driver_details WHERE user_id = ${userId}`);
      
      const result = await db
        .select()
        .from(driverDetails)
        .where(eq(driverDetails.userId, userId));
      
      console.log(`🔍 STORAGE: Query result - Found ${result.length} records`);
      
      if (result.length > 0) {
        const driverDetail = result[0];
        console.log(`🔍 STORAGE: Driver detail found - ID: ${driverDetail.id}, UserId: ${driverDetail.userId}`);
        console.log(`🔍 STORAGE: Document fields:`, {
          licensePhotoFront: driverDetail.licensePhotoFront,
          licensePhotoBack: driverDetail.licensePhotoBack,
          insuranceDocumentUrl: driverDetail.insuranceDocumentUrl,
          profilePhoto: driverDetail.profilePhoto,
          vehicleRegistrationUrl: driverDetail.vehicleRegistrationUrl,
          medicalCertificationUrl: driverDetail.medicalCertificationUrl,
          backgroundCheckDocumentUrl: driverDetail.backgroundCheckDocumentUrl,
          drugTestResultsUrl: driverDetail.drugTestResultsUrl,
          mvrRecordUrl: driverDetail.mvrRecordUrl
        });
        return driverDetail;
      } else {
        console.log(`🔍 STORAGE: No driver details found for userId=${userId}`);
        return undefined;
      }
    } catch (error) {
      console.error("🔍 STORAGE: Error getting driver details by user ID:", error);
      return undefined;
    }
  }
  
  async getDriverRideFilterById(id: number): Promise<DriverRideFilter | undefined> {
    try {
      const [filter] = await db
        .select()
        .from(driverRideFilters)
        .where(eq(driverRideFilters.id, id));
      return filter;
    } catch (error) {
      console.error("Error getting driver ride filter by ID:", error);
      return undefined;
    }
  }
  
  async getDriverRideFilters(driverId: number): Promise<DriverRideFilter[]> {
    try {
      return await db
        .select()
        .from(driverRideFilters)
        .where(eq(driverRideFilters.driverId, driverId))
        .orderBy(desc(driverRideFilters.priority));
    } catch (error) {
      console.error("Error getting driver ride filters:", error);
      return [];
    }
  }
  
  async createDriverRideFilter(filter: InsertDriverRideFilter): Promise<DriverRideFilter> {
    try {
      // If this is the default filter, ensure no other filters are marked as default
      if (filter.isDefault) {
        await db
          .update(driverRideFilters)
          .set({ isDefault: false })
          .where(eq(driverRideFilters.driverId, filter.driverId));
      }
      
      const [createdFilter] = await db
        .insert(driverRideFilters)
        .values({
          ...filter,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return createdFilter;
    } catch (error) {
      console.error("Error creating driver ride filter:", error);
      throw error;
    }
  }
  
  async updateDriverRideFilter(id: number, filter: Partial<DriverRideFilter>): Promise<DriverRideFilter | undefined> {
    try {
      const [existingFilter] = await db
        .select()
        .from(driverRideFilters)
        .where(eq(driverRideFilters.id, id));
      
      if (!existingFilter) {
        return undefined;
      }
      
      // If this is being set as the default filter, handle other filters
      if (filter.isDefault === true) {
        await this.updateDriverRideFiltersDefaultStatus(existingFilter.driverId, id);
      }
      
      const [updatedFilter] = await db
        .update(driverRideFilters)
        .set({
          ...filter,
          updatedAt: new Date()
        })
        .where(eq(driverRideFilters.id, id))
        .returning();
      return updatedFilter;
    } catch (error) {
      console.error("Error updating driver ride filter:", error);
      return undefined;
    }
  }
  
  async deleteDriverRideFilter(id: number): Promise<boolean> {
    try {
      await db
        .delete(driverRideFilters)
        .where(eq(driverRideFilters.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting driver ride filter:", error);
      return false;
    }
  }
  
  async updateDriverRideFiltersDefaultStatus(driverId: number, filterId: number): Promise<boolean> {
    try {
      // Set all filters for this driver as non-default
      await db
        .update(driverRideFilters)
        .set({ isDefault: false })
        .where(eq(driverRideFilters.driverId, driverId));
      
      // Set the specified filter as default
      await db
        .update(driverRideFilters)
        .set({ isDefault: true })
        .where(eq(driverRideFilters.id, filterId));
      
      return true;
    } catch (error) {
      console.error("Error updating driver ride filters default status:", error);
      return false;
    }
  }
  
  async getFilteredRidesByDriver(driverId: number, filterId: number): Promise<Ride[]> {
    try {
      // Get the driver details first
      const driver = await this.getDriverDetailsByUserId(driverId);
      if (!driver) {
        return [];
      }
      
      // Get the filter
      const filter = await this.getDriverRideFilterById(filterId);
      if (!filter) {
        return [];
      }
      
      // Start building the query for filtering rides
      let query = db
        .select()
        .from(rides)
        .where(
          and(
            // Only get requested or bidding rides that don't have a driver assigned yet
            or(
              eq(rides.status, "requested"),
              eq(rides.status, "bidding")
            ),
            // Filter out rides that already have this driver's bid
            not(
              exists(
                db.select()
                  .from(bids)
                  .where(
                    and(
                      eq(bids.rideId, rides.id),
                      eq(bids.driverId, driverId)
                    )
                  )
              )
            )
          )
        );
      
      // Apply distance filter if specified
      if (filter.maxDistance) {
        query = query.where(lte(rides.estimatedDistance, filter.maxDistance));
      }
      if (filter.minDistance) {
        query = query.where(gte(rides.estimatedDistance, filter.minDistance));
      }
      
      // Apply price filter if specified
      if (filter.minPrice) {
        query = query.where(gte(rides.riderBid, filter.minPrice));
      }
      
      // Apply vehicle type filter if specified
      if (filter.vehicleTypes && Array.isArray(filter.vehicleTypes) && filter.vehicleTypes.length > 0) {
        query = query.where(
          sql`${rides.vehicleType} IN (${sql.join(filter.vehicleTypes.map(type => sql.placeholder(type)), sql`, `)})`
        );
      }
      
      // Apply accessibility filters if specified
      if (filter.canProvideRamp !== undefined) {
        if (filter.canProvideRamp) {
          query = query.where(eq(rides.needsRamp, true));
        } else {
          query = query.where(eq(rides.needsRamp, false));
        }
      }
      
      if (filter.canProvideCompanion !== undefined) {
        if (filter.canProvideCompanion) {
          query = query.where(eq(rides.needsCompanion, true));
        } else {
          query = query.where(eq(rides.needsCompanion, false));
        }
      }
      
      if (filter.canProvideStairChair !== undefined) {
        if (filter.canProvideStairChair) {
          query = query.where(eq(rides.needsStairChair, true));
        } else {
          query = query.where(eq(rides.needsStairChair, false));
        }
      }
      
      if (filter.maxWaitTimeMinutes !== undefined) {
        query = query.where(
          or(
            eq(rides.needsWaitTime, false),
            and(
              eq(rides.needsWaitTime, true),
              lte(rides.waitTimeMinutes, filter.maxWaitTimeMinutes)
            )
          )
        );
      }
      
      // Apply round trip preference if specified
      if (filter.preferRoundTrips !== undefined) {
        query = query.where(eq(rides.isRoundTrip, filter.preferRoundTrips));
      }
      
      // Get the filtered rides
      const filteredRides = await query.orderBy(asc(rides.scheduledTime));
      
      // For time window filtering, we need to do this in memory since it's more complex
      if (filter.timeWindows && Array.isArray(filter.timeWindows) && filter.timeWindows.length > 0) {
        return filteredRides.filter(ride => {
          const rideTime = new Date(ride.scheduledTime);
          const rideDay = rideTime.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
          const rideHour = rideTime.getHours();
          const rideMinute = rideTime.getMinutes();
          
          // Check if the ride time falls within any of the specified time windows
          return filter.timeWindows.some(window => {
            if (window.day !== 'any' && window.day.toLowerCase() !== rideDay) {
              return false;
            }
            
            const [startHour, startMinute] = window.startTime.split(':').map(Number);
            const [endHour, endMinute] = window.endTime.split(':').map(Number);
            
            const rideTimeMinutes = rideHour * 60 + rideMinute;
            const startTimeMinutes = startHour * 60 + startMinute;
            const endTimeMinutes = endHour * 60 + endMinute;
            
            return rideTimeMinutes >= startTimeMinutes && rideTimeMinutes <= endTimeMinutes;
          });
        });
      }
      
      return filteredRides;
    } catch (error) {
      console.error("Error getting filtered rides for driver:", error);
      return [];
    }
  }

  // Hidden rides methods
  async hideRideForDriver(driverId: number, rideId: number): Promise<HiddenRide> {
    try {
      const [hiddenRide] = await db
        .insert(hiddenRides)
        .values({
          driverId,
          rideId,
          hiddenAt: new Date()
        })
        .returning();
      return hiddenRide;
    } catch (error) {
      console.error("Error hiding ride for driver:", error);
      throw error;
    }
  }

  async getHiddenRidesForDriver(driverId: number): Promise<HiddenRide[]> {
    try {
      return await db
        .select()
        .from(hiddenRides)
        .where(eq(hiddenRides.driverId, driverId));
    } catch (error) {
      console.error("Error getting hidden rides for driver:", error);
      return [];
    }
  }

  async isRideHiddenForDriver(driverId: number, rideId: number): Promise<boolean> {
    try {
      const [hiddenRide] = await db
        .select()
        .from(hiddenRides)
        .where(
          and(
            eq(hiddenRides.driverId, driverId),
            eq(hiddenRides.rideId, rideId)
          )
        );
      return !!hiddenRide;
    } catch (error) {
      console.error("Error checking if ride is hidden for driver:", error);
      return false;
    }
  }

  // Analytics methods - Driver
  async getDriverStatistics(driverId: number): Promise<{
    totalRides: number;
    completedRides: number;
    cancelledRides: number;
    totalEarnings: number;
    currentMonthEarnings: number;
    averageRating: number;
    onTimePercentage: number;
  }> {
    try {
      // Get total rides assigned to the driver
      const totalRidesCount = await db.select({ count: count() }).from(rides)
        .where(eq(rides.driverId, driverId));
      
      // Get completed rides
      const completedRidesCount = await db.select({ count: count() }).from(rides)
        .where(and(
          eq(rides.driverId, driverId),
          eq(rides.status, 'completed')
        ));
      
      // Get cancelled rides
      const cancelledRidesCount = await db.select({ count: count() }).from(rides)
        .where(and(
          eq(rides.driverId, driverId),
          eq(rides.status, 'cancelled')
        ));
      
      // Get all completed rides with payment info for earnings calculations
      const completedRides = await db.select({
        finalPrice: rides.finalPrice
      }).from(rides)
        .where(and(
          eq(rides.driverId, driverId),
          eq(rides.status, 'completed')
        ));
      
      // Get current month rides for current month earnings
      const currentDate = new Date();
      const startOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
      
      const currentMonthRides = await db.select({
        finalPrice: rides.finalPrice
      }).from(rides)
        .where(and(
          eq(rides.driverId, driverId),
          eq(rides.status, 'completed'),
          gt(rides.scheduledTime, startOfCurrentMonth),
          lt(rides.scheduledTime, endOfCurrentMonth)
        ));
      
      // Get average rating
      const driverRatings = await db.select()
        .from(ratings)
        .where(and(
          eq(ratings.driverUserId, driverId),
          isNotNull(ratings.rating)
        ));
      
      let averageRating = 0;
      if (driverRatings.length > 0) {
        const totalRating = driverRatings.reduce((sum, rating) => sum + (rating.rating || 0), 0);
        averageRating = totalRating / driverRatings.length;
      }
      
      // Calculate on-time percentage based on driver's status updates
      // For simplicity, we'll use a fixed value for now
      // In a real implementation, this would be calculated based on tracking data
      const onTimePercentage = 92; // Fixed value for now
      
      // Calculate total earnings from completed rides
      const totalEarnings = completedRides.reduce((sum, ride) => sum + (ride.finalPrice || 0), 0);
      
      // Calculate current month earnings
      const currentMonthEarnings = currentMonthRides.reduce((sum, ride) => sum + (ride.finalPrice || 0), 0);
      
      return {
        totalRides: totalRidesCount[0]?.count || 0,
        completedRides: completedRidesCount[0]?.count || 0,
        cancelledRides: cancelledRidesCount[0]?.count || 0,
        totalEarnings,
        currentMonthEarnings,
        averageRating,
        onTimePercentage
      };
    } catch (error) {
      console.error('Error getting driver statistics:', error);
      // Return default values in case of error
      return {
        totalRides: 0,
        completedRides: 0,
        cancelledRides: 0,
        totalEarnings: 0,
        currentMonthEarnings: 0,
        averageRating: 0,
        onTimePercentage: 0
      };
    }
  }
  
  async getDriverEarnings(
    driverId: number, 
    timeframe: string
  ): Promise<{
    timeframe: string;
    data: Array<{
      date: string;
      amount: number;
      rides: number;
    }>;
    summary: {
      totalEarnings: number;
      totalRides: number;
      averagePerRide: number;
      comparisonPeriodChange: number;
    };
  }> {
    try {
      // Current date for calculations
      const currentDate = new Date();
      let startDate: Date;
      let endDate: Date = new Date();
      let previousStartDate: Date;
      let previousEndDate: Date;
      let dateFormat: string;
      let groupBy: (date: Date) => string;
      
      // Configure date ranges based on timeframe
      switch (timeframe) {
        case 'daily':
          // Last 24 hours, grouped by hour
          startDate = new Date(currentDate);
          startDate.setHours(currentDate.getHours() - 24);
          previousStartDate = new Date(startDate);
          previousStartDate.setHours(startDate.getHours() - 24);
          previousEndDate = new Date(startDate);
          dateFormat = 'yyyy-MM-dd HH:00';
          groupBy = (date) => {
            const hours = date.getHours().toString().padStart(2, '0');
            return `${date.toISOString().split('T')[0]} ${hours}:00`;
          };
          break;
          
        case 'weekly':
          // Last 7 days
          startDate = new Date(currentDate);
          startDate.setDate(currentDate.getDate() - 7);
          previousStartDate = new Date(startDate);
          previousStartDate.setDate(startDate.getDate() - 7);
          previousEndDate = new Date(startDate);
          dateFormat = 'yyyy-MM-dd';
          groupBy = (date) => date.toISOString().split('T')[0];
          break;
          
        case 'monthly':
          // Last 30 days
          startDate = new Date(currentDate);
          startDate.setDate(currentDate.getDate() - 30);
          previousStartDate = new Date(startDate);
          previousStartDate.setDate(startDate.getDate() - 30);
          previousEndDate = new Date(startDate);
          dateFormat = 'yyyy-MM-dd';
          groupBy = (date) => date.toISOString().split('T')[0];
          break;
          
        case 'yearly':
          // Last 12 months
          startDate = new Date(currentDate);
          startDate.setMonth(currentDate.getMonth() - 12);
          previousStartDate = new Date(startDate);
          previousStartDate.setMonth(startDate.getMonth() - 12);
          previousEndDate = new Date(startDate);
          dateFormat = 'yyyy-MM';
          groupBy = (date) => `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          break;
          
        default:
          // Default to weekly
          startDate = new Date(currentDate);
          startDate.setDate(currentDate.getDate() - 7);
          previousStartDate = new Date(startDate);
          previousStartDate.setDate(startDate.getDate() - 7);
          previousEndDate = new Date(startDate);
          dateFormat = 'yyyy-MM-dd';
          groupBy = (date) => date.toISOString().split('T')[0];
      }
      
      // Get current period rides
      const currentPeriodRides = await db.select()
        .from(rides)
        .where(and(
          eq(rides.driverId, driverId),
          eq(rides.status, 'completed'),
          gte(rides.scheduledTime, startDate),
          lte(rides.scheduledTime, endDate)
        ));
      
      // Get previous period rides for comparison
      const previousPeriodRides = await db.select()
        .from(rides)
        .where(and(
          eq(rides.driverId, driverId),
          eq(rides.status, 'completed'),
          gte(rides.scheduledTime, previousStartDate),
          lte(rides.scheduledTime, previousEndDate)
        ));
      
      // Group the rides by date
      const groupedData: Record<string, { amount: number, rides: number }> = {};
      
      // Initialize with time periods (important for continuous data visualization)
      let currentDay = new Date(startDate);
      while (currentDay <= endDate) {
        const key = groupBy(currentDay);
        groupedData[key] = { amount: 0, rides: 0 };
        
        // Increment by day or hour based on timeframe
        if (timeframe === 'daily') {
          currentDay.setHours(currentDay.getHours() + 1);
        } else {
          currentDay.setDate(currentDay.getDate() + 1);
        }
      }
      
      // Populate with actual data
      currentPeriodRides.forEach(ride => {
        const rideDate = new Date(ride.scheduledTime);
        const key = groupBy(rideDate);
        
        if (groupedData[key]) {
          groupedData[key].amount += ride.finalPrice || 0;
          groupedData[key].rides += 1;
        }
      });
      
      // Convert to array format for chart
      const chartData = Object.entries(groupedData).map(([date, data]) => ({
        date,
        amount: data.amount,
        rides: data.rides
      })).sort((a, b) => a.date.localeCompare(b.date));
      
      // Calculate summary
      const totalEarnings = currentPeriodRides.reduce((sum, ride) => sum + (ride.finalPrice || 0), 0);
      const totalRides = currentPeriodRides.length;
      const averagePerRide = totalRides > 0 ? totalEarnings / totalRides : 0;
      
      // Calculate previous period earnings for comparison
      const previousPeriodEarnings = previousPeriodRides.reduce((sum, ride) => sum + (ride.finalPrice || 0), 0);
      
      // Calculate comparison percentage change
      let comparisonPeriodChange = 0;
      if (previousPeriodEarnings > 0) {
        comparisonPeriodChange = ((totalEarnings - previousPeriodEarnings) / previousPeriodEarnings) * 100;
      }
      
      return {
        timeframe,
        data: chartData,
        summary: {
          totalEarnings,
          totalRides,
          averagePerRide,
          comparisonPeriodChange
        }
      };
    } catch (error) {
      console.error('Error getting driver earnings:', error);
      // Return default values in case of error
      return {
        timeframe,
        data: [],
        summary: {
          totalEarnings: 0,
          totalRides: 0,
          averagePerRide: 0,
          comparisonPeriodChange: 0
        }
      };
    }
  }
  
  async getDriverRideHistory(
    driverId: number, 
    options: {
      page: number;
      pageSize: number;
      startDate?: Date;
      endDate?: Date;
      status?: string;
      sort: string;
      order: 'asc' | 'desc';
    }
  ): Promise<{
    rides: Ride[];
    total: number;
    totalPages: number;
  }> {
    try {
      const { page, pageSize, startDate, endDate, status, sort, order } = options;
      
      // Build the query with filters
      let query = db.select().from(rides).where(eq(rides.driverId, driverId));
      
      // Apply date range filters if provided
      if (startDate) {
        query = query.where(gte(rides.scheduledTime, startDate));
      }
      
      if (endDate) {
        query = query.where(lte(rides.scheduledTime, endDate));
      }
      
      // Apply status filter if provided
      if (status) {
        query = query.where(eq(rides.status, status));
      }
      
      // Get total count for pagination
      const countResult = await db.select({ count: count() }).from(rides).where(eq(rides.driverId, driverId));
      const total = countResult[0]?.count || 0;
      
      // Apply sorting
      // Note: In a real implementation, we would handle different sort fields more robustly
      const orderDirection = order === 'asc' ? asc : desc;
      switch (sort) {
        case 'scheduledTime':
          query = query.orderBy(orderDirection(rides.scheduledTime));
          break;
        case 'status':
          query = query.orderBy(orderDirection(rides.status));
          break;
        case 'finalPrice':
          query = query.orderBy(orderDirection(rides.finalPrice));
          break;
        default:
          query = query.orderBy(orderDirection(rides.scheduledTime));
      }
      
      // Apply pagination
      query = query.limit(pageSize).offset((page - 1) * pageSize);
      
      // Get the rides
      const ridesList = await query;
      
      // Calculate total pages
      const totalPages = Math.ceil(total / pageSize);
      
      return {
        rides: ridesList,
        total,
        totalPages
      };
    } catch (error) {
      console.error('Error getting driver ride history:', error);
      return {
        rides: [],
        total: 0,
        totalPages: 0
      };
    }
  }

  // Analytics methods - Rider
  async getRiderStatistics(riderId: number): Promise<{
    totalRides: number;
    completedRides: number;
    cancelledRides: number;
    totalSpent: number;
    currentMonthSpent: number;
    averageRating: number;
  }> {
    try {
      // Get total rides created by the rider
      const totalRidesCount = await db.select({ count: count() }).from(rides)
        .where(eq(rides.riderId, riderId));
      
      // Get completed rides
      const completedRidesCount = await db.select({ count: count() }).from(rides)
        .where(and(
          eq(rides.riderId, riderId),
          eq(rides.status, 'completed')
        ));
      
      // Get cancelled rides
      const cancelledRidesCount = await db.select({ count: count() }).from(rides)
        .where(and(
          eq(rides.riderId, riderId),
          eq(rides.status, 'cancelled')
        ));
      
      // Get all completed rides with payment info
      const completedRides = await db.select({
        finalPrice: rides.finalPrice
      }).from(rides)
        .where(and(
          eq(rides.riderId, riderId),
          eq(rides.status, 'completed')
        ));
      
      // Get current month rides
      const currentDate = new Date();
      const startOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
      
      const currentMonthRides = await db.select({
        finalPrice: rides.finalPrice
      }).from(rides)
        .where(and(
          eq(rides.riderId, riderId),
          eq(rides.status, 'completed'),
          gt(rides.scheduledTime, startOfCurrentMonth),
          lt(rides.scheduledTime, endOfCurrentMonth)
        ));
      
      // Get average rating given by drivers to this rider
      const riderRatings = await db.select()
        .from(ratings)
        .where(and(
          eq(ratings.riderUserId, riderId),
          isNotNull(ratings.rating)
        ));
      
      let averageRating = 0;
      if (riderRatings.length > 0) {
        const totalRating = riderRatings.reduce((sum, rating) => sum + (rating.rating || 0), 0);
        averageRating = totalRating / riderRatings.length;
      }
      
      // Calculate total spent from completed rides
      const totalSpent = completedRides.reduce((sum, ride) => sum + (ride.finalPrice || 0), 0);
      
      // Calculate current month spent
      const currentMonthSpent = currentMonthRides.reduce((sum, ride) => sum + (ride.finalPrice || 0), 0);
      
      return {
        totalRides: totalRidesCount[0]?.count || 0,
        completedRides: completedRidesCount[0]?.count || 0,
        cancelledRides: cancelledRidesCount[0]?.count || 0,
        totalSpent,
        currentMonthSpent,
        averageRating
      };
    } catch (error) {
      console.error('Error getting rider statistics:', error);
      // Return default values in case of error
      return {
        totalRides: 0,
        completedRides: 0,
        cancelledRides: 0,
        totalSpent: 0,
        currentMonthSpent: 0,
        averageRating: 0
      };
    }
  }
  
  async getRiderRideHistory(
    riderId: number, 
    options: {
      page: number;
      pageSize: number;
      startDate?: Date;
      endDate?: Date;
      status?: string;
      sort: string;
      order: 'asc' | 'desc';
    }
  ): Promise<{
    rides: Ride[];
    total: number;
    totalPages: number;
  }> {
    try {
      const { page, pageSize, startDate, endDate, status, sort, order } = options;
      
      // Build the query with filters
      let query = db.select().from(rides).where(eq(rides.riderId, riderId));
      
      // Apply date range filters if provided
      if (startDate) {
        query = query.where(gte(rides.scheduledTime, startDate));
      }
      
      if (endDate) {
        query = query.where(lte(rides.scheduledTime, endDate));
      }
      
      // Apply status filter if provided
      if (status) {
        query = query.where(eq(rides.status, status));
      }
      
      // Get total count for pagination
      const countResult = await db.select({ count: count() }).from(rides).where(eq(rides.riderId, riderId));
      const total = countResult[0]?.count || 0;
      
      // Apply sorting
      const orderDirection = order === 'asc' ? asc : desc;
      switch (sort) {
        case 'scheduledTime':
          query = query.orderBy(orderDirection(rides.scheduledTime));
          break;
        case 'status':
          query = query.orderBy(orderDirection(rides.status));
          break;
        case 'finalPrice':
          query = query.orderBy(orderDirection(rides.finalPrice));
          break;
        default:
          query = query.orderBy(orderDirection(rides.scheduledTime));
      }
      
      // Apply pagination
      query = query.limit(pageSize).offset((page - 1) * pageSize);
      
      // Get the rides
      const ridesList = await query;
      
      // Calculate total pages
      const totalPages = Math.ceil(total / pageSize);
      
      return {
        rides: ridesList,
        total,
        totalPages
      };
    } catch (error) {
      console.error('Error getting rider ride history:', error);
      return {
        rides: [],
        total: 0,
        totalPages: 0
      };
    }
  }

  // Analytics methods - Admin
  async getAdminDashboardData(): Promise<{
    userStats: {
      totalUsers: number;
      newUsersThisMonth: number;
      activeDrivers: number;
      activeRiders: number;
    };
    rideStats: {
      totalRides: number;
      completedRides: number;
      cancelledRides: number;
      ridesThisMonth: number;
    };
    financialStats: {
      totalRevenue: number;
      revenueThisMonth: number;
      averageFarePrice: number;
    };
    platformStats: {
      averageRating: number;
      disputeRate: number;
      avgResponseTime: number;
    };
  }> {
    try {
      // Current date for calculations
      const currentDate = new Date();
      const startOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      
      // Get user statistics
      const totalUsers = (await db.select({ count: count() }).from(users))[0]?.count || 0;
      
      const newUsersThisMonth = (await db.select({ count: count() }).from(users)
        .where(gte(users.createdAt, startOfCurrentMonth)))[0]?.count || 0;
      
      const activeDrivers = (await db.select({ count: count() }).from(users)
        .where(and(
          eq(users.role, 'driver'),
          eq(users.accountStatus, 'active')
        )))[0]?.count || 0;
      
      const activeRiders = (await db.select({ count: count() }).from(users)
        .where(and(
          eq(users.role, 'rider'),
          eq(users.accountStatus, 'active')
        )))[0]?.count || 0;
      
      // Get ride statistics
      const totalRides = (await db.select({ count: count() }).from(rides))[0]?.count || 0;
      
      const completedRides = (await db.select({ count: count() }).from(rides)
        .where(eq(rides.status, 'completed')))[0]?.count || 0;
      
      const cancelledRides = (await db.select({ count: count() }).from(rides)
        .where(eq(rides.status, 'cancelled')))[0]?.count || 0;
      
      const ridesThisMonth = (await db.select({ count: count() }).from(rides)
        .where(gte(rides.createdAt, startOfCurrentMonth)))[0]?.count || 0;
      
      // Get financial statistics
      const completedRidesWithPrice = await db.select({
        finalPrice: rides.finalPrice
      }).from(rides)
        .where(eq(rides.status, 'completed'));
      
      const completedRidesThisMonth = await db.select({
        finalPrice: rides.finalPrice
      }).from(rides)
        .where(and(
          eq(rides.status, 'completed'),
          gte(rides.scheduledTime, startOfCurrentMonth)
        ));
      
      const totalRevenue = completedRidesWithPrice.reduce((sum, ride) => sum + (ride.finalPrice || 0), 0);
      
      const revenueThisMonth = completedRidesThisMonth.reduce((sum, ride) => sum + (ride.finalPrice || 0), 0);
      
      const averageFarePrice = completedRidesWithPrice.length > 0 
        ? totalRevenue / completedRidesWithPrice.length 
        : 0;
      
      // Get platform statistics
      const allRatings = await db.select({
        rating: ratings.rating
      }).from(ratings).where(isNotNull(ratings.rating));
      
      const averageRating = allRatings.length > 0
        ? allRatings.reduce((sum, rating) => sum + (rating.rating || 0), 0) / allRatings.length
        : 0;
      
      // For metrics like dispute rate and average response time, 
      // we would usually need more detailed data. These are placeholders.
      const disputeRate = 2.5; // Placeholder - percentage of rides with disputes
      const avgResponseTime = 3.2; // Placeholder - average time in minutes for drivers to accept rides
      
      return {
        userStats: {
          totalUsers,
          newUsersThisMonth,
          activeDrivers,
          activeRiders
        },
        rideStats: {
          totalRides,
          completedRides,
          cancelledRides,
          ridesThisMonth
        },
        financialStats: {
          totalRevenue,
          revenueThisMonth,
          averageFarePrice
        },
        platformStats: {
          averageRating,
          disputeRate,
          avgResponseTime
        }
      };
    } catch (error) {
      console.error('Error getting admin dashboard data:', error);
      return {
        userStats: {
          totalUsers: 0,
          newUsersThisMonth: 0,
          activeDrivers: 0,
          activeRiders: 0
        },
        rideStats: {
          totalRides: 0,
          completedRides: 0,
          cancelledRides: 0,
          ridesThisMonth: 0
        },
        financialStats: {
          totalRevenue: 0,
          revenueThisMonth: 0,
          averageFarePrice: 0
        },
        platformStats: {
          averageRating: 0,
          disputeRate: 0,
          avgResponseTime: 0
        }
      };
    }
  }
  
  // Rider onboarding progress methods
  async getRiderOnboardingProgress(userId: number): Promise<RiderOnboardingProgress | undefined> {
    try {
      const [progress] = await db
        .select()
        .from(riderOnboardingProgress)
        .where(eq(riderOnboardingProgress.userId, userId));
      return progress;
    } catch (error) {
      console.error("Error getting rider onboarding progress:", error);
      return undefined;
    }
  }
  
  async createRiderOnboardingProgress(progress: InsertRiderOnboardingProgress): Promise<RiderOnboardingProgress> {
    try {
      const [newProgress] = await db
        .insert(riderOnboardingProgress)
        .values(progress)
        .returning();
      
      return newProgress;
    } catch (error) {
      console.error("Error creating rider onboarding progress:", error);
      throw error;
    }
  }
  
  async updateRiderOnboardingProgress(userId: number, progressData: Partial<RiderOnboardingProgress>): Promise<RiderOnboardingProgress | undefined> {
    try {
      const [progress] = await db
        .select()
        .from(riderOnboardingProgress)
        .where(eq(riderOnboardingProgress.userId, userId));
      
      if (!progress) return undefined;
      
      const [updatedProgress] = await db
        .update(riderOnboardingProgress)
        .set({
          ...progressData,
          lastUpdated: new Date()
        })
        .where(eq(riderOnboardingProgress.userId, userId))
        .returning();
      
      return updatedProgress;
    } catch (error) {
      console.error("Error updating rider onboarding progress:", error);
      return undefined;
    }
  }
  
  // Driver onboarding progress methods
  async getDriverOnboardingProgress(userId: number): Promise<DriverOnboardingProgress | undefined> {
    try {
      const [progress] = await db
        .select()
        .from(driverOnboardingProgress)
        .where(eq(driverOnboardingProgress.userId, userId));
      return progress;
    } catch (error) {
      console.error("Error getting driver onboarding progress:", error);
      return undefined;
    }
  }
  
  async createDriverOnboardingProgress(progress: InsertDriverOnboardingProgress): Promise<DriverOnboardingProgress> {
    try {
      const [newProgress] = await db
        .insert(driverOnboardingProgress)
        .values(progress)
        .returning();
      
      return newProgress;
    } catch (error) {
      console.error("Error creating driver onboarding progress:", error);
      throw error;
    }
  }
  
  async updateDriverOnboardingProgress(userId: number, progressData: Partial<DriverOnboardingProgress>): Promise<DriverOnboardingProgress | undefined> {
    try {
      const [progress] = await db
        .select()
        .from(driverOnboardingProgress)
        .where(eq(driverOnboardingProgress.userId, userId));
      
      if (!progress) return undefined;
      
      const [updatedProgress] = await db
        .update(driverOnboardingProgress)
        .set({
          ...progressData,
          lastActiveAt: new Date()
        })
        .where(eq(driverOnboardingProgress.userId, userId))
        .returning();
      
      return updatedProgress;
    } catch (error) {
      console.error("Error updating driver onboarding progress:", error);
      return undefined;
    }
  }

  // Driver membership management
  async cancelDriverMembership(userId: number, reason: string): Promise<boolean> {
    try {
      // Update user status to cancelled but preserve all data
      await db.update(users)
        .set({ 
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      // Update driver details to mark as cancelled
      await db.update(driverDetails)
        .set({
          applicationStatus: 'cancelled',
          updatedAt: new Date()
        })
        .where(eq(driverDetails.userId, userId));

      // Log the cancellation reason in admin notes
      await this.createAdminNote({
        recordType: 'driver_cancellation',
        recordId: userId,
        adminId: userId, // Self-initiated cancellation
        noteText: `Driver membership cancelled. Reason: ${reason}`,
        isPrivate: false
      });

      console.log(`Driver membership cancelled for user ${userId} with reason: ${reason}`);
      return true;
    } catch (error) {
      console.error("Error cancelling driver membership:", error);
      return false;
    }
  }

  // Promo code methods
  async getPromoCodeByCode(code: string): Promise<PromoCode | undefined> {
    try {
      const [promoCode] = await db
        .select()
        .from(promoCodes)
        .where(eq(promoCodes.code, code));
      return promoCode;
    } catch (error) {
      console.error("Error getting promo code by code:", error);
      return undefined;
    }
  }

  async getAllPromoCodes(): Promise<PromoCode[]> {
    try {
      return await db
        .select()
        .from(promoCodes)
        .orderBy(desc(promoCodes.createdAt));
    } catch (error) {
      console.error("Error getting all promo codes:", error);
      return [];
    }
  }

  async createPromoCode(promoCodeData: InsertPromoCode): Promise<PromoCode> {
    try {
      const [promoCode] = await db
        .insert(promoCodes)
        .values(promoCodeData)
        .returning();
      return promoCode;
    } catch (error) {
      console.error("Error creating promo code:", error);
      throw error;
    }
  }

  async updatePromoCode(id: number, updates: Partial<PromoCode>): Promise<PromoCode | undefined> {
    try {
      const [updatedPromoCode] = await db
        .update(promoCodes)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(promoCodes.id, id))
        .returning();
      return updatedPromoCode;
    } catch (error) {
      console.error("Error updating promo code:", error);
      return undefined;
    }
  }

  async deletePromoCode(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(promoCodes)
        .where(eq(promoCodes.id, id));
      return result.count > 0;
    } catch (error) {
      console.error("Error deleting promo code:", error);
      return false;
    }
  }

  async createPromoCodeUsage(usageData: InsertPromoCodeUsage): Promise<PromoCodeUsage> {
    try {
      const [usage] = await db
        .insert(promoCodeUsage)
        .values(usageData)
        .returning();
      return usage;
    } catch (error) {
      console.error("Error creating promo code usage:", error);
      throw error;
    }
  }

  async getPromoCodeUsage(promoCodeId: number): Promise<PromoCodeUsage[]> {
    try {
      return await db
        .select()
        .from(promoCodeUsage)
        .where(eq(promoCodeUsage.promoCodeId, promoCodeId))
        .orderBy(desc(promoCodeUsage.appliedAt));
    } catch (error) {
      console.error("Error getting promo code usage:", error);
      return [];
    }
  }

  async getUserById(id: number): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error("Error getting user by ID:", error);
      return undefined;
    }
  }

  async recordPromoCodeUsage(usage: InsertPromoCodeUsage): Promise<PromoCodeUsage> {
    try {
      const [insertedUsage] = await db
        .insert(promoCodeUsage)
        .values(usage)
        .returning();
      return insertedUsage;
    } catch (error) {
      console.error("Error recording promo code usage:", error);
      throw error;
    }
  }

  async createPromoCodeUsage(usage: InsertPromoCodeUsage): Promise<PromoCodeUsage> {
    try {
      const [insertedUsage] = await db
        .insert(promoCodeUsage)
        .values(usage)
        .returning();
      return insertedUsage;
    } catch (error) {
      console.error("Error creating promo code usage:", error);
      throw error;
    }
  }

  async incrementPromoCodeUsage(promoCodeId: number): Promise<void> {
    try {
      await db
        .update(promoCodes)
        .set({
          usedCount: sql`used_count + 1`
        })
        .where(eq(promoCodes.id, promoCodeId));
    } catch (error) {
      console.error("Error incrementing promo code usage:", error);
      throw error;
    }
  }

  async updateRideWithPromoCode(rideId: number, finalAmount: number, promoCodeId: number): Promise<Ride | undefined> {
    try {
      const [updatedRide] = await db
        .update(rides)
        .set({
          finalPrice: finalAmount,
          promoCodeUsed: promoCodeId,
          updatedAt: new Date()
        })
        .where(eq(rides.id, rideId))
        .returning();
      return updatedRide;
    } catch (error) {
      console.error("Error updating ride with promo code:", error);
      return undefined;
    }
  }

  // Stripe Connect methods
  async updateDriverStripeAccount(userId: number, stripeConnectedAccountId: string): Promise<DriverDetails | undefined> {
    try {
      // First check if driver details exist
      const existingDriver = await db
        .select()
        .from(driverDetails)
        .where(eq(driverDetails.userId, userId))
        .limit(1);

      if (existingDriver.length > 0) {
        // Update existing record
        const [updatedDriver] = await db
          .update(driverDetails)
          .set({
            stripeConnectedAccountId: stripeConnectedAccountId,
            updatedAt: new Date()
          })
          .where(eq(driverDetails.userId, userId))
          .returning();
        
        return updatedDriver;
      } else {
        // Create new driver details record with minimal required fields
        const [newDriver] = await db
          .insert(driverDetails)
          .values({
            userId: userId,
            licenseNumber: '', // Required field, will be filled during onboarding
            licenseState: '', // Required field, will be filled during onboarding
            licenseExpiry: new Date('2025-12-31'), // Temporary date, will be updated during onboarding
            insuranceProvider: '', // Required field, will be filled during onboarding
            insuranceNumber: '', // Required field, will be filled during onboarding
            insuranceExpiry: new Date('2025-12-31'), // Temporary date, will be updated during onboarding
            backgroundCheckStatus: 'pending', // Required field
            accountStatus: 'active',
            serviceArea: [], // Required field
            serviceHours: [], // Required field
            verified: false,
            canAcceptRides: false,
            canViewRideRequests: false,
            maxConcurrentRides: 1,
            requiresApprovalForRides: true,
            licenseVerified: false,
            insuranceVerified: false,
            vehicleVerified: false,
            profileVerified: false,
            medicalCertificationVerified: false,
            drugTestVerified: false,
            mvrRecordVerified: false,
            backgroundCheckVerified: false,
            stripeConnectedAccountId: stripeConnectedAccountId
          })
          .returning();
        
        return newDriver;
      }
    } catch (error) {
      console.error("Error updating driver Stripe account:", error);
      return undefined;
    }
  }

  async getDriverStripeAccount(userId: number): Promise<string | undefined> {
    try {
      const [driver] = await db
        .select({ stripeConnectedAccountId: driverDetails.stripeConnectedAccountId })
        .from(driverDetails)
        .where(eq(driverDetails.userId, userId));
      
      return driver?.stripeConnectedAccountId || undefined;
    } catch (error) {
      console.error("Error getting driver Stripe account:", error);
      return undefined;
    }
  }

  // Driver payout methods
  async createPayout(payout: InsertDriverPayout): Promise<DriverPayout> {
    const [newPayout] = await db
      .insert(driverPayouts)
      .values(payout)
      .returning();
    return newPayout;
  }

  async getDriverPayouts(driverId: number, limit: number = 10): Promise<DriverPayout[]> {
    try {
      return await db
        .select()
        .from(driverPayouts)
        .where(eq(driverPayouts.driverId, driverId))
        .orderBy(desc(driverPayouts.createdAt))
        .limit(limit);
    } catch (error) {
      console.error("Error getting driver payouts:", error);
      return [];
    }
  }

  async getPayoutsSummary(startDate: Date, endDate: Date): Promise<DriverPayout[]> {
    try {
      return await db
        .select()
        .from(driverPayouts)
        .where(
          and(
            gte(driverPayouts.createdAt, startDate),
            lte(driverPayouts.createdAt, endDate),
            eq(driverPayouts.status, 'completed')
          )
        )
        .orderBy(desc(driverPayouts.createdAt));
    } catch (error) {
      console.error("Error getting payouts summary:", error);
      return [];
    }
  }

  async updatePayoutStatus(payoutId: number, status: string, failureReason?: string): Promise<void> {
    try {
      await db
        .update(driverPayouts)
        .set({ 
          status, 
          failureReason,
          updatedAt: new Date()
        })
        .where(eq(driverPayouts.id, payoutId));
    } catch (error) {
      console.error("Error updating payout status:", error);
      throw error;
    }
  }

  // Platform settings methods
  async getPlatformSetting(key: string): Promise<PlatformSetting | undefined> {
    try {
      const [setting] = await db
        .select()
        .from(platformSettings)
        .where(eq(platformSettings.key, key));
      return setting;
    } catch (error) {
      console.error("Error getting platform setting:", error);
      return undefined;
    }
  }

  async getAllPlatformSettings(): Promise<PlatformSetting[]> {
    try {
      return await db
        .select()
        .from(platformSettings)
        .orderBy(platformSettings.category, platformSettings.key);
    } catch (error) {
      console.error("Error getting all platform settings:", error);
      return [];
    }
  }

  async setPlatformSetting(settingData: InsertPlatformSetting): Promise<PlatformSetting> {
    try {
      const [setting] = await db
        .insert(platformSettings)
        .values(settingData)
        .onConflictDoUpdate({
          target: platformSettings.key,
          set: {
            value: settingData.value,
            lastModifiedBy: settingData.lastModifiedBy,
            updatedAt: new Date()
          }
        })
        .returning();
      return setting;
    } catch (error) {
      console.error("Error setting platform setting:", error);
      throw error;
    }
  }

  async updatePlatformSetting(key: string, value: string, lastModifiedBy?: number): Promise<PlatformSetting | undefined> {
    try {
      const [updatedSetting] = await db
        .update(platformSettings)
        .set({
          value,
          lastModifiedBy,
          updatedAt: new Date()
        })
        .where(eq(platformSettings.key, key))
        .returning();
      return updatedSetting;
    } catch (error) {
      console.error("Error updating platform setting:", error);
      return undefined;
    }
  }

  async deletePlatformSetting(key: string): Promise<boolean> {
    try {
      const result = await db
        .delete(platformSettings)
        .where(eq(platformSettings.key, key));
      return result.count > 0;
    } catch (error) {
      console.error("Error deleting platform setting:", error);
      return false;
    }
  }

  async getDriverPayoutByRide(rideId: number): Promise<DriverPayout | undefined> {
    try {
      const [payout] = await db
        .select()
        .from(driverPayouts)
        .where(eq(driverPayouts.rideId, rideId));
      return payout;
    } catch (error) {
      console.error("Error getting driver payout by ride:", error);
      return undefined;
    }
  }

  async updateDriverPayout(payoutId: number, updates: Partial<DriverPayout>): Promise<DriverPayout | undefined> {
    try {
      const [updatedPayout] = await db
        .update(driverPayouts)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(driverPayouts.id, payoutId))
        .returning();
      return updatedPayout;
    } catch (error) {
      console.error("Error updating driver payout:", error);
      return undefined;
    }
  }

  async getDriverById(id: number): Promise<DriverDetails | undefined> {
    try {
      const [driver] = await db
        .select()
        .from(driverDetails)
        .where(eq(driverDetails.id, id));
      return driver;
    } catch (error) {
      console.error("Error getting driver by ID:", error);
      return undefined;
    }
  }

  // Legal agreement signature methods
  async getLegalAgreementSignature(userId: number, documentType: string): Promise<LegalAgreementSignature | undefined> {
    try {
      const [signature] = await db
        .select()
        .from(legalAgreementSignatures)
        .where(
          and(
            eq(legalAgreementSignatures.userId, userId),
            eq(legalAgreementSignatures.documentType, documentType),
            eq(legalAgreementSignatures.isActive, true)
          )
        )
        .orderBy(desc(legalAgreementSignatures.signedAt));
      return signature;
    } catch (error) {
      console.error("Error getting legal agreement signature:", error);
      return undefined;
    }
  }

  async getUserLegalAgreementSignatures(userId: number): Promise<LegalAgreementSignature[]> {
    try {
      return await db
        .select()
        .from(legalAgreementSignatures)
        .where(
          and(
            eq(legalAgreementSignatures.userId, userId),
            eq(legalAgreementSignatures.isActive, true)
          )
        )
        .orderBy(desc(legalAgreementSignatures.signedAt));
    } catch (error) {
      console.error("Error getting user legal agreement signatures:", error);
      return [];
    }
  }

  async createLegalAgreementSignature(signature: InsertLegalAgreementSignature): Promise<LegalAgreementSignature> {
    try {
      // Deactivate any existing signatures for this user and document type
      await db
        .update(legalAgreementSignatures)
        .set({ isActive: false })
        .where(
          and(
            eq(legalAgreementSignatures.userId, signature.userId),
            eq(legalAgreementSignatures.documentType, signature.documentType)
          )
        );

      // Create new signature
      const [newSignature] = await db
        .insert(legalAgreementSignatures)
        .values({
          ...signature,
          signedAt: new Date()
        })
        .returning();

      return newSignature;
    } catch (error) {
      console.error("Error creating legal agreement signature:", error);
      throw error;
    }
  }

  async hasUserSignedDocument(userId: number, documentType: string): Promise<boolean> {
    try {
      const signature = await this.getLegalAgreementSignature(userId, documentType);
      return signature !== undefined;
    } catch (error) {
      console.error("Error checking if user has signed document:", error);
      return false;
    }
  }

  async getRequiredDocumentsForUser(userId: number): Promise<string[]> {
    try {
      const user = await this.getUserById(userId);
      if (!user) return [];

      // Use new comprehensive documents
      const requiredDocs = ['terms_of_service', 'privacy_policy'];
      
      if (user.role === 'driver') {
        requiredDocs.push('driver_agreement');
      }

      return requiredDocs;
    } catch (error) {
      console.error("Error getting required documents for user:", error);
      return [];
    }
  }

  async hasUserSignedAllRequiredDocuments(userId: number): Promise<boolean> {
    try {
      const requiredDocs = await this.getRequiredDocumentsForUser(userId);
      const signatures = await this.getUserLegalAgreementSignatures(userId);
      
      const signedDocTypes = signatures.map(sig => sig.documentType);
      
      return requiredDocs.every(docType => signedDocTypes.includes(docType));
    } catch (error) {
      console.error("Error checking if user has signed all required documents:", error);
      return false;
    }
  }

  // Get active drivers for urgent ride notifications
  async getActiveDrivers(): Promise<User[]> {
    try {
      // Get users who are drivers and have approved driver details
      const activeDrivers = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          role: users.role,
          isActive: users.isActive
        })
        .from(users)
        .innerJoin(driverDetails, eq(users.id, driverDetails.userId))
        .where(
          and(
            eq(users.role, 'driver'),
            eq(users.isActive, true),
            eq(driverDetails.applicationStatus, 'approved')
          )
        );
      
      return activeDrivers;
    } catch (error) {
      console.error("Error getting active drivers:", error);
      return [];
    }
  }

  // Unified Document Storage Methods
  async saveDocument(document: InsertDocument): Promise<Document> {
    try {
      const [savedDocument] = await db
        .insert(documents)
        .values({
          ...document,
          uploadedAt: new Date()
        })
        .returning();
      return savedDocument;
    } catch (error) {
      console.error("Error saving document:", error);
      throw error;
    }
  }

  async getUserDocuments(userId: number, documentType?: string): Promise<Document[]> {
    try {
      let query = db
        .select()
        .from(documents)
        .where(eq(documents.userId, userId));

      if (documentType) {
        query = query.where(eq(documents.documentType, documentType));
      }

      return await query.orderBy(desc(documents.uploadedAt));
    } catch (error) {
      console.error("Error getting user documents:", error);
      return [];
    }
  }

  async updateDocumentVerification(
    documentId: number, 
    status: 'pending' | 'approved' | 'rejected',
    verifiedBy?: number,
    rejectionReason?: string
  ): Promise<Document | undefined> {
    try {
      const updateData: Partial<Document> = {
        verificationStatus: status,
        verifiedAt: new Date(),
        verifiedBy,
        rejectionReason
      };

      const [updatedDocument] = await db
        .update(documents)
        .set(updateData)
        .where(eq(documents.id, documentId))
        .returning();

      return updatedDocument;
    } catch (error) {
      console.error("Error updating document verification:", error);
      return undefined;
    }
  }

  async getDocumentById(documentId: number): Promise<Document | undefined> {
    try {
      const [document] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId));
      return document;
    } catch (error) {
      console.error("Error getting document by ID:", error);
      return undefined;
    }
  }

  async deleteDocument(documentId: number): Promise<boolean> {
    try {
      await db
        .delete(documents)
        .where(eq(documents.id, documentId));
      return true;
    } catch (error) {
      console.error("Error deleting document:", error);
      return false;
    }
  }

  // Document storage methods
  async saveDocument(document: InsertDocument): Promise<Document> {
    try {
      const [savedDocument] = await db
        .insert(documents)
        .values(document)
        .returning();
      
      console.log(`💾 Document saved to database: ${savedDocument.filename}`);
      return savedDocument;
    } catch (error) {
      console.error('Error saving document to database:', error);
      throw error;
    }
  }

  async getUserDocuments(userId: number, documentType?: string): Promise<Document[]> {
    try {
      let query = db
        .select()
        .from(documents)
        .where(eq(documents.userId, userId));

      if (documentType) {
        query = query.where(eq(documents.documentType, documentType));
      }

      return await query.orderBy(desc(documents.uploadedAt));
    } catch (error) {
      console.error('Error getting user documents:', error);
      return [];
    }
  }

  async updateDocumentVerification(
    documentId: number, 
    status: 'pending' | 'approved' | 'rejected',
    verifiedBy?: number,
    rejectionReason?: string
  ): Promise<Document | undefined> {
    try {
      const updateData: any = {
        verificationStatus: status,
        verifiedAt: new Date()
      };

      if (verifiedBy) {
        updateData.verifiedBy = verifiedBy;
      }

      if (rejectionReason) {
        updateData.rejectionReason = rejectionReason;
      }

      const [updatedDocument] = await db
        .update(documents)
        .set(updateData)
        .where(eq(documents.id, documentId))
        .returning();

      return updatedDocument;
    } catch (error) {
      console.error('Error updating document verification:', error);
      return undefined;
    }
  }

  async getDocumentById(documentId: number): Promise<Document | undefined> {
    try {
      const [document] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId));

      return document;
    } catch (error) {
      console.error('Error getting document by ID:', error);
      return undefined;
    }
  }

  async deleteDocument(documentId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(documents)
        .where(eq(documents.id, documentId))
        .returning();

      return result.length > 0;
    } catch (error) {
      console.error('Error deleting document:', error);
      return false;
    }
  }

  // Admin document retrieval methods
  async getAllDocuments(filters: any = {}, pagination: { limit: number; offset: number }): Promise<Document[]> {
    try {
      let query = db.select().from(documents);
      
      // Apply filters
      const conditions = [];
      if (filters.userId) {
        conditions.push(eq(documents.userId, filters.userId));
      }
      if (filters.documentType) {
        conditions.push(eq(documents.documentType, filters.documentType));
      }
      if (filters.verificationStatus) {
        conditions.push(eq(documents.verificationStatus, filters.verificationStatus));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      // Apply pagination
      query = query.limit(pagination.limit).offset(pagination.offset);
      
      // Order by upload date (newest first)
      query = query.orderBy(desc(documents.uploadedAt));
      
      return await query;
    } catch (error) {
      console.error('Error getting all documents:', error);
      throw error;
    }
  }

  // Get documents for review with user information - Phase 3 integration
  async getDocumentsForReview(options: {
    status?: string;
    type?: string;
    limit?: number;
  }): Promise<Array<Document & { userName?: string; userEmail?: string }>> {
    try {
      const { status = 'pending', type, limit = 50 } = options;
      
      let query = db
        .select({
          id: documents.id,
          userId: documents.userId,
          userName: users.fullName,
          userEmail: users.email,
          type: documents.type,
          title: documents.title,
          uploadedAt: documents.uploadedAt,
          status: documents.status,
          rejectionReason: documents.rejectionReason,
          expirationDate: documents.expirationDate,
          filePath: documents.filePath,
          thumbnailPath: documents.thumbnailPath,
          fileSize: documents.fileSize,
          mimeType: documents.mimeType,
          reviewedAt: documents.reviewedAt,
          reviewedBy: documents.reviewedBy
        })
        .from(documents)
        .leftJoin(users, eq(documents.userId, users.id))
        .where(eq(documents.status, status))
        .orderBy(desc(documents.uploadedAt))
        .limit(limit);

      if (type) {
        query = query.where(and(eq(documents.status, status), eq(documents.type, type)));
      }

      const result = await query;
      
      console.log(`Retrieved ${result.length} documents for review (status: ${status}${type ? `, type: ${type}` : ''})`);
      return result;
    } catch (error) {
      console.error("Error retrieving documents for review:", error);
      throw error;
    }
  }

  async getDocumentsByStatus(status: string): Promise<Document[]> {
    try {
      return await db
        .select()
        .from(documents)
        .where(eq(documents.verificationStatus, status))
        .orderBy(desc(documents.uploadedAt));
    } catch (error) {
      console.error('Error getting documents by status:', error);
      throw error;
    }
  }

  async getDocumentStatistics(): Promise<any> {
    try {
      // Get total counts by status
      const totalQuery = await db
        .select({
          verificationStatus: documents.verificationStatus,
          count: sql<number>`count(*)`
        })
        .from(documents)
        .groupBy(documents.verificationStatus);

      // Get counts by document type
      const typeQuery = await db
        .select({
          documentType: documents.documentType,
          count: sql<number>`count(*)`
        })
        .from(documents)
        .groupBy(documents.documentType);

      // Get total file size
      const sizeQuery = await db
        .select({
          totalSize: sql<number>`sum(${documents.fileSize})`
        })
        .from(documents);

      // Get recent uploads (last 7 days)
      const recentQuery = await db
        .select({
          count: sql<number>`count(*)`
        })
        .from(documents)
        .where(gte(documents.uploadedAt, sql`now() - interval '7 days'`));

      return {
        byStatus: totalQuery.reduce((acc, item) => {
          acc[item.verificationStatus] = item.count;
          return acc;
        }, {} as Record<string, number>),
        byType: typeQuery.reduce((acc, item) => {
          acc[item.documentType] = item.count;
          return acc;
        }, {} as Record<string, number>),
        totalSize: sizeQuery[0]?.totalSize || 0,
        recentUploads: recentQuery[0]?.count || 0,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting document statistics:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
