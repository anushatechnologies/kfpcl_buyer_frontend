import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useNavigate } from "react-router";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Phone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User,
  Mail,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { authApi } from "@/api/auth.api";
import { checkPhoneStatus, sendRealSmsOtp, verifyOtpAndLogin, resetRecaptchaVerifier } from "@/api/auth-service";
import { systemApi } from "@/api/system.api";
import { useAuthStore } from "../store/authStore";
import { useAuthStore as useLegacyAuthStore } from "@/store/authStore";
import { HAS_FIREBASE_CONFIG } from "@/app/lib/config";

const BUSINESS_TYPES = [
  "Wholesaler",
  "Distributor",
  "Retailer / Supermarket",
  "Food Processor / Manufacturer",
  "Exporter / Importer",
  "HoReCa / Hospitality",
  "Other Commercial Buyer",
];

export function AuthModal() {
  const navigate = useNavigate();
  const isOpen = useAuthStore((state) => state.isAuthModalOpen);
  const closeModal = useAuthStore((state) => state.closeAuthModal);
  const setSession = useAuthStore((state) => state.setSession);
  const setAuthFromBackend = useLegacyAuthStore((state) => state.setAuthFromBackend);

  const [step, setStep] = useState<"phone" | "otp" | "details">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Business registration form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [businessType, setBusinessType] = useState(BUSINESS_TYPES[0]);
  const [state, setState] = useState("Telangana");
  const [city, setCity] = useState("Hyderabad");

  const [otpMethod, setOtpMethod] = useState<"firebase" | "backend">("firebase");
  const [fallbackOtp, setFallbackOtp] = useState<string>("");

  // Reset modal state whenever opened
  useEffect(() => {
    if (isOpen) {
      setStep("phone");
      setPhoneNumber("");
      setOtp("");
      setFallbackOtp("");
      setVerificationToken("");
      setIsRegistered(null);
      setErrorMessage("");
      setIsLoading(false);
      setCooldown(0);
      setOtpMethod("firebase");
      resetRecaptchaVerifier();
    }
  }, [isOpen]);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // ─── 1. Send OTP ─────────────────────────────────────────────────────────────
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean10Digits = phoneNumber.replace(/[^0-9]/g, "").slice(-10);
    if (clean10Digits.length !== 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      // 1. Check if phone is registered in DB
      const status = await checkPhoneStatus(clean10Digits);
      setIsRegistered(status.isRegistered);

      if (status.isRegistered) {
        // Registered -> Send real SMS OTP with invisible background check
        await sendRealSmsOtp(clean10Digits, "modal-send-otp-btn");
        setStep("otp");
        setCooldown(60);
        toast.success(`OTP sent to +91 ${clean10Digits} via SMS`);
      } else {
        // Not registered -> Redirect to Registration Form
        closeModal();
        toast.info("Phone number not registered. Please complete registration.");
        navigate(`/register?phone=${clean10Digits}`);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to send OTP via SMS. Please try again.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── 2. Resend OTP ──────────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    if (cooldown > 0 || isLoading) return;
    const clean10Digits = phoneNumber.replace(/[^0-9]/g, "").slice(-10);

    setIsLoading(true);
    setErrorMessage("");
    setFallbackOtp("");

    try {
      await sendRealSmsOtp(clean10Digits, "modal-send-otp-btn");
      setCooldown(60);
      toast.success(`New OTP sent via SMS to +91 ${clean10Digits}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to resend OTP via SMS.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── 3. Verify OTP ──────────────────────────────────────────────────────────
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean10Digits = phoneNumber.replace(/[^0-9]/g, "").slice(-10);
    const cleanOtp = otp.trim();

    if (cleanOtp.length < 6) {
      setErrorMessage("Please enter the complete 6-digit OTP");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const { accessToken, refreshToken, user } = await verifyOtpAndLogin(cleanOtp);
      completeSignIn({ accessToken, refreshToken, user }, clean10Digits);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Invalid OTP or sign in failed.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Shared sign-in completion helper ────────────────────────────────────────
  const completeSignIn = (
    res: { accessToken: string; refreshToken?: string; user?: any },
    cleanPhone: string
  ) => {
    setSession({
      accessToken: res.accessToken,
      refreshToken: res.refreshToken || "",
      customerId: Number(res.user?.id) || 1,
      phoneNumber: res.user?.phoneNumber || cleanPhone,
      name: res.user?.fullName || "Buyer",
      email: res.user?.email || "",
      roles: "buyer",
      expiresAt: Date.now() + 60 * 60 * 1000,
    });
    if (res.user) {
      setAuthFromBackend(res.user, res.accessToken, res.refreshToken || "");
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
    closeModal();
  };

  // ─── 4. Submit Business Registration ─────────────────────────────────────────
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !companyName.trim()) {
      setErrorMessage("Please complete all required fields");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const cleanPhone = phoneNumber.replace(/\D/g, "").slice(-10);

      const isFirebaseToken = otpMethod === "firebase" || verificationToken.split(".").length === 3;

      let signupRes: any;
      if (isFirebaseToken && verificationToken) {
        signupRes = await authApi.firebaseLogin({
          idToken: verificationToken,
          fullName: fullName.trim(),
          email: email.trim(),
          companyName: companyName.trim(),
          businessType,
          state,
          city: city.trim(),
          fcmToken: `web-${Date.now()}`,
        });
      } else {
        signupRes = await authApi.signup({
          phoneNumber: cleanPhone,
          verificationToken,
          fullName: fullName.trim(),
          email: email.trim(),
          companyName: companyName.trim(),
          businessType,
          state,
          city: city.trim(),
        });
      }

      setSession({
        accessToken: signupRes.accessToken,
        refreshToken: signupRes.refreshToken,
        customerId: Number(signupRes.user?.id) || 1,
        phoneNumber: signupRes.user?.phoneNumber || cleanPhone,
        name: signupRes.user?.fullName || fullName,
        email: signupRes.user?.email || email,
        roles: "buyer",
        expiresAt: Date.now() + 60 * 60 * 1000,
      });

      setAuthFromBackend(signupRes.user, signupRes.accessToken, signupRes.refreshToken);

      toast.success("Registration complete! Welcome to KFPCL Exports.");
      systemApi.saveFcmToken(`web-${Date.now()}`).catch(() => {});
      closeModal();
    } catch (err: any) {
      const msg = err?.message || "Registration failed. Please check details.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0A1628]/65 p-4 backdrop-blur-md"
          onMouseDown={closeModal}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            className="relative w-full max-w-md rounded-3xl border border-white/40 bg-white p-6 sm:p-8 text-left shadow-[0_24px_70px_rgba(10,22,40,0.22)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            {/* Invisible reCAPTCHA anchor — required by Firebase */}
            <div id="recaptcha-container" />

            {/* Close Button */}
            <button
              type="button"
              aria-label="Close dialog"
              onClick={closeModal}
              className="absolute right-4 top-4 rounded-full border border-gray-200 bg-gray-50 p-1.5 text-gray-500 transition hover:bg-gray-200"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header Icon & Title */}
            <div className="text-center mb-5">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0A4D3C]/10 text-[#0A4D3C] mb-2.5">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold font-display text-[#0A1628]">
                {step === "phone" && "Buyer Sign In"}
                {step === "otp" && "Verify Mobile OTP"}
                {step === "details" && "Complete Business Profile"}
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                {step === "phone" && "Enter your mobile number to sign in or register"}
                {step === "otp" && `Enter the 6-digit code sent to +91 ${phoneNumber}`}
                {step === "details" && "Enter your trade credentials for verified wholesale access"}
              </p>
              {/* Firebase badge */}
              {HAS_FIREBASE_CONFIG && step !== "details" && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-orange-50 border border-orange-200 px-2.5 py-0.5">
                  <svg className="h-3 w-3 text-orange-500" viewBox="0 0 48 48" fill="currentColor">
                    <path d="M8 37L17.1 6.1c.3-1.1 1.8-1.3 2.4-.3L24 13l2.8-5.2c.6-1.1 2.2-.9 2.5.3L38 37H8z" opacity=".5"/>
                    <path d="M8 37l9.1-17 6.9 11-4 6H8zm30 0L28.5 13.8 24 21l7.1 10.8L38 37z"/>
                  </svg>
                  <span className="text-[10px] font-semibold text-orange-600">Secured by Firebase</span>
                </div>
              )}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-2.5 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* ── Step 1: Mobile Phone ──────────────────────────────────────────── */}
            {step === "phone" && (
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
                      className="w-full pl-12 pr-4 py-2.5 text-sm font-medium rounded-xl border border-gray-300 focus:border-[#0A4D3C] focus:ring-2 focus:ring-[#0A4D3C]/20 transition outline-none"
                    />
                    <Phone className="absolute right-3.5 h-4 w-4 text-gray-400" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || phoneNumber.replace(/\D/g, "").length !== 10}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A4D3C] py-2.5 text-sm font-bold text-white shadow-md shadow-[#0A4D3C]/20 transition hover:bg-[#0E5E4A] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Sending OTP…</span>
                    </>
                  ) : (
                    <>
                      <span>Continue with OTP</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ── Step 2: OTP Code ──────────────────────────────────────────────── */}
            {step === "otp" && (
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-gray-700">6-Digit Code</label>
                    <button
                      type="button"
                      onClick={() => {
                        setStep("phone");
                        setOtp("");
                        setErrorMessage("");
                        resetRecaptchaVerifier();
                      }}
                      className="text-xs text-[#0A4D3C] font-semibold hover:underline"
                    >
                      Change Number
                    </button>
                  </div>
                  <input
                    type="text"
                    autoFocus
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setOtp(cleaned);
                      if (errorMessage) setErrorMessage("");
                    }}
                    placeholder="• • • • • •"
                    className="w-full tracking-widest text-center py-2.5 text-base font-bold rounded-xl border border-gray-300 focus:border-[#0A4D3C] focus:ring-2 focus:ring-[#0A4D3C]/20 transition outline-none"
                  />
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                    <span>Didn't receive code?</span>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={cooldown > 0 || isLoading}
                      className="font-semibold text-[#0A4D3C] hover:underline disabled:opacity-50"
                    >
                      {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
                    </button>
                  </div>

                  {fallbackOtp && (
                    <div className="mt-2.5 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center justify-between">
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
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                    <span>New buyer! Verifying will lead to quick registration.</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || otp.trim().length < 6}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A4D3C] py-2.5 text-sm font-bold text-white shadow-md shadow-[#0A4D3C]/20 transition hover:bg-[#0E5E4A] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Verifying…</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{isRegistered === false ? "Verify & Proceed" : "Sign In"}</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ── Step 3: Business Details ──────────────────────────────────────── */}
            {step === "details" && (
              <form onSubmit={handleSignupSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Ramesh Reddy"
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-300 focus:border-[#0A4D3C] outline-none"
                    />
                    <User className="absolute left-2.5 h-3.5 w-3.5 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Business Email *
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="buyer@agrotrade.com"
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-300 focus:border-[#0A4D3C] outline-none"
                    />
                    <Mail className="absolute left-2.5 h-3.5 w-3.5 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Company Name *
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Agro Exports Ltd"
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-300 focus:border-[#0A4D3C] outline-none"
                    />
                    <Building2 className="absolute left-2.5 h-3.5 w-3.5 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Business Type
                  </label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:border-[#0A4D3C] outline-none"
                  >
                    {BUSINESS_TYPES.map((bt) => (
                      <option key={bt} value={bt}>
                        {bt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">State</label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A4D3C] py-2.5 text-sm font-bold text-white shadow-md shadow-[#0A4D3C]/20 transition hover:bg-[#0E5E4A] disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Creating Account…</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      <span>Complete Registration</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Footer Navigation */}
            <div className="mt-5 pt-4 border-t border-gray-100 text-center">
              {step !== "details" ? (
                <p className="text-xs text-gray-500">
                  Don’t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      closeModal();
                      navigate("/register");
                    }}
                    className="font-bold text-[#0A4D3C] hover:underline cursor-pointer inline-block"
                  >
                    Register Here
                  </button>
                </p>
              ) : (
                <p className="text-xs text-gray-500">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setStep("phone")}
                    className="font-bold text-[#0A4D3C] hover:underline cursor-pointer inline-block"
                  >
                    Sign In Here
                  </button>
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
