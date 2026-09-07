import type { Product } from '@/types/product';

export interface CategoryDefinition {
  id: string;
  name: string;
  count?: number;
  icon: string;
  badgeEmoji: string;
  group: 'agri' | 'food' | 'industrial' | 'consumer' | 'chemicals';
  image: string;
  tagline: string;
  subcategories: string[];
}

export const CATEGORIES_CONFIG: CategoryDefinition[] = [
  {
    id: 'grains',
    name: 'Grains & Pulses',
    icon: '🌾',
    badgeEmoji: '🌾',
    group: 'agri',
    image: '/images/categories/grains-pulses.jpg',
    tagline: 'Basmati, Jasmine, Sona Masoori, Moong Dal, Toor Dal, Rajma, Chana',
    subcategories: [
      'Basmati Rice',
      'Jasmine Rice',
      'Long Grain White Rice',
      'Sona Masoori',
      'Brown Rice',
      'Black Rice',
      'Moong Dal',
      'Pigeon Peas',
      'Red Kidney Beans',
      'Horse Gram',
      'Black Gram',
      'Bengal Gram',
      'Green Gram',
    ],
  },
  {
    id: 'spices',
    name: 'Spices',
    icon: '🌶️',
    badgeEmoji: '🌶️',
    group: 'agri',
    image: '/images/categories/spices.jpg',
    tagline: 'Turmeric, Cumin, Black Pepper, Cinnamon, Cardamom, Cloves',
    subcategories: [
      'Turmeric',
      'Cumin',
      'Black Pepper',
      'Cinnamon',
      'Cardamom',
      'Cloves',
      'Star Anise',
      'Coriander',
    ],
  },
  {
    id: 'oils',
    name: 'Edible Oils',
    icon: '🫒',
    badgeEmoji: '🫒',
    group: 'agri',
    image: '/images/categories/edible-oils.jpg',
    tagline: 'Coconut Oil, Olive Oil, Sunflower Oil, Canola, Peanut, Mustard Oil',
    subcategories: [
      'Coconut Oil',
      'Olive Oil',
      'Sunflower Oil',
      'Canola Oil',
      'Peanut Oil',
      'Soybean Oil',
      'Mustard Oil',
      'Sesame Oil',
      'Cottonseed Oil',
    ],
  },
  {
    id: 'processed',
    name: 'Processed Foods',
    icon: '🥫',
    badgeEmoji: '🥫',
    group: 'food',
    image: '/images/categories/processed-foods.jpg',
    tagline: 'Sodas, Potato Chips, Breakfast Cereals, Ready Meals, Roasted Nuts',
    subcategories: [
      'Sodas',
      'Potato Chips',
      'Sweetened Breakfast Cereals',
      'Frozen Ready Meals',
      'Roasted Nuts',
      'Fruit Pulp',
      'Jams & Sauces',
    ],
  },
  {
    id: 'fresh',
    name: 'Fresh Produce',
    icon: '🥬',
    badgeEmoji: '🥬',
    group: 'agri',
    image: '/images/categories/fresh-produce.jpg',
    tagline: 'Broccoli, Cabbage, Carrot, Spinach, Radish, Tomatoes, Onions',
    subcategories: [
      'Broccoli',
      'Cabbage',
      'Carrot',
      'Spinach',
      'Radish',
      'Bell Peppers',
      'Tomatoes',
    ],
  },
  {
    id: 'textiles',
    name: 'Textiles',
    icon: '🧵',
    badgeEmoji: '🧵',
    group: 'consumer',
    image: '/images/categories/textiles.jpg',
    tagline: 'Cotton, Silk, Wool, Linen, Rayon, Yarns & Woven Fabrics',
    subcategories: [
      'Cotton',
      'Silk',
      'Wool',
      'Linen',
      'Rayon',
      'Yarns',
      'Fabrics',
    ],
  },
  {
    id: 'chemicals',
    name: 'Chemicals',
    icon: '🧪',
    badgeEmoji: '🧪',
    group: 'chemicals',
    image: '/images/categories/chemicals.jpg',
    tagline: 'Table Salt, Baking Soda, Washing Soda, Vinegar, Caustic Soda, Quicklime',
    subcategories: [
      'Table Salt',
      'Baking Soda',
      'Washing Soda',
      'Vinegar',
      'Caustic Soda',
      'Quicklime',
      'Agro Chemicals',
    ],
  },
  {
    id: 'engineering',
    name: 'Engineering Goods',
    icon: '⚙️',
    badgeEmoji: '⚙️',
    group: 'industrial',
    image: '/images/categories/engineering-goods.jpg',
    tagline: 'Industrial Machinery, Electronics, Auto Components, Iron, Steel',
    subcategories: [
      'Industrial & Capital Machinery',
      'Electrical & Electronic Equipment',
      'Automobiles & Auto Components',
      'Iron',
      'Steel',
      'Precision Gears',
      'Valves',
    ],
  },
];

/**
 * Normalizes a category identifier or string for resilient matching.
 */
export function normalizeCategoryKey(val: string): string {
  if (!val) return '';
  return val
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Maps any category ID or label to its canonical CategoryDefinition
 */
export function getCategoryDefinition(idOrName: string): CategoryDefinition | undefined {
  if (!idOrName) return undefined;
  const key = normalizeCategoryKey(idOrName);
  return CATEGORIES_CONFIG.find((cat) => {
    return (
      normalizeCategoryKey(cat.id) === key ||
      normalizeCategoryKey(cat.name) === key ||
      key.includes(normalizeCategoryKey(cat.id)) ||
      normalizeCategoryKey(cat.id).includes(key)
    );
  });
}

/**
 * Checks whether a given product belongs to a specific category key or ID.
 */
export function isProductInCategory(product: Product, categoryKeyOrId: string): boolean {
  if (!categoryKeyOrId || categoryKeyOrId === 'all') return true;

  const targetDef = getCategoryDefinition(categoryKeyOrId);
  const targetKey = targetDef ? normalizeCategoryKey(targetDef.name) : normalizeCategoryKey(categoryKeyOrId);
  const prodCatKey = normalizeCategoryKey(product.category);

  // Exact or normalized match with category name
  if (prodCatKey === targetKey) return true;
  if (targetDef && prodCatKey === normalizeCategoryKey(targetDef.id)) return true;

  // Subcategory check or tags check
  if (product.subCategory && normalizeCategoryKey(product.subCategory) === targetKey) return true;

  return false;
}
