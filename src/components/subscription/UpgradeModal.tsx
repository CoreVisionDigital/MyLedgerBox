import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useBusiness } from '../../context/BusinessContext';
import { 
  SUBSCRIPTION_PLANS, 
  getAnnualDiscountPercent,
  get6MonthsDiscountPercent,
  getDiscountPercent,
  getPlanPriceMinor,
  getEffectiveMonthlyPriceMinor,
  getTrialDaysRemaining
} from '../../lib/subscriptions';
import { formatNaira } from '../../lib/money';
import { SubscriptionPlanId, BillingInterval } from '../../types';
import { 
  Check, 
  Sparkles, 
  ShieldCheck, 
  CreditCard, 
  Building2, 
  Zap, 
  ArrowRight,
  Clock,
  ExternalLink,
  CheckCircle2,
  FileCheck,
  Download,
  AlertCircle
} from 'lucide-react';
import { 
  initializePaystackSubscriptionPayment, 
  isPaystackConfigured, 
  isPaystackLiveMode,
  getMaskedPaystackKey,
  generatePaystackReference
} from '../../lib/paystack';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string | null;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  reason,
}) => {
  const { 
    activeBusiness, 
    startProTrialSubscription, 
    updateSubscription 
  } = useBusiness();

  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlanId>('pro');
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('6months');
  const [paymentMethod, setPaymentMethod] = useState<'paystack' | 'bank_transfer' | 'card'>('paystack');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'select' | 'checkout' | 'success'>('select');
  const [paystackNotice, setPaystackNotice] = useState(false);
  const [paymentSuccessInfo, setPaymentSuccessInfo] = useState<{
    reference: string;
    amountMinor: number;
    planName: string;
    interval: string;
    date: string;
  } | null>(null);

  const currentPlanId = activeBusiness?.subscription?.planId || 'free';
  const isTrialing = activeBusiness?.subscription?.status === 'trialing';
  const trialDaysLeft = getTrialDaysRemaining(activeBusiness?.subscription);

  const selectedPlan = SUBSCRIPTION_PLANS.find(p => p.id === selectedPlanId) || SUBSCRIPTION_PLANS[1];
  const discountPercent = getDiscountPercent(selectedPlan, billingInterval);
  const totalAmountMinor = getPlanPriceMinor(selectedPlan, billingInterval);

  const handleStartTrial = async () => {
    try {
      setIsProcessing(true);
      await startProTrialSubscription();
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecutePayment = async (referenceOverride?: string) => {
    const reference = referenceOverride || generatePaystackReference('MLB_PAYSTACK');
    try {
      setIsProcessing(true);
      await updateSubscription(selectedPlanId, billingInterval, paymentMethod, {
        reference,
        amountMinor: totalAmountMinor,
      });

      setPaymentSuccessInfo({
        reference,
        amountMinor: totalAmountMinor,
        planName: selectedPlan.name,
        interval: billingInterval === 'annual' ? 'Annual (12 Months)' : billingInterval === '6months' ? 'Semi-Annual (6 Months)' : 'Monthly',
        date: new Date().toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      });
      setStep('success');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmUpgrade = async () => {
    // If user chose Paystack or Card, attempt Paystack popup
    if (paymentMethod === 'paystack' || paymentMethod === 'card') {
      if (isPaystackConfigured()) {
        try {
          setIsProcessing(true);
          await initializePaystackSubscriptionPayment({
            email: activeBusiness?.email || 'director@enterprise.ng',
            amountMinor: totalAmountMinor,
            businessName: activeBusiness?.name || 'MyLedgerBox Subscriber',
            planName: selectedPlan.name,
            billingInterval,
            onSuccess: (res) => {
              handleExecutePayment(res.reference);
            },
            onClose: () => {
              setIsProcessing(false);
            },
          });
        } catch (err: any) {
          setIsProcessing(false);
          setPaystackNotice(true);
        }
      } else {
        // If keys haven't been entered in .env yet, display setup guidance with instant simulator
        setPaystackNotice(true);
      }
    } else {
      // Direct Bank Transfer (NIBSS)
      await handleExecutePayment(generatePaystackReference('MLB_NIP_TRANSFER'));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upgrade Your MyLedgerBox Plan"
      description="Unlock unlimited invoicing, receipt issuance, advanced reports, and team collaboration."
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Usage Prompt Alert */}
        {reason && (
          <div className="bg-amber-50 border border-amber-200/90 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-900">
            <Zap className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Usage Limit Reached: </span>
              {reason}
            </div>
          </div>
        )}

        {/* 14-Day Free Trial Banner Experiment */}
        {currentPlanId === 'free' && !isTrialing && (
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white rounded-2xl p-4.5 border border-emerald-500/30 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                Special Experiment: 14-Day Professional Trial
              </div>
              <h4 className="text-base font-bold text-white mt-0.5">
                Test All Professional Features Free
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Instant activation. No debit card required. Reverts to Free plan automatically if you don't upgrade.
              </p>
            </div>
            <Button
              variant="emerald"
              size="md"
              onClick={handleStartTrial}
              isLoading={isProcessing}
              leftIcon={<Clock className="w-4 h-4" />}
              className="shrink-0 font-bold"
            >
              Start 14-Day Free Trial
            </Button>
          </div>
        )}

        {/* Step 1: Select Plan & Interval */}
        {step === 'select' ? (
          <div className="space-y-4">
            {/* Interval Toggle */}
            <div className="flex items-center justify-center">
              <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 text-xs font-semibold overflow-x-auto max-w-full">
                <button
                  type="button"
                  onClick={() => setBillingInterval('monthly')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    billingInterval === 'monthly'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingInterval('6months')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    billingInterval === '6months'
                      ? 'bg-emerald-600 text-white shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>6 Months</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    billingInterval === '6months' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    Save 10%
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setBillingInterval('annual')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    billingInterval === 'annual'
                      ? 'bg-emerald-600 text-white shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>Annual</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    billingInterval === 'annual' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    Save 20%
                  </span>
                </button>
              </div>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SUBSCRIPTION_PLANS.filter(p => p.id !== 'free').map(plan => {
                const isSelected = selectedPlanId === plan.id;
                const priceMinor = getPlanPriceMinor(plan, billingInterval);
                const effectiveMonthly = getEffectiveMonthlyPriceMinor(plan, billingInterval);
                const discount = getDiscountPercent(plan, billingInterval);

                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`rounded-2xl p-5 border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/20 shadow-md ring-1 ring-emerald-600'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        {plan.name}
                      </span>
                      {plan.isPopular && (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                          Recommended
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-2xl font-bold font-mono text-slate-900">
                        {formatNaira(priceMinor)}
                      </span>
                      <span className="text-xs text-slate-500">
                        /{billingInterval === 'annual' ? 'year' : billingInterval === '6months' ? '6 months' : 'month'}
                      </span>
                    </div>

                    {discount > 0 && (
                      <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                        ₦{formatNaira(effectiveMonthly, false)}/mo effective • {discount}% {billingInterval === '6months' ? 'semi-annual' : 'annual'} discount
                      </p>
                    )}

                    <p className="text-xs text-slate-500 mt-2 min-h-8">
                      {plan.tagline}
                    </p>

                    <ul className="mt-4 space-y-2 text-xs text-slate-700 border-t border-slate-100 pt-3">
                      {plan.features.slice(0, 5).map((feat, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-500">
                Cancel anytime. Unused time remains active until period end.
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Keep Free Plan
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setStep('checkout')}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Proceed to Checkout
                </Button>
              </div>
            </div>
          </div>
        ) : step === 'checkout' ? (
          /* Step 2: Checkout Confirmation */
          <div className="space-y-5 text-xs">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-sm font-bold text-slate-900">
                <span>
                  {selectedPlan.name} Plan (
                  {billingInterval === 'annual' 
                    ? 'Annual' 
                    : billingInterval === '6months' 
                    ? '6 Months' 
                    : 'Monthly'}
                  )
                </span>
                <span className="font-mono text-emerald-600">
                  {formatNaira(getPlanPriceMinor(selectedPlan, billingInterval))}
                </span>
              </div>
              <p className="text-slate-500">
                Billing interval:{' '}
                {billingInterval === 'annual'
                  ? '12 Months (Renews annually)'
                  : billingInterval === '6months'
                  ? '6 Months (Renews semi-annually)'
                  : '1 Month (Renews monthly)'}.
              </p>
              {discountPercent > 0 && (
                <p className="text-emerald-700 font-semibold">
                  You saved {discountPercent}% compared to monthly billing!
                </p>
              )}
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Select Nigerian Settlement Method
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div
                  onClick={() => { setPaymentMethod('paystack'); setPaystackNotice(false); }}
                  className={`p-3 rounded-xl border cursor-pointer text-center transition-all ${
                    paymentMethod === 'paystack'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <CreditCard className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                  <span>Paystack Gateway</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">Instant Card / USSD / NIP</span>
                </div>

                <div
                  onClick={() => { setPaymentMethod('card'); setPaystackNotice(false); }}
                  className={`p-3 rounded-xl border cursor-pointer text-center transition-all ${
                    paymentMethod === 'card'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                  <span>Debit Card</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">Verve / Mastercard / Visa</span>
                </div>

                <div
                  onClick={() => { setPaymentMethod('bank_transfer'); setPaystackNotice(false); }}
                  className={`p-3 rounded-xl border cursor-pointer text-center transition-all ${
                    paymentMethod === 'bank_transfer'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <Building2 className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                  <span>NIBSS Direct NIP</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">Manual Bank Transfer</span>
                </div>
              </div>
            </div>

            {/* Paystack Gateway Highlights */}
            {(paymentMethod === 'paystack' || paymentMethod === 'card') && (
              <div className="p-3.5 bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white rounded-xl border border-emerald-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                    ₦
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      Paystack Instant Payment
                      {isPaystackConfigured() ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                          {isPaystackLiveMode() ? 'Live Mode' : 'Test Mode'} ({getMaskedPaystackKey()})
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                          Simulator Active
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-300">
                      Verve, Mastercard, Visa, Direct NIP Transfer & USSD
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {formatNaira(totalAmountMinor)}
                </span>
              </div>
            )}

            {/* Paystack Key Setup Notice */}
            {paystackNotice && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-900">
                      Paystack Public Key Required
                    </h4>
                    <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                      To connect your Paystack account and open the live payment modal, please add your Paystack Public Key to your <strong>.env</strong> file:
                    </p>
                    <div className="mt-2 p-2 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-lg border border-slate-800 select-all">
                      VITE_PAYSTACK_PUBLIC_KEY="pk_test_xxxxxxxxxxxxxxxxxxxxxxxx"
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1.5">
                      You can also simulate instant Paystack payment now to test the complete subscription workflow.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaystackNotice(false)}
                    className="text-xs"
                  >
                    I'll add the key
                  </Button>
                  <Button
                    variant="emerald"
                    size="sm"
                    onClick={() => handleExecutePayment(generatePaystackReference('MLB_PAYSTACK_SIM'))}
                    isLoading={isProcessing}
                    leftIcon={<Zap className="w-3.5 h-3.5" />}
                    className="text-xs font-bold"
                  >
                    Simulate Instant Paystack Payment
                  </Button>
                </div>
              </div>
            )}

            {/* Nigerian Tax & Cancellation Policy */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-slate-600 text-[11px]">
              <p className="font-semibold text-slate-800">Clear Cancellation & Renewal Terms:</p>
              <p>• Auto-renewal can be disabled at any time in organization settings with 1 click.</p>
              <p>• If cancelled, full access continues uninterrupted through the end of the current billing period.</p>
              <p>• Includes 7-day money-back satisfaction guarantee for Nigerian corporate subscriptions.</p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep('select')}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
              >
                ← Back to Plans
              </button>
              <Button
                variant="primary"
                onClick={handleConfirmUpgrade}
                isLoading={isProcessing}
                leftIcon={<CreditCard className="w-4 h-4" />}
              >
                {paymentMethod === 'paystack' || paymentMethod === 'card'
                  ? `Pay with Paystack (${formatNaira(totalAmountMinor)})`
                  : `Confirm & Activate ${selectedPlan.name}`}
              </Button>
            </div>
          </div>
        ) : (
          /* Step 3: Instant Payment Success Confirmation */
          <div className="py-4 space-y-5 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md shadow-emerald-900/10 border-2 border-emerald-300">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Payment Confirmed
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 mt-2">
                Instant Subscription Activated!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Your payment was successfully processed via Paystack. Your business now has full access to the {paymentSuccessInfo?.planName} tier.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Plan & Billing</span>
                <span className="font-bold text-slate-900">{paymentSuccessInfo?.planName} ({paymentSuccessInfo?.interval})</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Amount Paid</span>
                <span className="font-bold font-mono text-emerald-700">{formatNaira(paymentSuccessInfo?.amountMinor || 0)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Payment Gateway</span>
                <span className="font-semibold text-slate-800">Paystack Instant (NGN)</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Transaction Reference</span>
                <span className="font-mono text-[11px] text-slate-700 select-all">{paymentSuccessInfo?.reference}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Payment Date</span>
                <span className="text-slate-700">{paymentSuccessInfo?.date}</span>
              </div>
            </div>

            <div className="pt-2">
              <Button
                variant="emerald"
                size="lg"
                className="w-full font-bold shadow-md shadow-emerald-950/10"
                onClick={() => {
                  onClose();
                  setStep('select');
                }}
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
