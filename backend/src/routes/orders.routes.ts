import { Router } from "express";
import {
  createGuestOrder,
  trackOrder,
  getOrders,
  getOrderById,
  updateFulfillment,
  approvePayment,
} from "../controllers/orders.controller.js";

const router = Router();

router.post("/guest", createGuestOrder);
router.post("/track", trackOrder);
router.get("/", getOrders);
router.get("/:id", getOrderById);
router.patch("/:id/fulfillment", updateFulfillment);
router.post("/:id/approve-payment", approvePayment);

export default router;
