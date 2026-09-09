import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link, useSearchParams } from "react-router";
import {
  AlertCircle,
  ArrowLeft,
  Building,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  FileText,
  Layers,
  ListFilter,
  LoaderCircle,
  LogIn,
  MapPin,
  Phone,
  PlusCircle,
  RefreshCcw,
  Search,
  Sparkles,
  Tag,
  TrendingUp,
  Truck,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { rfqApi } from "@/api/rfq.api";
import { useAuthStore } from "../store/authStore";
import type { RFQ, Quote } from "@/types/rfq";

const SAMPLE_TEMPLATES = [
  {
    title: "50 MT APEDA Certified Basmati Rice 1121",
    description: "Extra-long grain Basmati Rice 1121, moisture <= 12%, double polished, packed in 25kg PP bags for bulk export.",
    targetPrice: 85000,
    quantity: 50,
    unit: "MT",
    deliveryLocation: "Kandla Port, Gujarat",
  },
  {
    title: "10 KL Cold Pressed Groundnut Oil",
    description: "Pure cold-pressed groundnut oil, FFA <= 0.8%, food grade packed in IBC containers or 15L tin packs with lab analysis report.",
    targetPrice: 160000,
    quantity: 10,
    unit: "KL",
    deliveryLocation: "Hyderabad, Telangana",
  },
  {
    title: "5 MT Organic Salem Turmeric Finger",
    description: "Curcumin content >= 3.5%, double polished, unadulterated with certified pesticide-free lab testing.",
    targetPrice: 140000,
    quantity: 5,
    unit: "MT",
    deliveryLocation: "Mumbai, Maharashtra",
  },
  {
    title: "500 Quintal Sharbati Wheat Grain",
    description: "Golden premium Sharbati wheat, high protein (>13%), cleaned and sorted, packed in standard 50kg jute bags.",
    targetPrice: 3200,
    quantity: 500,
    unit: "Quintal",
    deliveryLocation: "Bhopal, Madhya Pradesh",
  },
  {
    title: "Need 1000kg of Brown Rice",
    description: "Looking for high-quality organic brown rice, vacuum packed in 10kg bags, delivery to warehouse.",
    targetPrice: 55,
    quantity: 1000,
    unit: "kg",
    deliveryLocation: "Bengaluru, Karnataka",
  },
];

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "border-[#E2E8F0] bg-[#F8FAFD] text-[#6B7B94]" },
  submitted: { label: "Submitted", className: "border-amber-200 bg-amber-50 text-amber-800" },
  open: { label: "Open for Bids", className: "border-amber-200 bg-amber-50 text-amber-800" },
  responded: { label: "Quotes Received", className: "border-blue-200 bg-blue-50 text-blue-800" },
  quoted: { label: "Quotes Received", className: "border-blue-200 bg-blue-50 text-blue-800" },
  accepted: { label: "Quote Accepted", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  rejected: { label: "Rejected", className: "border-red-200 bg-red-50 text-red-800" },
  closed: { label: "Closed", className: "border-slate-200 bg-slate-100 text-slate-700" },
  expired: { label: "Expired", className: "border-[#E2E8F0] bg-[#F8FAFD] text-[#6B7B94]" },
};

const formatDate = (value?: string) => {
  if (!value) return "Recently";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Recently"
    : new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
};

export function RFQPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const session = useAuthStore((state) => state.session);
  const openAuthModal = useAuthStore((state) => state.openAuthModal);
  const isAuthenticated = Boolean(session?.accessToken);

  const initialTab = searchParams.get("tab") === "list" ? "list" : "create";
  const [activeTab, setActiveTab] = useState<"create" | "list">(initialTab);

  // Form states
  const defaultTitle = searchParams.get("title") || searchParams.get("product") || "";
  const defaultCategory = searchParams.get("category") || "";

  const [title, setTitle] = useState(defaultTitle ? `Need ${defaultTitle}` : "");
  const [description, setDescription] = useState(
    defaultCategory ? `Looking for premium quality ${defaultTitle || defaultCategory}. FSSAI/APEDA compliant.` : ""
  );
  const [quantity, setQuantity] = useState<number | string>(500);
  const [unit, setUnit] = useState("kg");
  const [targetPrice, setTargetPrice] = useState<number | string>(45);
  const [requiredByDate, setRequiredByDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]
  );
  const [deliveryLocation, setDeliveryLocation] = useState("");

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<RFQ | null>(null);

  // List states
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [isListLoading, setIsListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedRfqIds, setExpandedRfqIds] = useState<Record<string, boolean>>({});

  // Accept quote states
  const [confirmAcceptModal, setConfirmAcceptModal] = useState<{ rfq: RFQ; quote?: Quote } | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptedContact, setAcceptedContact] = useState<{
    rfqId: string;
    name?: string;
    company?: string;
    email?: string;
    phone?: string;
  } | null>(null);

  // Load RFQs when authenticated
  const loadRFQs = useCallback(
    async (targetPage = 0, silent = false) => {
      if (!session?.accessToken) {
        setRfqs([]);
        setIsListLoading(false);
        return;
      }

      if (!silent) setIsListLoading(true);
      setListError(null);

      try {
        const data = await rfqApi.getRFQsPaginated(
          targetPage,
          pageSize,
          statusFilter !== "all" && statusFilter !== "with_quotes" ? statusFilter : undefined
        );
        setRfqs(data.rfqs || []);
        setTotalPages(Math.max(data.totalPages || 1, 1));
        setTotalElements(data.totalElements || data.rfqs?.length || 0);
        setPage(data.currentPage || targetPage);

        // Auto expand RFQs that already have quotes
        const initialExpanded: Record<string, boolean> = {};
        data.rfqs?.forEach((r) => {
          if (r.quotes && r.quotes.length > 0) {
            initialExpanded[r.id] = true;
          }
        });
        setExpandedRfqIds((prev) => ({ ...initialExpanded, ...prev }));
      } catch (err: any) {
        console.error("Failed to load RFQs", err);
        setListError("Unable to load RFQs at the moment. Please try again.");
      } finally {
        setIsListLoading(false);
      }
    },
    [session?.accessToken, pageSize, statusFilter]
  );

  useEffect(() => {
    if (isAuthenticated) {
      void loadRFQs(0);
    }
  }, [isAuthenticated, loadRFQs]);

  const toggleExpand = (id: string) => {
    setExpandedRfqIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const applyTemplate = (tpl: (typeof SAMPLE_TEMPLATES)[0]) => {
    setTitle(tpl.title);
    setDescription(tpl.description);
    setQuantity(tpl.quantity);
    setUnit(tpl.unit);
    setTargetPrice(tpl.targetPrice);
    setDeliveryLocation(tpl.deliveryLocation);
    setFormErrors({});
    toast.success(`Applied template: "${tpl.title.slice(0, 30)}..."`);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!title.trim() || title.trim().length < 3) {
      errors.title = "Requirement title must be at least 3 characters";
    }
    if (!description.trim() || description.trim().length < 5) {
      errors.description = "Please provide requirement specifications (at least 5 characters)";
    }
    const numQty = Number(quantity);
    if (!quantity || Number.isNaN(numQty) || numQty <= 0) {
      errors.quantity = "Please enter a valid quantity greater than zero";
    }
    if (!deliveryLocation.trim() || deliveryLocation.trim().length < 2) {
      errors.deliveryLocation = "Please specify delivery location (e.g. City, State)";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Prefer Zustand session; fall back to localStorage in case React hasn't re-rendered
    // after writeStoredSession fired SESSION_UPDATED_EVENT (race-condition guard)
    const activeToken =
      session?.accessToken ||
      (typeof window !== 'undefined'
        ? localStorage.getItem('accessToken') || localStorage.getItem('kfpcl_token')
        : null);
    if (!activeToken || activeToken === 'undefined' || activeToken === 'null') {
      toast.info("Please sign in to broadcast your RFQ to verified suppliers.");
      openAuthModal();
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await rfqApi.createRFQ({
        title: title.trim(),
        description: description.trim(),
        quantity: Number(quantity),
        unit,
        targetPrice: targetPrice ? Number(targetPrice) : undefined,
        requiredByDate,
        deliveryLocation: deliveryLocation.trim(),
      });

      setSubmitSuccess(created);
      setRfqs((prev) => [created, ...prev]);
      setTotalElements((prev) => prev + 1);
      toast.success("Quotation request broadcasted successfully!");
    } catch (err: any) {
      console.error("Failed to submit RFQ", err);
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message;
      toast.error(serverMsg || "Failed to submit your RFQ. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptQuote = async () => {
    if (!confirmAcceptModal) return;
    const { rfq, quote } = confirmAcceptModal;

    setIsAccepting(true);
    try {
      const updatedRfq = await rfqApi.acceptQuote(rfq.id, quote?.id);
      toast.success("Quotation accepted! Supplier contact details are now available.");

      // If contact returned, show contact info
      if (updatedRfq.contact) {
        setAcceptedContact({
          rfqId: rfq.id,
          name: updatedRfq.contact.name || quote?.sellerName,
          company: updatedRfq.contact.company || quote?.sellerCompany,
          email: updatedRfq.contact.email,
          phone: updatedRfq.contact.phone,
        });
      }

      setRfqs((prev) =>
        prev.map((item) =>
          item.id === rfq.id
            ? {
                ...item,
                status: "accepted",
                contact: updatedRfq.contact || item.contact,
                quotes: item.quotes?.map((q) =>
                  q.id === quote?.id ? { ...q, status: "accepted" } : q
                ),
              }
            : item
        )
      );
      setConfirmAcceptModal(null);
    } catch (err: any) {
      console.error("Failed to accept quotation", err);
      toast.error(err?.response?.data?.message || "Could not accept quotation. Please try again.");
    } finally {
      setIsAccepting(false);
    }
  };

  const filteredRfqs = useMemo(() => {
    return rfqs.filter((item) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const statusNorm = (item.status || "").toLowerCase();
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "with_quotes"
          ? item.quotes && item.quotes.length > 0
          : statusFilter === "accepted"
          ? statusNorm === "accepted"
          : statusFilter === "open"
          ? statusNorm === "open" || statusNorm === "submitted"
          : true;

      return matchesSearch && matchesStatus;
    });
  }, [rfqs, searchQuery, statusFilter]);

  return (
    <div className="app-shell pb-16">
      {/* ── HERO BANNER ── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.8rem] border border-white/10 bg-[#0A4D3C] px-6 py-10 text-white shadow-[0_30px_70px_rgba(10,77,60,0.15)] sm:px-10 mb-8"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(212,168,83,0.18),transparent_50%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.06),transparent_40%)] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#D4A853] hover:text-white transition-colors mb-3 group"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
              Back to Store
            </Link>
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-[#D4A853] backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-[#D4A853]" />
                Direct Commodity Sourcing
              </div>
            </div>
            <h1 className="mt-4 font-sans font-bold text-[clamp(2rem,5vw,3.6rem)] leading-[1.08] text-white">
              Request for Quotation (RFQ)
            </h1>
            <p className="mt-3 max-w-2xl text-sm sm:text-base leading-7 text-white/80">
              Broadcast your bulk procurement specifications to verified farmer producer companies (FPOs) and suppliers across India to get competitive bids.
            </p>
          </div>

          {/* Tab selector */}
          <div className="inline-flex p-1.5 bg-black/25 rounded-2xl border border-white/10 backdrop-blur-md self-start md:self-auto flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab("create");
                setSearchParams({}, { replace: true });
              }}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 ${
                activeTab === "create"
                  ? "bg-[#D4A853] text-[#0A4D3C] shadow-lg scale-102"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <PlusCircle className="h-4 w-4" />
              Create RFQ
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("list");
                setSearchParams({ tab: "list" }, { replace: true });
              }}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 ${
                activeTab === "list"
                  ? "bg-[#D4A853] text-[#0A4D3C] shadow-lg scale-102"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <Layers className="h-4 w-4" />
              My RFQs &amp; Quotes {totalElements > 0 ? `(${totalElements})` : ""}
            </button>
          </div>
        </div>
      </motion.section>

      {/* ── TAB 1: CREATE RFQ ── */}
      {activeTab === "create" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          {submitSuccess ? (
            /* Celebration Card */
            <div className="rounded-[2.4rem] border border-[#E2E8F0] bg-white p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-[0_20px_60px_rgba(10,77,60,0.08)]">
              <div className="h-20 w-20 rounded-3xl bg-[#F2F8F5] text-[#0A4D3C] flex items-center justify-center mx-auto mb-5 shadow-sm border border-[#C2E0D4]">
                <CheckCircle2 className="h-10 w-10 text-[#0A4D3C]" />
              </div>
              <span className="inline-flex rounded-full border border-[#C2E0D4] bg-[#F2F8F5] px-3.5 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#0A4D3C] mb-3">
                RFQ Active
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold font-sans text-[#0A1628] mb-3">
                Quotation Request Broadcasted!
              </h2>
              <p className="text-sm text-[#6B7B94] mb-8 max-w-lg mx-auto leading-relaxed">
                Your RFQ <strong className="text-[#0A1628]">&quot;{submitSuccess.title}&quot;</strong> has been published. Verified suppliers and farmer producer groups have been alerted and will send competitive price quotes to your RFQ dashboard.
              </p>

              <div className="p-5 rounded-2xl bg-[#F8FAFD] border border-[#E2E8F0] text-left text-xs text-[#0A1628] space-y-2.5 mb-8 max-w-md mx-auto">
                <div className="flex justify-between">
                  <span className="text-[#6B7B94]">Target Volume:</span>
                  <span className="font-bold">{submitSuccess.quantity} {submitSuccess.unit}</span>
                </div>
                {submitSuccess.targetPrice ? (
                  <div className="flex justify-between">
                    <span className="text-[#6B7B94]">Target Price:</span>
                    <span className="font-bold text-[#0A4D3C]">
                      ₹{submitSuccess.targetPrice.toLocaleString("en-IN")}/{submitSuccess.unit}
                    </span>
                  </div>
                ) : null}
                {submitSuccess.requiredByDate ? (
                  <div className="flex justify-between">
                    <span className="text-[#6B7B94]">Required By:</span>
                    <span className="font-bold">{formatDate(submitSuccess.requiredByDate)}</span>
                  </div>
                ) : null}
                {submitSuccess.deliveryLocation ? (
                  <div className="flex justify-between gap-4">
                    <span className="text-[#6B7B94]">Destination:</span>
                    <span className="font-bold text-right">{submitSuccess.deliveryLocation}</span>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setSubmitSuccess(null);
                    setTitle("");
                    setDescription("");
                    setQuantity(500);
                    setUnit("kg");
                    setTargetPrice(45);
                    setDeliveryLocation("");
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#0A4D3C] px-6 py-3 text-sm font-bold text-[#0A4D3C] hover:bg-[#F4F7F5] transition-all"
                >
                  <PlusCircle className="h-4 w-4" />
                  Submit Another RFQ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitSuccess(null);
                    setActiveTab("list");
                    setSearchParams({ tab: "list" }, { replace: true });
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0A4D3C] hover:bg-[#D4A853] hover:text-[#0A4D3C] px-6 py-3 text-sm font-bold text-white shadow-lg transition-all duration-300"
                >
                  <Layers className="h-4 w-4" />
                  View RFQs &amp; Quotes
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Form Column */}
              <div className="lg:col-span-7 space-y-6">
                <div className="rounded-[2.4rem] border border-[#E2E8F0]/80 bg-white p-6 sm:p-8 shadow-[0_20px_50px_rgba(10,22,40,0.04)]">
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-xl font-bold font-sans text-[#0A1628]">
                        Create a Request for Quotation
                      </h2>
                      <p className="text-xs text-[#6B7B94] mt-1">
                        Specify desired volume, pricing threshold, quality parameters, and delivery timeline.
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-800 flex-shrink-0">
                      Direct to Suppliers
                    </span>
                  </div>

                  {/* Auth reminder banner if not logged in */}
                  {!isAuthenticated && (
                    <div className="mb-6 p-4 rounded-2xl bg-[#FCF8F0] border border-[#F0E6D2] text-xs text-[#8A6714] flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-[#D4A853] flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-bold text-[#6D4F06]">Authentication Recommended</p>
                        <p className="mt-0.5 text-[#8A6714]">
                          You can prepare your requirement below. Sign in with mobile OTP to broadcast your RFQ and receive bids directly to your dashboard.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={openAuthModal}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#0A4D3C] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#D4A853] hover:text-[#0A4D3C] transition-all flex-shrink-0"
                      >
                        <LogIn className="h-3.5 w-3.5" />
                        Sign In
                      </button>
                    </div>
                  )}

                  {/* Quick Templates */}
                  <div className="mb-6">
                    <label className="text-xs font-bold uppercase tracking-[0.18em] text-[#6B7B94] block mb-2.5 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-[#0A4D3C]" />
                      Quick Commodity Templates
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {SAMPLE_TEMPLATES.map((tpl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => applyTemplate(tpl)}
                          className="text-xs py-2 px-3.5 rounded-full bg-[#F4F7F5] hover:bg-[#E6F4F0] hover:text-[#0A4D3C] border border-[#E2E8F0] hover:border-[#0A4D3C]/30 text-[#3A4D6B] font-semibold transition-all flex items-center gap-1.5"
                        >
                          <Tag className="h-3 w-3 text-[#0A4D3C]" />
                          {tpl.title.length > 32 ? `${tpl.title.slice(0, 32)}...` : tpl.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* The Form */}
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Requirement Title */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-[0.16em] text-[#0A1628] mb-1.5">
                        Requirement Title *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 50 MT APEDA Certified Basmati Rice 1121"
                        value={title}
                        onChange={(e) => {
                          setTitle(e.target.value);
                          if (formErrors.title) setFormErrors((prev) => ({ ...prev, title: "" }));
                        }}
                        className={`w-full rounded-2xl border px-4 py-3 text-sm transition-all outline-none ${
                          formErrors.title
                            ? "border-red-400 bg-red-50/20 focus:border-red-500"
                            : "border-[#E2E8F0] bg-white focus:border-[#0A4D3C] focus:ring-2 focus:ring-[#0A4D3C]/10"
                        }`}
                      />
                      {formErrors.title && <p className="text-xs text-red-600 mt-1 font-medium">{formErrors.title}</p>}
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-[0.16em] text-[#0A1628] mb-1.5">
                        Description &amp; Specifications *
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Specify grade, moisture limit, packaging requirement (e.g. 25kg PP bags), certifications (FSSAI/APEDA)..."
                        value={description}
                        onChange={(e) => {
                          setDescription(e.target.value);
                          if (formErrors.description) setFormErrors((prev) => ({ ...prev, description: "" }));
                        }}
                        className={`w-full rounded-2xl border px-4 py-3 text-sm transition-all outline-none resize-none ${
                          formErrors.description
                            ? "border-red-400 bg-red-50/20 focus:border-red-500"
                            : "border-[#E2E8F0] bg-white focus:border-[#0A4D3C] focus:ring-2 focus:ring-[#0A4D3C]/10"
                        }`}
                      />
                      {formErrors.description && (
                        <p className="text-xs text-red-600 mt-1 font-medium">{formErrors.description}</p>
                      )}
                    </div>

                    {/* Quantity & Unit */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-[0.16em] text-[#0A1628] mb-1.5">
                          Target Quantity *
                        </label>
                        <input
                          type="number"
                          step="any"
                          placeholder="500"
                          value={quantity}
                          onChange={(e) => {
                            setQuantity(e.target.value);
                            if (formErrors.quantity) setFormErrors((prev) => ({ ...prev, quantity: "" }));
                          }}
                          className={`w-full rounded-2xl border px-4 py-3 text-sm transition-all outline-none ${
                            formErrors.quantity
                              ? "border-red-400 bg-red-50/20 focus:border-red-500"
                              : "border-[#E2E8F0] bg-white focus:border-[#0A4D3C] focus:ring-2 focus:ring-[#0A4D3C]/10"
                          }`}
                        />
                        {formErrors.quantity && (
                          <p className="text-xs text-red-600 mt-1 font-medium">{formErrors.quantity}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-[0.16em] text-[#0A1628] mb-1.5">
                          Unit of Measurement *
                        </label>
                        <select
                          value={unit}
                          onChange={(e) => setUnit(e.target.value)}
                          className="w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm transition-all outline-none focus:border-[#0A4D3C] focus:ring-2 focus:ring-[#0A4D3C]/10 font-medium"
                        >
                          <option value="kg">kg (Kilograms)</option>
                          <option value="MT">MT (Metric Tons)</option>
                          <option value="Quintal">Quintal (100 kg)</option>
                          <option value="Tons">Tons</option>
                          <option value="KL">KL (Kiloliters)</option>
                          <option value="L">L (Liters)</option>
                          <option value="Bags">Bags (25kg / 50kg)</option>
                          <option value="Cases">Cases / Cartons</option>
                          <option value="Pieces">Pieces / Units</option>
                        </select>
                      </div>
                    </div>

                    {/* Target Price & Required By Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-[0.16em] text-[#0A1628] mb-1.5">
                          Target Price (₹ per unit) <span className="text-[#6B7B94] font-normal">(optional)</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#6B7B94]">
                            ₹
                          </span>
                          <input
                            type="number"
                            step="any"
                            placeholder="45.0"
                            value={targetPrice}
                            onChange={(e) => setTargetPrice(e.target.value)}
                            className="w-full rounded-2xl border border-[#E2E8F0] bg-white pl-8 pr-4 py-3 text-sm transition-all outline-none focus:border-[#0A4D3C] focus:ring-2 focus:ring-[#0A4D3C]/10"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-[0.16em] text-[#0A1628] mb-1.5">
                          Required By Date *
                        </label>
                        <input
                          type="date"
                          value={requiredByDate}
                          onChange={(e) => setRequiredByDate(e.target.value)}
                          className="w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm transition-all outline-none focus:border-[#0A4D3C] focus:ring-2 focus:ring-[#0A4D3C]/10 font-medium"
                        />
                      </div>
                    </div>

                    {/* Delivery Location */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-[0.16em] text-[#0A1628] mb-1.5">
                        Delivery Destination / Port *
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7B94] pointer-events-none" />
                        <input
                          type="text"
                          placeholder="e.g. Mumbai Port, Maharashtra, India"
                          value={deliveryLocation}
                          onChange={(e) => {
                            setDeliveryLocation(e.target.value);
                            if (formErrors.deliveryLocation) {
                              setFormErrors((prev) => ({ ...prev, deliveryLocation: "" }));
                            }
                          }}
                          className={`w-full rounded-2xl border pl-11 pr-4 py-3 text-sm transition-all outline-none ${
                            formErrors.deliveryLocation
                              ? "border-red-400 bg-red-50/20 focus:border-red-500"
                              : "border-[#E2E8F0] bg-white focus:border-[#0A4D3C] focus:ring-2 focus:ring-[#0A4D3C]/10"
                          }`}
                        />
                      </div>
                      {formErrors.deliveryLocation && (
                        <p className="text-xs text-red-600 mt-1 font-medium">{formErrors.deliveryLocation}</p>
                      )}
                    </div>

                    {/* Submit Button */}
                    <div className="pt-3">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#0A4D3C] hover:bg-[#D4A853] hover:text-[#0A4D3C] py-4 text-sm font-bold text-white shadow-[0_10px_30px_rgba(10,77,60,0.18)] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 cursor-pointer"
                      >
                        {isSubmitting ? (
                          <>
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                            Broadcasting RFQ to Verified Suppliers...
                          </>
                        ) : (
                          <>
                            <FileText className="h-4 w-4" />
                            Broadcast RFQ to Suppliers
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Sidebar Info Column */}
              <div className="lg:col-span-5 space-y-6">
                {/* How RFQ workflow functions */}
                <div className="rounded-[2.4rem] border border-[#E2E8F0]/80 bg-[linear-gradient(135deg,#0A4D3C,#1B5D4C)] p-6 sm:p-7 text-white shadow-[0_20px_50px_rgba(10,77,60,0.12)] relative overflow-hidden">
                  <div className="absolute top-0 right-0 h-40 w-40 bg-[radial-gradient(circle_at_center,rgba(212,168,83,0.15),transparent_60%)] pointer-events-none" />
                  <div className="relative z-10">
                    <h3 className="font-sans font-bold text-xl text-white mb-2 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-[#D4A853]" />
                      How KFPCL RFQ Works
                    </h3>
                    <p className="text-xs text-white/80 mb-6 leading-relaxed">
                      Connect with trusted farmer producer companies and exporters across India with transparent pricing and verified quality.
                    </p>

                    <div className="space-y-4">
                      {[
                        {
                          step: "1",
                          title: "Create Your RFQ",
                          desc: "Publish your desired commodity, target volume, and delivery destination.",
                        },
                        {
                          step: "2",
                          title: "Suppliers Quote Bids",
                          desc: "Verified FPOs and producers submit competitive price quotations and dispatch timelines.",
                        },
                        {
                          step: "3",
                          title: "Review & Accept",
                          desc: "Compare quotes, review seller terms, and accept the best quotation with 1 click.",
                        },
                        {
                          step: "4",
                          title: "Escrow & Fulfilment",
                          desc: "Seamless dispatch with quality test certification and secure transaction protection.",
                        },
                      ].map((item) => (
                        <div key={item.step} className="flex items-start gap-3">
                          <div className="h-7 w-7 rounded-full bg-[#D4A853]/20 border border-[#D4A853]/40 text-[#D4A853] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                            {item.step}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">{item.title}</p>
                            <p className="text-[11px] text-white/70 mt-0.5 leading-normal">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Verified Trade Guarantee */}
                <div className="rounded-[2.4rem] border border-[#E2E8F0]/80 bg-white p-6 shadow-[0_20px_50px_rgba(10,22,40,0.04)]">
                  <h4 className="font-bold text-sm text-[#0A1628] mb-4 flex items-center gap-2">
                    <Building className="h-4 w-4 text-[#0A4D3C]" />
                    Verified Trade Guarantee
                  </h4>
                  <ul className="text-xs text-[#6B7B94] space-y-3">
                    <li className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span>Direct FPO &amp; producer pricing without intermediary markups</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span>FSSAI, APEDA, and ISO quality test certificate validation</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span>Custom export packaging, palletization, and bulk freight logistics support</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ── TAB 2: MY RFQS & QUOTES ── */}
      {activeTab === "list" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {!isAuthenticated ? (
            /* Unauthenticated state for My RFQs */
            <div className="rounded-[2.4rem] border border-[#E2E8F0] bg-white p-8 sm:p-12 text-center max-w-xl mx-auto shadow-[0_20px_50px_rgba(10,22,40,0.04)]">
              <div className="h-16 w-16 rounded-3xl bg-[#F4F7F5] text-[#0A4D3C] flex items-center justify-center mx-auto mb-4 border border-[#E2E8F0]">
                <Layers className="h-8 w-8 text-[#0A4D3C]" />
              </div>
              <h3 className="text-xl font-bold font-sans text-[#0A1628] mb-2">
                Sign in to view your RFQs
              </h3>
              <p className="text-xs text-[#6B7B94] mb-6 max-w-sm mx-auto leading-relaxed">
                Log in to track quotation requests, review bids from verified suppliers, negotiate pricing, and accept offers.
              </p>
              <button
                type="button"
                onClick={openAuthModal}
                className="inline-flex items-center gap-2 rounded-full bg-[#0A4D3C] hover:bg-[#D4A853] hover:text-[#0A4D3C] px-6 py-3 text-sm font-bold text-white shadow-lg transition-all duration-300"
              >
                <LogIn className="h-4 w-4" />
                Sign in with OTP
              </button>
            </div>
          ) : (
            <>
              {/* Filter Toolbar */}
              <div className="rounded-[2rem] border border-[#E2E8F0]/80 bg-white p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_16px_36px_rgba(10,77,60,0.03)]">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="h-4 w-4 text-[#6B7B94] absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search your RFQs by title or commodity..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 text-xs sm:text-sm rounded-full border border-[#E2E8F0] bg-[#F8FAFD] focus:bg-white focus:outline-none focus:border-[#0A4D3C] transition-all"
                  />
                </div>

                {/* Status filter & Refresh */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <ListFilter className="h-4 w-4 text-[#6B7B94]" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="text-xs font-semibold rounded-full border border-[#E2E8F0] bg-[#F8FAFD] px-4 py-2.5 text-[#0A1628] focus:outline-none focus:border-[#0A4D3C]"
                    >
                      <option value="all">All Statuses</option>
                      <option value="with_quotes">Quotes Received</option>
                      <option value="open">Open / Submitted</option>
                      <option value="accepted">Accepted Deals</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => void loadRFQs(page, true)}
                    disabled={isListLoading}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#0A4D3C]/20 px-4 py-2 text-xs font-semibold text-[#0A4D3C] hover:bg-[#F4F7F5] disabled:opacity-60 transition-all"
                  >
                    <RefreshCcw className={`h-3.5 w-3.5 ${isListLoading ? "animate-spin" : ""}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* List Content */}
              {isListLoading && rfqs.length === 0 ? (
                <div className="rounded-[2.4rem] border border-[#E2E8F0] bg-white p-12 text-center flex flex-col items-center justify-center gap-3">
                  <LoaderCircle className="h-8 w-8 text-[#0A4D3C] animate-spin" />
                  <p className="text-sm font-medium text-[#6B7B94]">Loading your RFQ list...</p>
                </div>
              ) : listError && rfqs.length === 0 ? (
                <div className="rounded-[2.4rem] border border-red-200 bg-red-50/40 p-10 text-center">
                  <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <p className="text-sm text-[#0A1628] font-medium">{listError}</p>
                  <button
                    type="button"
                    onClick={() => void loadRFQs(0)}
                    className="inline-flex items-center gap-2 rounded-full bg-[#0A4D3C] px-5 py-2.5 text-xs font-bold text-white mt-4 hover:bg-[#D4A853] hover:text-[#0A4D3C] transition-all"
                  >
                    Retry Loading
                  </button>
                </div>
              ) : filteredRfqs.length === 0 ? (
                <div className="rounded-[2.4rem] border border-[#E2E8F0] bg-white p-12 text-center flex flex-col items-center justify-center">
                  <div className="h-16 w-16 rounded-3xl bg-[#F4F7F5] text-[#0A4D3C] flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-bold text-[#0A1628] mb-1">No RFQs Found</h3>
                  <p className="text-xs text-[#6B7B94] max-w-sm mb-6">
                    {searchQuery || statusFilter !== "all"
                      ? "No quotation requests match your active search filters."
                      : "You have not broadcasted any Request for Quotation yet."}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                      setActiveTab("create");
                      setSearchParams({}, { replace: true });
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-[#0A4D3C] hover:bg-[#D4A853] hover:text-[#0A4D3C] px-6 py-3 text-xs font-bold text-white shadow-md transition-all duration-300"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Create Your First RFQ
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredRfqs.map((rfq) => {
                    const isExpanded = expandedRfqIds[rfq.id] ?? false;
                    const quotesCount = rfq.quotes?.length || 0;
                    const statusKey = (rfq.status || "submitted").toLowerCase();
                    const badge = STATUS_BADGES[statusKey] || {
                      label: rfq.status,
                      className: "border-[#E2E8F0] bg-[#F8FAFD] text-[#6B7B94]",
                    };

                    return (
                      <div
                        key={rfq.id}
                        className="rounded-[2rem] border border-[#E2E8F0] bg-white overflow-hidden shadow-[0_14px_32px_rgba(10,77,60,0.03)] hover:border-[#0A4D3C]/30 transition-all duration-300"
                      >
                        {/* RFQ Header Header */}
                        <div className="p-5 sm:p-6">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${badge.className}`}>
                                  {badge.label}
                                </span>
                                <span className="text-xs text-[#6B7B94] flex items-center gap-1 font-medium">
                                  <Clock className="h-3.5 w-3.5" />
                                  Created {formatDate(rfq.createdAt)}
                                </span>
                                {quotesCount > 0 && (
                                  <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                                    {quotesCount} Quote{quotesCount === 1 ? "" : "s"} Received
                                  </span>
                                )}
                              </div>

                              <h3 className="text-lg font-bold font-sans text-[#0A1628] leading-tight">
                                {rfq.title}
                              </h3>
                              <p className="text-xs sm:text-sm text-[#6B7B94] leading-relaxed line-clamp-2">
                                {rfq.description}
                              </p>
                            </div>

                            {/* Key parameters pill */}
                            <div className="flex sm:flex-col items-end sm:items-end justify-between sm:justify-start gap-2 flex-shrink-0 bg-[#F8FAFD] p-3 rounded-2xl border border-[#E2E8F0]">
                              <div className="text-right">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B7B94] block">
                                  Volume
                                </span>
                                <span className="text-sm font-bold text-[#0A1628]">
                                  {rfq.quantity} {rfq.unit}
                                </span>
                              </div>
                              {rfq.targetPrice ? (
                                <div className="text-right">
                                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B7B94] block">
                                    Target
                                  </span>
                                  <span className="text-xs font-bold text-[#0A4D3C]">
                                    ₹{rfq.targetPrice.toLocaleString("en-IN")}/{rfq.unit}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          {/* Meta bar */}
                          <div className="mt-4 pt-4 border-t border-[#F0F4F2] flex flex-wrap items-center justify-between gap-3 text-xs text-[#6B7B94]">
                            <div className="flex flex-wrap items-center gap-4">
                              {rfq.deliveryLocation && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5 text-[#0A4D3C]" />
                                  {rfq.deliveryLocation}
                                </span>
                              )}
                              {rfq.requiredByDate && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5 text-[#D4A853]" />
                                  Required by: {formatDate(rfq.requiredByDate)}
                                </span>
                              )}
                            </div>

                            {quotesCount > 0 && (
                              <button
                                type="button"
                                onClick={() => toggleExpand(rfq.id)}
                                className="inline-flex items-center gap-1.5 font-bold text-xs text-[#0A4D3C] hover:text-[#D4A853] transition-colors"
                              >
                                {isExpanded ? (
                                  <>
                                    Hide Quotes <ChevronUp className="h-4 w-4" />
                                  </>
                                ) : (
                                  <>
                                    View {quotesCount} Quote{quotesCount === 1 ? "" : "s"} <ChevronDown className="h-4 w-4" />
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Expandable Quotes Accordion */}
                        {isExpanded && quotesCount > 0 && (
                          <div className="bg-[#F8FAFD] border-t border-[#E2E8F0] p-5 sm:p-6 space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-[#0A1628]">
                                Received Quotations ({quotesCount})
                              </h4>
                              <span className="text-[11px] text-[#6B7B94]">
                                Accept the best bid to reveal full supplier credentials
                              </span>
                            </div>

                            <div className="space-y-3">
                              {rfq.quotes?.map((quote) => {
                                const isAccepted = (quote.status || "").toLowerCase() === "accepted";
                                const unitPrice = quote.unitPrice || quote.offeredPrice || quote.amount || 0;
                                const totalPrice = quote.totalPrice || unitPrice * Number(rfq.quantity || 1);

                                return (
                                  <div
                                    key={quote.id}
                                    className={`rounded-2xl border p-4 sm:p-5 transition-all ${
                                      isAccepted
                                        ? "border-emerald-300 bg-emerald-50/50 shadow-sm"
                                        : "border-[#E2E8F0] bg-white hover:border-[#0A4D3C]/30 shadow-xs"
                                    }`}
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <div className="h-7 w-7 rounded-full bg-[#0A4D3C]/10 text-[#0A4D3C] font-bold text-xs flex items-center justify-center">
                                            <Building className="h-3.5 w-3.5" />
                                          </div>
                                          <span className="font-bold text-sm text-[#0A1628]">
                                            {quote.sellerCompany || quote.sellerName || "Verified Producer Company"}
                                          </span>
                                          {isAccepted && (
                                            <span className="inline-flex rounded-full bg-emerald-600 text-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                              Accepted
                                            </span>
                                          )}
                                        </div>

                                        {quote.notes && (
                                          <p className="text-xs text-[#6B7B94] pl-9 italic">
                                            &ldquo;{quote.notes}&rdquo;
                                          </p>
                                        )}

                                        <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B7B94] pl-9 pt-1">
                                          {quote.deliveryDate && (
                                            <span>Est. Delivery: {formatDate(quote.deliveryDate)}</span>
                                          )}
                                          {quote.leadTime && <span>Lead time: {quote.leadTime}</span>}
                                        </div>
                                      </div>

                                      {/* Pricing & Actions */}
                                      <div className="flex items-center gap-4 self-end sm:self-center pl-9 sm:pl-0">
                                        <div className="text-right">
                                          <span className="text-xs text-[#6B7B94] block">Offered Unit Price</span>
                                          <span className="text-base font-bold text-[#0A4D3C]">
                                            ₹{unitPrice.toLocaleString("en-IN")}/{rfq.unit}
                                          </span>
                                          {totalPrice > 0 && (
                                            <span className="text-[10px] text-[#6B7B94] block">
                                              Total: ₹{totalPrice.toLocaleString("en-IN")}
                                            </span>
                                          )}
                                        </div>

                                        {!isAccepted && statusKey !== "accepted" && (
                                          <button
                                            type="button"
                                            onClick={() => setConfirmAcceptModal({ rfq, quote })}
                                            className="inline-flex items-center gap-1.5 rounded-full bg-[#0A4D3C] hover:bg-[#D4A853] hover:text-[#0A4D3C] px-4 py-2 text-xs font-bold text-white shadow-sm transition-all duration-300"
                                          >
                                            <Check className="h-3.5 w-3.5" />
                                            Accept Quote
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </motion.div>
      )}

      {/* ── ACCEPT QUOTE CONFIRMATION MODAL ── */}
      {confirmAcceptModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0A1628]/60 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setConfirmAcceptModal(null)}
        >
          <div
            className="w-full max-w-md rounded-[2.2rem] border border-[#E2E8F0] bg-white p-6 sm:p-7 shadow-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-12 w-12 rounded-2xl bg-[#F2F8F5] text-[#0A4D3C] flex items-center justify-center mx-auto mb-4 border border-[#C2E0D4]">
              <CheckCircle2 className="h-6 w-6 text-[#0A4D3C]" />
            </div>

            <h3 className="text-lg font-bold font-sans text-center text-[#0A1628] mb-1">
              Accept This Quotation?
            </h3>
            <p className="text-xs text-[#6B7B94] text-center mb-5 leading-relaxed">
              Confirming this bid will finalize supplier selection for &ldquo;{confirmAcceptModal.rfq.title}&rdquo; and reveal complete contact and order placement details.
            </p>

            {confirmAcceptModal.quote && (
              <div className="p-4 rounded-2xl bg-[#F8FAFD] border border-[#E2E8F0] text-xs space-y-2 mb-6">
                <div className="flex justify-between">
                  <span className="text-[#6B7B94]">Supplier:</span>
                  <span className="font-bold text-[#0A1628]">
                    {confirmAcceptModal.quote.sellerCompany || confirmAcceptModal.quote.sellerName || "Verified Supplier"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7B94]">Quoted Price:</span>
                  <span className="font-bold text-[#0A4D3C]">
                    ₹{(confirmAcceptModal.quote.unitPrice || confirmAcceptModal.quote.offeredPrice || 0).toLocaleString("en-IN")}/{confirmAcceptModal.rfq.unit}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmAcceptModal(null)}
                className="flex-1 rounded-full border border-[#E2E8F0] py-3 text-xs font-semibold text-[#3A4D6B] hover:bg-[#F8FAFD] transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleAcceptQuote()}
                disabled={isAccepting}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-[#0A4D3C] hover:bg-[#D4A853] hover:text-[#0A4D3C] py-3 text-xs font-bold text-white shadow-md transition-all duration-300 disabled:opacity-70"
              >
                {isAccepting ? (
                  <>
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Accepting...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" /> Confirm Accept
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
