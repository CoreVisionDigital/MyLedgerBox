/**
 * BizLedger Client-Side AI Service
 * 
 * Securely proxies all AI requests to server-side endpoints (/api/ai/*).
 * In accordance with security specifications, the client NEVER imports @google/genai
 * and NEVER handles or exposes the GEMINI_API_KEY.
 */

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface SuggestedLineItem {
  description: string;
  quantity: number;
  unitPriceMinor: number;
  applyVat: boolean;
  applyWht: boolean;
}

/**
 * Checks server-side Gemini AI readiness
 */
export async function checkAiHealth(): Promise<{ status: string; geminiConfigured: boolean; model: string }> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) {
      return { status: 'error', geminiConfigured: false, model: 'gemini-3.8-flash' };
    }
    const data = await res.json();
    return {
      status: data.status || 'ok',
      geminiConfigured: Boolean(data.geminiConfigured),
      model: data.model || 'gemini-3.8-flash',
    };
  } catch (err) {
    return { status: 'offline', geminiConfigured: false, model: 'gemini-3.8-flash' };
  }
}

/**
 * Queries the Nigerian Chartered Financial & FIRS Tax Advisor AI via the server proxy
 */
export async function queryFinancialAdvisor(
  message: string,
  history: { role: 'user' | 'model'; text: string }[] = [],
  businessContext?: {
    name?: string;
    registrationNumber?: string;
    taxId?: string;
    industry?: string;
    invoicesCount?: number;
    revenueMinor?: number;
  }
): Promise<{ text: string; error?: string }> {
  try {
    const response = await fetch('/api/ai/financial-advisor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        history,
        businessContext,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        text: '',
        error: data.error || 'Failed to communicate with AI Financial Advisor',
      };
    }

    return { text: data.text || '' };
  } catch (err: any) {
    console.error('AI Financial Advisor Client Fetch Error:', err);
    return {
      text: '',
      error: 'Network connectivity error contacting server-side AI proxy.',
    };
  }
}

/**
 * Requests intelligent line-item suggestions for commercial invoices
 */
export async function generateInvoiceLineItems(
  customerName?: string,
  industry?: string,
  notes?: string
): Promise<{ items: SuggestedLineItem[]; error?: string }> {
  try {
    const response = await fetch('/api/ai/invoice-assist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerName,
        industry,
        notes,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        items: [],
        error: data.error || 'Failed to generate line item suggestions.',
      };
    }

    return { items: Array.isArray(data.items) ? data.items : [] };
  } catch (err: any) {
    console.error('Invoice Assist Client Fetch Error:', err);
    return {
      items: [],
      error: 'Network connectivity error contacting server-side AI proxy.',
    };
  }
}
