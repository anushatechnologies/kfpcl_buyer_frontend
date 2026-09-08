'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Package,
  Search,
  SlidersHorizontal,
  Star,
  CheckCircle2,
  X,
  ArrowLeft,
  Filter,
} from 'lucide-react';
import { productsApi } from '@/api/products.api';
import { categoriesApi, CategoryDto } from '@/api/categories.api';
import { formatCurrency, cn } from '@/lib/utils';
import type { Product } from '@/types/product';
import ProductSearchSuggestions from '@/components/ProductSearchSuggestions';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]['value'];

function normalizeCategoryName(value: string) {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
}

interface ProductsClientProps {
  initialSearch?: string;
  initialCategory?: string;
}

export default function ProductsClient({
  initialSearch = '',
  initialCategory = '',
}: ProductsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // URL parameters take precedence if present
  const urlCategory = searchParams?.get('category') || initialCategory;
  const urlSearch = searchParams?.get('search') || initialSearch;

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState(urlSearch);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    if (urlCategory && urlCategory !== 'all') {
      return [urlCategory];
    }
    return [];
  });
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('newest');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Load real products from API
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
        console.error('Failed to load products', err);
        if (isMounted) {
          setProducts([]);
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync state when URL params change
  useEffect(() => {
    const currentCat = searchParams?.get('category');
    if (currentCat && currentCat !== 'all') {
      setSelectedCategories([currentCat]);
    } else if (currentCat === 'all') {
      setSelectedCategories([]);
    }
    const currentSearch = searchParams?.get('search');
    if (currentSearch !== null && currentSearch !== undefined) {
      setSearch(currentSearch);
    }
  }, [searchParams]);

  // Main Filtering Logic
  const filtered = useMemo(() => {
    let results: Product[] = [...products];

    // Category filter: Strict matching to selected category/categories
    if (selectedCategories.length > 0) {
      results = results.filter((p) =>
        selectedCategories.some(
          (categoryName) =>
            normalizeCategoryName(p.category) === normalizeCategoryName(categoryName)
        )
      );
    }

    // Search query filter
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.subCategory && p.subCategory.toLowerCase().includes(q)) ||
          p.description.toLowerCase().includes(q) ||
          (p.shortDescription ? p.shortDescription.toLowerCase().includes(q) : false) ||
          p.seller.name.toLowerCase().includes(q) ||
          p.seller.location.toLowerCase().includes(q) ||
          (p.tags ? p.tags.some((t) => t.toLowerCase().includes(q)) : false)
      );
    }

    // Verified only
    if (verifiedOnly) {
      results = results.filter((p) => p.seller.verified);
    }

    // In stock only
    if (inStockOnly) {
      results = results.filter((p) => p.inStock);
    }

    // Sorting
    switch (sortBy) {
      case 'price_asc':
        results.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        results.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        results.sort((a, b) => b.seller.rating - a.seller.rating);
        break;
      case 'newest':
      default:
        results.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
    }

    return results;
  }, [products, search, selectedCategories, verifiedOnly, inStockOnly, sortBy]);

  const toggleCategory = (catId: string) => {
    setSelectedCategories((prev) => {
      const isSelected = prev.includes(catId);
      const next = isSelected ? prev.filter((c) => c !== catId) : [...prev, catId];
      
      // Update URL query string seamlessly
      if (next.length === 1) {
        router.push(`/products?category=${encodeURIComponent(next[0])}`, { scroll: false });
      } else if (next.length === 0) {
        router.push('/products', { scroll: false });
      }
      return next;
    });
  };

  const selectSingleCategory = (catId: string) => {
    if (catId === 'all') {
      setSelectedCategories([]);
      router.push('/products', { scroll: false });
    } else {
      setSelectedCategories([catId]);
      router.push(`/products?category=${encodeURIComponent(catId)}`, { scroll: false });
    }
  };

  const resetFilters = () => {
    setSearch('');
    setSelectedCategories([]);
    setVerifiedOnly(false);
    setInStockOnly(false);
    setSortBy('newest');
    router.push('/products', { scroll: false });
  };

  const activeCategoryDef =
    selectedCategories.length === 1
      ? categories.find(
          (category) =>
            normalizeCategoryName(category.name) ===
            normalizeCategoryName(selectedCategories[0])
        )
      : undefined;

  const hasActiveFilters =
    selectedCategories.length > 0 || verifiedOnly || inStockOnly || search.trim();

  return (
    <div className="section py-8 animate-fade-in">
      {/* ── Breadcrumb / Back to Home ── */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-dark-500 hover:text-brand-700 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back to Home
        </Link>

        {/* Mobile Filter Button */}
        <button
          onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
          className="lg:hidden inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dark-300 text-xs font-semibold text-dark-700 bg-white"
        >
          <Filter className="h-3.5 w-3.5" />
          Filters ({hasActiveFilters ? selectedCategories.length + (verifiedOnly ? 1 : 0) + (inStockOnly ? 1 : 0) : 0})
        </button>
      </div>

      {/* ── Page Title & Category Header Banner ── */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-dark-900 tracking-tight flex items-center gap-2">
              {activeCategoryDef ? (
                <>
                  <span>{activeCategoryDef.name}</span>
                </>
              ) : (
                'All Products'
              )}
            </h1>
            <p className="text-xs sm:text-sm text-dark-500 mt-1">
              {activeCategoryDef ? (
                <span>
                  Showing {filtered.length} export products in{' '}
                  <strong className="text-dark-800">{activeCategoryDef.name}</strong> · Verified Indian exporters
                </span>
              ) : (
                <span>
                  Showing {filtered.length} of {products.length} products across all categories · Verified Indian exporters
                </span>
              )}
            </p>
          </div>

          {activeCategoryDef && (
            <button
              onClick={() => selectSingleCategory('all')}
              className="self-start sm:self-auto text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-3 py-1.5 rounded-xl transition-colors"
            >
              View All Categories
            </button>
          )}
        </div>

        {/* Category Horizontal Quick Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-3 mt-4 border-y border-dark-100">
          <button
            onClick={() => selectSingleCategory('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategories.length === 0
                ? 'bg-brand-700 text-white shadow-xs'
                : 'bg-dark-50 text-dark-600 hover:bg-dark-100'
            }`}
          >
            All Categories ({products.length})
          </button>
          {categories.map((category) => {
            const isSelected = selectedCategories.includes(category.name);
            const count = products.filter(
              (product) =>
                normalizeCategoryName(product.category) === normalizeCategoryName(category.name)
            ).length;
            return (
              <button
                key={category.id}
                onClick={() => selectSingleCategory(category.name)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-brand-700 text-white shadow-xs ring-1 ring-brand-700'
                    : 'bg-white border border-dark-200 text-dark-700 hover:border-brand-300 hover:bg-brand-50/50'
                }`}
              >
                <Package className="h-3.5 w-3.5" />
                <span>{category.name}</span>
                <span className={`text-[10px] ${isSelected ? 'text-brand-100' : 'text-dark-400'}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-6">
        {/* ── Sidebar Filters (Desktop & Mobile Drawer) ── */}
        <aside
          className={cn(
            'w-64 flex-shrink-0',
            mobileFilterOpen
              ? 'block fixed inset-0 z-50 bg-black/50 p-4 lg:relative lg:inset-auto lg:z-0 lg:p-0 lg:bg-transparent'
              : 'hidden lg:block'
          )}
        >
          <div
            className={cn(
              'card p-4 space-y-5 sticky top-20 bg-white max-h-[90vh] overflow-y-auto',
              mobileFilterOpen && 'max-w-sm mx-auto mt-16 shadow-2xl rounded-2xl'
            )}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-dark-900 flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-brand-600" />
                Filter by Category
              </h3>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="text-xs text-brand-600 hover:underline flex items-center gap-1 font-medium"
                  >
                    <X className="h-3 w-3" />
                    Reset
                  </button>
                )}
                {mobileFilterOpen && (
                  <button
                    onClick={() => setMobileFilterOpen(false)}
                    className="lg:hidden p-1 rounded-lg hover:bg-dark-100 text-dark-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Category Checkboxes */}
            <div>
              <p className="text-[11px] font-bold text-dark-400 uppercase tracking-wider mb-2.5">
                Categories
              </p>
              <div className="space-y-2">
                {categories.map((category) => {
                  const isChecked = selectedCategories.includes(category.name);
                  const count = products.filter(
                    (product) =>
                      normalizeCategoryName(product.category) === normalizeCategoryName(category.name)
                  ).length;
                  return (
                    <label
                      key={category.id}
                      className={`flex items-center gap-2.5 p-1.5 rounded-lg cursor-pointer transition-colors ${
                        isChecked ? 'bg-brand-50/70 font-medium' : 'hover:bg-dark-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="rounded text-brand-600 focus:ring-brand-500 h-4 w-4"
                        checked={isChecked}
                        onChange={() => toggleCategory(category.name)}
                      />
                      <Package className="h-3.5 w-3.5 text-dark-500" />
                      <span
                        className={cn(
                          'text-xs transition-colors',
                          isChecked ? 'text-brand-900 font-semibold' : 'text-dark-700'
                        )}
                      >
                        {category.name}
                      </span>
                      <span className="ml-auto text-[11px] text-dark-400 font-normal">
                        {count}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Verified only */}
            <div className="pt-3 border-t border-dark-100">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded text-brand-600 focus:ring-brand-500 h-4 w-4"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                />
                <span className="text-xs font-medium text-dark-700">Verified sellers only</span>
              </label>
            </div>

            {/* In Stock */}
            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded text-brand-600 focus:ring-brand-500 h-4 w-4"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                />
                <span className="text-xs font-medium text-dark-700">In stock only</span>
              </label>
            </div>

            {mobileFilterOpen && (
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="w-full btn-primary mt-4 py-2 text-xs"
              >
                Apply Filters ({filtered.length} products)
              </button>
            )}
          </div>
        </aside>

        {/* ── Main Product Grid Section ── */}
        <div className="flex-1 min-w-0">
          {/* Search bar & Sort Controls */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400 pointer-events-none" />
              <input
                type="text"
                placeholder={
                  activeCategoryDef
                    ? `Search within ${activeCategoryDef.name}…`
                    : 'Search all products, categories, origins…'
                }
                className="form-input pl-10 text-xs sm:text-sm h-10 w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => window.setTimeout(() => setIsSearchFocused(false), 120)}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {isSearchFocused && search.trim() && (
                <ProductSearchSuggestions query={search} onSelect={() => setIsSearchFocused(false)} />
              )}
            </div>
            <select
              className="form-input w-full sm:w-48 text-xs sm:text-sm h-10"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Active Filter Chips Row */}
          {(selectedCategories.length > 0 || verifiedOnly || inStockOnly || search.trim()) && (
            <div className="flex flex-wrap items-center gap-2 mb-4 bg-brand-50/40 p-2.5 rounded-xl border border-brand-100">
              <span className="text-[11px] font-bold text-dark-500 uppercase tracking-wider mr-1">
                Active Filters:
              </span>
              {selectedCategories.map((categoryName) => {
                return (
                  <span
                    key={categoryName}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-brand-300 text-brand-800 text-xs font-semibold shadow-2xs"
                  >
                    <Package className="h-3 w-3" />
                    <span>{categoryName}</span>
                    <button
                      onClick={() => toggleCategory(categoryName)}
                      className="ml-1 hover:text-red-500 transition-colors"
                      title="Remove filter"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
              {verifiedOnly && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-brand-300 text-brand-800 text-xs font-semibold shadow-2xs">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  Verified Exporters
                  <button onClick={() => setVerifiedOnly(false)} className="ml-1 hover:text-red-500">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {inStockOnly && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-brand-300 text-brand-800 text-xs font-semibold shadow-2xs">
                  In Stock Only
                  <button onClick={() => setInStockOnly(false)} className="ml-1 hover:text-red-500">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {search.trim() && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-brand-300 text-brand-800 text-xs font-semibold shadow-2xs">
                  Keyword: &quot;{search}&quot;
                  <button onClick={() => setSearch('')} className="ml-1 hover:text-red-500">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              <button
                onClick={resetFilters}
                className="text-xs font-semibold text-brand-700 hover:underline ml-auto"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Product Grid or Empty State */}
          {filtered.length === 0 ? (
            <div className="card p-12 sm:p-16 text-center border-dashed border-2 border-dark-200">
              <div className="h-16 w-16 rounded-2xl bg-dark-50 flex items-center justify-center mx-auto mb-4 text-dark-300">
                <Package className="h-8 w-8" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-dark-800 mb-1">
                {selectedCategories.length > 0 ? "Products not available in this category." : "No products found"}
              </h3>
              <p className="text-dark-500 text-xs sm:text-sm mb-5 max-w-sm mx-auto">
                Try selecting other categories or clearing your search filters to view more items.
              </p>
              <button onClick={resetFilters} className="btn-primary py-2 px-4 text-xs font-semibold">
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5">
              {filtered.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="card-hover group overflow-hidden bg-white flex flex-col justify-between rounded-xl sm:rounded-2xl"
                >
                  <div>
                    {/* Product Image */}
                    <div className="relative h-36 sm:h-44 bg-dark-100 overflow-hidden">
                      {product.images?.[0] ? (
                        <Image
                          src={product.images[0]}
                          alt={product.name}
                          fill
                          className="object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                          sizes="(max-width: 640px) 50vw, (max-width: 1280px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-brand-300">
                          <Package className="h-10 w-10 sm:h-12 sm:w-12" />
                        </div>
                      )}

                      {/* Verified Badge */}
                      {product.seller.verified && (
                        <span className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 badge-green shadow-xs text-[9px] sm:text-xs py-0.5 px-1.5 sm:px-2">
                          <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          <span className="hidden xs:inline sm:inline">Verified</span>
                        </span>
                      )}

                      {/* Out of Stock Overlay */}
                      {!product.inStock && (
                        <div className="absolute inset-0 bg-dark-900/50 flex items-center justify-center backdrop-blur-2xs">
                          <span className="badge-gray text-[10px] sm:text-xs font-bold">Out of Stock</span>
                        </div>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="p-2.5 sm:p-4">
                      <div className="flex items-center justify-between gap-1 mb-1 sm:mb-1.5">
                        <span className="text-[10px] sm:text-[11px] text-[#15803d] font-bold uppercase tracking-wide truncate">
                          {product.category}
                        </span>
                        {product.subCategory && (
                          <span className="text-[9px] sm:text-[10px] font-medium text-dark-400 bg-dark-50 px-1.5 py-0.5 rounded truncate max-w-[80px] sm:max-w-none">
                            {product.subCategory}
                          </span>
                        )}
                      </div>

                      <h2 className="text-xs sm:text-sm font-bold text-dark-900 group-hover:text-[#15803d] transition-colors line-clamp-2 mb-1.5 sm:mb-2 leading-snug">
                        {product.name}
                      </h2>

                      {/* Rating & Location */}
                      <div className="flex items-center gap-1 sm:gap-1.5 mb-2 sm:mb-3 text-[11px] sm:text-xs text-dark-500">
                        <div className="flex items-center gap-0.5 sm:gap-1 text-amber-500">
                          <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-amber-400 text-amber-400" />
                          <span className="font-bold text-dark-800">{product.seller.rating}</span>
                        </div>
                        <span>·</span>
                        <span className="truncate">{product.seller.location}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Price & Min Order */}
                  <div className="p-2.5 sm:p-4 pt-0">
                    <div className="pt-2 sm:pt-3 border-t border-dark-100 flex items-end justify-between">
                      <div>
                        <p className="text-sm sm:text-base font-bold text-dark-900 leading-tight">
                          {formatCurrency(product.price)}
                          <span className="text-[10px] sm:text-xs font-normal text-dark-400">/{product.unit}</span>
                        </p>
                        <p className="text-[10px] sm:text-[11px] text-dark-400 mt-0.5 truncate">
                          Min: {product.minOrderQty} {product.unit}
                        </p>
                      </div>
                      <span className="badge-gray text-[9px] sm:text-[10px] font-semibold py-0.5 px-1.5">
                        {product.leadTime}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
