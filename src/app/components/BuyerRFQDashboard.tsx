import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Clock3, FileText, LoaderCircle, MapPin, RefreshCcw, Send, XCircle } from "lucide-react";
import { toast } from "sonner";
import { rfqApi } from "@/api/rfq.api";
import type { RFQ } from "@/types/rfq";

const PAGE_SIZE = 10;
const FILTERS = ["", "SUBMITTED", "RESPONDED", "ACCEPTED", "REJECTED", "CLOSED"] as const;

const statusStyle = (status?: string) => {
  const norm = (status || "PENDING").toUpperCase();
  switch (norm) {
    case "RESPONDED":
    case "QUOTED":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "ACCEPTED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "REJECTED":
      return "border-red-200 bg-red-50 text-red-700";
    case "CLOSED":
      return "border-slate-200 bg-slate-100 text-slate-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
};

const formatStatus = (status?: string) => {
  const normalized = (status || "PENDING").toLowerCase();
  if (normalized === "submitted" || normalized === "open" || normalized === "pending") {
    return "Pending";
  }
  if (normalized === "responded" || normalized === "quoted") {
    return "Responded";
  }
  if (normalized === "accepted") {
    return "Accepted";
  }
  if (normalized === "rejected") {
    return "Rejected";
  }
  if (normalized === "closed") {
    return "Closed";
  }
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const formatDate = (value?: string) => {
  if (!value) return "Recently";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Recently"
    : new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
};

const getRfqCode = (rfq: RFQ) => {
  if (rfq.rfqCode) return rfq.rfqCode;
  const num = Number(rfq.id);
  if (!Number.isNaN(num) && num > 0) {
    return `RFQ-2026-${String(num).padStart(6, "0")}`;
  }
  return `RFQ #${rfq.id}`;
};

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback;

interface BuyerRFQDashboardProps {
  onAdminReplyView?: (isViewing: boolean) => void;
}

export function BuyerRFQDashboard({ onAdminReplyView }: BuyerRFQDashboardProps) {
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [selectedRfq, setSelectedRfq] = useState<RFQ | null>(null);
  const [statusFilter, setStatusFilter] = useState<(typeof FILTERS)[number]>("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isDeciding, setIsDeciding] = useState(false);
  const [rejectingRfq, setRejectingRfq] = useState<RFQ | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const loadRFQs = useCallback(async (targetPage = 0, silent = false) => {
    if (!silent) setIsLoading(true);

    try {
      // Do not send a status by default. Newly created RFQs are SUBMITTED,
      // so a PENDING filter would hide them from the buyer.
      const result = await rfqApi.getRFQsPaginated(targetPage, PAGE_SIZE, statusFilter || undefined);
      setRfqs(result.rfqs);
      setPage(result.currentPage);
      setTotalPages(Math.max(result.totalPages, 1));
      setTotalElements(result.totalElements);
      if (result.rfqs.length > 0) {
        setSelectedRfq((current) => (current ? result.rfqs.find((r) => r.id === current.id) || result.rfqs[0] : result.rfqs[0]));
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load your RFQs."));
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadRFQs(0);
  }, [loadRFQs]);

  const saveRfq = (updated: RFQ) => {
    setSelectedRfq(updated);
    setRfqs((current) => current.map((rfq) => (rfq.id === updated.id ? updated : rfq)));
  };

  const openDetails = async (rfq: RFQ) => {
    setSelectedRfq(rfq);
    setIsDetailLoading(true);
    try {
      const details = await rfqApi.getRFQById(rfq.id);
      saveRfq(details);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load RFQ details."));
    } finally {
      setIsDetailLoading(false);
    }
  };

  const respondable = useMemo(() => {
    if (!selectedRfq) return false;
    const status = String(selectedRfq.status).toUpperCase();
    return status === "RESPONDED" || Boolean(selectedRfq.response || selectedRfq.quotes?.length);
  }, [selectedRfq]);

  // Notify parent whenever the selected RFQ changes so it can hide/show the tab bar
  useEffect(() => {
    if (!onAdminReplyView) return;
    if (!selectedRfq) {
      onAdminReplyView(false);
      return;
    }
    const status = String(selectedRfq.status).toUpperCase();
    const hasAdminReply =
      status === "RESPONDED" ||
      status === "QUOTED" ||
      Boolean(selectedRfq.response || selectedRfq.quotes?.length || selectedRfq.amount || selectedRfq.quotedPrice);
    onAdminReplyView(hasAdminReply);
  }, [selectedRfq, onAdminReplyView]);

  const acceptQuotation = async () => {
    if (!selectedRfq) return;
    setIsDeciding(true);
    try {
      await rfqApi.acceptQuote(selectedRfq.id);
      toast.success("Quotation accepted. Contact details are now available.");
      await openDetails({ ...selectedRfq, status: "accepted" });
      await loadRFQs(page, true);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to accept this quotation."));
    } finally {
      setIsDeciding(false);
    }
  };

  const rejectQuotation = async () => {
    if (!rejectingRfq || !rejectReason.trim()) {
      toast.error("Please provide a reason for rejecting the quotation.");
      return;
    }

    setIsDeciding(true);
    try {
      await rfqApi.rejectQuote(rejectingRfq.id, rejectReason.trim());
      toast.success("Quotation rejected.");
      setRejectingRfq(null);
      setRejectReason("");
      await openDetails({ ...rejectingRfq, status: "rejected" });
      await loadRFQs(page, true);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to reject this quotation."));
    } finally {
      setIsDeciding(false);
    }
  };

  const quotation =
    selectedRfq?.response ||
    selectedRfq?.quotes?.[0] ||
    (selectedRfq?.amount || selectedRfq?.quotedPrice || selectedRfq?.leadTime || selectedRfq?.deliveryDays
      ? {
          id: String(selectedRfq.id),
          amount: selectedRfq.amount ?? selectedRfq.quotedPrice,
          offeredPrice: selectedRfq.amount ?? selectedRfq.quotedPrice,
          unitPrice: selectedRfq.amount ?? selectedRfq.quotedPrice,
          leadTime: selectedRfq.leadTime || (selectedRfq.deliveryDays ? (String(selectedRfq.deliveryDays).includes('day') ? String(selectedRfq.deliveryDays) : `${selectedRfq.deliveryDays} days`) : undefined),
          status: selectedRfq.status,
        }
      : null);

  const quotationAmount =
    quotation?.amount ??
    quotation?.offeredPrice ??
    quotation?.unitPrice ??
    quotation?.totalPrice ??
    selectedRfq?.amount ??
    selectedRfq?.quotedPrice ??
    0;

  const quotationLeadTime =
    quotation?.leadTime ||
    selectedRfq?.leadTime ||
    ((quotation as any)?.deliveryDays ? (String((quotation as any).deliveryDays).includes('day') ? String((quotation as any).deliveryDays) : `${(quotation as any).deliveryDays} days`) : undefined) ||
    (selectedRfq?.deliveryDays ? (String(selectedRfq.deliveryDays).includes('day') ? String(selectedRfq.deliveryDays) : `${selectedRfq.deliveryDays} days`) : undefined);

  const contactEntries = selectedRfq?.contact
    ? [
        ["Contact", selectedRfq.contact.name],
        ["Company", selectedRfq.contact.company],
        ["Email", selectedRfq.contact.email],
        ["Phone", selectedRfq.contact.phone],
      ].filter((entry): entry is [string, string] => Boolean(entry[1]))
    : [];

  const buyerDetailsText = useMemo(() => {
    if (!selectedRfq) return "";
    const parts: string[] = [];
    if (selectedRfq.buyerName && !selectedRfq.description?.includes(selectedRfq.buyerName)) {
      parts.push(`Buyer Name: ${selectedRfq.buyerName}`);
    }
    if (selectedRfq.buyerPhone && !selectedRfq.description?.includes(selectedRfq.buyerPhone)) {
      parts.push(`Buyer Mobile: ${selectedRfq.buyerPhone}`);
    }
    if (selectedRfq.subject && !selectedRfq.description?.includes(selectedRfq.subject)) {
      parts.push(`Subject: ${selectedRfq.subject}`);
    }
    const message = selectedRfq.buyerMessage || selectedRfq.description || selectedRfq.specifications;
    if (message && !parts.some((p) => p.includes(message))) {
      parts.push(message);
    }
    return parts.join(" ") || selectedRfq.description || "";
  }, [selectedRfq]);

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(330px,0.8fr)]">
      <div className="rounded-[1.6rem] sm:rounded-[2rem] border border-[#E2E8F0] bg-white p-4 sm:p-7 shadow-[0_18px_45px_rgba(10,22,40,0.05)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#D4A853]">BUYER WORKSPACE</p>
            <h2 className="mt-2 text-2xl font-bold text-[#0A1628]">My RFQs</h2>
            <p className="mt-2 text-sm leading-6 text-[#6B7B94]">Review requests, admin quotations, and your decisions.</p>
          </div>
          <button
            type="button"
            onClick={() => void loadRFQs(page)}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#CFE1D8] px-4 py-2.5 text-sm font-bold text-[#0A4D3C] transition hover:bg-[#F2F8F5] disabled:opacity-60 cursor-pointer"
          >
            <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-y border-[#EDF1F6] py-4">
          <label className="text-sm font-bold text-[#31415E]" htmlFor="rfq-status-filter">Status</label>
          <select
            id="rfq-status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as (typeof FILTERS)[number])}
            className="rounded-xl border border-[#D8E0EB] bg-white px-3 py-2 text-sm text-[#31415E] outline-none focus:border-[#0A4D3C]"
          >
            <option value="">All statuses</option>
            {FILTERS.slice(1).map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
          </select>
          <span className="text-xs font-medium text-[#6B7B94]">{totalElements} total</span>
        </div>

        <div className="mt-5 space-y-3">
          {isLoading ? (
            <div className="flex min-h-56 items-center justify-center gap-3 text-sm font-semibold text-[#6B7B94]"><LoaderCircle className="h-5 w-5 animate-spin text-[#0A4D3C]" />Loading RFQs</div>
          ) : rfqs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#CBD7E6] bg-[#F8FAFD] px-6 py-12 text-center">
              <FileText className="mx-auto h-9 w-9 text-[#0A4D3C]" />
              <h3 className="mt-4 font-bold text-[#0A1628]">No RFQs found</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#6B7B94]">Create an RFQ from a product page to request an admin quotation.</p>
            </div>
          ) : rfqs.map((rfq) => (
            <button
              key={rfq.id}
              type="button"
              onClick={() => void openDetails(rfq)}
              className={`w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-[#9DB7AD] hover:shadow-md cursor-pointer ${selectedRfq?.id === rfq.id ? "border-[#0A4D3C] bg-[#F7FBF8]" : "border-[#E2E8F0] bg-white"}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-mono text-xs font-bold text-[#0A4D3C]">{getRfqCode(rfq)}</span>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusStyle(rfq.status)}`}>{formatStatus(rfq.status)}</span>
              </div>
              <h3 className="mt-3 text-base font-bold text-[#0A1628]">{rfq.productName || rfq.title}</h3>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-[#5C6C86]">
                <span>{rfq.quantity} {rfq.unit}</span>
                <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{rfq.deliveryLocation || "Location not provided"}</span>
                <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{formatDate(rfq.createdAt)}</span>
              </div>
            </button>
          ))}
        </div>

        {!isLoading && totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between text-sm text-[#5C6C86]">
            <span>Page {page + 1} of {totalPages}</span>
            <div className="flex gap-2">
              <button type="button" disabled={page === 0} onClick={() => void loadRFQs(page - 1)} className="rounded-lg border border-[#D8E0EB] p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              <button type="button" disabled={page + 1 >= totalPages} onClick={() => void loadRFQs(page + 1)} className="rounded-lg border border-[#D8E0EB] p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>

      <aside className="rounded-[1.6rem] sm:rounded-[2rem] border border-[#E2E8F0] bg-[#FBFCFE] p-4 sm:p-7 shadow-[0_18px_45px_rgba(10,22,40,0.04)]">
        {!selectedRfq ? (
          <div className="flex min-h-72 flex-col items-center justify-center text-center">
            <Send className="h-10 w-10 text-[#D4A853]" />
            <h2 className="mt-4 text-lg font-bold text-[#0A1628]">Select an RFQ</h2>
            <p className="mt-2 max-w-xs text-sm leading-6 text-[#6B7B94]">Open an RFQ to see its full request and any admin quotation.</p>
          </div>
        ) : isDetailLoading ? (
          <div className="flex min-h-72 items-center justify-center gap-3 text-sm font-semibold text-[#6B7B94]"><LoaderCircle className="h-5 w-5 animate-spin text-[#0A4D3C]" />Loading details</div>
        ) : (
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs font-bold text-[#0A4D3C]">{getRfqCode(selectedRfq)}</p>
                <h2 className="mt-2 text-xl font-bold text-[#0A1628]">{selectedRfq.productName || selectedRfq.title}</h2>
              </div>
              <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusStyle(selectedRfq.status)}`}>{formatStatus(selectedRfq.status)}</span>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-3.5 sm:p-4 text-sm">
              <div><span className="block text-xs text-[#6B7B94]">Quantity</span><strong className="text-[#0A1628]">{selectedRfq.quantity} {selectedRfq.unit}</strong></div>
              <div><span className="block text-xs text-[#6B7B94]">Delivery location</span><strong className="text-[#0A1628]">{selectedRfq.deliveryLocation || "—"}</strong></div>
            </div>
            {buyerDetailsText && (
              <p className="mt-4 rounded-xl bg-white p-4 text-sm leading-6 text-[#4F607A] border border-gray-100 shadow-sm">
                {buyerDetailsText}
              </p>
            )}

            {(quotation || quotationAmount > 0 || String(selectedRfq.status).toUpperCase() === "RESPONDED") ? (() => {
              const unitPrice = Number(quotationAmount);
              const qty = Number(selectedRfq.quantity) || 1;
              const totalAmount = unitPrice * qty;
              const isUnitBased = Boolean(quotation?.unitPrice || quotation?.offeredPrice);

              return (
                <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-700">Admin quotation</p>

                  {/* Unit price row */}
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[11px] text-[#5C6C86] mb-0.5">{isUnitBased ? `Unit price (per ${selectedRfq.unit})` : "Quoted amount"}</p>
                      <p className="text-2xl font-bold text-[#0A1628]">₹{unitPrice.toLocaleString("en-IN")}</p>
                    </div>
                    {quotationLeadTime && (
                      <p className="text-right text-xs font-semibold text-[#31415E]">
                        Lead time<br />
                        <strong className="text-sm font-bold text-[#0A1628]">{quotationLeadTime}</strong>
                      </p>
                    )}
                  </div>

                  {/* Total amount row — quantity × unit price */}
                  {isUnitBased && qty > 1 && (
                    <div className="mt-3 rounded-xl border border-blue-200 bg-white px-4 py-3">
                      <p className="text-[11px] font-semibold text-[#5C6C86]">
                        Total amount <span className="text-[#94A3B8]">({qty} {selectedRfq.unit} × ₹{unitPrice.toLocaleString("en-IN")})</span>
                      </p>
                      <p className="mt-0.5 text-xl font-black text-[#0A4D3C]">₹{totalAmount.toLocaleString("en-IN")}</p>
                    </div>
                  )}

                  {/* Flat total (not unit-based) */}
                  {!isUnitBased && (
                    <div className="mt-3 rounded-xl border border-blue-200 bg-white px-4 py-3">
                      <p className="text-[11px] font-semibold text-[#5C6C86]">Total amount</p>
                      <p className="mt-0.5 text-xl font-black text-[#0A4D3C]">₹{unitPrice.toLocaleString("en-IN")}</p>
                    </div>
                  )}

                  {quotation?.notes && <p className="mt-3 text-sm leading-6 text-[#31415E]">{quotation.notes}</p>}
                </div>
              );
            })() : (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-[#FFFDF5] p-4 text-sm leading-6 text-amber-900">
                Your RFQ has been received. An admin quotation will appear here once it is ready.
              </div>
            )}

            {String(selectedRfq.status).toUpperCase() === "ACCEPTED" && (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="flex items-center gap-2 text-sm font-bold text-emerald-800"><CheckCircle2 className="h-4 w-4" />Contact details unlocked</p>
                {contactEntries.length ? <dl className="mt-3 space-y-1.5 text-sm text-emerald-900">{contactEntries.map(([label, value]) => <div key={label}><dt className="inline text-emerald-700">{label}: </dt><dd className="inline font-semibold">{value}</dd></div>)}</dl> : <p className="mt-2 text-sm leading-6 text-emerald-800">The accepted RFQ details have been refreshed. Contact information will display here when supplied by the API.</p>}
              </div>
            )}

            {respondable && String(selectedRfq.status).toUpperCase() !== "ACCEPTED" && String(selectedRfq.status).toUpperCase() !== "REJECTED" && (
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button type="button" disabled={isDeciding} onClick={() => void acceptQuotation()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A4D3C] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#073d30] disabled:opacity-60"><CheckCircle2 className="h-4 w-4" />Accept</button>
                <button type="button" disabled={isDeciding} onClick={() => { setRejectReason(""); setRejectingRfq(selectedRfq); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-60"><XCircle className="h-4 w-4" />Reject</button>
              </div>
            )}
          </div>
        )}
      </aside>

      {rejectingRfq && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0A1628]/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.75rem] bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-[#0A1628]">Reject quotation</h2>
            <p className="mt-2 text-sm leading-6 text-[#6B7B94]">Tell the admin why this quotation does not work for you.</p>
            <textarea value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} rows={4} className="mt-5 w-full rounded-xl border border-[#D8E0EB] p-3 text-sm outline-none focus:border-[#0A4D3C]" placeholder="Price is higher than expected" />
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" disabled={isDeciding} onClick={() => setRejectingRfq(null)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-[#5C6C86]">Cancel</button>
              <button type="button" disabled={isDeciding} onClick={() => void rejectQuotation()} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{isDeciding ? "Rejecting…" : "Confirm rejection"}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
