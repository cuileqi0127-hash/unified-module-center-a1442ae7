import { apiGet, apiPost, type ApiResponse, type PaginatedResponse } from '@/services/apiClient';

export type BillingAccountType = 'SUBSCRIPTION' | 'GIFT' | 'PACK';
export type BillingDirection = 'INCREASE' | 'DECREASE';

export interface BillingMeSummaryResp {
  subscriptionCredits: number;
  giftCredits: number;
  packCredits: number;
  totalCredits: number;
  membershipPlan: string;
  subscriptionStatus: 'FREE' | 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | (string & {});
  autoRenew: boolean;
  subscriptionEndTime: string | null;
}

export interface BillingJournalResp {
  id: string | number;
  direction: BillingDirection;
  title: string;
  credits: number;
  occurredTime: string;
}

export interface BillingCheckoutReq {
  itemCode: string;
}

export interface BillingCheckoutResp {
  orderId: string | number;
  orderNo: string;
  orderType:
    | 'SUBSCRIPTION_NEW'
    | 'MEMBERSHIP_ONE_TIME'
    | 'SUBSCRIPTION_UPGRADE'
    | 'MEMBERSHIP_ONE_TIME_UPGRADE'
    | 'CREDIT_PACK'
    | 'RENEWAL'
    | (string & {});
  orderStatus: 'CREATED' | 'CHECKOUT_CREATED' | 'PAID' | 'CANCELED' | 'FAILED' | (string & {});
  checkoutId: string;
  checkoutUrl: string | null;
  message: string;
}

export interface BillingOrderDetailResp {
  id: string | number;
  orderNo: string;
  orderType: string;
  status: string;
  itemCode: string;
  itemName: string | null;
  planCode: string | null;
  checkoutId: string | null;
  paymentProvider: string | null;
  paymentStatus: string | null;
  snapshotJson: Record<string, unknown> | null;
  paymentRawJson: Record<string, unknown> | null;
  paidTime: string | null;
  createTime: string | null;
}

function toQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
}

export async function getBillingMeSummary(): Promise<ApiResponse<BillingMeSummaryResp>> {
  return apiGet<BillingMeSummaryResp>('/billing/me/summary');
}

export async function getBillingJournals(params: {
  accountType?: BillingAccountType;
  direction?: BillingDirection;
  page?: number;
  size?: number;
}): Promise<ApiResponse<PaginatedResponse<BillingJournalResp>>> {
  return apiGet<PaginatedResponse<BillingJournalResp>>(`/billing/journals${toQuery(params)}`);
}

export async function createSubscriptionCheckout(req: BillingCheckoutReq): Promise<ApiResponse<BillingCheckoutResp>> {
  return apiPost<BillingCheckoutResp>('/billing/checkouts/subscription', req);
}

export async function createUpgradeCheckout(req: BillingCheckoutReq): Promise<ApiResponse<BillingCheckoutResp>> {
  return apiPost<BillingCheckoutResp>('/billing/checkouts/upgrade', req);
}

export async function createCreditPackCheckout(req: BillingCheckoutReq): Promise<ApiResponse<BillingCheckoutResp>> {
  return apiPost<BillingCheckoutResp>('/billing/checkouts/credit-pack', req);
}

export async function cancelAutoRenew(): Promise<ApiResponse<boolean>> {
  return apiPost<boolean>('/billing/subscription/cancel-auto-renew');
}

export async function getBillingOrderDetail(orderId: string | number): Promise<ApiResponse<BillingOrderDetailResp>> {
  return apiGet<BillingOrderDetailResp>(`/billing/orders/${encodeURIComponent(String(orderId))}`);
}

