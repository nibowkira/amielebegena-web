import { Product, Order } from "./types";
import { supabase } from "./supabase";

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "https://amielebegena-web.onrender.com/api";
const API_BASE_URL = rawApiUrl.replace(/\/+$/, "");

async function getAuthHeader(tokenOverride?: string): Promise<Record<string, string>> {
  if (tokenOverride) {
    return { Authorization: `Bearer ${tokenOverride}` };
  }
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
  } catch (err) {
    console.warn("Could not retrieve active session for auth header:", err);
  }
  return {};
}

export async function fetchProducts(category?: string): Promise<Product[]> {
  try {
    const url = new URL(`${API_BASE_URL}/products`);
    if (category && category !== "all") {
      url.searchParams.append("category", category);
    }
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch products");
    const json = await res.json();
    return json.data || [];
  } catch (error) {
    console.warn("API fetch error, falling back:", error);
    return [];
  }
}

export async function fetchProductByIdOrSlug(idOrSlug: string): Promise<Product | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/products/${idOrSlug}`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch (error) {
    console.warn("API fetch error:", error);
    return null;
  }
}

export async function createGuestOrder(payload: {
  customer_name: string;
  phone: string;
  customer_email?: string;
  country?: string;
  product_id?: string;
  product_name?: string;
  quantity?: number;
  referral_code?: string | null;
  notes?: string;
}): Promise<{ success: boolean; order_number?: string; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/orders/guest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    return json;
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to submit order" };
  }
}

export async function trackOrder(payload: {
  order_number: string;
  contact_info: string;
}): Promise<{ success: boolean; order?: any; timeline?: any[]; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/orders/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    return json;
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to track order" };
  }
}

export async function recordAffiliateClick(referral_code: string, landing_page?: string) {
  try {
    await fetch(`${API_BASE_URL}/affiliates/click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referral_code, landing_page: landing_page || window.location.pathname }),
    });
  } catch (error) {
    console.warn("Failed to record click:", error);
  }
}

export async function fetchAffiliateStats(identifier: string, tokenOverride?: string) {
  try {
    const authHeaders = await getAuthHeader(tokenOverride);
    const res = await fetch(`${API_BASE_URL}/affiliates/stats/${identifier}`, {
      cache: "no-store",
      headers: {
        ...authHeaders,
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json;
  } catch (error) {
    console.warn("Failed to load affiliate stats:", error);
    return null;
  }
}

export async function submitAffiliateApplication(
  payload: {
    user_id?: string;
    full_name: string;
    email: string;
    phone?: string;
    motivation?: string;
    social_link?: string;
    payment_method?: string;
    account_details?: string;
  },
  tokenOverride?: string
) {
  try {
    const authHeaders = await getAuthHeader(tokenOverride);
    const res = await fetch(`${API_BASE_URL}/affiliates/apply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to submit application" };
  }
}

export async function submitAffiliateWithdrawal(
  payload: {
    affiliate_id: string;
    amount: number;
    method: string;
    payout_details: string;
  },
  tokenOverride?: string
) {
  try {
    const authHeaders = await getAuthHeader(tokenOverride);
    const res = await fetch(`${API_BASE_URL}/affiliates/withdraw`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to submit withdrawal" };
  }
}

export async function fetchExchangeRates() {
  try {
    const res = await fetch(`${API_BASE_URL}/rates`);
    if (!res.ok) throw new Error("Rates unavailable");
    const json = await res.json();
    return json.rates || { USD: 1.0, ETB: 105.8871, EUR: 0.92 };
  } catch (error) {
    return { USD: 1.0, ETB: 105.8871, EUR: 0.92 };
  }
}

// ==========================================
// ADMIN PRODUCT MANAGEMENT API FUNCTIONS
// ==========================================

export interface AdminProductQueryParams {
  search?: string;
  category?: string;
  status?: string;
  stock_status?: string;
  featured?: boolean;
  include_deleted?: boolean;
  sort_by?: string;
  sort_direction?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface AdminProductsResponse {
  success: boolean;
  data: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  error?: string;
}

export async function fetchAdminProducts(
  params: AdminProductQueryParams = {}
): Promise<AdminProductsResponse> {
  try {
    const url = new URL(`${API_BASE_URL}/products`);
    if (params.search) url.searchParams.append("search", params.search);
    if (params.category && params.category !== "all") url.searchParams.append("category", params.category);
    if (params.status && params.status !== "all") url.searchParams.append("status", params.status);
    if (params.stock_status && params.stock_status !== "all") url.searchParams.append("stock_status", params.stock_status);
    if (params.featured !== undefined) url.searchParams.append("featured", String(params.featured));
    if (params.include_deleted) url.searchParams.append("include_deleted", "true");
    if (params.sort_by) url.searchParams.append("sort_by", params.sort_by);
    if (params.sort_direction) url.searchParams.append("sort_direction", params.sort_direction);
    if (params.page) url.searchParams.append("page", String(params.page));
    if (params.limit) url.searchParams.append("limit", String(params.limit));

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) throw new Error(`Server returned status ${res.status}`);
    return await res.json();
  } catch (error: any) {
    console.error("fetchAdminProducts error:", error);
    return {
      success: false,
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
      error: error.message || "Failed to load admin products",
    };
  }
}

export async function checkSlugAvailability(
  slug: string,
  excludeId?: string
): Promise<{ success: boolean; slug: string; available: boolean }> {
  try {
    const url = new URL(`${API_BASE_URL}/products/check-slug`);
    url.searchParams.append("slug", slug);
    if (excludeId) url.searchParams.append("excludeId", excludeId);

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return { success: false, slug, available: false };
    return await res.json();
  } catch (error) {
    return { success: false, slug, available: false };
  }
}

export async function adminCreateProduct(
  payload: Partial<Product>,
  token?: string
): Promise<{ success: boolean; data?: Product; message?: string; error?: string }> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}/products`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: error.message || "Network error creating product" };
  }
}

export async function adminUpdateProduct(
  id: string,
  payload: Partial<Product>,
  token?: string
): Promise<{ success: boolean; data?: Product; message?: string; error?: string }> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: error.message || "Network error updating product" };
  }
}

export async function adminDeleteProduct(
  id: string,
  token?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: "DELETE",
      headers,
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: error.message || "Network error deleting product" };
  }
}

export async function adminRestoreProduct(
  id: string,
  token?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}/products/${id}/restore`, {
      method: "POST",
      headers,
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: error.message || "Network error restoring product" };
  }
}

export async function adminDuplicateProduct(
  id: string,
  token?: string
): Promise<{ success: boolean; data?: Product; message?: string; error?: string }> {
  try {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}/products/${id}/duplicate`, {
      method: "POST",
      headers,
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: error.message || "Network error duplicating product" };
  }
}

export async function adminBulkProductAction(
  action: "publish" | "unpublish" | "archive" | "restore" | "delete" | "change_category" | "update_badge",
  productIds: string[],
  payload?: any,
  token?: string
): Promise<{ success: boolean; message?: string; count?: number; error?: string }> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}/products/bulk`, {
      method: "POST",
      headers,
      body: JSON.stringify({ action, productIds, payload }),
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: error.message || "Network error executing bulk action" };
  }
}

