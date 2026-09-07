import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  Phone,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Building2,
  Lock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { authApi } from "@/api/auth.api";
import { systemApi } from "@/api/system.api";
import { useAuthStore } from "@/store/authStore";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = searchParams.get("redirect")?.startsWith("/") ? searchParams.get("redirect")! : "/account";

  const { isAuthenticated, setAuthFromBackend } = useAuthStore();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // If already logged in, redirect
  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTarget, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTarget]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phoneNumber.replace(/\D/g, "").slice(-10);
    if (cleanPhone.length !== 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      // 1. Check if phone is registered (API 1)
      const checkResult = await authApi.checkPhone(cleanPhone).catch(() => ({ exists: false }));
      setIsRegistered(checkResult.exists);

      // 2. Send OTP (API 2)
      const sendResult = await authApi.sendOtp(cleanPhone);
      toast.success(sendResult.message || "Verification code sent to your phone via SMS.");

      setStep("otp");
      setCooldown(60);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to send OTP via SMS. Please try again.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || isLoading) return;
    const cleanPhone = phoneNumber.replace(/\D/g, "").slice(-10);

    setIsLoading(true);
    setErrorMessage("");
    try {
      // API 4: Resend OTP
      const res = await authApi.resendOtp(cleanPhone);
      toast.success(res.message || "New verification code sent via SMS.");
      setCooldown(60);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to resend verification code via SMS.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phoneNumber.replace(/\D/g, "").slice(-10);
    const cleanOtp = otp.trim();

    if (cleanOtp.length < 4) {
      setErrorMessage("Please enter the 6-digit OTP received");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      if (isRegistered) {
        // Flow B: Direct Buyer Login (API 6)
        const loginRes = await authApi.login({
          phoneNumber: cleanPhone,
          otp: cleanOtp,
        });

        setAuthFromBackend(loginRes.user, loginRes.accessToken, loginRes.refreshToken);
        toast.success(`Welcome back, ${loginRes.user.fullName || "Buyer"}!`);

        // Register FCM Web Token in background if configured (API 16)
        systemApi.saveFcmToken(`web-${Date.now()}`).catch(() => {});

        navigate(redirectTarget, { replace: true });
      } else {
        // Flow A: New Buyer Verify OTP (API 3)
        const verifyRes = await authApi.verifyOtp(cleanPhone, cleanOtp);

        if (verifyRes.isRegistered && verifyRes.accessToken && verifyRes.refreshToken && verifyRes.user) {
          // In case user was registered concurrently
          setAuthFromBackend(verifyRes.user, verifyRes.accessToken, verifyRes.refreshToken);
          toast.success(`Welcome back, ${verifyRes.user.fullName || "Buyer"}!`);
          navigate(redirectTarget, { replace: true });
        } else if (verifyRes.verificationToken) {
          // Unregistered Buyer: proceed to signup with verification token
          toast.info("Phone verified! Please complete your business registration details.");
          navigate(
            `/register?phone=${encodeURIComponent(cleanPhone)}&token=${encodeURIComponent(
              verifyRes.verificationToken
            )}&redirect=${encodeURIComponent(redirectTarget)}`
          );
        } else {
          throw new Error("Verification failed. Please request a new OTP.");
        }
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Invalid OTP code. Please check and retry.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-12 bg-gradient-to-b from-[#F7F9F8] to-white">
      <div className="w-full max-w-md rounded-3xl border border-gray-200/90 bg-white p-7 sm:p-8 shadow-[0_20px_60px_rgba(10,22,40,0.08)]">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A4D3C]/10 text-[#0A4D3C] mb-3">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold font-display text-[#0A1628]">Buyer Sign In</h1>
          <p className="mt-1 text-sm text-gray-500">
            {step === "phone"
              ? "Access wholesale catalog, bulk quotes & order tracking"
              : `Enter the 6-digit verification code sent to +91 ${phoneNumber}`}
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200/80 p-3 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Step 1: Phone Number */}
        {step === "phone" ? (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Mobile Number
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-sm font-semibold text-gray-400 select-none">
                  +91
                </span>
                <input
                  type="tel"
                  autoFocus
                  value={phoneNumber}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setPhoneNumber(cleaned);
                    if (errorMessage) setErrorMessage("");
                  }}
                  placeholder="98765 43210"
                  className="w-full pl-12 pr-4 py-3 text-sm font-medium rounded-xl border border-gray-300 focus:border-[#0A4D3C] focus:ring-2 focus:ring-[#0A4D3C]/20 transition outline-none"
                />
                <Phone className="absolute right-3.5 h-4 w-4 text-gray-400" />
              </div>
              <p className="mt-1.5 text-[11px] text-gray-400">
                We'll send a 6-digit one-time password (OTP) via SMS.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || phoneNumber.replace(/\D/g, "").length !== 10}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A4D3C] py-3 text-sm font-bold text-white shadow-md shadow-[#0A4D3C]/20 transition hover:bg-[#0E5E4A] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <span>Send Verification OTP</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Step 2: 6-digit OTP */
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-700">
                  Verification Code (OTP)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setStep("phone");
                    setOtp("");
                    setErrorMessage("");
                  }}
                  className="text-xs text-[#0A4D3C] font-semibold hover:underline"
                >
                  Change number
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  maxLength={6}
                  value={otp}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setOtp(cleaned);
                    if (errorMessage) setErrorMessage("");
                  }}
                  placeholder="• • • • • •"
                  className="w-full tracking-widest text-center py-3 text-lg font-bold rounded-xl border border-gray-300 focus:border-[#0A4D3C] focus:ring-2 focus:ring-[#0A4D3C]/20 transition outline-none"
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>Didn't receive code?</span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={cooldown > 0 || isLoading}
                  className="font-semibold text-[#0A4D3C] hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
                </button>
              </div>
            </div>

            {isRegistered === false && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>New buyer detected! Verifying OTP will unlock business onboarding.</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || otp.trim().length < 4}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A4D3C] py-3 text-sm font-bold text-white shadow-md shadow-[#0A4D3C]/20 transition hover:bg-[#0E5E4A] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{isRegistered === false ? "Verify & Continue" : "Sign In"}</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer info */}
        <div className="mt-6 pt-5 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-500">
            Don't have an account yet?{" "}
            <Link
              to="/register"
              className="font-bold text-[#0A4D3C] hover:underline"
            >
              Register as Buyer
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
