/**
 * Beta Testing Configuration (Frontend)
 * Controls which features are enabled/disabled during beta phase
 */

export const BETA_CONFIG = {
  // Payment Methods
  ENABLE_STRIPE: true,
  ENABLE_PAYPAL: false, // Disabled for beta testing phase
  
  // Feature Flags
  FEATURES: {
    real_time_tracking: true,
    bidding_system: true,
    counter_offers: true,
    recurring_rides: true,
    accessibility_options: true,
    notification_system: true,
    chat_system: true,
    document_upload: true,
    payment_processing: true,
  }
};

export const getBetaConfig = () => BETA_CONFIG;

export const isFeatureEnabled = (feature: keyof typeof BETA_CONFIG.FEATURES): boolean => {
  return BETA_CONFIG.FEATURES[feature] || false;
};

export const isPaymentMethodEnabled = (method: 'stripe' | 'paypal'): boolean => {
  switch (method) {
    case 'stripe':
      return BETA_CONFIG.ENABLE_STRIPE;
    case 'paypal':
      return BETA_CONFIG.ENABLE_PAYPAL;
    default:
      return false;
  }
};