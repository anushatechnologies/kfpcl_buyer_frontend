import type { Metadata } from 'next';
import ShopBySubcategory from '@/components/home/ShopBySubcategory';

export const metadata: Metadata = {
  title: 'All Subcategories — Karthikeya Farmer Producer Company Limited',
  description: 'Browse all supplier and admin subcategories on Karthikeya Farmer Producer Company Limited.',
};

export default function SubcategoriesPage() {
  return <ShopBySubcategory showAll />;
}
