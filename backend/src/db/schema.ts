import { pgTable, text, uuid, numeric, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. Profiles (matches public.profiles)
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().notNull(), // maps to auth.users.id
  fullName: text("full_name").notNull(),
  email: text("email").unique().notNull(),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  role: text("role").default("user").notNull(), // 'user', 'affiliate', 'admin'
  isActive: boolean("is_active").default(true).notNull(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 2. Products (matches public.products)
export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  category: text("category").notNull(), // 'strings', 'percussion', 'wind', 'accessories', 'bags', 'books'
  shortDescription: text("short_description"),
  description: text("description"),
  price: numeric("price").notNull().default("0.00"),
  currency: text("currency").default("USD").notNull(),
  stock: integer("stock").notNull().default(0),
  featured: boolean("featured").notNull().default(false),
  status: text("status").notNull().default("active"), // 'draft', 'active', 'inactive', 'out_of_stock', 'archived'
  badge: text("badge"),
  detailsLink: text("details_link"),
  details: jsonb("details").default({}),
  audioUrl: text("audio_url"),
  audioEnabled: boolean("audio_enabled").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 3. Product Images (matches public.product_images)
export const productImages = pgTable("product_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  storagePath: text("storage_path").notNull(),
  isCover: boolean("is_cover").default(false).notNull(),
  altText: text("alt_text"),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 4. Affiliates (matches public.affiliates)
export const affiliates = pgTable("affiliates", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => profiles.id, { onDelete: "cascade" }),
  referralCode: text("referral_code").unique().notNull(),
  salesCount: integer("sales_count").notNull().default(0),
  commissionRate: numeric("commission_rate").notNull().default("0.08"),
  totalEarnings: numeric("total_earnings").notNull().default("0.00"),
  pendingBalance: numeric("pending_balance").notNull().default("0.00"),
  withdrawnBalance: numeric("withdrawn_balance").notNull().default("0.00"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 5. Orders (matches public.orders)
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNumber: text("order_number").unique(),
  productId: uuid("product_id").references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
  customerId: uuid("customer_id").references(() => profiles.id, { onDelete: "set null" }),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  phone: text("phone"),
  country: text("country"),
  affiliateId: uuid("affiliate_id").references(() => affiliates.userId, { onDelete: "set null" }),
  referralCode: text("referral_code"),
  status: text("status").notNull().default("pending"),
  paymentStatus: text("payment_status").notNull().default("pending_payment"), // 'pending_payment', 'paid', 'failed'
  fulfillmentStatus: text("fulfillment_status").default("Pending"),
  notes: text("notes"),
  whatsappSentAt: timestamp("whatsapp_sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 6. Order Fulfillment History (matches public.order_fulfillment_history)
export const orderFulfillmentHistory = pgTable("order_fulfillment_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .references(() => orders.id, { onDelete: "cascade" })
    .notNull(),
  status: text("status").notNull(),
  stage: text("stage"),
  notes: text("notes"),
  trackingNumber: text("tracking_number"),
  carrier: text("carrier"),
  estimatedDelivery: timestamp("estimated_delivery", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 7. Commissions (matches public.commissions)
export const commissions = pgTable("commissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .references(() => orders.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  affiliateId: uuid("affiliate_id")
    .references(() => affiliates.userId, { onDelete: "cascade" })
    .notNull(),
  amount: numeric("amount").notNull(),
  rate: numeric("rate").notNull().default("0.08"),
  status: text("status").notNull().default("approved"), // 'pending', 'approved', 'rejected'
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 8. Affiliate Applications (matches public.affiliate_applications)
export const affiliateApplications = pgTable("affiliate_applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => profiles.id, { onDelete: "cascade" }),
  fullName: text("full_name"),
  email: text("email"),
  phone: text("phone"),
  motivation: text("motivation"),
  socialLink: text("social_link"),
  paymentMethod: text("payment_method"),
  accountDetails: text("account_details"),
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected'
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 9. Affiliate Clicks (matches public.affiliate_clicks)
export const affiliateClicks = pgTable("affiliate_clicks", {
  id: uuid("id").primaryKey().defaultRandom(),
  referralCode: text("referral_code").notNull(),
  affiliateId: uuid("affiliate_id"),
  userAgent: text("user_agent"),
  ip: text("ip"),
  landingPage: text("landing_page"),
  converted: boolean("converted").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 10. Affiliate Withdrawals (matches public.affiliate_withdrawals)
export const affiliateWithdrawals = pgTable("affiliate_withdrawals", {
  id: uuid("id").primaryKey().defaultRandom(),
  affiliateId: uuid("affiliate_id").notNull(),
  amount: numeric("amount").notNull(),
  currency: text("currency").default("ETB").notNull(),
  method: text("method").notNull(), // 'telebirr', 'cbe', 'paypal', 'bank_transfer'
  payoutDetails: text("payout_details").notNull(),
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected'
  rejectionReason: text("rejection_reason"),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 11. Notifications (matches public.notifications)
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => profiles.id, { onDelete: "cascade" }),
  role: text("role"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").default("info").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  link: text("link"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const productsRelations = relations(products, ({ many }) => ({
  images: many(productImages),
  orders: many(orders),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  product: one(products, {
    fields: [orders.productId],
    references: [products.id],
  }),
  customer: one(profiles, {
    fields: [orders.customerId],
    references: [profiles.id],
  }),
  affiliate: one(affiliates, {
    fields: [orders.affiliateId],
    references: [affiliates.userId],
  }),
  fulfillmentHistory: many(orderFulfillmentHistory),
  commission: one(commissions, {
    fields: [orders.id],
    references: [commissions.orderId],
  }),
}));

export const affiliatesRelations = relations(affiliates, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [affiliates.userId],
    references: [profiles.id],
  }),
  orders: many(orders),
  commissions: many(commissions),
}));
