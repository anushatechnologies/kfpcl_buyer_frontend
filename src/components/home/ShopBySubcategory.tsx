'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Package } from 'lucide-react';
import { subcategoriesApi, SubcategoryDto } from '@/api/subcategories.api';

interface ShopBySubcategoryProps {
  showAll?: boolean;
}

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" aria-label="Loading subcategories">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="h-52 rounded-2xl bg-dark-100 animate-pulse" />
            ))}
          </div>
        ) : displayedSubcategories.length > 0 ? (
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
        ) : (
          <div className="rounded-2xl border border-dashed border-dark-200 bg-dark-50 px-5 py-8 text-center text-sm text-dark-500">
            No subcategories are available yet.
          </div>
        )}
      </div>
    </section>
  );
}
