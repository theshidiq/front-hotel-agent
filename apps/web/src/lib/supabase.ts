import { createClient } from '@supabase/supabase-js';

// Hardcoded for now - env loading issue with monorepo
const supabaseUrl = 'https://ymdyejrljmvajqjbejvh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltZHllanJsam12YWpxamJlanZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MjE1NDMsImV4cCI6MjA2ODI5NzU0M30.wFirIfjnpkgRqDhECW6XZKkzWg_Q-pvs7jX_FIAMYfE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
