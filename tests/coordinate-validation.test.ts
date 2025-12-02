/**
 * Test suite for nationwide coordinate validation system
 * Ensures pricing works correctly across all US territories
 */

import { CoordinateValidator } from '@shared/coordinate-validator';
import { BackupFareCalculator } from '@shared/backup-fare-calculator';

describe('Nationwide Coordinate Validation', () => {
  describe('US Territory Coverage', () => {
    test('validates continental US coordinates', () => {
      // New York to Los Angeles
      const nyc = { lat: 40.7128, lng: -74.0060 };
      const la = { lat: 34.0522, lng: -118.2437 };
      
      const nycValidation = CoordinateValidator.validateUSCoordinates(nyc);
      const laValidation = CoordinateValidator.validateUSCoordinates(la);
      
      expect(nycValidation.isValid).toBe(true);
      expect(laValidation.isValid).toBe(true);
    });

    test('validates Alaska coordinates', () => {
      // Anchorage, Alaska
      const anchorage = { lat: 61.2181, lng: -149.9003 };
      
      const validation = CoordinateValidator.validateUSCoordinates(anchorage);
      expect(validation.isValid).toBe(true);
    });

    test('validates Hawaii coordinates', () => {
      // Honolulu, Hawaii
      const honolulu = { lat: 21.3099, lng: -157.8581 };
      
      const validation = CoordinateValidator.validateUSCoordinates(honolulu);
      expect(validation.isValid).toBe(true);
    });

    test('rejects international coordinates', () => {
      // Piedmont, Italy (the source of the original bug)
      const piedmontItaly = { lat: 45.0522366, lng: 7.5153885 };
      
      const validation = CoordinateValidator.validateUSCoordinates(piedmontItaly);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe("Location outside US service area");
    });

    test('rejects common fallback coordinates', () => {
      const fallbacks = [
        { lat: 0, lng: 0 },    // Null Island
        { lat: 1, lng: 1 },    // Common default
        { lat: 90, lng: 0 },   // North Pole
        { lat: -90, lng: 0 }   // South Pole
      ];

      fallbacks.forEach(coord => {
        const validation = CoordinateValidator.validateUSCoordinates(coord);
        expect(validation.isValid).toBe(false);
      });
    });
  });

  describe('Distance Calculations', () => {
    test('calculates reasonable distances across US', () => {
      // Miami to Seattle (cross-country)
      const miami = { lat: 25.7617, lng: -80.1918 };
      const seattle = { lat: 47.6062, lng: -122.3321 };
      
      const result = CoordinateValidator.calculateValidatedDistance(miami, seattle);
      
      expect(result.success).toBe(true);
      expect(result.distance).toBeGreaterThan(2500); // ~3000 miles
      expect(result.distance).toBeLessThan(4000);
    });

    test('calculates short distances correctly', () => {
      // Atlanta to Piedmont Hospital (local transport)
      const atlanta = { lat: 33.7490, lng: -84.3880 };
      const piedmontHospital = { lat: 33.8038, lng: -84.3694 };
      
      const result = CoordinateValidator.calculateValidatedDistance(atlanta, piedmontHospital);
      
      expect(result.success).toBe(true);
      expect(result.distance).toBeGreaterThan(3); // ~6 miles
      expect(result.distance).toBeLessThan(15);
    });

    test('rejects extreme distances', () => {
      // Valid US coordinates but unreasonable for medical transport
      const maine = { lat: 47.0, lng: -69.0 };
      const hawaii = { lat: 21.3, lng: -157.8 };
      
      const result = CoordinateValidator.calculateValidatedDistance(maine, hawaii);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe("Calculated distance outside reasonable limits");
    });
  });

  describe('Backup Fare Calculator', () => {
    test('calculates fare for cross-country medical transport', () => {
      const pickup = { lat: 40.7128, lng: -74.0060 }; // NYC
      const dropoff = { lat: 34.0522, lng: -118.2437 }; // LA
      
      const result = BackupFareCalculator.calculateBackupFare({
        pickup,
        dropoff,
        vehicleType: 'wheelchair',
        additionalServices: {
          needsCompanion: true
        }
      });
      
      expect(result.success).toBe(true);
      expect(result.estimatedFare).toBeGreaterThan(1000); // Long distance should be expensive
      expect(result.breakdown).toBeDefined();
    });

    test('calculates fare for local medical transport', () => {
      const pickup = { lat: 33.7490, lng: -84.3880 }; // Atlanta
      const dropoff = { lat: 33.8038, lng: -84.3694 }; // Piedmont Hospital
      
      const result = BackupFareCalculator.calculateBackupFare({
        pickup,
        dropoff,
        vehicleType: 'standard',
        isRoundTrip: true
      });
      
      expect(result.success).toBe(true);
      expect(result.estimatedFare).toBeGreaterThan(50);
      expect(result.estimatedFare).toBeLessThan(200);
      expect(result.breakdown).toBeDefined();
    });

    test('handles invalid coordinates gracefully', () => {
      const invalidPickup = { lat: 45.0522366, lng: 7.5153885 }; // Italy
      const validDropoff = { lat: 33.7490, lng: -84.3880 }; // Atlanta
      
      const result = BackupFareCalculator.calculateBackupFare({
        pickup: invalidPickup,
        dropoff: validDropoff,
        vehicleType: 'standard'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain("Pickup location");
    });
  });

  describe('Error Handling', () => {
    test('provides user-friendly error messages', () => {
      const errors = [
        "Invalid coordinate format",
        "Location outside US service area", 
        "Calculated distance outside reasonable limits",
        "Unable to calculate distance at this time"
      ];

      errors.forEach(error => {
        const friendlyMessage = CoordinateValidator.getUserFriendlyError(error);
        expect(friendlyMessage).not.toContain("coordinate");
        expect(friendlyMessage).not.toContain("validation");
        expect(friendlyMessage.length).toBeGreaterThan(10);
      });
    });

    test('provides fallback error message for unknown errors', () => {
      const unknownError = "Some random technical error";
      const friendlyMessage = CoordinateValidator.getUserFriendlyError(unknownError);
      
      expect(friendlyMessage).toBe("We cannot process this request at this time");
    });
  });

  describe('Duration and Distance Formatting', () => {
    test('formats distances correctly', () => {
      expect(BackupFareCalculator.formatDistance(5.5)).toBe("5.5 mi");
      expect(BackupFareCalculator.formatDistance(100.0)).toBe("100.0 mi");
    });

    test('formats durations correctly', () => {
      expect(BackupFareCalculator.estimateDuration(30)).toBe("60 min"); // 30 miles @ 30mph
      expect(BackupFareCalculator.estimateDuration(60)).toBe("2h"); // 60 miles @ 30mph
      expect(BackupFareCalculator.estimateDuration(75)).toBe("2h 30m"); // 75 miles @ 30mph
    });
  });
});