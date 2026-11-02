import React, { useState } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { Button } from '../components/common/Button';
import { BusinessSettingsModal } from '../components/settings/BusinessSettingsModal';
import { NewBusinessModal } from '../components/settings/NewBusinessModal';
import { 
  Building2, 
  ShieldCheck, 
  CreditCard, 
  Settings2, 
  Plus, 
  Users, 
  CheckCircle2,
  Zap,
  ExternalLink,
  Lock
} from 'lucide-react';
import { 
  isPaystackConfigured, 
  isPaystackLiveMode, 
  getMaskedPaystackKey 
} from '../lib/paystack';

export const SettingsView: React.FC = () => {
  const { activeBusiness, allBusinesses, switchBusiness, members } = useBusiness();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewBizModalOpen, setIsNewBizModalOpen] = useState(false);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Business Profile & Organization Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage corporate identity, CAC credentials, Nigerian bank disbursement accounts, and team roles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsNewBizModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            New Business
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsEditModalOpen(true)}
            leftIcon={<Settings2 className="w-3.5 h-3.5" />}
          >
            Edit Settings
          </Button>
        </div>
      </div>

      {/* Active Business Details Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-lg">
              {activeBusiness?.name.charAt(0) || 'B'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{activeBusiness?.name}</h2>
              <p className="text-xs text-slate-500">
                {activeBusiness?.rcNumber ? `CAC Registration: ${activeBusiness.rcNumber}` : 'CAC Reg: Unspecified'} • State: {activeBusiness?.state}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Active Tenant
          </span>
        </div>

        {/* Credentials Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">FIRS TIN</span>
            <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">
              {activeBusiness?.taxIdentificationNumber || 'Not configured'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Default VAT</span>
            <span className="font-mono font-bold text-emerald-600 text-sm mt-0.5 block">
              {activeBusiness?.defaultVatPercent || 7.5}% (Nigerian VAT)
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Default WHT</span>
            <span className="font-mono font-bold text-amber-600 text-sm mt-0.5 block">
              {activeBusiness?.defaultWhtPercent || 5.0}% (Withholding Tax)
            </span>
          </div>
        </div>

        {/* Nigerian Bank Account */}
        <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-4 h-4" />
              Settlement Bank Account (Printed on Invoices)
            </span>
            <span className="text-[11px] text-slate-400">NUBAN Validated</span>
          </div>
          <div className="pt-1">
            <p className="text-base font-bold text-white">
              {activeBusiness?.bankDetails?.bankName || 'Guaranty Trust Bank (GTBank)'}
            </p>
            <p className="font-mono text-sm tracking-widest text-emerald-300 font-semibold mt-0.5">
              {activeBusiness?.bankDetails?.accountNumber || '0129384756'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Account Name: {activeBusiness?.bankDetails?.accountName || activeBusiness?.name}
            </p>
          </div>
        </div>

        {/* Paystack Payment Gateway Integration Card */}
        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 text-white space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                ₦
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Subscriber Payment Gateway: Paystack
                </h3>
                <p className="text-[11px] text-slate-400">
                  Instant subscription collection via Card, Bank Transfer (NUBAN) & USSD
                </p>
              </div>
            </div>

            {isPaystackConfigured() ? (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {isPaystackLiveMode() ? 'Live Mode' : 'Test Mode'} ({getMaskedPaystackKey()})
              </span>
            ) : (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Key Pending in .env
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
            <div>
              <span className="text-[11px] text-slate-400 block">Currency & Minor Unit Precision</span>
              <span className="font-semibold text-slate-200 mt-0.5 block">Nigerian Naira (100 Kobo = ₦1)</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Accepted Payment Channels</span>
              <span className="font-semibold text-emerald-400 mt-0.5 block">Verve, Mastercard, Visa, NIP, USSD</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-800/40 p-3 rounded-xl border border-slate-700/50 flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span>To connect your Paystack keys, specify in your </span>
              <strong className="text-slate-200 font-mono">.env</strong>
              <span> file: </span>
              <code className="text-emerald-300 font-mono bg-slate-950 px-1 py-0.5 rounded text-[10px]">
                VITE_PAYSTACK_PUBLIC_KEY="pk_live_..."
              </code>
            </div>
          </div>
        </div>

        {/* Organizations Managed */}
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-600" />
            Your Organizations ({allBusinesses.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {allBusinesses.map(biz => (
              <div
                key={biz.id}
                onClick={() => switchBusiness(biz.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  biz.id === activeBusiness?.id
                    ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">{biz.name}</span>
                  {biz.id === activeBusiness?.id && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 font-mono">
                  {biz.rcNumber ? `CAC: ${biz.rcNumber}` : 'Single Entity'} • {biz.state}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BusinessSettingsModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />

      <NewBusinessModal
        isOpen={isNewBizModalOpen}
        onClose={() => setIsNewBizModalOpen(false)}
      />
    </div>
  );
};
