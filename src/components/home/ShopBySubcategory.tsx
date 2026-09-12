'use client';

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, ArrowRight, ChevronDown, ChevronRight, Package, Search, ShoppingBag, X } from 'lucide-react';
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
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

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

  /* ─── Mobile: active banner + expandable drawer + pills ─── */
  /* ─── Desktop & Tablet: full vertical left sidebar expanded to bottom of page ─── */
  return (
    <div className="flex flex-col md:flex-row gap-6 items-stretch min-h-[calc(100vh-180px)]">
      {/* ──────── Sidebar ──────── */}
      <aside className="w-full md:w-[280px] lg:w-[310px] xl:w-[340px] flex-shrink-0 md:self-stretch flex flex-col">
        {/* Mobile: active subcategory indicator + toggle button */}
        <div className="md:hidden mb-4">
          <div className="flex items-center justify-between gap-2 mb-2.5 p-2.5 rounded-xl bg-white border border-dark-200/80 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-[#f0fdf4] border border-[#86efac] flex items-center justify-center text-[#15803d] flex-shrink-0">
                <Package className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-dark-400 tracking-wider">Subcategory</p>
                <p className="text-xs font-bold text-dark-900 truncate">
                  {activeSubcategory ? activeSubcategory.name : 'Select Subcategory'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileDrawerOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f0fdf4] text-[#15803d] border border-[#86efac] text-xs font-bold hover:bg-[#dcfce7] transition-colors flex-shrink-0"
            >
              <span>{mobileDrawerOpen ? 'Hide List' : `All (${subcategories.length})`}</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${mobileDrawerOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Mobile expanded vertical list */}
          {mobileDrawerOpen && (
            <div className="mb-3 rounded-2xl bg-white border border-dark-200/80 shadow-xs p-3 animate-fade-in">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-dark-100">
                <span className="text-xs font-bold text-dark-900">All Subcategories ({subcategories.length})</span>
                <span className="text-[11px] text-dark-400">Tap to select</span>
              </div>
              {subcategories.length > 3 && (
                <div className="relative mb-2.5">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-dark-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search subcategories…"
                    value={sidebarSearch}
                    onChange={(e) => setSidebarSearch(e.target.value)}
                    className="w-full text-xs pl-8 pr-7 py-1.5 rounded-lg border border-dark-200 bg-dark-50 placeholder:text-dark-400 text-dark-800 focus:outline-none focus:border-[#16a34a]"
                  />
                  {sidebarSearch && (
                    <button
                      type="button"
                      onClick={() => setSidebarSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-700"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
              <div className="max-h-72 overflow-y-auto divide-y divide-dark-100/70 custom-scrollbar">
                {filteredSubs.map((sub) => {
                  const isActive = activeId === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        setActiveId(sub.id);
                        setMobileDrawerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between py-2.5 px-2 rounded-lg text-left text-xs transition-colors ${
                        isActive ? 'bg-[#f0fdf4] text-[#15803d] font-bold' : 'text-dark-700 hover:bg-dark-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className="h-7 w-7 rounded-md overflow-hidden bg-dark-100 flex items-center justify-center flex-shrink-0 border border-dark-200">
                          {sub.imageUrl ? (
                            <img src={sub.imageUrl} alt={sub.name} className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          ) : (
                            <Package className="h-3.5 w-3.5 text-dark-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="leading-snug break-words">{sub.name}</p>
                          {sub.categoryName && (
                            <p className="text-[10px] text-dark-400 font-normal">{sub.categoryName}</p>
                          )}
                        </div>
                      </div>
                      {isActive && (
                        <span className="text-[11px] font-bold text-[#16a34a] flex-shrink-0">Selected</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mobile horizontal scroll pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
            {filteredSubs.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setActiveId(sub.id)}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
                  activeId === sub.id
                    ? 'bg-[#15803d] text-white border-[#15803d] shadow-sm'
                    : 'bg-white text-dark-700 border-dark-200 hover:border-[#86efac] hover:text-[#15803d]'
                }`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop & Tablet: full vertical list expanded to bottom of page */}
        <div className="hidden md:flex flex-col flex-1 h-full md:sticky md:top-24 md:max-h-[calc(100vh-100px)] rounded-2xl border border-dark-200/80 bg-white shadow-xs overflow-hidden">
          {/* Header with search */}
          <div className="p-4 border-b border-dark-100/80 bg-[#FAFAFA] flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-[#f0fdf4] border border-[#86efac] flex items-center justify-center text-[#15803d]">
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-dark-900 leading-tight">Subcategories</h2>
                  <p className="text-[11px] text-dark-400 font-medium">{subcategories.length} available</p>
                </div>
              </div>
              {sidebarSearch && (
                <button
                  type="button"
                  onClick={() => setSidebarSearch('')}
                  className="text-[11px] font-bold text-[#15803d] hover:underline"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-dark-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter subcategories…"
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                className="w-full text-xs pl-8 pr-7 py-2 rounded-xl border border-dark-200 bg-white text-dark-800 placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30 focus:border-[#16a34a] transition"
              />
              {sidebarSearch && (
                <button
                  type="button"
                  onClick={() => setSidebarSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable list stretching vertically */}
          <nav className="flex-1 overflow-y-auto divide-y divide-dark-100/60 custom-scrollbar overscroll-contain">
            {filteredSubs.length === 0 && (
              <div className="px-4 py-8 text-sm text-dark-400 text-center">
                <p className="font-semibold text-dark-600 mb-1">No matches found</p>
                <p className="text-xs">Try searching for something else</p>
              </div>
            )}
            {filteredSubs.map((sub) => {
              const isActive = activeId === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => setActiveId(sub.id)}
                  className={`group w-full text-left p-3 flex items-center gap-3 transition-all duration-200 ${
                    isActive
                      ? 'bg-[#f0fdf4] border-l-4 border-l-[#16a34a]'
                      : 'hover:bg-dark-50 border-l-4 border-l-transparent'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className={`h-9 w-9 rounded-lg overflow-hidden flex-shrink-0 border bg-dark-50 flex items-center justify-center ${
                    isActive ? 'border-[#86efac]' : 'border-dark-200'
                  }`}>
                    {sub.imageUrl ? (
                      <img
                        src={sub.imageUrl}
                        alt={sub.name}
                        className="h-full w-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <Package className="h-4 w-4 text-dark-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pr-1">
                    <p className={`text-sm font-semibold leading-snug break-words ${
                      isActive ? 'text-[#15803d]' : 'text-dark-800 group-hover:text-[#15803d]'
                    }`}>
                      {sub.name}
                    </p>
                    {sub.categoryName && (
                      <p className="text-[11px] text-dark-400 font-medium break-words mt-0.5">{sub.categoryName}</p>
                    )}
                  </div>

                  <ChevronRight className={`h-4 w-4 flex-shrink-0 transition-colors ${
                    isActive ? 'text-[#16a34a]' : 'text-dark-300 group-hover:text-dark-500'
                  }`} />
                </button>
              );
            })}
          </nav>

          {/* Footer status */}
          <div className="px-3.5 py-2 bg-[#FAFAFA] border-t border-dark-100/80 flex items-center justify-between text-[11px] text-dark-500 font-medium flex-shrink-0">
            <span>Showing {filteredSubs.length} of {subcategories.length} subcategories</span>
          </div>
        </div>
      </aside>

      {/* ──────── Products area ──────── */}
      <div className="flex-1 min-w-0">
        {/* Active subcategory header */}
        {activeSubcategory && (
          <div className="mb-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl overflow-hidden border border-dark-200 flex-shrink-0 bg-dark-100">
              {activeSubcategory.imageUrl ? (
                <img src={activeSubcategory.imageUrl} alt={activeSubcategory.name} className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
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
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-56 sm:h-64 rounded-2xl bg-dark-100 animate-pulse" />
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
            {products.map((product) => (
              <Link
                key={product.id}
                to={`/products/${product.id}`}
                className="group rounded-xl sm:rounded-2xl border border-dark-200/80 bg-white overflow-hidden hover:shadow-[0_8px_24px_rgba(0,0,0,0.07)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col"
              >
                {/* Product image */}
                <div className="relative h-32 sm:h-44 w-full overflow-hidden bg-gray-50 flex items-center justify-center p-2">
                  <img
                    src={product.images?.[0] || '/images/products/placeholder.jpg'}
                    alt={product.name}
                    className="max-h-full max-w-full object-contain object-center mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => { e.currentTarget.src = '/images/products/placeholder.jpg'; }}
                  />
                  {product.inStock ? (
                    <span className="absolute top-2 left-2 bg-[#16a34a] text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-wide px-1.5 sm:px-2 py-0.5 rounded-md">
                      In Stock
                    </span>
                  ) : (
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-wide px-1.5 sm:px-2 py-0.5 rounded-md">
                      Out of Stock
                    </span>
                  )}
                </div>

                {/* Product info */}
                <div className="p-2.5 sm:p-4 flex flex-col flex-1">
                  <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-[#16a34a] mb-0.5 sm:mb-1 truncate">
                    {product.category}
                  </p>
                  <h4 className="text-xs sm:text-sm font-bold text-dark-900 group-hover:text-[#15803d] transition-colors leading-snug line-clamp-2">
                    {product.name}
                  </h4>
                  {product.description && (
                    <p className="text-[11px] sm:text-xs text-dark-500 line-clamp-1 sm:line-clamp-2 mt-1">{product.description}</p>
                  )}

                  <div className="mt-auto pt-2 sm:pt-3 flex items-end justify-between border-t border-dark-100/80">
                    <div>
                      <span className="text-sm sm:text-lg font-extrabold text-dark-900">₹{product.price.toLocaleString('en-IN')}</span>
                      {product.mrp && product.mrp > product.price && (
                        <span className="text-[10px] sm:text-xs text-dark-400 line-through ml-1">₹{product.mrp.toLocaleString('en-IN')}</span>
                      )}
                      <span className="block text-[10px] sm:text-[11px] text-dark-400 mt-0.5">per {product.unit}</span>
                    </div>
                    <span className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border border-[#86efac] text-[#15803d] bg-[#f0fdf4] flex items-center justify-center transition-all duration-300 group-hover:bg-[#16a34a] group-hover:text-white group-hover:border-[#16a34a] flex-shrink-0">
                      <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
      <div className="section py-6 sm:py-8 lg:py-10 animate-fade-in">
        {showAll && (
          <div className="mb-4 flex items-center">
            <Link
              to="/"
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
              to="/subcategories"
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
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-[280px] lg:w-[310px] xl:w-[340px] flex-shrink-0 space-y-2">
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className="h-14 rounded-xl bg-dark-100 animate-pulse" />
                ))}
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
              {displayedSubcategories.map((subcategory) => {
                const categoryFilter = subcategory.categoryName || subcategory.categoryId || '';
                const href = `/products?category=${encodeURIComponent(categoryFilter)}&search=${encodeURIComponent(subcategory.name)}`;

                return (
                  <Link
                    key={subcategory.id}
                    to={href}
                    className="group overflow-hidden rounded-xl sm:rounded-2xl bg-white border border-dark-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 flex flex-col"
                  >
                    <div className="relative h-28 sm:h-36 w-full overflow-hidden bg-gray-50 flex items-center justify-center p-2">
                      {subcategory.imageUrl ? (
                        <img
                          src={subcategory.imageUrl}
                          alt={subcategory.name}
                          className="max-h-full max-w-full object-contain object-center transition-transform duration-700 group-hover:scale-105"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
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
