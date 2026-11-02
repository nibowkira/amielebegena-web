export interface ProductImage {
  id?: string;
  productId?: string;
  storagePath: string;
  isCover: boolean;
  altText?: string;
  sortOrder?: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: "strings" | "percussion" | "wind" | "accessories" | "bags" | "books" | string;
  shortDescription?: string;
  description?: string;
  price: number | string;
  currency: string;
  stock: number;
  featured: boolean;
  status: "active" | "inactive" | "out_of_stock" | "draft" | "archived" | string;
  badge?: string;
  detailsLink?: string;
  audioUrl?: string;
  audioEnabled?: boolean;
  sortOrder?: number;
  metaTitle?: string;
  metaDescription?: string;
  deletedAt?: string | null;
  images?: ProductImage[];
  healthScore?: number;
  healthGrade?: "excellent" | "good" | "needs_attention" | "poor";
  missingFields?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  currency: string;
  image: string;
  quantity: number;
  category?: string;
}

export interface OrderTimeline {
  id: string;
  orderId: string;
  status: string;
  stage?: string;
  notes?: string;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail?: string;
  phone: string;
  country: string;
  productId?: string;
  quantity: number;
  referralCode?: string;
  paymentStatus: "pending_payment" | "paid" | "failed" | string;
  fulfillmentStatus?: string;
  status: string;
  notes?: string;
  createdAt: string;
  product?: Product;
  timeline?: OrderTimeline[];
}

export interface AffiliateMetrics {
  userId: string;
  referralCode: string;
  salesCount: number;
  commissionRate: number;
  clicks: number;
  conversions: number;
  totalEarnings: number;
  withdrawnBalance: number;
  pendingWithdrawals: number;
  availableBalance: number;
  profile?: {
    full_name: string;
    email: string;
  };
}

export interface BlogPost {
  slug: string;
  title: string;
  subtitle: string;
  date: string;
  readTime: string;
  category: string;
  coverImage: string;
  excerpt: string;
  content: string;
  author: {
    name: string;
    role: string;
    avatar: string;
  };
}
