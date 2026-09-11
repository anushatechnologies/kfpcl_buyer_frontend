'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Package, Search, ChevronRight, ShoppingBag } from 'lucide-react';
import { subcategoriesApi, SubcategoryDto } from '@/api/subcategories.api';
import { productsApi } from '@/api/products.api';
import { Product } from '@/types/product';

interface ShopBySubcategoryProps {
  showAll?: boolean;
}

/* ─── Sidebar + Product grid layout (used on /subcategories page) ─── */

function SubcategorySidebarView({ subcategories }: { subcategories: SubcategoryDto[] }) {
  const [activeId, setActiveId] = useState<string>(subcategories[0]?.id ?? '');
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState('');

  const activeSubcategory = subcategories.find((s) => s.id === activeId);

  const fetchProducts = useCallback(async (sub: SubcategoryDto) => {
    setLoadingProducts(true);
    try {
      const categoryFilter = sub.categoryName || sub.categoryId || '';
      const result = await productsApi.getProducts({
        category: categoryFilter,
        search: sub.name,
        limit: 50,
      });
      setProducts(result.products);
    } catch {
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    const sub = subcategories.find((s) => s.id === activeId);
    if (sub) fetchProducts(sub);
  }, [activeId, subcategories, fetchProducts]);

  const filteredSubs = sidebarSearch.trim()
    ? subcategories.filter((s) =>
        s.name.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
        (s.categoryName || '').toLowerCase().includes(sidebarSearch.toLowerCase())
      )
    : subcategories;

  /* ─── Mobile: horizontal pill bar + product grid ─── */
  /* ─── Desktop: left sidebar + right product grid  ─── */
  return (
    <div className="flex flex-col lg:flex-row gap-0 lg:gap-6 min-h-[60vh]">
      {/* ──────── Sidebar ──────── */}
      <aside className="w-full lg:w-[280px] xl:w-[300px] flex-shrink-0">
        {/* Search inside sidebar */}
        <div className="relative mb-3 hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Filter subcategories…"
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
            className="w-full rounded-xl border border-dark-200 bg-white pl-9 pr-3 py-2.5 text-sm text-dark-800 placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30 focus:border-[#16a34a] transition"
          />
        </div>

        {/* Mobile: horizontal scroll pills */}
        <div className="flex lg:hidden gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-1 px-1">
          {filteredSubs.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setActiveId(sub.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-200 ${
                activeId === sub.id
                  ? 'bg-[#15803d] text-white border-[#15803d] shadow-md'
                  : 'bg-white text-dark-700 border-dark-200 hover:border-[#86efac] hover:text-[#15803d]'
              }`}
            >
              {sub.name}
            </button>
          ))}
        </div>

        {/* Desktop: vertical list */}
        <nav className="hidden lg:flex flex-col rounded-2xl border border-dark-200/80 bg-white overflow-hidden max-h-[calc(100vh-220px)] overflow-y-auto">
          {filteredSubs.length === 0 && (
            <p className="px-4 py-6 text-sm text-dark-400 text-center">No matches</p>
          )}
          {filteredSubs.map((sub, idx) => {
            const isActive = activeId === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => setActiveId(sub.id)}
                className={`group w-full text-left px-4 py-3.5 flex items-center gap-3 transition-all duration-200 border-b border-dark-100/60 last:border-b-0 ${
                  isActive
                    ? 'bg-[#f0fdf4] border-l-[3px] border-l-[#16a34a]'
                    : 'hover:bg-dark-50 border-l-[3px] border-l-transparent'
                }`}
              >
                {/* Subcategory image thumbnail */}
                <div className={`h-9 w-9 rounded-lg overflow-hidden flex-shrink-0 border ${
                  isActive ? 'border-[#86efac]' : 'border-dark-200'
                }`}>
                  {sub.imageUrl ? (
                    <Image
                      src={sub.imageUrl}
                      alt={sub.name}
                      width={36}
                      height={36}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-dark-100 flex items-center justify-center">
                      <Package className="h-4 w-4 text-dark-400" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate leading-tight ${
                    isActive ? 'text-[#15803d]' : 'text-dark-800 group-hover:text-[#15803d]'
                  }`}>
                    {sub.name}
                  </p>
                  {sub.categoryName && (
                    <p className="text-[11px] text-dark-400 truncate mt-0.5">{sub.categoryName}</p>
                  )}
                </div>

                <ChevronRight className={`h-4 w-4 flex-shrink-0 transition-colors ${
                  isActive ? 'text-[#16a34a]' : 'text-dark-300 group-hover:text-dark-500'
                }`} />
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ──────── Products area ──────── */}
      <div className="flex-1 min-w-0">
        {/* Active subcategory header */}
        {activeSubcategory && (
          <div className="mb-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl overflow-hidden border border-dark-200 flex-shrink-0 bg-dark-100">
              {activeSubcategory.imageUrl ? (
                <Image src={activeSubcategory.imageUrl} alt={activeSubcategory.name} width={40} height={40} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center"><Package className="h-5 w-5 text-dark-400" /></div>
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-dark-900 leading-tight">{activeSubcategory.name}</h3>
              {activeSubcategory.categoryName && (
                <p className="text-xs text-dark-500">{activeSubcategory.categoryName}</p>
              )}
            </div>
            <span className="ml-auto text-xs font-semibold text-dark-400 bg-dark-50 px-3 py-1 rounded-full">
              {loadingProducts ? '…' : `${products.length} product${products.length !== 1 ? 's' : ''}`}
            </span>
          </div>
        )}

        {loadingProducts ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-64 rounded-2xl bg-dark-100 animate-pulse" />
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="group rounded-2xl border border-dark-200/80 bg-white overflow-hidden hover:shadow-[0_8px_24px_rgba(0,0,0,0.07)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col"
              >
                {/* Product image */}
                <div className="relative h-44 w-full overflow-hidden bg-dark-100">
                  <Image
                    src={product.images?.[0] || '/images/products/placeholder.jpg'}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  />
                  {product.inStock ? (
                    <span className="absolute top-2.5 left-2.5 bg-[#16a34a] text-white text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md">
                      In Stock
                    </span>
                  ) : (
                    <span className="absolute top-2.5 left-2.5 bg-red-500 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md">
                      Out of Stock
                    </span>
                  )}
                </div>

                {/* Product info */}
                <div className="p-4 flex flex-col flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#16a34a] mb-1">
                    {product.category}
                  </p>
                  <h4 className="text-sm font-bold text-dark-900 group-hover:text-[#15803d] transition-colors leading-snug line-clamp-2">
                    {product.name}
                  </h4>
                  {product.description && (
                    <p className="text-xs text-dark-500 line-clamp-2 mt-1">{product.description}</p>
                  )}

                  <div className="mt-auto pt-3 flex items-end justify-between border-t border-dark-100/80 mt-3">
                    <div>
                      <span className="text-lg font-extrabold text-dark-900">₹{product.price.toLocaleString('en-IN')}</span>
                      {product.mrp && product.mrp > product.price && (
                        <span className="text-xs text-dark-400 line-through ml-1.5">₹{product.mrp.toLocaleString('en-IN')}</span>
                      )}
                      <span className="block text-[11px] text-dark-400 mt-0.5">per {product.unit}</span>
                    </div>
                    <span className="h-8 w-8 rounded-full border border-[#86efac] text-[#15803d] bg-[#f0fdf4] flex items-center justify-center transition-all duration-300 group-hover:bg-[#16a34a] group-hover:text-white group-hover:border-[#16a34a]">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-dark-200 bg-dark-50 px-6 py-16 text-center">
            <ShoppingBag className="h-10 w-10 mx-auto text-dark-300 mb-3" />
            <p className="text-sm font-semibold text-dark-600 mb-1">No products found</p>
            <p className="text-xs text-dark-400">This subcategory doesn&apos;t have any products yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main component ─── */

export default function ShopBySubcategory({ showAll = false }: ShopBySubcategoryProps) {
  const [subcategories, setSubcategories] = useState<SubcategoryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    subcategoriesApi
      .getSubcategories()
      .then((items) => {
        if (isMounted) setSubcategories(items);
      })
      .catch(() => {
        if (isMounted) setSubcategories([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const displayedSubcategories = showAll ? subcategories : subcategories.slice(0, 8);

  return (
    <section className="bg-white border-y border-dark-100/80">
      <div className="section py-10 lg:py-14 animate-fade-in">
        {showAll && (
          <div className="mb-4 flex items-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-dark-500 hover:text-brand-700 transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              Back to Home
            </Link>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#15803d] block mb-1">
              EXPLORE
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-dark-900 tracking-tight">
              Subcategories
            </h2>
            <p className="text-xs sm:text-sm text-dark-500 mt-1">
              Browse supplier and admin subcategories from the live catalog
            </p>
          </div>

          {!showAll && (
            <Link
              href="/subcategories"
              aria-label="View All Subcategories"
              title="View All Subcategories"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#16a34a] text-[#15803d] hover:bg-[#f0fdf4] font-semibold text-xs sm:text-sm transition-colors self-start sm:self-auto"
            >
              View All Subcategories
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        {isLoading ? (
          showAll ? (
            /* Sidebar skeleton */
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="w-full lg:w-[280px] xl:w-[300px] flex-shrink-0 space-y-2">
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className="h-14 rounded-xl bg-dark-100 animate-pulse" />
                ))}
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="h-64 rounded-2xl bg-dark-100 animate-pulse" />
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" aria-label="Loading subcategories">
              {Array.from({ length: 8 }, (_, index) => (
                <div key={index} className="h-52 rounded-2xl bg-dark-100 animate-pulse" />
              ))}
            </div>
          )
        ) : displayedSubcategories.length > 0 ? (
          showAll ? (
            /* ─── Sidebar layout for /subcategories ─── */
            <SubcategorySidebarView subcategories={displayedSubcategories} />
          ) : (
            /* ─── Card grid for homepage ─── */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {displayedSubcategories.map((subcategory) => {
                const categoryFilter = subcategory.categoryName || subcategory.categoryId || '';
                const href = `/products?category=${encodeURIComponent(categoryFilter)}&search=${encodeURIComponent(subcategory.name)}`;

                return (
                  <Link
                    key={subcategory.id}
                    href={href}
                    className="group overflow-hidden rounded-2xl bg-white border border-dark-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 flex flex-col"
                  >
                    <div className="relative h-36 w-full overflow-hidden bg-dark-100">
                      {subcategory.imageUrl ? (
                        <Image
                          src={subcategory.imageUrl}
                          alt={subcategory.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="h-full w-full bg-dark-100" />
                      )}
                    </div>

                    <div className="p-4 flex flex-col justify-between flex-1">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-[#16a34a] mb-1">
                          {subcategory.categoryName || 'Category'}
                        </p>
                        <h3 className="text-base font-bold font-display text-dark-900 group-hover:text-[#15803d] transition-colors leading-snug">
                          {subcategory.name}
                        </h3>
                        {subcategory.description && (
                          <p className="text-xs text-dark-500 line-clamp-2 mt-1 leading-relaxed">
                            {subcategory.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-dark-100/80">
                        <span className="text-xs font-bold text-[#15803d]">Explore products</span>
                        <span className="h-8 w-8 rounded-full border border-[#86efac] text-[#15803d] bg-[#f0fdf4] flex items-center justify-center transition-all duration-300 group-hover:bg-[#16a34a] group-hover:text-white group-hover:border-[#16a34a]">
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )
        ) : (
          <div className="rounded-2xl border border-dashed border-dark-200 bg-dark-50 px-5 py-8 text-center text-sm text-dark-500">
            No subcategories are available yet.
          </div>
        )}
      </div>
    </section>
  );
}
