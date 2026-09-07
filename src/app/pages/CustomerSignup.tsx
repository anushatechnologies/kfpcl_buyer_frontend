import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  Building2,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Phone,
  Mail,
  User,
  MapPin,
  AlertCircle,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { authApi } from "@/api/auth.api";
import { systemApi } from "@/api/system.api";
import { useAuthStore } from "@/store/authStore";

const BUSINESS_TYPES = [
  "Wholesaler",
  "Distributor",
  "Retailer / Supermarket",
  "Food Processor / Manufacturer",
  "Exporter / Importer",
  "HoReCa / Hospitality",
  "Other Commercial Buyer",
];

const INDIAN_STATES = [
  "Telangana",
  "Andhra Pradesh",
  "Karnataka",
  "Maharashtra",
  "Tamil Nadu",
  "Kerala",
  "Gujarat",
  "Delhi",
  "Rajasthan",
  "Uttar Pradesh",
  "West Bengal",
  "Madhya Pradesh",
  "Punjab",
  "Haryana",
  "Odisha",
  "Other",
];

export function CustomerSignup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = searchParams.get("redirect")?.startsWith("/") ? searchParams.get("redirect")! : "/account";

  const { isAuthenticated, setAuthFromBackend } = useAuthStore();

  const paramPhone = searchParams.get("phone") || "";
  const paramToken = searchParams.get("token") || "";

  // Wizard state: "phone" -> "otp" -> "details"
  const [step, setStep] = useState<"phone" | "otp" | "details">(
    paramPhone && paramToken ? "details" : "phone"
  );

  const [phoneNumber, setPhoneNumber] = useState(paramPhone.replace(/\D/g, "").slice(-10));
  const [otp, setOtp] = useState("");
  const [verificationToken, setVerificationToken] = useState(paramToken);
  const [cooldown, setCooldown] = useState(0);

  // Business profile form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [businessType, setBusinessType] = useState(BUSINESS_TYPES[0]);
  const [state, setState] = useState("Telangana");
  const [city, setCity] = useState("Hyderabad");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTarget, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTarget]);

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // 1. Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phoneNumber.replace(/\D/g, "").slice(-10);
    if (cleanPhone.length !== 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      // API 1: Check phone
      const checkRes = await authApi.checkPhone(cleanPhone).catch(() => ({ exists: false }));
      if (checkRes.exists) {
        toast.info("This phone number is already registered. Redirecting to login...");
        navigate(`/login?redirect=${encodeURIComponent(redirectTarget)}`);
        return;
      }

      // API 2: Send OTP
      const sendRes = await authApi.sendOtp(cleanPhone);
      toast.success(sendRes.message || "Verification code sent to your mobile number via SMS.");
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

  // 2. Resend OTP
  const handleResendOtp = async () => {
    if (cooldown > 0 || isLoading) return;
    const cleanPhone = phoneNumber.replace(/\D/g, "").slice(-10);
    setIsLoading(true);
    setErrorMessage("");

    try {
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

  // 3. Verify OTP -> get verificationToken
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phoneNumber.replace(/\D/g, "").slice(-10);
    const cleanOtp = otp.trim();

    if (cleanOtp.length < 4) {
      setErrorMessage("Please enter the 6-digit OTP");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      // API 3: Verify OTP
      const res = await authApi.verifyOtp(cleanPhone, cleanOtp);

      if (res.isRegistered && res.accessToken && res.refreshToken && res.user) {
        // Already registered user
        setAuthFromBackend(res.user, res.accessToken, res.refreshToken);
        toast.success(`Welcome back, ${res.user.fullName || "Buyer"}!`);
        navigate(redirectTarget, { replace: true });
        return;
      }

      if (res.verificationToken) {
        setVerificationToken(res.verificationToken);
        toast.success("Phone verified successfully! Please complete your profile.");
        setStep("details");
      } else {
        throw new Error("Could not obtain verification token. Please try again.");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Invalid OTP code";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Submit Signup
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMessage("Please enter your full name");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid business email");
      return;
    }
    if (!companyName.trim()) {
      setErrorMessage("Please enter your company or trade enterprise name");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const cleanPhone = phoneNumber.replace(/\D/g, "").slice(-10);

      // API 5: Buyer Sign Up
      const res = await authApi.signup({
        phoneNumber: cleanPhone,
        verificationToken,
        fullName: fullName.trim(),
        email: email.trim(),
        companyName: companyName.trim(),
        businessType,
        state,
        city: city.trim(),
      });

      setAuthFromBackend(res.user, res.accessToken, res.refreshToken);
      toast.success("Registration completed! Welcome to KFPCL Exports.");

      // API 16: Register FCM token in background
      systemApi.saveFcmToken(`web-${Date.now()}`).catch(() => {});

      navigate(redirectTarget, { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Registration failed. Please check your details.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-12 bg-gradient-to-b from-[#F7F9F8] to-white">
      <div className="w-full max-w-lg rounded-3xl border border-gray-200/90 bg-white p-7 sm:p-9 shadow-[0_20px_60px_rgba(10,22,40,0.08)]">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A4D3C]/10 text-[#0A4D3C] mb-3">
            <Building2 className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold font-display text-[#0A1628]">Buyer Registration</h1>
          <p className="mt-1 text-sm text-gray-500">
            {step === "phone" && "Step 1 of 2: Verify your mobile phone"}
            {step === "otp" && "Step 1 of 2: Enter OTP code"}
            {step === "details" && "Step 2 of 2: Business details & trade onboarding"}
          </p>
        </div>

        {/* Progress bar */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div
            className={`h-1.5 w-16 rounded-full transition-colors ${
              step === "phone" || step === "otp" ? "bg-[#0A4D3C]" : "bg-emerald-600"
            }`}
          />
          <div
            className={`h-1.5 w-16 rounded-full transition-colors ${
              step === "details" ? "bg-[#0A4D3C]" : "bg-gray-200"
            }`}
          />
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200/80 p-3 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: Phone */}
        {step === "phone" && (
          <form onSubmit={handleSendOtp} className="space-y-4">
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
            </div>

            <button
              type="submit"
              disabled={isLoading || phoneNumber.length !== 10}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A4D3C] py-3 text-sm font-bold text-white shadow-md shadow-[#0A4D3C]/20 transition hover:bg-[#0E5E4A] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Sending OTP...</span>
                </>
              ) : (
                <>
                  <span>Send Verification Code</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: OTP */}
        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-700">
                  Enter 6-Digit OTP for +91 {phoneNumber}
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
                  Change
                </button>
              </div>

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

            <button
              type="submit"
              disabled={isLoading || otp.length < 4}
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
                  <span>Verify OTP</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 3: Business Details */}
        {step === "details" && (
          <form onSubmit={handleSignupSubmit} className="space-y-4">
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
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-300 focus:border-[#0A4D3C] focus:ring-2 focus:ring-[#0A4D3C]/20 transition outline-none"
                />
                <User className="absolute left-3 h-4 w-4 text-gray-400" />
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
                  placeholder="buyer@agroexports.com"
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-300 focus:border-[#0A4D3C] focus:ring-2 focus:ring-[#0A4D3C]/20 transition outline-none"
                />
                <Mail className="absolute left-3 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Company / Trade Name *
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Agro Commodities Pvt Ltd"
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-300 focus:border-[#0A4D3C] focus:ring-2 focus:ring-[#0A4D3C]/20 transition outline-none"
                />
                <Building2 className="absolute left-3 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Business Type
              </label>
              <div className="relative flex items-center">
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-300 bg-white focus:border-[#0A4D3C] focus:ring-2 focus:ring-[#0A4D3C]/20 transition outline-none appearance-none"
                >
                  {BUSINESS_TYPES.map((bt) => (
                    <option key={bt} value={bt}>
                      {bt}
                    </option>
                  ))}
                </select>
                <Briefcase className="absolute left-3 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  State
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-300 bg-white focus:border-[#0A4D3C] focus:ring-2 focus:ring-[#0A4D3C]/20 transition outline-none"
                >
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  City
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Hyderabad"
                    className="w-full pl-8 pr-3 py-2.5 text-sm rounded-xl border border-gray-300 focus:border-[#0A4D3C] focus:ring-2 focus:ring-[#0A4D3C]/20 transition outline-none"
                  />
                  <MapPin className="absolute left-2.5 h-3.5 w-3.5 text-gray-400" />
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
              <span className="text-gray-500">Verified Mobile:</span>
              <span className="font-bold text-gray-800">+91 {phoneNumber}</span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A4D3C] py-3 text-sm font-bold text-white shadow-md shadow-[#0A4D3C]/20 transition hover:bg-[#0E5E4A] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Creating Account...</span>
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

        {/* Footer */}
        <div className="mt-6 pt-5 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-500">
            Already registered?{" "}
            <Link to="/login" className="font-bold text-[#0A4D3C] hover:underline">
              Sign In with Mobile OTP
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
