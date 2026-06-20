/**
 * Format a monetary amount using Intl.NumberFormat.
 * Never hardcode ₱ or $ in business logic — format only at display.
 *
 * @param amount - The numeric amount
 * @param currency - ISO 4217 currency code (default: PHP)
 * @param locale - BCP 47 locale (default: en-PH)
 */
export function formatCurrency(
  amount: number,
  currency: string = process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || "PHP",
  locale: string = "en-PH"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a distance in kilometers.
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}
