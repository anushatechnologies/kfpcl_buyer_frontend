import type { Product, ProductSuggestion } from "../types/storefront";
import {
  calculateDiscountPercent,
  getVariantOriginalPrice,
  getVariantPrice,
} from "./storefrontUtils";

const SYNONYM_GROUPS = [
  ["milk", "doodh", "paalu", "paal", "పాలు"],
  ["curd", "yogurt", "yoghurt", "dahi", "perugu", "పెరుగు"],
  ["paneer", "panir", "పనీర్"],
  ["butter", "venna", "వెన్న"],
  ["ghee", "neyyi", "నెయ్యి"],
  ["rice", "chawal", "biyyam", "బియ్యం"],
  ["atta", "aata", "flour", "wheat flour", "godhuma pindi", "గోధుమ పిండి"],
  ["dal", "dhal", "lentil", "lentils", "pappu", "పప్పు"],
  ["toor dal", "tur dal", "kandi pappu", "కందిపప్పు"],
  ["moong dal", "mung dal", "pesara pappu", "పెసర పప్పు"],
  ["urad dal", "minapa pappu", "మినప పప్పు"],
  ["chana dal", "senaga pappu", "శనగ పప్పు"],
  ["besan", "gram flour", "senaga pindi", "శనగ పిండి"],
  ["rava", "sooji", "suji", "bombay rava", "రవ్వ"],
  ["poha", "flattened rice", "atukulu", "అటుకులు"],
  ["oil", "cooking oil", "nune", "tel", "నూనె"],
  ["sugar", "cheeni", "chakkera", "చక్కెర"],
  ["salt", "namak", "uppu", "ఉప్పు"],
  ["tea", "chai", "చాయ్", "టీ"],
  ["coffee", "కాఫీ"],
  ["turmeric", "haldi", "pasupu", "పసుపు"],
  ["coriander", "dhaniya", "kothimeera", "కొత్తిమీర"],
  ["curry leaves", "karivepaku", "కరివేపాకు"],
  ["ginger", "adrak", "allam", "అల్లం"],
  ["garlic", "lahsun", "vellulli", "వెల్లుల్లి"],
  ["onion", "onions", "pyaz", "pyaaz", "ulli", "ullipaya", "ఉల్లిపాయ"],
  ["potato", "potatoes", "aloo", "bangaladumpa", "బంగాళాదుంప"],
  ["tomato", "tomatoes", "tamatar", "tamota", "టమాటా"],
  ["brinjal", "eggplant", "baingan", "vankaya", "వంకాయ"],
  ["okra", "ladies finger", "bhindi", "bendakaya", "బెండకాయ"],
  ["chilli", "chillies", "mirchi", "mirapakaya", "మిర్చి"],
  ["banana", "bananas", "arati", "అరటి"],
  ["apple", "apples", "ఆపిల్"],
  ["egg", "eggs", "anda", "guddu", "గుడ్డు"],
  ["chicken", "కోడి", "kodi"],
  ["fish", "chepa", "చేప"],
  ["mutton", "మటన్"],
  ["soap", "sabbu", "సబ్బు"],
  ["shampoo", "షాంపూ"],
  ["detergent", "washing powder", "surf", "సర్ఫ్"],
  ["biscuits", "biscuit", "cookies", "బిస్కెట్"],
  ["snacks", "namkeen", "చిప్స్"],
  ["fruits", "fruit", "pandlu", "పండ్లు"],
  ["vegetables", "veggies", "kooragayalu", "కూరగాయలు"],
] as const;

const MIN_SEARCH_SCORE = 18;

type SearchIndex = {
  name: string;
  text: string;
  compactText: string;
  tokens: string[];
  tokenSet: Set<string>;
};

type SearchQuery = {
  normalized: string;
  compact: string;
  tokens: string[];
  tokenSet: Set<string>;
  phraseTerms: string[];
  tokenTerms: string[];
};

const normalizeSearchText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const compactSearchText = (value: string) => normalizeSearchText(value).replace(/\s+/g, "");

const tokenizeSearchText = (value: string) => normalizeSearchText(value).split(" ").filter(Boolean);

const containsWholePhrase = (text: string, phrase: string) => {
  if (!text || !phrase) return false;
  return ` ${text} `.includes(` ${phrase} `);
};

const buildSynonymLookup = () => {
  const lookup = new Map<string, Set<string>>();

  for (const group of SYNONYM_GROUPS) {
    const normalizedGroup = group.map((term) => normalizeSearchText(term)).filter(Boolean);
    for (const term of normalizedGroup) {
      const related = lookup.get(term) || new Set<string>();
      normalizedGroup.forEach((item) => related.add(item));
      lookup.set(term, related);
    }
  }

  return lookup;
};

const SYNONYM_LOOKUP = buildSynonymLookup();

const getExpandedTerms = (query: string) => {
  const normalized = normalizeSearchText(query);
  const tokens = tokenizeSearchText(query);
  const phraseTerms = new Set<string>(normalized ? [normalized] : []);
  const tokenTerms = new Set<string>(tokens);

  for (const [term, related] of SYNONYM_LOOKUP.entries()) {
    if (!containsWholePhrase(normalized, term)) continue;
    related.forEach((item: string) => {
      if (item.includes(" ")) {
        phraseTerms.add(item);
      } else {
        tokenTerms.add(item);
      }
    });
  }

  for (const token of tokens) {
    const related = SYNONYM_LOOKUP.get(token);
    related?.forEach((item: string) => {
      if (item.includes(" ")) {
        phraseTerms.add(item);
      } else {
        tokenTerms.add(item);
      }
    });
  }

  return {
    normalized,
    compact: compactSearchText(query),
    tokens,
    tokenSet: new Set(tokens),
    phraseTerms: [...phraseTerms],
    tokenTerms: [...tokenTerms],
  } satisfies SearchQuery;
};

const buildProductSearchIndex = (product: Product): SearchIndex => {
  const fields = [
    product.name,
    product.categoryName,
    product.subCategoryName,
    product.storeName,
    product.description,
    ...product.variants.map((variant) => variant.name),
  ];
  const text = normalizeSearchText(fields.filter(Boolean).join(" "));
  const tokens = [...new Set(text.split(" ").filter(Boolean))];

  return {
    name: normalizeSearchText(product.name),
    text,
    compactText: text.replace(/\s+/g, ""),
    tokens,
    tokenSet: new Set(tokens),
  };
};

const getMaxDistance = (value: string) => {
  if (value.length <= 5) return 1;
  if (value.length <= 8) return 2;
  return 3;
};

const boundedLevenshtein = (left: string, right: string, maxDistance: number) => {
  if (left === right) return 0;
  if (!left.length || !right.length) return Math.max(left.length, right.length);
  if (Math.abs(left.length - right.length) > maxDistance) return maxDistance + 1;

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    let rowMin = current[0];

    for (let column = 1; column <= right.length; column += 1) {
      const substitutionCost = left[row - 1] === right[column - 1] ? 0 : 1;
      const nextValue = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + substitutionCost,
      );
      current[column] = nextValue;
      rowMin = Math.min(rowMin, nextValue);
    }

    if (rowMin > maxDistance) return maxDistance + 1;
    previous = current;
  }

  return previous[right.length];
};

const scoreTokenAgainstCandidates = (token: string, index: SearchIndex, weights: { exact: number; prefix: number; fuzzy: number }) => {
  if (!token) return 0;
  if (index.tokenSet.has(token)) return weights.exact;

  if (token.length >= 3) {
    const prefixHit = index.tokens.some((candidate) => candidate.length >= 3 && candidate.startsWith(token));
    if (prefixHit) return weights.prefix;
  }

  if (token.length < 4) return 0;

  const maxDistance = getMaxDistance(token);
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of index.tokens) {
    if (candidate.length < 3) continue;
    if (Math.abs(candidate.length - token.length) > maxDistance) continue;
    const distance = boundedLevenshtein(token, candidate, maxDistance);
    if (distance < bestDistance) {
      bestDistance = distance;
      if (distance <= 1) break;
    }
  }

  if (!Number.isFinite(bestDistance) || bestDistance > maxDistance) return 0;
  return Math.max(weights.fuzzy - bestDistance * 2, 4);
};

const scoreProduct = (product: Product, search: SearchQuery) => {
  if (!search.normalized) return 0;

  const index = buildProductSearchIndex(product);
  let score = 0;
  let directTokenHits = 0;

  if (index.name === search.normalized) score += 180;
  else if (containsWholePhrase(index.name, search.normalized)) score += 140;
  else if (index.name.includes(search.normalized)) score += 110;

  if (containsWholePhrase(index.text, search.normalized)) score += 90;
  if (search.compact && index.compactText.includes(search.compact)) score += 50;

  for (const phrase of search.phraseTerms) {
    if (phrase === search.normalized) continue;
    if (containsWholePhrase(index.name, phrase)) score += 44;
    else if (containsWholePhrase(index.text, phrase)) score += 28;
  }

  for (const token of search.tokens) {
    const tokenScore = scoreTokenAgainstCandidates(token, index, { exact: 26, prefix: 18, fuzzy: 14 });
    if (tokenScore > 0) {
      directTokenHits += 1;
      score += tokenScore;
    }
  }

  for (const token of search.tokenTerms) {
    if (search.tokenSet.has(token)) continue;
    score += scoreTokenAgainstCandidates(token, index, { exact: 12, prefix: 9, fuzzy: 8 });
  }

  if (search.tokens.length > 1) {
    score += directTokenHits * 6;
    if (directTokenHits === search.tokens.length) {
      score += 20;
    }
  }

  if (product.isInStock) score += 2;
  if (product.bestSeller) score += 2;
  if (product.isTrending) score += 1;

  return score;
};

export const rankProductsForSearch = (products: Product[], query: string, limit?: number) => {
  const search = getExpandedTerms(query);
  if (!search.normalized) return [...products];

  const ranked = products
    .map((product) => ({ product, score: scoreProduct(product, search) }))
    .filter((entry) => entry.score >= MIN_SEARCH_SCORE)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (Number(right.product.isInStock) !== Number(left.product.isInStock)) {
        return Number(right.product.isInStock) - Number(left.product.isInStock);
      }
      return left.product.name.localeCompare(right.product.name);
    })
    .map((entry) => entry.product);

  return typeof limit === "number" ? ranked.slice(0, limit) : ranked;
};

export const mapProductToSuggestion = (product: Product): ProductSuggestion => {
  const price = product.primaryVariant ? getVariantPrice(product.primaryVariant) : product.minPrice;
  const originalPrice = product.primaryVariant
    ? getVariantOriginalPrice(product.primaryVariant)
    : product.maxPrice;

  return {
    id: product.id,
    name: product.name,
    imageUrl: product.imageUrl,
    categoryName: product.categoryName,
    subCategoryName: product.subCategoryName,
    variantName: product.primaryVariant?.name,
    price,
    originalPrice,
    discountPercent: calculateDiscountPercent(originalPrice, price),
    isInStock: Number(product.primaryVariant?.stock || 0) > 0,
  };
};

export const mergeSuggestions = (
  primary: ProductSuggestion[],
  secondary: ProductSuggestion[],
  limit = 8,
) => {
  const merged = new Map<number, ProductSuggestion>();

  [...primary, ...secondary].forEach((suggestion) => {
    if (!merged.has(suggestion.id)) {
      merged.set(suggestion.id, suggestion);
    }
  });

  return [...merged.values()].slice(0, limit);
};

export const mergeRankedProducts = (primary: Product[], secondary: Product[], limit?: number) => {
  const merged = new Map<number, Product>();

  [...primary, ...secondary].forEach((product) => {
    if (!merged.has(product.id)) {
      merged.set(product.id, product);
    }
  });

  const items = [...merged.values()];
  return typeof limit === "number" ? items.slice(0, limit) : items;
};
