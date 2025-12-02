import { Router } from 'express';
import { storage } from '../storage';
import { isAuthenticated, hasRole } from '../middleware/auth';

const router = Router();

// Get comprehensive analytics data
router.get('/', isAuthenticated, hasRole('admin'), async (req, res) => {
  try {
    const { timeRange = '7d' } = req.query;
    
    // Get all data needed for analytics
    const [allUsers, allRides, totalRevenue] = await Promise.all([
      storage.getAllUsers(),
      storage.getAllRides(),
      storage.calculateTotalRevenue()
    ]);

    // Calculate time range boundaries
    const now = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    // Filter data by time range
    const filteredRides = allRides.filter(ride => 
      new Date(ride.createdAt) >= startDate
    );

    // Calculate revenue metrics
    const completedRides = filteredRides.filter(ride => ride.status === 'completed');
    const revenueInPeriod = completedRides.reduce((sum, ride) => 
      sum + (ride.finalPrice || ride.estimatedPrice || 0), 0
    );

    // Calculate previous period for growth comparison
    const previousStartDate = new Date(startDate);
    const periodLength = now.getTime() - startDate.getTime();
    previousStartDate.setTime(startDate.getTime() - periodLength);
    
    const previousRides = allRides.filter(ride => {
      const rideDate = new Date(ride.createdAt);
      return rideDate >= previousStartDate && rideDate < startDate;
    });
    
    const previousRevenue = previousRides
      .filter(ride => ride.status === 'completed')
      .reduce((sum, ride) => sum + (ride.finalPrice || ride.estimatedPrice || 0), 0);

    const revenueGrowth = previousRevenue > 0 
      ? ((revenueInPeriod - previousRevenue) / previousRevenue) * 100 
      : 0;

    // User metrics
    const riders = allUsers.filter(user => user.role === 'rider');
    const drivers = allUsers.filter(user => user.role === 'driver');
    const newUsersInPeriod = allUsers.filter(user => 
      new Date(user.createdAt) >= startDate
    );

    // Calculate active users (users with activity in the period)
    const activeUserIds = new Set();
    filteredRides.forEach(ride => {
      activeUserIds.add(ride.riderId);
      if (ride.driverId) activeUserIds.add(ride.driverId);
    });

    // Ride metrics
    const cancelledRides = filteredRides.filter(ride => ride.status === 'cancelled');
    const pendingRides = filteredRides.filter(ride => 
      ['pending', 'confirmed', 'en_route', 'arrived', 'in_progress'].includes(ride.status)
    );

    const completionRate = filteredRides.length > 0 
      ? (completedRides.length / filteredRides.length) * 100 
      : 0;

    // Calculate average ride duration (mock data for now)
    const averageDuration = 25 + Math.random() * 10; // 25-35 minutes

    // Performance metrics (mock data)
    const performanceMetrics = {
      averageResponseTime: Math.round(3 + Math.random() * 5), // 3-8 minutes
      driverUtilization: Math.round(70 + Math.random() * 20), // 70-90%
      customerSatisfaction: Math.round(85 + Math.random() * 10), // 85-95%
      repeatBookingRate: Math.round(40 + Math.random() * 20) // 40-60%
    };

    // Retention rate calculation (simplified)
    const retentionRate = activeUserIds.size > 0 
      ? (activeUserIds.size / allUsers.length) * 100 
      : 0;

    const analyticsData = {
      revenue: {
        daily: generateDailyData(completedRides, 'revenue'),
        weekly: generateWeeklyData(completedRides, 'revenue'),
        monthly: generateMonthlyData(completedRides, 'revenue'),
        total: totalRevenue,
        growth: revenueGrowth
      },
      rides: {
        completed: completedRides.length,
        cancelled: cancelledRides.length,
        pending: pendingRides.length,
        total: filteredRides.length,
        averageDuration,
        completionRate
      },
      users: {
        totalRiders: riders.length,
        totalDrivers: drivers.length,
        activeUsers: activeUserIds.size,
        newSignups: newUsersInPeriod.length,
        retentionRate
      },
      performance: performanceMetrics
    };

    res.json(analyticsData);
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    res.status(500).json({ message: 'Failed to fetch analytics data' });
  }
});

// Helper functions for generating time-series data
function generateDailyData(rides: any[], type: 'revenue' | 'rides'): number[] {
  const data: number[] = [];
  const now = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    
    const dayRides = rides.filter(ride => {
      const rideDate = new Date(ride.createdAt);
      return rideDate >= date && rideDate < nextDate;
    });
    
    if (type === 'revenue') {
      const dayRevenue = dayRides.reduce((sum, ride) => 
        sum + (ride.finalPrice || ride.estimatedPrice || 0), 0
      );
      data.push(dayRevenue);
    } else {
      data.push(dayRides.length);
    }
  }
  
  return data;
}

function generateWeeklyData(rides: any[], type: 'revenue' | 'rides'): number[] {
  const data: number[] = [];
  const now = new Date();
  
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + (i * 7)));
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    const weekRides = rides.filter(ride => {
      const rideDate = new Date(ride.createdAt);
      return rideDate >= weekStart && rideDate < weekEnd;
    });
    
    if (type === 'revenue') {
      const weekRevenue = weekRides.reduce((sum, ride) => 
        sum + (ride.finalPrice || ride.estimatedPrice || 0), 0
      );
      data.push(weekRevenue);
    } else {
      data.push(weekRides.length);
    }
  }
  
  return data;
}

function generateMonthlyData(rides: any[], type: 'revenue' | 'rides'): number[] {
  const data: number[] = [];
  const now = new Date();
  
  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    
    const monthRides = rides.filter(ride => {
      const rideDate = new Date(ride.createdAt);
      return rideDate >= monthStart && rideDate <= monthEnd;
    });
    
    if (type === 'revenue') {
      const monthRevenue = monthRides.reduce((sum, ride) => 
        sum + (ride.finalPrice || ride.estimatedPrice || 0), 0
      );
      data.push(monthRevenue);
    } else {
      data.push(monthRides.length);
    }
  }
  
  return data;
}

export default router;