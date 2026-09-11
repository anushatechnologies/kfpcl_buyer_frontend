// Regex pattern matching strictly @gmail.com
export const GMAIL_REGEX = /^[A-Za-z0-9._%+-]+@gmail\.com$/i;

// Validation helper function for Gmail addresses
export const isValidGmail = (email?: string | null): boolean => {
  if (!email) return false;
  return GMAIL_REGEX.test(email.trim());
};
