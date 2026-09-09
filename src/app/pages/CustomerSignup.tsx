import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  Building2,
  CheckCircle2,
  ShieldCheck,
  Phone,
  Mail,
  User,
  MapPin,
  AlertCircle,
  Briefcase,
  CreditCard,
  FileText,
  Upload,
  Trash2,
  Image as ImageIcon,
  ChevronDown,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { authApi } from "@/api/auth.api";
import { sendRealSmsOtp, verifyOtpForRegistration, submitBuyerRegistration } from "@/api/auth-service";
import { systemApi } from "@/api/system.api";
import { useAuthStore } from "@/store/authStore";

const BUSINESS_TYPES = [
  { value: "WHOLESALER", label: "Wholesaler" },
  { value: "TRADER", label: "Trader" },
  { value: "RETAILER", label: "Retailer" },
  { value: "OTHER", label: "Other Commercial Enterprise" },
];

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi (NCT)",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const MOBILE_REGEX = /^[6-9][0-9]{9}$/;

export function CustomerSignup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = searchParams.get("redirect")?.startsWith("/")
    ? searchParams.get("redirect")!
    : "/account";

  const { isAuthenticated, setAuthFromBackend, setUser } = useAuthStore();

  // 10 Required Buyer Registration Fields — clean initial state (no dummy data)
  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState(
    (searchParams.get("phone") || "").replace(/\D/g, "").slice(-10)
  );
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [gstin, setGstin] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [panFile, setPanFile] = useState<File | null>(null);
  const [panPreview, setPanPreview] = useState<string | null>(null);
  // Optional GST image
  const [gstFile, setGstFile] = useState<File | null>(null);
  const [gstPreview, setGstPreview] = useState<string | null>(null);
  const [gstFileError, setGstFileError] = useState("");
  const [isGstDragging, setIsGstDragging] = useState(false);
  const gstFileInputRef = useRef<HTMLInputElement>(null);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // UI / Validation State
  const [isDragging, setIsDragging] = useState(false);
  const [panFileError, setPanFileError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const panFileInputRef = useRef<HTMLInputElement>(null);

  // Phone OTP Verification State (Real SMS OTP with invisible background check)
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [otp, setOtp] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  const handleSendRegOtp = async () => {
    const cleanPhone = mobileNumber.replace(/\D/g, "").slice(-10);
    if (cleanPhone.length !== 10) {
      setFieldErrors((p) => ({ ...p, mobileNumber: "Please enter a valid 10-digit Indian mobile number" }));
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }

    setIsSendingOtp(true);
    setErrorMessage("");
    try {
      await sendRealSmsOtp(cleanPhone, "send-reg-otp-btn");
      setOtpSent(true);
      setOtpCooldown(60);
      toast.success(`Verification OTP sent via SMS to +91 ${cleanPhone}`);
    } catch (err: any) {
      const msg = err?.message || "Failed to send verification OTP via SMS.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyRegOtp = async () => {
    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      toast.error("Please enter the complete 6-digit OTP code");
      return;
    }

    setIsVerifyingOtp(true);
    setErrorMessage("");
    try {
      await verifyOtpForRegistration(cleanOtp);
      setIsPhoneVerified(true);
      toast.success("Phone number verified successfully! You can now complete your details.");
    } catch (err: any) {
      const msg = err?.message || "Invalid OTP verification code.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTarget, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTarget]);

  // Handle PAN file selection
  const handlePanFileSelect = (file: File | null) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setPanFileError("File size exceeds 5MB limit");
      return;
    }

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      setPanFileError("Please upload an image (JPG, PNG, WEBP) or PDF");
      return;
    }

    setPanFileError("");
    setPanFile(file);

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPanPreview(url);
    } else {
      setPanPreview(null);
    }
  };

  const handleRemovePanFile = () => {
    setPanFile(null);
    if (panPreview) {
      URL.revokeObjectURL(panPreview);
      setPanPreview(null);
    }
    if (panFileInputRef.current) {
      panFileInputRef.current.value = "";
    }
  };

  // Handle optional GST file selection
  const handleGstFileSelect = (file: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setGstFileError("File size exceeds 5MB limit");
      return;
    }
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      setGstFileError("Please upload an image (JPG, PNG, WEBP) or PDF");
      return;
    }
    setGstFileError("");
    setGstFile(file);
    if (file.type.startsWith("image/")) {
      setGstPreview(URL.createObjectURL(file));
    } else {
      setGstPreview(null);
    }
  };

  const handleRemoveGstFile = () => {
    setGstFile(null);
    if (gstPreview) URL.revokeObjectURL(gstPreview);
    setGstPreview(null);
    if (gstFileInputRef.current) gstFileInputRef.current.value = "";
  };

  // Validate all required fields
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // 1. Full name
    if (!fullName.trim() || fullName.trim().length < 2) {
      errors.fullName = "Full legal name must be at least 2 characters";
    }

    // 2. Mobile number
    const cleanPhone = mobileNumber.replace(/\D/g, "");
    if (!MOBILE_REGEX.test(cleanPhone)) {
      errors.mobileNumber = "Enter a valid 10-digit Indian mobile number (starts with 6-9)";
    }

    // 3. Email Address
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailPattern.test(email.trim())) {
      errors.email = "Please enter a valid email address";
    }

    // 4. Business Name
    if (!businessName.trim() || businessName.trim().length < 2) {
      errors.businessName = "Business / Enterprise name must be at least 2 characters";
    }

    // 5. Business type
    if (!businessType) {
      errors.businessType = "Please select a business type";
    }

    // 6. State
    if (!state) {
      errors.state = "Please select a state";
    }

    // 7. City
    if (!city.trim() || city.trim().length < 2) {
      errors.city = "City / District name is required";
    }

    // 8. GSTIN (optional — only validate format if provided)
    const cleanGstin = gstin.trim().toUpperCase();
    if (cleanGstin.length > 0 && !GSTIN_REGEX.test(cleanGstin)) {
      errors.gstin = "Enter a valid 15-character GSTIN (e.g. 36AAAAA0000A1Z5)";
    }

    // 9. Pancard Number
    const cleanPan = panNumber.trim().toUpperCase();
    if (!PAN_REGEX.test(cleanPan)) {
      errors.panNumber = "Enter a valid 10-character PAN number (e.g. ABCDE1234F)";
    }

    // 10. Pancard Image
    if (!panFile) {
      setPanFileError("Pancard image / document is required");
      errors.panImage = "Pancard image / document is required";
    } else {
      setPanFileError("");
    }

    if (!agreeTerms) {
      errors.terms = "You must agree to the terms and privacy policy";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Buyer Registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!isPhoneVerified) {
      const msg = "Please verify your phone number OTP first.";
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    if (!validateForm()) {
      setErrorMessage("Please fill in all required fields accurately.");
      return;
    }

    setIsLoading(true);

    try {
      const cleanPhone = mobileNumber.replace(/\D/g, "").slice(-10);
      const cleanGstin = gstin.trim().toUpperCase();
      const cleanPan = panNumber.trim().toUpperCase();

      // Normalize business type to WHOLESALER | TRADER | RETAILER | OTHER
      let normalizedType = "OTHER";
      const bt = (businessType || "").toUpperCase();
      if (bt.includes("WHOLESALE")) normalizedType = "WHOLESALER";
      else if (bt.includes("TRADE")) normalizedType = "TRADER";
      else if (bt.includes("RETAIL") || bt.includes("SUPERMARKET")) normalizedType = "RETAILER";
      else if (["WHOLESALER", "TRADER", "RETAILER", "OTHER"].includes(bt)) normalizedType = bt;

      // Submit multipart form data to POST /api/v1/register
      await submitBuyerRegistration({
        fullName: fullName.trim(),
        mobileNumber: cleanPhone,
        email: email.trim(),
        companyName: businessName.trim(),
        businessType: normalizedType,
        state: state.trim(),
        city: city.trim(),
        panNumber: cleanPan,
        panCardFile: panFile,
        gstin: cleanGstin || undefined,
        gstinPhotoFile: gstFile || undefined,
      });

      toast.success("Registration submitted successfully! Pending admin verification.");
      systemApi.saveFcmToken(`web-${Date.now()}`).catch(() => {});
      navigate("/login", { replace: true });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Registration failed. Please check your information and try again.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const labelClass = "flex items-center gap-1.5 text-xs font-semibold text-gray-800 mb-1.5";
  const inputClass = (hasError: boolean) =>
    `w-full h-10 px-3.5 rounded-xl border text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 transition-all ${
      hasError
        ? "border-red-400 focus:border-red-500 focus:ring-red-400/20"
        : "border-gray-300 hover:border-gray-400 focus:border-[#0A4D3C] focus:ring-[#0A4D3C]/20"
    }`;
  const errorClass = "text-red-500 text-[11px] mt-1 font-medium flex items-center gap-1";

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-10 bg-gradient-to-b from-[#F4F7F5] via-[#FCFDFD] to-white">
      <div className="w-full max-w-3xl rounded-3xl border border-gray-200/90 bg-white p-6 sm:p-9 shadow-[0_20px_60px_rgba(10,22,40,0.06)]">
        
        {/* ── Title Header ── */}
        <div className="text-center mb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A4D3C]/10 text-[#0A4D3C] mb-3 shadow-sm">
            <Building2 className="h-6 w-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-[#0A1628] tracking-tight">
            Create Your Account
          </h1>
          <p className="mt-1.5 text-sm text-gray-500">
            Fill in your business details to register as a verified buyer on Karthikeya Farmer Producer Company Limited.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200/80 p-3.5 text-xs text-red-700 animate-fade-in">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ── THE 10 REQUIRED BUYER FIELDS ── */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* ── GROUP 1: Personal & Contact Details ── */}
          <div className="bg-gray-50/70 border border-gray-200/80 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
              <span className="h-5 w-5 rounded-full bg-[#0A4D3C] text-white flex items-center justify-center text-[10px] font-bold">
                1
              </span>
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Contact &amp; Profile Details
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 1. Full name */}
              <div className="sm:col-span-2">
                <label htmlFor="fullName" className={labelClass}>
                  <span className="font-bold text-[#0A4D3C]">1.</span>
                  <span>Full Name</span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (fieldErrors.fullName) {
                        setFieldErrors((p) => ({ ...p, fullName: "" }));
                      }
                    }}
                    placeholder="Enter your full legal name"
                    className={`${inputClass(!!fieldErrors.fullName)} pl-10`}
                  />
                </div>
                {fieldErrors.fullName && (
                  <p className={errorClass}>
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.fullName}
                  </p>
                )}
              </div>

              {/* 2. Mobile number & Real SMS OTP Verification */}
              <div className="sm:col-span-2 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="mobileNumber" className={labelClass}>
                    <span className="font-bold text-[#0A4D3C]">2.</span>
                    <span>Mobile Number &amp; Verification</span>
                    <span className="text-red-500">*</span>
                  </label>
                  {isPhoneVerified && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-sm">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Phone Verified
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1 flex items-center">
                    <div className="absolute left-3.5 flex items-center gap-1 pointer-events-none text-gray-500 font-semibold text-xs border-r border-gray-200 pr-2">
                      <Phone className="h-3.5 w-3.5 text-gray-400" />
                      <span>+91</span>
                    </div>
                    <input
                      id="mobileNumber"
                      type="tel"
                      disabled={isPhoneVerified || isSendingOtp}
                      maxLength={10}
                      value={mobileNumber}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setMobileNumber(cleaned);
                        if (fieldErrors.mobileNumber) {
                          setFieldErrors((p) => ({ ...p, mobileNumber: "" }));
                        }
                      }}
                      placeholder="10-digit mobile number"
                      className={`${inputClass(!!fieldErrors.mobileNumber)} pl-[4.5rem] font-mono ${
                        isPhoneVerified ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""
                      }`}
                    />
                  </div>

                  {!isPhoneVerified && (
                    <button
                      id="send-reg-otp-btn"
                      type="button"
                      disabled={isSendingOtp || otpCooldown > 0 || mobileNumber.replace(/\D/g, "").length !== 10}
                      onClick={handleSendRegOtp}
                      className="px-5 py-2.5 rounded-xl bg-[#0A4D3C] text-white text-xs font-bold shadow-sm hover:bg-[#0E5E4A] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      {isSendingOtp ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Sending OTP...</span>
                        </>
                      ) : otpCooldown > 0 ? (
                        <span>Resend in {otpCooldown}s</span>
                      ) : (
                        <span>{otpSent ? "Resend OTP" : "Send OTP"}</span>
                      )}
                    </button>
                  )}
                </div>

                {fieldErrors.mobileNumber && (
                  <p className={errorClass}>
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.mobileNumber}
                  </p>
                )}

                {/* OTP input & verification box */}
                {!isPhoneVerified && otpSent && (
                  <div className="mt-3 pt-3 border-t border-emerald-200/60 animate-fade-in">
                    <p className="text-xs text-gray-700 font-medium mb-2">
                      Enter the 6-digit SMS OTP sent to <strong className="text-gray-900">+91 {mobileNumber}</strong>:
                    </p>
                    <div className="flex items-center gap-2 max-w-sm">
                      <input
                        type="text"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="• • • • • •"
                        className="w-36 h-10 px-3 text-center tracking-widest text-base font-bold rounded-xl border border-gray-300 focus:border-[#0A4D3C] focus:ring-2 focus:ring-[#0A4D3C]/20 outline-none"
                      />
                      <button
                        type="button"
                        disabled={isVerifyingOtp || otp.trim().length !== 6}
                        onClick={handleVerifyRegOtp}
                        className="px-4 py-2 rounded-xl bg-[#0A4D3C] text-white text-xs font-bold shadow-sm hover:bg-[#0E5E4A] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 whitespace-nowrap"
                      >
                        {isVerifyingOtp ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            <span>Verifying...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Verify OTP</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Email Address */}
              <div>
                <label htmlFor="email" className={labelClass}>
                  <span className="font-bold text-[#0A4D3C]">3.</span>
                  <span>Email Address</span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) {
                        setFieldErrors((p) => ({ ...p, email: "" }));
                      }
                    }}
                    placeholder="name@company.com"
                    className={`${inputClass(!!fieldErrors.email)} pl-10`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className={errorClass}>
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.email}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── GROUP 2: Business & Location ── */}
          <div className="bg-gray-50/70 border border-gray-200/80 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
              <span className="h-5 w-5 rounded-full bg-[#0A4D3C] text-white flex items-center justify-center text-[10px] font-bold">
                2
              </span>
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Business &amp; Location
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 4. Company Name */}
              <div>
                <label htmlFor="businessName" className={labelClass}>
                  <span className="font-bold text-[#0A4D3C]">4.</span>
                  <span>Company Name</span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    id="businessName"
                    type="text"
                    value={businessName}
                    onChange={(e) => {
                      setBusinessName(e.target.value);
                      if (fieldErrors.businessName) {
                        setFieldErrors((p) => ({ ...p, businessName: "" }));
                      }
                    }}
                    placeholder="Enter business / company name"
                    className={`${inputClass(!!fieldErrors.businessName)} pl-10`}
                  />
                </div>
                {fieldErrors.businessName && (
                  <p className={errorClass}>
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.businessName}
                  </p>
                )}
              </div>

              {/* 5. Business type */}
              <div>
                <label htmlFor="businessType" className={labelClass}>
                  <span className="font-bold text-[#0A4D3C]">5.</span>
                  <span>Business Type</span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <select
                    id="businessType"
                    value={businessType}
                    onChange={(e) => {
                      setBusinessType(e.target.value);
                      if (fieldErrors.businessType) {
                        setFieldErrors((p) => ({ ...p, businessType: "" }));
                      }
                    }}
                    className={`${inputClass(!!fieldErrors.businessType)} pl-10 pr-9 appearance-none cursor-pointer bg-white`}
                  >
                    <option value="" disabled>Select business type</option>
                    {BUSINESS_TYPES.map((bt) => (
                      <option key={bt.value} value={bt.value}>
                        {bt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
                {fieldErrors.businessType && (
                  <p className={errorClass}>
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.businessType}
                  </p>
                )}
              </div>

              {/* 6. State */}
              <div>
                <label htmlFor="state" className={labelClass}>
                  <span className="font-bold text-[#0A4D3C]">6.</span>
                  <span>State</span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <select
                    id="state"
                    value={state}
                    onChange={(e) => {
                      setState(e.target.value);
                      if (fieldErrors.state) {
                        setFieldErrors((p) => ({ ...p, state: "" }));
                      }
                    }}
                    className={`${inputClass(!!fieldErrors.state)} pl-10 pr-9 appearance-none cursor-pointer bg-white`}
                  >
                    <option value="" disabled>Select State</option>
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
                {fieldErrors.state && (
                  <p className={errorClass}>
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.state}
                  </p>
                )}
              </div>

              {/* 7. City */}
              <div>
                <label htmlFor="city" className={labelClass}>
                  <span className="font-bold text-[#0A4D3C]">7.</span>
                  <span>City</span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    id="city"
                    type="text"
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      if (fieldErrors.city) {
                        setFieldErrors((p) => ({ ...p, city: "" }));
                      }
                    }}
                    placeholder="Enter city / district"
                    className={`${inputClass(!!fieldErrors.city)} pl-10`}
                  />
                </div>
                {fieldErrors.city && (
                  <p className={errorClass}>
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.city}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── GROUP 3: Tax & KYC Compliance ── */}
          <div className="bg-gray-50/70 border border-gray-200/80 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
              <span className="h-5 w-5 rounded-full bg-[#0A4D3C] text-white flex items-center justify-center text-[10px] font-bold">
                3
              </span>
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Tax &amp; KYC Compliance
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 8. GST Number (Optional) */}
              <div>
                <label htmlFor="gstin" className={labelClass}>
                  <span className="font-bold text-[#0A4D3C]">8.</span>
                  <span>GST Number</span>
                  <span className="text-[11px] font-normal text-gray-400 ml-1">(Optional)</span>
                </label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    id="gstin"
                    type="text"
                    maxLength={15}
                    value={gstin}
                    onChange={(e) => {
                      setGstin(e.target.value.toUpperCase());
                      if (fieldErrors.gstin) {
                        setFieldErrors((p) => ({ ...p, gstin: "" }));
                      }
                    }}
                    placeholder="e.g. 36AAAAA0000A1Z5"
                    className={`${inputClass(!!fieldErrors.gstin)} pl-10 uppercase font-mono tracking-wide`}
                  />
                </div>
                {fieldErrors.gstin ? (
                  <p className={errorClass}>
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.gstin}
                  </p>
                ) : (
                  <p className="text-[10px] text-gray-400 mt-1">15-character GSTIN — leave blank if not registered</p>
                )}
              </div>

              {/* 9. Pancard Number */}
              <div>
                <label htmlFor="panNumber" className={labelClass}>
                  <span className="font-bold text-[#0A4D3C]">9.</span>
                  <span>Pancard Number</span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    id="panNumber"
                    type="text"
                    maxLength={10}
                    value={panNumber}
                    onChange={(e) => {
                      setPanNumber(e.target.value.toUpperCase());
                      if (fieldErrors.panNumber) {
                        setFieldErrors((p) => ({ ...p, panNumber: "" }));
                      }
                    }}
                    placeholder="e.g. ABCDE1234F"
                    className={`${inputClass(!!fieldErrors.panNumber)} pl-10 uppercase font-mono tracking-wide`}
                  />
                </div>
                {fieldErrors.panNumber ? (
                  <p className={errorClass}>
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.panNumber}
                  </p>
                ) : (
                  <p className="text-[10px] text-gray-400 mt-1">10-character Permanent Account Number</p>
                )}
              </div>

              {/* GST Certificate Image (Optional) */}
              <div className="sm:col-span-2">
                <label className={labelClass}>
                  <span>GST Certificate Image</span>
                  <span className="text-[11px] font-normal text-gray-400 ml-1">(Optional – JPG, PNG, WEBP, or PDF, max 5MB)</span>
                </label>

                <input
                  type="file"
                  id="gstFileInput"
                  ref={gstFileInputRef}
                  accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                  className="hidden"
                  onChange={(e) => handleGstFileSelect(e.target.files?.[0] || null)}
                />

                {!gstFile ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsGstDragging(true); }}
                    onDragLeave={() => setIsGstDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setIsGstDragging(false); handleGstFileSelect(e.dataTransfer.files?.[0] || null); }}
                    onClick={() => gstFileInputRef.current?.click()}
                    className={`w-full border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all ${
                      gstFileError
                        ? "border-red-400 bg-red-50/50"
                        : isGstDragging
                        ? "border-[#0A4D3C] bg-[#0A4D3C]/5 scale-[0.99]"
                        : "border-gray-300 bg-white hover:border-[#0A4D3C] hover:bg-[#0A4D3C]/5"
                    }`}
                  >
                    <div className="h-9 w-9 rounded-xl bg-[#0A4D3C]/10 text-[#0A4D3C] flex items-center justify-center mb-1.5">
                      <Upload className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-semibold text-gray-700">Click to upload GST certificate (optional)</p>
                    <p className="text-xs text-gray-400 mt-0.5">Clear photo or scan of your GST registration certificate</p>
                  </div>
                ) : (
                  <div className="border border-gray-200 bg-white rounded-2xl p-3 flex items-center gap-3 shadow-sm">
                    {gstPreview ? (
                      <div className="relative h-14 w-20 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
                        <img src={gstPreview} alt="GST Preview" className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-14 w-20 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col items-center justify-center text-[#0A4D3C] flex-shrink-0">
                        <FileText className="h-5 w-5 mb-0.5" />
                        <span className="text-[9px] font-bold uppercase">PDF</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mb-1">
                        <CheckCircle2 className="h-3 w-3" /> GST Uploaded
                      </span>
                      <p className="text-xs font-bold text-gray-800 truncate">{gstFile.name}</p>
                      <p className="text-[10px] text-gray-400">{(gstFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button type="button" onClick={() => gstFileInputRef.current?.click()} className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Replace</button>
                      <button type="button" onClick={handleRemoveGstFile} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                )}

                {gstFileError && (
                  <p className={errorClass}>
                    <AlertCircle className="h-3 w-3" />
                    {gstFileError}
                  </p>
                )}
              </div>

              {/* 10. Pancard Image */}
              <div className="sm:col-span-2">
                <label className={labelClass}>
                  <span className="font-bold text-[#0A4D3C]">10.</span>
                  <span>Pancard Image</span>
                  <span className="text-red-500">*</span>
                  <span className="text-[11px] font-normal text-gray-400 ml-1">
                    (JPG, PNG, WEBP, or PDF, max 5MB)
                  </span>
                </label>

                <input
                  type="file"
                  id="panFileInput"
                  ref={panFileInputRef}
                  accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                  className="hidden"
                  onChange={(e) => handlePanFileSelect(e.target.files?.[0] || null)}
                />

                {!panFile ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      handlePanFileSelect(e.dataTransfer.files?.[0] || null);
                    }}
                    onClick={() => panFileInputRef.current?.click()}
                    className={`w-full border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all ${
                      panFileError
                        ? "border-red-400 bg-red-50/50"
                        : isDragging
                        ? "border-[#0A4D3C] bg-[#0A4D3C]/5 scale-[0.99]"
                        : "border-gray-300 bg-white hover:border-[#0A4D3C] hover:bg-[#0A4D3C]/5"
                    }`}
                  >
                    <div className="h-10 w-10 rounded-2xl bg-[#0A4D3C]/10 text-[#0A4D3C] flex items-center justify-center mb-2">
                      <Upload className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-semibold text-gray-800">
                      Click to upload or drag &amp; drop PAN card
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Clear photo or scanned PDF of your business PAN card
                    </p>
                  </div>
                ) : (
                  <div className="border border-gray-200 bg-white rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 shadow-sm">
                    {panPreview ? (
                      <div className="relative h-20 w-32 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0 group">
                        <img
                          src={panPreview}
                          alt="PAN Card Preview"
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="h-20 w-32 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col items-center justify-center text-emerald-800 flex-shrink-0">
                        <FileText className="h-7 w-7 mb-1 text-[#0A4D3C]" />
                        <span className="text-[10px] font-bold uppercase">PDF Document</span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0 text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" /> Ready
                        </span>
                        <span className="text-xs text-gray-400">
                          {(panFile.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                      <p className="text-sm font-bold text-gray-800 truncate mt-1">
                        {panFile.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Uploaded for KYC &amp; tax compliance verification
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => panFileInputRef.current?.click()}
                        className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={handleRemovePanFile}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove file"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {panFileError && (
                  <p className={errorClass}>
                    <AlertCircle className="h-3 w-3" />
                    {panFileError}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Terms & Conditions ── */}
          <div className="pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                id="agreeTerms"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#0A4D3C] focus:ring-[#0A4D3C] cursor-pointer"
              />
              <span className="text-xs text-gray-600 leading-relaxed">
                I accept all{" "}
                <Link to="/terms-of-service" className="text-[#0A4D3C] font-semibold hover:underline">
                  terms &amp; conditions
                </Link>{" "}
                and{" "}
                <Link to="/privacy-policy" className="text-[#0A4D3C] font-semibold hover:underline">
                  privacy policy
                </Link>{" "}
                of Karthikeya Farmer Producer Company Limited.
              </span>
            </label>
            {fieldErrors.terms && (
              <p className={errorClass}>
                <AlertCircle className="h-3 w-3" />
                {fieldErrors.terms}
              </p>
            )}
          </div>

          {/* ── Submit Button: Create Your Account ── */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A4D3C] py-3 text-sm font-bold text-white shadow-md shadow-[#0A4D3C]/20 transition hover:bg-[#0E5E4A] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Creating Your Account…</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                <span>Create Your Account</span>
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 pt-5 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-500">
            Already have an account?{" "}
            <Link to="/login" className="font-bold text-[#0A4D3C] hover:underline">
              Sign In Here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
