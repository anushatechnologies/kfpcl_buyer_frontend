'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Globe, Mail, Lock, LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/api/auth.api';
import AuthBackground from '@/components/layout/AuthBackground';


const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

// Demo credentials
const DEMO_USERS = [
  {
    email: 'buyer@kfpcl.com',
    password: 'password',
    name: 'KFPCL Buyer',
    role: 'buyer' as const,
    company: 'Karthikeya Farmer Producer Company Limited',
  },
  {
    email: 'buyer_test@kfpcl.com',
    password: 'pass123',
    name: 'KFPCL Test Buyer',
    role: 'buyer' as const,
    company: 'Karthikeya Farmer Producer Company Limited',
  },
  {
    email: 'buyer@example.com',
    password: 'demo1234',
    name: 'Rajesh Kumar',
    role: 'buyer' as const,
    company: 'Gulf Foodstuff Trading LLC',
  },
  {
    email: 'seller@example.com',
    password: 'demo1234',
    name: 'Aditya Sharma',
    role: 'seller' as const,
    company: 'Aditya Agro Exports',
  },
];

export default function LoginClient() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginType, setLoginType] = useState<'buyer' | 'seller'>('buyer');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: 'buyer@kfpcl.com',
      password: 'password',
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setLoginError('');

    try {
      // First try: real backend login
      const result = await authApi.login({ email: data.email, password: data.password });
      const token = result.token;
      const backendUser = result.user;

      if (token && backendUser) {
        const userRole = (backendUser as any).role?.toLowerCase?.() as 'buyer' | 'seller' | 'supplier' || loginType;
        const nextPath = new URLSearchParams(window.location.search).get('next');
        const destination = nextPath?.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/';

        setUser(
          {
            id: (backendUser as any).id || `user-${Date.now()}`,
            name: (backendUser as any).name || (backendUser as any).fullName || data.email.split('@')[0],
            email: data.email,
            role: userRole,
            phone: (backendUser as any).phone || (backendUser as any).mobile || '',
            isVerified: true,
            gstVerified: userRole !== 'buyer',
            company: (backendUser as any).company || {
              id: `company-${Date.now()}`,
              name: (backendUser as any).companyName || '',
              address: { street: '', city: '', state: '', pincode: '', country: 'India' },
              industry: '',
            },
            createdAt: (backendUser as any).createdAt || new Date().toISOString(),
          },
          token
        );

        if (userRole === 'seller' || userRole === 'supplier') {
          router.push('/seller/dashboard');
        } else {
          router.push(destination);
        }
        return;
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || '';
      const status = err?.response?.status;
      const isSupportedFrontendCredential = DEMO_USERS.some(
        (user) =>
          user.email.toLowerCase() === data.email.toLowerCase() && user.password === data.password
      );
      // If it's a real auth error (wrong credentials), show it
      if (
        !isSupportedFrontendCredential &&
        (status === 401 ||
          status === 403 ||
          msg.toLowerCase().includes('invalid') ||
          msg.toLowerCase().includes('incorrect') ||
          msg.toLowerCase().includes('wrong'))
      ) {
        setLoginError(msg || 'Invalid email or password.');
        setIsLoading(false);
        return;
      }
      // If backend auth endpoint not found (404 / URL not found), fall through to demo credentials
    }

    // Fallback: demo credentials check (for when backend auth isn't available)
    const user = DEMO_USERS.find(
      (u) => u.email.toLowerCase() === data.email.toLowerCase() && u.password === data.password
    );

    if (user) {
      const userRole = user.role;
      const nextPath = new URLSearchParams(window.location.search).get('next');
      const destination = nextPath?.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/';
      setUser(
        {
          id: `user-${Date.now()}`,
          name: user.name,
          email: user.email,
          role: userRole,
          phone: userRole === 'buyer' ? '+91 98765 43210' : '+91 98765 12345',
          isVerified: true,
          gstVerified: userRole !== 'buyer',
          company: {
            id: `company-${Date.now()}`,
            name: user.company,
            address: {
              street: '',
              city: userRole === 'buyer' ? 'Dubai' : 'Amritsar',
              state: userRole === 'buyer' ? 'UAE' : 'Punjab',
              pincode: '',
              country: userRole === 'buyer' ? 'UAE' : 'India',
            },
            industry: userRole === 'buyer' ? 'Trading / Sourcing' : 'Agro Exports',
          },
          createdAt: new Date().toISOString(),
        },
        `demo-${Date.now()}`
      );

      if (userRole === 'buyer') {
        router.push(destination);
      } else {
        router.push('/supplier/dashboard');
      }
    } else {
      setLoginError('Invalid email or password. Try buyer@kfpcl.com / password, buyer_test@kfpcl.com / pass123, or seller@example.com / demo1234');
    }

    setIsLoading(false);
  };


  return (
    <AuthBackground>
      <div className="w-full max-w-4xl bg-white/85 backdrop-blur-xl border border-white/80 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden flex flex-col lg:flex-row animate-fade-in transition-all duration-300">
        {/* Left side: illustration & supporting text (No logo displayed) */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-8 lg:p-10 bg-gradient-to-br from-brand-50/90 via-white to-brand-100/50 border-r border-dark-100/60">
          <div className="w-full max-w-sm flex flex-col items-center text-center">
            <div className="w-full overflow-hidden rounded-2xl shadow-md border border-brand-100/80 mb-6 bg-white">
              <img
                src="/sign_in_illustration.jpg"
                alt="Agricultural Trade and Global Export"
                className="w-full h-auto object-cover transform hover:scale-105 transition-transform duration-500"
              />
            </div>
            <h2 className="text-xl font-bold font-display text-dark-900 mb-2">
              Connecting Farmers to Global Markets
            </h2>
            <p className="text-dark-600 text-xs sm:text-sm leading-relaxed">
              Empowering Indian agriculture through seamless FPO aggregation, verified bulk trade, and direct export channels worldwide.
            </p>
          </div>
        </div>

        {/* Right side: sign‑in form */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center">
          <div className="p-6 sm:p-7">
            <div className="flex justify-center mb-4">
              <div className="h-10 w-10 rounded-xl bg-[#1B3D2F] flex items-center justify-center shadow-lg shadow-[#1B3D2F]/20">
                <Globe className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="text-center mb-4">
              <h1 className="text-xl font-bold font-display text-dark-900 mb-1">
                Welcome back 👋
              </h1>
              <p className="text-dark-500 text-sm">
                Sign in to your Karthikeya Farmer Producer Company Limited account
              </p>
            </div>
            {/* Login Type Tabs */}
            <div className="flex bg-dark-100 p-1 rounded-xl border border-dark-200/50 mb-4">
              <button
                type="button"
                onClick={() => {
                  setLoginType('buyer');
                  setValue('email', 'buyer@kfpcl.com');
                  setValue('password', 'password');
                  setLoginError('');
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all text-center focus:outline-none cursor-pointer ${
                  loginType === 'buyer'
                    ? 'bg-white text-[#1B3D2F] shadow-sm font-bold'
                    : 'text-dark-500 hover:text-dark-900'
                }`}
              >
                Buyer Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginType('seller');
                  setValue('email', 'seller@example.com');
                  setValue('password', 'demo1234');
                  setLoginError('');
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all text-center focus:outline-none cursor-pointer ${
                  loginType === 'seller'
                    ? 'bg-white text-[#1B3D2F] shadow-sm font-bold'
                    : 'text-dark-500 hover:text-dark-900'
                }`}
              >
                Seller Login
              </button>
            </div>
            {/* Demo Hint */}
            <div className="mb-4 p-3 rounded-xl bg-brand-50/80 backdrop-blur-sm border border-brand-100 flex items-start gap-2.5">
              <div className="mt-0.5 h-6 w-6 rounded-full bg-white flex items-center justify-center border border-brand-100 flex-shrink-0 shadow-sm">
                <svg className="h-3.5 w-3.5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-brand-800 text-[13px] mb-1">Demo credentials:</p>
                <p className="text-brand-700 text-[11px] font-medium leading-relaxed">
                  {loginType === 'buyer'
                    ? 'Buyer: buyer@kfpcl.com / password, or buyer_test@kfpcl.com / pass123'
                    : 'Seller: seller@example.com / demo1234'}
                </p>
              </div>
            </div>
            <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
              {/* Login error */}
              {loginError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50/80 backdrop-blur-sm border border-red-100 mb-4">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs font-medium text-red-800 leading-relaxed">{loginError}</p>
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-dark-800 mb-1 ml-1">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400 pointer-events-none" />
                    <input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      className={`w-full h-10 pl-10 pr-4 rounded-xl border ${errors.email ? 'border-red-400 focus:ring-red-400/30' : 'border-dark-200 focus:border-brand-500 focus:ring-brand-500/20'} bg-white/50 text-dark-900 text-sm placeholder-dark-400 focus:outline-none focus:ring-4 transition-all`}
                      autoComplete="email"
                      {...register('email')}
                    />
                  </div>
                  {errors.email && <p className="text-red-500 text-[10px] mt-1.5 ml-1 font-medium">{errors.email.message}</p>}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1 px-1">
                    <label htmlFor="password" className="block text-xs font-semibold text-dark-800">Password</label>
                    <Link href="/forgot-password" className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors">Forgot password?</Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400 pointer-events-none" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className={`w-full h-10 pl-10 pr-10 rounded-xl border ${errors.password ? 'border-red-400 focus:ring-red-400/30' : 'border-dark-200 focus:border-brand-500 focus:ring-brand-500/20'} bg-white/50 text-dark-900 text-sm placeholder-dark-400 focus:outline-none focus:ring-4 transition-all`}
                      autoComplete="current-password"
                      {...register('password')}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 p-1"
                      onClick={() => setShowPassword(v => !v)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-[10px] mt-1.5 ml-1 font-medium">{errors.password.message}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2.5 pt-1 pb-2 px-1">
                <input type="checkbox" id="remember" className="h-4 w-4 rounded border-dark-300 text-brand-600 focus:ring-brand-500/30 cursor-pointer" />
                <label htmlFor="remember" className="text-xs font-medium text-dark-600 cursor-pointer select-none">Remember me for 30 days</label>
              </div>
              <button
                type="submit"
                className="w-full h-10 flex items-center justify-center gap-2 bg-[#1B3D2F] hover:bg-[#132A20] text-white rounded-xl font-bold shadow-md shadow-brand-900/10 transition-all disabled:opacity-70 disabled:cursor-not-allowed text-sm cursor-pointer"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in…
                  </span>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </>
                )}
              </button>
            </form>
            <div className="mt-5 pt-4 border-t border-dark-100 text-center">
              <p className="text-xs text-dark-500 font-medium">
                Don’t have an account?{' '}
                <Link href="/register" className="text-[#1B3D2F] font-bold hover:underline inline-flex items-center gap-1 transition-all group">
                  Register Here
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
