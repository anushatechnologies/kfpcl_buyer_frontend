'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Package, Truck, CheckCircle2, Clock } from 'lucide-react';
import { ordersApi } from '@/api/orders.api';
import { Order } from '@/types/order';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    ordersApi
      .getSellerOrders()
      .then((data) => {
        if (isMounted) {
          setOrders(data || []);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load seller orders', err);
        if (isMounted) {
          setOrders([]);
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleMarkShipped = async (orderId: string) => {
    setUpdatingOrderId(orderId);
    try {
      const updatedOrder = await ordersApi.updateSellerOrderStatus(orderId, { status: 'SHIPPED' });
      setOrders((currentOrders) =>
        currentOrders.map((order) => (order.id === orderId ? { ...order, ...updatedOrder } : order))
      );
    } catch (error) {
      console.error('Failed to mark order as shipped', error);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <div className="section animate-fade-in">
      <h1 className="text-3xl font-bold font-display text-dark-900 mb-8 flex items-center gap-2">
        <ShoppingCart className="h-7 w-7 text-brand-600" />
        Orders to Fulfil
      </h1>

      {isLoading ? (
        <div className="card p-12 flex flex-col items-center justify-center gap-3">
          <div className="h-10 w-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-dark-500">Loading seller orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="card p-12 text-center flex flex-col items-center justify-center">
          <div className="h-14 w-14 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 mb-4">
            <Package className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-dark-900 mb-1">No Orders Found</h3>
          <p className="text-xs text-dark-500 max-w-sm">
            You currently have no incoming buyer orders awaiting fulfillment.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="card p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <p className="font-bold font-display text-dark-900">{order.orderNumber}</p>
                  <p className="text-xs text-dark-400">
                    Buyer: {order.shippingAddress?.name || 'Commercial Buyer'} · {order.shippingAddress?.city || 'Port Hub'}, {order.shippingAddress?.state || 'India'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="badge-orange flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {order.status}
                  </span>
                  <button
                    className="btn-primary text-xs py-1.5 px-3"
                    onClick={() => handleMarkShipped(order.id)}
                    disabled={updatingOrderId === order.id || order.status === 'shipped'}
                  >
                    <Truck className="h-3.5 w-3.5" />
                    {updatingOrderId === order.id ? 'Updating...' : order.status === 'shipped' ? 'Shipped' : 'Mark Shipped'}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                      <Package className="h-5 w-5 text-brand-300" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-dark-900">{item.productName}</p>
                      <p className="text-xs text-dark-400">{item.quantity} {item.unit}</p>
                    </div>
                    <p className="font-semibold text-sm text-dark-900">{formatCurrency(item.totalPrice)}</p>
                  </div>
                ))}
              </div>

              <div className="flex justify-between text-sm text-dark-500 pt-4 border-t border-dark-100 mt-3">
                <span>Ordered {formatDate(order.createdAt)}</span>
                {order.estimatedDelivery && (
                  <span>Est. delivery: {formatDate(order.estimatedDelivery)}</span>
                )}
                <span className="font-bold text-dark-900">Total: {formatCurrency(order.total)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
