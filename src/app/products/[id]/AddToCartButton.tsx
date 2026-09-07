'use client';

import { useState } from 'react';
import { ShoppingCart, Check } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import LoginToContinueModal from '@/components/auth/LoginToContinueModal';
import type { Product, ProductVariant } from '@/types/product';

interface AddToCartButtonProps {
  product: Product;
  variant?: ProductVariant;
}

export default function AddToCartButton({ product, variant }: AddToCartButtonProps) {
  const addItem = useCartStore((s) => s.addItem);
  const items = useCartStore((s) => s.items);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [added, setAdded] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const inCart = items.some((i) => i.productId === product.id);

  const handleAdd = () => {
    if (!isAuthenticated) {
      setIsLoginModalOpen(true);
      return;
    }

    addItem({
      id: `cart-${product.id}-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      productImage: product.images?.[0] ?? '',
      seller: product.seller.name,
      unitPrice: variant?.price ?? product.price,
      variantId: variant?.id,
      quantity: product.minOrderQty,
      unit: product.unit,
      minOrderQty: product.minOrderQty,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (inCart) {
    return (
      <div className="flex items-center justify-center gap-2 h-10 rounded-lg bg-brand-50 border border-brand-200 text-brand-700 text-sm font-semibold">
        <Check className="h-4 w-4" />
        Added to Cart
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleAdd}
        disabled={!product.inStock || added}
        className="btn-secondary w-full disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {added ? (
          <>
            <Check className="h-4 w-4 text-brand-600" />
            Added!
          </>
        ) : (
          <>
            <ShoppingCart className="h-4 w-4" />
            Add to Enquiry Cart
          </>
        )}
      </button>
      <LoginToContinueModal
        isOpen={isLoginModalOpen}
        nextPath={`/products/${product.id}`}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </>
  );
}
