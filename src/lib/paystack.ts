/**
 * MyLedgerBox Paystack Payment Gateway Integration
 * 
 * Paystack processes instant payments in Nigerian Naira (NGN).
 * All monetary amounts in Paystack are strictly in Kobo (minor units: 100 Kobo = ₦1).
 * Supports:
 * - Instant Debit Cards (Mastercard, Visa, Verve)
 * - Nigerian Bank Transfer (Direct virtual NUBAN)
 * - USSD (*737#, *894#, etc.)
 * - Direct Bank Account Debit
 */

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: {
        key: string;
        email: string;
        amount: number; // in Kobo
        currency?: string;
        ref?: string;
        metadata?: Record<string, any>;
        channels?: string[];
        callback?: (response: { reference: string; status?: string; trans?: string; message?: string }) => void;
        onClose?: () => void;
      }) => {
        openIframe: () => void;
      };
      newTransaction?: (options: any) => void;
    };
  }
}

export interface PaystackCheckoutOptions {
  email: string;
  amountMinor: number; // In Kobo (100 Kobo = ₦1)
  businessName: string;
  planName: string;
  billingInterval: string;
  reference?: string;
  onSuccess: (response: { reference: string; status: string }) => void;
  onClose?: () => void;
}

/**
 * Retrieves the Paystack Public Key from client environment variables
 */
export function getPaystackPublicKey(): string {
  const envKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
  if (typeof envKey === 'string' && envKey.trim().length > 0) {
    return envKey.trim();
  }
  return '';
}

/**
 * Checks if a Paystack key is configured in the environment
 */
export function isPaystackConfigured(): boolean {
  const key = getPaystackPublicKey();
  return key.length > 5 && (key.startsWith('pk_test_') || key.startsWith('pk_live_'));
}

/**
 * Checks if the configured Paystack key is Live or Test mode
 */
export function isPaystackLiveMode(): boolean {
  return getPaystackPublicKey().startsWith('pk_live_');
}

/**
 * Returns a masked representation of the public key for display
 */
export function getMaskedPaystackKey(): string {
  const key = getPaystackPublicKey();
  if (!key) return 'Not Configured';
  if (key.length <= 12) return key;
  const prefix = key.substring(0, 8);
  const suffix = key.substring(key.length - 4);
  return `${prefix}••••${suffix}`;
}

/**
 * Dynamically loads the official Paystack Inline JavaScript bundle if not already present
 */
export function loadPaystackScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    if (window.PaystackPop) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector('script[src*="paystack.co"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn('Paystack inline script could not be loaded from CDN.');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

/**
 * Generates a unique transaction reference for tracking
 */
export function generatePaystackReference(prefix: string = 'MLB_SUB'): string {
  const timestamp = Date.now();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Opens the Paystack instant payment modal for subscribers
 */
export async function initializePaystackSubscriptionPayment(
  options: PaystackCheckoutOptions
): Promise<void> {
  const isLoaded = await loadPaystackScript();
  const configuredKey = getPaystackPublicKey();

  const reference = options.reference || generatePaystackReference();

  // If PaystackPop is ready and a key is provided
  if (isLoaded && window.PaystackPop && configuredKey) {
    const handler = window.PaystackPop.setup({
      key: configuredKey,
      email: options.email,
      amount: options.amountMinor, // Paystack requires amount in Kobo
      currency: 'NGN',
      ref: reference,
      metadata: {
        custom_fields: [
          {
            display_name: 'Business Name',
            variable_name: 'business_name',
            value: options.businessName,
          },
          {
            display_name: 'Plan',
            variable_name: 'plan_name',
            value: options.planName,
          },
          {
            display_name: 'Interval',
            variable_name: 'billing_interval',
            value: options.billingInterval,
          },
        ],
      },
      callback: (response) => {
        options.onSuccess({
          reference: response.reference || reference,
          status: 'success',
        });
      },
      onClose: () => {
        if (options.onClose) options.onClose();
      },
    });

    handler.openIframe();
    return;
  }

  // If Paystack is not yet configured with a real key or script failed to load,
  // we throw an informative error that the caller can catch to show the setup notice or test mode.
  if (!configuredKey) {
    throw new Error('PAYSTACK_KEY_NOT_CONFIGURED');
  }

  if (!isLoaded || !window.PaystackPop) {
    throw new Error('PAYSTACK_SCRIPT_LOAD_FAILED');
  }
}
