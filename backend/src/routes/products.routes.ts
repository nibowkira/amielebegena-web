import { Router } from "express";
import {
  getProducts,
  getProductBySlugOrId,
  checkSlugAvailability,
  createProduct,
  updateProduct,
  deleteProduct,
  restoreProduct,
  duplicateProduct,
  bulkAction,
} from "../controllers/products.controller.js";
import { requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

// Public / Read routes
router.get("/", getProducts);
router.get("/check-slug", checkSlugAvailability);
router.get("/:identifier", getProductBySlugOrId);

// Protected Admin Mutation routes
router.post("/", requireAdmin, createProduct);
router.post("/bulk", requireAdmin, bulkAction);
router.post("/:id/restore", requireAdmin, restoreProduct);
router.post("/:id/duplicate", requireAdmin, duplicateProduct);
router.put("/:id", requireAdmin, updateProduct);
router.delete("/:id", requireAdmin, deleteProduct);

export default router;
