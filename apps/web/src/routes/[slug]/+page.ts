import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const ssr = false;

export const load: PageLoad = async ({ params, fetch }) => {
	const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';
	const res = await fetch(`${API_URL}/organizations/by-slug/${params.slug}`);
	if (!res.ok) error(404, `No organization found for "${params.slug}"`);
	const org = await res.json();
	return { org };
};
