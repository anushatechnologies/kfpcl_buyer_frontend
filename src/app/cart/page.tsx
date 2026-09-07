import type { Metadata } from 'next';
import CartPageClient from './CartPageClient';

export const metadata: Metadata = {
  title: 'Cart',
  description: 'Review your product enquiry cart before submitting an order.',
};

export default function CartPage() {
  return <CartPageClient />;
}
