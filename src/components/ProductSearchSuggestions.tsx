'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Package, Search } from 'lucide-react';
import { productsApi } from '@/api/products.api';
import { formatCurrency } from '@/lib/utils';
import type { Product } from '@/types/product';

interface ProductSearchSuggestionsProps {
  query: string;
  onSelect?: () => void;
}

export default function ProductSearchSuggestions({ query, onSelect }: ProductSearchSuggestionsProps) {
  const normalizedQuery = query.trim();
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!normalizedQuery) {
      setSuggestions([]);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const timer = setTimeout(() => {
      productsApi
        .getProducts({ search: normalizedQuery, limit: 5 })
        .then((res) => {
          if (isMounted) {
            setSuggestions(res.products || []);
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setSuggestions([]);
            setIsLoading(false);
          }
        });
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [normalizedQuery]);

  if (!normalizedQuery) return null;

  return (
    <div
      key={normalizedQuery.toLowerCase()}
      className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-xl border border-dark-200 bg-white shadow-xl opacity-100"
      role="listbox"
      aria-label="Product suggestions"
    >
      {suggestions.length > 0 ? (
        <>
          <div className="flex items-center gap-2 border-b border-dark-100 bg-dark-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-dark-500">
            <Search className="h-3.5 w-3.5 text-brand-600" />
            Matching products
          </div>
          <div className="divide-y divide-dark-100">
            {suggestions.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.slug || product.id}`}
                onClick={onSelect}
                role="option"
                className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-brand-50 focus:bg-brand-50 focus:outline-none"
              >
                <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-dark-100">
                  {product.images?.[0] ? (
                    <Image src={product.images[0]} alt="" fill sizes="40px" className="object-cover" />
                  ) : (
                    <Package className="m-2 h-6 w-6 text-dark-400" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-dark-900">{product.name}</p>
                  <p className="truncate text-[11px] text-dark-500">
                    {product.category} · {product.subCategory}
                  </p>
                </div>
                <span className="whitespace-nowrap text-[11px] font-bold text-brand-700">
                  {formatCurrency(product.price)}/{product.unit}
                </span>
              </Link>
            ))}
          </div>
          <Link
            href={`/products?search=${encodeURIComponent(normalizedQuery)}`}
            onClick={onSelect}
            className="flex items-center justify-between border-t border-dark-100 px-3 py-2.5 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50 focus:bg-brand-50 focus:outline-none"
          >
            View all matches for &ldquo;{normalizedQuery}&rdquo;
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </>
      ) : isLoading ? (
        <div className="flex items-center gap-2 px-3 py-4 text-xs text-dark-500">
          <div className="h-3.5 w-3.5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          Searching...
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-4 text-xs text-dark-500">
          <Package className="h-4 w-4 text-dark-400" />
          No products match &ldquo;{normalizedQuery}&rdquo; yet.
        </div>
      )}
    </div>
  );
}
