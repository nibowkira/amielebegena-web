import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";

import productsRouter from "./routes/products.routes.js";
import ordersRouter from "./routes/orders.routes.js";
import affiliatesRouter from "./routes/affiliates.routes.js";
import adminRouter from "./routes/admin.routes.js";
import ratesRouter from "./routes/rates.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = [
  process.env.CORS_ORIGIN || "http://localhost:3000",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://amielebegena.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev to ensure smooth local testing
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health Check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "Amiele Begena Express API",
    timestamp: new Date().toISOString(),
    database: process.env.DATABASE_URL ? "Drizzle / PostgreSQL" : "Supabase Adapter",
  });
});

// API Routes
app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/affiliates", affiliatesRouter);
app.use("/api/admin", adminRouter);
app.use("/api/rates", ratesRouter);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled API Error:", err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal server error occurred",
  });
});

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.url}` });
});

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 Amiele Begena Backend Server running on port ${PORT}`);
  console.log(`🌐 Base URL: http://localhost:${PORT}/api`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`===============================================`);
});

export default app;
