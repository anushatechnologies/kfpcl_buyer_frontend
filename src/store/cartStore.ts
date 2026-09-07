'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, CartSummary } from '@/types/cart';
import { cartApi } from '@/api/cart.api';

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  syncWithBackend: () => Promise<void>;
  getSummary: () => CartSummary;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId);
          const updatedItems = existing
            ? state.items.map((i) =>
                i.productId === item.productId
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              )
            : [...state.items, item];

          const targetQty = existing ? existing.quantity + item.quantity : item.quantity;
          cartApi.updateCartItem(item.productId, targetQty, item.variantId).catch(() => {});

          return { items: updatedItems };
        });
      },

      removeItem: (productId) => {
        const currentItem = get().items.find((i) => i.productId === productId);
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        }));

        if (currentItem?.id) {
          cartApi.removeCartItem(currentItem.id).catch(() => {});
        }
      },

      updateQuantity: (productId, quantity) => {
        const currentItem = get().items.find((i) => i.productId === productId);
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, quantity } : i
          ),
        }));

        if (currentItem) {
          cartApi.updateCartItem(productId, quantity, currentItem.variantId).catch(() => {});
        }
      },

      clearCart: () => set({ items: [] }),

      syncWithBackend: async () => {
        try {
          const backendCart = await cartApi.getCart();
          if (backendCart.items && backendCart.items.length > 0) {
            set((state) => {
              // Merge backend cart items with any local items
              const merged = [...state.items];
              backendCart.items.forEach((bItem) => {
                const existingIndex = merged.findIndex((m) => m.productId === bItem.productId);
                if (existingIndex >= 0) {
                  merged[existingIndex] = {
                    ...merged[existingIndex],
                    id: bItem.id || merged[existingIndex].id,
                    quantity: bItem.quantity || merged[existingIndex].quantity,
                  };
                } else {
                  merged.push({
                    id: bItem.id || `cart-${bItem.productId}`,
                    productId: bItem.productId,
                    productName: bItem.productName || 'Export Product',
                    productImage: bItem.imageUrl || '',
                    seller: 'Verified Supplier',
                    unitPrice: bItem.price ?? bItem.unitPrice ?? 0,
                    variantId: bItem.variantId,
                    quantity: bItem.quantity,
                    unit: bItem.unit || 'kg',
                    minOrderQty: 1,
                  });
                }
              });
              return { items: merged };
            });
          }
        } catch {
          // Keep local cart
        }
      },

      getSummary: (): CartSummary => {
        const { items } = get();
        return {
          items,
          subtotal: items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
          itemCount: items.length,
        };
      },
    }),
    {
      name: 'kfpcl-cart',
    }
  )
);

