# Amiele Begena — Express.js & Drizzle ORM Backend

This is the standalone backend service for **Amiele Begena (ዓሚኤል በገና)**, providing REST APIs for products, WhatsApp guest checkouts, order tracking, real-time affiliate ledger & commission attribution, and executive administrative analytics.

## 🛠️ Tech Stack
- **Framework:** Express.js (TypeScript)
- **ORM:** Drizzle ORM
- **Database:** PostgreSQL (Supabase)
- **Runtime:** Node.js (v20+) with `tsx` / `typescript`

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and optional `DATABASE_URL` (direct PostgreSQL connection string) are set in `.env`.

### 3. Run Locally (Development)
```bash
npm run dev
```
The server will start at: `http://localhost:5000`
Health check: `http://localhost:5000/api/health`

### 4. Build for Production
```bash
npm run build
npm start
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health and service status |
| `GET` | `/api/products` | Retrieve catalog (supports `?category=`, `?featured=`) |
| `GET` | `/api/products/:slugOrId` | Product details with high-res media |
| `POST` | `/api/products` | Add new instrument (PMS) |
| `PUT` | `/api/products/:id` | Update product details/stock/audio (PMS) |
| `DELETE` | `/api/products/:id` | Archive product |
| `POST` | `/api/orders/guest` | Register checkout & generate tracking number (`AM-YYYY-XXXXXX`) |
| `POST` | `/api/orders/track` | Track order fulfillment timeline |
| `GET` | `/api/orders` | List customer or store orders |
| `PATCH` | `/api/orders/:id/fulfillment` | Advance fulfillment stage checkpoint |
| `POST` | `/api/orders/:id/approve-payment` | Validate payment and allocate 8% affiliate commission |
| `POST` | `/api/affiliates/click` | Log affiliate referral click telemetry |
| `GET` | `/api/affiliates/stats/:refOrId` | Affiliate metrics, sales, commissions & ledger |
| `POST` | `/api/affiliates/apply` | Submit partner program application |
| `POST` | `/api/affiliates/withdraw` | Submit payout disbursement request |
| `GET` | `/api/admin/analytics` | Executive revenue and order distributions |
| `GET` | `/api/rates` | Real-time cached currency rates (USD, ETB, EUR) |

---

## 🚢 Deployment
Deploy this folder independently to **Render**, **Railway**, **Fly.io**, **Heroku**, or any Linux VPS.
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Port environment variable: `PORT`
