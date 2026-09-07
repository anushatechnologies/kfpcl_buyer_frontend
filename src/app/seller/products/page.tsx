'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Package, Plus, Edit, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { productsApi } from '@/api/products.api';
import { Product } from '@/types/product';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

export default function SellerProductsPage() {
  const sellerId = useAuthStore((state) => state.user?.id);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadProducts = useCallback(() => {
    setIsLoading(true);
    productsApi
      .getSellerProducts(sellerId)
      .then((items) => {
        setProducts(items || []);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load seller products', err);
        setProducts([]);
        setIsLoading(false);
      });
  }, [sellerId]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this product?')) return;
    try {
      await productsApi.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Failed to delete product', err);
      alert('Could not delete product. Please try again.');
    }
  };

  return (
    <div className="section animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold font-display text-dark-900">My Products</h1>
        <Link href="/seller/dashboard?tab=products" className="btn-primary text-xs py-2 px-3.5 inline-flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          Add New Product
        </Link>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-dark-50 border-b border-dark-200">
                <th className="text-left px-4 py-3 font-semibold text-dark-600">Product</th>
                <th className="text-left px-4 py-3 font-semibold text-dark-600">Category</th>
                <th className="text-right px-4 py-3 font-semibold text-dark-600">Price/Unit</th>
                <th className="text-center px-4 py-3 font-semibold text-dark-600">Status</th>
                <th className="text-center px-4 py-3 font-semibold text-dark-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-dark-400">
                    <div className="flex justify-center items-center gap-2">
                      <div className="h-4 w-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                      <span>Loading products...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-dark-400">
                    No products yet. Add your first product!
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-dark-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {product.images?.[0] ? (
                            <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-5 w-5 text-brand-300" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-dark-900 line-clamp-1">{product.name}</p>
                          <p className="text-xs text-dark-400">Min: {product.minOrderQty} {product.unit}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-dark-600">{product.category}</td>
                    <td className="px-4 py-3 text-right font-semibold text-dark-900">
                      {formatCurrency(product.price)}/{product.unit}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {product.inStock ? (
                        <span className="badge-green">
                          <CheckCircle2 className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="badge-gray">
                          <XCircle className="h-3 w-3" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button className="p-1.5 rounded-md hover:bg-brand-50 text-dark-400 hover:text-brand-600 transition-colors">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-1.5 rounded-md hover:bg-red-50 text-dark-400 hover:text-red-600 transition-colors"
                          title="Delete product"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
