'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getBanners } from '@/app/data/storefrontData';

interface SlideItem {
  id: string | number;
  imageUrl: string;
  name: string;
  targetUrl: string;
}

export default function HeroCarousel() {
  const [slides, setSlides] = useState<SlideItem[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    getBanners()
      .then((banners) => {
        if (!isMounted) return;
        // Filter to only active banners, then map to SlideItem
        const activeBanners = banners.filter((b) => b.isActive !== false);
        if (activeBanners.length > 0) {
          setSlides(
            activeBanners.map((b, i) => ({
              id: b.id || i + 1,
              imageUrl: b.imageUrl || '',
              name: b.name || 'Banner',
              targetUrl: b.targetUrl || '',
            }))
          );
        } else {
          // No banners from admin — show empty state (no hardcoded slides)
          setSlides([]);
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setSlides([]);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-advance slides every 6s when there are multiple
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const nextSlide = () => {
    if (slides.length <= 1) return;
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };
  const prevSlide = () => {
    if (slides.length <= 1) return;
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  // Track active slide original aspect ratio
  useEffect(() => {
    const activeSlide = slides[currentSlide];
    if (!activeSlide?.imageUrl) return;
    const img = new Image();
    img.src = activeSlide.imageUrl;
    if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
      setAspectRatio(img.naturalWidth / img.naturalHeight);
    } else {
      img.onload = () => {
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          setAspectRatio(img.naturalWidth / img.naturalHeight);
        }
      };
    }
  }, [slides, currentSlide]);

  // ── Loading skeleton ──
  if (isLoading) {
    return (
      <section className="relative overflow-hidden bg-dark-900 rounded-[20px] animate-pulse">
        <div className="h-[240px] sm:h-[340px] w-full bg-dark-800 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 opacity-40">
            <Package className="h-10 w-10 text-brand-500" />
            <div className="h-3 w-40 rounded bg-dark-600" />
          </div>
        </div>
      </section>
    );
  }

  // ── No banners available — do not use dummy or static banners ──
  if (slides.length === 0) {
    return null;
  }

  // ── Live banner slides from Admin API (Full image visible, original aspect ratio) ──
  return (
    <section className="relative w-full group flex flex-col justify-between">
      {/* Slides Container Frame — uses Admin-added banner's original aspect ratio */}
      <div
        className="relative w-full overflow-hidden rounded-[1rem] sm:rounded-[1.5rem] lg:rounded-[2rem] bg-transparent shadow-[0_8px_30px_rgba(10,22,40,0.06)]"
        style={aspectRatio ? { aspectRatio: `${aspectRatio}` } : undefined}
      >
        <div
          className="flex transition-transform duration-700 ease-in-out w-full h-full"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {slides.map((slide) => {
            return (
              <div
                key={slide.id}
                className="w-full h-full flex-shrink-0 relative flex items-center justify-center overflow-hidden rounded-[1rem] sm:rounded-[1.5rem] lg:rounded-[2rem] bg-transparent"
              >
                {slide.targetUrl ? (
                  <Link
                    href={slide.targetUrl}
                    className="flex h-full w-full items-center justify-center focus:outline-none focus:ring-2 focus:ring-brand-500 rounded-[1rem] sm:rounded-[1.5rem] lg:rounded-[2rem]"
                  >
                    <img
                      src={slide.imageUrl}
                      alt={slide.name}
                      className="w-full h-full object-contain block rounded-[1rem] sm:rounded-[1.5rem] lg:rounded-[2rem] select-none"
                      onLoad={(e) => {
                        const { naturalHeight, naturalWidth } = e.currentTarget;
                        if (naturalWidth > 0 && naturalHeight > 0) {
                          setAspectRatio(naturalWidth / naturalHeight);
                        }
                      }}
                    />
                  </Link>
                ) : (
                  <img
                    src={slide.imageUrl}
                    alt={slide.name}
                    className="w-full h-full object-contain block rounded-[1rem] sm:rounded-[1.5rem] lg:rounded-[2rem] select-none"
                    onLoad={(e) => {
                      const { naturalHeight, naturalWidth } = e.currentTarget;
                      if (naturalWidth > 0 && naturalHeight > 0) {
                        setAspectRatio(naturalWidth / naturalHeight);
                      }
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Navigation Chevrons (Visible on hover, only when multiple slides) */}
        {slides.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/45 text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-black/75 hover:scale-105 border border-white/10 cursor-pointer z-20"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/45 text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-black/75 hover:scale-105 border border-white/10 cursor-pointer z-20"
              aria-label="Next slide"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {/* Pagination Dots below banner — compact and visible above the fold */}
      {slides.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-2 pb-1 shrink-0">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300 cursor-pointer sm:h-2',
                currentSlide === index ? 'w-6 bg-brand-500 sm:w-8 shadow-sm' : 'w-2 bg-gray-300 hover:bg-gray-400'
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
