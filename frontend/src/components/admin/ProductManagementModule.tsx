"use client";

import React, { useState, useEffect, useRef } from "react";
import { Product, ProductImage } from "../../lib/types";
import {
  fetchAdminProducts,
  checkSlugAvailability,
  adminCreateProduct,
  adminUpdateProduct,
  adminDeleteProduct,
  adminRestoreProduct,
  adminDuplicateProduct,
  adminBulkProductAction,
} from "../../lib/api";
import { useCurrency } from "../../context/CurrencyContext";
import { supabase } from "../../lib/supabase";
import {
  Search,
  Filter,
  Plus,
  RefreshCw,
  Edit3,
  Trash2,
  Copy,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  X,
  Volume2,
  Play,
  Pause,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  ArrowUpDown,
  Image as ImageIcon,
  Check,
  Music,
  Info,
  ShieldAlert,
} from "lucide-react";

const CATEGORIES = [
  { id: "all", label: "All Categories" },
  { id: "strings", label: "ገመድ (Strings - Begena, Kirar, Masinko)" },
  { id: "percussion", label: "ምት (Percussion - Kebero)" },
  { id: "wind", label: "እስትንፋስ (Wind - Washint)" },
  { id: "accessories", label: "መለዋወጫዎች (Accessories - Awtar)" },
  { id: "bags", label: "ቦርሳዎች (Traditional Bags)" },
  { id: "books", label: "መጻሕፍት (Instruction Books)" },
];

export default function ProductManagementModule() {
  const { formatPrice, currency } = useCurrency();

  // State: Product Query & Data
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("sort_order");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Selection for Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState<boolean>(false);

  // Modals & Drawers
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<Product | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Audio audition inside modal
  const [modalAudioPlaying, setModalAudioPlaying] = useState<boolean>(false);
  const modalAudioRef = useRef<HTMLAudioElement | null>(null);

  // Editor Form State
  const [formName, setFormName] = useState<string>("");
  const [formSlug, setFormSlug] = useState<string>("");
  const [slugChecking, setSlugChecking] = useState<boolean>(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [formCategory, setFormCategory] = useState<string>("strings");
  const [formPrice, setFormPrice] = useState<string>("100");
  const [formCurrency, setFormCurrency] = useState<string>("USD");
  const [formStock, setFormStock] = useState<string>("10");
  const [formShortDesc, setFormShortDesc] = useState<string>("");
  const [formDesc, setFormDesc] = useState<string>("");
  const [formStatus, setFormStatus] = useState<string>("active");
  const [formFeatured, setFormFeatured] = useState<boolean>(false);
  const [formBadge, setFormBadge] = useState<string>("");
  const [formSortOrder, setFormSortOrder] = useState<string>("0");
  const [formAudioUrl, setFormAudioUrl] = useState<string>("");
  const [formAudioEnabled, setFormAudioEnabled] = useState<boolean>(true);
  const [formMetaTitle, setFormMetaTitle] = useState<string>("");
  const [formMetaDesc, setFormMetaDesc] = useState<string>("");
  const [formImages, setFormImages] = useState<{ storagePath: string; isCover: boolean; altText: string }[]>([]);
  const [newImageUrl, setNewImageUrl] = useState<string>("");
  const [formSaving, setFormSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load products
  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await fetchAdminProducts({
        search: searchQuery.trim(),
        category: categoryFilter,
        status: statusFilter,
        stock_status: stockFilter,
        sort_by: sortBy,
        sort_direction: sortDirection,
        page,
        limit: pageSize,
      });

      if (res.success) {
        setProducts(res.data);
        setTotalCount(res.total);
        setTotalPages(res.totalPages || 1);
      } else {
        showToast(res.error || "Failed to load products", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Network error loading products", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [page, categoryFilter, statusFilter, stockFilter, sortBy, sortDirection]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadProducts();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Selection toggle
  const toggleSelectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map((p) => p.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk actions
  const handleBulkAction = async (action: "publish" | "unpublish" | "archive" | "delete" | "restore") => {
    if (selectedIds.length === 0) return;
    setBulkActionLoading(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await adminBulkProductAction(action, selectedIds, {}, session?.access_token);
      if (res.success) {
        showToast(res.message || "Bulk operation completed");
        setSelectedIds([]);
        loadProducts();
      } else {
        showToast(res.error || "Failed to execute bulk action", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Bulk action error", "error");
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Duplicate single product
  const handleDuplicate = async (p: Product) => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await adminDuplicateProduct(p.id, session?.access_token);
      if (res.success) {
        showToast(`Duplicated '${p.name}' successfully!`);
        loadProducts();
      } else {
        showToast(res.error || "Failed to duplicate product", "error");
      }
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Soft delete confirmation
  const handleSoftDelete = async () => {
    if (!deleteConfirmProduct) return;
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await adminDeleteProduct(deleteConfirmProduct.id, session?.access_token);
      if (res.success) {
        showToast(`'${deleteConfirmProduct.name}' archived.`);
        setDeleteConfirmProduct(null);
        loadProducts();
      } else {
        showToast(res.error || "Failed to archive product", "error");
      }
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Restore product
  const handleRestore = async (p: Product) => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await adminRestoreProduct(p.id, session?.access_token);
      if (res.success) {
        showToast(`'${p.name}' restored to draft status.`);
        loadProducts();
      } else {
        showToast(res.error || "Failed to restore product", "error");
      }
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Open Editor for Create
  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormName("");
    setFormSlug("");
    setSlugAvailable(null);
    setFormCategory("strings");
    setFormPrice("100");
    setFormCurrency("USD");
    setFormStock("10");
    setFormShortDesc("");
    setFormDesc("");
    setFormStatus("active");
    setFormFeatured(false);
    setFormBadge("");
    setFormSortOrder("0");
    setFormAudioUrl("/audio/begena.mp3");
    setFormAudioEnabled(true);
    setFormMetaTitle("");
    setFormMetaDesc("");
    setFormImages([
      {
        storagePath: "/image/photo_2025-10-01_07-26-53.jpg",
        isCover: true,
        altText: "Amiele Begena instrument",
      },
    ]);
    setNewImageUrl("");
    setFormError(null);
    setIsEditorOpen(true);
  };

  // Open Editor for Edit
  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name || "");
    setFormSlug(p.slug || "");
    setSlugAvailable(true);
    setFormCategory(p.category || "strings");
    setFormPrice(String(p.price || 0));
    setFormCurrency(p.currency || "USD");
    setFormStock(String(p.stock ?? 0));
    setFormShortDesc(p.shortDescription || "");
    setFormDesc(p.description || "");
    setFormStatus(p.status || "active");
    setFormFeatured(Boolean(p.featured));
    setFormBadge(p.badge || "");
    setFormSortOrder(String(p.sortOrder ?? 0));
    setFormAudioUrl(p.audioUrl || "");
    setFormAudioEnabled(Boolean(p.audioEnabled));
    setFormMetaTitle(p.metaTitle || "");
    setFormMetaDesc(p.metaDescription || "");
    setFormImages(
      p.images && p.images.length > 0
        ? p.images.map((img) => ({
            storagePath: img.storagePath,
            isCover: Boolean(img.isCover),
            altText: img.altText || p.name,
          }))
        : []
    );
    setNewImageUrl("");
    setFormError(null);
    setIsEditorOpen(true);
  };

  // Auto-generate slug from name
  const handleGenerateSlug = async () => {
    if (!formName) return;
    const generated = formName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setFormSlug(generated);
    checkSlug(generated);
  };

  const checkSlug = async (slugToTest: string) => {
    if (!slugToTest) return;
    setSlugChecking(true);
    const res = await checkSlugAvailability(slugToTest, editingProduct?.id);
    setSlugAvailable(res.available);
    setSlugChecking(false);
  };

  // Image helpers
  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    const isFirst = formImages.length === 0;
    setFormImages([
      ...formImages,
      {
        storagePath: newImageUrl.trim(),
        isCover: isFirst,
        altText: formName || "Product photo",
      },
    ]);
    setNewImageUrl("");
  };

  const handleSetCoverImage = (index: number) => {
    setFormImages(
      formImages.map((img, idx) => ({
        ...img,
        isCover: idx === index,
      }))
    );
  };

  const handleRemoveImage = (index: number) => {
    const updated = formImages.filter((_, idx) => idx !== index);
    if (updated.length > 0 && !updated.some((i) => i.isCover)) {
      updated[0].isCover = true;
    }
    setFormImages(updated);
  };

  // Save product (Create or Edit)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim() || formName.trim().length < 2) {
      setFormError("Product name must be at least 2 characters.");
      return;
    }
    if (!formSlug.trim()) {
      setFormError("Product slug is required.");
      return;
    }
    if (slugAvailable === false) {
      setFormError(`Slug '${formSlug}' is already in use. Please modify it.`);
      return;
    }

    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setFormError("Price must be a valid positive number.");
      return;
    }

    const stockNum = parseInt(formStock, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      setFormError("Stock inventory must be a valid non-negative integer.");
      return;
    }

    setFormSaving(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const payload: Partial<Product> = {
        name: formName.trim(),
        slug: formSlug.trim(),
        category: formCategory,
        price: priceNum,
        currency: formCurrency,
        stock: stockNum,
        shortDescription: formShortDesc.trim() || undefined,
        description: formDesc.trim() || undefined,
        status: formStatus,
        featured: formFeatured,
        badge: formBadge.trim() || undefined,
        sortOrder: parseInt(formSortOrder, 10) || 0,
        audioUrl: formAudioUrl.trim() || undefined,
        audioEnabled: formAudioEnabled,
        metaTitle: formMetaTitle.trim() || undefined,
        metaDescription: formMetaDesc.trim() || undefined,
        images: formImages.map((img, idx) => ({
          storagePath: img.storagePath,
          isCover: img.isCover,
          altText: img.altText || formName,
          sortOrder: idx,
        })),
      };

      if (editingProduct) {
        const res = await adminUpdateProduct(editingProduct.id, payload, session?.access_token);
        if (res.success) {
          showToast(`'${formName}' updated successfully.`);
          setIsEditorOpen(false);
          loadProducts();
        } else {
          setFormError(res.error || "Failed to update product");
        }
      } else {
        const res = await adminCreateProduct(payload, session?.access_token);
        if (res.success) {
          showToast(`'${formName}' created successfully.`);
          setIsEditorOpen(false);
          loadProducts();
        } else {
          setFormError(res.error || "Failed to create product");
        }
      }
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred while saving.");
    } finally {
      setFormSaving(false);
    }
  };

  // Calculate live health score in editor
  const calculateLiveHealth = () => {
    let score = 0;
    const missing: string[] = [];
    if (formName.trim().length >= 2) score += 15;
    else missing.push("Product Name (min 2 chars)");

    if (formImages.length > 0) score += 20;
    else missing.push("At least 1 cover photo");

    const p = parseFloat(formPrice);
    if (!isNaN(p) && p > 0) score += 15;
    else missing.push("Positive price (>0)");

    if (formCategory) score += 10;
    else missing.push("Category selection");

    if (formDesc.trim().length >= 30 || formShortDesc.trim().length >= 30) score += 15;
    else missing.push("Artisan description (min 30 chars)");

    const s = parseInt(formStock, 10);
    if (!isNaN(s) && s >= 0) score += 5;
    else missing.push("Inventory stock count");

    if (["strings", "percussion", "wind"].includes(formCategory)) {
      if (formAudioUrl && formAudioEnabled) score += 10;
      else missing.push("Acoustic audition preview audio");
    } else {
      score += 10;
    }

    if (formMetaTitle.trim() && formMetaDesc.trim()) score += 10;
    else missing.push("SEO title & description");

    return { score, missing };
  };

  const liveHealth = calculateLiveHealth();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-bold transition-all border ${
            toastMessage.type === "success"
              ? "bg-[#14231b] text-[#25D366] border-[#25D366]/40"
              : "bg-[#7f1d1d] text-white border-red-500/40"
          }`}
        >
          {toastMessage.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-[#E7E3D8] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E6F4EA] text-[#16A34A] text-[10px] font-extrabold uppercase tracking-wider border border-[#16A34A]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
              LIVE INVENTORY
            </span>
            <span className="text-xs text-[#737874] font-medium">
              {totalCount} Total Catalog Items
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#14231b] tracking-tight mt-1">
            Product Management Console
          </h1>
          <p className="text-xs text-[#5b615e] font-medium mt-0.5">
            Manage traditional Ethiopian instruments, audio auditions, stock levels, and artisan specifications.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={loadProducts}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#E7E3D8] bg-white hover:bg-[#FAF8F5] text-xs font-bold text-[#14231b] transition-all cursor-pointer shadow-sm active:scale-95"
            title="Refresh Catalog"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#d4af37]" : ""}`} />
            <span>Sync</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b8972e] text-[#14231b] text-xs font-extrabold tracking-wide uppercase transition-all shadow-md shadow-[#d4af37]/20 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Instrument</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-[#E7E3D8] shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Bar */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-[#737874] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by instrument name, slug, Amharic..."
              className="w-full pl-9 pr-8 py-2.5 bg-[#FAF8F5] border border-[#E7E3D8] rounded-xl text-xs text-[#14231b] placeholder-[#8e9490] focus:outline-none focus:border-[#d4af37] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="w-full py-2.5 px-3 bg-[#FAF8F5] border border-[#E7E3D8] rounded-xl text-xs font-semibold text-[#14231b] focus:outline-none focus:border-[#d4af37] cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full py-2.5 px-3 bg-[#FAF8F5] border border-[#E7E3D8] rounded-xl text-xs font-semibold text-[#14231b] focus:outline-none focus:border-[#d4af37] cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active (Storefront Visible)</option>
              <option value="draft">Draft (Hidden)</option>
              <option value="inactive">Inactive</option>
              <option value="out_of_stock">Out of Stock</option>
              <option value="archived">Archived / Trash</option>
            </select>
          </div>

          {/* Stock Filter */}
          <div>
            <select
              value={stockFilter}
              onChange={(e) => {
                setStockFilter(e.target.value);
                setPage(1);
              }}
              className="w-full py-2.5 px-3 bg-[#FAF8F5] border border-[#E7E3D8] rounded-xl text-xs font-semibold text-[#14231b] focus:outline-none focus:border-[#d4af37] cursor-pointer"
            >
              <option value="all">All Inventory</option>
              <option value="in_stock">In Stock (&gt; 5)</option>
              <option value="low_stock">Low Stock (1 - 5)</option>
              <option value="out_of_stock">Out of Stock (0)</option>
            </select>
          </div>
        </div>

        {/* Bulk Action Bar (when rows selected) */}
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#14231b] rounded-xl text-white animate-in fade-in duration-150">
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="w-5 h-5 rounded-full bg-[#d4af37] text-[#14231b] flex items-center justify-center text-[10px]">
                {selectedIds.length}
              </span>
              <span>Selected items</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkAction("publish")}
                disabled={bulkActionLoading}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Publish
              </button>
              <button
                onClick={() => handleBulkAction("unpublish")}
                disabled={bulkActionLoading}
                className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Unpublish
              </button>
              <button
                onClick={() => handleBulkAction("archive")}
                disabled={bulkActionLoading}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Archive
              </button>
              <button
                onClick={() => handleBulkAction("delete")}
                disabled={bulkActionLoading}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Delete
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="px-2 py-1 text-gray-400 hover:text-white text-xs"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-[#E7E3D8] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#E7E3D8] text-[#5b615e] font-extrabold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={products.length > 0 && selectedIds.length === products.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded text-[#d4af37] focus:ring-[#d4af37] cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-3">Thumbnail</th>
                <th className="py-3.5 px-4">Instrument &amp; Amharic</th>
                <th className="py-3.5 px-3">Category</th>
                <th className="py-3.5 px-3">Price</th>
                <th className="py-3.5 px-3">Stock</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-3">Health</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E3D8]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#737874]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-[#d4af37]" />
                      <span className="text-xs font-semibold">Loading Amiele Begena catalog...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#737874]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Layers className="w-8 h-8 text-[#d4af37]/60" />
                      <p className="text-sm font-bold text-[#14231b]">No instruments found</p>
                      <p className="text-xs text-[#737874]">Try adjusting your search keywords or filter criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const coverImg = product.images?.find((i) => i.isCover)?.storagePath || product.images?.[0]?.storagePath || "/image/photo_2025-10-01_07-26-53.jpg";
                  const isSelected = selectedIds.includes(product.id);
                  const isDeleted = Boolean(product.deletedAt);

                  return (
                    <tr
                      key={product.id}
                      className={`hover:bg-[#FAF8F5]/80 transition-colors ${
                        isSelected ? "bg-[#d4af37]/5" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(product.id)}
                          className="w-4 h-4 rounded text-[#d4af37] focus:ring-[#d4af37] cursor-pointer"
                        />
                      </td>

                      {/* Thumbnail & Badges */}
                      <td className="py-3.5 px-3">
                        <div className="relative w-12 h-12 rounded-xl bg-[#FAF8F5] border border-[#E7E3D8] overflow-hidden shrink-0 flex items-center justify-center shadow-sm">
                          <img
                            src={coverImg}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                          {product.audioUrl && (
                            <span
                              className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-[#14231b] text-[#25D366] flex items-center justify-center shadow"
                              title="Audio audition enabled"
                            >
                              <Volume2 className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Name & Slug */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-benaiah font-bold text-sm text-[#14231b]">
                              {product.name}
                            </span>
                            {product.featured && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-[#FAF2DC] text-[#9A7B1C] text-[9px] font-extrabold uppercase">
                                ★ Featured
                              </span>
                            )}
                            {product.badge && (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-[#14231b] text-white text-[9px] font-bold">
                                {product.badge}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#737874] font-mono block">
                            /{product.slug}
                          </span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#FAF8F5] border border-[#E7E3D8] text-[#14231b] text-[11px] font-bold capitalize">
                          {product.category}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-3.5 px-3 font-semibold text-[#14231b]">
                        <div>
                          {product.currency === "USD" ? (
                            <>
                              <span className="font-bold">${product.price}</span>
                              <span className="text-[10px] text-[#737874] block">
                                {formatPrice(product.price, "USD")}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="font-bold">{product.price} ETB</span>
                              <span className="text-[10px] text-[#737874] block">
                                {formatPrice(product.price, "ETB")}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Stock */}
                      <td className="py-3.5 px-3">
                        {product.stock > 5 ? (
                          <span className="inline-flex items-center gap-1 text-[#16A34A] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                            {product.stock} in stock
                          </span>
                        ) : product.stock > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[#D97706] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                            {product.stock} low
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[#DC2626] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                            Out of stock
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        {isDeleted ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-extrabold uppercase">
                            Archived
                          </span>
                        ) : product.status === "active" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                            Active
                          </span>
                        ) : product.status === "draft" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[10px] font-extrabold uppercase">
                            Draft
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase">
                            {product.status}
                          </span>
                        )}
                      </td>

                      {/* Health Score */}
                      <td className="py-3.5 px-3">
                        <div
                          className="group relative inline-flex items-center gap-1.5 cursor-help"
                          title="Click or hover to inspect product completeness"
                        >
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] shadow-sm ${
                              (product.healthScore || 0) >= 85
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : (product.healthScore || 0) >= 70
                                ? "bg-amber-100 text-amber-800 border border-amber-300"
                                : "bg-red-100 text-red-800 border border-red-300"
                            }`}
                          >
                            {product.healthScore ?? 0}
                          </div>

                          {/* Hover Tooltip with Missing Checklist */}
                          {product.missingFields && product.missingFields.length > 0 && (
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-30 w-52 p-3 bg-[#14231b] text-white rounded-xl shadow-2xl text-[10px] space-y-1.5 border border-white/10">
                              <p className="font-extrabold text-[#d4af37] uppercase tracking-wider">
                                Health Breakdown ({product.healthScore}/100):
                              </p>
                              <ul className="space-y-1 text-gray-300">
                                {product.missingFields.map((field, idx) => (
                                  <li key={idx} className="flex items-start gap-1">
                                    <span className="text-red-400">✕</span>
                                    <span>{field}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isDeleted ? (
                            <button
                              onClick={() => handleRestore(product)}
                              className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                              title="Restore to Draft"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleOpenEdit(product)}
                                className="p-1.5 rounded-lg text-[#14231b] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                                title="Edit Product"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDuplicate(product)}
                                className="p-1.5 rounded-lg text-[#737874] hover:bg-[#FAF8F5] hover:text-[#14231b] transition-colors cursor-pointer"
                                title="Duplicate"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmProduct(product)}
                                className="p-1.5 rounded-lg text-[#737874] hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                                title="Archive / Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between p-4 bg-[#FAF8F5] border-t border-[#E7E3D8] text-xs font-semibold text-[#5b615e]">
          <div>
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} instruments
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg border border-[#E7E3D8] bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-bold text-[#14231b]">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-lg border border-[#E7E3D8] bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          PRODUCT EDITOR DRAWER (CREATE & EDIT)
      ========================================================================= */}
      {isEditorOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsEditorOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
        >
          <div className="w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col justify-between overflow-hidden border border-[#E7E3D8] animate-in zoom-in-95 duration-200">
            {/* Modal Header with Health Score */}
            <div className="p-5 border-b border-[#E7E3D8] flex items-center justify-between bg-[#FAF8F5]">
              <div>
                <span className="text-[10px] font-extrabold text-[#d4af37] uppercase tracking-widest block">
                  {editingProduct ? "Edit Instrument" : "Create Masterpiece"}
                </span>
                <h3 className="font-benaiah font-extrabold text-xl text-[#14231b]">
                  {formName || "Untitled Product"}
                </h3>
              </div>

              {/* Health Score Pill */}
              <div className="flex items-center gap-3">
                <div
                  className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                    liveHealth.score >= 85
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : liveHealth.score >= 70
                      ? "bg-amber-50 text-amber-800 border-amber-300"
                      : "bg-red-50 text-red-800 border-red-300"
                  }`}
                  title="Live completeness score"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>Health: {liveHealth.score}%</span>
                </div>

                <button
                  onClick={() => setIsEditorOpen(false)}
                  className="w-8 h-8 rounded-full bg-white border border-[#E7E3D8] flex items-center justify-center text-gray-500 hover:text-black cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Drawer Body / Scrollable Form */}
            <form onSubmit={handleSaveProduct} id="productForm" className="flex-1 overflow-y-auto p-6 space-y-6">
              {formError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Missing Fields Checklist Hint */}
              {liveHealth.missing.length > 0 && (
                <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#d4af37]/30 text-xs space-y-1">
                  <span className="font-bold text-[#14231b] block text-[11px]">
                    To achieve 100% Health Score, add:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {liveHealth.missing.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-[#E7E3D8] text-[10px] text-[#5b615e]"
                      >
                        <Info className="w-2.5 h-2.5 text-[#d4af37]" />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 1: BASIC INFORMATION */}
              <div className="space-y-4">
                <h4 className="text-xs font-extrabold text-[#14231b] uppercase tracking-wider border-b border-[#E7E3D8] pb-1">
                  1. Basic Information
                </h4>

                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-[#14231b] mb-1">
                    Instrument Name (English &amp; Amharic) *
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. በገና (Begena) — Ten-String Box Lyre"
                    className="w-full px-3.5 py-2.5 border border-[#E7E3D8] rounded-xl text-xs text-[#14231b] focus:outline-none focus:border-[#d4af37]"
                    required
                  />
                </div>

                {/* Slug with live availability */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-[#14231b]">
                      Slug / URL Identifier *
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateSlug}
                      className="text-[11px] font-bold text-[#d4af37] hover:underline"
                    >
                      Generate from Name
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={formSlug}
                      onChange={(e) => {
                        setFormSlug(e.target.value);
                        checkSlug(e.target.value);
                      }}
                      placeholder="e.g. begena"
                      className="w-full px-3.5 py-2.5 border border-[#E7E3D8] rounded-xl text-xs text-[#14231b] focus:outline-none focus:border-[#d4af37] font-mono"
                      required
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs">
                      {slugChecking ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-gray-400" />
                      ) : slugAvailable === true ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : slugAvailable === false ? (
                        <X className="w-4 h-4 text-red-600" />
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Category & Badge */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#14231b] mb-1">
                      Category *
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-3 py-2.5 border border-[#E7E3D8] rounded-xl text-xs font-semibold text-[#14231b] focus:outline-none focus:border-[#d4af37]"
                    >
                      <option value="strings">Strings / በገናና ክራር</option>
                      <option value="percussion">Percussion / ከበሮ</option>
                      <option value="wind">Wind / ዋሽንት</option>
                      <option value="accessories">Accessories / መለዋወጫዎች</option>
                      <option value="bags">Bags / ቦርሳዎች</option>
                      <option value="books">Books / መጻሕፍት</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#14231b] mb-1">
                      Promotional Badge
                    </label>
                    <input
                      type="text"
                      value={formBadge}
                      onChange={(e) => setFormBadge(e.target.value)}
                      placeholder="e.g. Masterpiece, Best Seller"
                      className="w-full px-3.5 py-2.5 border border-[#E7E3D8] rounded-xl text-xs text-[#14231b] focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>

                {/* Featured Checkbox */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="featured"
                    checked={formFeatured}
                    onChange={(e) => setFormFeatured(e.target.checked)}
                    className="w-4 h-4 rounded text-[#d4af37] focus:ring-[#d4af37] cursor-pointer"
                  />
                  <label htmlFor="featured" className="text-xs font-bold text-[#14231b] cursor-pointer">
                    Feature on Homepage Hero &amp; Favorites Slider
                  </label>
                </div>
              </div>

              {/* SECTION 2: PRICING & INVENTORY */}
              <div className="space-y-4">
                <h4 className="text-xs font-extrabold text-[#14231b] uppercase tracking-wider border-b border-[#E7E3D8] pb-1">
                  2. Pricing &amp; Inventory
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#14231b] mb-1">
                      Base Price *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-[#E7E3D8] rounded-xl text-xs font-bold text-[#14231b] focus:outline-none focus:border-[#d4af37]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#14231b] mb-1">
                      Currency *
                    </label>
                    <select
                      value={formCurrency}
                      onChange={(e) => setFormCurrency(e.target.value)}
                      className="w-full px-3 py-2.5 border border-[#E7E3D8] rounded-xl text-xs font-bold text-[#14231b] focus:outline-none focus:border-[#d4af37]"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="ETB">ETB (Ethiopian Birr)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#14231b] mb-1">
                      Stock Count *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formStock}
                      onChange={(e) => setFormStock(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-[#E7E3D8] rounded-xl text-xs font-bold text-[#14231b] focus:outline-none focus:border-[#d4af37]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#14231b] mb-1">
                      Status *
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                      className="w-full px-3 py-2.5 border border-[#E7E3D8] rounded-xl text-xs font-bold text-[#14231b] focus:outline-none focus:border-[#d4af37]"
                    >
                      <option value="active">Active (Visible)</option>
                      <option value="draft">Draft (Admin Only)</option>
                      <option value="out_of_stock">Out of Stock</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#14231b] mb-1">
                      Catalog Sort Order
                    </label>
                    <input
                      type="number"
                      value={formSortOrder}
                      onChange={(e) => setFormSortOrder(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-[#E7E3D8] rounded-xl text-xs font-semibold text-[#14231b] focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: STORYTELLING & SPECIFICATIONS */}
              <div className="space-y-4">
                <h4 className="text-xs font-extrabold text-[#14231b] uppercase tracking-wider border-b border-[#E7E3D8] pb-1">
                  3. Descriptions &amp; Cultural Story
                </h4>

                <div>
                  <label className="block text-xs font-bold text-[#14231b] mb-1">
                    Short Description (Product Card Summary)
                  </label>
                  <input
                    type="text"
                    value={formShortDesc}
                    onChange={(e) => setFormShortDesc(e.target.value)}
                    placeholder="e.g. Sacred Ten-String Lyre crafted from highland Wanza wood."
                    className="w-full px-3.5 py-2.5 border border-[#E7E3D8] rounded-xl text-xs text-[#14231b] focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#14231b] mb-1">
                    Full Description, Materials &amp; Artisan Notes
                  </label>
                  <textarea
                    rows={4}
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Describe the artisan crafting process, wood seasoning, parchment tuning, modal scales..."
                    className="w-full p-3.5 border border-[#E7E3D8] rounded-xl text-xs text-[#14231b] focus:outline-none focus:border-[#d4af37]"
                  />
                </div>
              </div>

              {/* SECTION 4: MEDIA & AUDIO AUDITION */}
              <div className="space-y-4">
                <h4 className="text-xs font-extrabold text-[#14231b] uppercase tracking-wider border-b border-[#E7E3D8] pb-1 flex items-center justify-between">
                  <span>4. Photography &amp; Audio Audition</span>
                  <span className="text-[10px] text-[#d4af37] lowercase">
                    {formImages.length} images added
                  </span>
                </h4>

                {/* Add Image URL */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="Enter image storage path (e.g. /image/photo_2025-10-01_07-26-53.jpg)"
                    className="flex-1 px-3.5 py-2 border border-[#E7E3D8] rounded-xl text-xs text-[#14231b] focus:outline-none focus:border-[#d4af37]"
                  />
                  <button
                    type="button"
                    onClick={handleAddImage}
                    className="px-4 py-2 rounded-xl bg-[#14231b] text-white text-xs font-bold hover:bg-black transition-colors"
                  >
                    Add Photo
                  </button>
                </div>

                {/* Gallery List */}
                {formImages.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    {formImages.map((img, idx) => (
                      <div
                        key={idx}
                        className={`relative aspect-square rounded-xl bg-[#FAF8F5] border-2 overflow-hidden flex items-center justify-center group ${
                          img.isCover ? "border-[#d4af37]" : "border-[#E7E3D8]"
                        }`}
                      >
                        <img src={img.storagePath} alt={img.altText} className="w-full h-full object-cover" />

                        {img.isCover && (
                          <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-[#d4af37] text-[#14231b] text-[9px] font-black uppercase shadow">
                            Cover
                          </span>
                        )}

                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white">
                          {!img.isCover && (
                            <button
                              type="button"
                              onClick={() => handleSetCoverImage(idx)}
                              className="px-2 py-0.5 rounded bg-[#d4af37] text-[#14231b] text-[10px] font-bold"
                            >
                              Set Cover
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Audio Audition Section */}
                <div className="p-4 bg-[#FAF8F5] rounded-xl border border-[#E7E3D8] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Music className="w-4 h-4 text-[#d4af37]" />
                      <span className="text-xs font-bold text-[#14231b]">
                        Interactive Sound Audition Sample
                      </span>
                    </div>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formAudioEnabled}
                        onChange={(e) => setFormAudioEnabled(e.target.checked)}
                        className="w-4 h-4 rounded text-[#d4af37] focus:ring-[#d4af37]"
                      />
                      <span className="text-[11px] font-bold text-[#14231b]">Enable</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formAudioUrl}
                      onChange={(e) => setFormAudioUrl(e.target.value)}
                      placeholder="/audio/begena.mp3"
                      className="flex-1 px-3 py-2 border border-[#E7E3D8] rounded-xl text-xs text-[#14231b] font-mono focus:outline-none focus:border-[#d4af37]"
                    />

                    {formAudioUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!modalAudioRef.current) return;
                          if (modalAudioPlaying) {
                            modalAudioRef.current.pause();
                            setModalAudioPlaying(false);
                          } else {
                            modalAudioRef.current.play().then(() => setModalAudioPlaying(true));
                          }
                        }}
                        className="px-3 py-2 rounded-xl bg-[#14231b] text-[#25D366] text-xs font-bold flex items-center gap-1 hover:bg-black"
                      >
                        {modalAudioPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        <span>{modalAudioPlaying ? "Stop" : "Test"}</span>
                      </button>
                    )}
                  </div>

                  {formAudioUrl && (
                    <audio
                      ref={modalAudioRef}
                      src={formAudioUrl}
                      onEnded={() => setModalAudioPlaying(false)}
                      className="hidden"
                    />
                  )}
                </div>
              </div>

              {/* SECTION 5: SEO METADATA */}
              <div className="space-y-4">
                <h4 className="text-xs font-extrabold text-[#14231b] uppercase tracking-wider border-b border-[#E7E3D8] pb-1">
                  5. SEO &amp; Search Engine Optimization
                </h4>

                <div>
                  <label className="block text-xs font-bold text-[#14231b] mb-1">
                    Meta Title
                  </label>
                  <input
                    type="text"
                    value={formMetaTitle}
                    onChange={(e) => setFormMetaTitle(e.target.value)}
                    placeholder="Amiele Begena — Handcrafted Ethiopian Begena Harp"
                    className="w-full px-3.5 py-2.5 border border-[#E7E3D8] rounded-xl text-xs text-[#14231b] focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#14231b] mb-1">
                    Meta Description
                  </label>
                  <textarea
                    rows={2}
                    value={formMetaDesc}
                    onChange={(e) => setFormMetaDesc(e.target.value)}
                    placeholder="Discover authentic handcrafted sacred Ethiopian Begena harps..."
                    className="w-full p-3.5 border border-[#E7E3D8] rounded-xl text-xs text-[#14231b] focus:outline-none focus:border-[#d4af37]"
                  />
                </div>
              </div>
            </form>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-[#E7E3D8] bg-[#FAF8F5] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-[#E7E3D8] bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                form="productForm"
                disabled={formSaving}
                className="px-6 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b8972e] text-[#14231b] text-xs font-extrabold uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-2"
              >
                {formSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{editingProduct ? "Save Changes" : "Create Instrument"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DELETE / ARCHIVE CONFIRMATION MODAL
      ========================================================================= */}
      {deleteConfirmProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-[#E7E3D8]">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-benaiah font-bold text-lg text-[#14231b]">
                Archive Instrument?
              </h3>
              <p className="text-xs text-[#737874]">
                Are you sure you want to archive <strong>{deleteConfirmProduct.name}</strong>? It will be hidden from the storefront catalog immediately, but can be restored from the Archived filter at any time.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmProduct(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#E7E3D8] text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSoftDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-red-600/20"
              >
                Confirm Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
