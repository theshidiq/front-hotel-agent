import { supabase } from './supabase';
import type { User, Session } from '@supabase/supabase-js';

interface PeriodJson {
	year: number;
	month: number;
	day: number;
}

interface Staff {
	id: string;
	name: string;
	email: string;
	position: string | null;
}

interface StaffWithPeriod extends Staff {
	start_period: PeriodJson | null;
	end_period: PeriodJson | null;
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
const STAFF_END_PERIOD_KEY = 'staff_end_period';

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

function periodToDate(p: PeriodJson): Date {
	return new Date(p.year, p.month - 1, p.day);
}

function isWithinActivePeriod(start: PeriodJson | null, end: PeriodJson | null): boolean {
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	if (start) {
		const startDate = periodToDate(start);
		if (startDate > today) return false;
	}

	if (end) {
		const endDate = periodToDate(end);
		if (endDate < today) return false;
	}

	return true;
}

function saveStaffPeriod(end: PeriodJson | null): void {
	if (typeof window === 'undefined') return;
	if (end) {
		localStorage.setItem(STAFF_END_PERIOD_KEY, JSON.stringify(end));
	} else {
		localStorage.removeItem(STAFF_END_PERIOD_KEY);
	}
}

function getStoredEndPeriod(): PeriodJson | null {
	if (typeof window === 'undefined') return null;
	const stored = localStorage.getItem(STAFF_END_PERIOD_KEY);
	if (!stored) return null;
	try {
		return JSON.parse(stored);
	} catch {
		return null;
	}
}

function clearStaffPeriod(): void {
	if (typeof window !== 'undefined') {
		localStorage.removeItem(STAFF_END_PERIOD_KEY);
	}
}

/** Check if the stored end period has passed (quick local check, no DB call) */
function isStoredPeriodExpired(): boolean {
	const endPeriod = getStoredEndPeriod();
	if (!endPeriod) return false; // No end period means no expiry
	return !isWithinActivePeriod(null, endPeriod);
}

async function checkStaffStatus(email: string): Promise<StaffWithPeriod | null> {
	const { data, error } = await supabase
		.from('staff')
		.select('id, name, email, position, start_period, end_period')
		.eq('email', email)
		.eq('is_active', true)
		.limit(1)
		.single();

	if (error || !data) {
		return null;
	}
	return data as StaffWithPeriod;
}

async function handleSignedIn(email: string): Promise<void> {
	authState.loading = true;
	const staff = await checkStaffStatus(email);

	const pendingEmail = getPendingStaffEmail();
	if (pendingEmail) {
		if (email.toLowerCase() !== pendingEmail.toLowerCase()) {
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
		authState.isStaff = false;
		authState.staff = null;
		authState.loading = false;
		setTimeout(async () => {
			await supabase.auth.signOut();
		}, 4000);
		return;
	}

	// Check if within active period
	if (!isWithinActivePeriod(staff.start_period, staff.end_period)) {
		authState.error = '勤務期間外です。管理者にお問い合わせください。';
		authState.isStaff = false;
		authState.staff = null;
		authState.loading = false;
		clearStaffPeriod();
		setTimeout(async () => {
			await supabase.auth.signOut();
		}, 4000);
		return;
	}

	// Save end period for local expiry checks
	saveStaffPeriod(staff.end_period);

	authState.staff = { id: staff.id, name: staff.name, email: staff.email, position: staff.position };
	authState.isStaff = true;
	authState.error = null;
	authState.loading = false;
}

export async function initAuth(): Promise<void> {
	// Quick local check: if stored period has expired, sign out immediately
	if (isStoredPeriodExpired()) {
		clearStaffPeriod();
		await supabase.auth.signOut();
		authState.loading = false;
		return;
	}

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
		} else if (event === 'TOKEN_REFRESHED' && session?.user?.email) {
			// On token refresh, re-verify staff is still in active period
			if (isStoredPeriodExpired()) {
				authState.error = '勤務期間が終了しました。';
				authState.isStaff = false;
				authState.staff = null;
				clearStaffPeriod();
				await supabase.auth.signOut();
			}
		} else if (event === 'SIGNED_OUT') {
			authState.staff = null;
			authState.isStaff = false;
			authState.error = null;
			clearPendingStaffEmail();
			clearStaffPeriod();
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
	clearStaffPeriod();
}

export function getAuthHeaders(): Record<string, string> {
	if (authState.session?.access_token) {
		return { Authorization: `Bearer ${authState.session.access_token}` };
	}
	return {};
}
