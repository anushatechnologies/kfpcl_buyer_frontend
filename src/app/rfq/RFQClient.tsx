'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  FileText,
  Clock,
  CheckCircle2,
  Calendar,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ListFilter,
  Check,
  DollarSign,
  LogIn,
  RefreshCw,
  Search,
  MapPin,
  Inbox,
} from 'lucide-react';
import { rfqApi } from '@/api/rfq.api';
import { RFQ, Quote } from '@/types/rfq';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useAuthStore as useAppAuthStore } from '@/app/store/authStore';

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  draft:     { label: 'Draft',           className: 'badge-gray'   },
  submitted: { label: 'Submitted',       className: 'badge-orange' },
  pending:   { label: 'Pending',         className: 'badge-orange' },
  open:      { label: 'Open for Bids',   className: 'badge-orange' },
  quoted:    { label: 'Quotes Received', className: 'badge-blue'   },
  responded: { label: 'Quotes Received', className: 'badge-blue'   },
  accepted:  { label: 'Quote Accepted',  className: 'badge-green'  },
  rejected:  { label: 'Rejected',        className: 'badge-red'    },
  expired:   { label: 'Expired',         className: 'badge-gray'   },
};

export default function RFQClient() {
  const { isAuthenticated } = useAuthStore();
  const openAuthModal = useAppAuthStore((s) => s.openAuthModal);
  const didOpenModal = useRef(false);

  // ── RFQ list state ────────────────────────────────────────────
  const [rfqs, setRfqs]                   = useState<RFQ[]>([]);
  const [isLoading, setIsLoading]         = useState(false);
  const [listError, setListError]         = useState<string | null>(null);
  const [page, setPage]                   = useState(0);
  const [totalPages, setTotalPages]       = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const PAGE_SIZE = 10;

  // ── Filter / Search ───────────────────────────────────────────
  const [searchQuery,  setSearchQuery]  = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // ── Quote expand & accept ─────────────────────────────────────
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ rfq: RFQ; quote: Quote } | null>(null);
  const [acceptBanner, setAcceptBanner] = useState<string | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────
  const fetchRFQs = useCallback(async (targetPage: number = 0) => {
    setIsLoading(true);
    setListError(null);
    try {
      const data = await rfqApi.getRFQsPaginated(targetPage, PAGE_SIZE);
      setRfqs(data.rfqs ?? []);
      setTotalPages(data.totalPages ?? 1);
      setTotalElements(data.totalElements ?? data.rfqs?.length ?? 0);
      setPage(targetPage);

      // Auto-expand RFQs that already have quotes
      const autoExpand: Record<string, boolean> = {};
      data.rfqs?.forEach((r) => {
        if (r.quotes?.length) autoExpand[r.id] = true;
      });
      setExpandedIds((prev) => ({ ...autoExpand, ...prev }));
    } catch (err: any) {
      console.error('Failed to load RFQs', err);
      setListError('Unable to load your RFQs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Open sign-in modal on first render if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !didOpenModal.current) {
      didOpenModal.current = true;
      openAuthModal();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load RFQs once authenticated
  useEffect(() => {
    if (isAuthenticated) fetchRFQs(0);
  }, [isAuthenticated, fetchRFQs]);

  // ── Accept quote handler ──────────────────────────────────────
  const handleAccept = async (rfq: RFQ, quote: Quote) => {
    setAcceptingId(quote.id);
    setAcceptBanner(null);
    try {
      await rfqApi.acceptQuote(rfq.id, quote.id);
      setRfqs((prev) =>
        prev.map((r) =>
          r.id === rfq.id
            ? {
                ...r,
                status: 'accepted',
                quotes: r.quotes.map((q) =>
                  q.id === quote.id
                    ? { ...q, status: 'accepted' }
                    : { ...q, status: 'rejected' }
                ),
              }
            : r
        )
      );
      const price = (quote.amount ?? quote.offeredPrice ?? quote.unitPrice ?? 0)
        .toLocaleString('en-IN');
      setAcceptBanner(
        `Quotation from ${quote.sellerCompany || quote.sellerName || 'supplier'} for ₹${price}/${rfq.unit} accepted!`
      );
      setConfirmModal(null);
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Could not accept quotation. Please try again.'
      );
    } finally {
      setAcceptingId(null);
    }
  };

  // ── Filtered list ─────────────────────────────────────────────
  const filtered = rfqs.filter((r) => {
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      r.title?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q);

    const s = (r.status || '').toLowerCase();
    const matchStatus =
      statusFilter === 'all'        ? true :
      statusFilter === 'with_quotes'? (r.quotes?.length ?? 0) > 0 :
      statusFilter === 'accepted'   ? s === 'accepted' :
      statusFilter === 'open'       ? s === 'open' || s === 'submitted' || s === 'pending' :
      true;

    return matchSearch && matchStatus;
  });

  // ═══════════════════════════════════════════════════════════════
  // AUTH GATE
  // ═══════════════════════════════════════════════════════════════
  if (!isAuthenticated) {
    return (
      <div className="section animate-fade-in py-16 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="card max-w-md w-full p-10 text-center space-y-5 shadow-xl">
          <div className="h-16 w-16 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center mx-auto">
            <FileText className="h-8 w-8 text-brand-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-dark-900 mb-1">
              Sign In to View Your RFQs
            </h1>
            <p className="text-sm text-dark-500 leading-relaxed">
              Your submitted Requests for Quotation and supplier quotes will appear here after signing in.
            </p>
          </div>
          <button
            onClick={() => openAuthModal()}
            className="btn-primary w-full py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-brand-500/20"
          >
            <LogIn className="h-4 w-4" />
            Sign In to Continue
          </button>
          <p className="text-xs text-dark-400">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-brand-600 font-semibold hover:underline">
              Register here
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // AUTHENTICATED — MY RFQs LIST
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="section animate-fade-in py-6 sm:py-10">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-dark-500 hover:text-brand-700 transition-colors mb-2 group"
            >
              <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
              Back to Home
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-dark-900 flex items-center gap-2.5">
              <FileText className="h-7 w-7 text-brand-600" />
              My RFQs &amp; Quotes
            </h1>
            <p className="text-sm text-dark-500 mt-1">
              Track your submitted procurement requests and review supplier quotations.
            </p>
          </div>
          <button
            onClick={() => fetchRFQs(page)}
            disabled={isLoading}
            className="btn-secondary text-xs py-2 px-4 flex items-center gap-2 self-start sm:self-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* ── Success banner ── */}
        {acceptBanner && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              <span>{acceptBanner}</span>
            </div>
            <button
              onClick={() => setAcceptBanner(null)}
              className="text-xs font-semibold text-emerald-700 hover:underline ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── Filter toolbar ── */}
        <div className="card p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-dark-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search your RFQs by product or description…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-dark-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <ListFilter className="h-4 w-4 text-dark-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-semibold rounded-xl border border-dark-200 bg-white px-3 py-2 text-dark-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="all">All Statuses</option>
              <option value="with_quotes">Quotes Received</option>
              <option value="open">Open / Submitted</option>
              <option value="accepted">Accepted Deals</option>
            </select>
          </div>
        </div>

        {/* ── List Content ── */}
        {isLoading && rfqs.length === 0 ? (
          <div className="card p-16 text-center flex flex-col items-center gap-3">
            <div className="h-10 w-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-dark-500">Loading your RFQs…</p>
          </div>

        ) : listError ? (
          <div className="card p-10 text-center">
            <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-3" />
            <p className="text-sm text-dark-700 mb-4">{listError}</p>
            <button onClick={() => fetchRFQs(0)} className="btn-secondary text-xs">
              Retry
            </button>
          </div>

        ) : filtered.length === 0 ? (
          <div className="card p-16 text-center flex flex-col items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-500">
              <Inbox className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-bold text-dark-900">
              {searchQuery || statusFilter !== 'all'
                ? 'No RFQs match your filters'
                : 'No RFQs submitted yet'}
            </h2>
            <p className="text-xs text-dark-500 max-w-sm">
              {searchQuery || statusFilter !== 'all'
                ? 'Try clearing your search or changing the status filter.'
                : 'Your submitted RFQs and supplier quotations will appear here once you place a request.'}
            </p>
            {(searchQuery || statusFilter !== 'all') && (
              <button
                onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                className="btn-secondary text-xs mt-2"
              >
                Clear Filters
              </button>
            )}
          </div>

        ) : (
          <div className="space-y-4">
            {filtered.map((rfq) => {
              const isExpanded   = expandedIds[rfq.id] ?? false;
              const quotesCount  = rfq.quotes?.length ?? 0;
              const statusKey    = (rfq.status || 'submitted').toLowerCase();
              const badge        = STATUS_BADGES[statusKey] ?? { label: rfq.status, className: 'badge-gray' };

              return (
                <div
                  key={rfq.id}
                  className="card overflow-hidden border border-dark-200/90 hover:border-brand-300 transition-all shadow-sm"
                >
                  {/* ── RFQ header row ── */}
                  <div className="p-5 sm:p-6 bg-white">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      {/* Left: details */}
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className={badge.className}>{badge.label}</span>
                          <span className="text-xs text-dark-400 flex items-center gap-1 font-medium">
                            <Clock className="h-3.5 w-3.5" />
                            Created {formatDate(rfq.createdAt)}
                          </span>
                          {quotesCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              {quotesCount} {quotesCount === 1 ? 'Quote' : 'Quotes'} Received
                            </span>
                          )}
                        </div>

                        <h3 className="text-base sm:text-lg font-bold font-display text-dark-900 truncate">
                          {rfq.title || rfq.productName || 'Quotation Request'}
                        </h3>

                        {rfq.description && (
                          <p className="text-xs text-dark-600 line-clamp-2 leading-relaxed">
                            {rfq.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-1 text-xs text-dark-600">
                          {rfq.quantity != null && (
                            <span>
                              Qty: <strong className="text-dark-900">{rfq.quantity} {rfq.unit}</strong>
                            </span>
                          )}
                          {rfq.targetPrice != null && (
                            <span>
                              Target: <strong className="text-dark-900">₹{rfq.targetPrice.toLocaleString('en-IN')}/{rfq.unit}</strong>
                            </span>
                          )}
                          {rfq.requiredByDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-brand-600" />
                              <strong className="text-dark-900">{formatDate(rfq.requiredByDate)}</strong>
                            </span>
                          )}
                          {rfq.deliveryLocation && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-brand-600" />
                              <strong className="text-dark-900">{rfq.deliveryLocation}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: expand toggle */}
                      <button
                        onClick={() =>
                          setExpandedIds((prev) => ({ ...prev, [rfq.id]: !prev[rfq.id] }))
                        }
                        className={`self-start text-xs font-bold py-2 px-3.5 rounded-xl border flex items-center gap-2 transition-all whitespace-nowrap ${
                          isExpanded
                            ? 'bg-dark-100 border-dark-200 text-dark-800'
                            : quotesCount > 0
                            ? 'bg-brand-50 border-brand-200 text-brand-700 hover:bg-brand-100'
                            : 'bg-white border-dark-200 text-dark-600 hover:bg-dark-50'
                        }`}
                      >
                        {quotesCount > 0 ? `Quotes (${quotesCount})` : 'Bids (0)'}
                        {isExpanded
                          ? <ChevronUp className="h-3.5 w-3.5" />
                          : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* ── Expandable: received quotes ── */}
                  {isExpanded && (
                    <div className="bg-dark-50/70 border-t border-dark-200/80 p-4 sm:p-6 animate-fade-in space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs sm:text-sm font-bold font-display text-dark-900 flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-brand-600" />
                          Supplier Quotations ({quotesCount})
                        </h4>
                        <span className="text-[11px] text-dark-400">
                          Review pricing, lead time, and accept
                        </span>
                      </div>

                      {quotesCount === 0 ? (
                        <div className="p-6 text-center rounded-xl bg-white border border-dark-200/80">
                          <Clock className="h-6 w-6 text-dark-300 mx-auto mb-1.5 animate-pulse" />
                          <p className="text-xs font-semibold text-dark-700">Awaiting supplier bids</p>
                          <p className="text-[11px] text-dark-400 mt-0.5">
                            Verified suppliers will submit competitive quotes shortly.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3.5">
                          {rfq.quotes.map((quote) => {
                            const accepted     = quote.status?.toLowerCase() === 'accepted';
                            const processing   = acceptingId === quote.id;
                            const unitPrice    = quote.amount ?? quote.offeredPrice ?? quote.unitPrice ?? 0;
                            const totalPrice   = quote.totalPrice || (unitPrice > 0 ? unitPrice * (rfq.quantity || 1) : 0);

                            return (
                              <div
                                key={quote.id}
                                className={`p-4 sm:p-5 rounded-xl border transition-all ${
                                  accepted
                                    ? 'bg-emerald-50/70 border-emerald-300 shadow-sm'
                                    : 'bg-white border-dark-200 hover:border-dark-300'
                                }`}
                              >
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                  {/* Seller info */}
                                  <div className="space-y-1.5 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <div className="h-7 w-7 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs">
                                        {(quote.sellerCompany || quote.sellerName || 'S')[0]}
                                      </div>
                                      <span className="text-sm font-bold text-dark-900">
                                        {quote.sellerCompany || quote.sellerName || 'Verified Supplier'}
                                      </span>
                                      {accepted
                                        ? <span className="badge-green text-[10px] py-0.5">Accepted Deal</span>
                                        : <span className="badge-orange text-[10px] py-0.5">Pending Decision</span>}
                                    </div>

                                    {quote.notes && (
                                      <p className="text-xs text-dark-600 italic bg-dark-50 p-2.5 rounded-lg border border-dark-100">
                                        &ldquo;{quote.notes}&rdquo;
                                      </p>
                                    )}

                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-dark-500 pt-1">
                                      {quote.leadTime && (
                                        <span>Lead Time: <strong>{quote.leadTime}</strong></span>
                                      )}
                                      {quote.deliveryDate && (
                                        <span>Est. Delivery: <strong>{formatDate(quote.deliveryDate)}</strong></span>
                                      )}
                                      {quote.validUntil && (
                                        <span>Valid Until: <strong>{formatDate(quote.validUntil)}</strong></span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Price + accept */}
                                  <div className="flex items-center justify-between lg:justify-end gap-6 pt-3 lg:pt-0 border-t lg:border-t-0 border-dark-100">
                                    <div className="text-left lg:text-right">
                                      <div className="text-xs text-dark-400">Offered Price</div>
                                      <div className="text-lg font-bold font-display text-brand-700">
                                        ₹{unitPrice.toLocaleString('en-IN')}
                                        <span className="text-xs font-normal text-dark-500">/{rfq.unit}</span>
                                      </div>
                                      <div className="text-[11px] text-dark-500">
                                        Total: ₹{totalPrice.toLocaleString('en-IN')}
                                      </div>
                                    </div>

                                    <div>
                                      {accepted ? (
                                        <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-sm">
                                          <CheckCircle2 className="h-4 w-4" />
                                          Accepted
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => setConfirmModal({ rfq, quote })}
                                          disabled={processing}
                                          className="btn-primary text-xs py-2.5 px-4 font-bold shadow-sm flex items-center gap-1.5"
                                        >
                                          {processing
                                            ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Accepting…</>
                                            : <><Check className="h-3.5 w-3.5" />Accept Quote</>}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="card p-4 flex items-center justify-between text-xs text-dark-600 mt-2">
                <span>
                  Page <strong className="text-dark-900">{page + 1}</strong> of{' '}
                  <strong className="text-dark-900">{totalPages}</strong>
                  {' '}({totalElements} total)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchRFQs(page - 1)}
                    disabled={page === 0 || isLoading}
                    className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Previous
                  </button>
                  <button
                    onClick={() => fetchRFQs(page + 1)}
                    disabled={page + 1 >= totalPages || isLoading}
                    className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 disabled:opacity-40"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Accept Confirmation Modal ── */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-900/60 backdrop-blur-sm animate-fade-in">
          <div className="card max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <Check className="h-6 w-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold font-display text-dark-900">Confirm Accept Quotation</h3>
              <p className="text-xs text-dark-500 mt-1">
                This will notify the supplier to finalise the trade order and dispatch.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-dark-50 border border-dark-100 text-xs text-dark-700 space-y-2">
              <div className="flex justify-between">
                <span className="text-dark-400">Supplier:</span>
                <span className="font-bold text-dark-900">
                  {confirmModal.quote.sellerCompany || confirmModal.quote.sellerName || 'Verified Seller'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Offered Rate:</span>
                <span className="font-bold text-emerald-700">
                  ₹{(confirmModal.quote.offeredPrice ?? confirmModal.quote.unitPrice ?? 0).toLocaleString('en-IN')}/{confirmModal.rfq.unit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">
                  Total ({confirmModal.rfq.quantity} {confirmModal.rfq.unit}):
                </span>
                <span className="font-bold text-dark-900">
                  ₹{(
                    (confirmModal.quote.offeredPrice ?? confirmModal.quote.unitPrice ?? 0) *
                    confirmModal.rfq.quantity
                  ).toLocaleString('en-IN')}
                </span>
              </div>
              {confirmModal.quote.leadTime && (
                <div className="flex justify-between">
                  <span className="text-dark-400">Lead Time:</span>
                  <span className="font-medium text-dark-800">{confirmModal.quote.leadTime}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                disabled={Boolean(acceptingId)}
                className="btn-secondary flex-1 text-xs py-2.5"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAccept(confirmModal.rfq, confirmModal.quote)}
                disabled={Boolean(acceptingId)}
                className="btn-primary flex-1 text-xs py-2.5 font-bold flex items-center justify-center gap-1.5"
              >
                {acceptingId
                  ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Accepting…</>
                  : <><Check className="h-3.5 w-3.5" />Yes, Accept</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
