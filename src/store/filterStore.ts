'use client';

import { create } from 'zustand';
import { ProductFilter } from '@/types/product';

interface FilterStore {
  filters: ProductFilter;
  setFilter: (key: keyof ProductFilter, value: ProductFilter[keyof ProductFilter]) => void;
  resetFilters: () => void;
}

const DEFAULT_FILTERS: ProductFilter = {
  page: 1,
  limit: 20,
  sortBy: 'newest',
};

export const useFilterStore = create<FilterStore>((set) => ({
  filters: DEFAULT_FILTERS,

  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value, page: 1 },
    })),

  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
}));
