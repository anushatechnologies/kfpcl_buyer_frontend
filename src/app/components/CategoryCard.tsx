import { motion } from "motion/react";
import { Link } from "react-router";
import { getCategoryHref } from "../lib/storefrontUtils";
import type { Category } from "../types/storefront";

interface CategoryCardProps {
  category: Category;
  compact?: boolean;
}

export function CategoryCard({ category, compact = false }: CategoryCardProps) {
  return (
    <Link to={getCategoryHref(category)} className="block group w-full">
      <div className="flex flex-col items-center text-center">
        {/* Circle Image Wrapper */}
        <motion.div
          whileHover={{ y: -6, scale: 1.04 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className={`relative aspect-square rounded-full border-2 border-white bg-white shadow-[0_8px_24px_rgba(10,22,40,0.05)] transition-all duration-500 group-hover:border-[#D4A853] group-hover:shadow-[0_16px_36px_rgba(30,90,250,0.12)] ${
            compact 
              ? "w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28" 
              : "w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-30 lg:h-30"
          }`}
        >
          {category.imageUrl ? (
            <img
              src={category.imageUrl}
              alt={category.name}
              className="h-full w-full rounded-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : null}
          {/* Subtle gradient inside the circle to add depth */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/15 via-transparent to-transparent opacity-60 pointer-events-none" />
          
          {/* Glowing ambient ring on hover */}
          <div className="absolute -inset-1.5 rounded-full border border-dashed border-[#D4A853]/35 opacity-0 scale-105 transition-all duration-500 group-hover:opacity-100 group-hover:scale-100 pointer-events-none" />
        </motion.div>

        {/* Category Title */}
        <h3 className="mt-3 font-sans text-xs sm:text-sm font-bold tracking-tight text-[#0A1628]/85 transition-colors duration-300 group-hover:text-[#1E5AFA] line-clamp-2 max-w-[80px] sm:max-w-[110px] leading-tight">
          {category.name}
        </h3>
      </div>
    </Link>
  );
}
