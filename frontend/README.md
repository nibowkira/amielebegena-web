# Amiele Begena — Next.js 15 & Tailwind CSS v4 Frontend

This is the standalone modern frontend application for **Amiele Begena (ዓሚኤል በገና)**, built with Next.js App Router, Tailwind CSS v4, TypeScript, and rich Ethiopian cultural aesthetics.

## 🛠️ Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS v4
- **Language:** TypeScript
- **State & Providers:** React Context (`CurrencyContext`, `CartContext`, `AuthContext`)
- **Backend API Integration:** Direct REST client to Express backend (`/api/*`)
- **Auth & Realtime:** Supabase JS Client v2

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Verify `NEXT_PUBLIC_API_URL` points to your backend (defaults to `http://localhost:5000/api` for local development).

### 3. Run Locally (Development)
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
npm start
```

---

## 📁 Key Features & Routes
- `/`: Hero with sacred Begena showcase, interactive audio audition player, featured products, craftsmanship pillars.
- `/products`: Complete instrument catalog with category filters, live search, sorting, and currency conversion.
- `/track-order`: Real-time order fulfillment timeline tracker.
- `/affiliate`: 8% partner ambassador program landing page.
- `/affiliate/apply`: Ambassador intake application form.
- `/affiliate/dashboard`: Partner metrics, referral link generator, click telemetry, commission ledger, and withdrawal requests.
- `/admin`: Executive console with store revenue analytics, Product Management Subsystem (PMS), and order payment validation.
- `/blog` & `/blog/[slug]`: Sacred organology, tuning modes, and heritage articles.
- `/about`, `/sustainability`, `/shipping`, `/contact`: Artisan heritage, ecological ethics, Addis Ababa export policies, and workshop contact.

---

## 🚢 Deployment
Deploy this folder independently to **Vercel**, **Netlify**, or **AWS Amplify**.
- Set Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `.next`
- Environment Variables:
  - `NEXT_PUBLIC_API_URL` = Your deployed backend API URL (e.g. `https://api.yourdomain.com/api` or `https://amiele-backend.onrender.com/api`)
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_WHATSAPP_NUMBER`
