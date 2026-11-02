-- Migration: Seed products and images into catalog
-- 1. Insert Products
INSERT INTO public.products (id, name, slug, category, short_description, price, stock, featured, status)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'በገና (Begena)', 'begena', 'strings', 'Ten-Stringed Harp of David', 100.00, 50, true, 'active'),
    ('a0000000-0000-0000-0000-000000000002', 'ክራር (Kirar)', 'kirar', 'strings', 'Traditional 6-String Lyre', 70.83, 60, true, 'active'),
    ('a0000000-0000-0000-0000-000000000003', 'ማሲንቆ (Masinko)', 'masinko', 'strings', 'One-Stringed Fiddle & Bow', 58.33, 40, true, 'active'),
    ('a0000000-0000-0000-0000-000000000004', 'Electric Kirar', 'electric-kirar', 'strings', 'Solid Wood Modern Variant', 83.33, 30, true, 'active'),
    ('a0000000-0000-0000-0000-000000000005', 'ከበሮ (Kebero)', 'kebero', 'percussion', 'Double-Headed Ceremonial Drum', 115.00, 25, true, 'active'),
    ('a0000000-0000-0000-0000-000000000006', 'ዋሽንት (Washint)', 'washint', 'wind', 'End-Blown Bamboo Flute', 45.00, 80, true, 'active'),
    ('a0000000-0000-0000-0000-000000000007', 'ጸናጽል (Sanasel)', 'sanasel', 'percussion', 'Liturgical Sistrum', 75.00, 45, true, 'active'),
    ('a0000000-0000-0000-0000-000000000008', 'መለከት (Meleket)', 'meleket', 'wind', 'Ancient Royal Trumpet', 130.00, 15, true, 'active'),
    ('a0000000-0000-0000-0000-000000000009', 'Awtar (አውታር)', 'awtar', 'accessories', 'Per Piece', 2.08, 500, false, 'active'),
    ('a0000000-0000-0000-0000-000000000010', 'Sheep-Gut Strings', 'sheep-gut-strings', 'accessories', 'Amber Resonance Set', 35.00, 150, false, 'active'),
    ('a0000000-0000-0000-0000-000000000011', 'Conditioning Wax', 'conditioning-wax', 'accessories', 'Highland Beeswax Blend', 18.00, 200, false, 'active'),
    ('a0000000-0000-0000-0000-000000000012', 'Padded Registry Case', 'padded-case', 'accessories', 'Reinforced Heritage Carry', 85.00, 35, false, 'active'),
    ('a0000000-0000-0000-0000-000000000013', 'Traditional Leather Bag', 'leather-bag', 'bags', 'Hand-stitched Ethiopian Leather', 55.00, 40, false, 'active'),
    ('a0000000-0000-0000-0000-000000000014', 'Woven Cotton Tote', 'cotton-tote', 'bags', 'Authentic Tibeb Pattern', 30.00, 75, false, 'active'),
    ('a0000000-0000-0000-0000-000000000015', 'Begena Transport Bag', 'begena-bag', 'bags', 'Padded Canvas & Leather Trim', 75.00, 20, false, 'active'),
    ('a0000000-0000-0000-0000-000000000016', 'Kirar Shoulder Bag', 'kirar-bag', 'bags', 'Lightweight Woven Fabric', 40.00, 50, false, 'active'),
    ('a0000000-0000-0000-0000-000000000017', 'The Begena Lesson Book', 'begena-book', 'books', 'A Comprehensive Guide to the Harp of David', 14.17, 120, false, 'active'),
    ('a0000000-0000-0000-0000-000000000018', 'Ethiopian Musical Heritage', 'heritage-book', 'books', 'The Sacred Sounds of Begena', 19.58, 85, false, 'active')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    category = EXCLUDED.category,
    short_description = EXCLUDED.short_description,
    price = EXCLUDED.price,
    stock = EXCLUDED.stock,
    featured = EXCLUDED.featured,
    status = EXCLUDED.status;

-- 2. Insert Cover Images
INSERT INTO public.product_images (product_id, storage_path, is_cover)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'image/photo_2025-10-01_07-26-53.jpg', true),
    ('a0000000-0000-0000-0000-000000000002', 'image/photo_2025-02-27_17-33-38.jpg', true),
    ('a0000000-0000-0000-0000-000000000003', 'image/photo_2025-02-24_22-03-09.jpg', true),
    ('a0000000-0000-0000-0000-000000000004', 'image/photo_2025-10-01_07-26-53.jpg', true),
    ('a0000000-0000-0000-0000-000000000005', 'image/photo_2026-05-07_13-41-48.jpg', true),
    ('a0000000-0000-0000-0000-000000000006', 'washint_flute_v2_1776883145689.png', true),
    ('a0000000-0000-0000-0000-000000000007', 'image/photo_2026-05-08_11-10-17.jpg', true),
    ('a0000000-0000-0000-0000-000000000008', 'meleket_trumpet_v2_1776883415170.png', true),
    ('a0000000-0000-0000-0000-000000000009', 'image/image copy.png', true),
    ('a0000000-0000-0000-0000-000000000010', 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=400&auto=format&fit=crop', true),
    ('a0000000-0000-0000-0000-000000000011', 'https://images.unsplash.com/photo-1542868725-783aafa0d5fe?q=80&w=400&auto=format&fit=crop', true),
    ('a0000000-0000-0000-0000-000000000012', 'https://images.unsplash.com/photo-1544943961-4ca3fbd72cc7?q=80&w=400&auto=format&fit=crop', true),
    ('a0000000-0000-0000-0000-000000000013', 'image/kirar-bag-sehera.jpg', true),
    ('a0000000-0000-0000-0000-000000000014', 'image/kirar-bag-koda.jpg', true),
    ('a0000000-0000-0000-0000-000000000015', 'image/bag-begena.jpg', true),
    ('a0000000-0000-0000-0000-000000000016', 'image/bag-begena-kirar.jpg', true),
    ('a0000000-0000-0000-0000-000000000017', 'image/begena_lesson_book.png', true),
    ('a0000000-0000-0000-0000-000000000018', 'image/ethiopian_music_heritage_book.png', true)
ON CONFLICT (id) DO NOTHING;
