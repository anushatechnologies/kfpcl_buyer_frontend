import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  Phone,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { authApi } from "@/api/auth.api";
import { firebaseSendOtp, firebaseVerifyOtp, resetFirebaseSession } from "@/api/firebaseAuth";
import { systemApi } from "@/api/system.api";
import { useAuthStore } from "@/store/authStore";
import { useAuthStore as useStorefrontAuthStore } from "@/app/store/authStore";
import { HAS_FIREBASE_CONFIG } from "@/app/lib/config";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = searchParams.get("redirect")?.startsWith("/") ? searchParams.get("redirect")! : "/account";

  const { isAuthenticated, setAuthFromBackend } = useAuthStore();
  const setStorefrontSession = useStorefrontAuthStore((state) => state.setSession);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [otpMethod, setOtpMethod] = useState<"firebase" | "backend">("firebase");
  const [fallbackOtp, setFallbackOtp] = useState<string>("");

  // If already logged in, redirect
  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTarget, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTarget]);

  // Clean up reCAPTCHA on unmount or navigation
  useEffect(() => {
    return () => {
      resetFirebaseSession();
    };
  }, []);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean10Digits = phoneNumber.replace(/[^0-9]/g, "").slice(-10);
    if (clean10Digits.length !== 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setFallbackOtp("");

    try {
      // 1. Check if phone is registered
      const checkResult = await authApi.checkPhone(clean10Digits).catch(() => ({ exists: false }));
      setIsRegistered(checkResult.exists);

      if (HAS_FIREBASE_CONFIG) {
        const result = await firebaseSendOtp(clean10Digits, "recaptcha-container");
        setOtpMethod("firebase");
        toast.success(result.message);
      } else {
        throw new Error("Firebase Authentication is not configured.");
      }

      setStep("otp");
      setCooldown(60);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to send OTP via SMS. Please try again.";
      setErrorMessage(msg);
      toast.error(msg);
      resetFirebaseSession();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || isLoading) return;
    const clean10Digits = phoneNumber.replace(/[^0-9]/g, "").slice(-10);

    setIsLoading(true);
    setErrorMessage("");
    setFallbackOtp("");
    resetFirebaseSession();

    try {
      if (HAS_FIREBASE_CONFIG) {
        const result = await firebaseSendOtp(clean10Digits, "recaptcha-container");
        setOtpMethod("firebase");
        toast.success(`New OTP sent — ${result.message}`);
      } else {
        throw new Error("Firebase Authentication is not configured.");
      }
      setCooldown(60);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to resend verification code via SMS.";
      setErrorMessage(msg);
      toast.error(msg);
      resetFirebaseSession();
    } finally {
      setIsLoading(false);
    }
  };

  const completeUserSession = (res: { accessToken: string; refreshToken?: string; user?: any }, cleanPhone: string) => {
    setStorefrontSession({
      accessToken: res.accessToken,
      refreshToken: res.refreshToken || "",
      customerId: Number(res.user?.id) || 1,
      phoneNumber: res.user?.phoneNumber || `+91${cleanPhone}`,
      name: res.user?.fullName || "Buyer",
      email: res.user?.email || "",
      roles: "buyer",
      expiresAt: Date.now() + 60 * 60 * 1000,
    });

    if (res.user) {
      setAuthFromBackend(res.user, res.accessToken, res.refreshToken);
    }

    if (typeof window !== "undefined") {
      if (res.accessToken) {
        localStorage.setItem("accessToken", res.accessToken);
        localStorage.setItem("kfpcl_token", res.accessToken);
      }
      if (res.refreshToken) {
        localStorage.setItem("refreshToken", res.refreshToken);
        localStorage.setItem("kfpcl_refresh_token", res.refreshToken);
      }
      if (res.user) {
        localStorage.setItem("user", JSON.stringify(res.user));
      }
    }

    toast.success(`Welcome back, ${res.user?.fullName || "Buyer"}!`);
    systemApi.saveFcmToken(`web-${Date.now()}`).catch(() => {});
    navigate(redirectTarget, { replace: true });
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean10Digits = phoneNumber.replace(/[^0-9]/g, "").slice(-10);
    const cleanOtp = otp.trim();

    if (cleanOtp.length < 6) {
      setErrorMessage("Please enter the complete 6-digit OTP received");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      if ((otpMethod === "firebase" || (typeof window !== "undefined" && window.confirmationResult)) && HAS_FIREBASE_CONFIG) {
        // 1. Verify code with Firebase
        const fbResult = await firebaseVerifyOtp(cleanOtp);

        // 2. Call KFPCL Backend to exchange Firebase ID Token for backend session tokens
        const loginRes = await authApi.firebaseLogin({
          idToken: fbResult.idToken,
          fullName: "",
          fcmToken: "",
        });

        completeUserSession(loginRes, clean10Digits);
        return;
      }

      // Fallback: non-Firebase backend flow
      if (isRegistered) {
        const loginRes = await authApi.login({
          phoneNumber: clean10Digits,
          otp: cleanOtp,
        });
        completeUserSession(loginRes, clean10Digits);
      } else {
        const verifyRes = await authApi.verifyOtp(clean10Digits, cleanOtp);

        if (verifyRes.isRegistered && verifyRes.accessToken && verifyRes.refreshToken && verifyRes.user) {
          completeUserSession(
            {
              accessToken: verifyRes.accessToken,
              refreshToken: verifyRes.refreshToken || "",
              user: verifyRes.user,
            },
            clean10Digits
          );
        } else if (verifyRes.verificationToken) {
          toast.info("Phone verified! Please complete your business registration details.");
          navigate(
            `/register?phone=${encodeURIComponent(clean10Digits)}&token=${encodeURIComponent(
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
      {/* Invisible reCAPTCHA container for Firebase Phone Auth */}
      <div id="recaptcha-container" />

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
                  <span>Sending OTP...</span>
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
                    resetFirebaseSession();
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

              {fallbackOtp && (
                <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center justify-between">
                  <span>Carrier SMS delayed? Test OTP: <strong className="font-mono font-bold tracking-wider">{fallbackOtp}</strong></span>
                  <button
                    type="button"
                    className="text-[#0A4D3C] font-bold underline hover:text-[#0E5E4A]"
                    onClick={() => setOtp(fallbackOtp)}
                  >
                    Auto-fill
                  </button>
                </div>
              )}
            </div>

            {isRegistered === false && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>New buyer detected! Verifying OTP will sign you in and unlock onboarding.</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || otp.trim().length < 6}
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
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer info */}
        <div className="mt-6 pt-5 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-500">
            Don’t have an account?{" "}
            <Link
              to="/register"
              className="font-bold text-[#0A4D3C] hover:underline"
            >
              Register Here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
