'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart,
  Package,
  Trash2,
  ArrowRight,
  Plus,
  Minus,
  ArrowLeft,
  FileText,
} from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency } from '@/lib/utils';
import LoginToContinueModal from '@/components/auth/LoginToContinueModal';

export default function CartPageClient() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, clearCart, getSummary, syncWithBackend } = useCartStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  useEffect(() => {
    syncWithBackend();
  }, [syncWithBackend]);

  const summary = getSummary();
  const isEmpty = items.length === 0;


  const handleQtyChange = (productId: string, newQty: number, minOrderQty: number) => {
    if (newQty < minOrderQty) {
      removeItem(productId);
    } else {
      updateQuantity(productId, newQty);
    }
  };

  const handleProceedToCheckout = () => {
    if (!isAuthenticated) {
      setIsLoginModalOpen(true);
      return;
    }

    router.push('/checkout');
  };

  return (
    <div className="section animate-fade-in">
      <h1 className="text-3xl font-bold font-display text-dark-900 mb-8 flex items-center gap-3">
        <ShoppingCart className="h-7 w-7 text-brand-600" />
        Enquiry Cart
        {!isEmpty && (
          <span className="ml-2 h-7 w-7 flex items-center justify-center rounded-full bg-brand-600 text-white text-sm font-bold">
            {summary.itemCount}
          </span>
        )}
      </h1>

      {isEmpty ? (
        <div className="card p-16 text-center">
          <div className="h-20 w-20 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-5">
            <ShoppingCart className="h-10 w-10 text-brand-300" />
          </div>
          <h2 className="text-xl font-semibold font-display text-dark-800 mb-2">
            Your cart is empty
          </h2>
          <p className="text-dark-500 mb-6">
            Add products to your cart to start an enquiry or proceed to checkout.
          </p>
          <Link href="/products" className="btn-primary">
            <Package className="h-4 w-4" />
            Browse Products
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Cart Items ── */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <Link
                href="/products"
                className="inline-flex items-center gap-1.5 text-sm text-dark-500 hover:text-brand-600 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Continue Shopping
              </Link>
              <button
                onClick={clearCart}
                className="text-xs text-red-500 hover:text-red-700 hover:underline transition-colors"
              >
                Clear cart
              </button>
            </div>

            {items.map((item) => (
              <div key={item.productId} className="card p-4">
                <div className="flex gap-4">
                  {/* Image */}
                  <div className="relative h-20 w-20 rounded-lg overflow-hidden bg-brand-50 flex-shrink-0">
                    {item.productImage ? (
                      <Image
                        src={item.productImage}
                        alt={item.productName}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Package className="h-8 w-8 text-brand-300" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-dark-900 line-clamp-1">
                          {item.productName}
                        </p>
                        <p className="text-xs text-dark-400 mt-0.5">Seller: {item.seller}</p>
                      </div>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="p-1.5 rounded-md text-dark-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      {/* Quantity control */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            handleQtyChange(
                              item.productId,
                              item.quantity - item.minOrderQty,
                              item.minOrderQty
                            )
                          }
                          className="h-8 w-8 rounded-lg border border-dark-200 flex items-center justify-center text-dark-600 hover:border-brand-400 hover:text-brand-600 transition-colors"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-16 text-center text-sm font-semibold text-dark-900">
                          {item.quantity}
                          <span className="text-xs font-normal text-dark-400 ml-1">
                            {item.unit}
                          </span>
                        </span>
                        <button
                          onClick={() =>
                            handleQtyChange(
                              item.productId,
                              item.quantity + item.minOrderQty,
                              item.minOrderQty
                            )
                          }
                          className="h-8 w-8 rounded-lg border border-dark-200 flex items-center justify-center text-dark-600 hover:border-brand-400 hover:text-brand-600 transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <p className="font-bold text-dark-900">
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </p>
                        <p className="text-xs text-dark-400">
                          {formatCurrency(item.unitPrice)}/{item.unit}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-dark-400 mt-1.5">
                      Min. order: {item.minOrderQty} {item.unit} · increments of{' '}
                      {item.minOrderQty} {item.unit}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Order Summary ── */}
          <div className="space-y-4">
            <div className="card p-5">
              <h3 className="font-semibold text-dark-900 mb-4 font-display text-lg">
                Order Summary
              </h3>

              <div className="space-y-3 mb-5">
                {items.map((item) => (
                  <div key={item.productId} className="flex justify-between text-sm">
                    <span className="text-dark-600 line-clamp-1 flex-1 mr-3">
                      {item.productName} × {item.quantity} {item.unit}
                    </span>
                    <span className="font-medium text-dark-900 flex-shrink-0">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dark-100 pt-4 space-y-2">
                <div className="flex justify-between text-sm text-dark-600">
                  <span>Subtotal ({summary.itemCount} items)</span>
                  <span className="font-medium">{formatCurrency(summary.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-dark-500">
                  <span>Freight &amp; Insurance</span>
                  <span>To be quoted</span>
                </div>
                <div className="flex justify-between text-sm text-dark-500">
                  <span>Customs &amp; Duties</span>
                  <span>As per destination</span>
                </div>
              </div>

              <div className="border-t border-dark-200 pt-4 mt-3 mb-5">
                <div className="flex justify-between font-bold text-dark-900">
                  <span>Estimated Total</span>
                  <span className="text-brand-700">{formatCurrency(summary.subtotal)}</span>
                </div>
                <p className="text-xs text-dark-400 mt-1">
                  Freight &amp; duties will be calculated at checkout
                </p>
              </div>

              <div className="space-y-2.5">
                <button onClick={handleProceedToCheckout} className="btn-primary w-full">
                  Proceed to Checkout
                  <ArrowRight className="h-4 w-4" />
                </button>
                <Link href="/rfq" className="btn-secondary w-full">
                  <FileText className="h-4 w-4" />
                  Submit as RFQ Instead
                </Link>
              </div>

              <p className="text-xs text-center text-dark-400 mt-4">
                🔒 All transactions are secured and verified
              </p>
            </div>
          </div>
        </div>
      )}
      <LoginToContinueModal
        isOpen={isLoginModalOpen}
        nextPath="/checkout"
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}
