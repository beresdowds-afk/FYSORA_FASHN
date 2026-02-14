/**
 * Platform fee calculations:
 * - 5% customer surcharge: added to the order total, paid by the customer
 * - 5% org admin fee: deducted from order revenue, paid by the organization
 */

export const PLATFORM_FEE_PERCENT = 5;
export const ADMIN_FEE_PERCENT = 5;

export interface FeeBreakdown {
  subtotal: number;
  platformFee: number;       // 5% surcharge on customer
  customerTotal: number;     // subtotal + platformFee
  adminFee: number;          // 5% of subtotal, charged to org
  orgNetRevenue: number;     // subtotal - adminFee
}

export const calculateFees = (subtotal: number): FeeBreakdown => {
  const platformFee = Math.round(subtotal * PLATFORM_FEE_PERCENT / 100);
  const customerTotal = subtotal + platformFee;
  const adminFee = Math.round(subtotal * ADMIN_FEE_PERCENT / 100);
  const orgNetRevenue = subtotal - adminFee;

  return { subtotal, platformFee, customerTotal, adminFee, orgNetRevenue };
};
