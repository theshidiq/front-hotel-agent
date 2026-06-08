import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error('Missing required environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	auth: {
		// Persist the session in localStorage and refresh the access token in the
		// background BEFORE it expires, so API calls don't hit a 401 storm when the
		// hour-long token lapses. (These are Supabase defaults, set explicitly.)
		persistSession: true,
		autoRefreshToken: true,
		detectSessionInUrl: true,
	},
});

export async function compressImage(
	file: File,
	maxDimension = 1920,
	quality = 0.85
): Promise<File> {
	// Skip if already small enough
	if (file.size < 500 * 1024) {
		return file;
	}

	return new Promise((resolve, reject) => {
		const img = new Image();
		const url = URL.createObjectURL(file);

		img.onload = () => {
			URL.revokeObjectURL(url);

			const { width, height } = img;

			// If image is within bounds and under 1MB, skip compression
			if (width <= maxDimension && height <= maxDimension && file.size < 1024 * 1024) {
				resolve(file);
				return;
			}

			// Calculate new dimensions preserving aspect ratio
			let newWidth = width;
			let newHeight = height;
			if (width > maxDimension || height > maxDimension) {
				if (width > height) {
					newWidth = maxDimension;
					newHeight = Math.round((height / width) * maxDimension);
				} else {
					newHeight = maxDimension;
					newWidth = Math.round((width / height) * maxDimension);
				}
			}

			const canvas = document.createElement('canvas');
			canvas.width = newWidth;
			canvas.height = newHeight;
			const ctx = canvas.getContext('2d');
			if (!ctx) {
				resolve(file);
				return;
			}

			ctx.drawImage(img, 0, 0, newWidth, newHeight);

			canvas.toBlob(
				(blob) => {
					if (!blob) {
						resolve(file);
						return;
					}
					const compressedName = file.name.replace(/\.[^.]+$/, '.jpg');
					resolve(new File([blob], compressedName, { type: 'image/jpeg' }));
				},
				'image/jpeg',
				quality
			);
		};

		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('Failed to load image for compression'));
		};

		img.src = url;
	});
}

/** Compression optimized for OCR text recognition (e.g. Japanese product labels) */
export async function compressImageForOCR(file: File): Promise<File> {
	return compressImage(file, 1600, 0.85);
}

export async function uploadImage(file: File): Promise<string> {
	const fileExt = file.name.split('.').pop();
	const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
	const filePath = `scans/${fileName}`;

	const uploadPromise = supabase.storage
		.from('product-images')
		.upload(filePath, file);

	const timeoutPromise = new Promise<never>((_, reject) =>
		setTimeout(() => reject(new Error('Upload timed out. Check your network connection.')), 30000)
	);

	const { error } = await Promise.race([uploadPromise, timeoutPromise]);

	if (error) {
		throw new Error(`Upload failed: ${error.message}`);
	}

	const { data } = supabase.storage
		.from('product-images')
		.getPublicUrl(filePath);

	return data.publicUrl;
}
