/**
 * Generates a UPI payment deep link
 * @param upiId The recipient's UPI ID (pa)
 * @param name The recipient's name (pn)
 * @param amount The amount to pay (am)
 * @param note The transaction note (tn)
 * @returns A string containing the UPI deep link
 */
export const generateUpiLink = (
  upiId: string,
  name: string,
  amount: number,
  note: string = "Expense Split"
): string => {
  if (!upiId) return "";
  
  const encodedName = encodeURIComponent(name);
  const encodedNote = encodeURIComponent(note);
  
  // Format: upi://pay?pa=<upi_id>&pn=<name>&am=<amount>&tn=<note>&cu=INR
  return `upi://pay?pa=${upiId}&pn=${encodedName}&am=${amount.toFixed(2)}&tn=${encodedNote}&cu=INR`;
};

/**
 * Checks if the current device is likely to support UPI deep links
 */
export const isMobile = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};
