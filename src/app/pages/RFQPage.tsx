import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router";
import {
  AlertCircle,
  ArrowLeft,
  Building,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  DollarSign,
  FileText,
  ListFilter,
  LoaderCircle,
  LogIn,
  MapPin,
  RefreshCcw,
  Search,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { rfqApi } from "@/api/rfq.api";
import { useAuthStore } from "../store/authStore";
import { useAuthStore as useLegacyAuthStore } from "@/store/authStore";
import type { RFQ, Quote } from "@/types/rfq";

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
  const session = useAuthStore((state) => state.session);
  const openAuthModal = useAuthStore((state) => state.openAuthModal);
  const hydrateFromStorage = useAuthStore((state) => state.hydrateFromStorage);
  const legacyIsAuthenticated = useLegacyAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  const isAuthenticated = Boolean(
    session?.accessToken ||
    legacyIsAuthenticated ||
    (typeof window !== "undefined" && (localStorage.getItem("accessToken") || localStorage.getItem("kfpcl_token")))
  );

  const didOpenModal = useRef(false);

  // Automatically trigger the sign-in modal on mount if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !didOpenModal.current) {
      didOpenModal.current = true;
      openAuthModal();
    }
  }, [isAuthenticated, openAuthModal]);

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

  // Load RFQs from live API
  const loadRFQs = useCallback(
    async (targetPage = 0, silent = false) => {
      const activeToken =
        session?.accessToken ||
        (typeof window !== "undefined"
          ? localStorage.getItem("accessToken") || localStorage.getItem("kfpcl_token")
          : null);
      if (!activeToken || activeToken === "undefined" || activeToken === "null") {
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

  const handleAcceptQuote = async () => {
    if (!confirmAcceptModal) return;
    const { rfq, quote } = confirmAcceptModal;

    setIsAccepting(true);
    try {
      const updatedRfq = await rfqApi.acceptQuote(rfq.id, quote?.id);
      toast.success("Quotation accepted! Supplier contact details are now available.");

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
                Buyer Procurement Portal
              </div>
            </div>
            <h1 className="mt-4 font-sans font-bold text-[clamp(2rem,5vw,3.6rem)] leading-[1.08] text-white">
              My RFQs &amp; Quotes
            </h1>
            <p className="mt-3 max-w-2xl text-sm sm:text-base leading-7 text-white/80">
              Track your submitted procurement requests, review supplier quotations, and manage accepted bids from verified Indian farmer producer companies and suppliers.
            </p>
          </div>

          {isAuthenticated && (
            <div className="flex items-center gap-3 self-start md:self-auto flex-shrink-0">
              <button
                type="button"
                onClick={() => void loadRFQs(page, false)}
                disabled={isListLoading}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-lg backdrop-blur-md transition-all disabled:opacity-60"
              >
                <RefreshCcw className={`h-4 w-4 ${isListLoading ? "animate-spin" : ""}`} />
                <span>Refresh List</span>
              </button>
            </div>
          )}
        </div>
      </motion.section>

      {/* ── MAIN CONTENT ── */}
      {!isAuthenticated ? (
        /* Unauthenticated Gate */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2.4rem] border border-[#E2E8F0] bg-white p-8 sm:p-14 text-center max-w-xl mx-auto shadow-[0_20px_50px_rgba(10,22,40,0.04)]"
        >
          <div className="h-20 w-20 rounded-3xl bg-[#F4F7F5] text-[#0A4D3C] flex items-center justify-center mx-auto mb-5 border border-[#E2E8F0] shadow-sm">
            <FileText className="h-10 w-10 text-[#0A4D3C]" />
          </div>
          <h2 className="text-2xl font-bold font-sans text-[#0A1628] mb-2">
            Sign In to View Your RFQs
          </h2>
          <p className="text-sm text-[#6B7B94] mb-8 max-w-md mx-auto leading-relaxed">
            Your submitted Requests for Quotation and supplier quotations are securely linked to your buyer account. Please sign in to view your inquiries.
          </p>
          <button
            type="button"
            onClick={openAuthModal}
            className="inline-flex items-center gap-2 rounded-full bg-[#0A4D3C] hover:bg-[#D4A853] hover:text-[#0A4D3C] px-8 py-3.5 text-sm font-bold text-white shadow-lg transition-all duration-300"
          >
            <LogIn className="h-4 w-4" />
            Sign In with OTP
          </button>
          <p className="text-xs text-[#6B7B94] mt-5">
            Don&apos;t have an account yet?{" "}
            <Link to="/register" className="font-bold text-[#0A4D3C] hover:underline">
              Register here
            </Link>
          </p>
        </motion.div>
      ) : (
        /* Authenticated: Submitted RFQs Only */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Filter Toolbar */}
          <div className="rounded-[2rem] border border-[#E2E8F0]/80 bg-white p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_16px_36px_rgba(10,77,60,0.03)]">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-[#6B7B94] absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search your RFQs by title or specifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 text-xs sm:text-sm rounded-full border border-[#E2E8F0] bg-[#F8FAFD] focus:bg-white focus:outline-none focus:border-[#0A4D3C] transition-all"
              />
            </div>

            {/* Status filter */}
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
            <div className="rounded-[2.4rem] border border-[#E2E8F0] bg-white p-14 text-center flex flex-col items-center justify-center gap-3 shadow-[0_14px_32px_rgba(10,77,60,0.03)]">
              <LoaderCircle className="h-9 w-9 text-[#0A4D3C] animate-spin" />
              <p className="text-sm font-medium text-[#6B7B94]">Loading your submitted RFQs...</p>
            </div>
          ) : listError && rfqs.length === 0 ? (
            <div className="rounded-[2.4rem] border border-red-200 bg-red-50/40 p-10 text-center shadow-[0_14px_32px_rgba(10,77,60,0.03)]">
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
            <div className="rounded-[2.4rem] border border-[#E2E8F0] bg-white p-14 text-center flex flex-col items-center justify-center shadow-[0_14px_32px_rgba(10,77,60,0.03)]">
              <div className="h-16 w-16 rounded-3xl bg-[#F4F7F5] text-[#0A4D3C] flex items-center justify-center mb-4 border border-[#E2E8F0]">
                <FileText className="h-8 w-8 text-[#0A4D3C]" />
              </div>
              <h3 className="text-lg font-bold font-sans text-[#0A1628] mb-1">
                {searchQuery || statusFilter !== "all"
                  ? "No Matching RFQs Found"
                  : "No Submitted RFQs"}
              </h3>
              <p className="text-xs sm:text-sm text-[#6B7B94] max-w-sm leading-relaxed">
                {searchQuery || statusFilter !== "all"
                  ? "No quotation requests match your active search or status filter."
                  : "You have not submitted any Requests for Quotation yet. Your submitted RFQs and supplier quotes will appear here."}
              </p>
              {(searchQuery || statusFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFD] px-4 py-2 text-xs font-semibold text-[#0A1628] hover:bg-white transition-all"
                >
                  Clear Filters
                </button>
              )}
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
                    {/* RFQ Header */}
                    <div className="p-5 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${badge.className}`}
                            >
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
                            {rfq.title || rfq.productName || "Quotation Request"}
                          </h3>
                          {rfq.description && (
                            <p className="text-xs sm:text-sm text-[#6B7B94] leading-relaxed line-clamp-2">
                              {rfq.description}
                            </p>
                          )}
                        </div>

                        {/* Volume & Target Price Pill */}
                        <div className="flex sm:flex-col items-end sm:items-end justify-between sm:justify-start gap-2 flex-shrink-0 bg-[#F8FAFD] p-3.5 rounded-2xl border border-[#E2E8F0]">
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

                        {quotesCount > 0 ? (
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
                                View {quotesCount} Quote{quotesCount === 1 ? "" : "s"}{" "}
                                <ChevronDown className="h-4 w-4" />
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-xs text-[#6B7B94] italic">Awaiting quotes</span>
                        )}
                      </div>
                    </div>

                    {/* Expandable Quotes Accordion */}
                    {isExpanded && quotesCount > 0 && (
                      <div className="bg-[#F8FAFD] border-t border-[#E2E8F0] p-5 sm:p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-[#0A1628] flex items-center gap-1.5">
                            <DollarSign className="h-4 w-4 text-[#0A4D3C]" />
                            Received Quotations ({quotesCount})
                          </h4>
                          <span className="text-[11px] text-[#6B7B94]">
                            Accept the best bid to finalize deal with seller
                          </span>
                        </div>

                        <div className="space-y-3">
                          {rfq.quotes?.map((quote) => {
                            const isAccepted = (quote.status || "").toLowerCase() === "accepted";
                            const unitPrice =
                              quote.unitPrice || quote.offeredPrice || quote.amount || 0;
                            const totalPrice =
                              quote.totalPrice || unitPrice * Number(rfq.quantity || 1);

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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 flex items-center justify-between text-xs text-[#6B7B94]">
                  <span>
                    Page <strong className="text-[#0A1628]">{page + 1}</strong> of{" "}
                    <strong className="text-[#0A1628]">{totalPages}</strong> ({totalElements} total RFQs)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void loadRFQs(page - 1)}
                      disabled={page === 0 || isListLoading}
                      className="inline-flex items-center gap-1 rounded-full border border-[#E2E8F0] px-3.5 py-1.5 font-semibold text-[#0A1628] hover:bg-[#F8FAFD] disabled:opacity-40 transition-all"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => void loadRFQs(page + 1)}
                      disabled={page + 1 >= totalPages || isListLoading}
                      className="inline-flex items-center gap-1 rounded-full border border-[#E2E8F0] px-3.5 py-1.5 font-semibold text-[#0A1628] hover:bg-[#F8FAFD] disabled:opacity-40 transition-all"
                    >
                      Next
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
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
              Confirming this bid will finalize supplier selection for &ldquo;{confirmAcceptModal.rfq.title}&rdquo; and notify the supplier.
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
