import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  currency: string = 'INR',
  locale: string = 'en-IN'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const trimmed = String(dateString).trim();
  // If string is already formatted in IST (e.g. "12 Sep 2026", "12 Sep 2026, 11:08 AM", "11:08 AM")
  if (
    trimmed.includes(' AM') ||
    trimmed.includes(' PM') ||
    /^[0-9]{1,2}\s+[A-Za-z]{3}/.test(trimmed) ||
    /^[A-Za-z]{3}\s+[0-9]{1,2}/.test(trimmed)
  ) {
    return trimmed;
  }
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return trimmed;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(d);
}

/**
 * Direct IST Date & Time display for Notifications & Quotations.
 * The backend now generates and returns all notification and quote timestamps
 * in Indian Standard Time (IST / Asia/Kolkata). Display directly without extra timezone offset.
 */
export function formatISTDateTime(dateString?: string): string {
  if (!dateString) return 'Recent';
  const trimmed = String(dateString).trim();
  if (
    trimmed.includes(' AM') ||
    trimmed.includes(' PM') ||
    /^[0-9]{1,2}\s+[A-Za-z]{3}/.test(trimmed)
  ) {
    return trimmed;
  }
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return trimmed;
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }).format(d);
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return formatDate(dateString);
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '…';
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .trim();
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Regex pattern matching strictly @gmail.com
export const GMAIL_REGEX = /^[A-Za-z0-9._%+-]+@gmail\.com$/i;

// Example validation helper function
export const isValidGmail = (email?: string | null): boolean => {
  if (!email) return false;
  return GMAIL_REGEX.test(email.trim());
};

