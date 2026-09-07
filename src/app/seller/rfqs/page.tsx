'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Clock,
  Send,
  RefreshCw,
  Search,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';
import { rfqApi } from '@/api/rfq.api';
import { RFQ, Quote } from '@/types/rfq';
import { formatDate } from '@/lib/utils';

export default function SellerRFQsPage() {
  const [activeTab, setActiveTab] = useState<'feed' | 'my-quotes'>('feed');
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [myQuotes, setMyQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Quoting modal state
  const [quotingRfq, setQuotingRfq] = useState<RFQ | null>(null);
  const [offeredPrice, setOfferedPrice] = useState<string>('');
  const [leadTime, setLeadTime] = useState<string>('3-5 days');
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);
  const [quoteSuccessMsg, setQuoteSuccessMsg] = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    setIsLoading(true);
    try {
      const [feedData, quotesData] = await Promise.all([
        rfqApi.getSellerRFQFeed(),
        rfqApi.getMyQuotes(),
      ]);
      setRfqs(feedData || []);
      setMyQuotes(quotesData || []);
    } catch (err) {
      console.error('Failed to load seller RFQ feed', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handleOpenQuoteModal = (rfq: RFQ) => {
    setQuotingRfq(rfq);
    setOfferedPrice(rfq.targetPrice ? String(rfq.targetPrice) : '');
    setLeadTime('3-5 days');
    setDeliveryDate(rfq.requiredByDate || rfq.deliveryDate || '');
    setNotes('');
  };

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotingRfq || !offeredPrice) return;

    setIsSubmittingQuote(true);
    try {
      await rfqApi.submitQuoteToFeed(quotingRfq.id, {
        offeredPrice: parseFloat(offeredPrice),
        leadTime,
        validUntil: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        deliveryDate,
        notes,
      });

      setQuoteSuccessMsg(
        `Quotation of ₹${parseFloat(offeredPrice).toLocaleString('en-IN')}/${quotingRfq.unit} submitted successfully for "${quotingRfq.title || quotingRfq.productName}"!`
      );
      setQuotingRfq(null);
      loadFeed();
    } catch (err: any) {
      console.error('Failed to submit quote', err);
      alert(err?.response?.data?.message || 'Failed to submit quote. Please try again.');
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  const filteredRfqs = rfqs.filter((rfq) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (rfq.title && rfq.title.toLowerCase().includes(q)) ||
      (rfq.productName && rfq.productName.toLowerCase().includes(q)) ||
      (rfq.description && rfq.description.toLowerCase().includes(q)) ||
      (rfq.buyerCompany && rfq.buyerCompany.toLowerCase().includes(q))
    );
  });

  return (
    <div className="section animate-fade-in py-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-dark-900 flex items-center gap-2.5">
            <FileText className="h-7 w-7 text-brand-600" />
            Supplier RFQ Feed &amp; Bids
          </h1>
          <p className="text-xs sm:text-sm text-dark-500 mt-1">
            Browse live quotation requests from global buyers and submit competitive quotations.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="inline-flex p-1 bg-dark-100 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('feed')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'feed' ? 'bg-white text-brand-700 shadow-sm' : 'text-dark-600 hover:text-dark-900'
            }`}
          >
            Open Buyer RFQs ({rfqs.length})
          </button>
          <button
            onClick={() => setActiveTab('my-quotes')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'my-quotes' ? 'bg-white text-brand-700 shadow-sm' : 'text-dark-600 hover:text-dark-900'
            }`}
          >
            My Submitted Bids ({myQuotes.length})
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {quoteSuccessMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-800 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            <span>{quoteSuccessMsg}</span>
          </div>
          <button
            onClick={() => setQuoteSuccessMsg(null)}
            className="text-xs font-bold text-emerald-700 hover:underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ─── TAB 1: OPEN RFQ FEED ─── */}
      {activeTab === 'feed' && (
        <div className="space-y-5">
          {/* Search bar */}
          <div className="card p-3.5 sm:p-4 flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-dark-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search open buyer requests by commodity, buyer, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-dark-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
            <button
              onClick={loadFeed}
              disabled={isLoading}
              className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 flex-shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {isLoading ? (
            <div className="card p-12 flex flex-col items-center justify-center gap-3">
              <div className="h-10 w-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-dark-500">Loading open RFQ feed...</p>
            </div>
          ) : filteredRfqs.length === 0 ? (
            <div className="card p-12 text-center flex flex-col items-center justify-center">
              <div className="h-14 w-14 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 mb-4">
                <FileText className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-dark-900 mb-1">No Open RFQs Available</h3>
              <p className="text-xs text-dark-500 max-w-sm">
                New buyer quotation enquiries will appear here in real-time as buyers broadcast requirements.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRfqs.map((rfq) => (
                <div
                  key={rfq.id}
                  className="card p-5 sm:p-6 border border-dark-200/90 hover:border-brand-300 transition-all shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="badge-orange text-[11px] font-bold">Open for Quotations</span>
                        <span className="text-xs text-dark-400 flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          Posted {formatDate(rfq.createdAt)}
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-bold font-display text-dark-900">
                        {rfq.title || rfq.productName}
                      </h3>

                      {rfq.description && (
                        <p className="text-xs text-dark-600 leading-relaxed">
                          {rfq.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-xs text-dark-700">
                        <div>
                          <span className="text-dark-400">Buyer:</span>{' '}
                          <strong className="text-dark-900">{rfq.buyerCompany || rfq.buyerName || 'Verified Buyer'}</strong>
                          {rfq.deliveryLocation ? ` · ${rfq.deliveryLocation}` : ''}
                        </div>
                        <div>
                          <span className="text-dark-400">Volume:</span>{' '}
                          <strong className="text-dark-900">
                            {rfq.quantity} {rfq.unit}
                          </strong>
                        </div>
                        {rfq.targetPrice && (
                          <div>
                            <span className="text-dark-400">Buyer Target:</span>{' '}
                            <strong className="text-emerald-700">
                              ₹{rfq.targetPrice.toLocaleString('en-IN')}/{rfq.unit}
                            </strong>
                          </div>
                        )}
                        {(rfq.requiredByDate || rfq.deliveryDate) && (
                          <div className="flex items-center gap-1">
                            <span className="text-dark-400">Required By:</span>{' '}
                            <strong className="text-dark-900">
                              {formatDate(rfq.requiredByDate || rfq.deliveryDate || '')}
                            </strong>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-dark-100">
                      <button
                        onClick={() => handleOpenQuoteModal(rfq)}
                        className="btn-primary text-xs py-2.5 px-4 font-bold shadow-sm shadow-brand-600/10 flex items-center gap-1.5"
                      >
                        <DollarSign className="h-4 w-4" />
                        Send Price Quote
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: MY SUBMITTED QUOTES ─── */}
      {activeTab === 'my-quotes' && (
        <div className="space-y-4">
          {myQuotes.length === 0 ? (
            <div className="card p-12 text-center flex flex-col items-center justify-center">
              <div className="h-14 w-14 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 mb-4">
                <Send className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-dark-900 mb-1">No Quotes Submitted Yet</h3>
              <p className="text-xs text-dark-500 max-w-sm mb-4">
                You haven&apos;t submitted any price bids yet. Browse the RFQ feed to quote on buyer requests.
              </p>
              <button onClick={() => setActiveTab('feed')} className="btn-primary text-xs">
                Browse Open RFQs
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myQuotes.map((quote) => (
                <div key={quote.id} className="card p-5 border border-dark-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            String(quote.status).toLowerCase() === 'accepted'
                              ? 'badge-green'
                              : 'badge-orange'
                          }
                        >
                          {quote.status}
                        </span>
                        <span className="text-xs text-dark-400">
                          Submitted {formatDate(quote.createdAt || '')}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-dark-900">
                        Quotation ID: #{quote.id}
                      </p>
                      {quote.notes && (
                        <p className="text-xs text-dark-600 italic bg-dark-50 p-2 rounded-lg">
                          &ldquo;{quote.notes}&rdquo;
                        </p>
                      )}
                      <div className="flex flex-wrap gap-4 text-xs text-dark-500 pt-1">
                        {quote.leadTime && <span>Lead Time: <strong>{quote.leadTime}</strong></span>}
                        {quote.deliveryDate && <span>Delivery: <strong>{formatDate(quote.deliveryDate)}</strong></span>}
                        {quote.validUntil && <span>Valid Till: <strong>{formatDate(quote.validUntil)}</strong></span>}
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-xs text-dark-400">Quoted Rate</div>
                      <div className="text-lg font-bold font-display text-brand-700">
                        ₹{(quote.offeredPrice ?? quote.unitPrice ?? 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── QUOTE SUBMISSION MODAL ─── */}
      {quotingRfq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-900/60 backdrop-blur-sm animate-fade-in">
          <div className="card max-w-lg w-full p-6 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold font-display text-dark-900">
                  Submit Quotation
                </h3>
                <p className="text-xs text-dark-500">
                  Send your commercial offer for &ldquo;{quotingRfq.title || quotingRfq.productName}&rdquo;
                </p>
              </div>
              <span className="badge-orange text-xs">Direct Bid</span>
            </div>

            {/* Buyer summary pill */}
            <div className="p-3.5 rounded-xl bg-dark-50 border border-dark-100 text-xs text-dark-700 space-y-1">
              <div className="flex justify-between">
                <span className="text-dark-400">Required Quantity:</span>
                <span className="font-bold text-dark-900">{quotingRfq.quantity} {quotingRfq.unit}</span>
              </div>
              {quotingRfq.targetPrice && (
                <div className="flex justify-between">
                  <span className="text-dark-400">Buyer Target Price:</span>
                  <span className="font-bold text-emerald-700">₹{quotingRfq.targetPrice.toLocaleString('en-IN')}/{quotingRfq.unit}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmitQuote} className="space-y-3.5">
              <div>
                <label className="form-label font-semibold text-dark-800">
                  Your Offered Price (₹ per {quotingRfq.unit}) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-dark-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 48.5"
                    value={offeredPrice}
                    onChange={(e) => setOfferedPrice(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-dark-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
                {offeredPrice && (
                  <p className="text-[11px] text-dark-500 mt-1">
                    Total Quoted Amount: <strong className="text-dark-900">₹{(parseFloat(offeredPrice || '0') * quotingRfq.quantity).toLocaleString('en-IN')}</strong>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label font-semibold text-dark-800">Lead Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 3-5 days"
                    value={leadTime}
                    onChange={(e) => setLeadTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-dark-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="form-label font-semibold text-dark-800">Delivery Date</label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-dark-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="form-label font-semibold text-dark-800">Seller Notes / Commercial Terms</label>
                <textarea
                  rows={2}
                  placeholder="Includes 25kg PP bag packing, EXW Rajkot, lab report attached on dispatch..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-dark-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setQuotingRfq(null)}
                  className="btn-secondary flex-1 text-xs py-2.5"
                  disabled={isSubmittingQuote}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingQuote || !offeredPrice}
                  className="btn-primary flex-1 text-xs py-2.5 font-bold shadow-md shadow-brand-600/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingQuote ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Submitting Quote...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Submit Quotation
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
