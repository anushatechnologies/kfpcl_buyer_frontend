'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  FileText,
  Clock,
  CheckCircle2,
  TrendingUp,
  ArrowLeft,
  Calendar,
  Layers,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertCircle,
  PlusCircle,
  ListFilter,
  Check,
  Building,
  Tag,
  DollarSign,
  LogIn,
  RefreshCw,
  Search,
  MapPin,
} from 'lucide-react';
import { rfqApi } from '@/api/rfq.api';
import { RFQ, Quote } from '@/types/rfq';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
// App-level auth store — owns the Sign In modal
import { useAuthStore as useAppAuthStore } from '@/app/store/authStore';

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'badge-gray' },
  submitted: { label: 'Submitted', className: 'badge-orange' },
  open: { label: 'Open for Bids', className: 'badge-orange' },
  quoted: { label: 'Quotes Received', className: 'badge-blue' },
  accepted: { label: 'Quote Accepted', className: 'badge-green' },
  rejected: { label: 'Rejected', className: 'badge-red' },
  expired: { label: 'Expired', className: 'badge-gray' },
};

const schema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(120, 'Title is too long'),
  description: z
    .string()
    .min(5, 'Please provide requirement details/specifications'),
  targetPrice: z.preprocess(
    (value) => (value === '' || Number.isNaN(value) ? undefined : value),
    z.number().positive('Target price must be greater than zero').optional()
  ),
  quantity: z
    .number({ invalid_type_error: 'Quantity is required' })
    .min(1, 'Quantity must be at least 1'),
  unit: z.string().min(1, 'Unit of measurement is required'),
  requiredByDate: z.string().min(1, 'Required by date is required'),
  deliveryLocation: z.string().trim().min(2, 'Location is required'),
});

type FormData = z.infer<typeof schema>;

const SAMPLE_TEMPLATES = [
  {
    title: 'Need 500kg of Brown Rice',
    description: 'Looking for high-quality brown rice, delivery to Mumbai.',
    targetPrice: 45.0,
    quantity: 500,
    unit: 'kg',
  },
  {
    title: '50 MT APEDA Certified Basmati Rice 1121',
    description: 'Extra-long grain Basmati Rice 1121, moisture <= 12%, packed in 25kg PP bags for export.',
    targetPrice: 85000,
    quantity: 50,
    unit: 'MT',
  },
  {
    title: '10 KL Cold Pressed Groundnut Oil',
    description: 'Pure cold-pressed groundnut oil, FFA <= 0.8%, food grade packed in IBC containers.',
    targetPrice: 160000,
    quantity: 10,
    unit: 'KL',
  },
  {
    title: '5 MT Organic Salem Turmeric Finger',
    description: 'Curcumin content >= 3.5%, double polished, unadulterated with lab certificate.',
    targetPrice: 140000,
    quantity: 5,
    unit: 'MT',
  },
];

export default function RFQClient() {
  const { isAuthenticated } = useAuthStore();
  const openAuthModal = useAppAuthStore((s) => s.openAuthModal);
  const searchParams = useSearchParams();

  // Default to My RFQs list when authenticated; create tab when not
  const [activeTab, setActiveTab] = useState<'create' | 'list'>(
    isAuthenticated ? 'list' : 'create'
  );
  // Track whether we already opened the modal on mount
  const didOpenModal = useRef(false);
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [isListLoading, setIsListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<RFQ | null>(null);
  const [submitError, setSubmitError] = useState('');

  // Expandable quotes & accept modal
  const [expandedRfqIds, setExpandedRfqIds] = useState<Record<string, boolean>>({});
  const [acceptingQuoteId, setAcceptingQuoteId] = useState<string | null>(null);
  const [confirmAcceptModal, setConfirmAcceptModal] = useState<{
    rfq: RFQ;
    quote: Quote;
  } | null>(null);
  const [acceptSuccessMessage, setAcceptSuccessMessage] = useState<string | null>(null);

  const defaultTitle = searchParams.get('title') || searchParams.get('product') || '';
  const defaultCategory = searchParams.get('category') || '';

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: defaultTitle ? `Need ${defaultTitle}` : '',
      description: defaultCategory
        ? `Looking for premium quality ${defaultTitle || defaultCategory}. APEDA/FSSAI compliant.`
        : '',
      quantity: 500,
      unit: 'kg',
      targetPrice: 45.0,
      requiredByDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      deliveryLocation: '',
    },
  });

  const fetchRFQs = useCallback(async (targetPage: number = 0) => {
    setIsListLoading(true);
    setListError(null);
    try {
      const data = await rfqApi.getRFQsPaginated(targetPage, pageSize);
      setRfqs(data.rfqs || []);
      setTotalPages(data.totalPages || 1);
      setTotalElements(data.totalElements || data.rfqs?.length || 0);
      setPage(targetPage);

      // Auto expand RFQs that already have quotes received
      const initialExpanded: Record<string, boolean> = {};
      data.rfqs?.forEach((r) => {
        if (r.quotes && r.quotes.length > 0) {
          initialExpanded[r.id] = true;
        }
      });
      setExpandedRfqIds((prev) => ({ ...initialExpanded, ...prev }));
    } catch (err: any) {
      console.error('Failed to load RFQs', err);
      setListError('Unable to load RFQs at the moment. Please try again.');
    } finally {
      setIsListLoading(false);
    }
  }, [pageSize]);

  // On mount: if not signed in, open the Sign In popup immediately
  useEffect(() => {
    if (!isAuthenticated && !didOpenModal.current) {
      didOpenModal.current = true;
      openAuthModal();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When auth state changes to authenticated: switch to list tab and load RFQs
  useEffect(() => {
    if (isAuthenticated) {
      setActiveTab('list');
      fetchRFQs(0);
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleExpandRfq = (rfqId: string) => {
    setExpandedRfqIds((prev) => ({
      ...prev,
      [rfqId]: !prev[rfqId],
    }));
  };

  const applyTemplate = (tpl: (typeof SAMPLE_TEMPLATES)[0]) => {
    setValue('title', tpl.title, { shouldValidate: true });
    setValue('description', tpl.description, { shouldValidate: true });
    setValue('quantity', tpl.quantity, { shouldValidate: true });
    setValue('unit', tpl.unit, { shouldValidate: true });
    setValue('targetPrice', tpl.targetPrice, { shouldValidate: true });
  };

  const onSubmit = async (data: FormData) => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    try {
      const createdRFQ = await rfqApi.createRFQ({
        title: data.title,
        description: data.description,
        targetPrice: data.targetPrice,
        quantity: data.quantity,
        unit: data.unit,
        requiredByDate: data.requiredByDate,
        deliveryLocation: data.deliveryLocation,
      });

      setSubmitSuccess(createdRFQ);
      setRfqs((prev) => [createdRFQ, ...prev]);
      setTotalElements((prev) => prev + 1);
    } catch (err: any) {
      console.error('Failed to submit RFQ', err);
      const responseData = err?.response?.data;
      const serverMsg: string = responseData?.message || responseData?.error || '';

      let userFriendlyMsg = 'Failed to submit your RFQ. Please verify your connection and try again.';
      if (serverMsg.toLowerCase().includes('buyer not found') || serverMsg.toLowerCase().includes('user not found')) {
        userFriendlyMsg =
          '⚠️ Your account is not yet registered in the Karthikeya Farmer Producer Company Limited system. Please register or log in with a valid Karthikeya Farmer Producer Company Limited buyer account, then try again.';
      } else if (serverMsg) {
        userFriendlyMsg = serverMsg;
      }

      setSubmitError(userFriendlyMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptQuote = async (rfq: RFQ, quote: Quote) => {
    setAcceptingQuoteId(quote.id);
    setAcceptSuccessMessage(null);
    try {
      await rfqApi.acceptQuote(rfq.id, quote.id);

      // Update local state smoothly
      setRfqs((prevRfqs) =>
        prevRfqs.map((item) => {
          if (item.id === rfq.id) {
            return {
              ...item,
              status: 'accepted',
              quotes: item.quotes.map((q) =>
                q.id === quote.id
                  ? { ...q, status: 'accepted' }
                  : { ...q, status: 'rejected' }
              ),
            };
          }
          return item;
        })
      );

      setAcceptSuccessMessage(
        `Quotation from ${quote.sellerCompany || quote.sellerName || 'seller'} for ₹${(
          quote.amount ?? quote.offeredPrice ?? quote.unitPrice ?? 0
        ).toLocaleString('en-IN')}/${rfq.unit} accepted successfully!`
      );
      setConfirmAcceptModal(null);
    } catch (err: any) {
      console.error('Failed to accept quotation', err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Could not accept quotation. Please try again.';
      alert(msg);
    } finally {
      setAcceptingQuoteId(null);
    }
  };

  const filteredRfqs = rfqs.filter((item) => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const statusNorm = (item.status || '').toLowerCase();
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'with_quotes'
        ? item.quotes && item.quotes.length > 0
        : statusFilter === 'accepted'
        ? statusNorm === 'accepted'
        : statusFilter === 'open'
        ? statusNorm === 'open' || statusNorm === 'submitted'
        : true;

    return matchesSearch && matchesStatus;
  });

  const fieldClass = (name: keyof FormData) =>
    errors[name]
      ? 'w-full rounded-xl border border-red-400 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/30'
      : 'w-full rounded-xl border border-dark-200 px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all';

  // ── Auth gate: not signed in ────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="section animate-fade-in py-16 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="card max-w-md w-full p-10 text-center space-y-5 shadow-xl">
          <div className="h-16 w-16 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center mx-auto">
            <FileText className="h-8 w-8 text-brand-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-dark-900 mb-1">
              Sign In to Access RFQs
            </h1>
            <p className="text-sm text-dark-500 leading-relaxed">
              Create and manage your Request for Quotation in one place. Sign in with your buyer account to get started.
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
  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="section animate-fade-in py-6 sm:py-10">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-dark-500 hover:text-brand-700 transition-colors mb-2 group"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
              Back to Home
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-dark-900 flex items-center gap-2.5">
              <FileText className="h-7 w-7 text-brand-600" />
              Request for Quotation (RFQ)
            </h1>
            <p className="text-sm text-dark-500 mt-1">
              Broadcast your custom procurement requirements to verified suppliers and negotiate competitive bids.
            </p>
          </div>

          {/* Tab buttons */}
          <div className="inline-flex p-1 bg-dark-100/80 rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'create'
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-dark-600 hover:text-dark-900'
              }`}
            >
              <PlusCircle className="h-4 w-4" />
              Create RFQ
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'list'
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-dark-600 hover:text-dark-900'
              }`}
            >
              <Layers className="h-4 w-4" />
              My RFQs &amp; Quotes ({totalElements || rfqs.length})
            </button>
          </div>
        </div>

        {/* Global Notification Banner */}
        {acceptSuccessMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              <span>{acceptSuccessMessage}</span>
            </div>
            <button
              onClick={() => setAcceptSuccessMessage(null)}
              className="text-xs font-semibold text-emerald-700 hover:underline ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ──────────────── TAB 1: CREATE RFQ ──────────────── */}
        {activeTab === 'create' && (
          <div>
            {submitSuccess ? (
              <div className="card p-8 sm:p-12 text-center max-w-xl mx-auto animate-fade-in">
                <div className="h-20 w-20 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-5 shadow-sm">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <span className="badge-green mb-2">RFQ Created</span>
                <h2 className="text-2xl font-bold font-display text-dark-900 mb-2">
                  Quotation Request Broadcasted!
                </h2>
                <p className="text-sm text-dark-600 mb-6 leading-relaxed">
                  Your RFQ <strong className="text-dark-900">&quot;{submitSuccess.title}&quot;</strong> is now active.
                  The admin team and verified suppliers have been notified and can reply directly to your RFQ inbox.
                </p>

                <div className="p-4 rounded-xl bg-dark-50 border border-dark-100 text-left text-xs text-dark-700 space-y-1.5 mb-6">
                  <div className="flex justify-between">
                    <span className="text-dark-400">Target Quantity:</span>
                    <span className="font-semibold text-dark-900">
                      {submitSuccess.quantity} {submitSuccess.unit}
                    </span>
                  </div>
                  {submitSuccess.targetPrice && (
                    <div className="flex justify-between">
                      <span className="text-dark-400">Target Price:</span>
                      <span className="font-semibold text-dark-900">
                        ₹{submitSuccess.targetPrice.toLocaleString('en-IN')}/{submitSuccess.unit}
                      </span>
                    </div>
                  )}
                  {submitSuccess.requiredByDate && (
                    <div className="flex justify-between">
                      <span className="text-dark-400">Required By:</span>
                      <span className="font-semibold text-dark-900">
                        {formatDate(submitSuccess.requiredByDate)}
                      </span>
                    </div>
                  )}
                  {submitSuccess.deliveryLocation && (
                    <div className="flex justify-between gap-4">
                      <span className="text-dark-400">Location:</span>
                      <span className="font-semibold text-dark-900 text-right">
                        {submitSuccess.deliveryLocation}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => {
                      setSubmitSuccess(null);
                      reset({
                        title: '',
                        description: '',
                        quantity: 500,
                        unit: 'kg',
                        targetPrice: undefined,
                        requiredByDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
                        deliveryLocation: '',
                      });
                    }}
                    className="btn-secondary text-xs sm:text-sm"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Submit Another RFQ
                  </button>
                  <button
                    onClick={() => {
                      setSubmitSuccess(null);
                      setActiveTab('list');
                    }}
                    className="btn-primary text-xs sm:text-sm"
                  >
                    <Layers className="h-4 w-4" />
                    View RFQs &amp; Quotes
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Form column */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="card p-6 sm:p-7">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h2 className="text-lg font-bold font-display text-dark-900">
                          Create a Request for Quotation
                        </h2>
                        <p className="text-xs text-dark-400 mt-0.5">
                          Specify your required volume, target pricing, and delivery schedule.
                        </p>
                      </div>
                      <span className="badge-orange text-xs">Direct to Suppliers</span>
                    </div>

                    {/* Auth warning banner is no longer needed — unauthenticated users see the gate screen */}

                    {/* Quick Templates */}
                    <div className="mb-6">
                      <label className="text-xs font-semibold text-dark-500 uppercase tracking-wider block mb-2 flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-brand-600" />
                        Quick Examples &amp; Templates
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {SAMPLE_TEMPLATES.map((tpl, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => applyTemplate(tpl)}
                            className="text-xs py-1.5 px-3 rounded-lg bg-dark-50 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-300 border border-dark-100 text-dark-700 transition-all font-medium flex items-center gap-1.5"
                          >
                            <Tag className="h-3 w-3 text-brand-500" />
                            {tpl.title}
                          </button>
                        ))}
                      </div>
                    </div>

                    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                      {/* Title */}
                      <div>
                        <label className="form-label font-semibold text-dark-800">
                          Requirement Title *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Need 500kg of Brown Rice"
                          className={fieldClass('title')}
                          {...register('title')}
                        />
                        {errors.title && <p className="form-error mt-1">{errors.title.message}</p>}
                      </div>

                      {/* Description */}
                      <div>
                        <label className="form-label font-semibold text-dark-800">
                          Description &amp; Specifications *
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Looking for high-quality brown rice, delivery to Mumbai. Specify packaging, grade, certifications..."
                          className={`${fieldClass('description')} resize-none`}
                          {...register('description')}
                        />
                        {errors.description && (
                          <p className="form-error mt-1">{errors.description.message}</p>
                        )}
                      </div>

                      {/* Quantity & Unit */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="form-label font-semibold text-dark-800">
                            Quantity *
                          </label>
                          <input
                            type="number"
                            step="any"
                            placeholder="500"
                            className={fieldClass('quantity')}
                            {...register('quantity', { valueAsNumber: true })}
                          />
                          {errors.quantity && (
                            <p className="form-error mt-1">{errors.quantity.message}</p>
                          )}
                        </div>

                        <div>
                          <label className="form-label font-semibold text-dark-800">Unit *</label>
                          <select className={fieldClass('unit')} {...register('unit')}>
                            <option value="kg">kg (Kilograms)</option>
                            <option value="MT">MT (Metric Tons)</option>
                            <option value="Quintal">Quintal</option>
                            <option value="Tons">Tons</option>
                            <option value="KL">KL (Kiloliters)</option>
                            <option value="L">L (Liters)</option>
                            <option value="Cases">Cases / Cartons</option>
                            <option value="Bags">Bags (25kg / 50kg)</option>
                            <option value="Pieces">Pieces / Units</option>
                          </select>
                          {errors.unit && <p className="form-error mt-1">{errors.unit.message}</p>}
                        </div>
                      </div>

                      {/* Target Price & Required By Date */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="form-label font-semibold text-dark-800">
                            Target Price (₹ per unit)
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-dark-400 font-semibold">
                              ₹
                            </span>
                            <input
                              type="number"
                              step="any"
                              placeholder="45.0"
                              className={`${fieldClass('targetPrice')} pl-8`}
                              {...register('targetPrice', { valueAsNumber: true })}
                            />
                          </div>
                          {errors.targetPrice && (
                            <p className="form-error mt-1">{errors.targetPrice.message}</p>
                          )}
                        </div>

                        <div>
                          <label className="form-label font-semibold text-dark-800">
                            Required By Date *
                          </label>
                          <input
                            type="date"
                            className={fieldClass('requiredByDate')}
                            {...register('requiredByDate')}
                          />
                          {errors.requiredByDate && (
                            <p className="form-error mt-1">{errors.requiredByDate.message}</p>
                          )}
                        </div>
                      </div>

                      {/* Delivery Location */}
                      <div>
                        <label className="form-label font-semibold text-dark-800">
                          Location *
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="e.g. Mumbai, Maharashtra, India"
                            className={`${fieldClass('deliveryLocation')} pl-10`}
                            {...register('deliveryLocation')}
                          />
                        </div>
                        {errors.deliveryLocation && (
                          <p className="form-error mt-1">{errors.deliveryLocation.message}</p>
                        )}
                      </div>

                      {submitError && (
                        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 flex-shrink-0" />
                          <span>{submitError}</span>
                        </div>
                      )}

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="btn-primary w-full py-3 text-sm font-bold shadow-md shadow-brand-500/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {isSubmitting ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              Publishing RFQ...
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

                {/* Sidebar Info */}
                <div className="lg:col-span-5 space-y-6">
                  {/* How RFQ workflow functions */}
                  <div className="card p-6 bg-gradient-to-br from-brand-900 to-dark-900 text-white shadow-xl">
                    <h3 className="font-display font-bold text-lg text-white mb-2 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-brand-400" />
                      How Karthikeya Farmer Producer Company Limited RFQ Works
                    </h3>
                    <p className="text-xs text-brand-100/80 mb-5 leading-relaxed">
                      Connect with trusted exporters and producers across India with transparent pricing and verified quality.
                    </p>

                    <div className="space-y-4">
                      {[
                        {
                          step: '1',
                          title: 'Create Your RFQ',
                          desc: 'Publish your desired commodity, target volume, and delivery deadline.',
                        },
                        {
                          step: '2',
                          title: 'Suppliers Quote Bids',
                          desc: 'Verified farmers and suppliers submit competitive price quotations.',
                        },
                        {
                          step: '3',
                          title: 'Accept & Proceed',
                          desc: 'Compare quotes, review seller terms, and accept the best quotation with 1 click.',
                        },
                        {
                          step: '4',
                          title: 'Fulfillment & Escrow',
                          desc: 'Seamless dispatch with quality inspection and safe trade security.',
                        },
                      ].map((item) => (
                        <div key={item.step} className="flex items-start gap-3">
                          <div className="h-6 w-6 rounded-full bg-brand-500/30 border border-brand-400/40 text-brand-300 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                            {item.step}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">{item.title}</p>
                            <p className="text-[11px] text-dark-300 mt-0.5 leading-normal">
                              {item.desc}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary preview & quick links */}
                  <div className="card p-5 border border-dark-200">
                    <h4 className="font-bold text-sm text-dark-900 mb-3 flex items-center gap-2">
                      <Building className="h-4 w-4 text-brand-600" />
                      Verified Trade Guarantee
                    </h4>
                    <ul className="text-xs text-dark-600 space-y-2">
                      <li className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                        Direct supplier pricing without middleman markups
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                        FSSAI, APEDA, and ISO quality test certification
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                        Custom packaging and bulk export logistics support
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ──────────────── TAB 2: LIST RFQS & QUOTES ──────────────── */}
        {activeTab === 'list' && (
          <div className="space-y-6 animate-fade-in">
            {/* Filter toolbar */}
            <div className="card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Search bar */}
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-dark-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search your RFQs by title or commodity..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-dark-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              {/* Status filter & refresh */}
              <div className="flex items-center gap-3">
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

                <button
                  onClick={() => fetchRFQs(page)}
                  disabled={isListLoading}
                  className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
                  title="Refresh RFQs"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isListLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* List Content */}
            {isListLoading && rfqs.length === 0 ? (
              <div className="card p-12 text-center flex flex-col items-center justify-center gap-3">
                <div className="h-10 w-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-medium text-dark-500">Loading your RFQ list...</p>
              </div>
            ) : listError && rfqs.length === 0 ? (
              <div className="card p-10 text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-sm text-dark-700">{listError}</p>
                <button
                  onClick={() => fetchRFQs(0)}
                  className="btn-secondary text-xs mt-4"
                >
                  Retry Loading
                </button>
              </div>
            ) : filteredRfqs.length === 0 ? (
              <div className="card p-12 text-center flex flex-col items-center justify-center">
                <div className="h-14 w-14 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 mb-4">
                  <FileText className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-bold text-dark-900 mb-1">No RFQs Found</h3>
                <p className="text-xs text-dark-500 max-w-sm mb-5">
                  {searchQuery || statusFilter !== 'all'
                    ? 'No quotation requests match your active search filters.'
                    : 'You have not created any Request for Quotation yet.'}
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setActiveTab('create');
                  }}
                  className="btn-primary text-xs"
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
                  const statusKey = (rfq.status || 'submitted').toLowerCase();
                  const badge = STATUS_BADGES[statusKey] || {
                    label: rfq.status,
                    className: 'badge-gray',
                  };

                  return (
                    <div
                      key={rfq.id}
                      className="card overflow-hidden border border-dark-200/90 hover:border-brand-300 transition-all shadow-sm"
                    >
                      {/* Main RFQ Header Card */}
                      <div className="p-5 sm:p-6 bg-white">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="space-y-2 flex-1">
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

                            <h3 className="text-base sm:text-lg font-bold font-display text-dark-900">
                              {rfq.title}
                            </h3>

                            {rfq.description && (
                              <p className="text-xs text-dark-600 line-clamp-2 leading-relaxed">
                                {rfq.description}
                              </p>
                            )}

                            {/* Details Grid */}
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-xs text-dark-700">
                              <div className="flex items-center gap-1.5">
                                <span className="text-dark-400">Required Quantity:</span>
                                <span className="font-bold text-dark-900">
                                  {rfq.quantity} {rfq.unit}
                                </span>
                              </div>

                              {rfq.targetPrice && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-dark-400">Target Price:</span>
                                  <span className="font-bold text-dark-900">
                                    ₹{rfq.targetPrice.toLocaleString('en-IN')}/{rfq.unit}
                                  </span>
                                </div>
                              )}

                              {rfq.requiredByDate && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-dark-400">Required By:</span>
                                  <span className="font-bold text-dark-900 flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5 text-brand-600" />
                                    {formatDate(rfq.requiredByDate)}
                                  </span>
                                </div>
                              )}

                              {rfq.deliveryLocation && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-dark-400">Location:</span>
                                  <span className="font-bold text-dark-900 flex items-center gap-1">
                                    <MapPin className="h-3.5 w-3.5 text-brand-600" />
                                    {rfq.deliveryLocation}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action button: Toggle Quotes */}
                          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-dark-100">
                            <button
                              onClick={() => toggleExpandRfq(rfq.id)}
                              className={`text-xs font-bold py-2 px-3.5 rounded-xl border flex items-center gap-2 transition-all ${
                                isExpanded
                                  ? 'bg-dark-100 border-dark-200 text-dark-800'
                                  : quotesCount > 0
                                  ? 'bg-brand-50 border-brand-200 text-brand-700 hover:bg-brand-100'
                                  : 'bg-white border-dark-200 text-dark-600 hover:bg-dark-50'
                              }`}
                            >
                              <span>
                                {quotesCount > 0
                                  ? `Quotes (${quotesCount})`
                                  : 'View Bids (0)'}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expandable Section: Received Quotes/Bids */}
                      {isExpanded && (
                        <div className="bg-dark-50/70 border-t border-dark-200/80 p-4 sm:p-6 animate-fade-in space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs sm:text-sm font-bold font-display text-dark-900 flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-brand-600" />
                              Quotations Submitted by Sellers ({quotesCount})
                            </h4>
                            <span className="text-[11px] text-dark-400">
                              Review unit pricing, lead times, and accept terms
                            </span>
                          </div>

                          {quotesCount === 0 ? (
                            <div className="p-6 text-center rounded-xl bg-white border border-dark-200/80">
                              <Clock className="h-6 w-6 text-dark-400 mx-auto mb-1.5 animate-pulse" />
                              <p className="text-xs font-semibold text-dark-700">
                                Awaiting seller bids
                              </p>
                              <p className="text-[11px] text-dark-400 mt-0.5">
                                Verified suppliers have received your RFQ and will submit competitive quotes shortly.
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-3.5">
                              {rfq.quotes.map((quote) => {
                                const isQuoteAccepted =
                                  String(quote.status).toLowerCase() === 'accepted';
                                const isProcessingThis = acceptingQuoteId === quote.id;
                                const offeredUnitPrice =
                                  quote.amount ?? quote.offeredPrice ?? quote.unitPrice ?? 0;
                                const calculatedTotal =
                                  quote.totalPrice ||
                                  (offeredUnitPrice > 0 ? offeredUnitPrice * (rfq.quantity || 1) : 0);

                                return (
                                  <div
                                    key={quote.id}
                                    className={`p-4 sm:p-5 rounded-xl border transition-all ${
                                      isQuoteAccepted
                                        ? 'bg-emerald-50/70 border-emerald-300 shadow-sm'
                                        : 'bg-white border-dark-200 hover:border-dark-300'
                                    }`}
                                  >
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                      {/* Seller details */}
                                      <div className="space-y-1.5 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <div className="h-7 w-7 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs">
                                            {(quote.sellerCompany || quote.sellerName || 'S')[0]}
                                          </div>
                                          <span className="text-sm font-bold text-dark-900">
                                            {quote.sellerCompany || quote.sellerName || 'Verified Supplier'}
                                          </span>
                                          {isQuoteAccepted ? (
                                            <span className="badge-green text-[10px] py-0.5">
                                              Accepted Deal
                                            </span>
                                          ) : (
                                            <span className="badge-orange text-[10px] py-0.5">
                                              Pending Decision
                                            </span>
                                          )}
                                        </div>

                                        {quote.notes && (
                                          <p className="text-xs text-dark-600 italic bg-dark-50 p-2.5 rounded-lg border border-dark-100">
                                            &ldquo;{quote.notes}&rdquo;
                                          </p>
                                        )}

                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-dark-500 pt-1">
                                          {quote.leadTime && (
                                            <span>
                                              Lead Time: <strong>{quote.leadTime}</strong>
                                            </span>
                                          )}
                                          {quote.deliveryDate && (
                                            <span>
                                              Est. Delivery: <strong>{formatDate(quote.deliveryDate)}</strong>
                                            </span>
                                          )}
                                          {quote.validUntil && (
                                            <span>
                                              Valid Until: <strong>{formatDate(quote.validUntil)}</strong>
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Price & Accept button */}
                                      <div className="flex items-center justify-between lg:justify-end gap-6 pt-3 lg:pt-0 border-t lg:border-t-0 border-dark-100">
                                        <div className="text-left lg:text-right">
                                          <div className="text-xs text-dark-400">Offered Price</div>
                                          <div className="text-lg font-bold font-display text-brand-700">
                                            ₹{offeredUnitPrice.toLocaleString('en-IN')}
                                            <span className="text-xs font-normal text-dark-500">
                                              /{rfq.unit}
                                            </span>
                                          </div>
                                          <div className="text-[11px] text-dark-500">
                                            Total: ₹{calculatedTotal.toLocaleString('en-IN')}
                                          </div>
                                        </div>

                                        <div>
                                          {isQuoteAccepted ? (
                                            <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-sm">
                                              <CheckCircle2 className="h-4 w-4" />
                                              Accepted
                                            </div>
                                          ) : (
                                            <button
                                              onClick={() => setConfirmAcceptModal({ rfq, quote })}
                                              disabled={isProcessingThis}
                                              className="btn-primary text-xs py-2.5 px-4 font-bold shadow-sm shadow-brand-600/10 flex items-center gap-1.5"
                                            >
                                              {isProcessingThis ? (
                                                <>
                                                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                                  Accepting...
                                                </>
                                              ) : (
                                                <>
                                                  <Check className="h-3.5 w-3.5" />
                                                  Accept Quotation
                                                </>
                                              )}
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

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="card p-4 flex items-center justify-between text-xs text-dark-600 mt-6">
                    <div>
                      Page <strong className="text-dark-900">{page + 1}</strong> of{' '}
                      <strong className="text-dark-900">{totalPages}</strong> (Total {totalElements} RFQs)
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => fetchRFQs(page - 1)}
                        disabled={page === 0 || isListLoading}
                        className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 disabled:opacity-40"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        Previous
                      </button>
                      <button
                        onClick={() => fetchRFQs(page + 1)}
                        disabled={page + 1 >= totalPages || isListLoading}
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
        )}
      </div>

      {/* ──────────────── ACCEPT QUOTE CONFIRMATION MODAL ──────────────── */}
      {confirmAcceptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-900/60 backdrop-blur-sm animate-fade-in">
          <div className="card max-w-md w-full p-6 space-y-4 shadow-2xl animate-scale-up">
            <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <Check className="h-6 w-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold font-display text-dark-900">
                Confirm Accept Quotation
              </h3>
              <p className="text-xs text-dark-500 mt-1">
                You are about to accept this seller bid. This will notify the seller to finalize trade order and dispatch.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-dark-50 border border-dark-100 text-xs text-dark-700 space-y-2">
              <div className="flex justify-between">
                <span className="text-dark-400">Supplier:</span>
                <span className="font-bold text-dark-900">
                  {confirmAcceptModal.quote.sellerCompany || confirmAcceptModal.quote.sellerName || 'Verified Seller'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Offered Rate:</span>
                <span className="font-bold text-emerald-700">
                  ₹{(confirmAcceptModal.quote.offeredPrice ?? confirmAcceptModal.quote.unitPrice ?? 0).toLocaleString('en-IN')}/{confirmAcceptModal.rfq.unit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Total Value ({confirmAcceptModal.rfq.quantity} {confirmAcceptModal.rfq.unit}):</span>
                <span className="font-bold text-dark-900">
                  ₹{(
                    (confirmAcceptModal.quote.offeredPrice ?? confirmAcceptModal.quote.unitPrice ?? 0) *
                    confirmAcceptModal.rfq.quantity
                  ).toLocaleString('en-IN')}
                </span>
              </div>
              {confirmAcceptModal.quote.leadTime && (
                <div className="flex justify-between">
                  <span className="text-dark-400">Lead Time:</span>
                  <span className="font-medium text-dark-800">{confirmAcceptModal.quote.leadTime}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmAcceptModal(null)}
                className="btn-secondary flex-1 text-xs py-2.5"
                disabled={Boolean(acceptingQuoteId)}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  handleAcceptQuote(confirmAcceptModal.rfq, confirmAcceptModal.quote)
                }
                disabled={Boolean(acceptingQuoteId)}
                className="btn-primary flex-1 text-xs py-2.5 font-bold shadow-md shadow-brand-600/20 flex items-center justify-center gap-1.5"
              >
                {acceptingQuoteId ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Yes, Accept Quote
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
