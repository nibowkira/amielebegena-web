!function () {
  "use strict";

  function client() {
    return window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
  }

  function esc(v) {
    return window.AmieleSanitize ? window.AmieleSanitize.escapeHtml(v) : (v == null ? "" : String(v));
  }

  // Public URL for a storage path (used by the controller to preview uploads)
  function uploadedUrl(bucket, path) {
    if (!path) return "";
    if (path.indexOf("http") === 0) return path;
    if (bucket === "product-images" && path.indexOf("/") === -1) {
      return client().storage.from(bucket).getPublicUrl(path).data.publicUrl;
    }
    if (bucket === "product-audio" && path.indexOf("/") === -1) {
      return client().storage.from(bucket).getPublicUrl(path).data.publicUrl;
    }
    return path;
  }

  function publicUrl(bucket, path) {
    if (!path) return "";
    if (path.indexOf("http") === 0) return path;
    if (bucket === "product-images" && path.indexOf("/") === -1) {
      return client().storage.from(bucket).getPublicUrl(path).data.publicUrl;
    }
    if (bucket === "product-audio") {
      return client().storage.from(bucket).getPublicUrl(path).data.publicUrl;
    }
    return path;
  }

  // Map a DB row to a list row (safe for rendering)
  function toRow(p, collections) {
    var images = p.product_images || [];
    var cover = images.find(function (i) { return i.is_cover; }) || images[0] || {};
    var coll = collections.find(function (c) { return c.slug === p.category; });
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      category: p.category,
      collectionName: coll ? (coll.name_en || coll.slug) : p.category,
      price: p.price,
      status: p.status,
      badge: p.badge,
      sort_order: p.sort_order,
      featured: p.featured,
      short_description: p.short_description || "",
      description: p.description || "",
      stock: p.stock != null ? p.stock : 0,
      meta_title: p.meta_title || "",
      meta_description: p.meta_description || "",
      audio_enabled: p.audio_enabled,
      audio_url: p.audio_url,
      details_link: p.details_link,
      deleted_at: p.deleted_at,
      currency: p.currency,
      created_at: p.created_at,
      updated_at: p.updated_at,
      cover: publicUrl("product-images", cover.storage_path) || "image/photo_2025-10-01_07-26-53.jpg",
      cover_path: cover.storage_path || "",
      image_count: images.length,
      images: images
    };
  }

  function errorText(err, fallback) {
    if (!err) return fallback;
    if (err.message) return err.message;
    return String(err) || fallback;
  }

  // Register an uploaded file in the media library (best-effort).
  async function registerMedia(bucket, path, file, kind) {
    var c = client();
    if (!c) return null;
    try {
      var { data, error } = await c.rpc("pms_register_media_asset", {
        p_bucket: bucket,
        p_storage_path: path,
        p_file_name: file ? file.name : null,
        p_mime_type: file && file.type ? file.type : null,
        p_size_bytes: file && file.size != null ? file.size : null,
        p_kind: kind,
        p_alt_text: null
      });
      if (error) {
        console.warn("[PMS] Failed to register media asset:", error.message);
        return null;
      }
      return data;
    } catch (e) {
      console.warn("[PMS] Failed to register media asset:", e.message);
      return null;
    }
  }

  // Usage-aware media deletion by storage path. Refuses to delete files that
  // are still used by another product (the DB RPC enforces this), so removing
  // a reused asset from one product never breaks another product's media.
  async function deleteMediaByPath(bucket, path) {
    var c = client();
    if (!c || !path) return { success: true };
    try {
      var { data, error } = await c.rpc("pms_delete_media_asset", {
        p_asset_id: null,
        p_storage_path: path,
        p_bucket: bucket,
        p_force: false
      });
      if (error) {
        console.warn("[PMS] Media cleanup skipped:", error.message);
        return { success: true, skipped: true, reason: error.message };
      }
      if (data && data.already_gone) {
        // No library record tracked: fall back to removing the raw storage object.
        var r = await c.storage.from(bucket).remove([path]);
        if (r.error) console.warn("[PMS] Failed to delete storage object:", r.error.message);
      }
      return { success: true };
    } catch (e) {
      console.warn("[PMS] Media cleanup skipped:", e.message);
      return { success: true, skipped: true, reason: e.message };
    }
  }

  var PMS = {
    // ------------------------------------------------------------------
    // PRODUCTS
    // ------------------------------------------------------------------
    listProducts: async function () {
      var c = client();
      if (!c) throw new Error("Database connection unavailable.");
      var q = c.from("products")
        .select("*, product_images(id, product_id, storage_path, display_order, is_cover, alt_text)")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      var collections = await PMS.listCollections();
      var { data, error } = await q;
      if (error) throw error;
      var collList = (collections && collections.success) ? collections.collections : [];
      return { success: true, products: (data || []).map(function (p) { return toRow(p, collList); }), collections: collList };
    },

    getProduct: async function (id) {
      var c = client();
      if (!c) throw new Error("Database connection unavailable.");
      var { data, error } = await c.from("products")
        .select("*, product_images(id, product_id, storage_path, display_order, is_cover, alt_text)")
        .eq("id", id)
        .single();
      if (error) throw error;
      var collections = await PMS.listCollections();
      var collList = (collections && collections.success) ? collections.collections : [];
      return { success: true, product: toRow(data, collList) };
    },

    upsertProduct: async function (product, images) {
      var c = client();
      if (!c) throw new Error("Database connection unavailable.");
      var payload = {
        name: product.name,
        slug: product.slug,
        category: product.category,
        short_description: product.short_description || "",
        description: product.description || "",
        price: Number(product.price) || 0,
        stock: Number(product.stock) || 0,
        featured: !!product.featured,
        status: product.status || "draft",
        details_link: product.details_link || "",
        audio_url: product.audio_url || "",
        audio_enabled: !!product.audio_enabled,
        badge: product.badge || "",
        sort_order: Number(product.sort_order) || 0,
        meta_title: product.meta_title || "",
        meta_description: product.meta_description || "",
        currency: product.currency || "USD"
      };
      if (product.id) payload.id = product.id;
      var imgPayload = (images || []).map(function (img) {
        return {
          storage_path: img.storage_path,
          display_order: Number(img.display_order) || 0,
          is_cover: !!img.is_cover,
          alt_text: img.alt_text || ""
        };
      });
      var { data, error } = await c.rpc("pms_upsert_product", {
        p_product: payload,
        p_images: imgPayload
      });
      if (error) throw error;
      return { success: true, data: data };
    },

    duplicateProduct: async function (id) {
      var c = client();
      if (!c) throw new Error("Database connection unavailable.");
      var { data, error } = await c.rpc("pms_duplicate_product", { p_product_id: id });
      if (error) throw error;
      return { success: true, data: data };
    },

    deleteProduct: async function (id) {
      var c = client();
      if (!c) throw new Error("Database connection unavailable.");
      var { error } = await c.from("products").delete().eq("id", id);
      if (error) throw error;
      return { success: true };
    },

    bulkStatus: async function (ids, status) {
      var c = client();
      if (!c) throw new Error("Database connection unavailable.");
      var { data, error } = await c.rpc("pms_bulk_status_update", { p_ids: ids, p_status: status });
      if (error) throw error;
      return { success: true, data: data };
    },

    bulkSoftDelete: async function (ids) {
      var c = client();
      if (!c) throw new Error("Database connection unavailable.");
      var { data, error } = await c.rpc("pms_bulk_soft_delete", { p_ids: ids });
      if (error) throw error;
      return { success: true, data: data };
    },

    bulkRestore: async function (ids) {
      var c = client();
      if (!c) throw new Error("Database connection unavailable.");
      var { data, error } = await c.rpc("pms_bulk_restore", { p_ids: ids });
      if (error) throw error;
      return { success: true, data: data };
    },

    // Composite bulk update (status + deleted_at in one write).
    // Guarantees storefront correctness: a hidden/deleted product must also
    // leave the active storefront set, which only reads status='active'.
    // A status-only change must never resurrect a soft-deleted product:
    // deleted rows stay deleted until explicitly restored (deleted_at=null).
    bulkUpdate: async function (ids, payload) {
      var c = client();
      if (!c) throw new Error("Database connection unavailable.");
      var q = c.from("products").update(payload);
      if (payload && !("deleted_at" in payload)) {
        q = q.is("deleted_at", null);
      }
      var { error } = await q.in("id", ids);
      if (error) throw error;
      return { success: true };
    },

    bulkChangeCollection: async function (ids, categorySlug) {
      var c = client();
      if (!c) throw new Error("Database connection unavailable.");
      var updates = ids.map(function (id) {
        return c.from("products").update({ category: categorySlug }).eq("id", id);
      });
      var results = await Promise.all(updates);
      var err = results.find(function (r) { return r.error; });
      if (err) throw err.error;
      return { success: true };
    },

    // Reorder featured products. Only the featured product IDs passed in are
    // touched (sort_order only); non-featured products are never modified.
    // Writes go through the RLS-protected client update (admin-only policy),
    // the same pathway used by reorderImages / bulkChangeCollection.
    reorderFeatured: async function (orderedIds) {
      var c = client();
      if (!c) throw new Error("Database connection unavailable.");
      if (!orderedIds || orderedIds.length < 2) throw new Error("At least two featured products are required.");
      var updates = orderedIds.map(function (id, idx) {
        return c.from("products")
          .update({ sort_order: idx })
          .eq("id", id)
          .is("featured", true)
          .is("deleted_at", null);
      });
      var results = await Promise.all(updates);
      var err = results.find(function (r) { return r.error; });
      if (err) throw err.error;
      return { success: true };
    },

    slugify: async function (name) {
      var c = client();
      if (!c) throw new Error("Database connection unavailable.");
      var { data, error } = await c.rpc("pms_slugify", { p_name: name });
      if (error) throw error;
      return data;
    },

    slugAvailable: async function (slug, excludeId) {
      var c = client();
      if (!c) throw new Error("Database connection unavailable.");
      var { data, error } = await c.rpc("pms_product_slug_available", { p_slug: slug, p_exclude_id: excludeId || null });
      if (error) throw error;
      return data;
    },

    // ------------------------------------------------------------------
    // IMAGES
    // ------------------------------------------------------------------
    uploadImage: async function (file, onProgress) {
      var c = client();
      if (!c) throw new Error("Database connection unavailable.");
      var ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      var path = "pms_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8) + "." + ext;
      var { error } = await c.storage.from("product-images").upload(path, file, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: true
      });
      if (error) throw error;
      var assetId = await registerMedia("product-images", path, file, "image");
      return { success: true, path: path, url: publicUrl("product-images", path), asset_id: assetId };
    },

    // Usage-aware deletion: only removes the storage object + library record when
    // the file is no longer referenced by any product (or was never tracked).
    deleteImageFile: async function (path) {
      return deleteMediaByPath("product-images", path);
    },

    setCover: async function (productId, imageId) {
      var c = client();
      if (!c) throw new Error("Database connection unavailable.");
      var { error } = await c.from("product_images").update({ is_cover: false }).eq("product_id", productId);
      if (error) throw error;
      var { error: err2 } = await c.from("product_images").update({ is_cover: true }).eq("id", imageId);
      if (err2) throw err2;
      return { success: true };
    },

    deleteImageRow: async function (imageId) {
      var c = client();
      if (!c) throw new Error("Database connection unavailable.");
      var { data, error } = await c.from("product_images").delete().eq("id", imageId).select();
      if (error) throw error;
      return { success: true, deleted: data };
    },

    reorderImages: async function (productId, orderedIds) {
      var c = client();
      if (!c) throw new Error("Database connection unavailable.");
      var updates = orderedIds.map(function (imageId, idx) {
        return c.from("product_images").update({ display_order: idx }).eq("id", imageId);
      });
      var results = await Promise.all(updates);
      var err = results.find(function (r) { return r.error; });
      if (err) throw err.error;
      return { success: true };
    },

    // ------------------------------------------------------------------
    // AUDIO
    // ------------------------------------------------------------------
    uploadAudio: async function (file) {
      var c = client();
      if (!c) throw new Error("Database connection unavailable.");
      var path = "pms_audio_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8) + ".mp3";
      var { error } = await c.storage.from("product-audio").upload(path, file, {
        contentType: file.type || "audio/mpeg",
        cacheControl: "3600",
        upsert: true
      });
      if (error) throw error;
      var assetId = await registerMedia("product-audio", path, file, "audio");
      return { success: true, path: path, url: publicUrl("product-audio", path), asset_id: assetId };
    },

    deleteAudioFile: async function (path) {
      return deleteMediaByPath("product-audio", path);
    },

    setAudio: async function (productId, audioUrl, enabled) {
      var c = client();
      if (!c) throw new Error("Database connection unavailable.");
      var { error } = await c.from("products").update({ audio_url: audioUrl, audio_enabled: !!enabled }).eq("id", productId);
      if (error) throw error;
      return { success: true };
    },

    // ------------------------------------------------------------------
    // COLLECTIONS
    // ------------------------------------------------------------------
    listCollections: async function () {
      var c = client();
      if (!c) throw new Error("Database connection unavailable.");
      var { data, error } = await c.from("collections").select("*").order("display_order", { ascending: true });
      if (error) throw error;
      return { success: true, collections: data || [] };
    },

    upsertCollection: async function (coll) {
      var c = client();
      if (!c) throw new Error("Database connection unavailable.");
      var payload = {
        slug: coll.slug,
        name_en: coll.name_en,
        name_am: coll.name_am || "",
        icon: coll.icon || "",
        color: coll.color || "",
        description: coll.description || "",
        display_order: Number(coll.display_order) || 0,
        is_active: !!coll.is_active
      };
      var oldSlug = null;
      var result;
      if (coll.id) {
        var { data: oldData, error: oldErr } = await c.from("collections").select("slug").eq("id", coll.id).maybeSingle();
        if (oldErr) throw oldErr;
        if (oldData && oldData.slug) oldSlug = oldData.slug;
        result = await c.from("collections").update(payload).eq("id", coll.id);
      } else {
        result = await c.from("collections").insert(payload);
      }
      if (result.error) throw result.error;
      // When a collection slug changes, keep its products assigned to the new
      // slug so nothing is orphaned. Products are never deleted or duplicated.
      if (oldSlug && oldSlug !== coll.slug) {
        var { error: reErr } = await c.from("products").update({ category: coll.slug }).eq("category", oldSlug);
        if (reErr) console.warn("[PMS] Failed to reassign products to renamed collection:", reErr.message);
      }
      return { success: true };
    },

    deleteCollection: async function (id) {
      var c = client();
      if (!c) throw new Error("Database connection unavailable.");
      var { error } = await c.from("collections").delete().eq("id", id);
      if (error) throw error;
      return { success: true };
    },

    // Delete a collection and reassign its products (never deletes products).
    deleteCollectionWithProducts: async function (id, moveToSlug) {
      var c = client();
      if (!c) throw new Error("Database connection unavailable.");
      var { data, error } = await c.rpc("pms_collection_delete", {
        p_collection_id: id,
        p_move_to_slug: moveToSlug || null
      });
      if (error) throw error;
      return { success: true, data: data };
    },

    archiveCollection: async function (id) {
      var c = client();
      if (!c) throw new Error("Database connection unavailable.");
      var { error } = await c.from("collections").update({ archived_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      return { success: true };
    },

    restoreCollection: async function (id) {
      var c = client();
      if (!c) throw new Error("Database connection unavailable.");
      var { error } = await c.from("collections").update({ archived_at: null }).eq("id", id);
      if (error) throw error;
      return { success: true };
    },

    toggleCollectionActive: async function (id, isActive) {
      var c = client();
      if (!c) throw new Error("Database connection unavailable.");
      var { error } = await c.from("collections").update({ is_active: !!isActive }).eq("id", id);
      if (error) throw error;
      return { success: true };
    },

    // ------------------------------------------------------------------
    // MEDIA LIBRARY
    // ------------------------------------------------------------------
    listMedia: async function (kind, search) {
      var c = client();
      if (!c) throw new Error("Database connection unavailable.");
      var q = c.from("media_assets").select("*, media_usages(count), profiles(full_name)");
      if (kind && kind !== "all") q = q.eq("kind", kind);
      q = q.order("created_at", { ascending: false }).limit(200);
      var { data, error } = await q;
      if (error) throw error;
      var list = (data || []).map(function (m) {
        var usage = (m.media_usages && m.media_usages[0]) ? m.media_usages[0].count : 0;
        return {
          id: m.id,
          bucket: m.bucket,
          storage_path: m.storage_path,
          file_name: m.file_name || m.storage_path,
          mime_type: m.mime_type,
          size_bytes: m.size_bytes,
          kind: m.kind,
          alt_text: m.alt_text || "",
          uploaded_by: m.uploaded_by,
          uploaded_by_name: (m.profiles && m.profiles[0] && m.profiles[0].full_name) || "",
          created_at: m.created_at,
          usage_count: usage,
          url: publicUrl(m.bucket, m.storage_path)
        };
      });
      if (search) {
        var s = search.toLowerCase();
        list = list.filter(function (m) {
          return m.file_name.toLowerCase().indexOf(s) !== -1 || m.storage_path.toLowerCase().indexOf(s) !== -1;
        });
      }
      return { success: true, media: list };
    },

    deleteMediaAsset: async function (id, force) {
      var c = client();
      if (!c) throw new Error("Database connection unavailable.");
      var { data, error } = await c.rpc("pms_delete_media_asset", {
        p_asset_id: id,
        p_storage_path: null,
        p_bucket: null,
        p_force: !!force
      });
      if (error) throw error;
      return { success: true, data: data };
    },

    mediaUsageCount: async function () {
      var c = client();
      if (!c) throw new Error("Database connection unavailable.");
      var { count, error } = await c.from("media_assets").select("id", { count: "exact", head: true });
      if (error) throw error;
      return { success: true, count: count || 0 };
    },

    // ------------------------------------------------------------------
    // PRODUCT TEMPLATES
    // ------------------------------------------------------------------
    listTemplates: async function () {
      var c = client();
      if (!c) throw new Error("Database connection unavailable.");
      var { data, error } = await c.from("product_templates").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return { success: true, templates: data || [] };
    },

    saveTemplate: async function (tpl) {
      var c = client();
      if (!c) throw new Error("Database connection unavailable.");
      var payload = {
        name: tpl.name,
        category: tpl.category || null,
        template_data: tpl.template_data || {},
        is_active: tpl.is_active !== false
      };
      var result;
      if (tpl.id) {
        result = await c.from("product_templates").update(payload).eq("id", tpl.id);
      } else {
        result = await c.from("product_templates").insert(payload);
      }
      if (result.error) throw result.error;
      return { success: true };
    },

    deleteTemplate: async function (id) {
      var c = client();
      if (!c) throw new Error("Database connection unavailable.");
      var { error } = await c.from("product_templates").delete().eq("id", id);
      if (error) throw error;
      return { success: true };
    },

    // ------------------------------------------------------------------
    // HISTORY
    // ------------------------------------------------------------------
    getHistory: async function (productId) {
      var c = client();
      if (!c) throw new Error("Database connection unavailable.");
      var { data, error } = await c.from("product_history")
        .select("id, product_id, changed_by, action, field_changes, snapshot, created_at")
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return { success: true, history: data || [] };
    },

    // ------------------------------------------------------------------
    // RESTORE POINTS
    // ------------------------------------------------------------------
    listRestorePoints: async function () {
      var c = client();
      if (!c) throw new Error("Database connection unavailable.");
      var { data, error } = await c.from("restore_points").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return { success: true, restorePoints: data || [] };
    },

    createRestorePoint: async function (name, description) {
      var c = client();
      if (!c) throw new Error("Database connection unavailable.");
      var { data, error } = await c.rpc("pms_create_restore_point", {
        p_name: name,
        p_description: description || null,
        p_filter: null
      });
      if (error) throw error;
      return { success: true, data: data };
    },

    applyRestorePoint: async function (id) {
      var c = client();
      if (!c) throw new Error("Database connection unavailable.");
      var { data, error } = await c.rpc("pms_restore_point_apply", { p_restore_point_id: id });
      if (error) throw error;
      return { success: true, data: data };
    }
  };

  window.PMSService = PMS;
  PMS.uploadedUrl = uploadedUrl;
  PMS.publicAudioUrl = function (path) { return uploadedUrl("product-audio", path); };
}();
