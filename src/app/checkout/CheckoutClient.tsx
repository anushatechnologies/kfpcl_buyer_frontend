'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Package,
  MapPin,
  Building2,
  Globe,
  Phone,
  CheckCircle2,
  ShoppingCart,
  Truck,
  FileText,
} from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { ordersApi } from '@/api/orders.api';
import { Order } from '@/types/order';
import { formatCurrency } from '@/lib/utils';
import LoginToContinueModal from '@/components/auth/LoginToContinueModal';

type Step = 'address' | 'review' | 'confirmed';

export default function CheckoutClient() {
  const { items, getSummary, clearCart } = useCartStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const summary = getSummary();
  const [step, setStep] = useState<Step>('address');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');

  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    phone: '',
    street: '',
    city: '',
    country: '',
    portOfDestination: '',
    specialInstructions: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePlaceOrder = async () => {
    if (!isAuthenticated) {
      setIsLoginModalOpen(true);
      return;
    }

    setIsSubmittingOrder(true);
    setOrderError('');

    try {
      const shippingAddress = [
        formData.companyName,
        `Contact: ${formData.contactName}${formData.phone ? ` (${formData.phone})` : ''}`,
        formData.street,
        `${formData.city}, ${formData.country}`,
        formData.portOfDestination ? `Port: ${formData.portOfDestination}` : '',
        formData.specialInstructions ? `Instructions: ${formData.specialInstructions}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const order = await ordersApi.createBuyerOrder(
        {
          items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
          shippingAddress,
        },
        globalThis.crypto?.randomUUID?.() || `kfpcl-${Date.now()}`
      );

      setCreatedOrder(order);
      clearCart();
      setStep('confirmed');
    } catch (error) {
      console.error('Failed to create order', error);
      setOrderError('We could not place your order. Please try again.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  if (items.length === 0 && step !== 'confirmed') {
    return (
      <div className="section animate-fade-in">
        <div className="card p-16 text-center max-w-md mx-auto">
          <ShoppingCart className="h-16 w-16 text-dark-200 mx-auto mb-4" />
          <h2 className="text-xl font-semibold font-display text-dark-800 mb-2">
            Your cart is empty
          </h2>
          <p className="text-dark-500 mb-6">
            Add some products before checking out.
          </p>
          <Link href="/products" className="btn-primary">Browse Products</Link>
        </div>
      </div>
    );
  }

  if (step === 'confirmed') {
    const orderNumber = createdOrder?.orderNumber || 'Order';
    return (
      <div className="section animate-fade-in">
        <div className="card p-12 text-center max-w-lg mx-auto">
          <div className="h-20 w-20 rounded-full bg-brand-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="h-10 w-10 text-brand-600" />
          </div>
          <h1 className="text-2xl font-bold font-display text-dark-900 mb-2">
            Order Placed Successfully!
          </h1>
          <p className="text-dark-500 mb-2">Your order number is</p>
          <p className="text-xl font-bold font-display text-brand-700 mb-5">{orderNumber}</p>
          <p className="text-sm text-dark-500 mb-8">
            Our team will review your order and contact you within 24 hours with a
            confirmed proforma invoice and shipping details.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/orders" className="btn-primary">
              Track Order
            </Link>
            <Link href="/products" className="btn-secondary">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section animate-fade-in">
      <div className="mb-6">
        <Link href="/cart" className="inline-flex items-center gap-1.5 text-sm text-dark-500 hover:text-brand-600 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Cart
        </Link>
      </div>

      <h1 className="text-3xl font-bold font-display text-dark-900 mb-8">Checkout</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-8">
        {(['address', 'review'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 text-sm font-semibold ${
                step === s
                  ? 'text-brand-700'
                  : i === 0 && step === 'review'
                  ? 'text-brand-600'
                  : 'text-dark-400'
              }`}
            >
              <span
                className={`h-7 w-7 rounded-full flex items-center justify-center text-sm font-bold ${
                  i === 0 && step === 'review'
                    ? 'bg-brand-600 text-white'
                    : step === s
                    ? 'bg-brand-600 text-white'
                    : 'bg-dark-200 text-dark-500'
                }`}
              >
                {i === 0 && step === 'review' ? '✓' : i + 1}
              </span>
              {s === 'address' ? 'Shipping Address' : 'Review Order'}
            </div>
            {i < 1 && <span className="text-dark-300">→</span>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Main Form ── */}
        <div className="lg:col-span-2">
          {step === 'address' && (
            <div className="card p-6 space-y-5">
              <h2 className="text-lg font-semibold font-display text-dark-900 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-brand-600" />
                Shipping / Delivery Details
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Company Name *</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400 pointer-events-none" />
                    <input
                      name="companyName"
                      type="text"
                      placeholder="Your company name"
                      className="form-input pl-9"
                      value={formData.companyName}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label">Contact Person *</label>
                  <input
                    name="contactName"
                    type="text"
                    placeholder="Full name"
                    className="form-input"
                    value={formData.contactName}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Phone *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400 pointer-events-none" />
                  <input
                    name="phone"
                    type="tel"
                    placeholder="+971 50 000 0000"
                    className="form-input pl-9"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Street / Area *</label>
                <input
                  name="street"
                  type="text"
                  placeholder="Street address or industrial zone"
                  className="form-input"
                  value={formData.street}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">City *</label>
                  <input
                    name="city"
                    type="text"
                    placeholder="e.g. Dubai"
                    className="form-input"
                    value={formData.city}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="form-label">Country *</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400 pointer-events-none" />
                    <select
                      name="country"
                      className="form-input pl-9"
                      value={formData.country}
                      onChange={handleChange}
                    >
                      <option value="">Select country…</option>
                      <option>UAE</option>
                      <option>Saudi Arabia</option>
                      <option>Qatar</option>
                      <option>Kuwait</option>
                      <option>Bahrain</option>
                      <option>Oman</option>
                      <option>Netherlands</option>
                      <option>United Kingdom</option>
                      <option>Germany</option>
                      <option>USA</option>
                      <option>Canada</option>
                      <option>Australia</option>
                      <option>Singapore</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="form-label">Port of Destination</label>
                <div className="relative">
                  <Truck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400 pointer-events-none" />
                  <input
                    name="portOfDestination"
                    type="text"
                    placeholder="e.g. Jebel Ali Port, Dubai"
                    className="form-input pl-9"
                    value={formData.portOfDestination}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Special Instructions</label>
                <textarea
                  name="specialInstructions"
                  rows={3}
                  placeholder="Packaging requirements, delivery window, documents needed…"
                  className="form-input resize-none h-auto py-3"
                  value={formData.specialInstructions}
                  onChange={handleChange}
                />
              </div>

              <button
                onClick={() => setStep('review')}
                className="btn-primary w-full"
                disabled={!formData.companyName || !formData.contactName || !formData.city || !formData.country}
              >
                Continue to Review
              </button>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-4">
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold font-display text-dark-900 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-brand-600" />
                    Shipping Address
                  </h2>
                  <button
                    onClick={() => setStep('address')}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <div className="text-sm text-dark-700 space-y-1">
                  <p className="font-semibold">{formData.companyName}</p>
                  <p>{formData.contactName} · {formData.phone}</p>
                  <p>{formData.street}</p>
                  <p>{formData.city}, {formData.country}</p>
                  {formData.portOfDestination && (
                    <p className="text-dark-500">Port: {formData.portOfDestination}</p>
                  )}
                </div>
              </div>

              <div className="card p-5">
                <h2 className="font-semibold font-display text-dark-900 flex items-center gap-2 mb-4">
                  <Package className="h-4 w-4 text-brand-600" />
                  Order Items
                </h2>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.productId} className="flex items-center gap-3">
                      <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-brand-50 flex-shrink-0">
                        {item.productImage ? (
                          <Image src={item.productImage} alt={item.productName} fill className="object-cover" sizes="48px" />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Package className="h-6 w-6 text-brand-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-dark-900">{item.productName}</p>
                        <p className="text-xs text-dark-400">{item.quantity} {item.unit}</p>
                      </div>
                      <p className="font-semibold text-sm text-dark-900">
                        {formatCurrency(item.unitPrice * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-brand-50 rounded-xl border border-brand-100 p-4">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-brand-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-brand-800">Next Steps</p>
                    <p className="text-xs text-brand-700 mt-1 leading-relaxed">
                      After placing your order, our export team will send you a Proforma Invoice within 24 hours.
                      Payment terms and freight charges will be confirmed before final processing.
                    </p>
                  </div>
                </div>
              </div>

              {orderError && (
                <p className="text-sm text-red-600 text-center" role="alert">{orderError}</p>
              )}
              <button
                onClick={handlePlaceOrder}
                className="btn-primary w-full text-base py-3"
                disabled={isSubmittingOrder}
              >
                <CheckCircle2 className="h-5 w-5" />
                {isSubmittingOrder ? 'Placing Order...' : 'Place Order'}
              </button>
              <p className="text-xs text-center text-dark-400">
                By placing your order, you agree to our Terms of Service. No payment is collected at this stage.
              </p>
            </div>
          )}
        </div>

        {/* ── Order Summary Sidebar ── */}
        <div>
          <div className="card p-5">
            <h3 className="font-semibold text-dark-900 mb-4">Order Summary</h3>
            <div className="space-y-2 mb-4">
              {items.map((item) => (
                <div key={item.productId} className="flex justify-between text-sm">
                  <span className="text-dark-600 line-clamp-1 flex-1 mr-2">
                    {item.productName}
                  </span>
                  <span className="font-medium text-dark-900 flex-shrink-0">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-dark-100 pt-3">
              <div className="flex justify-between font-bold text-dark-900">
                <span>Subtotal</span>
                <span className="text-brand-700">{formatCurrency(summary.subtotal)}</span>
              </div>
              <p className="text-xs text-dark-400 mt-1">+ Freight & duties (to be quoted)</p>
            </div>
          </div>
        </div>
      </div>
      <LoginToContinueModal
        isOpen={isLoginModalOpen}
        nextPath="/checkout"
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}
