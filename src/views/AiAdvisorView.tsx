import React, { useState, useEffect, useRef } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { useNotification } from '../context/NotificationContext';
import { queryFinancialAdvisor, checkAiHealth } from '../lib/gemini';
import { formatNaira } from '../lib/money';
import { Button } from '../components/common/Button';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  ShieldCheck, 
  FileText, 
  TrendingUp, 
  Scale, 
  Building2, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Lightbulb
} from 'lucide-react';

interface ChatEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const AiAdvisorView: React.FC = () => {
  const { activeBusiness, invoices, expenses, customers } = useBusiness();
  const { error: notifyError } = useNotification();

  const [messages, setMessages] = useState<ChatEntry[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `### Welcome to BizLedger Financial Intelligence
I am your **Chartered Nigerian Financial & FIRS Tax Consultant**, powered by **Google Gemini**.

I can assist your business with:
* **FIRS VAT (7.5%) Compliance**: Assessment, invoices withholding, and filing schedules.
* **Withholding Tax (WHT)**: Determining 5% vs 10% deductions across Nigerian vendor categories.
* **Cash Flow & Receivable Recovery**: Strategies to shorten payment cycles across Nigerian corporate clients.
* **CAC Regulatory Governance**: Annual returns, board resolutions, and tax clearance certificates.

*How can I advise your business today?*`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiHealth, setAiHealth] = useState<{ status: string; geminiConfigured: boolean; model: string }>({
    status: 'checking',
    geminiConfigured: false,
    model: 'gemini-3.8-flash',
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAiHealth().then(setAiHealth);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || isLoading) return;

    setInputQuery('');
    const userMsg: ChatEntry = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    // Prepare context
    const totalRevenueMinor = invoices.reduce((acc, inv) => acc + (inv.status === 'paid' ? inv.totalMinor : 0), 0);
    const businessContext = {
      name: activeBusiness?.name || 'My Nigerian Business',
      registrationNumber: activeBusiness?.rcNumber || 'Unregistered',
      taxId: activeBusiness?.taxIdentificationNumber || 'Pending TIN',
      industry: activeBusiness?.industry || 'Commercial Services',
      invoicesCount: invoices.length,
      revenueMinor: totalRevenueMinor,
    };

    const historyForAi = messages.slice(-6).map(m => ({
      role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model',
      text: m.content,
    }));

    const result = await queryFinancialAdvisor(textToSend, historyForAi, businessContext);

    if (result.error) {
      notifyError('AI Advisor', result.error);
      const errorMsg: ChatEntry = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `**Notice:** ${result.error}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMsg]);
    } else {
      const assistantMsg: ChatEntry = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: result.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, assistantMsg]);
    }

    setIsLoading(false);
  };

  const samplePrompts = [
    {
      title: 'FIRS VAT Audit',
      desc: 'Check if my service invoices require 7.5% VAT',
      prompt: 'Under the Nigerian Finance Act, which of my commercial invoices require 7.5% VAT, and how should VAT appear on customer bills?',
      icon: Scale,
    },
    {
      title: 'WHT Deduction Guide',
      desc: 'Difference between 5% and 10% Withholding Tax',
      prompt: 'When should our Nigerian clients deduct 5% vs 10% WHT from our invoices, and how do we claim credit notes with FIRS?',
      icon: ShieldCheck,
    },
    {
      title: 'Cashflow Optimization',
      desc: 'Shorten invoice payment cycles in NGN',
      prompt: 'What are proven payment terms and incentives to get corporate clients in Lagos and Abuja to settle invoices within 15 days?',
      icon: TrendingUp,
    },
    {
      title: 'CAC Compliance',
      desc: 'Annual returns and corporate governance',
      prompt: 'What are the annual regulatory filing requirements with the Corporate Affairs Commission (CAC) to avoid status penalties?',
      icon: Building2,
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-emerald-600 to-teal-500 text-white rounded-xl shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                AI Financial & Tax Advisor
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                  Gemini 3.8 Flash
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Nigerian commercial accounting, FIRS tax compliance, and automated ledger insights
              </p>
            </div>
          </div>
        </div>

        {/* Server & Key Status Indicator */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs flex items-center gap-2 text-slate-600">
            {aiHealth.geminiConfigured ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-slate-800">Server Key Active</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span className="text-slate-600">Configured via Secrets</span>
              </>
            )}
            <span className="text-slate-300">|</span>
            <span className="font-mono text-[11px] text-slate-500">{aiHealth.model}</span>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 pt-5 min-h-0">
        {/* Left Column: Business Financial Stats & Quick Prompts */}
        <div className="lg:col-span-1 flex flex-col gap-4 overflow-y-auto pr-1">
          {/* Active Entity Card */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              Active Enterprise Context
            </h3>
            <p className="font-bold text-sm text-slate-900 truncate">{activeBusiness?.name || 'Company Name'}</p>
            <div className="mt-2 space-y-1 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">RC/BN:</span>
                <span className="font-mono font-medium">{activeBusiness?.rcNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">TIN:</span>
                <span className="font-mono font-medium">{activeBusiness?.taxIdentificationNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Invoices:</span>
                <span className="font-semibold">{invoices.length} Issued</span>
              </div>
            </div>
          </div>

          {/* Quick Consultation Starters */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              Recommended Topics
            </h3>
            {samplePrompts.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSend(item.prompt)}
                  disabled={isLoading}
                  className="w-full text-left p-3 rounded-xl bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 transition-all shadow-2xs group cursor-pointer"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-slate-50 group-hover:bg-emerald-100 text-slate-600 group-hover:text-emerald-700 transition-colors mt-0.5">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-900">{item.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{item.desc}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Chat Stream Area */}
        <div className="lg:col-span-3 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full">
          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                <div
                  className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold ${
                    msg.role === 'user'
                      ? 'bg-slate-800 text-white shadow-2xs'
                      : 'bg-emerald-600 text-white shadow-2xs shadow-emerald-200'
                  }`}
                >
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-slate-900 text-white rounded-tr-xs'
                      : 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-xs shadow-2xs'
                  }`}
                >
                  <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm">
                    {msg.content}
                  </div>
                  <span
                    className={`text-[10px] block mt-1 text-right ${
                      msg.role === 'user' ? 'text-slate-400' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 max-w-xl mr-auto">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white shrink-0 flex items-center justify-center shadow-2xs shadow-emerald-200">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-xs px-4 py-3 shadow-2xs">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    <span>Analyzing Nigerian fiscal regulations via Gemini...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input Form */}
          <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200">
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Ask about FIRS taxes, 7.5% VAT, WHT calculations, CAC compliance, or cashflow in NGN..."
                value={inputQuery}
                onChange={e => setInputQuery(e.target.value)}
                disabled={isLoading}
                className="flex-1 bg-white border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all"
              />
              <Button
                type="submit"
                variant="primary"
                disabled={!inputQuery.trim() || isLoading}
                isLoading={isLoading}
                className="px-4 py-3 shrink-0"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline ml-1 text-xs">Consult</span>
              </Button>
            </form>
            <p className="text-[10px] text-slate-400 mt-2 text-center">
              Powered by Google Gemini 3.8 Flash via secure server proxy. Contextualized to active Nigerian business entity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
