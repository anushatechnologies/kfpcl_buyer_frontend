import type { Metadata } from 'next';
import ShopByCategory from '@/components/home/ShopByCategory';

export const metadata: Metadata = {
  title: 'All Categories — Karthikeya Farmer Producer Company Limited',
  description: 'Browse all supplier and admin categories on Karthikeya Farmer Producer Company Limited.',
};

export default function CategoriesPage() {
  return <ShopByCategory showAll />;
}
