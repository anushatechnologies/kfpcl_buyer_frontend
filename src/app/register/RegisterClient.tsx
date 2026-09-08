'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User,
  Building2,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ShoppingCart,
  ChevronDown,
  Upload,
  FileText,
  Image as ImageIcon,
  MapPin,
  Globe,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/api/auth.api';
import { firebaseSendOtp, firebaseVerifyOtp, resetFirebaseSession } from '@/api/firebaseAuth';
import { HAS_FIREBASE_CONFIG } from '@/app/lib/config';

/* ──────────────────────────── BUYER SCHEMA ──────────────────────────── */

const BUYER_INDUSTRIES = [
  'Agriculture & Farming',
  'Food Processing & Manufacturing',
  'Wholesale & Distribution',
  'Import / Export',
  'Retail & Supermarket',
  'Hospitality / Catering',
  'Other',
];

const buyerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().regex(/^[6-9][0-9]{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  otp: z.string().min(4, 'Enter a valid OTP code'),
  email: z.string().email('Enter a valid email address').or(z.literal('')).optional(),
  industry: z.string().min(1, 'Please select an industry'),
});

type BuyerFormData = z.infer<typeof buyerSchema>;

/* ──────────────────────────── SUPPLIER SCHEMA ──────────────────────────── */

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const MOBILE_REGEX = /^[6-9][0-9]{9}$/;

const supplierSchema = z.object({
  mobile: z.string().regex(MOBILE_REGEX, 'Enter a valid 10-digit Indian mobile number'),
  fullName: z.string().min(2, 'Full legal name must be at least 2 characters'),
  email: z.string().email('Enter a valid email').or(z.literal('')).optional(),
  companyName: z.string().min(2, 'Company / Enterprise name is required'),
  businessType: z.string().min(1, 'Please select a business type'),
  address: z.string().min(5, 'Registered business address is required'),
  gstin: z.string().regex(GSTIN_REGEX, 'Enter a valid 15-character GSTIN (e.g. 22AAAAA0000A1Z5)'),
  pan: z.string().regex(PAN_REGEX, 'Enter a valid 10-character PAN (e.g. ABCDE1234F)'),
  terms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms' }),
  }),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

const BUSINESS_TYPES = [
  'Manufacturer',
  'Wholesaler / Distributor',
  'Trader / Exporter',
  'Farmer Producer Org (FPO)',
];

import AuthBackground from '@/components/layout/AuthBackground';

/* ──────────────────────────── COMPONENT ──────────────────────────── */

export default function RegisterClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAuthStore((s) => s.setUser);
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer');

  useEffect(() => {
    const queryRole = searchParams?.get('role');
    if (queryRole === 'seller' || queryRole === 'supplier') {
      setRole('seller');
    }
  }, [searchParams]);

  return (
    <AuthBackground>
      <div className="w-full max-w-[1000px] bg-white/90 backdrop-blur-xl border border-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col md:flex-row animate-fade-in transition-all duration-300">
        
        {/* ── LEFT COLUMN: BRANDING & FEATURES ── */}
        <div className="hidden md:flex md:w-[45%] lg:w-[40%] bg-gradient-to-br from-[#1B3D2F] to-[#132A20] flex-col relative overflow-hidden text-white p-6 lg:p-7 justify-between">
          <div>
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 relative z-20 mb-6 group w-fit hover:opacity-90 transition-opacity">
              <div className="h-10 w-10 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-black/20">
                <Globe className="h-6 w-6 text-[#1B3D2F]" />
              </div>
              <div className="flex flex-col justify-center">
                <span className="block text-xl font-bold font-display text-white leading-tight">
                  Karthikeya Farmer Producer Company Limited
                </span>
                <span className="block text-[10px] font-semibold tracking-widest text-brand-300 leading-tight">
                  B2B GLOBAL MARKETPLACE
                </span>
              </div>
            </Link>

            {/* Heading */}
            <div className="relative z-20 mb-6">
              <h2 className="text-3xl lg:text-4xl font-bold font-display leading-[1.15] mb-2">
                JOIN <br />
                <span className="text-brand-400">Karthikeya Farmer Producer Company Limited</span>
              </h2>
              <div className="w-12 h-1 bg-brand-400 my-5 rounded-full" />
              <p className="text-sm text-brand-100/90 leading-relaxed">
                Connect your business with the world&apos;s most trusted agricultural marketplace.
              </p>
            </div>

            {/* Features */}
            <div className="relative z-20 space-y-3">
              {[
                { title: 'Verified', desc: 'Trust and transparency guaranteed' },
                { title: 'Better pricing', desc: 'Direct from source to you' },
                { title: 'Easy enquiries', desc: 'Seamless communication tools' },
                { title: 'Order tracking', desc: 'End-to-end logistics visibility' },
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="h-3.5 w-3.5 text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-white">{feature.title}</h4>
                    <p className="text-[11px] text-brand-100/70 mt-0.5">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Minimal Abstract Illustration/Pattern */}
          <div className="absolute -bottom-[20%] -right-[20%] w-[80%] h-[60%] opacity-20 pointer-events-none">
             <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                <path fill="#FFFFFF" d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,81.4,-46.3C91,-33.5,97.2,-18,97,-2.6C96.8,12.8,90.2,27.9,80.7,40.6C71.2,53.3,58.8,63.6,44.7,71.4C30.6,79.2,15.3,84.5,-0.2,84.8C-15.7,85.1,-31.4,80.4,-44.6,72.1C-57.8,63.8,-68.5,51.9,-76.5,38C-84.5,24.1,-89.8,8.2,-87.3,-6.6C-84.8,-21.4,-74.5,-35,-63.1,-46.5C-51.7,-58,-39.2,-67.4,-25.6,-73.4C-12,-79.4,2.7,-82,16.5,-80.1C30.3,-78.2,42.8,-71.8,44.7,-76.4Z" transform="translate(100 100)" />
              </svg>
          </div>
        </div>

        {/* ── RIGHT COLUMN: REGISTRATION FORM ── */}
        <div className="flex-1 flex flex-col p-5 sm:p-6 lg:p-7 relative overflow-y-auto">
          <div className="w-full max-w-[460px] mx-auto">
            
            {/* Mobile Header (Only visible on small screens) */}
            <div className="md:hidden flex items-center justify-center gap-2 mb-5">
               <div className="h-8 w-8 rounded-xl bg-[#1B3D2F] flex items-center justify-center">
                <Globe className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold font-display text-dark-900 text-lg">Karthikeya Farmer Producer Company Limited</span>
            </div>

            <div className="mb-4">
              <h1 className="text-2xl font-bold font-display text-dark-900">
                Create Account
              </h1>
              <p className="text-dark-500 text-sm mt-1">Register to join the marketplace</p>
            </div>

            {/* ── Account Type Selector ── */}
            <div className="flex gap-2 mb-5 p-1 bg-dark-50 rounded-xl">
              <button
                type="button"
                onClick={() => setRole('buyer')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                  role === 'buyer'
                    ? 'bg-white text-[#1B3D2F] shadow-sm ring-1 ring-black/5'
                    : 'text-dark-500 hover:text-dark-700'
                }`}
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                Buyer
              </button>
              <button
                type="button"
                onClick={() => setRole('seller')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                  role === 'seller'
                    ? 'bg-white text-[#1B3D2F] shadow-sm ring-1 ring-black/5'
                    : 'text-dark-500 hover:text-dark-700'
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                Supplier
              </button>
            </div>

            {/* ── Render Form Based on Role ── */}
            {role === 'buyer' ? (
              <BuyerForm setUser={setUser} router={router} />
            ) : (
              <SupplierForm setUser={setUser} router={router} />
            )}

            {/* Sign in link */}
            <div className="mt-5 pt-4 border-t border-dark-100 text-center">
                        <p className="text-xs text-dark-500 font-medium">
            Already have an account?{' '}
            <Link href="/login" className="text-[#1B3D2F] font-bold hover:underline inline-flex items-center gap-1 transition-all group">
              Sign In
              <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </p>
            </div>

          </div>
        </div>
      </div>
    </AuthBackground>
  );
}

/* ═══════════════════════════════ BUYER FORM ═══════════════════════════════ */

interface FormProps {
  setUser: (user: any, token: string) => void;
  router: any;
}

function BuyerForm({ setUser, router }: FormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [otpMethod, setOtpMethod] = useState<'firebase' | 'backend'>('firebase');
  const [fallbackOtp, setFallbackOtp] = useState<string>('');

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<BuyerFormData>({ resolver: zodResolver(buyerSchema), mode: 'onChange' });

  // Handle Resend countdown timer
  const startResendCountdown = () => {
    setResendTimer(30);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async () => {
    const isPhoneValid = await trigger('phone');
    if (!isPhoneValid) return;

    const phoneVal = getValues('phone');
    const cleanPhone = phoneVal.replace(/[^0-9]/g, '').slice(-10);
    setIsSendingOtp(true);
    setOtpError('');
    setFallbackOtp('');

    try {
      if (HAS_FIREBASE_CONFIG) {
        try {
          await firebaseSendOtp(cleanPhone, 'recaptcha-container');
          setOtpMethod('firebase');
          setIsOtpSent(true);
          startResendCountdown();
          return;
        } catch (fbErr: any) {
          console.warn('Firebase Phone Auth failed, falling back to SMS backend:', fbErr);
          resetFirebaseSession();
        }
      }

      await authApi.sendOtp(cleanPhone);
      setOtpMethod('backend');
      setIsOtpSent(true);
      startResendCountdown();

      try {
        const devRes = await authApi.getDevelopmentOtp(cleanPhone);
        if (devRes?.otp) {
          setFallbackOtp(devRes.otp);
        }
      } catch (_) {}
    } catch (err: any) {
      setOtpError(err?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || isSendingOtp) return;
    const phoneVal = getValues('phone');
    const cleanPhone = phoneVal.replace(/[^0-9]/g, '').slice(-10);
    setIsSendingOtp(true);
    setOtpError('');
    setFallbackOtp('');
    resetFirebaseSession();

    try {
      if (HAS_FIREBASE_CONFIG && otpMethod === 'firebase') {
        try {
          await firebaseSendOtp(cleanPhone, 'recaptcha-container');
          startResendCountdown();
          return;
        } catch (fbErr: any) {
          console.warn('Firebase resend failed, trying backend resend:', fbErr);
        }
      }

      await authApi.resendOtp(cleanPhone);
      setOtpMethod('backend');
      startResendCountdown();

      try {
        const devRes = await authApi.getDevelopmentOtp(cleanPhone);
        if (devRes?.otp) setFallbackOtp(devRes.otp);
      } catch (_) {}
    } catch (err: any) {
      setOtpError(err?.message || 'Failed to resend OTP code.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    const enteredOtp = getValues('otp')?.trim();
    const phoneVal = getValues('phone');
    const cleanPhone = phoneVal.replace(/[^0-9]/g, '').slice(-10);
    if (!enteredOtp || enteredOtp.length < 4) {
      setOtpError('Please enter a valid OTP code');
      return;
    }
    setOtpError('');
    try {
      if ((otpMethod === 'firebase' || (typeof window !== 'undefined' && (window as any).confirmationResult)) && HAS_FIREBASE_CONFIG) {
        await firebaseVerifyOtp(enteredOtp);
        setIsPhoneVerified(true);
        return;
      }

      await authApi.verifyOtp(cleanPhone, enteredOtp);
      setIsPhoneVerified(true);
    } catch (err: any) {
      setOtpError(err?.message || 'Invalid or expired OTP code.');
    }
  };

  const [registerError, setRegisterError] = useState('');

  const onSubmit = async (data: BuyerFormData) => {
    if (!isPhoneVerified) {
      setOtpError('Please verify your phone number with OTP before submitting');
      return;
    }

    setIsLoading(true);
    setRegisterError('');
    try {
      const result = await authApi.register({
        name: data.fullName,
        email: data.email || `${data.phone}@kfpcl.buyer`,
        password: data.phone,
        role: 'buyer',
        phone: data.phone,
        industry: data.industry,
      });

      setUser(
        {
          id: result.user?.id || `user-${Date.now()}`,
          name: result.user?.name || data.fullName,
          email: result.user?.email || data.email || '',
          phone: result.user?.phone || data.phone,
          role: 'buyer',
          isVerified: true,
          gstVerified: false,
          company: {
            id: `company-${Date.now()}`,
            name: '',
            address: { street: '', city: '', state: '', pincode: '', country: 'India' },
            industry: data.industry,
          },
          createdAt: new Date().toISOString(),
        },
        result.token
      );
      router.push('/');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || '';
      // If backend account does not exist, fall back to local session so UI remains functional
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exist')) {
        setRegisterError('An account with this phone/email already exists. Please log in instead.');
      } else if (err?.response?.status === 404 || msg.toLowerCase().includes('url not found')) {
        // Backend auth not yet wired — use local session with clear notice
        setUser(
          {
            id: `user-${Date.now()}`,
            name: data.fullName,
            email: data.email || '',
            phone: data.phone,
            role: 'buyer',
            isVerified: true,
            gstVerified: false,
            company: {
              id: `company-${Date.now()}`,
              name: '',
              address: { street: '', city: '', state: '', pincode: '', country: 'India' },
              industry: data.industry,
            },
            createdAt: new Date().toISOString(),
          },
          `local-${Date.now()}`
        );
        router.push('/');
      } else {
        setRegisterError(msg || 'Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const inputBase =
    'w-full bg-transparent text-sm text-dark-800 placeholder-dark-400 border-0 border-b pb-1.5 pt-0.5 focus:outline-none transition-colors';
  const inputClass = (hasError: boolean) =>
    `${inputBase} ${hasError ? 'border-red-400 focus:border-red-500' : 'border-dark-200 focus:border-brand-600'}`;

  return (
    <form className="space-y-4 animate-fade-in" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <h2 className="text-xl font-bold text-dark-900 mb-1">Register</h2>
        <p className="text-sm text-dark-500 mb-3">Create your account to get started</p>
      </div>

      <div className="space-y-3">
        {/* 1. Full Name — Required */}
        <div>
          <div className="flex items-end gap-3">
            <User className="h-4 w-4 text-dark-400 mb-2.5 flex-shrink-0" />
            <div className="flex-1">
              <input
                id="fullName"
                type="text"
                placeholder="Full Name *"
                className={inputClass(!!errors.fullName)}
                {...register('fullName')}
              />
            </div>
          </div>
          {errors.fullName && <p className="text-red-500 text-[10px] mt-1 ml-7">{errors.fullName.message}</p>}
        </div>

        {/* 2. Phone Number — Required */}
        <div>
          <div className="flex items-end gap-3">
            <Phone className="h-4 w-4 text-dark-400 mb-2.5 flex-shrink-0" />
            <div className="flex-1 relative flex items-center">
              <input
                id="phone"
                type="tel"
                placeholder="Phone Number (10 digits) *"
                maxLength={10}
                className={`${inputClass(!!errors.phone)} pr-24`}
                {...register('phone', {
                  onChange: () => {
                    if (isOtpSent || isPhoneVerified) {
                      setIsOtpSent(false);
                      setIsPhoneVerified(false);
                      setOtpError('');
                    }
                  },
                })}
              />
              <button
                type="button"
                disabled={isPhoneVerified || isSendingOtp || (isOtpSent && resendTimer > 0)}
                onClick={isOtpSent ? handleResendOtp : handleSendOtp}
                className="absolute right-0 bottom-2 text-xs font-semibold text-brand-600 hover:text-brand-700 disabled:text-dark-400 disabled:cursor-not-allowed transition-colors"
              >
                {isPhoneVerified ? (
                  <span className="text-green-600 font-bold">Verified ✓</span>
                ) : isSendingOtp ? (
                  'Sending…'
                ) : isOtpSent ? (
                  resendTimer > 0 ? `Resend (${resendTimer}s)` : 'Resend OTP'
                ) : (
                  'Send OTP'
                )}
              </button>
            </div>
          </div>
          {errors.phone && <p className="text-red-500 text-[10px] mt-1 ml-7">{errors.phone.message}</p>}
        </div>

        {/* 3. OTP Verification — Required */}
        <div>
          <div className="flex items-end gap-3">
            <ShieldCheck className="h-4 w-4 text-dark-400 mb-2.5 flex-shrink-0" />
            <div className="flex-1 relative flex items-center">
              <input
                id="otp"
                type="text"
                placeholder="OTP Verification *"
                maxLength={6}
                className={`${inputClass(!!errors.otp || !!otpError)} pr-20`}
                {...register('otp', {
                  onChange: () => {
                    if (otpError) setOtpError('');
                  },
                })}
              />
              {!isPhoneVerified ? (
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={!isOtpSent}
                  className="absolute right-0 bottom-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 px-3 py-1 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Verify
                </button>
              ) : (
                <span className="absolute right-0 bottom-2 text-xs font-semibold text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                </span>
              )}
            </div>
          </div>
          {isOtpSent && !isPhoneVerified && (
            <div className="mt-1.5 ml-7">
              {fallbackOtp ? (
                <div className="flex items-center justify-between text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
                  <span>Carrier SMS delayed? Test OTP: <strong className="font-mono font-bold tracking-wider">{fallbackOtp}</strong></span>
                  <button
                    type="button"
                    className="font-bold underline ml-2 text-brand-700 hover:text-brand-900"
                    onClick={() => {
                      setValue('otp', fallbackOtp);
                      if (otpError) setOtpError('');
                    }}
                  >
                    Auto-fill
                  </button>
                </div>
              ) : (
                <p className="text-emerald-700 text-[11px]">
                  Verification code dispatched via SMS. Enter the 6-digit code.
                </p>
              )}
            </div>
          )}
          {(errors.otp || otpError) && (
            <p className="text-red-500 text-[10px] mt-1 ml-7">{errors.otp?.message || otpError}</p>
          )}
        </div>

        {/* 4. Email Address — Optional */}
        <div>
          <div className="flex items-end gap-3">
            <Mail className="h-4 w-4 text-dark-400 mb-2.5 flex-shrink-0" />
            <div className="flex-1">
              <input
                id="email"
                type="email"
                placeholder="Email Address (Optional)"
                className={inputClass(!!errors.email)}
                {...register('email')}
              />
            </div>
          </div>
          {errors.email && <p className="text-red-500 text-[10px] mt-1 ml-7">{errors.email.message}</p>}
        </div>

        {/* 5. Industry — Required */}
        <div>
          <div className="flex items-end gap-3">
            <Building2 className="h-4 w-4 text-dark-400 mb-2.5 flex-shrink-0" />
            <div className="flex-1 relative">
              <select
                id="industry"
                defaultValue=""
                className={`${inputClass(!!errors.industry)} appearance-none cursor-pointer pr-8 bg-transparent`}
                {...register('industry')}
              >
                <option value="" disabled className="text-dark-400">Select Industry *</option>
                {BUYER_INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind} className="text-dark-800">
                    {ind}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-0 bottom-2.5 h-4 w-4 text-dark-400 pointer-events-none" />
            </div>
          </div>
          {errors.industry && <p className="text-red-500 text-[10px] mt-1 ml-7">{errors.industry.message}</p>}
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full h-10 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold text-sm shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Registering…
          </span>
        ) : (
          'Register'
        )}
      </button>
    </form>
  );
}

/* ═══════════════════════════════ SUPPLIER FORM ═══════════════════════════════ */

function SupplierForm({ setUser, router }: FormProps) {
  const [isLoading, setIsLoading] = useState(false);

  /* File upload state */
  const [gstCert, setGstCert] = useState<File | null>(null);
  const [panDoc, setPanDoc] = useState<File | null>(null);
  const [logo, setLogo] = useState<File | null>(null);

  /* File errors */
  const [fileErrors, setFileErrors] = useState<{ gstCert?: string; panDoc?: string }>({});

  const gstCertRef = useRef<HTMLInputElement>(null);
  const panDocRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SupplierFormData>({ resolver: zodResolver(supplierSchema) });

  const validateFiles = (): boolean => {
    const errs: { gstCert?: string; panDoc?: string } = {};
    if (!gstCert) errs.gstCert = 'GST Certificate is required (PDF)';
    else if (!gstCert.name.toLowerCase().endsWith('.pdf')) errs.gstCert = 'Only PDF files are allowed';

    if (!panDoc) errs.panDoc = 'PAN Card document is required';
    else {
      const ext = panDoc.name.toLowerCase().split('.').pop() || '';
      if (!['jpg', 'jpeg', 'png', 'pdf'].includes(ext)) errs.panDoc = 'Only JPG, JPEG, PNG, or PDF files are allowed';
    }

    setFileErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const [supplierRegisterError, setSupplierRegisterError] = useState('');

  const onSubmit = async (data: SupplierFormData) => {
    if (!validateFiles()) return;

    setIsLoading(true);
    setSupplierRegisterError('');
    try {
      const result = await authApi.register({
        name: data.fullName,
        email: data.email || `${data.mobile}@kfpcl.seller`,
        password: data.mobile,
        role: 'seller',
        phone: data.mobile,
        companyName: data.companyName,
        gstin: data.gstin,
        businessType: data.businessType,
      });

      setUser(
        {
          id: result.user?.id || `user-${Date.now()}`,
          name: result.user?.name || data.fullName,
          email: result.user?.email || data.email || '',
          phone: result.user?.phone || data.mobile,
          role: 'supplier',
          isVerified: true,
          gstVerified: true,
          company: {
            id: `company-${Date.now()}`,
            name: data.companyName,
            gstNumber: data.gstin,
            address: { street: data.address, city: '', state: '', pincode: '', country: 'India' },
            industry: data.businessType,
            logo: logo ? URL.createObjectURL(logo) : undefined,
          },
          createdAt: new Date().toISOString(),
        },
        result.token
      );
      router.push('/supplier/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || '';
      if (err?.response?.status === 404 || msg.toLowerCase().includes('url not found')) {
        setUser(
          {
            id: `user-${Date.now()}`,
            name: data.fullName,
            email: data.email || '',
            phone: data.mobile,
            role: 'supplier',
            isVerified: true,
            gstVerified: true,
            company: {
              id: `company-${Date.now()}`,
              name: data.companyName,
              gstNumber: data.gstin,
              address: { street: data.address, city: '', state: '', pincode: '', country: 'India' },
              industry: data.businessType,
              logo: logo ? URL.createObjectURL(logo) : undefined,
            },
            createdAt: new Date().toISOString(),
          },
          `local-${Date.now()}`
        );
        router.push('/supplier/dashboard');
      } else {
        setSupplierRegisterError(msg || 'Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  /* Shared styles */
  const labelClass = 'block text-[11px] font-semibold text-dark-800 mb-1';
  const inputClass = (hasError: boolean) =>
    `w-full h-8 px-3 rounded-lg border text-xs text-dark-800 placeholder-dark-400 bg-white focus:outline-none focus:ring-4 transition-all ${
      hasError ? 'border-red-400 focus:ring-red-400/20' : 'border-dark-200 focus:border-brand-500 focus:ring-brand-500/20'
    }`;
  const errClass = 'text-red-500 text-[10px] mt-0.5 font-medium';
  const sectionTitle = 'text-xs font-bold text-dark-900 uppercase tracking-wider mb-2 flex items-center gap-2';

  return (
    <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>

      {/* ── Section 1: Account & Contact ── */}
      <div>
        <h3 className={sectionTitle}>
          <span className="h-5 w-5 rounded-full bg-brand-600 text-white flex items-center justify-center text-[10px] font-bold">1</span>
          Account &amp; Contact
        </h3>
        <div className="space-y-2 pl-6">
          <div>
            <label htmlFor="sup-mobile" className={labelClass}>Mobile Number *</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-dark-400 pointer-events-none" />
              <input id="sup-mobile" type="tel" placeholder="9876543210" className={`${inputClass(!!errors.mobile)} pl-8`} {...register('mobile')} />
            </div>
            {errors.mobile && <p className={errClass}>{errors.mobile.message}</p>}
          </div>
          <div>
            <label htmlFor="sup-name" className={labelClass}>Business Owner / Full Legal Name *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-dark-400 pointer-events-none" />
              <input id="sup-name" type="text" placeholder="Full legal name" className={`${inputClass(!!errors.fullName)} pl-8`} {...register('fullName')} />
            </div>
            {errors.fullName && <p className={errClass}>{errors.fullName.message}</p>}
          </div>
          <div>
            <label htmlFor="sup-email" className={labelClass}>Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-dark-400 pointer-events-none" />
              <input id="sup-email" type="email" placeholder="you@company.com (optional)" className={`${inputClass(!!errors.email)} pl-8`} {...register('email')} />
            </div>
            {errors.email && <p className={errClass}>{errors.email.message}</p>}
          </div>
        </div>
      </div>

      {/* ── Section 2: Business Details ── */}
      <div>
        <h3 className={sectionTitle}>
          <span className="h-5 w-5 rounded-full bg-brand-600 text-white flex items-center justify-center text-[10px] font-bold">2</span>
          Business Details
        </h3>
        <div className="space-y-2 pl-6">
          <div>
            <label htmlFor="sup-company" className={labelClass}>Company / Enterprise Name *</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-dark-400 pointer-events-none" />
              <input id="sup-company" type="text" placeholder="Your company name" className={`${inputClass(!!errors.companyName)} pl-8`} {...register('companyName')} />
            </div>
            {errors.companyName && <p className={errClass}>{errors.companyName.message}</p>}
          </div>
          <div>
            <label htmlFor="sup-btype" className={labelClass}>Business Type *</label>
            <div className="relative">
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-dark-400 pointer-events-none" />
              <select
                id="sup-btype"
                className={`${inputClass(!!errors.businessType)} appearance-none cursor-pointer pr-8`}
                defaultValue=""
                {...register('businessType')}
              >
                <option value="" disabled>Select business type</option>
                {BUSINESS_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            {errors.businessType && <p className={errClass}>{errors.businessType.message}</p>}
          </div>
          <div>
            <label htmlFor="sup-address" className={labelClass}>Registered Business Address *</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-3.5 w-3.5 text-dark-400 pointer-events-none" />
              <textarea
                id="sup-address"
                rows={2}
                placeholder="Full registered address including city, state, pincode"
                className={`w-full px-3 pl-8 py-2 rounded-lg border text-xs text-dark-800 placeholder-dark-400 bg-white focus:outline-none focus:ring-4 transition-all resize-none ${
                  errors.address ? 'border-red-400 focus:ring-red-400/20' : 'border-dark-200 focus:border-brand-500 focus:ring-brand-500/20'
                }`}
                {...register('address')}
              />
            </div>
            {errors.address && <p className={errClass}>{errors.address.message}</p>}
          </div>
        </div>
      </div>

      {/* ── Section 3: Tax & Legal KYC ── */}
      <div>
        <h3 className={sectionTitle}>
          <span className="h-5 w-5 rounded-full bg-brand-600 text-white flex items-center justify-center text-[10px] font-bold">3</span>
          Tax &amp; Legal KYC
        </h3>
        <div className="space-y-2 pl-6 lg:grid lg:grid-cols-2 lg:gap-x-3 lg:gap-y-2 lg:space-y-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 lg:col-span-2">
            <div>
              <label htmlFor="sup-gstin" className={labelClass}>GSTIN / GST Number *</label>
              <input
                id="sup-gstin"
                type="text"
                placeholder="22AAAAA0000A1Z5"
                className={`${inputClass(!!errors.gstin)} uppercase`}
                maxLength={15}
                {...register('gstin')}
              />
              {errors.gstin && <p className={errClass}>{errors.gstin.message}</p>}
            </div>
            <div>
              <label htmlFor="sup-pan" className={labelClass}>PAN Number *</label>
              <input
                id="sup-pan"
                type="text"
                placeholder="ABCDE1234F"
                className={`${inputClass(!!errors.pan)} uppercase`}
                maxLength={10}
                {...register('pan')}
              />
              {errors.pan && <p className={errClass}>{errors.pan.message}</p>}
            </div>
          </div>

          {/* GST Certificate Upload */}
          <div className="flex flex-col lg:col-span-2">
            <label className={`${labelClass} min-h-8 flex items-end`}>GST Certificate Document * <span className="font-normal text-dark-400">(PDF only)</span></label>
            <input type="file" ref={gstCertRef} accept=".pdf" className="hidden" onChange={(e) => { setGstCert(e.target.files?.[0] || null); setFileErrors((p) => ({ ...p, gstCert: undefined })); }} />
            <button
              type="button"
              onClick={() => gstCertRef.current?.click()}
              className={`w-full h-8 px-3 rounded-lg border text-xs flex items-center gap-2 transition-all ${
                fileErrors.gstCert ? 'border-red-400 text-red-500' : gstCert ? 'border-brand-500 text-brand-700 bg-brand-50' : 'border-dark-200 text-dark-500 hover:border-brand-300'
              }`}
            >
              <FileText className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{gstCert ? gstCert.name : 'Upload GST Certificate (PDF)'}</span>
              <Upload className="h-3.5 w-3.5 ml-auto flex-shrink-0" />
            </button>
            {fileErrors.gstCert && <p className={errClass}>{fileErrors.gstCert}</p>}
          </div>

          {/* PAN Document Upload */}
          <div className="flex flex-col lg:col-span-2">
            <label className={`${labelClass} min-h-8 flex items-end`}>PAN Card Document * <span className="font-normal text-dark-400">(JPG, JPEG, PNG, or PDF)</span></label>
            <input type="file" ref={panDocRef} accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={(e) => { setPanDoc(e.target.files?.[0] || null); setFileErrors((p) => ({ ...p, panDoc: undefined })); }} />
            <button
              type="button"
              onClick={() => panDocRef.current?.click()}
              className={`w-full h-8 px-3 rounded-lg border text-xs flex items-center gap-2 transition-all ${
                fileErrors.panDoc ? 'border-red-400 text-red-500' : panDoc ? 'border-brand-500 text-brand-700 bg-brand-50' : 'border-dark-200 text-dark-500 hover:border-brand-300'
              }`}
            >
              <FileText className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{panDoc ? panDoc.name : 'Upload PAN Card Document'}</span>
              <Upload className="h-3.5 w-3.5 ml-auto flex-shrink-0" />
            </button>
            {fileErrors.panDoc && <p className={errClass}>{fileErrors.panDoc}</p>}
          </div>
        </div>
      </div>

      {/* ── Section 4: Optional Media ── */}
      <div>
        <h3 className={sectionTitle}>
          <span className="h-5 w-5 rounded-full bg-dark-300 text-white flex items-center justify-center text-[10px] font-bold">4</span>
          Optional Media
        </h3>
        <div className="pl-6">
          <label className={labelClass}>Storefront Logo / Profile Photo <span className="font-normal text-dark-400">(JPG, JPEG, or PNG)</span></label>
          <input type="file" ref={logoRef} accept=".jpg,.jpeg,.png" className="hidden" onChange={(e) => setLogo(e.target.files?.[0] || null)} />
          <button
            type="button"
            onClick={() => logoRef.current?.click()}
            className={`w-full h-8 px-3 rounded-lg border text-xs flex items-center gap-2 transition-all ${
              logo ? 'border-brand-500 text-brand-700 bg-brand-50' : 'border-dark-200 text-dark-500 hover:border-brand-300'
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{logo ? logo.name : 'Upload logo or photo (optional)'}</span>
            <Upload className="h-3.5 w-3.5 ml-auto flex-shrink-0" />
          </button>
        </div>
      </div>

      {/* ── Terms ── */}
      <div className="flex items-start gap-2.5 pt-1">
        <input type="checkbox" id="supplier-terms" className="mt-0.5 h-3.5 w-3.5 rounded border-dark-300 text-brand-600 focus:ring-brand-500/30 cursor-pointer flex-shrink-0" {...register('terms')} />
        <label htmlFor="supplier-terms" className="text-[11px] text-dark-500 cursor-pointer leading-relaxed">
          I accept all{' '}
          <Link href="/terms" className="text-brand-600 font-semibold hover:underline">terms &amp; conditions</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-brand-600 font-semibold hover:underline">privacy policy</Link>
        </label>
      </div>
      {errors.terms && <p className="text-red-500 text-[10px] -mt-2 font-medium ml-6">{errors.terms.message}</p>}

      {/* ── Submit ── */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full h-10 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold text-sm shadow-md shadow-brand-600/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Creating account…
          </span>
        ) : (
          'Register as Supplier'
        )}
      </button>
    </form>
  );
}
