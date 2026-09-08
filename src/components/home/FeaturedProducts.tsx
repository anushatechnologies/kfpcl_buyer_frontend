'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Package,
  ArrowRight,
  Star,
  MapPin,
  Truck,
  ShieldCheck,
  Tag,
  Heart,
  Flame,
  Award,
  TrendingUp,
} from 'lucide-react';
import { productsApi } from '@/api/products.api';
import { categoriesApi, CategoryDto } from '@/api/categories.api';
import { Product } from '@/types/product';
import { formatCurrency } from '@/lib/utils';

function normalizeCategoryName(value: string) {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
}

export default function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    Promise.all([productsApi.getAllProducts(), categoriesApi.getCategories()])
      .then(([productsResponse, categoryItems]) => {
        if (isMounted) {
          setProducts(productsResponse.products || []);
          setCategories(categoryItems);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load featured products', err);
        if (isMounted) {
          setProducts([]);
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const filterTabs = [
    { key: 'all', value: 'all', label: 'All Products' },
    ...categories.map((category) => ({
      key: category.id,
      value: category.name,
      label: category.name,
    })),
  ];

  const toggleWishlist = (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setWishlist((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  // Dynamically filter products
  const filteredProducts =
    selectedFilter === 'all'
      ? products.slice(0, 8)
      : products
          .filter(
            (item) =>
              normalizeCategoryName(item.category) === normalizeCategoryName(selectedFilter)
          )
          .slice(0, 8);


  return (
    <section className="bg-white border-y border-dark-100/80">
      <div className="section py-10 lg:py-14 animate-fade-in">
        
        {/* ── 1. HEADER ROW ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#15803d] block mb-1">
              EXPLORE PRODUCTS
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-dark-900 tracking-tight">
              Trending Products
            </h2>
            <p className="text-xs sm:text-sm text-dark-500 mt-1">
              Top-selling exports handpicked by our team
            </p>
          </div>

          <Link
            href={
              selectedFilter === 'all'
                ? '/products'
                : `/products?category=${encodeURIComponent(selectedFilter)}`
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#16a34a] text-[#15803d] hover:bg-[#f0fdf4] font-semibold text-xs sm:text-sm transition-colors self-start sm:self-auto shadow-xs"
          >
            <span>View All {selectedFilter !== 'all' ? 'in Category' : 'Products'}</span>
            <ArrowRight className="h-4 w-4 text-[#16a34a]" />
          </Link>
        </div>

        {/* ── 2. FILTER PILLS & CONTROLS ROW ── */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-hide pb-1">
            {filterTabs.map((tab) => {
              const isActive = selectedFilter === tab.value;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedFilter(tab.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                    isActive
                      ? 'bg-[#15803d] text-white shadow-sm shadow-[#15803d]/20 ring-1 ring-[#15803d]'
                      : 'bg-white border border-dark-200/90 text-dark-700 hover:border-dark-300 hover:bg-dark-50/60'
                  }`}
                >
                  <Package className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-dark-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 3. PRODUCT CARDS GRID ── */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="rounded-xl sm:rounded-2xl bg-dark-100 animate-pulse h-64 sm:h-80" />
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {filteredProducts.map((product, idx) => {
              const isWishlisted = !!wishlist[product.id];
              const imageSrc = product.images?.[0] || '/images/categories/grains-pulses.jpg';

              return (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="group card overflow-hidden flex flex-col justify-between border-dark-200/90 hover:border-brand-400 hover:shadow-card-hover transition-all duration-200 rounded-xl sm:rounded-2xl bg-white"
                >
                  <div>
                    {/* Product Image Box */}
                    <div className="h-36 sm:h-52 w-full relative overflow-hidden bg-dark-100">
                      <Image
                        src={imageSrc}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                      />

                      {/* Top-Left Badge */}
                      <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[11px] font-bold border backdrop-blur-xs shadow-xs bg-[#ffedd5] text-[#9a3412] border-[#fed7aa]">
                          {idx % 2 === 0 ? (
                            <Flame className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-[#ea580c] fill-[#ea580c]" />
                          ) : (
                            <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-[#059669]" />
                          )}
                          <span>{idx % 2 === 0 ? 'Bestseller' : 'Top Rated'}</span>
                        </span>
                      </div>

                      {/* Top-Right Wishlist Button */}
                      <button
                        type="button"
                        onClick={(e) => toggleWishlist(e, product.id)}
                        className={`absolute top-2 right-2 sm:top-3 sm:right-3 z-10 h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center shadow-xs border border-white/80 transition-all ${
                          isWishlisted
                            ? 'text-red-500 bg-white'
                            : 'text-dark-400 hover:text-red-500 hover:bg-white'
                        }`}
                        aria-label="Add to wishlist"
                      >
                        <Heart
                          className={`h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform active:scale-125 ${
                            isWishlisted ? 'fill-red-500 text-red-500' : ''
                          }`}
                        />
                      </button>
                    </div>

                    {/* Product Card Content */}
                    <div className="p-2.5 sm:p-5">
                      {/* Category */}
                      <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-[#16a34a] mb-1 sm:mb-1.5 truncate">
                        {product.category}
                      </p>

                      {/* Product Name */}
                      <h3 className="text-xs sm:text-base font-bold text-dark-900 group-hover:text-[#15803d] transition-colors line-clamp-2 sm:line-clamp-1 mb-1.5 sm:mb-2">
                        {product.name}
                      </h3>

                      {/* Rating, Reviews & Location */}
                      <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-dark-500 mb-2.5 sm:mb-4 flex-wrap">
                        <div className="flex items-center gap-0.5 sm:gap-1">
                          <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-400 fill-amber-400" />
                          <span className="font-bold text-dark-900">{product.seller.rating}</span>
                          <span className="text-dark-400 text-[10px] sm:text-[11px] hidden xs:inline sm:inline">(150+)</span>
                        </div>
                        <span className="text-dark-300">|</span>
                        <div className="flex items-center gap-0.5 sm:gap-1 text-dark-500 text-[10px] sm:text-[11px] truncate">
                          <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-dark-400 flex-shrink-0" />
                          <span className="truncate">{product.seller.location}</span>
                        </div>
                      </div>

                      {/* Price & Minimum Order & Delivery */}
                      <div className="pt-2 sm:pt-3 border-t border-dark-100 flex flex-col sm:flex-row sm:items-end justify-between gap-1.5 sm:gap-2">
                        <div>
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-sm sm:text-lg font-bold font-display text-dark-900">
                              {formatCurrency(product.price)}
                            </span>
                            <span className="text-[10px] sm:text-xs text-dark-400 font-normal">/{product.unit}</span>
                          </div>
                          <p className="text-[10px] sm:text-[11px] text-dark-400 mt-0.5 truncate">
                            Min: {product.minOrderQty} {product.unit}
                          </p>
                        </div>

                        {/* Delivery Time Badge */}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-semibold bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0]/80 self-start sm:self-auto">
                          <Truck className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-[#059669]" />
                          <span>{product.leadTime}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Trust/Quality Pill Strip */}
                  <div className="px-2.5 sm:px-5 py-2 sm:py-3 bg-[#f8fafc] border-t border-dark-100 flex items-center justify-between text-[10px] sm:text-[11px] text-dark-600 font-medium">
                    <div className="flex items-center gap-1 text-[#15803d]">
                      <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      <span className="text-dark-700 font-semibold text-[9px] sm:text-[10px] truncate">Verified</span>
                    </div>
                    <div className="flex items-center gap-1 text-[#15803d]">
                      <Award className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      <span className="text-dark-700 font-semibold text-[9px] sm:text-[10px] truncate">Export Quality</span>
                    </div>
                    <div className="hidden xs:flex sm:flex items-center gap-1 text-[#15803d]">
                      <Tag className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      <span className="text-dark-700 font-semibold text-[9px] sm:text-[10px] truncate">Best Price</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-dark-200 bg-dark-50 px-5 py-12 text-center">
            <Package className="h-10 w-10 text-dark-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-dark-600 mb-1">
              {selectedFilter !== 'all' ? 'Products not available in this category.' : 'No products available yet'}
            </p>
            <p className="text-xs text-dark-400 max-w-xs mx-auto">
              {selectedFilter !== 'all'
                ? 'Try selecting another category or browse all products.'
                : 'Products will appear here once verified sellers list their export commodities.'}
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-colors"
            >
              Browse All Products
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

      </div>
    </section>
  );
}
