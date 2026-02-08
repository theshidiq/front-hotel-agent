import { createClient } from '@supabase/supabase-js';

// Hardcoded for now - env loading issue with monorepo
const supabaseUrl = 'https://ymdyejrljmvajqjbejvh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltZHllanJsam12YWpxamJlanZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MjE1NDMsImV4cCI6MjA2ODI5NzU0M30.wFirIfjnpkgRqDhECW6XZKkzWg_Q-pvs7jX_FIAMYfE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

export async function uploadImage(file: File): Promise<string> {
	const fileExt = file.name.split('.').pop();
	const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
	const filePath = `scans/${fileName}`;

	const { error } = await supabase.storage
		.from('product-images')
		.upload(filePath, file);

	if (error) {
		throw new Error(`Upload failed: ${error.message}`);
	}

	const { data } = supabase.storage
		.from('product-images')
		.getPublicUrl(filePath);

	return data.publicUrl;
}
