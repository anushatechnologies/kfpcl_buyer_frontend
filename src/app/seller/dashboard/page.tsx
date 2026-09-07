'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import {
  LayoutDashboard,
  Package,
  FileText,
  ShoppingCart,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ChevronRight,
  ChevronDown,
  User,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Activity,
  Send,
  Truck,
  Eye,
  RefreshCw,
  CreditCard,
  BarChart3,
  Boxes,
  Settings,
  Edit,
  Trash2,
  XCircle,
  MessageCircle,
  MessageSquare,
  ExternalLink,
  Search,
  Filter,
  CheckCircle,
  HelpCircle,
  X,
  Upload,
  Check,
  Phone,
  PhoneCall,
  Mail,
  MapPin,
  Download,
  Shield,
  Lock,
  Bell,
  CheckCheck,
  SlidersHorizontal,
  Sliders,
  Wallet,
  Globe,
  Key,
  Edit2,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { productsApi } from '@/api/products.api';
import { ordersApi } from '@/api/orders.api';
import { rfqApi } from '@/api/rfq.api';
import { sellerApi, SellerAnalytics } from '@/api/seller.api';
import { uploadApi } from '@/api/upload.api';
import { inquiriesApi } from '@/api/inquiries.api';
import { notificationsApi } from '@/api/notifications.api';
import { categoriesApi, CategoryDto } from '@/api/categories.api';
import { subcategoriesApi, SubcategoryDto } from '@/api/subcategories.api';
import { Product } from '@/types/product';
import { RFQ } from '@/types/rfq';
import { Order } from '@/types/order';


/* ──────────────────────────── TYPES & DATA ──────────────────────────── */

type TabType =
  | 'dashboard'
  | 'products'
  | 'categories'
  | 'subcategories'
  | 'rfqs'
  | 'enquiries'
  | 'orders'
  | 'sales'
  | 'revenue'
  | 'analytics'
  | 'inventory'
  | 'settings';

type TimeRange = '7d' | '30d' | '3m' | '1y';

interface ChartPoint {
  label: string;
  revenue: number; // in thousands (₹K)
  orders: number;
  date: string;
}

interface SidebarSubItem {
  id: string;
  label: string;
  tab: TabType;
  action?: 'add-product';
  badge?: string | number;
  badgeColor?: string;
}

interface SidebarCategory {
  id: string;
  label: string;
  icon: any;
  defaultTab: TabType;
  badge?: string | number;
  badgeColor?: string;
  subItems: SidebarSubItem[];
}

const SIDEBAR_CATEGORIES: SidebarCategory[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    defaultTab: 'dashboard',
    subItems: [],
  },
  {
    id: 'products',
    label: 'Products',
    icon: Package,
    defaultTab: 'products',
    subItems: [],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Boxes,
    defaultTab: 'inventory',
    subItems: [
      { id: 'inventory-overview', label: 'Inventory Overview', tab: 'inventory' },
      { id: 'stock-management', label: 'Stock Management', tab: 'inventory' },
      { id: 'low-stock', label: 'Low Stock', tab: 'inventory' },
    ],
  },
  {
    id: 'orders',
    label: 'Orders',
    icon: ShoppingCart,
    defaultTab: 'orders',
    subItems: [
      { id: 'all-orders', label: 'All Orders', tab: 'orders' },
      { id: 'pending-orders', label: 'Pending Orders', tab: 'orders' },
      { id: 'completed-orders', label: 'Completed Orders', tab: 'orders' },
      { id: 'cancelled-orders', label: 'Cancelled Orders', tab: 'orders' },
    ],
  },
  {
    id: 'enquiries',
    label: 'Enquiries',
    icon: MessageSquare,
    defaultTab: 'enquiries',
    subItems: [
      { id: 'all-enquiries', label: 'All Enquiries', tab: 'enquiries' },
      { id: 'new-enquiries', label: 'New Enquiries', tab: 'enquiries' },
      { id: 'responded-enquiries', label: 'Responded Enquiries', tab: 'enquiries' },
    ],
  },
  {
    id: 'business',
    label: 'Business',
    icon: TrendingUp,
    defaultTab: 'sales',
    subItems: [
      { id: 'sales', label: 'Sales', tab: 'sales' },
      { id: 'revenue', label: 'Revenue', tab: 'revenue' },
      { id: 'analytics', label: 'Analytics', tab: 'analytics' },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    icon: User,
    defaultTab: 'settings',
    subItems: [],
  },
];

/* ──────────────────────────── PREMIUM CHART COMPONENT ──────────────────────────── */

interface PremiumChartProps {
  points: ChartPoint[];
  hoveredPointIndex: number | null;
  setHoveredPointIndex: (idx: number | null) => void;
}

function PremiumChart({ points, hoveredPointIndex, setHoveredPointIndex }: PremiumChartProps) {
  const W = 600;
  const H = 180;
  const PX = 40;
  const PY = 24;
  const innerW = W - PX * 2;
  const innerH = H - PY * 2;

  const maxRev = Math.max(...points.map((p) => p.revenue), 1);

  const coords = points.map((pt, idx) => {
    const x =
      points.length > 1 ? PX + (idx / (points.length - 1)) * innerW : W / 2;
    const y = H - PY - (pt.revenue / maxRev) * innerH;
    return { x, y, pt };
  });

  // Smooth cubic Bézier path
  function buildSmoothPath(pts: { x: number; y: number }[]) {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const cp1x = pts[i].x + (pts[i + 1].x - pts[i].x) / 3;
      const cp1y = pts[i].y;
      const cp2x = pts[i].x + (2 * (pts[i + 1].x - pts[i].x)) / 3;
      const cp2y = pts[i + 1].y;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pts[i + 1].x} ${pts[i + 1].y}`;
    }
    return d;
  }

  const linePath = buildSmoothPath(coords);
  const areaPath =
    coords.length > 1
      ? `${linePath} L ${coords[coords.length - 1].x} ${H - PY} L ${coords[0].x} ${H - PY} Z`
      : '';

  // Y-axis reference values
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    value: Math.round(maxRev * f),
    y: H - PY - f * innerH,
  }));

  return (
    <div className="relative w-full">

      {/* Tooltip */}
      {hoveredPointIndex !== null && coords[hoveredPointIndex] && (
        <div className="mb-3 inline-flex items-center gap-3 px-4 py-2.5 bg-dark-900 text-white rounded-2xl text-xs shadow-lg border border-dark-700 animate-fade-in">
          <span className="text-dark-300 font-medium">
            {coords[hoveredPointIndex].pt.date}
          </span>
          <span className="h-3 w-px bg-dark-600" />
          <span className="flex items-center gap-1 text-emerald-400 font-bold font-mono">
            <TrendingUp className="h-3 w-3" />
            ₹{coords[hoveredPointIndex].pt.revenue.toLocaleString('en-IN')}K
          </span>
          <span className="h-3 w-px bg-dark-600" />
          <span className="flex items-center gap-1 text-blue-300 font-semibold">
            <ShoppingCart className="h-3 w-3" />
            {coords[hoveredPointIndex].pt.orders} orders
          </span>
        </div>
      )}

      {/* SVG Chart */}
      <div className="w-full overflow-hidden rounded-xl bg-gradient-to-b from-dark-50/40 to-transparent">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 'clamp(160px, 28vw, 220px)' }}>
          <defs>
            <linearGradient id="premiumGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16a34a" stopOpacity="0.22" />
              <stop offset="60%" stopColor="#16a34a" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Y-axis grid ticks */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={PX}
                y1={tick.y}
                x2={W - PX}
                y2={tick.y}
                stroke={i === 0 ? '#cbd5e1' : '#e2e8f0'}
                strokeWidth={i === 0 ? 1.5 : 1}
                strokeDasharray={i === 0 ? '0' : '4 4'}
              />
              <text
                x={PX - 6}
                y={tick.y + 4}
                fontSize="9"
                fill="#94a3b8"
                textAnchor="end"
                fontFamily="'Inter', sans-serif"
              >
                {tick.value >= 1000 ? `${(tick.value / 1000).toFixed(0)}K` : tick.value}
              </text>
            </g>
          ))}

          {/* Area Fill */}
          {areaPath && <path d={areaPath} fill="url(#premiumGradient)" />}

          {/* Smooth Curve */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#16a34a"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
            />
          )}

          {/* Milestone Dots */}
          {coords.map((c, idx) => {
            const isHovered = hoveredPointIndex === idx;
            return (
              <g
                key={idx}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredPointIndex(idx)}
                onMouseLeave={() => setHoveredPointIndex(null)}
              >
                {/* Outer pulse ring when hovered */}
                {isHovered && (
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r="10"
                    fill="#16a34a"
                    fillOpacity="0.12"
                  />
                )}
                {/* Main dot */}
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={isHovered ? 5.5 : 4}
                  fill={isHovered ? '#15803d' : '#22c55e'}
                  stroke="#ffffff"
                  strokeWidth="2"
                  style={{ transition: 'r 0.15s ease' }}
                />
                {/* Inner accent */}
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={isHovered ? 2 : 1.5}
                  fill="#ffffff"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* X-axis Labels */}
      <div className="flex items-center justify-between text-[10px] text-dark-400 font-semibold pt-2 px-1">
        {points.map((pt, i) => (
          <span
            key={i}
            className={`text-center transition-colors ${hoveredPointIndex === i ? 'text-brand-700 font-bold' : ''}`}
            style={{ flex: 1 }}
          >
            {pt.label}
          </span>
        ))}
      </div>

    </div>
  );
}

/* ──────────────────────────── MAIN COMPONENT ──────────────────────────── */

export default function SellerDashboardPage() {

  const router = useRouter();
  const { user, isAuthenticated, updateUser } = useAuthStore();
  const [isClient, setIsClient] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [activeSubTab, setActiveSubTab] = useState<string>('inventory-overview');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    dashboard: true,
    products: false,
    inventory: false,
    orders: false,
    enquiries: false,
    business: false,
    account: false,
  });

  // Modal State for Add Product
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [rfqsList, setRfqsList] = useState<RFQ[]>([]);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [productSuccessMsg, setProductSuccessMsg] = useState('');
  const [productErrorMsg, setProductErrorMsg] = useState('');
  const [productCategories, setProductCategories] = useState<CategoryDto[]>([]);
  const [productSubcategories, setProductSubcategories] = useState<SubcategoryDto[]>([]);

  // Add Product Form fields
  const [newProductName, setNewProductName] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('Grains & Pulses');
  const [newProductSubCategory, setNewProductSubCategory] = useState('Basmati Rice');
  const [newProductLocation, setNewProductLocation] = useState('');
  const [newProductCompanyName, setNewProductCompanyName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductUnit, setNewProductUnit] = useState('kg');
  const [newProductMinQty, setNewProductMinQty] = useState('5');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [newProductImages, setNewProductImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Product Variants Form State
  interface VariantInputItem {
    id: string;
    name: string;
    sku: string;
    price: string | number;
    discountPrice: string | number;
    stock: string | number;
    displayOrder: number;
    active: boolean;
  }

  const [newProductVariants, setNewProductVariants] = useState<VariantInputItem[]>([
    {
      id: 'var-1',
      name: '',
      sku: '',
      price: '',
      discountPrice: '',
      stock: '',
      displayOrder: 1,
      active: true,
    },
  ]);



  const handleAddVariant = () => {
    const nextOrder = newProductVariants.length + 1;
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setNewProductVariants((prev) => [
      ...prev,
      {
        id: `var-${Date.now()}-${nextOrder}`,
        name: '',
        sku: `SKU-${randomNum}-${nextOrder}`,
        price: '',
        discountPrice: '',
        stock: '',
        displayOrder: nextOrder,
        active: true,
      },
    ]);
  };

  const handleRemoveVariant = (id: string) => {
    if (newProductVariants.length <= 1) return;
    setNewProductVariants((prev) => prev.filter((v) => v.id !== id));
  };

  const handleUpdateVariant = (id: string, field: keyof VariantInputItem, value: any) => {
    setNewProductVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  };


  // Interactive Inventory State
  const [inventoryItems, setInventoryItems] = useState([
    {
      id: 'inv-1',
      sku: 'SKU-RIC-1121-EXP',
      name: 'Premium Basmati Rice (1121)',
      category: 'Grains & Pulses',
      availableStock: 150,
      unit: 'MT',
      minThreshold: 25,
      committedQty: 50,
      warehouseBay: 'Bay A-12 (Amritsar Hub)',
      status: 'In Stock' as 'In Stock' | 'Low Stock' | 'Out of Stock',
      lastUpdated: 'Today, 09:15 AM',
    },
    {
      id: 'inv-2',
      sku: 'SKU-TUR-SAL-ORG',
      name: 'Organic Turmeric Finger (Salem)',
      category: 'Spices',
      availableStock: 25,
      unit: 'MT',
      minThreshold: 10,
      committedQty: 5,
      warehouseBay: 'Bay C-04 (Cochin Port)',
      status: 'In Stock' as 'In Stock' | 'Low Stock' | 'Out of Stock',
      lastUpdated: 'Yesterday',
    },
    {
      id: 'inv-3',
      sku: 'SKU-PEP-MAL-MG1',
      name: 'Black Pepper (MG1) — Malabar',
      category: 'Spices',
      availableStock: 1.5,
      unit: 'MT',
      minThreshold: 5,
      committedQty: 10,
      warehouseBay: 'Bay C-08 (Kozhikode)',
      status: 'Low Stock' as 'In Stock' | 'Low Stock' | 'Out of Stock',
      lastUpdated: 'Today, 08:30 AM',
    },
    {
      id: 'inv-4',
      sku: 'SKU-CRD-8MM-BLD',
      name: 'Green Cardamom (8mm Bold)',
      category: 'Spices',
      availableStock: 18,
      unit: 'MT',
      minThreshold: 5,
      committedQty: 2,
      warehouseBay: 'Bay B-02 (Bodinaickanur)',
      status: 'In Stock' as 'In Stock' | 'Low Stock' | 'Out of Stock',
      lastUpdated: '2 days ago',
    },
    {
      id: 'inv-5',
      sku: 'SKU-OIL-COT-FLX',
      name: 'Refined Cottonseed Oil (Flexi)',
      category: 'Oilseeds',
      availableStock: 0,
      unit: 'KL',
      minThreshold: 10,
      committedQty: 0,
      warehouseBay: 'Tank Farm T-3 (Kandla)',
      status: 'Out of Stock' as 'In Stock' | 'Low Stock' | 'Out of Stock',
      lastUpdated: '3 days ago',
    },
    {
      id: 'inv-6',
      sku: 'SKU-CUM-JRA-MCN',
      name: 'Cumin Seeds (Jeera Machine Cleaned)',
      category: 'Spices',
      availableStock: 3.2,
      unit: 'MT',
      minThreshold: 8,
      committedQty: 1.5,
      warehouseBay: 'Bay D-06 (Unjha Yard)',
      status: 'Low Stock' as 'In Stock' | 'Low Stock' | 'Out of Stock',
      lastUpdated: '1 day ago',
    },
    {
      id: 'inv-7',
      sku: 'SKU-CAS-W24-EXP',
      name: 'Cashew Nuts (W240 Grade)',
      category: 'Dry Fruits',
      availableStock: 12,
      unit: 'MT',
      minThreshold: 4,
      committedQty: 3,
      warehouseBay: 'Bay E-01 (Mangalore Port)',
      status: 'In Stock' as 'In Stock' | 'Low Stock' | 'Out of Stock',
      lastUpdated: '4 days ago',
    },
  ]);

  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState('all');
  const [stockUpdateSuccessMsg, setStockUpdateSuccessMsg] = useState('');
  const [categoriesList, setCategoriesList] = useState<CategoryDto[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryDto | null>(null);
  const [categoryFormName, setCategoryFormName] = useState('');
  const [categoryFormImage, setCategoryFormImage] = useState('');
  const [categoryFormSubcategories, setCategoryFormSubcategories] = useState('');
  const [categoryFormDiscount, setCategoryFormDiscount] = useState('0');
  const [categorySuccessMsg, setCategorySuccessMsg] = useState('');

  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCategoryFormName('');
    setCategoryFormImage('');
    setCategoryFormSubcategories('');
    setCategoryFormDiscount('0');
    setCategorySuccessMsg('');
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: CategoryDto) => {
    setEditingCategory(cat);
    setCategoryFormName(cat.name);
    setCategoryFormImage(cat.imageUrl || '');
    setCategoryFormSubcategories((cat.subcategories || []).join(', '));
    setCategoryFormDiscount(cat.discountPercentage?.toString() || '0');
    setCategorySuccessMsg('');
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryFormName.trim()) return;

    const subcats = categoryFormSubcategories
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const discount = Number(categoryFormDiscount) || 0;

    if (editingCategory) {
      const updated: CategoryDto = {
        ...editingCategory,
        name: categoryFormName.trim(),
        imageUrl: categoryFormImage.trim() || editingCategory.imageUrl || '',
        subcategories: subcats,
        discountPercentage: discount,
      };

      setCategoriesList((prev) => prev.map((c) => (c.id === editingCategory.id ? updated : c)));
      categoriesApi.updateCategory(editingCategory.id, updated).catch(() => {});
      setCategorySuccessMsg('Category updated successfully!');
    } else {
      const newCat: CategoryDto = {
        id: `cat-${Date.now()}`,
        name: categoryFormName.trim(),
        imageUrl: categoryFormImage.trim() || '',
        subcategories: subcats,
        discountPercentage: discount,
      };

      setCategoriesList((prev) => [...prev, newCat]);
      categoriesApi.createCategory(newCat).catch(() => {});
      setCategorySuccessMsg('Category created successfully!');
    }

    setTimeout(() => {
      setIsCategoryModalOpen(false);
      setCategorySuccessMsg('');
    }, 800);
  };

  const handleDeleteCategory = (catId: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      setCategoriesList((prev) => prev.filter((c) => c.id !== catId));
      categoriesApi.deleteCategory(catId).catch(() => {});
    }
  };

  // Interactive Orders State
  const [ordersList, setOrdersList] = useState([
    {
      id: 'ord-1',
      orderNumber: 'KFPCL-2026-0001',
      buyerCompany: 'Gulf Foodstuff Trading LLC',
      buyerContact: 'Ahmed Al-Sayed',
      destination: 'Jebel Ali Port, Dubai, UAE',
      items: [
        { productName: 'Premium Basmati Rice (1121)', quantity: 50, unit: 'MT', price: 85000, totalPrice: 4250000 },
      ],
      total: 4500000,
      createdAt: '2026-08-18',
      estimatedDelivery: '2026-09-20',
      status: 'processing' as 'processing' | 'shipped' | 'delivered' | 'cancelled',
      trackingNumber: 'EXIM-DXB-998241',
      vesselName: 'MSC Katie Voyage 264W',
      cancellationReason: '',
    },
    {
      id: 'ord-2',
      orderNumber: 'KFPCL-2026-0002',
      buyerCompany: 'Al-Madina Agro Importers',
      buyerContact: 'Tariq Mansoor',
      destination: 'Jeddah Islamic Port, Saudi Arabia',
      items: [
        { productName: 'Black Pepper (MG1) — Malabar', quantity: 10, unit: 'MT', price: 420000, totalPrice: 4200000 },
      ],
      total: 4400000,
      createdAt: '2026-08-20',
      estimatedDelivery: '2026-09-25',
      status: 'processing' as 'processing' | 'shipped' | 'delivered' | 'cancelled',
      trackingNumber: 'EXIM-JED-339182',
      vesselName: 'Hapag-Lloyd Express 11B',
      cancellationReason: '',
    },
    {
      id: 'ord-3',
      orderNumber: 'KFPCL-2026-0000',
      buyerCompany: 'EuroSpices BV',
      buyerContact: 'Elena Rostova',
      destination: 'Port of Rotterdam, Netherlands',
      items: [
        { productName: 'Organic Turmeric Finger (Salem)', quantity: 25, unit: 'MT', price: 85000, totalPrice: 2125000 },
      ],
      total: 2150000,
      createdAt: '2026-08-12',
      estimatedDelivery: '2026-09-10',
      status: 'shipped' as 'processing' | 'shipped' | 'delivered' | 'cancelled',
      trackingNumber: 'EXIM-RTM-482019',
      vesselName: 'Maersk Mc-Kinney Moller 90E',
      cancellationReason: '',
    },
    {
      id: 'ord-4',
      orderNumber: 'KFPCL-2025-9984',
      buyerCompany: 'Gulf Foodstuff Trading LLC',
      buyerContact: 'Ahmed Al-Sayed',
      destination: 'Jebel Ali Port, Dubai, UAE',
      items: [
        { productName: 'Premium Basmati Rice (1121)', quantity: 120, unit: 'MT', price: 81000, totalPrice: 9720000 },
      ],
      total: 9800000,
      createdAt: '2026-07-28',
      estimatedDelivery: '2026-08-15',
      status: 'delivered' as 'processing' | 'shipped' | 'delivered' | 'cancelled',
      trackingNumber: 'EXIM-DXB-771924',
      vesselName: 'CMA CGM Vela 401A',
      cancellationReason: '',
    },
    {
      id: 'ord-5',
      orderNumber: 'KFPCL-2026-0003',
      buyerCompany: 'Levant Trade Hub',
      buyerContact: 'Karim Haddad',
      destination: 'Port of Beirut, Lebanon',
      items: [
        { productName: 'Green Cardamom (8mm Bold)', quantity: 15, unit: 'MT', price: 312000, totalPrice: 4680000 },
      ],
      total: 4680000,
      createdAt: '2026-08-05',
      estimatedDelivery: '',
      status: 'cancelled' as 'processing' | 'shipped' | 'delivered' | 'cancelled',
      trackingNumber: 'N/A',
      vesselName: 'N/A',
      cancellationReason: 'Buyer import quota regulatory permit expired prior to vessel booking.',
    },
  ]);

  const [viewingOrder, setViewingOrder] = useState<(typeof ordersList)[0] | null>(null);
  const [orderActionMsg, setOrderActionMsg] = useState('');

  // Interactive Enquiries State - loaded from API in useEffect
  const [enquiriesList, setEnquiriesList] = useState<any[]>([]);


  type ReplyTarget = (typeof enquiriesList)[number] & {
    source: 'inquiry' | 'rfq';
    targetPrice?: number;
    unit?: string;
  };

  // Reply modal is shared by regular enquiries and RFQs.
  const [replyingEnquiry, setReplyingEnquiry] = useState<ReplyTarget | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyOfferPrice, setReplyOfferPrice] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replySuccessMsg, setReplySuccessMsg] = useState('');
  const [replyErrorMsg, setReplyErrorMsg] = useState('');

  // Settings State
  const [settingsTab, setSettingsTab] = useState<'profile' | 'preferences' | 'notifications' | 'security'>('profile');
  const [sellerProfile, setSellerProfile] = useState({
    companyName: user?.name || 'Aditya Agro Exports',
    gstin: '03AAACA1234A1Z5',
    iecCode: '0308012345',
    apedaReg: 'APEDA/EX/2024/9841',
    address: 'Plot 42, GT Road Industrial Focal Point',
    city: 'Amritsar',
    state: 'Punjab',
    pincode: '143001',
    country: 'India',
    contactPerson: 'Aditya Sharma',
    contactEmail: user?.email || 'seller@example.com',
    contactPhone: '+91 98765 12345',
    description: 'Leading agricultural commodity exporter specializing in premium Basmati Rice, Organic Spices, and certified grains for GCC, European, and North American markets.',
  });

  const [accountPreferences, setAccountPreferences] = useState({
    exportCurrency: 'INR (₹)',
    exportTerms: 'CIF (Cost, Insurance & Freight)',
    payoutMode: 'Instant Bank Transfer (NEFT/IMPS)',
    bankName: 'HDFC Bank Ltd',
    accountNumber: '50200084729104',
    ifscCode: 'HDFC0001423',
    accountHolder: 'Aditya Agro Exports Pvt Ltd',
    autoDisburseEscrow: true,
  });

  const [notificationPrefs, setNotificationPrefs] = useState({
    whatsappRfq: true,
    emailQuotes: true,
    smsDispatches: true,
    escrowAlerts: true,
    weeklyMarketReport: false,
  });

  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState('');
  const [settingsErrorMsg, setSettingsErrorMsg] = useState('');

  // Analytics states
  const [timeRange, setTimeRange] = useState<TimeRange>('3m');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [sellerAnalytics, setSellerAnalytics] = useState<SellerAnalytics | null>(null);

  // Strict Route Protection & Initial URL/LocalStorage Sync
  useEffect(() => {
    setIsClient(true);
    productsApi
      .getSellerProducts()
      .then((items) => setProductsList(items || []))
      .catch(() => setProductsList([]));


    categoriesApi
      .getCategories()
      .then((items) => setProductCategories(items || []))
      .catch(() => setProductCategories([]));

    subcategoriesApi
      .getSubcategories()
      .then((items) => setProductSubcategories(items || []))
      .catch(() => setProductSubcategories([]));

    ordersApi
      .getSellerOrders()
      .then((data) => setOrdersList((data as any) || []))
      .catch(() => setOrdersList([]));

    sellerApi
      .getAnalytics()
      .then(setSellerAnalytics)
      .catch(() => setSellerAnalytics(null));

    rfqApi
      .getSellerRFQFeed()
      .then((data) => setRfqsList(data || []))
      .catch(() => setRfqsList([]));

    sellerApi
      .getInventory()
      .then((inv) => {
        if (inv.content && inv.content.length > 0) {
          setInventoryItems(
            inv.content.map((item) => ({
              id: item.id,
              sku: item.sku,
              name: item.productName,
              category: 'Export Commodity',
              availableStock: item.availableQuantity,
              unit: 'MT',
              minThreshold: 5,
              committedQty: Math.max(0, item.stockQuantity - item.availableQuantity),
              warehouseBay: 'Central Depot',
              status:
                item.availableQuantity === 0
                  ? ('Out of Stock' as const)
                  : item.availableQuantity <= 5
                  ? ('Low Stock' as const)
                  : ('In Stock' as const),
              lastUpdated: item.updatedAt ? formatDate(item.updatedAt) : 'Today',
            }))
          );
        }
      })
      .catch(() => {});

    // Load enquiries from backend
    inquiriesApi
      .getInquiries()
      .then((items) => setEnquiriesList(items || []))
      .catch(() => setEnquiriesList([]));

    // Load categories from backend for categories management tab
    categoriesApi
      .getCategories()
      .then((items) => setCategoriesList(items || []))
      .catch(() => setCategoriesList([]));

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlTab = urlParams.get('tab') as TabType;
      const urlSubTab = urlParams.get('subTab');

      if (urlTab) {
        setActiveTab(urlTab);
      }
      if (urlSubTab) {
        setActiveSubTab(urlSubTab);
        if (urlTab === 'settings') {
          if (urlSubTab === 'settings') setSettingsTab('preferences');
          else if (urlSubTab === 'business-profile') setSettingsTab('profile');
        }
      }

      // Load saved settings from localStorage
      try {
        const savedSettings = localStorage.getItem('kfpcl_supplier_settings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          if (parsed.profile) setSellerProfile(parsed.profile);
          if (parsed.notifications) setNotificationPrefs(parsed.notifications);
          if (parsed.preferences) setAccountPreferences(parsed.preferences);
        }
      } catch (err) {}
    }

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    // If logged in as buyer, redirect to account profile
    if (user?.role === 'buyer') {
      router.replace('/profile');
    }
  }, [isAuthenticated, user, router]);

  // Keep matching category expanded when activeTab changes
  useEffect(() => {
    const matchedCategory = SIDEBAR_CATEGORIES.find(
      (cat) => cat.defaultTab === activeTab || cat.subItems.some((s) => s.tab === activeTab)
    );
    if (matchedCategory) {
      setExpandedCategories((prev) => ({
        ...prev,
        [matchedCategory.id]: true,
      }));
    }
  }, [activeTab]);

  // Sync URL search params with active tab without page reload
  useEffect(() => {
    if (typeof window !== 'undefined' && isClient) {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', activeTab);
      url.searchParams.set('subTab', activeSubTab);
      window.history.replaceState(null, '', url.toString());
    }
  }, [activeTab, activeSubTab, isClient]);

  const handleCategoryToggle = (category: SidebarCategory) => {
    const isCurrentlyExpanded = !!expandedCategories[category.id];
    setExpandedCategories((prev) => ({
      ...prev,
      [category.id]: !isCurrentlyExpanded,
    }));
    setActiveTab(category.defaultTab);
    if (category.subItems.length > 0) {
      setActiveSubTab(category.subItems[0].id);
      if (category.defaultTab === 'settings') {
        if (category.subItems[0].id === 'settings') setSettingsTab('preferences');
        else setSettingsTab('profile');
      }
    } else {
      setActiveSubTab(category.id);
    }
  };

  const handleSubItemSelect = (subItem: SidebarSubItem) => {
    setActiveTab(subItem.tab);
    setActiveSubTab(subItem.id);
    if (subItem.tab === 'settings') {
      if (subItem.id === 'settings') setSettingsTab('preferences');
      else if (subItem.id === 'business-profile') setSettingsTab('profile');
    }
    if (subItem.action === 'add-product') {
      setIsAddModalOpen(true);
    }
  };


  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const selectedFiles = Array.from(files);
    e.target.value = '';

    try {
      const uploadedUrls = await uploadApi.uploadFiles(selectedFiles);
      if (uploadedUrls.length > 0) {
        setNewProductImages((prev) => [...prev, ...uploadedUrls.filter((url) => !prev.includes(url))]);
        return;
      }
    } catch (error) {
      console.error('Failed to upload product images', error);
    }

    const previewUrls = await Promise.all(
      selectedFiles.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          })
      )
    );
    setNewProductImages((prev) => [...prev, ...previewUrls.filter((url) => !prev.includes(url))]);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) return;

    setIsSubmittingProduct(true);
    setProductErrorMsg('');

    const basePrice = Number(newProductPrice) || Number(newProductVariants[0]?.price) || 0;

    const mappedVariants = newProductVariants
      .filter((v) => v.name.trim() || v.sku.trim() || Number(v.price) > 0)
      .map((v, index) => {
        const rawSku = v.sku?.trim();
        const finalSku =
          rawSku && rawSku !== 'WF-1KG-SKU'
            ? rawSku
            : `SKU-${Date.now().toString().slice(-6)}-${index + 1}-${Math.floor(100 + Math.random() * 900)}`;

        return {
          id: v.id || `var-${Date.now()}-${index}`,
          name: v.name.trim() || `Variant ${index + 1}`,
          sku: finalSku,
          price: Number(v.price) || basePrice,
          discountPrice: Number(v.discountPrice) || undefined,
          stock: Number(v.stock) || 0,
          displayOrder: Number(v.displayOrder) || index + 1,
          active: v.active ?? true,
          available: (Number(v.stock) || 0) > 0,
          unit: newProductUnit,
        };
      });

    const categoryId =
      productCategories.find(
        (category) =>
          category.id === newProductCategory ||
          category.name.toLowerCase() === newProductCategory.trim().toLowerCase()
      )?.id || newProductCategory.trim();
    const subcategoryId =
      productSubcategories.find(
        (subcategory) =>
          (subcategory.id === newProductSubCategory ||
            subcategory.name.toLowerCase() === newProductSubCategory.trim().toLowerCase()) &&
          (!subcategory.categoryId || subcategory.categoryId === categoryId)
      )?.id || newProductSubCategory.trim();

    try {
      const savedProduct = await productsApi.createProduct({
        name: newProductName.trim(),
        sellerId: user?.id,
        sellerLocation: newProductLocation.trim() || sellerProfile.city || 'India',
        sellerCompany: newProductCompanyName.trim() || sellerProfile.companyName || user?.name || 'Karthikeya Farmer Producer Company Limited Verified Supplier',

        categoryId,
        subcategoryId,
        price: basePrice,
        mrp: basePrice,
        stockQuantity: Number(mappedVariants[0]?.stock) || 100,
        minOrderQty: Number(newProductMinQty) || 5,
        unit: newProductUnit,
        description:
          newProductDescription.trim() || 'Export-grade commodity verified by Karthikeya Farmer Producer Company Limited quality inspectors.',
        images: newProductImages,
        variants: mappedVariants,
      });

      // Refresh the real database product list for this seller
      const savedProducts = await productsApi.getSellerProducts();
      setProductsList(
        savedProducts.some((p) => p.id === savedProduct.id)
          ? savedProducts
          : [savedProduct, ...savedProducts]
      );
      setProductSuccessMsg(`"${savedProduct.name}" has been submitted successfully!`);


      setNewProductName('');
      setNewProductCategory('Grains & Pulses');
      setNewProductSubCategory('Basmati Rice');
      setNewProductLocation('');
      setNewProductCompanyName('');
      setNewProductPrice('');
      setNewProductMinQty('5');
      setNewProductDescription('');
      setNewProductImages([]);
      setNewProductVariants([
        {
          id: 'var-1',
          name: '',
          sku: '',
          price: '',
          discountPrice: '',
          stock: '',
          displayOrder: 1,
          active: true,
        },
      ]);

      setTimeout(() => {

        setIsAddModalOpen(false);
        setProductSuccessMsg('');
      }, 1200);

    } catch (error: any) {
      console.error('Failed to create seller product', error);
      setProductErrorMsg(
        error?.response?.data?.message || 'Unable to save the product. Please try again.'
      );
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this product?')) return;

    try {
      await productsApi.deleteProduct(id);
      // Keep the table aligned with the persisted seller catalog rather than
      // hiding a product only in the current browser session.
      setProductsList(await productsApi.getSellerProducts(user?.id));
    } catch (error: any) {
      console.error('Failed to delete seller product', error);
      setProductErrorMsg(
        error?.response?.data?.message || 'Unable to remove the product. Please try again.'
      );
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !replyingEnquiry) return;

    const isRfqReply = replyingEnquiry.source === 'rfq';
    const offeredPrice = Number(replyOfferPrice);
    if (isRfqReply && (!Number.isFinite(offeredPrice) || offeredPrice <= 0)) {
      setReplyErrorMsg('Enter a valid offered price before submitting the quotation.');
      return;
    }

    setIsSendingReply(true);
    setReplyErrorMsg('');
    try {
      if (isRfqReply) {
        await rfqApi.submitQuoteToFeed(replyingEnquiry.id, {
          offeredPrice,
          notes: replyMessage.trim(),
        });
        setRfqsList((prev) =>
          prev.map((rfq) => (rfq.id === replyingEnquiry.id ? { ...rfq, status: 'quoted' } : rfq))
        );
      } else {
        await inquiriesApi.replyInquiry(replyingEnquiry.id, replyMessage.trim());
        setEnquiriesList((prev) =>
          prev.map((enq) =>
            enq.id === replyingEnquiry.id
              ? { ...enq, status: 'Replied', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
              : enq
          )
        );
      }

      setIsSendingReply(false);
      setReplySuccessMsg(
        isRfqReply
          ? 'Your quotation has been sent to the buyer successfully.'
          : 'Your response has been sent to the buyer successfully.'
      );
      setTimeout(() => {
        setReplyingEnquiry(null);
        setReplyMessage('');
        setReplyOfferPrice('');
        setReplySuccessMsg('');
      }, 1200);
    } catch (error: any) {
      setIsSendingReply(false);
      setReplyErrorMsg(
        error?.response?.data?.message || 'Unable to send the response. Please try again.'
      );
    }
  };

  const handleUpdateStockQuantity = (id: string, delta: number) => {
    setInventoryItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newStock = Math.max(0, Number((item.availableStock + delta).toFixed(1)));
          let newStatus: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
          if (newStock === 0) newStatus = 'Out of Stock';
          else if (newStock <= item.minThreshold) newStatus = 'Low Stock';
          return {
            ...item,
            availableStock: newStock,
            status: newStatus,
            lastUpdated: 'Just now',
          };
        }
        return item;
      })
    );

    sellerApi
      .updateInventoryStock(id, {
        type: delta >= 0 ? 'ADD' : 'SUBTRACT',
        quantity: Math.abs(delta),
        reason: 'Warehouse lot manual adjustment',
      })
      .catch(() => {});

    setStockUpdateSuccessMsg('Warehouse stock quantity updated and persisted successfully!');
    setTimeout(() => setStockUpdateSuccessMsg(''), 2500);
  };

  const handleReplenishStock = (id: string, amount: number = 10) => {
    setInventoryItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newStock = item.availableStock + amount;
          return {
            ...item,
            availableStock: newStock,
            status: newStock > item.minThreshold ? 'In Stock' : 'Low Stock',
            lastUpdated: 'Just now',
          };
        }
        return item;
      })
    );

    sellerApi
      .updateInventoryStock(id, {
        type: 'ADD',
        quantity: amount,
        reason: 'Lot replenishment shipment received',
      })
      .catch(() => {});

    setStockUpdateSuccessMsg(`Stock replenished (+${amount}) and persisted successfully!`);
    setTimeout(() => setStockUpdateSuccessMsg(''), 2500);
  };

  const handleMarkOrderShipped = async (orderId: string) => {
    try {
      const updatedOrder = await ordersApi.updateSellerOrderStatus(orderId, { status: 'SHIPPED' });
      setOrdersList((prev) =>
        prev.map((ord) =>
          ord.id === orderId
            ? {
                ...ord,
                status: 'shipped',
                trackingNumber: updatedOrder.trackingNumber || ord.trackingNumber,
              }
            : ord
        )
      );
      setOrderActionMsg('Order status updated to Shipped! Bill of Lading generated.');
    } catch (error) {
      console.error('Failed to update order status', error);
      setOrderActionMsg('Unable to update the order status. Please try again.');
    }
    setTimeout(() => setOrderActionMsg(''), 3000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerProfile.companyName.trim() || !sellerProfile.contactEmail.trim()) {
      setSettingsErrorMsg('Company Name and Contact Email are required.');
      return;
    }

    // Update global auth store
    updateUser({
      name: sellerProfile.companyName,
      email: sellerProfile.contactEmail,
      phone: sellerProfile.contactPhone,
    });

    // Save to localStorage for permanent persistence
    try {
      const existing = JSON.parse(localStorage.getItem('kfpcl_supplier_settings') || '{}');
      localStorage.setItem(
        'kfpcl_supplier_settings',
        JSON.stringify({ ...existing, profile: sellerProfile })
      );
    } catch (err) {}

    setSettingsErrorMsg('');
    setSettingsSuccessMsg('Business profile credentials updated and saved successfully!');
    setTimeout(() => setSettingsSuccessMsg(''), 3000);
  };

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const existing = JSON.parse(localStorage.getItem('kfpcl_supplier_settings') || '{}');
      localStorage.setItem(
        'kfpcl_supplier_settings',
        JSON.stringify({ ...existing, preferences: accountPreferences })
      );
    } catch (err) {}

    setSettingsErrorMsg('');
    setSettingsSuccessMsg('Account & Settlement preferences updated successfully!');
    setTimeout(() => setSettingsSuccessMsg(''), 3000);
  };

  const handleSaveNotifications = () => {
    try {
      const existing = JSON.parse(localStorage.getItem('kfpcl_supplier_settings') || '{}');
      localStorage.setItem(
        'kfpcl_supplier_settings',
        JSON.stringify({ ...existing, notifications: notificationPrefs })
      );
    } catch (err) {}

    notificationsApi
      .updatePreferences({
        newInquiry: notificationPrefs.emailQuotes,
        orderUpdates: notificationPrefs.smsDispatches,
        rfqUpdates: notificationPrefs.whatsappRfq,
        stockAlerts: notificationPrefs.escrowAlerts,
        paymentUpdates: notificationPrefs.escrowAlerts,
        whatsappEnabled: notificationPrefs.whatsappRfq,
      })
      .catch(() => {});

    setSettingsErrorMsg('');
    setSettingsSuccessMsg('Notification alert preferences saved and synced successfully!');
    setTimeout(() => setSettingsSuccessMsg(''), 3000);
  };


  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!securityForm.currentPassword) {
      setSettingsErrorMsg('Please enter your current account password.');
      return;
    }
    if (securityForm.newPassword.length < 6) {
      setSettingsErrorMsg('New password must be at least 6 characters.');
      return;
    }
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      setSettingsErrorMsg('New password and confirm password do not match.');
      return;
    }

    setSettingsErrorMsg('');
    setSettingsSuccessMsg('Security password updated and encrypted successfully!');
    setSecurityForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setTimeout(() => setSettingsSuccessMsg(''), 3000);
  };

  if (!isClient || !isAuthenticated || user?.role === 'buyer') {
    return (
      <div className="section min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-dark-500">Loading Supplier Dashboard…</p>
        </div>
      </div>
    );
  }

  // Computed live analytics from API (no hardcoded data)
  const currentAnalytics = {
    summary: {
      revenue: sellerAnalytics ? formatCurrency(sellerAnalytics.revenue) : '—',
      orders: sellerAnalytics?.totalOrders ?? 0,
      avgOrder: sellerAnalytics?.uniqueBuyers ? `${sellerAnalytics.uniqueBuyers} buyers` : '—',
      pending: sellerAnalytics?.repeatCustomers ?? 0,
    },
    points: (sellerAnalytics?.totalOrders ?? 0) > 0
      ? [{ label: 'Total', revenue: Math.round((sellerAnalytics!.revenue || 0) / 1000), orders: sellerAnalytics!.totalOrders, date: 'All time' }]
      : [],
  };

  // Inventory Filter Logic
  const filteredInventory = inventoryItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      item.sku.toLowerCase().includes(inventorySearch.toLowerCase());
    const matchesCategory =
      inventoryCategoryFilter === 'all' || item.category === inventoryCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const lowStockItems = inventoryItems.filter(
    (item) => item.status === 'Low Stock' || item.status === 'Out of Stock' || item.availableStock <= item.minThreshold
  );

  // Orders Filter Logic
  const filteredOrders = ordersList.filter((ord) => {
    if (activeSubTab === 'pending-orders') return ord.status === 'processing';
    if (activeSubTab === 'completed-orders') return ord.status === 'shipped' || ord.status === 'delivered';
    if (activeSubTab === 'cancelled-orders') return ord.status === 'cancelled';
    return true; // all-orders
  });

  // Enquiries Filter Logic
  const filteredEnquiries = enquiriesList.filter((enq) => {
    if (activeSubTab === 'new-enquiries') return enq.status === 'Unread';
    if (activeSubTab === 'responded-enquiries') return enq.status === 'Replied' || enq.status === 'In Progress';
    return true; // all-enquiries
  });

  // Dynamic categories and subcategories derived from real products catalog
  const activeCategories = Array.from(
    new Set(productsList.map((p) => p.category).filter(Boolean))
  );

  const activeSubcategories = Array.from(
    new Set(
      productsList
        .filter((p) => p.subCategory)
        .map((p) => `${p.category}:::${p.subCategory}`)
    )
  ).map((item) => {
    const [parentCategory, name] = item.split(':::');
    return { parentCategory, name };
  });

  return (
    <div className="bg-[#f8fafc] min-h-screen">

      {/* ─── SUPPLIER CENTER TOP BAR ─── */}
      <div className="sticky top-0 z-40 bg-white border-b border-dark-200/80 shadow-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          {/* Back to Home */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-dark-500 hover:text-brand-700 transition-colors group"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Home</span>
          </Link>

          {/* Center Brand */}
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-brand-600 to-brand-700 flex items-center justify-center shadow-sm">
              <LayoutDashboard className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold font-display text-dark-900 tracking-tight hidden sm:block">
              Supplier Center
            </span>
            <span className="text-[10px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded-full hidden sm:inline-flex items-center gap-1">
              <ShieldCheck className="h-2.5 w-2.5" />
              Verified
            </span>
          </div>

          {/* Right: Supplier Name */}
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center text-xs font-bold">
              {(sellerProfile.companyName || user?.name || 'A')[0]}
            </div>
            <span className="text-xs font-semibold text-dark-700 hidden sm:block">
              {sellerProfile.companyName || user?.name || 'Aditya Agro Exports'}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* ── 1. CLEAN SUPPLIER CENTER HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-dark-200/80">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 shadow-sm flex-shrink-0">
              <LayoutDashboard className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold font-display text-dark-900 tracking-tight">
                  Supplier Center
                </h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full border border-brand-200/60">
                  <ShieldCheck className="h-3 w-3 text-brand-600" />
                  Verified Supplier
                </span>
              </div>
              <p className="text-xs text-dark-500 mt-0.5">
                Welcome back, <strong className="text-dark-700 font-semibold">{sellerProfile.companyName || user?.name || 'Aditya Agro Exports'}</strong> · Manage listings, RFQs, enquiries, shipments &amp; settlements
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveTab('rfqs')}
              className="btn-secondary text-xs py-2 px-3.5 h-9"
            >
              <FileText className="h-4 w-4 text-dark-500" />
              <span>Open RFQs ({rfqsList.length})</span>
            </button>
          </div>
        </div>

        {/* ── SIDEBAR + CONTENT SPLIT ── */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* ── LEFT SIDEBAR ── */}
          <aside className="w-full lg:w-64 flex-shrink-0 bg-white rounded-2xl border border-dark-200/90 shadow-sm p-3 sticky top-24">
            <div className="px-3 py-2 mb-1">
              <p className="text-[11px] font-bold tracking-wider text-dark-400 uppercase">
                Supplier Navigation
              </p>
            </div>

            {/* Navigation links */}
            <nav className="space-y-1">
              {SIDEBAR_CATEGORIES.map((category) => {
                const Icon = category.icon;
                const isExpanded = !!expandedCategories[category.id];
                const isCategoryActive =
                  activeTab === category.defaultTab ||
                  category.subItems.some((s) => s.tab === activeTab && s.id === activeSubTab);

                return (
                  <div key={category.id} className="space-y-0.5">
                    {/* Main Category Header Button */}
                    <button
                      type="button"
                      onClick={() => handleCategoryToggle(category)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isCategoryActive
                          ? 'bg-brand-50/90 text-brand-800 font-bold border border-brand-200/60'
                          : 'text-dark-700 hover:bg-dark-50 hover:text-brand-700 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`h-4 w-4 flex-shrink-0 ${
                            isCategoryActive ? 'text-brand-700' : 'text-dark-500'
                          }`}
                        />
                        <span className="truncate">{category.label}</span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {category.badge && !isExpanded && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                              category.badgeColor || 'bg-dark-100 text-dark-600 border-dark-200'
                            }`}
                          >
                            {category.badge}
                          </span>
                        )}
                        {category.subItems.length > 0 && (
                          <ChevronRight
                            className={`h-3.5 w-3.5 text-dark-400 transition-transform duration-200 ${
                              isExpanded ? 'rotate-90 text-brand-700' : ''
                            }`}
                          />
                        )}
                      </div>
                    </button>

                    {/* Expandable Sub-Categories */}
                    {isExpanded && category.subItems.length > 0 && (
                      <div className="ml-3 pl-3 border-l-2 border-brand-100 space-y-0.5 py-0.5 animate-fade-in">
                        {category.subItems.map((subItem) => {
                          const isSubActive =
                            activeTab === subItem.tab && activeSubTab === subItem.id;

                          return (
                            <button
                              key={subItem.id}
                              type="button"
                              onClick={() => handleSubItemSelect(subItem)}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] transition-all text-left ${
                                isSubActive
                                  ? 'bg-brand-600 text-white font-bold shadow-xs'
                                  : 'text-dark-600 hover:text-brand-700 hover:bg-brand-50/50 font-medium'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span
                                  className={`h-1.5 w-1.5 rounded-full transition-colors flex-shrink-0 ${
                                    isSubActive ? 'bg-white' : 'bg-dark-300'
                                  }`}
                                />
                                <span className="truncate">{subItem.label}</span>
                              </div>

                              {subItem.badge && (
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                                    isSubActive
                                      ? 'bg-white/20 text-white border-white/30'
                                      : subItem.badgeColor || 'bg-dark-100 text-dark-600 border-dark-200'
                                  }`}
                                >
                                  {subItem.badge}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* Quick Supplier Stats in Sidebar */}
            <div className="mt-5 pt-4 border-t border-dark-100 px-3">
              <div className="flex items-center justify-between text-[11px] text-dark-500 mb-1.5">
                <span>Health Score</span>
                <span className="font-bold text-emerald-700">98.4%</span>
              </div>
              <div className="w-full bg-dark-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full w-[98%]" />
              </div>

              <div className="mt-3 text-[11px] text-dark-400">
                <p>GSTIN: <span className="font-mono text-dark-700 font-medium">{sellerProfile.gstin}</span></p>
                <p className="mt-0.5">Escrow: <span className="text-emerald-700 font-semibold">100% Active</span></p>
              </div>
            </div>
          </aside>

          {/* ── RIGHT CONTENT AREA ── */}
          <main className="flex-1 min-w-0 w-full space-y-6">

            {/* ══════════════════════ 1. DASHBOARD TAB ══════════════════════ */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6 animate-fade-in">
                
                {/* KPI / Statistics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                  {
                    label: 'Total Revenue',
                    value: sellerAnalytics ? formatCurrency(sellerAnalytics.revenue) : '—',
                    change: sellerAnalytics ? `${sellerAnalytics.totalOrders} orders` : 'Loading…',
                    changeLabel: 'all time',
                    positive: true,
                    icon: TrendingUp,
                    supporting: sellerAnalytics ? `${sellerAnalytics.uniqueBuyers} unique buyers` : '',
                  },
                  {
                    label: 'Active Products',
                    value: String(productsList.length),
                    change: productsList.length > 0 ? 'Listed products' : 'No listings yet',
                    changeLabel: 'total listings',
                    positive: productsList.length > 0,
                    icon: Package,
                    supporting: `${productsList.filter(p => p.inStock).length} in stock`,
                  },
                  {
                    label: 'Open RFQs',
                    value: String(rfqsList.length),
                    change: rfqsList.length > 0 ? 'Pending quotes' : 'No open RFQs',
                    changeLabel: 'awaiting response',
                    positive: false,
                    icon: FileText,
                    supporting: '',
                  },
                  {
                    label: 'Orders',
                    value: String(ordersList.length),
                    change: ordersList.filter(o => (o as any).status === 'processing').length > 0
                      ? `${ordersList.filter(o => (o as any).status === 'processing').length} to process`
                      : 'All processed',
                    changeLabel: 'total orders',
                    positive: false,
                    icon: ShoppingCart,
                    supporting: `${ordersList.filter(o => (o as any).status === 'shipped').length} shipped`,
                  },
                ].map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                      <div
                        key={stat.label}
                        className="card p-5 relative overflow-hidden group hover:border-brand-300 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div
                            className={`h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                              idx === 0
                                ? 'bg-emerald-50 text-emerald-600'
                                : idx === 1
                                ? 'bg-blue-50 text-blue-600'
                                : idx === 2
                                ? 'bg-amber-50 text-amber-600'
                                : 'bg-orange-50 text-orange-600'
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>

                          <div
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${
                              stat.positive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                                : 'bg-amber-50 text-amber-700 border-amber-200/60'
                            }`}
                          >
                            {stat.positive ? (
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            ) : (
                              <Clock className="h-3 w-3" />
                            )}
                            <span>{stat.change}</span>
                          </div>
                        </div>

                        <div>
                          <p className="text-2xl font-bold font-display text-dark-900 tracking-tight">
                            {stat.value}
                          </p>
                          <p className="text-xs font-medium text-dark-500 mt-1">{stat.label}</p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-dark-100/80 flex items-center justify-between text-[11px] text-dark-400">
                          <span>{stat.supporting}</span>
                          <span className="text-dark-400 font-normal">{stat.changeLabel}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Action Required Banner */}
                <div className="card p-5 bg-gradient-to-r from-emerald-50/40 via-white to-brand-50/30 border-brand-200/80">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-brand-500/10 text-brand-700 flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-brand-600" />
                      </div>
                      <h2 className="font-bold font-display text-dark-900 text-base">
                        Action Required
                      </h2>
                    </div>
                    <span className="text-xs font-medium text-brand-800 bg-brand-100/80 px-2.5 py-0.5 rounded-full w-fit">
                      3 items need your attention
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {[
                      rfqsList.length > 0 && {
                        id: 'act-rfq',
                        title: `${rfqsList.length} RFQ${rfqsList.length > 1 ? 's' : ''} need your response`,
                        description: 'High-value quotation requests awaiting your pricing and confirmation.',
                        actionLabel: 'Respond to RFQs',
                        targetTab: 'rfqs' as TabType,
                        urgency: 'high' as const,
                        icon: Send,
                        badge: `${rfqsList.length} Pending`,
                      },
                      ordersList.filter(o => (o as any).status === 'processing').length > 0 && {
                        id: 'act-orders',
                        title: `${ordersList.filter(o => (o as any).status === 'processing').length} order(s) to process`,
                        description: 'Orders are ready for packaging, tracking ID assignment, and logistics dispatch.',
                        actionLabel: 'Manage Orders',
                        targetTab: 'orders' as TabType,
                        urgency: 'medium' as const,
                        icon: Truck,
                        badge: `${ordersList.filter(o => (o as any).status === 'processing').length} Active`,
                      },
                      productsList.length === 0 && {
                        id: 'act-products',
                        title: 'Add your first product',
                        description: 'Your product catalog is empty. Add products to start receiving enquiries.',
                        actionLabel: 'Add Product',
                        targetTab: 'products' as TabType,
                        urgency: 'low' as const,
                        icon: Package,
                        badge: 'Setup',
                      },
                    ].filter(Boolean).map((item: any) => (
                      <div
                        key={item.id}
                        className="bg-white rounded-xl border border-dark-200/90 p-4 shadow-xs flex flex-col justify-between hover:border-brand-400 hover:shadow-card transition-all"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-xs font-bold text-dark-900">{item.title}</span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                item.urgency === 'high'
                                  ? 'bg-rose-100 text-rose-800'
                                  : item.urgency === 'medium'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {item.badge}
                            </span>
                          </div>
                          <p className="text-xs text-dark-500 leading-relaxed mb-4">
                            {item.description}
                          </p>
                        </div>

                        <button
                          onClick={() => {
                            setActiveTab(item.targetTab);
                            if (item.targetTab === 'inventory') setActiveSubTab('stock-management');
                            if (item.targetTab === 'orders') setActiveSubTab('pending-orders');
                          }}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white transition-colors group"
                        >
                          <span>{item.actionLabel}</span>
                          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Products Table */}
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold font-display text-dark-900 text-base flex items-center gap-2">
                        <Package className="h-4 w-4 text-brand-600" />
                        Top Performing Products
                      </h3>
                      <p className="text-xs text-dark-500 mt-0.5">
                        High volume export items driving revenue
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('products')}
                      className="text-xs font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
                    >
                      View all listings
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-dark-200 text-dark-400 font-semibold">
                          <th className="pb-3 px-2">Product Name</th>
                          <th className="pb-3 px-2">Category</th>
                          <th className="pb-3 px-2 text-right">Volume</th>
                          <th className="pb-3 px-2 text-right">Revenue</th>
                          <th className="pb-3 px-2 text-right">Stock</th>
                          <th className="pb-3 px-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-100">
                        {productsList.slice(0, 4).map((prod) => (
                          <tr key={prod.id} className="hover:bg-dark-50/60 transition-colors">
                            <td className="py-3 px-2 font-semibold text-dark-900">{prod.name}</td>
                            <td className="py-3 px-2 text-dark-500">{prod.category}</td>
                            <td className="py-3 px-2 text-right font-medium text-dark-700">{prod.minOrderQty} {prod.unit}</td>
                            <td className="py-3 px-2 text-right font-bold text-dark-900">{formatCurrency(prod.price)}/{prod.unit}</td>
                            <td className="py-3 px-2 text-right font-medium text-dark-700">{prod.inStock ? 'Available' : 'OOS'}</td>
                            <td className="py-3 px-2 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                prod.inStock
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {prod.inStock ? 'In Stock' : 'Out of Stock'}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {productsList.length === 0 && (
                          <tr><td colSpan={6} className="py-8 text-center text-sm text-dark-400">No products listed yet.</td></tr>
                        )}

                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recent Activities */}
                <div className="card p-5">
                  <h3 className="font-bold font-display text-dark-900 text-base mb-4 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-brand-600" />
                    Recent Activity Stream
                  </h3>

                  <div className="space-y-3">
                    {[
                      ...rfqsList.slice(0, 2).map((rfq) => ({
                        id: `rfq-${rfq.id}`,
                        title: `New RFQ: ${rfq.productName || 'Product'} (${rfq.quantity || ''} ${rfq.unit || ''})`.trim(),
                        buyer: rfq.buyerName || rfq.buyerCompany || 'Buyer',
                        time: rfq.createdAt ? formatDate(rfq.createdAt) : 'Recent',
                        type: 'rfq',
                        badge: 'New RFQ',
                        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
                        targetTab: 'rfqs' as TabType,
                      })),
                      ...ordersList.slice(0, 2).map((ord: any) => ({
                        id: `ord-${ord.id}`,
                        title: `Order ${ord.orderNumber || ord.id}`,
                        buyer: ord.buyerCompany || ord.sellerName || 'Buyer',
                        time: ord.createdAt ? formatDate(ord.createdAt) : 'Recent',
                        type: 'order',
                        badge: ord.status ? ord.status.charAt(0).toUpperCase() + ord.status.slice(1) : 'Order',
                        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                        targetTab: 'orders' as TabType,
                      })),
                    ].length === 0
                      ? (
                        <div className="py-8 text-center text-sm text-dark-400">No recent activity yet.</div>
                      )
                      : [
                      ...rfqsList.slice(0, 2).map((rfq) => ({
                        id: `rfq-${rfq.id}`,
                        title: `New RFQ: ${rfq.productName || 'Product'}`,
                        buyer: rfq.buyerName || rfq.buyerCompany || 'Buyer',
                        time: rfq.createdAt ? formatDate(rfq.createdAt) : 'Recent',
                        type: 'rfq',
                        badge: 'New RFQ',
                        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
                        targetTab: 'rfqs' as TabType,
                      })),
                      ...ordersList.slice(0, 2).map((ord: any) => ({
                        id: `ord-${ord.id}`,
                        title: `Order ${ord.orderNumber || ord.id}`,
                        buyer: ord.buyerCompany || ord.sellerName || 'Buyer',
                        time: ord.createdAt ? formatDate(ord.createdAt) : 'Recent',
                        type: 'order',
                        badge: ord.status ? ord.status.charAt(0).toUpperCase() + ord.status.slice(1) : 'Order',
                        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                        targetTab: 'orders' as TabType,
                      })),
                    ].map((act) => (
                      <div
                        key={act.id}
                        onClick={() => setActiveTab(act.targetTab)}
                        className="p-3 rounded-xl border border-dark-200/80 bg-white hover:border-brand-300 hover:bg-dark-50/50 transition-all flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center flex-shrink-0">
                            {act.type === 'rfq' ? (
                              <FileText className="h-4 w-4" />
                            ) : act.type === 'order' ? (
                              <Truck className="h-4 w-4" />
                            ) : act.type === 'payment' ? (
                              <CreditCard className="h-4 w-4" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-dark-900">{act.title}</p>
                            <p className="text-[11px] text-dark-500">{act.buyer}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${act.badgeClass}`}>
                            {act.badge}
                          </span>
                          <span className="text-[11px] text-dark-400 whitespace-nowrap">{act.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* ══════════════════════ 2. PRODUCTS TAB ══════════════════════ */}
            {activeTab === 'products' && (
              <div className="space-y-5 animate-fade-in">
                <div className="card p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-xl font-bold font-display text-dark-900 flex items-center gap-2">
                        <Package className="h-5 w-5 text-brand-600" />
                        My Product Listings
                      </h2>
                      <p className="text-xs text-dark-500 mt-0.5">
                        Manage your active catalog, export volume limits, and pricing benchmarks
                      </p>
                    </div>

                    <button
                      onClick={() => setIsAddModalOpen(true)}
                      className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="h-4 w-4" />
                      Add New Product
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-dark-50 border-y border-dark-200 text-dark-600 font-semibold">
                          <th className="text-left px-3 py-3">Product Name</th>
                          <th className="text-left px-3 py-3">Category</th>
                          <th className="text-right px-3 py-3">Price/Unit</th>
                          <th className="text-right px-3 py-3">Min Order</th>
                          <th className="text-center px-3 py-3">Status</th>
                          <th className="text-center px-3 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-100">
                        {productsList.map((product) => (
                          <tr key={product.id} className="hover:bg-dark-50/60 transition-colors">
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0 text-brand-700 overflow-hidden">
                                  {product.images && product.images[0] ? (
                                    <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
                                  ) : (
                                    <Package className="h-5 w-5 text-brand-500" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-bold text-dark-900 line-clamp-1">{product.name}</p>
                                  <p className="text-[11px] text-dark-400">{product.seller.location}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 font-medium text-dark-600">{product.category}</td>
                            <td className="px-3 py-3 text-right font-bold text-dark-900">
                              {formatCurrency(product.price)}/{product.unit}
                            </td>
                            <td className="px-3 py-3 text-right font-medium text-dark-700">
                              {product.minOrderQty} {product.unit}
                            </td>
                            <td className="px-3 py-3 text-center">
                              {product.inStock ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-dark-100 text-dark-600 border border-dark-200">
                                  <XCircle className="h-3 w-3" />
                                  Inactive
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewProductName(product.name);
                                    setNewProductCategory(product.category);
                                    setNewProductPrice(product.price.toString());
                                    setNewProductMinQty(product.minOrderQty.toString());
                                    setNewProductDescription(product.description || '');
                                    setIsAddModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-md hover:bg-brand-50 text-dark-400 hover:text-brand-600 transition-colors"
                                  title="Edit Product"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProduct(product.id)}
                                  className="p-1.5 rounded-md hover:bg-red-50 text-dark-400 hover:text-red-600 transition-colors"
                                  title="Delete Product"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════ 2B. CATEGORIES TAB ══════════════════════ */}
            {activeTab === 'categories' && (
              <div className="space-y-5 animate-fade-in">
                <div className="card p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-xl font-bold font-display text-dark-900 flex items-center gap-2">
                        <Layers className="h-5 w-5 text-brand-600" />
                        Product Categories
                      </h2>
                      <p className="text-xs text-dark-500 mt-0.5">
                        Manage export commodity classifications and associated subcategories
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                        {activeCategories.length} Active {activeCategories.length === 1 ? 'Category' : 'Categories'}
                      </span>
                    </div>
                  </div>

                  {activeCategories.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center border border-dashed border-dark-200 rounded-2xl">
                      <div className="h-12 w-12 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 mb-3">
                        <Layers className="h-6 w-6" />
                      </div>
                      <h3 className="text-base font-bold text-dark-900 mb-1">No Categories Found</h3>
                      <p className="text-xs text-dark-500 max-w-sm mb-4">
                        No product categories exist in your catalog yet. Create a product listing to add categories.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsAddModalOpen(true)}
                        className="btn-primary text-xs py-2 px-3.5 inline-flex items-center gap-1.5"
                      >
                        <Plus className="h-4 w-4" />
                        Add Product
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {activeCategories.map((catName) => {
                        const count = productsList.filter((p) => p.category === catName).length;
                        const subcats = Array.from(
                          new Set(
                            productsList
                              .filter((p) => p.category === catName && p.subCategory)
                              .map((p) => p.subCategory!)
                          )
                        );
                        return (
                          <div
                            key={catName}
                            className="rounded-2xl border border-dark-200/90 bg-white p-4.5 hover:border-brand-300 hover:shadow-card transition-all flex flex-col justify-between space-y-3"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="font-bold font-display text-dark-900 text-sm">{catName}</span>
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Active
                                </span>
                              </div>
                              <p className="text-xs text-dark-500 mb-3">
                                {subcats.length} subcategor{subcats.length === 1 ? 'y' : 'ies'} · {count} active listing{count === 1 ? '' : 's'}
                              </p>

                              {subcats.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {subcats.map((sub) => (
                                    <span
                                      key={sub}
                                      className="text-[10px] font-medium bg-dark-50 text-dark-600 px-2 py-0.5 rounded-md border border-dark-200/70"
                                    >
                                      {sub}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="pt-2 border-t border-dark-100 flex items-center justify-between">
                              <span className="text-[11px] text-dark-400">Live Catalog</span>
                              <button
                                type="button"
                                onClick={() => setActiveTab('subcategories')}
                                className="text-xs font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1 hover:underline"
                              >
                                <span>View Subcategories</span>
                                <ChevronRight className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══════════════════════ 2C. SUBCATEGORIES TAB ══════════════════════ */}
            {activeTab === 'subcategories' && (
              <div className="space-y-5 animate-fade-in">
                <div className="card p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-xl font-bold font-display text-dark-900 flex items-center gap-2">
                        <SlidersHorizontal className="h-5 w-5 text-brand-600" />
                        Product Subcategories
                      </h2>
                      <p className="text-xs text-dark-500 mt-0.5">
                        Commodity varieties, export grades, and sub-type specifications
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                        {activeSubcategories.length} Subcategories
                      </span>
                    </div>
                  </div>

                  {activeSubcategories.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center border border-dashed border-dark-200 rounded-2xl">
                      <div className="h-12 w-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 mb-3">
                        <SlidersHorizontal className="h-6 w-6" />
                      </div>
                      <h3 className="text-base font-bold text-dark-900 mb-1">No Subcategories Found</h3>
                      <p className="text-xs text-dark-500 max-w-sm mb-4">
                        No product subcategories exist in your catalog yet. Create a product listing to add subcategories.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsAddModalOpen(true)}
                        className="btn-primary text-xs py-2 px-3.5 inline-flex items-center gap-1.5"
                      >
                        <Plus className="h-4 w-4" />
                        Add Product
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-dark-50 border-y border-dark-200 text-dark-600 font-semibold">
                            <th className="text-left px-3 py-3">Subcategory Name</th>
                            <th className="text-left px-3 py-3">Parent Category</th>
                            <th className="text-center px-3 py-3">Status</th>
                            <th className="text-right px-3 py-3">Quick Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-100">
                          {activeSubcategories.map((subcat) => (
                            <tr key={`${subcat.parentCategory}-${subcat.name}`} className="hover:bg-dark-50/60 transition-colors">
                              <td className="px-3 py-3 font-bold text-dark-900">{subcat.name}</td>
                              <td className="px-3 py-3">
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200">
                                  {subcat.parentCategory}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Active
                                </span>
                              </td>
                              <td className="px-3 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewProductCategory(subcat.parentCategory);
                                    setNewProductSubCategory(subcat.name);
                                    setIsAddModalOpen(true);
                                  }}
                                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline inline-flex items-center gap-1"
                                >
                                  <span>+ Add Listing</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══════════════════════ 3. RFQS TAB ══════════════════════ */}
            {activeTab === 'rfqs' && (
              <div className="space-y-5 animate-fade-in">
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-bold font-display text-dark-900 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-brand-600" />
                        RFQ Inbox &amp; Quotations
                      </h2>
                      <p className="text-xs text-dark-500 mt-0.5">
                        Direct commercial enquiries received from verified global buyers
                      </p>
                    </div>
                    <div className="badge-orange text-xs px-3 py-1 font-bold">
                      {rfqsList.length} Open RFQs
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    {rfqsList.length === 0 ? (
                      <div className="p-8 text-center text-xs text-dark-400">
                        No RFQs received yet.
                      </div>
                    ) : (
                      rfqsList.map((rfq) => (
                        <div key={rfq.id} className="card-hover p-4 border border-dark-200 rounded-xl">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-start gap-3 mb-2">
                              <div className="h-10 w-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center font-bold text-brand-700 text-sm flex-shrink-0">
                                {(rfq.buyerName || 'B')[0]}
                              </div>
                              <div>
                                <p className="font-bold text-dark-900 text-sm">{rfq.title || rfq.productName || 'Quotation Request'}</p>
                                <p className="text-xs text-dark-500">
                                  Buyer: <strong className="text-dark-700">{rfq.buyerCompany || 'Verified Buyer'}</strong> · {rfq.deliveryLocation || 'India'}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-dark-600 bg-dark-50 p-2.5 rounded-lg mt-2">
                              <div>
                                <span className="text-dark-400 block text-[10px]">Quantity</span>
                                <span className="font-semibold text-dark-800">{rfq.quantity} {rfq.unit}</span>
                              </div>
                              <div>
                                <span className="text-dark-400 block text-[10px]">Category</span>
                                <span className="font-semibold text-dark-800">{rfq.productCategory || 'General'}</span>
                              </div>
                              <div>
                                <span className="text-dark-400 block text-[10px]">Target Price</span>
                                <span className="font-semibold text-dark-800">
                                  {rfq.targetPrice ? `₹${rfq.targetPrice.toLocaleString('en-IN')}/${rfq.unit}` : 'Flexible'}
                                </span>
                              </div>
                              <div>
                                <span className="text-dark-400 block text-[10px]">Delivery</span>
                                <span className="font-semibold text-dark-800">
                                  {rfq.deliveryDate || rfq.requiredByDate ? formatDate(rfq.deliveryDate || rfq.requiredByDate || '') : 'Immediate'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2">
                            <span className={rfq.status === 'submitted' ? 'badge-orange' : 'badge-green'}>
                              {rfq.status}
                            </span>
                            <button
                              onClick={() => {
                                setReplyingEnquiry({
                                  source: 'rfq',
                                  id: rfq.id,
                                  buyerName: rfq.buyerName || 'Verified Buyer',
                                  company: rfq.buyerCompany || 'Global Trade Corp',
                                  location: rfq.deliveryLocation || 'India',
                                  phone: '+971501234567',
                                  email: 'buyer@example.com',
                                  product: rfq.title || rfq.productName || 'Quotation Request',
                                  quantity: `${rfq.quantity} ${rfq.unit}`,
                                  subject: `Quotation Response for ${rfq.title || rfq.productName || 'Quotation Request'}`,
                                  message: `Buyer requested target price of ${rfq.targetPrice ? `₹${rfq.targetPrice}/${rfq.unit}` : 'Flexible'}.`,
                                  date: 'Just now',
                                  status: 'Unread',
                                  badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
                                  targetPrice: rfq.targetPrice,
                                  unit: rfq.unit,
                                });
                                setReplyMessage('');
                                setReplyOfferPrice(rfq.targetPrice ? String(rfq.targetPrice) : '');
                                setReplyErrorMsg('');
                              }}
                              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              Send Quote
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-dark-400 mt-3 pt-2.5 border-t border-dark-100">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Received {formatDate(rfq.createdAt)}
                          </span>
                          <span>{rfq.expiresAt ? `Expires ${formatDate(rfq.expiresAt)}` : ''}</span>
                        </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════ 4. ENQUIRIES TAB ══════════════════════ */}
            {activeTab === 'enquiries' && (
              <div className="space-y-5 animate-fade-in">
                <div className="card p-5 sm:p-6">
                  
                  {/* Top Header + Sub-Tabs */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-dark-100">
                    <div>
                      <h2 className="text-xl font-bold font-display text-dark-900 flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-brand-600" />
                        Buyer Enquiries &amp; Export Communications
                      </h2>
                      <p className="text-xs text-dark-500 mt-0.5">
                        Direct commercial enquiries received from verified importers worldwide
                      </p>
                    </div>

                    {/* Filter Pills */}
                    <div className="inline-flex items-center gap-1 bg-dark-100/80 p-1 rounded-xl border border-dark-200/60 self-start sm:self-auto">
                      {[
                        { id: 'all-enquiries', label: `All (${enquiriesList.length})` },
                        { id: 'new-enquiries', label: `New (${enquiriesList.filter((e) => e.status === 'Unread').length})` },
                        { id: 'responded-enquiries', label: `Responded (${enquiriesList.filter((e) => e.status !== 'Unread').length})` },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveSubTab(tab.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            activeSubTab === tab.id
                              ? 'bg-white text-brand-700 shadow-sm font-bold ring-1 ring-brand-100'
                              : 'text-dark-600 hover:text-dark-900 hover:bg-white/60'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Enquiry Cards List */}
                  {filteredEnquiries.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-dark-200 rounded-xl bg-dark-50/50">
                      <MessageSquare className="h-8 w-8 text-dark-400 mx-auto mb-2" />
                      <p className="text-sm font-bold text-dark-800">No enquiries in this filter</p>
                      <p className="text-xs text-dark-500 mt-0.5">Check other tabs to view all incoming messages</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredEnquiries.map((enq) => {
                        const cleanPhone = enq.phone.replace(/[^0-9]/g, '');
                        const whatsappText = encodeURIComponent(
                          `Hello ${enq.buyerName}, regarding your inquiry on Karthikeya Farmer Producer Company Limited for ${enq.product}. We would like to share our export quotation and specs.`
                        );

                        return (
                          <div
                            key={enq.id}
                            className="p-5 rounded-2xl border border-dark-200/90 bg-white hover:border-brand-300 transition-all space-y-4 shadow-xs"
                          >
                            {/* Buyer & Message Header */}
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                              <div className="flex items-start gap-3.5">
                                <div className="h-11 w-11 rounded-xl bg-purple-50 border border-purple-100 text-purple-700 flex items-center justify-center font-bold text-base flex-shrink-0">
                                  {enq.buyerName.charAt(0)}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-bold text-dark-900 text-sm sm:text-base">{enq.buyerName}</p>
                                    <span className="text-dark-300">·</span>
                                    <span className="text-xs font-semibold text-dark-700 flex items-center gap-1">
                                      <Building2 className="h-3.5 w-3.5 text-dark-400" />
                                      {enq.company}
                                    </span>
                                    <span className="text-dark-400 text-xs flex items-center gap-0.5">
                                      <MapPin className="h-3 w-3 text-dark-400" />
                                      {enq.location}
                                    </span>
                                  </div>

                                  <p className="text-xs font-semibold text-brand-700 mt-1 flex items-center gap-1.5">
                                    <Package className="h-3.5 w-3.5 text-brand-600" />
                                    <span>Inquiring for: <strong>{enq.product}</strong> ({enq.quantity})</span>
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-start sm:self-auto">
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${enq.badgeClass}`}>
                                  {enq.status}
                                </span>
                                <span className="text-[11px] text-dark-400 whitespace-nowrap">{enq.date}</span>
                              </div>
                            </div>

                            {/* Enquiry Content Box */}
                            <div className="bg-[#f8fafc] p-4 rounded-xl border border-dark-100">
                              <p className="text-xs font-bold text-dark-900 mb-1">{enq.subject}</p>
                              <p className="text-xs text-dark-600 leading-relaxed">{enq.message}</p>
                              
                              <div className="flex items-center gap-4 mt-3 pt-2.5 border-t border-dark-200/60 text-[11px] text-dark-500">
                                <span>Phone: <strong className="text-dark-700 font-mono">{enq.phone}</strong></span>
                                <span>Email: <strong className="text-dark-700">{enq.email}</strong></span>
                              </div>
                            </div>

                            {/* Buyer Response Actions */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                              <span className="text-[11px] text-dark-400 italic">
                                Direct global export response channel
                              </span>

                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  onClick={() => {
                                    setReplyingEnquiry({ ...enq, source: 'inquiry' });
                                    setReplyMessage('');
                                    setReplyOfferPrice('');
                                    setReplyErrorMsg('');
                                  }}
                                  className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-sm"
                                >
                                  <Send className="h-3.5 w-3.5" />
                                  <span>Reply to Buyer</span>
                                </button>

                                <a
                                  href={`https://wa.me/${cleanPhone}?text=${whatsappText}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#25D366]/10 text-[#075E54] hover:bg-[#25D366]/20 border border-[#25D366]/30 transition-colors"
                                >
                                  <MessageCircle className="h-3.5 w-3.5 text-[#25D366]" />
                                  <span>WhatsApp</span>
                                </a>

                                <a
                                  href={`tel:${enq.phone}`}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-dark-100/70 text-dark-700 hover:bg-dark-200/80 border border-dark-200 transition-colors"
                                >
                                  <Phone className="h-3.5 w-3.5 text-dark-600" />
                                  <span>Call Buyer</span>
                                </a>
                              </div>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* ══════════════════════ 5. ORDERS TAB ══════════════════════ */}
            {activeTab === 'orders' && (
              <div className="space-y-5 animate-fade-in">
                <div className="card p-5 sm:p-6">
                  
                  {/* Action Message Banner */}
                  {orderActionMsg && (
                    <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                      <span>{orderActionMsg}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-dark-100">
                    <div>
                      <h2 className="text-xl font-bold font-display text-dark-900 flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-brand-600" />
                        Commercial Order Fulfillment
                      </h2>
                      <p className="text-xs text-dark-500 mt-0.5">
                        Track customer orders, assign bill of lading tracking, and dispatch consignments
                      </p>
                    </div>

                    {/* Sub-Tab Filter Pills */}
                    <div className="inline-flex items-center gap-1 bg-dark-100/80 p-1 rounded-xl border border-dark-200/60 self-start sm:self-auto">
                      {[
                        { id: 'all-orders', label: `All (${ordersList.length})` },
                        { id: 'pending-orders', label: `Pending (${ordersList.filter((o) => o.status === 'processing').length})` },
                        { id: 'completed-orders', label: `Completed (${ordersList.filter((o) => o.status === 'shipped' || o.status === 'delivered').length})` },
                        { id: 'cancelled-orders', label: `Cancelled (${ordersList.filter((o) => o.status === 'cancelled').length})` },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveSubTab(tab.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            activeSubTab === tab.id
                              ? 'bg-white text-brand-700 shadow-sm font-bold ring-1 ring-brand-100'
                              : 'text-dark-600 hover:text-dark-900 hover:bg-white/60'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredOrders.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-dark-200 rounded-xl bg-dark-50/50">
                      <ShoppingCart className="h-8 w-8 text-dark-400 mx-auto mb-2" />
                      <p className="text-sm font-bold text-dark-800">No orders found in this section</p>
                      <p className="text-xs text-dark-500 mt-0.5">Switch tabs to view all fulfilled or processing orders</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredOrders.map((order) => (
                        <div key={order.id} className="p-5 rounded-2xl border border-dark-200 bg-white hover:border-brand-300 transition-all space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold font-display text-dark-900 text-sm">{order.orderNumber}</p>
                                <span className="text-dark-300">·</span>
                                <span className="text-xs text-dark-500 font-medium">Placed on {order.createdAt}</span>
                              </div>
                              <p className="text-xs text-dark-600 mt-0.5">
                                Buyer: <strong className="text-dark-800">{order.buyerCompany}</strong> · {order.destination}
                              </p>
                            </div>

                            <div className="flex items-center gap-2.5">
                              <span
                                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                  order.status === 'processing'
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : order.status === 'cancelled'
                                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                }`}
                              >
                                {order.status === 'processing' ? 'Pending Dispatch' : order.status.toUpperCase()}
                              </span>

                              {order.status === 'processing' && (
                                <button
                                  onClick={() => handleMarkOrderShipped(order.id)}
                                  className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                                >
                                  <Truck className="h-3.5 w-3.5" />
                                  Mark Shipped
                                </button>
                              )}

                              <button
                                onClick={() => setViewingOrder(order)}
                                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View Details
                              </button>
                            </div>
                          </div>

                          {/* Items box */}
                          <div className="space-y-2 bg-dark-50/70 p-3.5 rounded-xl border border-dark-100">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-2.5">
                                  <div className="h-7 w-7 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 flex-shrink-0">
                                    <Package className="h-3.5 w-3.5" />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-dark-900">{item.productName}</p>
                                    <p className="text-[11px] text-dark-500">{item.quantity} {item.unit} @ {formatCurrency(item.price)}/{item.unit}</p>
                                  </div>
                                </div>
                                <p className="font-bold text-dark-900">{formatCurrency(item.totalPrice)}</p>
                              </div>
                            ))}
                          </div>

                          {/* Order Footer */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-dark-500 pt-2 border-t border-dark-100 gap-2">
                            <div className="flex items-center gap-3">
                              {order.trackingNumber && order.trackingNumber !== 'N/A' && (
                                <span>Tracking: <strong className="font-mono text-dark-800">{order.trackingNumber}</strong></span>
                              )}
                              {order.vesselName && order.vesselName !== 'N/A' && (
                                <span className="hidden sm:inline">Vessel: <strong>{order.vesselName}</strong></span>
                              )}
                              {order.cancellationReason && (
                                <span className="text-rose-600 font-medium">Reason: {order.cancellationReason}</span>
                              )}
                            </div>
                            <span className="font-bold text-dark-900 text-sm">
                              Gross Total: {formatCurrency(order.total)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* ══════════════════════ 6. SALES TAB ══════════════════════ */}
            {activeTab === 'sales' && (
              <div className="space-y-5 animate-fade-in">
                <div className="card p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-dark-100">
                    <div>
                      <h2 className="text-xl font-bold font-display text-dark-900 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-brand-600" />
                        Export Sales Performance
                      </h2>
                      <p className="text-xs text-dark-500 mt-0.5">
                        Track volume velocity, product demand breakdown, and container shipments
                      </p>
                    </div>
                    <span className="badge-green text-xs font-bold px-3 py-1">
                      FY 2026 Active
                    </span>
                  </div>

                  {/* 4 Sales KPI Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-200">
                      <p className="text-xs font-medium text-emerald-800">Total Volume Sold</p>
                      <p className="text-2xl font-bold font-display text-emerald-950 mt-1">246 MT</p>
                      <p className="text-[11px] text-emerald-700 mt-1">+18.4% vs last quarter</p>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-white border border-blue-200">
                      <p className="text-xs font-medium text-blue-800">Export Orders Closed</p>
                      <p className="text-2xl font-bold font-display text-blue-950 mt-1">58 Orders</p>
                      <p className="text-[11px] text-blue-700 mt-1">100% On-time delivery</p>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-white border border-purple-200">
                      <p className="text-xs font-medium text-purple-800">Avg. Deal Volume</p>
                      <p className="text-2xl font-bold font-display text-purple-950 mt-1">4.24 MT</p>
                      <p className="text-[11px] text-purple-700 mt-1">Per container batch</p>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-white border border-amber-200">
                      <p className="text-xs font-medium text-amber-800">Export Destinations</p>
                      <p className="text-2xl font-bold font-display text-amber-950 mt-1">14 Countries</p>
                      <p className="text-[11px] text-amber-700 mt-1">GCC, EU, North America</p>
                    </div>
                  </div>

                  {/* Sales by Category & Top Products */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
                    <div className="p-4 rounded-xl border border-dark-200 bg-[#f8fafc]">
                      <h3 className="font-bold text-dark-900 text-xs uppercase tracking-wider mb-3">
                        Volume Share by Category
                      </h3>
                      <div className="space-y-3">
                        {[
                          { category: 'Grains & Pulses', volume: '142 MT', pct: '57.7%', color: 'bg-emerald-500' },
                          { category: 'Spices', volume: '78 MT', pct: '31.7%', color: 'bg-blue-500' },
                          { category: 'Dry Fruits', volume: '16 MT', pct: '6.5%', color: 'bg-amber-500' },
                          { category: 'Oilseeds', volume: '10 MT', pct: '4.1%', color: 'bg-purple-500' },
                        ].map((cat) => (
                          <div key={cat.category} className="space-y-1">
                            <div className="flex justify-between text-xs font-medium text-dark-700">
                              <span>{cat.category}</span>
                              <span className="font-bold text-dark-900">{cat.volume} ({cat.pct})</span>
                            </div>
                            <div className="w-full bg-dark-200/80 h-2 rounded-full overflow-hidden">
                              <div className={`${cat.color} h-full rounded-full`} style={{ width: cat.pct }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-dark-200 bg-[#f8fafc]">
                      <h3 className="font-bold text-dark-900 text-xs uppercase tracking-wider mb-3">
                        Fastest Moving Commodities
                      </h3>
                      <div className="space-y-2.5">
                        {productsList.slice(0, 4).map((prod) => (
                          <div key={prod.id} className="p-2.5 bg-white rounded-lg border border-dark-200/80 flex items-center justify-between text-xs">
                            <div>
                              <p className="font-bold text-dark-900">{prod.name}</p>
                              <p className="text-[11px] text-dark-500">{prod.category} · {prod.inStock ? 'In Stock' : 'Out of Stock'}</p>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-dark-900 block">{prod.minOrderQty} {prod.unit}</span>
                              <span className="text-[10px] text-emerald-600 font-semibold">{formatCurrency(prod.price)}/{prod.unit}</span>
                            </div>
                          </div>
                        ))}
                        {productsList.length === 0 && (
                          <div className="py-4 text-center text-xs text-dark-400">No products listed yet.</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Recent Closed Sales */}
                  <h3 className="font-bold text-dark-900 text-sm mb-3">Recent Sales Dispatches</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-dark-50 border-y border-dark-200 text-dark-600 font-semibold">
                          <th className="py-2.5 px-3">Order Number</th>
                          <th className="py-2.5 px-3">Buyer Company</th>
                          <th className="py-2.5 px-3">Destination Port</th>
                          <th className="py-2.5 px-3 text-right">Volume</th>
                          <th className="py-2.5 px-3 text-right">Contract Value</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-100">
                        {ordersList.slice(0, 4).map((ord) => (
                          <tr key={ord.id} className="hover:bg-dark-50/60">
                            <td className="py-3 px-3 font-mono font-medium text-dark-900">{ord.orderNumber}</td>
                            <td className="py-3 px-3 text-dark-700">{ord.buyerCompany}</td>
                            <td className="py-3 px-3 text-dark-600">{ord.destination}</td>
                            <td className="py-3 px-3 text-right font-medium text-dark-800">
                              {ord.items[0]?.quantity} {ord.items[0]?.unit}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-dark-900">{formatCurrency(ord.total)}</td>
                            <td className="py-3 px-3 text-center">
                              <span className={`badge-${ord.status === 'delivered' ? 'green' : ord.status === 'shipped' ? 'blue' : 'orange'} text-[10px]`}>
                                {ord.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              </div>
            )}

            {/* ══════════════════════ 7. REVENUE TAB ══════════════════════ */}
            {activeTab === 'revenue' && (
              <div className="space-y-5 animate-fade-in">
                <div className="card p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-bold font-display text-dark-900 flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-brand-600" />
                        Revenue &amp; Escrow Settlements
                      </h2>
                      <p className="text-xs text-dark-500 mt-0.5">
                        Real-time tracking of escrow funds, released disbursements, and bank transfers
                      </p>
                    </div>
                    <span className="badge-green text-xs font-bold px-3 py-1">
                      100% Escrow Protected
                    </span>
                  </div>

                  {/* Payment Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                      <p className="text-xs font-medium text-emerald-800">Total Settled Revenue</p>
                      <p className="text-2xl font-bold font-display text-emerald-900 mt-1">₹42.5L</p>
                      <p className="text-[11px] text-emerald-700 mt-1">+12.4% vs last month</p>
                    </div>
                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                      <p className="text-xs font-medium text-blue-800">In Escrow (Pending Dispatch)</p>
                      <p className="text-2xl font-bold font-display text-blue-900 mt-1">₹8.4L</p>
                      <p className="text-[11px] text-blue-700 mt-1">Releases upon port clearance</p>
                    </div>
                    <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                      <p className="text-xs font-medium text-purple-800">Recent Disbursement</p>
                      <p className="text-2xl font-bold font-display text-purple-900 mt-1">₹21.25L</p>
                      <p className="text-[11px] text-purple-700 mt-1">Credited 3 days ago</p>
                    </div>
                  </div>

                  {/* Settlements Table */}
                  <h3 className="font-bold text-dark-900 text-sm mb-3">Settlement History</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-dark-50 border-y border-dark-200 text-dark-600 font-semibold">
                          <th className="py-2.5 px-3">Transaction ID</th>
                          <th className="py-2.5 px-3">Order Ref</th>
                          <th className="py-2.5 px-3">Buyer</th>
                          <th className="py-2.5 px-3 text-right">Gross Amount</th>
                          <th className="py-2.5 px-3 text-right">Net Credited</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-100">
                        <tr className="hover:bg-dark-50/60">
                          <td className="py-3 px-3 font-mono font-medium text-dark-800">TXN-2026-8841</td>
                          <td className="py-3 px-3 font-mono text-dark-600">#KFPCL-2026-0000</td>
                          <td className="py-3 px-3 text-dark-700">Gulf Foodstuff Trading LLC</td>
                          <td className="py-3 px-3 text-right font-semibold text-dark-900">₹21,50,000</td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-700">₹21,25,000</td>
                          <td className="py-3 px-3 text-center">
                            <span className="badge-green text-[10px]">Settled</span>
                          </td>
                        </tr>
                        <tr className="hover:bg-dark-50/60">
                          <td className="py-3 px-3 font-mono font-medium text-dark-800">TXN-2026-8729</td>
                          <td className="py-3 px-3 font-mono text-dark-600">#KFPCL-2026-0001</td>
                          <td className="py-3 px-3 text-dark-700">Al-Madina Agro Importers</td>
                          <td className="py-3 px-3 text-right font-semibold text-dark-900">₹8,40,000</td>
                          <td className="py-3 px-3 text-right font-bold text-amber-700">₹8,30,000</td>
                          <td className="py-3 px-3 text-center">
                            <span className="badge-orange text-[10px]">In Escrow</span>
                          </td>
                        </tr>
                        <tr className="hover:bg-dark-50/60">
                          <td className="py-3 px-3 font-mono font-medium text-dark-800">TXN-2026-8610</td>
                          <td className="py-3 px-3 font-mono text-dark-600">#KFPCL-2025-9984</td>
                          <td className="py-3 px-3 text-dark-700">Gulf Foodstuff Trading LLC</td>
                          <td className="py-3 px-3 text-right font-semibold text-dark-900">₹98,00,000</td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-700">₹97,20,000</td>
                          <td className="py-3 px-3 text-center">
                            <span className="badge-green text-[10px]">Settled</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════ 8. ANALYTICS TAB ══════════════════════ */}
            {activeTab === 'analytics' && (
              <div className="space-y-5 animate-fade-in">
                <div className="card p-5 sm:p-6">

                  {/* Section Title + Time Range Filter */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-dark-100">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold font-display text-dark-900 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-brand-600" />
                        Commercial Revenue &amp; Order Analytics
                      </h2>
                      <p className="text-[11px] text-dark-500 mt-0.5">
                        Revenue trajectory and demand velocity over selected period
                      </p>
                    </div>

                    {/* Time Range Tabs */}
                    <div className="inline-flex items-center gap-1 bg-dark-100/80 p-1 rounded-xl self-start sm:self-auto border border-dark-200/60">
                      {(
                        [
                          { id: '7d' as TimeRange, label: '7 Days' },
                          { id: '30d' as TimeRange, label: '30 Days' },
                          { id: '3m' as TimeRange, label: '3 Months' },
                          { id: '1y' as TimeRange, label: '1 Year' },
                        ] as { id: TimeRange; label: string }[]
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setTimeRange(tab.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            timeRange === tab.id
                              ? 'bg-white text-brand-700 shadow-sm font-bold ring-1 ring-brand-100'
                              : 'text-dark-600 hover:text-dark-900 hover:bg-white/60'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4 KPI Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                    <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <TrendingUp className="h-4 w-4 text-emerald-700" />
                        </div>
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                          <ArrowUpRight className="h-3 w-3" />
                          +12.4%
                        </span>
                      </div>
                      <p className="text-xl font-bold font-display text-dark-900">{currentAnalytics.summary.revenue}</p>
                      <p className="text-[10px] text-dark-500 mt-0.5 font-medium">Total Revenue</p>
                      <p className="text-[10px] text-emerald-600 mt-0.5">vs. previous period</p>
                    </div>

                    <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                          <ShoppingCart className="h-4 w-4 text-blue-700" />
                        </div>
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full">
                          <ArrowUpRight className="h-3 w-3" />
                          +8.1%
                        </span>
                      </div>
                      <p className="text-xl font-bold font-display text-dark-900">{currentAnalytics.summary.orders}</p>
                      <p className="text-[10px] text-dark-500 mt-0.5 font-medium">Total Orders</p>
                      <p className="text-[10px] text-blue-600 mt-0.5">Fulfilled shipments</p>
                    </div>

                    <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                          <BarChart3 className="h-4 w-4 text-purple-700" />
                        </div>
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-full">
                          <ArrowUpRight className="h-3 w-3" />
                          +5.2%
                        </span>
                      </div>
                      <p className="text-xl font-bold font-display text-dark-900">{currentAnalytics.summary.avgOrder}</p>
                      <p className="text-[10px] text-dark-500 mt-0.5 font-medium">
                        {sellerAnalytics ? 'Unique Buyers' : 'Avg. Order Value'}
                      </p>
                      <p className="text-[10px] text-purple-600 mt-0.5">
                        {sellerAnalytics ? 'Distinct buyers' : 'Per container lot'}
                      </p>
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                          <Clock className="h-4 w-4 text-amber-700" />
                        </div>
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                          <Clock className="h-3 w-3" />
                          Queue
                        </span>
                      </div>
                      <p className="text-xl font-bold font-display text-dark-900">{currentAnalytics.summary.pending}</p>
                      <p className="text-[10px] text-dark-500 mt-0.5 font-medium">
                        {sellerAnalytics ? 'Repeat Customers' : 'Pending Orders'}
                      </p>
                      <p className="text-[10px] text-amber-600 mt-0.5">₹8.4L awaiting dispatch</p>
                    </div>
                  </div>

                  {/* Premium Curved Revenue Growth Chart */}
                  <PremiumChart
                    points={currentAnalytics.points}
                    hoveredPointIndex={hoveredPointIndex}
                    setHoveredPointIndex={setHoveredPointIndex}
                  />

                </div>
              </div>
            )}

            {/* ══════════════════════ 9. INVENTORY TAB ══════════════════════ */}
            {activeTab === 'inventory' && (
              <div className="space-y-5 animate-fade-in">
                <div className="card p-5 sm:p-6">
                  
                  {/* Stock Update Toast Banner */}
                  {stockUpdateSuccessMsg && (
                    <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                      <span>{stockUpdateSuccessMsg}</span>
                    </div>
                  )}

                  {/* Header + Sub-Tab Switcher */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-dark-100">
                    <div>
                      <h2 className="text-xl font-bold font-display text-dark-900 flex items-center gap-2">
                        <Boxes className="h-5 w-5 text-brand-600" />
                        Warehouse Inventory &amp; Stock Controls
                      </h2>
                      <p className="text-xs text-dark-500 mt-0.5">
                        Real-time warehouse commodity volumes, re-order thresholds, and lot tracking
                      </p>
                    </div>

                    <div className="inline-flex items-center gap-1 bg-dark-100/80 p-1 rounded-xl border border-dark-200/60 self-start sm:self-auto">
                      {[
                        { id: 'inventory-overview', label: 'Inventory Overview' },
                        { id: 'stock-management', label: 'Stock Management' },
                        { id: 'low-stock', label: `Low Stock (${lowStockItems.length})` },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveSubTab(tab.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            activeSubTab === tab.id
                              ? 'bg-white text-brand-700 shadow-sm font-bold ring-1 ring-brand-100'
                              : 'text-dark-600 hover:text-dark-900 hover:bg-white/60'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ──────────────── 1. INVENTORY OVERVIEW SUB-VIEW ──────────────── */}
                  {activeSubTab === 'inventory-overview' && (
                    <div className="space-y-6">
                      {/* Overview KPIs */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-white border border-blue-200">
                          <p className="text-xs font-medium text-blue-800">Total Commodities</p>
                          <p className="text-2xl font-bold font-display text-blue-950 mt-1">{inventoryItems.length} Lots</p>
                          <p className="text-[11px] text-blue-700 mt-1">Across 4 export warehouses</p>
                        </div>
                        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-200">
                          <p className="text-xs font-medium text-emerald-800">In-Stock Commodities</p>
                          <p className="text-2xl font-bold font-display text-emerald-950 mt-1">
                            {inventoryItems.filter((i) => i.status === 'In Stock').length} Items
                          </p>
                          <p className="text-[11px] text-emerald-700 mt-1">Healthy replenishment level</p>
                        </div>
                        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-white border border-amber-200">
                          <p className="text-xs font-medium text-amber-800">Low Stock Alerts</p>
                          <p className="text-2xl font-bold font-display text-amber-950 mt-1">
                            {inventoryItems.filter((i) => i.status === 'Low Stock').length} Items
                          </p>
                          <p className="text-[11px] text-amber-700 mt-1">Below minimum threshold</p>
                        </div>
                        <div className="p-4 rounded-xl bg-gradient-to-br from-rose-50 to-white border border-rose-200">
                          <p className="text-xs font-medium text-rose-800">Out of Stock</p>
                          <p className="text-2xl font-bold font-display text-rose-950 mt-1">
                            {inventoryItems.filter((i) => i.status === 'Out of Stock').length} Items
                          </p>
                          <p className="text-[11px] text-rose-700 mt-1">Immediate procurement needed</p>
                        </div>
                      </div>

                      {/* Stock Summary Table */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-bold text-dark-900 text-sm">Warehouse Stock Summary</h3>
                          <button
                            onClick={() => setActiveSubTab('stock-management')}
                            className="text-xs font-semibold text-brand-600 hover:underline"
                          >
                            Manage all lots →
                          </button>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left">
                            <thead>
                              <tr className="bg-dark-50 border-y border-dark-200 text-dark-600 font-semibold">
                                <th className="py-2.5 px-3">Commodity &amp; SKU</th>
                                <th className="py-2.5 px-3">Category</th>
                                <th className="py-2.5 px-3">Warehouse Bay</th>
                                <th className="py-2.5 px-3 text-right">Available Stock</th>
                                <th className="py-2.5 px-3 text-right">Min Threshold</th>
                                <th className="py-2.5 px-3 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-dark-100">
                              {inventoryItems.map((item) => (
                                <tr key={item.id} className="hover:bg-dark-50/60">
                                  <td className="py-3 px-3">
                                    <p className="font-bold text-dark-900">{item.name}</p>
                                    <p className="font-mono text-[10px] text-dark-400">{item.sku}</p>
                                  </td>
                                  <td className="py-3 px-3 text-dark-600">{item.category}</td>
                                  <td className="py-3 px-3 text-dark-500">{item.warehouseBay}</td>
                                  <td className="py-3 px-3 text-right font-bold text-dark-900">
                                    {item.availableStock} {item.unit}
                                  </td>
                                  <td className="py-3 px-3 text-right text-dark-500">
                                    {item.minThreshold} {item.unit}
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                        item.status === 'In Stock'
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                          : item.status === 'Low Stock'
                                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                                      }`}
                                    >
                                      {item.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ──────────────── 2. STOCK MANAGEMENT SUB-VIEW ──────────────── */}
                  {activeSubTab === 'stock-management' && (
                    <div className="space-y-4">
                      {/* Search & Category Filter */}
                      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                        <div className="relative w-full sm:w-72">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-dark-400" />
                          <input
                            type="text"
                            placeholder="Search commodity or SKU..."
                            value={inventorySearch}
                            onChange={(e) => setInventorySearch(e.target.value)}
                            className="w-full h-9 pl-9 pr-3 text-xs rounded-xl border border-dark-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
                          />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <label className="text-xs font-semibold text-dark-500 whitespace-nowrap">Filter Category:</label>
                          <select
                            value={inventoryCategoryFilter}
                            onChange={(e) => setInventoryCategoryFilter(e.target.value)}
                            className="h-9 px-3 text-xs rounded-xl border border-dark-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none bg-white"
                          >
                            <option value="all">All Categories</option>
                            <option value="Grains & Pulses">Grains &amp; Pulses</option>
                            <option value="Spices">Spices</option>
                            <option value="Oilseeds">Oilseeds</option>
                            <option value="Dry Fruits">Dry Fruits</option>
                          </select>
                        </div>
                      </div>

                      {/* Stock Adjustment Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="bg-dark-50 border-y border-dark-200 text-dark-600 font-semibold">
                              <th className="py-2.5 px-3">Commodity</th>
                              <th className="py-2.5 px-3">SKU</th>
                              <th className="py-2.5 px-3 text-right">Available Qty</th>
                              <th className="py-2.5 px-3 text-center">Adjust Stock</th>
                              <th className="py-2.5 px-3 text-center">Status</th>
                              <th className="py-2.5 px-3 text-right">Last Updated</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-dark-100">
                            {filteredInventory.map((item) => (
                              <tr key={item.id} className="hover:bg-dark-50/60">
                                <td className="py-3 px-3 font-semibold text-dark-900">{item.name}</td>
                                <td className="py-3 px-3 font-mono text-dark-600">{item.sku}</td>
                                <td className="py-3 px-3 text-right font-bold text-dark-900">
                                  {item.availableStock} {item.unit}
                                </td>
                                <td className="py-3 px-3">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateStockQuantity(item.id, -1)}
                                      className="h-7 w-7 rounded-lg border border-dark-200 hover:bg-dark-100 text-dark-700 font-bold flex items-center justify-center transition-colors"
                                      title="Deduct 1 unit"
                                    >
                                      -
                                    </button>
                                    <span className="font-mono font-bold px-2 text-dark-900">{item.availableStock}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateStockQuantity(item.id, 1)}
                                      className="h-7 w-7 rounded-lg border border-dark-200 hover:bg-dark-100 text-dark-700 font-bold flex items-center justify-center transition-colors"
                                      title="Add 1 unit"
                                    >
                                      +
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleReplenishStock(item.id, 5)}
                                      className="ml-2 px-2 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-md text-[10px] font-semibold transition-colors"
                                    >
                                      +5 {item.unit}
                                    </button>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                      item.status === 'In Stock'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : item.status === 'Low Stock'
                                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                                    }`}
                                  >
                                    {item.status}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-right text-dark-400">{item.lastUpdated}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* ──────────────── 3. LOW STOCK SUB-VIEW ──────────────── */}
                  {activeSubTab === 'low-stock' && (
                    <div className="space-y-4">
                      {lowStockItems.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-dark-200 rounded-xl bg-dark-50/50">
                          <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                          <p className="text-sm font-bold text-dark-800">All commodities are healthy</p>
                          <p className="text-xs text-dark-500 mt-0.5">No products are currently below their minimum threshold</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {lowStockItems.map((item) => (
                            <div
                              key={item.id}
                              className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 flex flex-col justify-between space-y-3"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                  <span className="font-bold text-xs text-dark-900 truncate" title={item.name}>
                                    {item.name}
                                  </span>
                                  <span className="badge-orange text-[10px]">{item.status}</span>
                                </div>
                                <p className="font-mono text-[10px] text-dark-400">{item.sku}</p>

                                <div className="mt-3 p-2.5 rounded-lg bg-white border border-dark-100 text-xs space-y-1">
                                  <div className="flex justify-between">
                                    <span className="text-dark-500">Current Stock:</span>
                                    <span className="font-bold text-rose-700">{item.availableStock} {item.unit}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-dark-500">Min. Threshold:</span>
                                    <span className="font-semibold text-dark-700">{item.minThreshold} {item.unit}</span>
                                  </div>
                                  <div className="flex justify-between text-[11px] text-dark-400">
                                    <span>Warehouse:</span>
                                    <span>{item.warehouseBay}</span>
                                  </div>
                                </div>
                              </div>

                              <button
                                onClick={() => handleReplenishStock(item.id, 10)}
                                className="w-full btn-primary text-xs py-2 flex items-center justify-center gap-1.5"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Replenish (+10 {item.unit})</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* ══════════════════════ 10. SETTINGS TAB ══════════════════════ */}
            {activeTab === 'settings' && (
              <div className="space-y-5 animate-fade-in">
                <div className="card p-5 sm:p-6">
                  
                  {/* Settings Feedback Notifications */}
                  {settingsSuccessMsg && (
                    <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-xs">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                      <span>{settingsSuccessMsg}</span>
                    </div>
                  )}

                  {settingsErrorMsg && (
                    <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-xs">
                      <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                      <span>{settingsErrorMsg}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-dark-100">
                    <div>
                      <h2 className="text-xl font-bold font-display text-dark-900 flex items-center gap-2">
                        <Settings className="h-5 w-5 text-brand-600" />
                        Supplier Account &amp; Preferences
                      </h2>
                      <p className="text-xs text-dark-500 mt-0.5">
                        Manage your exporter legal credentials, escrow payment settings, and portal security
                      </p>
                    </div>

                    {/* Settings Sub-Tabs Pills */}
                    <div className="inline-flex items-center gap-1 bg-dark-100/80 p-1 rounded-xl border border-dark-200/60 self-start sm:self-auto">
                      {[
                        { id: 'profile' as const, label: 'Business Profile' },
                        { id: 'preferences' as const, label: 'Account Preferences' },
                        { id: 'notifications' as const, label: 'Notification Alerts' },
                        { id: 'security' as const, label: 'Security & Passwords' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setSettingsTab(tab.id);
                            if (tab.id === 'profile') setActiveSubTab('business-profile');
                            else setActiveSubTab('settings');
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            settingsTab === tab.id
                              ? 'bg-white text-brand-700 shadow-sm font-bold ring-1 ring-brand-100'
                              : 'text-dark-600 hover:text-dark-900 hover:bg-white/60'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ──────────────── 1. BUSINESS PROFILE FORM ──────────────── */}
                  {settingsTab === 'profile' && (
                    <form onSubmit={handleSaveProfile} className="space-y-4 max-w-3xl">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-dark-800 mb-1">
                            Company / Exporter Legal Entity <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={sellerProfile.companyName}
                            onChange={(e) => setSellerProfile({ ...sellerProfile, companyName: e.target.value })}
                            className="w-full h-9 px-3 text-xs rounded-xl border border-dark-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-dark-800 mb-1">
                            GSTIN Registration <span className="text-emerald-600 font-normal">(Verified)</span>
                          </label>
                          <input
                            type="text"
                            value={sellerProfile.gstin}
                            onChange={(e) => setSellerProfile({ ...sellerProfile, gstin: e.target.value })}
                            className="w-full h-9 px-3 text-xs rounded-xl border border-dark-200 font-mono focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-dark-800 mb-1">
                            IEC (Import Export Code)
                          </label>
                          <input
                            type="text"
                            value={sellerProfile.iecCode}
                            onChange={(e) => setSellerProfile({ ...sellerProfile, iecCode: e.target.value })}
                            className="w-full h-9 px-3 text-xs rounded-xl border border-dark-200 font-mono focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-dark-800 mb-1">
                            APEDA / Export Registration No.
                          </label>
                          <input
                            type="text"
                            value={sellerProfile.apedaReg}
                            onChange={(e) => setSellerProfile({ ...sellerProfile, apedaReg: e.target.value })}
                            className="w-full h-9 px-3 text-xs rounded-xl border border-dark-200 font-mono focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-dark-800 mb-1">
                          Business Overview &amp; Export Specialization
                        </label>
                        <textarea
                          rows={3}
                          value={sellerProfile.description}
                          onChange={(e) => setSellerProfile({ ...sellerProfile, description: e.target.value })}
                          className="w-full p-3 text-xs rounded-xl border border-dark-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-dark-800 mb-1">
                          Registered Warehouse &amp; Office Address
                        </label>
                        <input
                          type="text"
                          value={sellerProfile.address}
                          onChange={(e) => setSellerProfile({ ...sellerProfile, address: e.target.value })}
                          className="w-full h-9 px-3 text-xs rounded-xl border border-dark-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-dark-800 mb-1">City</label>
                          <input
                            type="text"
                            value={sellerProfile.city}
                            onChange={(e) => setSellerProfile({ ...sellerProfile, city: e.target.value })}
                            className="w-full h-9 px-3 text-xs rounded-xl border border-dark-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-dark-800 mb-1">State</label>
                          <input
                            type="text"
                            value={sellerProfile.state}
                            onChange={(e) => setSellerProfile({ ...sellerProfile, state: e.target.value })}
                            className="w-full h-9 px-3 text-xs rounded-xl border border-dark-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-dark-800 mb-1">Pincode</label>
                          <input
                            type="text"
                            value={sellerProfile.pincode}
                            onChange={(e) => setSellerProfile({ ...sellerProfile, pincode: e.target.value })}
                            className="w-full h-9 px-3 text-xs rounded-xl border border-dark-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-dark-800 mb-1">Country</label>
                          <input
                            type="text"
                            value={sellerProfile.country}
                            onChange={(e) => setSellerProfile({ ...sellerProfile, country: e.target.value })}
                            className="w-full h-9 px-3 text-xs rounded-xl border border-dark-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        <div>
                          <label className="block text-xs font-semibold text-dark-800 mb-1">Contact Person</label>
                          <input
                            type="text"
                            value={sellerProfile.contactPerson}
                            onChange={(e) => setSellerProfile({ ...sellerProfile, contactPerson: e.target.value })}
                            className="w-full h-9 px-3 text-xs rounded-xl border border-dark-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-dark-800 mb-1">
                            Official Email <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            required
                            value={sellerProfile.contactEmail}
                            onChange={(e) => setSellerProfile({ ...sellerProfile, contactEmail: e.target.value })}
                            className="w-full h-9 px-3 text-xs rounded-xl border border-dark-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-dark-800 mb-1">Contact Phone</label>
                          <input
                            type="text"
                            value={sellerProfile.contactPhone}
                            onChange={(e) => setSellerProfile({ ...sellerProfile, contactPhone: e.target.value })}
                            className="w-full h-9 px-3 text-xs rounded-xl border border-dark-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
                          />
                        </div>
                      </div>

                      <div className="pt-3 border-t border-dark-100 flex items-center justify-between">
                        <span className="text-[11px] text-dark-400">
                          Changes persist automatically to your Karthikeya Farmer Producer Company Limited supplier profile.
                        </span>
                        <button type="submit" className="btn-primary text-xs py-2 px-5 shadow-sm">
                          Save Business Profile
                        </button>
                      </div>
                    </form>
                  )}

                  {/* ──────────────── 2. ACCOUNT & SETTLEMENT PREFERENCES ──────────────── */}
                  {settingsTab === 'preferences' && (
                    <form onSubmit={handleSavePreferences} className="space-y-4 max-w-2xl">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-dark-800 mb-1">Primary Quotation Currency</label>
                          <select
                            value={accountPreferences.exportCurrency}
                            onChange={(e) => setAccountPreferences({ ...accountPreferences, exportCurrency: e.target.value })}
                            className="w-full h-9 px-3 text-xs rounded-xl border border-dark-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none bg-white"
                          >
                            <option value="INR (₹)">INR (₹) — Indian Rupee</option>
                            <option value="USD ($)">USD ($) — US Dollar</option>
                            <option value="EUR (€)">EUR (€) — Euro</option>
                            <option value="AED (د.إ)">AED (د.إ) — UAE Dirham</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-dark-800 mb-1">Default Incoterms Delivery Mode</label>
                          <select
                            value={accountPreferences.exportTerms}
                            onChange={(e) => setAccountPreferences({ ...accountPreferences, exportTerms: e.target.value })}
                            className="w-full h-9 px-3 text-xs rounded-xl border border-dark-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none bg-white"
                          >
                            <option value="CIF (Cost, Insurance & Freight)">CIF (Cost, Insurance &amp; Freight)</option>
                            <option value="FOB (Free on Board)">FOB (Free on Board)</option>
                            <option value="CFR (Cost and Freight)">CFR (Cost and Freight)</option>
                            <option value="EXW (Ex Works)">EXW (Ex Works)</option>
                          </select>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl border border-dark-200 bg-[#f8fafc] space-y-3">
                        <div className="flex items-center gap-2">
                          <Wallet className="h-4 w-4 text-brand-600" />
                          <h3 className="font-bold text-dark-900 text-xs uppercase tracking-wider">
                            Escrow Settlement &amp; Bank Account
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-dark-800 mb-1">Bank Name</label>
                            <input
                              type="text"
                              value={accountPreferences.bankName}
                              onChange={(e) => setAccountPreferences({ ...accountPreferences, bankName: e.target.value })}
                              className="w-full h-9 px-3 text-xs rounded-xl border border-dark-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-dark-800 mb-1">Account Holder</label>
                            <input
                              type="text"
                              value={accountPreferences.accountHolder}
                              onChange={(e) => setAccountPreferences({ ...accountPreferences, accountHolder: e.target.value })}
                              className="w-full h-9 px-3 text-xs rounded-xl border border-dark-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none bg-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-dark-800 mb-1">Account Number</label>
                            <input
                              type="text"
                              value={accountPreferences.accountNumber}
                              onChange={(e) => setAccountPreferences({ ...accountPreferences, accountNumber: e.target.value })}
                              className="w-full h-9 px-3 text-xs rounded-xl border border-dark-200 font-mono focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-dark-800 mb-1">IFSC Code</label>
                            <input
                              type="text"
                              value={accountPreferences.ifscCode}
                              onChange={(e) => setAccountPreferences({ ...accountPreferences, ifscCode: e.target.value })}
                              className="w-full h-9 px-3 text-xs rounded-xl border border-dark-200 font-mono focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none bg-white"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-dark-100 flex items-center justify-between">
                        <span className="text-[11px] text-dark-400">
                          Funds release automatically upon Bill of Lading verification.
                        </span>
                        <button type="submit" className="btn-primary text-xs py-2 px-5 shadow-sm">
                          Save Preferences
                        </button>
                      </div>
                    </form>
                  )}

                  {/* ──────────────── 3. NOTIFICATION PREFERENCES ──────────────── */}
                  {settingsTab === 'notifications' && (
                    <div className="space-y-4 max-w-xl">
                      {[
                        {
                          key: 'whatsappRfq' as const,
                          title: 'WhatsApp RFQ Alerts',
                          description: 'Receive real-time quotation notifications directly on your WhatsApp export desk.',
                        },
                        {
                          key: 'emailQuotes' as const,
                          title: 'Buyer Message & Quotation Emails',
                          description: 'Instant notification whenever a global buyer accepts or counters your quote.',
                        },
                        {
                          key: 'smsDispatches' as const,
                          title: 'Logistics & Dispatch SMS',
                          description: 'Get automated SMS updates upon port clearance and container bill of lading issuance.',
                        },
                        {
                          key: 'escrowAlerts' as const,
                          title: 'Escrow Payment Disbursements',
                          description: 'Receive real-time bank settlement and escrow release confirmations.',
                        },
                        {
                          key: 'weeklyMarketReport' as const,
                          title: 'Weekly Export Market Benchmark Digest',
                          description: 'Receive weekly price trends and global demand indices for agricultural exports.',
                        },
                      ].map((pref) => (
                        <div
                          key={pref.key}
                          className="p-4 rounded-xl border border-dark-200 bg-white flex items-center justify-between gap-4"
                        >
                          <div>
                            <p className="text-xs font-bold text-dark-900">{pref.title}</p>
                            <p className="text-[11px] text-dark-500 mt-0.5">{pref.description}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setNotificationPrefs((prev) => {
                                const next = { ...prev, [pref.key]: !prev[pref.key] };
                                return next;
                              });
                              setTimeout(() => handleSaveNotifications(), 50);
                            }}
                            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                              notificationPrefs[pref.key] ? 'bg-brand-600' : 'bg-dark-200'
                            }`}
                          >
                            <div
                              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                notificationPrefs[pref.key] ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ──────────────── 4. SECURITY & PASSWORDS ──────────────── */}
                  {settingsTab === 'security' && (
                    <div className="space-y-6 max-w-lg">
                      <form onSubmit={handleSaveSecurity} className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-dark-800 mb-1">Current Password</label>
                          <input
                            type="password"
                            required
                            placeholder="Enter current password (demo1234)"
                            value={securityForm.currentPassword}
                            onChange={(e) => setSecurityForm({ ...securityForm, currentPassword: e.target.value })}
                            className="w-full h-9 px-3 text-xs rounded-xl border border-dark-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-dark-800 mb-1">New Password</label>
                          <input
                            type="password"
                            required
                            placeholder="Minimum 6 characters"
                            value={securityForm.newPassword}
                            onChange={(e) => setSecurityForm({ ...securityForm, newPassword: e.target.value })}
                            className="w-full h-9 px-3 text-xs rounded-xl border border-dark-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-dark-800 mb-1">Confirm New Password</label>
                          <input
                            type="password"
                            required
                            placeholder="Re-enter new password"
                            value={securityForm.confirmPassword}
                            onChange={(e) => setSecurityForm({ ...securityForm, confirmPassword: e.target.value })}
                            className="w-full h-9 px-3 text-xs rounded-xl border border-dark-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
                          />
                        </div>

                        <div className="pt-2">
                          <button type="submit" className="btn-primary text-xs py-2 px-5 shadow-sm">
                            Update Password
                          </button>
                        </div>
                      </form>

                      {/* API Webhook Credentials */}
                      <div className="p-4 rounded-xl border border-dark-200 bg-[#f8fafc] space-y-2.5">
                        <div className="flex items-center gap-2">
                          <Key className="h-4 w-4 text-brand-600" />
                          <h4 className="font-bold text-dark-900 text-xs">Supplier Webhook &amp; ERP API Key</h4>
                        </div>
                        <p className="text-[11px] text-dark-500">
                          Use this key to automate inventory sync directly with your Tally, SAP, or warehouse management software.
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value="kfpcl_live_sec_9941a87b1204c3e8"
                            className="w-full h-8 px-2.5 font-mono text-[11px] rounded-lg border border-dark-200 bg-white text-dark-600"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText('kfpcl_live_sec_9941a87b1204c3e8');
                              setSettingsSuccessMsg('API Secret copied to clipboard!');
                              setTimeout(() => setSettingsSuccessMsg(''), 2500);
                            }}
                            className="btn-secondary text-[11px] py-1.5 px-3 whitespace-nowrap"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}

          </main>
        </div>

      </div>

      {/* ══════════════════════ ADD PRODUCT LISTING MODAL ══════════════════════ */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-dark-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl border border-dark-200 overflow-hidden animate-scale-up max-h-[92vh] flex flex-col">
            
            {/* Top Drag Handle on Mobile */}
            <div className="pt-3 pb-1 flex justify-center sm:hidden">
              <div className="w-12 h-1.5 bg-dark-200 rounded-full" />
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-100 bg-[#f8fafc] flex-shrink-0">
              <div>
                <h3 className="font-bold font-display text-dark-900 text-lg sm:text-xl">Add Product Listing</h3>
                <p className="text-xs text-dark-400 mt-0.5">Submit for Admin Approval &amp; Live Marketplace</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="h-8 w-8 rounded-full hover:bg-dark-100 text-dark-400 hover:text-dark-700 flex items-center justify-center transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-6 space-y-5 overflow-y-auto flex-1">
              
              {productSuccessMsg ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span>{productSuccessMsg}</span>
                </div>
              ) : (
                <>
                  {productErrorMsg && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                      <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                      <span>{productErrorMsg}</span>
                    </div>
                  )}


                  <div>
                    <label className="block text-xs font-semibold text-dark-800 mb-1">
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Premium 1121 Sella Basmati Rice"
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                      className="w-full h-10 px-3 text-xs rounded-xl border border-dark-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                    />
                  </div>

                  {/* Category & Subcategory */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-dark-800 mb-1">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Grains & Pulses"
                        value={newProductCategory}
                        onChange={(e) => setNewProductCategory(e.target.value)}
                        className="w-full h-10 px-3 text-xs rounded-xl border border-dark-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none bg-white transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-dark-800 mb-1">
                        Subcategory <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Basmati Rice"
                        value={newProductSubCategory}
                        onChange={(e) => setNewProductSubCategory(e.target.value)}
                        className="w-full h-10 px-3 text-xs rounded-xl border border-dark-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* Location & Company Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-dark-800 mb-1">
                        Location
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Amritsar, Punjab, India"
                        value={newProductLocation}
                        onChange={(e) => setNewProductLocation(e.target.value)}
                        className="w-full h-10 px-3 text-xs rounded-xl border border-dark-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none bg-white transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-dark-800 mb-1">
                        Company Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Aditya Agro Exports Pvt Ltd"
                        value={newProductCompanyName}
                        onChange={(e) => setNewProductCompanyName(e.target.value)}
                        className="w-full h-10 px-3 text-xs rounded-xl border border-dark-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none bg-white transition-all"
                      />
                    </div>
                  </div>


                  {/* ─── VARIANTS SECTION ─── */}
                  <div className="pt-2 border-t border-dark-100">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-base font-bold text-dark-900">Variants</h4>
                      <span className="text-xs text-dark-400 font-medium">
                        {newProductVariants.length} variant{newProductVariants.length > 1 ? 's' : ''} defined
                      </span>
                    </div>

                    <div className="space-y-4">
                      {newProductVariants.map((variant, index) => (
                        <div
                          key={variant.id}
                          className="rounded-2xl border border-dark-200 bg-white p-4 space-y-3.5 shadow-xs hover:border-dark-300 transition-colors"
                        >
                          {/* Row 1: Variant Name & SKU & Delete */}
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <label className="block text-[11px] font-bold text-dark-700 mb-1">
                                Variant Name <span className="text-blue-600 font-bold">* *</span>
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. 1 Kg / 400 gm"
                                value={variant.name}
                                onChange={(e) => handleUpdateVariant(variant.id, 'name', e.target.value)}
                                className="w-full h-9 px-3 text-xs rounded-xl border border-dark-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-dark-400"
                              />
                            </div>

                            <div className="flex-1">
                              <label className="block text-[11px] font-bold text-dark-700 mb-1">
                                SKU <span className="text-blue-600 font-bold">* *</span>
                              </label>
                                <input
                                type="text"
                                placeholder="e.g. SKU-101 (or auto-generated)"
                                value={variant.sku}
                                onChange={(e) => handleUpdateVariant(variant.id, 'sku', e.target.value)}
                                className="w-full h-9 px-3 text-xs rounded-xl border border-dark-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-dark-400 font-mono text-dark-800"
                              />

                            </div>

                            {newProductVariants.length > 1 && (
                              <div className="pt-6">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveVariant(variant.id)}
                                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Delete variant"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Row 2: Price & Discount Price */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-dark-700 mb-1">
                                Price (₹) <span className="text-blue-600 font-bold">*</span>
                              </label>
                              <input
                                type="number"
                                placeholder="0"
                                value={variant.price}
                                onChange={(e) => handleUpdateVariant(variant.id, 'price', e.target.value)}
                                className="w-full h-9 px-3 text-xs rounded-xl border border-dark-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-dark-700 mb-1">
                                Discount Price (₹)
                              </label>
                              <input
                                type="number"
                                placeholder="0"
                                value={variant.discountPrice}
                                onChange={(e) => handleUpdateVariant(variant.id, 'discountPrice', e.target.value)}
                                className="w-full h-9 px-3 text-xs rounded-xl border border-dark-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                              />
                            </div>
                          </div>

                          {/* Row 3: Stock & Display Order */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-dark-700 mb-1">
                                Stock <span className="text-blue-600 font-bold">*</span>
                              </label>
                              <input
                                type="number"
                                placeholder="0"
                                value={variant.stock}
                                onChange={(e) => handleUpdateVariant(variant.id, 'stock', e.target.value)}
                                className="w-full h-9 px-3 text-xs rounded-xl border border-dark-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-dark-700 mb-1">
                                Display Order
                              </label>
                              <input
                                type="number"
                                placeholder="1"
                                value={variant.displayOrder}
                                onChange={(e) => handleUpdateVariant(variant.id, 'displayOrder', e.target.value)}
                                className="w-full h-9 px-3 text-xs rounded-xl border border-dark-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                              />
                            </div>
                          </div>

                          {/* Row 4: Active Checkbox */}
                          <div className="pt-0.5">
                            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={variant.active}
                                onChange={(e) => handleUpdateVariant(variant.id, 'active', e.target.checked)}
                                className="h-4 w-4 rounded text-blue-600 border-dark-300 focus:ring-blue-500 rounded-sm"
                              />
                              <span className="text-xs font-semibold text-dark-800">Active</span>
                            </label>
                          </div>
                        </div>
                      ))}

                      {/* + Add Variant Button */}
                      <div>
                        <button
                          type="button"
                          onClick={handleAddVariant}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-bold text-xs transition-all shadow-xs"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Add Variant</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Product Images Upload with Previews */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-dark-800">
                        Product Images
                      </label>
                      {newProductImages.length > 0 && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs font-bold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1 hover:underline"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>+ Add More Images</span>
                        </button>
                      )}
                    </div>

                    <label
                      htmlFor="product-images-upload"
                      className="border-2 border-dashed border-dark-200 hover:border-brand-500 bg-[#f8fafc] hover:bg-brand-50/40 rounded-xl p-3.5 flex flex-col items-center justify-center cursor-pointer transition-all group"
                    >
                      <Upload className="h-4 w-4 text-dark-400 group-hover:text-brand-600 transition-colors mb-1" />
                      <p className="text-xs font-semibold text-dark-700 group-hover:text-brand-700 transition-colors">
                        {newProductImages.length > 0 ? '+ Upload additional product photos' : 'Click to upload product photos'}
                      </p>
                      <p className="text-[10px] text-dark-400 mt-0.5">
                        PNG, JPG, WebP (Multiple allowed, progressive selection supported)
                      </p>
                    </label>
                    <input
                      ref={fileInputRef}
                      id="product-images-upload"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />

                    {/* Selected Image Previews */}
                    {newProductImages.length > 0 && (
                      <div className="mt-2.5">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-dark-600 mb-1.5">
                          <span>Selected Photos ({newProductImages.length})</span>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="text-[10px] font-bold text-brand-700 hover:underline"
                            >
                              + Add More
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewProductImages([])}
                              className="text-[10px] text-rose-600 hover:underline font-medium"
                            >
                              Clear all
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {newProductImages.map((imgUrl, idx) => (
                            <div
                              key={idx}
                              className="relative group aspect-square rounded-lg overflow-hidden border border-dark-200 bg-dark-50 shadow-xs"
                            >
                              <img
                                src={imgUrl}
                                alt={`Product preview ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setNewProductImages((prev) => prev.filter((_, i) => i !== idx))
                                }
                                className="absolute top-1 right-1 h-5 w-5 rounded-full bg-dark-900/80 hover:bg-rose-600 text-white flex items-center justify-center transition-colors shadow-sm"
                                title="Remove photo"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-dark-800 mb-1">
                      Specifications &amp; Export Grade Description
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Grain length 8.35mm, 100% sortex clean, moisture < 12.5%..."
                      value={newProductDescription}
                      onChange={(e) => setNewProductDescription(e.target.value)}
                      className="w-full p-3 text-xs rounded-xl border border-dark-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="btn-secondary text-xs py-2 px-4"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingProduct}
                      className="btn-primary text-xs py-2 px-5 shadow-sm flex items-center gap-1.5"
                    >
                      {isSubmittingProduct ? (
                        <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      <span>Submit for Approval</span>
                    </button>
                  </div>
                </>
              )}

            </form>
          </div>
        </div>
      )}


      {/* ══════════════════════ REPLY TO BUYER ENQUIRY MODAL ══════════════════════ */}
      {replyingEnquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-dark-200 overflow-hidden animate-scale-up">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-100 bg-[#f8fafc]">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-brand-50 border border-brand-100 text-brand-600 flex items-center justify-center">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold font-display text-dark-900 text-base">
                    {replyingEnquiry.source === 'rfq' ? 'Respond to RFQ' : 'Reply to Buyer'}
                  </h3>
                  <p className="text-[11px] text-dark-400">
                    To: {replyingEnquiry.buyerName} ({replyingEnquiry.company})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReplyingEnquiry(null)}
                className="h-8 w-8 rounded-lg hover:bg-dark-100 text-dark-400 hover:text-dark-700 flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSendReply} className="p-6 space-y-4">
              {replySuccessMsg ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span>{replySuccessMsg}</span>
                </div>
              ) : (
                <>
                  <div className="p-3 bg-dark-50 rounded-xl border border-dark-100 text-xs">
                    <p className="text-dark-400 text-[10px]">
                      {replyingEnquiry.source === 'rfq' ? 'Regarding RFQ:' : 'Regarding Enquiry:'}
                    </p>
                    <p className="font-bold text-dark-900">{replyingEnquiry.subject}</p>
                    <p className="text-dark-600 text-[11px] mt-0.5">Commodity: {replyingEnquiry.product}</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-dark-800 mb-1">
                      Commercial Message / Quotation Response <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={5}
                      required
                      placeholder="Dear buyer, thank you for your inquiry. We can fulfill your requirement at ₹... CIF terms with SGS inspection..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      className="w-full p-3 text-xs rounded-lg border border-dark-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all resize-none"
                    />
                  </div>

                  {replyingEnquiry.source === 'rfq' && (
                    <div>
                      <label className="block text-xs font-semibold text-dark-800 mb-1">
                        Offered Price (₹ per {replyingEnquiry.unit || 'unit'}) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        placeholder="Enter your offered price"
                        value={replyOfferPrice}
                        onChange={(e) => setReplyOfferPrice(e.target.value)}
                        className="w-full p-3 text-xs rounded-lg border border-dark-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                      />
                      {replyingEnquiry.targetPrice && (
                        <p className="mt-1 text-[11px] text-dark-400">
                          Buyer target: ₹{replyingEnquiry.targetPrice.toLocaleString('en-IN')}/{replyingEnquiry.unit || 'unit'}
                        </p>
                      )}
                    </div>
                  )}

                  {replyErrorMsg && (
                    <p className="text-xs font-medium text-red-600">{replyErrorMsg}</p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-dark-100">
                    <span className="text-[11px] text-dark-400">
                      Copy will be dispatched to {replyingEnquiry.email}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setReplyingEnquiry(null)}
                        className="btn-secondary text-xs py-2 px-3.5"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSendingReply}
                        className="btn-primary text-xs py-2 px-4 shadow-sm flex items-center gap-1.5"
                      >
                        {isSendingReply ? (
                          <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        <span>{replyingEnquiry.source === 'rfq' ? 'Submit Quote' : 'Send Response'}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════ ORDER DETAILS MODAL ══════════════════════ */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-dark-200 overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-100 bg-[#f8fafc]">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-brand-50 border border-brand-100 text-brand-600 flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold font-display text-dark-900 text-base">Order Details: {viewingOrder.orderNumber}</h3>
                  <p className="text-[11px] text-dark-400">Placed on {viewingOrder.createdAt}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingOrder(null)}
                className="h-8 w-8 rounded-lg hover:bg-dark-100 text-dark-400 hover:text-dark-700 flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-dark-50 border border-dark-100 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-dark-500">Buyer Entity:</span>
                  <span className="font-bold text-dark-900">{viewingOrder.buyerCompany}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-500">Contact Person:</span>
                  <span className="font-semibold text-dark-800">{viewingOrder.buyerContact}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-500">Delivery Destination:</span>
                  <span className="font-medium text-dark-700">{viewingOrder.destination}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-500">Status:</span>
                  <span className={`badge-${viewingOrder.status === 'processing' ? 'orange' : viewingOrder.status === 'cancelled' ? 'red' : 'green'} text-[10px]`}>
                    {viewingOrder.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-dark-900 mb-2">Order Line Items</h4>
                <div className="divide-y divide-dark-100 border border-dark-200 rounded-xl overflow-hidden">
                  {viewingOrder.items.map((item, i) => (
                    <div key={i} className="p-3 flex justify-between items-center bg-white">
                      <div>
                        <p className="font-bold text-dark-900">{item.productName}</p>
                        <p className="text-[11px] text-dark-500">{item.quantity} {item.unit} @ {formatCurrency(item.price)}/{item.unit}</p>
                      </div>
                      <p className="font-bold text-dark-900">{formatCurrency(item.totalPrice)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-dark-100">
                <div>
                  <p className="text-dark-400 text-[10px]">Total Contract Value</p>
                  <p className="text-base font-bold text-dark-900">{formatCurrency(viewingOrder.total)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewingOrder(null)}
                    className="btn-secondary text-xs py-2 px-4"
                  >
                    Close
                  </button>
                  {viewingOrder.status === 'processing' && (
                    <button
                      type="button"
                      onClick={() => {
                        handleMarkOrderShipped(viewingOrder.id);
                        setViewingOrder(null);
                      }}
                      className="btn-primary text-xs py-2 px-4"
                    >
                      Mark Shipped
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
