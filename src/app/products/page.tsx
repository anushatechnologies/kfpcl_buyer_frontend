import type { Metadata } from 'next';
import ProductsClient from './ProductsClient';

export const metadata: Metadata = {
  title: 'Products — Karthikeya Farmer Producer Company Limited',
  description: 'Browse verified Indian export products across all categories.',
};

interface ProductsPageProps {
  searchParams?: {
    search?: string | string[];
    category?: string | string[];
  };
}

export default function ProductsPage({ searchParams }: ProductsPageProps) {
  const search = typeof searchParams?.search === 'string' ? searchParams.search : '';
  const category = typeof searchParams?.category === 'string' ? searchParams.category : '';

  return <ProductsClient initialSearch={search} initialCategory={category} />;
}
