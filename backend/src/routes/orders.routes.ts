import { Router } from "express";
import {
  createGuestOrder,
  trackOrder,
  getOrders,
  getOrderById,
  updateFulfillment,
  approvePayment,
} from "../controllers/orders.controller.js";
import { requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

// Public routes for guest ordering and tracking
router.post("/guest", createGuestOrder);
router.post("/track", trackOrder);

// Protected Admin routes: Orders management, fulfillment updates, and payment approval
router.get("/", requireAdmin, getOrders);
router.get("/:id", requireAdmin, getOrderById);
router.patch("/:id/fulfillment", requireAdmin, updateFulfillment);
router.post("/:id/approve-payment", requireAdmin, approvePayment);

export default router;
