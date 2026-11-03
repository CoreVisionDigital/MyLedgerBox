import express from 'express';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

// Load environment variables (.env if present)
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

/**
 * Shared Gemini client utility on the server
 * The API key is securely accessed via process.env.GEMINI_API_KEY on the server
 * and NEVER exposed to the client or browser bundle.
 */
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      timeout: 15000,
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health and AI configuration check endpoint (safe for public consumption, no keys exposed)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0),
    model: 'gemini-flash-latest',
  });
});

/**
 * Generate content with automatic model fallback and timeout guards for maximum uptime
 * Primary: gemini-flash-latest
 * Fallbacks: gemini-3.8-flash, gemini-3.1-flash-lite
 */
async function generateWithFallback(
  ai: GoogleGenAI,
  options: { contents: any; config?: any }
) {
  const models = ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout requesting ${model}`)), 12000)
      );
      const response = await Promise.race([
        ai.models.generateContent({
          model,
          contents: options.contents,
          config: options.config,
        }),
        timeoutPromise
      ]);
      return response;
    } catch (err: any) {
      lastError = err;
      const msg = err?.message || '';
      console.warn(`[BizLedger AI] Model ${model} unavailable (${msg}), attempting fallback model...`);
      continue;
    }
  }
  throw lastError;
}

function parseGenAiErrorMessage(err: any): string {
  if (!err) return 'Unknown AI error';
  const raw = err?.message || String(err);
  try {
    const parsed = JSON.parse(raw);
    if (parsed.error && parsed.error.message) {
      return parsed.error.message;
    }
  } catch {}
  return raw;
}

/**
 * API route for Nigerian Financial Advisory & Ledger Intelligence
 */
app.post('/api/ai/financial-advisor', async (req, res) => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured. Please ensure GEMINI_API_KEY is attached in Settings > Secrets.',
        code: 'MISSING_GEMINI_KEY'
      });
    }

    const { message, history, businessContext } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message query is required' });
    }

    const systemInstruction = `You are BizLedger AI, a senior Nigerian chartered financial advisor, CAC corporate compliance specialist, and FIRS tax consultant.
You provide concise, highly practical financial guidance for Nigerian SMEs, enterprises, and startups operating with Nigerian Naira (NGN, ₦).

Key Nigerian Tax & Legal Framework:
1. Currency: Nigerian Naira (₦, NGN). Minor units: 100 Kobo = ₦1.
2. Value Added Tax (VAT): Standard rate is 7.5% under the Nigeria Finance Act on qualifying goods and services. Basic food items, medical supplies, and educational books are exempt.
3. Withholding Tax (WHT): Deducted at source (typically 5% for contracts/supplies or 10% for professional management/consultancy fees under Nigerian tax regulations).
4. Regulatory Bodies: CAC (Corporate Affairs Commission), FIRS (Federal Inland Revenue Service), and State Internal Revenue Services (SIRS/LIRS).
5. Payment & Settlement: NIP (NIBSS Instant Payment), Paystack, Flutterwave, Verve, Mastercard, Visa.

Tone and Output Rules:
- Direct, authoritative, friendly, and structured.
- Always quote figures in Nigerian Naira (e.g., ₦1,500,000.00).
- Provide actionable bullet points and clear tax compliance implications.
- Use markdown formatting with clean headings and bold text.`;

    let promptContents = '';
    if (businessContext) {
      promptContents += `[Active Business Context]\nBusiness Name: ${businessContext.name || 'Nigerian Enterprise'}\nRC/BN: ${businessContext.registrationNumber || 'N/A'}\nTIN: ${businessContext.taxId || 'N/A'}\nIndustry: ${businessContext.industry || 'Commercial'}\nCurrent Invoices Count: ${businessContext.invoicesCount || 0}\nTotal Revenue Tracked: ₦${((businessContext.revenueMinor || 0) / 100).toLocaleString()}\n\n`;
    }

    if (Array.isArray(history) && history.length > 0) {
      promptContents += `[Previous Discussion]\n${history.map((h: any) => `${h.role === 'user' ? 'User' : 'BizLedger AI'}: ${h.text}`).join('\n')}\n\n`;
    }

    promptContents += `[Current Query]\n${message}`;

    const response = await generateWithFallback(ai, {
      contents: promptContents,
      config: {
        systemInstruction,
      },
    });

    const text = response.text || 'Unable to generate advice at this moment.';
    return res.json({ text });
  } catch (error: any) {
    console.error('Gemini Financial Advisor Error:', error);
    const readableMessage = parseGenAiErrorMessage(error);
    
    if (readableMessage.includes('PERMISSION_DENIED') || readableMessage.includes('403') || readableMessage.includes('API_KEY_INVALID')) {
      return res.status(403).json({
        error: 'Gemini API key is invalid or restricted. Please verify the key in Settings > Secrets.',
        code: 'INVALID_API_KEY'
      });
    }

    if (readableMessage.includes('RESOURCE_EXHAUSTED') || readableMessage.includes('429')) {
      return res.status(429).json({
        error: 'Gemini API quota exceeded. Please try again shortly or check your quota in the Google AI Studio console.',
        code: 'QUOTA_EXCEEDED'
      });
    }

    return res.status(500).json({
      error: readableMessage || 'Failed to process financial advisory request',
      code: 'GENAI_ERROR'
    });
  }
});

/**
 * API route for Smart Invoice & Quotation Line Items Generation
 */
app.post('/api/ai/invoice-assist', async (req, res) => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured in Settings > Secrets.',
        code: 'MISSING_GEMINI_KEY'
      });
    }

    const { customerName, industry, notes } = req.body;
    const prompt = `Generate 3 to 5 realistic, professional commercial invoice line items for a Nigerian business with:
Customer Name: ${customerName || 'Corporate Client'}
Industry/Domain: ${industry || 'General Business'}
Notes/Job Scope: ${notes || 'Professional services and deliverables'}

Return a JSON array of items where each object has:
- description (string): Clear professional line item title/spec
- quantity (number): Quantity of units
- unitPriceMinor (number): Unit price in Kobo (e.g., ₦50,000 = 5000000 Kobo)
- applyVat (boolean): Whether 7.5% Nigerian VAT applies under Finance Act
- applyWht (boolean): Whether 5% Nigerian WHT applies`;

    const response = await generateWithFallback(ai, {
      contents: prompt,
      config: {
        systemInstruction: 'You are an expert Nigerian commercial billing specialist. Output valid JSON array only.',
        responseMimeType: 'application/json',
      },
    });

    const raw = (response.text || '[]').trim();
    let items = [];
    try {
      items = JSON.parse(raw);
    } catch {
      items = [];
    }

    return res.json({ items });
  } catch (error: any) {
    console.error('Invoice Assist AI Error:', error);
    const readableMessage = parseGenAiErrorMessage(error);
    return res.status(500).json({
      error: readableMessage || 'Failed to generate invoice suggestions',
      code: 'INVOICE_ASSIST_ERROR'
    });
  }
});

// Configure Vite middleware in dev or static serving in production
async function startServer() {
  const distPath = path.resolve(__dirname, 'dist');
  const hasBuiltDist = fs.existsSync(distPath) && fs.existsSync(path.resolve(distPath, 'index.html'));
  const isProduction = process.env.NODE_ENV === 'production' || (hasBuiltDist && process.env.npm_lifecycle_event === 'start');

  if (!isProduction) {
    // Development mode: Mount Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve built dist folder with SPA fallback
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[BizLedger] Full-stack Server listening on http://0.0.0.0:${PORT} (Gemini AI: active)`);
  });
}

startServer().catch((err) => {
  console.error('[BizLedger] Failed to start server:', err);
  process.exit(1);
});
