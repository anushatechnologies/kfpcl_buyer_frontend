import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getVariantOriginalPrice, getVariantPrice } from "../lib/storefrontUtils";
import type { Product, Variant } from "../types/storefront";

export interface CartItem {
  productId: number;
  variantId: number;
  name: string;
  imageUrl: string;
  categoryName?: string;
  subCategoryName?: string;
  storeName?: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
  originalPrice?: number;
  stock?: number;
}

interface CartStore {
  cart: CartItem[];
  addItem: (product: Product, variant?: Variant | null, quantity?: number) => void;
  setQuantity: (variantId: number, quantity: number) => void;
  removeItem: (variantId: number) => void;
  clearCart: () => void;
  getItemQuantity: (variantId: number) => number;
  getProductCount: () => number;
  getTotalItems: () => number;
  getSubtotal: () => number;
  getOriginalSubtotal: () => number;
  getSavings: () => number;
  toServerPayload: () => Array<{ variantId: number; quantity: number }>;
}

const buildCartItem = (product: Product, variant?: Variant | null, quantity = 1): CartItem => {
  const selectedVariant = variant || product.primaryVariant;
  if (!selectedVariant) {
    throw new Error(`Product ${product.name} has no purchasable variant.`);
  }

  return {
    productId: product.id,
    variantId: selectedVariant.id,
    name: product.name,
    imageUrl: product.imageUrl,
    categoryName: product.categoryName,
    subCategoryName: product.subCategoryName,
    storeName: product.storeName,
    variantName: selectedVariant.name || "Standard pack",
    quantity,
    unitPrice: getVariantPrice(selectedVariant),
    originalPrice: getVariantOriginalPrice(selectedVariant),
    stock: selectedVariant.stock,
  };
};

const getAvailableStock = (stock?: number) => {
  const value = Number(stock);
  return Number.isFinite(value) ? Math.max(0, value) : undefined;
};

const clampQuantityToStock = (quantity: number, stock?: number) => {
  const safeQuantity = Math.max(1, Number(quantity) || 1);
  const availableStock = getAvailableStock(stock);
  return availableStock === undefined ? safeQuantity : Math.min(safeQuantity, availableStock);
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      cart: [],

      addItem: (product, variant, quantity = 1) =>
        set((state) => {
          const nextItem = buildCartItem(product, variant, quantity);
          const availableStock = getAvailableStock(nextItem.stock);
          if (availableStock !== undefined && availableStock <= 0) {
            return state;
          }

          const existingItem = state.cart.find((item) => item.variantId === nextItem.variantId);

          if (existingItem) {
            const nextQuantity = clampQuantityToStock(existingItem.quantity + quantity, existingItem.stock ?? nextItem.stock);

            return {
              cart: state.cart.map((item) =>
                item.variantId === nextItem.variantId
                  ? {
                      ...item,
                      stock: nextItem.stock,
                      quantity: nextQuantity,
                    }
                  : item,
              ),
            };
          }

          return {
            cart: [...state.cart, { ...nextItem, quantity: clampQuantityToStock(quantity, nextItem.stock) }],
          };
        }),

      setQuantity: (variantId, quantity) =>
        set((state) => {
          const existingItem = state.cart.find((item) => item.variantId === variantId);
          const availableStock = getAvailableStock(existingItem?.stock);

          if (quantity <= 0 || availableStock === 0) {
            return {
              cart: state.cart.filter((item) => item.variantId !== variantId),
            };
          }

          return {
            cart: state.cart.map((item) =>
              item.variantId === variantId
                ? {
                    ...item,
                    quantity: clampQuantityToStock(quantity, item.stock),
                  }
                : item,
            ),
          };
        }),

      removeItem: (variantId) =>
        set((state) => ({
          cart: state.cart.filter((item) => item.variantId !== variantId),
        })),

      clearCart: () => set({ cart: [] }),

      getItemQuantity: (variantId) =>
        get().cart.find((item) => item.variantId === variantId)?.quantity || 0,

      getProductCount: () => get().cart.length,

      getTotalItems: () => get().cart.reduce((total, item) => total + item.quantity, 0),

      getSubtotal: () =>
        get().cart.reduce((total, item) => total + item.unitPrice * item.quantity, 0),

      getOriginalSubtotal: () =>
        get().cart.reduce(
          (total, item) => total + (item.originalPrice || item.unitPrice) * item.quantity,
          0,
        ),

      getSavings: () => Math.max(0, get().getOriginalSubtotal() - get().getSubtotal()),

      toServerPayload: () =>
        get().cart.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
        })),
    }),
    {
      name: "kfpcl.customer.cart",
      partialize: (state) => ({
        cart: state.cart,
      }),
    },
  ),
);
