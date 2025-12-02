/**
 * Welcome SMS templates for different user roles
 */

type WelcomeTemplateData = {
  firstName: string;
  appUrl: string;
  supportPhone: string;
  onboardingUrl: string;
};

/**
 * Get welcome SMS template for riders
 */
export function getRiderWelcomeSmsTemplate(data: WelcomeTemplateData): string {
  return `Welcome to MyAmbulex, ${data.firstName}! Your account is now active. Complete your profile at ${data.onboardingUrl} to make booking rides easier. Questions? Call ${data.supportPhone}.`;
}

/**
 * Get welcome SMS template for drivers
 */
export function getDriverWelcomeSmsTemplate(data: WelcomeTemplateData): string {
  return `Welcome to the MyAmbulex Driver Network, ${data.firstName}! Please complete your registration at ${data.onboardingUrl} to start accepting ride requests. Questions? Call ${data.supportPhone}.`;
}

/**
 * Get follow-up reminder SMS template for incomplete profiles (riders)
 */
export function getRiderProfileReminderSmsTemplate(data: WelcomeTemplateData): string {
  return `Hi ${data.firstName}, remember to complete your MyAmbulex profile to make booking medical transportation faster. Visit ${data.onboardingUrl} to finish setting up your account.`;
}

/**
 * Get follow-up reminder SMS template for incomplete registration (drivers)
 */
export function getDriverRegistrationReminderSmsTemplate(data: WelcomeTemplateData): string {
  return `Hi ${data.firstName}, please finish your MyAmbulex driver registration to start accepting ride requests. Visit ${data.onboardingUrl} to complete remaining steps.`;
}

/**
 * Get first ride assistance SMS template (riders)
 */
export function getRiderFirstRideReminderSmsTemplate(data: WelcomeTemplateData): string {
  return `Hi ${data.firstName}, need help booking your first medical ride with MyAmbulex? We're here to help! Visit ${data.appUrl}/request-ride or call ${data.supportPhone} for assistance.`;
}