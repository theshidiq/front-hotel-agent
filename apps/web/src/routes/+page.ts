// Disable SSR for this page to avoid hydration issues with auth state and browser APIs
export const ssr = false;

import { redirect } from '@sveltejs/kit';

export function load({ url }: { url: URL }) {
    // If a ?tab= param is present, stay on this page (food/menu management)
    if (url.searchParams.has('tab')) {
        return {};
    }
    // Otherwise redirect to the dashboard landing page
    throw redirect(302, '/dashboard');
}
