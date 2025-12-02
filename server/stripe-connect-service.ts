import Stripe from 'stripe';
import { storage } from './storage';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.Stripe_Secret_Key || process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

export class StripeConnectService {
  /**
   * Create a connected account for a driver
   * @param driverId - The driver's ID in your system
   * @param email - Driver's email address
   * @param businessType - 'individual' or 'company'
   * @returns Stripe connected account
   */
  async createConnectedAccount(
    driverId: number,
    email: string,
    businessType: 'individual' | 'company' = 'individual'
  ): Promise<Stripe.Account> {
    try {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US', // Adjust based on your target market
        email: email,
        business_type: businessType,
        metadata: {
          driver_id: driverId.toString(),
          platform: 'myambulex'
        }
      });

      // Store the connected account ID in your database
      await storage.updateDriverStripeAccount(driverId, account.id);

      console.log(`✅ Connected account created for driver ${driverId}: ${account.id}`);
      return account;

    } catch (error) {
      console.error('Error creating connected account:', error);
      throw new Error('Failed to create connected account');
    }
  }

  /**
   * Create onboarding link for driver to complete Stripe onboarding
   * @param connectedAccountId - The Stripe connected account ID
   * @param returnUrl - Where to redirect after successful onboarding
   * @param refreshUrl - Where to redirect if they need to refresh
   * @returns Onboarding link
   */
  async createOnboardingLink(
    connectedAccountId: string,
    returnUrl: string,
    refreshUrl: string
  ): Promise<string> {
    try {
      const accountLink = await stripe.accountLinks.create({
        account: connectedAccountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });

      return accountLink.url;
    } catch (error) {
      console.error('Error creating onboarding link:', error);
      throw new Error('Failed to create onboarding link');
    }
  }

  /**
   * Check if a connected account has completed onboarding
   * @param connectedAccountId - The Stripe connected account ID
   * @returns Account status and requirements
   */
  async getAccountStatus(connectedAccountId: string): Promise<{
    isOnboarded: boolean;
    canReceivePayments: boolean;
    requirements: string[];
  }> {
    try {
      const account = await stripe.accounts.retrieve(connectedAccountId);
      
      return {
        isOnboarded: account.details_submitted || false,
        canReceivePayments: account.charges_enabled || false,
        requirements: account.requirements?.currently_due || []
      };
    } catch (error) {
      console.error('Error checking account status:', error);
      throw new Error('Failed to check account status');
    }
  }

  /**
   * Create Express Dashboard login link for driver
   * @param connectedAccountId - The Stripe connected account ID
   * @returns Express Dashboard URL
   */
  async createExpressDashboardLink(connectedAccountId: string): Promise<string> {
    try {
      const loginLink = await stripe.accounts.createLoginLink(connectedAccountId);
      return loginLink.url;
    } catch (error) {
      console.error('Error creating Express Dashboard link:', error);
      throw new Error('Failed to create dashboard link');
    }
  }

  /**
   * Process payment with marketplace split
   * @param amount - Total amount in cents
   * @param connectedAccountId - Driver's connected account ID
   * @param applicationFeeAmount - Your platform fee in cents
   * @param paymentMethodId - Customer's payment method
   * @returns Payment intent
   */
  async createMarketplacePayment(
    amount: number,
    connectedAccountId: string,
    applicationFeeAmount: number,
    paymentMethodId: string,
    customerId: string,
    rideId: string
  ): Promise<Stripe.PaymentIntent> {
    try {
      // Create payment intent on your platform account
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        customer: customerId,
        payment_method: paymentMethodId,
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: connectedAccountId,
        },
        metadata: {
          ride_id: rideId,
          connected_account: connectedAccountId
        },
        confirm: true,
        return_url: `${process.env.BASE_URL}/payment/success`
      });

      return paymentIntent;
    } catch (error) {
      console.error('Error creating marketplace payment:', error);
      throw new Error('Failed to process marketplace payment');
    }
  }

  /**
   * Create separate charge and transfer (alternative to above)
   * @param amount - Total amount in cents
   * @param connectedAccountId - Driver's connected account ID
   * @param transferAmount - Amount to transfer to driver in cents
   * @param paymentMethodId - Customer's payment method
   * @returns Charge and transfer objects
   */
  async createChargeAndTransfer(
    amount: number,
    connectedAccountId: string,
    transferAmount: number,
    paymentMethodId: string,
    customerId: string,
    rideId: string
  ): Promise<{
    charge: Stripe.Charge;
    transfer: Stripe.Transfer;
  }> {
    try {
      // 1. Create charge on your platform account
      const charge = await stripe.charges.create({
        amount: amount,
        currency: 'usd',
        customer: customerId,
        source: paymentMethodId,
        metadata: {
          ride_id: rideId,
          type: 'marketplace_payment'
        }
      });

      // 2. Transfer portion to driver's connected account
      const transfer = await stripe.transfers.create({
        amount: transferAmount,
        currency: 'usd',
        destination: connectedAccountId,
        metadata: {
          ride_id: rideId,
          charge_id: charge.id
        }
      });

      return { charge, transfer };
    } catch (error) {
      console.error('Error creating charge and transfer:', error);
      throw new Error('Failed to process charge and transfer');
    }
  }

  /**
   * Create transfer to driver's connected account
   * @param amount - Amount to transfer in cents
   * @param connectedAccountId - Driver's connected account ID
   * @param metadata - Additional metadata
   * @returns Transfer object
   */
  async createTransfer(
    amount: number,
    connectedAccountId: string,
    metadata: Record<string, string> = {}
  ): Promise<Stripe.Transfer> {
    try {
      const transfer = await stripe.transfers.create({
        amount: amount,
        currency: 'usd',
        destination: connectedAccountId,
        metadata: metadata
      });

      console.log(`✅ Transfer created: ${transfer.id} for ${amount / 100} USD to ${connectedAccountId}`);
      return transfer;
    } catch (error) {
      console.error('Error creating transfer:', error);
      throw new Error('Failed to create transfer');
    }
  }

  /**
   * Handle webhook events from Stripe Connect
   * @param event - Stripe webhook event
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'account.updated':
          await this.handleAccountUpdated(event.data.object as Stripe.Account);
          break;
        case 'account.application.authorized':
          await this.handleAccountAuthorized(event.data.object as Stripe.Application);
          break;
        case 'account.application.deauthorized':
          await this.handleAccountDeauthorized(event.data.object as Stripe.Application);
          break;
        case 'transfer.created':
          await this.handleTransferCreated(event.data.object as Stripe.Transfer);
          break;
        case 'transfer.updated':
          await this.handleTransferUpdated(event.data.object as Stripe.Transfer);
          break;
        default:
          console.log(`Unhandled webhook event: ${event.type}`);
      }
    } catch (error) {
      console.error('Error handling webhook event:', error);
      throw error;
    }
  }

  private async handleAccountUpdated(account: Stripe.Account): Promise<void> {
    // Update driver's onboarding status in your database
    const driverId = account.metadata?.driver_id;
    if (driverId) {
      await storage.updateDriver(parseInt(driverId), {
        stripeOnboardingComplete: account.details_submitted || false,
        stripeChargesEnabled: account.charges_enabled || false,
        stripePayoutsEnabled: account.payouts_enabled || false
      });
    }
  }

  private async handleAccountAuthorized(application: Stripe.Application): Promise<void> {
    console.log('Account authorized:', application.id);
  }

  private async handleAccountDeauthorized(application: Stripe.Application): Promise<void> {
    console.log('Account deauthorized:', application.id);
  }

  private async handleTransferCreated(transfer: Stripe.Transfer): Promise<void> {
    console.log('Transfer created:', transfer.id);
  }

  private async handleTransferUpdated(transfer: Stripe.Transfer): Promise<void> {
    console.log('Transfer updated:', transfer.id);
  }
}

export const stripeConnectService = new StripeConnectService();