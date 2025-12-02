/**
 * Welcome email templates for different user roles
 */

type WelcomeTemplateData = {
  firstName: string;
  appUrl: string;
  supportEmail: string;
  unsubscribeUrl: string;
  profileUrl: string;
  onboardingUrl: string;
  logoUrl: string;
};

/**
 * Get HTML email template for rider welcome emails
 */
export function getRiderWelcomeEmailTemplate(data: WelcomeTemplateData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Welcome to MyAmbulex</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding: 20px 0;
    }
    .logo {
      max-width: 200px;
    }
    .content {
      background-color: #f9f9f9;
      padding: 30px;
      border-radius: 8px;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #888;
      margin-top: 30px;
    }
    .button {
      display: inline-block;
      background-color: #00B2E3;
      color: white;
      text-decoration: none;
      padding: 12px 20px;
      border-radius: 4px;
      margin-top: 20px;
      font-weight: bold;
    }
    .highlight {
      background-color: #e6f7fb;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .steps {
      margin: 20px 0;
    }
    .step {
      margin-bottom: 10px;
      display: flex;
    }
    .step-number {
      background-color: #00B2E3;
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: inline-flex;
      justify-content: center;
      align-items: center;
      margin-right: 10px;
      flex-shrink: 0;
    }
    .step-content {
      flex: 1;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${data.logoUrl}" alt="MyAmbulex Logo" class="logo">
    </div>
    
    <div class="content">
      <h1>Welcome to MyAmbulex, ${data.firstName}!</h1>
      
      <p>We're excited to have you join our community dedicated to providing reliable and compassionate non-emergency medical transportation.</p>
      
      <div class="highlight">
        <p>Your account is now active, and you can start booking transportation services right away.</p>
      </div>
      
      <h2>Getting Started in 3 Easy Steps:</h2>
      
      <div class="steps">
        <div class="step">
          <div class="step-number">1</div>
          <div class="step-content">
            <strong>Complete your profile</strong> - Add your medical information, emergency contacts, and insurance details to streamline the booking process.
          </div>
        </div>
        
        <div class="step">
          <div class="step-number">2</div>
          <div class="step-content">
            <strong>Save frequently visited locations</strong> - Add your home, doctor's offices, and other medical facilities you visit regularly.
          </div>
        </div>
        
        <div class="step">
          <div class="step-number">3</div>
          <div class="step-content">
            <strong>Book your first ride</strong> - Request a ride for your next medical appointment and receive bids from our qualified drivers.
          </div>
        </div>
      </div>
      
      <div style="text-align: center;">
        <a href="${data.onboardingUrl}" class="button">Continue Your Setup</a>
      </div>
      
      <p style="margin-top: 30px;">Have questions or need assistance? Our support team is here to help! Contact us at <a href="mailto:${data.supportEmail}">${data.supportEmail}</a>.</p>
    </div>
    
    <div class="footer">
      <p>© ${new Date().getFullYear()} MyAmbulex. All rights reserved.</p>
      <p>
        <a href="${data.unsubscribeUrl}">Unsubscribe</a> | 
        <a href="${data.appUrl}/privacy-policy">Privacy Policy</a> | 
        <a href="${data.appUrl}/terms-of-service">Terms of Service</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Get HTML email template for driver welcome emails
 */
export function getDriverWelcomeEmailTemplate(data: WelcomeTemplateData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Welcome to MyAmbulex Driver Network</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding: 20px 0;
    }
    .logo {
      max-width: 200px;
    }
    .content {
      background-color: #f9f9f9;
      padding: 30px;
      border-radius: 8px;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #888;
      margin-top: 30px;
    }
    .button {
      display: inline-block;
      background-color: #00B2E3;
      color: white;
      text-decoration: none;
      padding: 12px 20px;
      border-radius: 4px;
      margin-top: 20px;
      font-weight: bold;
    }
    .highlight {
      background-color: #e6f7fb;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .steps {
      margin: 20px 0;
    }
    .step {
      margin-bottom: 10px;
      display: flex;
    }
    .step-number {
      background-color: #00B2E3;
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: inline-flex;
      justify-content: center;
      align-items: center;
      margin-right: 10px;
      flex-shrink: 0;
    }
    .step-content {
      flex: 1;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${data.logoUrl}" alt="MyAmbulex Logo" class="logo">
    </div>
    
    <div class="content">
      <h1>Welcome to the MyAmbulex Driver Network, ${data.firstName}!</h1>
      
      <p>We're thrilled to have you join our team of professional drivers dedicated to providing compassionate non-emergency medical transportation services.</p>
      
      <div class="highlight">
        <p>Your account is currently in the verification process. Here's what you need to do next to start accepting ride requests:</p>
      </div>
      
      <h2>Complete Your Driver Registration:</h2>
      
      <div class="steps">
        <div class="step">
          <div class="step-number">1</div>
          <div class="step-content">
            <strong>Upload your documentation</strong> - Including your driver's license, vehicle registration, insurance, and background check authorization.
          </div>
        </div>
        
        <div class="step">
          <div class="step-number">2</div>
          <div class="step-content">
            <strong>Complete the training modules</strong> - Learn about patient care, safety protocols, and using the MyAmbulex platform effectively.
          </div>
        </div>
        
        <div class="step">
          <div class="step-number">3</div>
          <div class="step-content">
            <strong>Set up your vehicle profile</strong> - Add details about your vehicle capabilities, including wheelchair accessibility, stretcher capacity, etc.
          </div>
        </div>
        
        <div class="step">
          <div class="step-number">4</div>
          <div class="step-content">
            <strong>Set your availability</strong> - Let us know when you're available to accept ride requests.
          </div>
        </div>
      </div>
      
      <div style="text-align: center;">
        <a href="${data.onboardingUrl}" class="button">Continue Your Registration</a>
      </div>
      
      <p style="margin-top: 30px;">Have questions or need assistance? Our driver support team is here to help! Contact us at <a href="mailto:${data.supportEmail}">${data.supportEmail}</a>.</p>
    </div>
    
    <div class="footer">
      <p>© ${new Date().getFullYear()} MyAmbulex. All rights reserved.</p>
      <p>
        <a href="${data.unsubscribeUrl}">Unsubscribe</a> | 
        <a href="${data.appUrl}/privacy-policy">Privacy Policy</a> | 
        <a href="${data.appUrl}/terms-of-service">Terms of Service</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Get plain text version of welcome email for riders
 */
export function getRiderWelcomeEmailText(data: WelcomeTemplateData): string {
  return `
Welcome to MyAmbulex, ${data.firstName}!

We're excited to have you join our community dedicated to providing reliable and compassionate non-emergency medical transportation.

Your account is now active, and you can start booking transportation services right away.

Getting Started in 3 Easy Steps:

1. Complete your profile - Add your medical information, emergency contacts, and insurance details to streamline the booking process.

2. Save frequently visited locations - Add your home, doctor's offices, and other medical facilities you visit regularly.

3. Book your first ride - Request a ride for your next medical appointment and receive bids from our qualified drivers.

Continue your setup here: ${data.onboardingUrl}

Have questions or need assistance? Our support team is here to help! Contact us at ${data.supportEmail}.

© ${new Date().getFullYear()} MyAmbulex. All rights reserved.
Unsubscribe: ${data.unsubscribeUrl}
Privacy Policy: ${data.appUrl}/privacy-policy
Terms of Service: ${data.appUrl}/terms-of-service
  `;
}

/**
 * Get plain text version of welcome email for drivers
 */
export function getDriverWelcomeEmailText(data: WelcomeTemplateData): string {
  return `
Welcome to the MyAmbulex Driver Network, ${data.firstName}!

We're thrilled to have you join our team of professional drivers dedicated to providing compassionate non-emergency medical transportation services.

Your account is currently in the verification process. Here's what you need to do next to start accepting ride requests:

Complete Your Driver Registration:

1. Upload your documentation - Including your driver's license, vehicle registration, insurance, and background check authorization.

2. Complete the training modules - Learn about patient care, safety protocols, and using the MyAmbulex platform effectively.

3. Set up your vehicle profile - Add details about your vehicle capabilities, including wheelchair accessibility, stretcher capacity, etc.

4. Set your availability - Let us know when you're available to accept ride requests.

Continue your registration here: ${data.onboardingUrl}

Have questions or need assistance? Our driver support team is here to help! Contact us at ${data.supportEmail}.

© ${new Date().getFullYear()} MyAmbulex. All rights reserved.
Unsubscribe: ${data.unsubscribeUrl}
Privacy Policy: ${data.appUrl}/privacy-policy
Terms of Service: ${data.appUrl}/terms-of-service
  `;
}