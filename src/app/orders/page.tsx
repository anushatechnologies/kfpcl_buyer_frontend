'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Package, Truck, CheckCircle2, Clock, ShoppingBag } from 'lucide-react';
import { ordersApi } from '@/api/orders.api';
import { Order } from '@/types/order';
import { formatCurrency, formatDate, cn } from '@/lib/utils';

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: 'Pending', color: 'badge-orange', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'badge-green', icon: CheckCircle2 },
  processing: { label: 'Processing', color: 'badge-orange', icon: Package },
  shipped: { label: 'Shipped', color: 'badge-green', icon: Truck },
  delivered: { label: 'Delivered', color: 'badge-green', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'badge-gray', icon: Clock },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    ordersApi
      .getBuyerOrders()
      .then((data) => {
        if (isMounted) {
          setOrders(data || []);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load orders', err);
        if (isMounted) {
          setOrders([]);
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="section animate-fade-in">
      <h1 className="text-3xl font-bold font-display text-dark-900 mb-8">My Orders</h1>

      {isLoading ? (
        <div className="card p-12 flex flex-col items-center justify-center gap-3">
          <div className="h-10 w-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-dark-500">Loading your orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="card p-12 text-center flex flex-col items-center justify-center">
          <div className="h-14 w-14 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 mb-4">
            <ShoppingBag className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-dark-900 mb-1">No Orders Placed Yet</h3>
          <p className="text-xs text-dark-500 max-w-sm mb-6">
            You have not placed any commercial trade orders yet. Explore our export catalog to begin.
          </p>
          <Link href="/products" className="btn-primary text-xs py-2 px-4">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusInfo = STATUS_MAP[order.status] ?? STATUS_MAP.pending;
            const StatusIcon = statusInfo.icon;
            return (
              <div key={order.id} className="card p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="text-xs text-dark-400 mb-0.5">Order Number</p>
                    <p className="font-bold text-dark-900 font-display">{order.orderNumber}</p>
                  </div>
                  <span className={cn(statusInfo.color, 'flex items-center gap-1.5')}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    {statusInfo.label}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                        <Package className="h-6 w-6 text-brand-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-dark-900 truncate">{item.productName}</p>
                        <p className="text-xs text-dark-400">
                          {item.quantity} {item.unit} · {formatCurrency(item.unitPrice)}/{item.unit}
                        </p>
                      </div>
                      <p className="font-semibold text-dark-900 text-sm flex-shrink-0">
                        {formatCurrency(item.totalPrice)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row justify-between gap-2 text-sm text-dark-500 pt-4 border-t border-dark-100">
                  <div className="flex gap-4">
                    <span>Seller: <strong className="text-dark-700">{order.sellerName}</strong></span>
                    {order.trackingNumber && (
                      <span>Tracking: <strong className="text-dark-700">{order.trackingNumber}</strong></span>
                    )}
                  </div>
                  <div className="flex gap-4">
                    <span>Ordered: {formatDate(order.createdAt)}</span>
                    <span className="font-bold text-dark-900">Total: {formatCurrency(order.total)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
