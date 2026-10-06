export type TradeStatus =
  | 'pending'
  | 'paid'
  | 'confirmed'
  | 'released'
  | 'flagged'
  | 'cancelled'
  | 'refunded';

export interface Seller {
  id: string;
  displayName: string;
  stripeConnectAccountId: string;
  createdAt: string;
}

export interface Trade {
  id: string;
  sellerId: string;
  sellerDisplayName?: string;
  sellerStripeAccountId?: string;
  buyerEmail: string;
  itemName: string;
  price: number;
  platformFee: number;
  totalAmount: number;
  status: TradeStatus;
  handoffCode?: string;
  stripePaymentIntentId?: string;
  createdAt: string;
  paidAt?: string | null;
  confirmedAt?: string | null;
  cancelledAt?: string | null;
  cancelledBy?: 'buyer' | 'seller' | 'admin' | null;
  cancellationTimeFormatted?: string | null;
  cancellationMessage?: string | null;
  refundedAt?: string | null;
  refundReason?: string | null;
  flaggedReason?: string;
  failedCodeAttempts?: number;
  isReviewed?: boolean;
}

// Utility to calculate fee: 6%, min $2.00
export function calculatePlatformFee(price: number): number {
  const percentageFee = Math.round(price * 0.06 * 100) / 100;
  return Math.max(2.0, percentageFee);
}
