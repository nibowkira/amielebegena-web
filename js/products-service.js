/**
 * Amiele Begena — Products Service Layer
 * Fetches dynamic catalog listings and maps relationships.
 */

(function () {
    'use strict';

    const AUDIO_MAPPING = {
        'begena': 'audio/begena.mp3',
        'kirar': 'audio/kirar.mp3',
        'masinko': 'audio/masinko.mp3',
        'electric-kirar': 'audio/kirar_electric.mp3',
        'kebero': 'audio/kebero.mp3',
        'washint': 'audio/washint.mp3',
        'sanasel': 'audio/sanasel.mp3',
        'meleket': 'audio/meleket.mp3'
    };

    const ProductsService = {
        async getProducts() {
            const client = window.AmieleSupabase.getClient();
            if (!client) throw new Error('Supabase client not initialized');

            // Fetch products with their covers
            const { data, error } = await client
                .from('products')
                .select(`
                    *,
                    product_images(storage_path, is_cover)
                `)
                .eq('status', 'active');

            if (error) throw error;

            return data.map(item => {
                const coverImage = item.product_images?.find(img => img.is_cover) || item.product_images?.[0];
                
                // Construct fallback path for static files or storage references
                let imgUrl = coverImage ? coverImage.storage_path : 'image/photo_2025-10-01_07-26-53.jpg';
                if (imgUrl && !imgUrl.startsWith('http') && !imgUrl.startsWith('image/') && !imgUrl.includes('/')) {
                    // It's a filename in product-images storage bucket
                    const { data: { publicUrl } } = client.storage
                        .from('product-images')
                        .getPublicUrl(imgUrl);
                    imgUrl = publicUrl;
                }

                return {
                    id: item.id,
                    name: item.name,
                    desc: item.short_description || '',
                    price: parseFloat(item.price),
                    category: item.category,
                    image: imgUrl,
                    aboutId: item.slug,
                    audio: AUDIO_MAPPING[item.slug] || null,
                    badge: item.name.split(' ')[0]
                };
            });
        }
    };

    window.ProductsService = ProductsService;
})();
