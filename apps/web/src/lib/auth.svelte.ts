import { supabase } from './supabase';
import type { User, Session } from '@supabase/supabase-js';

interface Staff {
	id: string;
	name: string;
	email: string;
	position: string | null;
}

interface AuthState {
	user: User | null;
	session: Session | null;
	staff: Staff | null;
	loading: boolean;
	isStaff: boolean;
	error: string | null;
}

// Module-level reactive state (Svelte 5 runes)
export let authState: AuthState = $state({
	user: null,
	session: null,
	staff: null,
	loading: true,
	isStaff: false,
	error: null,
});

const PENDING_EMAIL_KEY = 'pending_staff_email';

export function setPendingStaffEmail(email: string): void {
	if (typeof window !== 'undefined') {
		localStorage.setItem(PENDING_EMAIL_KEY, email);
	}
}

export function getPendingStaffEmail(): string | null {
	if (typeof window === 'undefined') return null;
	return localStorage.getItem(PENDING_EMAIL_KEY);
}

export function clearPendingStaffEmail(): void {
	if (typeof window !== 'undefined') {
		localStorage.removeItem(PENDING_EMAIL_KEY);
	}
}

async function checkStaffStatus(email: string): Promise<Staff | null> {
	const { data, error } = await supabase
		.from('staff')
		.select('id, name, email, position')
		.eq('email', email)
		.eq('is_active', true)
		.limit(1)
		.single();

	if (error || !data) {
		return null;
	}
	return data as Staff;
}

async function handleSignedIn(email: string): Promise<void> {
	authState.loading = true;
	const staff = await checkStaffStatus(email);
	authState.staff = staff;
	authState.isStaff = !!staff;

	const pendingEmail = getPendingStaffEmail();
	if (pendingEmail) {
		if (email.toLowerCase() !== pendingEmail.toLowerCase()) {
			// Authenticated with wrong Google account
			authState.error = `${pendingEmail} のGoogleアカウントでログインしてください（現在: ${email}）`;
			authState.isStaff = false;
			authState.staff = null;
			authState.loading = false;
			setTimeout(async () => {
				await supabase.auth.signOut();
			}, 4000);
			return;
		}
		clearPendingStaffEmail();
	}

	if (!staff) {
		authState.error = 'このアカウントはスタッフとして登録されていません';
		authState.loading = false;
		setTimeout(async () => {
			await supabase.auth.signOut();
		}, 4000);
		return;
	}

	authState.error = null;
	authState.loading = false;
}

export async function initAuth(): Promise<void> {
	// Get initial session
	const {
		data: { session },
	} = await supabase.auth.getSession();

	if (session?.user?.email) {
		authState.user = session.user;
		authState.session = session;
		await handleSignedIn(session.user.email);
	} else {
		authState.loading = false;
	}

	// Listen for auth changes
	supabase.auth.onAuthStateChange(async (event, session) => {
		authState.session = session;
		authState.user = session?.user ?? null;

		if (event === 'SIGNED_IN' && session?.user?.email) {
			await handleSignedIn(session.user.email);
		} else if (event === 'SIGNED_OUT') {
			authState.staff = null;
			authState.isStaff = false;
			authState.error = null;
			clearPendingStaffEmail();
		}
	});
}

export async function signInWithGoogle(redirectTo?: string): Promise<void> {
	authState.error = null;
	const { error } = await supabase.auth.signInWithOAuth({
		provider: 'google',
		options: {
			redirectTo: redirectTo || window.location.origin + '/login',
		},
	});
	if (error) {
		authState.error = error.message;
	}
}

export async function signOut(): Promise<void> {
	await supabase.auth.signOut();
	authState.user = null;
	authState.session = null;
	authState.staff = null;
	authState.isStaff = false;
	authState.error = null;
	clearPendingStaffEmail();
}

export function getAuthHeaders(): Record<string, string> {
	if (authState.session?.access_token) {
		return { Authorization: `Bearer ${authState.session.access_token}` };
	}
	return {};
}
