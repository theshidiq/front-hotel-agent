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

interface StaffRole {
	id: string;
	name: string;
}

interface StaffWithPeriod extends Staff {
	start_period: PeriodJson | null;
	end_period: PeriodJson | null;
	is_admin: boolean;
	role_id: string | null;
	organization_id: string | null;
}

interface Organization {
	id: string;
	name: string;
	display_name: string | null;
	slug: string | null;
}

interface AuthState {
	user: User | null;
	session: Session | null;
	staff: Staff | null;
	loading: boolean;
	isStaff: boolean;
	isAdmin: boolean;
	permissions: string[];
	role: StaffRole | null;
	error: string | null;
	guestPermissions: string[];
	organizationId: string | null;
	organization: Organization | null;
}

// Module-level reactive state (Svelte 5 runes)
export let authState: AuthState = $state({
	user: null,
	session: null,
	staff: null,
	loading: true,
	isStaff: false,
	isAdmin: false,
	permissions: [],
	role: null,
	error: null,
	guestPermissions: [],
	organizationId: null,
	organization: null,
});

export function can(permission: string): boolean {
	if (authState.isAdmin) return true;
	if (authState.isStaff) return authState.permissions.includes(permission);
	// Non-logged-in guest: check default guest role permissions
	// If no default role is set (empty array), deny by default
	return authState.guestPermissions.includes(permission);
}

const PENDING_EMAIL_KEY = 'pending_staff_email';
const STAFF_END_PERIOD_KEY = 'staff_end_period';
const ORG_ID_KEY = 'org_id';
const STAFF_CACHE_KEY = 'staff_cache';

interface StaffCache {
	staff: Staff;
	isAdmin: boolean;
	role: StaffRole | null;
	permissions: string[];
	organization: Organization | null;
	organizationId: string | null;
}

function saveStaffCache(data: StaffCache): void {
	if (typeof window === 'undefined') return;
	localStorage.setItem(STAFF_CACHE_KEY, JSON.stringify(data));
}

function getStaffCache(): StaffCache | null {
	if (typeof window === 'undefined') return null;
	const stored = localStorage.getItem(STAFF_CACHE_KEY);
	if (!stored) return null;
	try {
		return JSON.parse(stored) as StaffCache;
	} catch {
		return null;
	}
}

function clearStaffCache(): void {
	if (typeof window !== 'undefined') {
		localStorage.removeItem(STAFF_CACHE_KEY);
	}
}

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

function saveOrgId(orgId: string): void {
	if (typeof window !== 'undefined') {
		localStorage.setItem(ORG_ID_KEY, orgId);
	}
}

function getStoredOrgId(): string | null {
	if (typeof window === 'undefined') return null;
	return localStorage.getItem(ORG_ID_KEY);
}

function clearOrgId(): void {
	if (typeof window !== 'undefined') {
		localStorage.removeItem(ORG_ID_KEY);
	}
}

/** Check if the stored end period has passed (quick local check, no DB call) */
function isStoredPeriodExpired(): boolean {
	const endPeriod = getStoredEndPeriod();
	if (!endPeriod) return false; // No end period means no expiry
	return !isWithinActivePeriod(null, endPeriod);
}

async function checkStaffStatus(email: string, preferOrgId?: string | null): Promise<StaffWithPeriod | null> {
	// If we have a cached org ID, query that org directly to avoid returning the wrong org's record
	if (preferOrgId) {
		const { data } = await supabase
			.from('staff')
			.select('id, name, email, position, start_period, end_period, is_admin, role_id, organization_id')
			.eq('email', email)
			.eq('organization_id', preferOrgId)
			.eq('is_active', true)
			.limit(1)
			.maybeSingle();
		if (data) return data as StaffWithPeriod;
	}

	// Try env-configured org ID as tiebreaker (handles multi-org deployments where same email exists in multiple orgs)
	const envOrgId = import.meta.env.VITE_ORGANIZATION_ID;
	if (envOrgId) {
		const { data } = await supabase
			.from('staff')
			.select('id, name, email, position, start_period, end_period, is_admin, role_id, organization_id')
			.eq('email', email)
			.eq('organization_id', envOrgId)
			.eq('is_active', true)
			.limit(1)
			.maybeSingle();
		if (data) return data as StaffWithPeriod;
	}

	// Last resort: unscoped query (single-org deployments or new users)
	const { data, error } = await supabase
		.from('staff')
		.select('id, name, email, position, start_period, end_period, is_admin, role_id, organization_id')
		.eq('email', email)
		.eq('is_active', true)
		.limit(1)
		.maybeSingle();

	if (error || !data) {
		return null;
	}
	return data as StaffWithPeriod;
}

async function fetchOrganization(orgId: string): Promise<Organization | null> {
	const { data, error } = await supabase
		.from('organizations')
		.select('id, name, display_name, slug')
		.eq('id', orgId)
		.single();
	if (error || !data) return null;
	return data as Organization;
}

async function resolveOrganizationId(authUserId: string, staffOrgId: string | null): Promise<string | null> {
	// Prefer org from staff record (most specific)
	if (staffOrgId) return staffOrgId;

	// Fall back to organization_members lookup
	const { data } = await supabase
		.from('organization_members')
		.select('organization_id')
		.eq('auth_user_id', authUserId)
		.eq('is_active', true)
		.limit(1)
		.maybeSingle();

	return data?.organization_id ?? null;
}

async function loadRolePermissions(roleId: string): Promise<{ role: StaffRole | null; permissions: string[] }> {
	// Parallel fetch: role + permissions
	const [{ data: role }, { data: perms }] = await Promise.all([
		supabase.from('roles').select('id, name').eq('id', roleId).single(),
		supabase.from('role_permissions').select('permission').eq('role_id', roleId),
	]);

	return {
		role: role ? { id: role.id, name: role.name } : null,
		permissions: (perms || []).map((p: { permission: string }) => p.permission),
	};
}

/** Drop staff identity and privileges (incl. isAdmin, which can() checks first). */
function clearStaffAuthState(): void {
	authState.staff = null;
	authState.isStaff = false;
	authState.isAdmin = false;
	authState.role = null;
	authState.permissions = [];
	clearStaffCache();
}

let signingInProgress = false;
export let authInitialized = false;

async function handleSignedIn(email: string, authUserId?: string): Promise<void> {
	// Guard against concurrent calls (getSession + onAuthStateChange both fire on OAuth redirect)
	// The in-flight call clears `loading` itself; clearing it here would let pages
	// see loading=false/isStaff=false mid-verification and redirect to /login.
	if (signingInProgress) return;
	signingInProgress = true;
	// Only show loading spinner on first auth, not on subsequent token refreshes
	if (!authInitialized) authState.loading = true;

	try {
		const cachedOrgId = getStoredOrgId();
		const staff = await checkStaffStatus(email, cachedOrgId);

		const pendingEmail = getPendingStaffEmail();
		if (pendingEmail) {
			if (email.toLowerCase() !== pendingEmail.toLowerCase()) {
				authState.error = `${pendingEmail} のGoogleアカウントでログインしてください（現在: ${email}）`;
				clearStaffAuthState();
				authState.loading = false;
				setTimeout(async () => {
					await supabase.auth.signOut();
				}, 4000);
				return;
			}
			clearPendingStaffEmail();
		}

		if (!staff) {
			// Check if this is a new user going through setup (has no org yet)
			const { data: membership } = authUserId
				? await supabase
						.from('organization_members')
						.select('id')
						.eq('auth_user_id', authUserId)
						.limit(1)
						.maybeSingle()
				: { data: null };

			if (!membership) {
				// New user — let them proceed to setup without signing out
				clearStaffAuthState();
				authState.error = null;
				authState.loading = false;
				authInitialized = true;
				return;
			}

			authState.error = 'このアカウントはスタッフとして登録されていません';
			clearStaffAuthState();
			authState.loading = false;
			setTimeout(async () => {
				await supabase.auth.signOut();
			}, 4000);
			return;
		}

		// Check if within active period
		if (!isWithinActivePeriod(staff.start_period, staff.end_period)) {
			authState.error = '勤務期間外です。管理者にお問い合わせください。';
			clearStaffAuthState();
			authState.loading = false;
			clearStaffPeriod();
			setTimeout(async () => {
				await supabase.auth.signOut();
			}, 4000);
			return;
		}

		// Save end period for local expiry checks
		saveStaffPeriod(staff.end_period);

		// Resolve org ID, fetch org details, and load role permissions all in parallel
		const uid = authUserId ?? authState.user?.id;
		const knownOrgId = staff.organization_id ?? getStoredOrgId() ?? import.meta.env.VITE_ORGANIZATION_ID ?? null;
		const [orgId, roleResult, prefetchedOrg] = await Promise.all([
			uid ? resolveOrganizationId(uid, staff.organization_id) : Promise.resolve(staff.organization_id),
			staff.role_id ? loadRolePermissions(staff.role_id) : Promise.resolve(null),
			knownOrgId ? fetchOrganization(knownOrgId) : Promise.resolve(null),
		]);

		const resolvedOrgId = orgId ?? getStoredOrgId() ?? import.meta.env.VITE_ORGANIZATION_ID ?? null;
		if (resolvedOrgId) {
			authState.organizationId = resolvedOrgId;
			saveOrgId(resolvedOrgId);
			// Use prefetched org if same ID, otherwise fetch the correct one
			authState.organization = resolvedOrgId === knownOrgId ? prefetchedOrg : await fetchOrganization(resolvedOrgId);
		}

		const staffRecord = { id: staff.id, name: staff.name, email: staff.email, position: staff.position };
		const isAdmin = staff.is_admin ?? false;
		const role = roleResult?.role ?? null;
		const permissions = isAdmin ? [] : (roleResult?.permissions ?? []);

		authState.staff = staffRecord;
		authState.isStaff = true;
		authState.isAdmin = isAdmin;
		authState.error = null;
		authState.role = role;
		authState.permissions = permissions;

		// Persist to localStorage — next page load will render instantly from cache
		saveStaffCache({
			staff: staffRecord,
			isAdmin,
			role,
			permissions,
			organization: authState.organization,
			organizationId: authState.organizationId,
		});

		authState.loading = false;
		authInitialized = true;
	} catch (err) {
		authState.loading = false;
		authInitialized = true;
		throw err;
	} finally {
		signingInProgress = false;
	}
}
export async function loadGuestPermissions(explicitOrgId?: string): Promise<void> {
	try {
		const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';
		const orgId = explicitOrgId ?? getStoredOrgId();
		if (!orgId) return;
		// Persist so future page loads without ?org= still work (e.g. staff returning to same hotel)
		if (explicitOrgId) saveOrgId(explicitOrgId);
		const response = await fetch(`${API_URL}/roles/default?organizationId=${orgId}`);
		if (response.ok) {
			const role = await response.json();
			if (role && role.permissions) {
				authState.guestPermissions = role.permissions;
			}
		}
	} catch {
		// Silently fail — guests just get no permissions
	}
}

export async function initAuth(): Promise<void> {
	// Quick local check: if stored period has expired, sign out immediately
	if (isStoredPeriodExpired()) {
		clearStaffPeriod();
		clearOrgId();
		clearStaffCache();
		await supabase.auth.signOut();
		authState.loading = false;
		return;
	}

	// Restore cached org ID immediately so headers are ready before DB resolves
	const cachedOrgId = getStoredOrgId();
	if (cachedOrgId) authState.organizationId = cachedOrgId;

	// Optimistic render: hydrate auth state from cache so UI shows instantly.
	// The DB verification below will correct it if anything changed.
	const cached = getStaffCache();
	if (cached) {
		authState.staff = cached.staff;
		authState.isStaff = true;
		authState.isAdmin = cached.isAdmin;
		authState.role = cached.role;
		authState.permissions = cached.permissions;
		authState.organization = cached.organization;
		if (cached.organizationId) authState.organizationId = cached.organizationId;
		authState.loading = false; // show UI immediately — DB verify runs in background
	}

	// Parallel: load guest permissions + get session (independent operations)
	const [, sessionResult] = await Promise.all([
		loadGuestPermissions(),
		supabase.auth.getSession(),
	]);

	const session = sessionResult.data.session;

	if (session?.user?.email) {
		authState.user = session.user;
		authState.session = session;
		try {
			await handleSignedIn(session.user.email, session.user.id);
		} catch (err) {
			console.error('Failed to verify staff session:', err);
		}
	} else {
		// No active session — clear stale cache and show as logged out
		if (cached) clearStaffAuthState();
		authState.loading = false;
	}

	// Listen for auth changes
	// The callback must not await other supabase calls (supabase-js can deadlock on
	// its auth lock), so async follow-up work is deferred with setTimeout.
	supabase.auth.onAuthStateChange((event, session) => {
		authState.session = session;
		authState.user = session?.user ?? null;

		if (event === 'SIGNED_IN' && session?.user?.email) {
			// Skip if already authenticated as the same user — avoids re-running on tab focus
			if (authState.isStaff && authState.staff?.email === session.user.email) {
				return;
			}
			const { email, id } = session.user;
			setTimeout(() => {
				handleSignedIn(email, id).catch((err) => console.error('Failed to verify staff session:', err));
			}, 0);
		} else if (event === 'TOKEN_REFRESHED' && session?.user?.email) {
			// On token refresh, re-verify staff is still in active period
			if (isStoredPeriodExpired()) {
				authState.error = '勤務期間が終了しました。';
				clearStaffAuthState();
				clearStaffPeriod();
				clearOrgId();
				setTimeout(() => { supabase.auth.signOut(); }, 0);
			}
		} else if (event === 'SIGNED_OUT') {
			authState.staff = null;
			authState.isStaff = false;
			authState.isAdmin = false;
			authState.role = null;
			authState.permissions = [];
			authState.error = null;
			authState.organizationId = null;
			authState.organization = null;
			clearPendingStaffEmail();
			clearStaffPeriod();
			clearOrgId();
			clearStaffCache();
		}
	});
}

export async function signInWithEmail(email: string, password: string): Promise<{ success: boolean; error?: string }> {
	authState.error = null;
	const { data, error } = await supabase.auth.signInWithPassword({ email, password });
	if (error) {
		return { success: false, error: 'メールアドレスまたはパスワードが正しくありません' };
	}
	if (data.session?.user?.email) {
		authState.user = data.session.user;
		authState.session = data.session;
		await handleSignedIn(data.session.user.email, data.session.user.id);
		// Success if authenticated as staff, OR if new user (no staff record yet → goes to setup)
		if (authState.isStaff || (!authState.error && authState.user)) {
			return { success: true };
		}
		return { success: false, error: authState.error || 'スタッフとして登録されていません' };
	}
	return { success: false, error: 'ログインに失敗しました' };
}

export async function signUpWithEmail(email: string, password: string): Promise<{ success: boolean; needsConfirmation: boolean; error?: string }> {
	const redirectTo = typeof window !== 'undefined' ? window.location.origin + '/setup' : '/setup';
	const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
	if (error) {
		if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already exists')) {
			return { success: false, needsConfirmation: false, error: 'このメールアドレスはすでに登録されています' };
		}
		return { success: false, needsConfirmation: false, error: error.message };
	}
	// If session is returned immediately, email confirmation is disabled — sign in right away
	if (data.session?.user?.email) {
		authState.user = data.session.user;
		authState.session = data.session;
		await handleSignedIn(data.session.user.email, data.session.user.id);
		return { success: true, needsConfirmation: false };
	}
	// Email confirmation required
	return { success: true, needsConfirmation: true };
}

export async function resetPasswordForEmail(email: string): Promise<{ success: boolean; error?: string }> {
	const { error } = await supabase.auth.resetPasswordForEmail(email, {
		redirectTo: typeof window !== 'undefined' ? window.location.origin + '/login' : '/login',
	});
	if (error) {
		return { success: false, error: error.message };
	}
	return { success: true };
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

/**
 * Sign in with a Google ID token (from Google One Tap).
 * Returns true on success, false if the account is not registered as staff.
 */
export async function signInWithGoogleIdToken(credential: string): Promise<boolean> {
	authState.error = null;
	const { data, error } = await supabase.auth.signInWithIdToken({
		provider: 'google',
		token: credential,
	});
	if (error) {
		authState.error = error.message;
		return false;
	}
	if (data.session?.user?.email) {
		authState.user = data.session.user;
		authState.session = data.session;
		await handleSignedIn(data.session.user.email, data.session.user.id);
		return authState.isStaff;
	}
	return false;
}

export async function signOut(): Promise<void> {
	await supabase.auth.signOut();
	authState.user = null;
	authState.session = null;
	authState.staff = null;
	authState.isStaff = false;
	authState.isAdmin = false;
	authState.permissions = [];
	authState.role = null;
	authState.error = null;
	authState.organizationId = null;
	authState.organization = null;
	clearPendingStaffEmail();
	clearStaffPeriod();
	clearOrgId();
	clearStaffCache();
	// Reload guest permissions for non-logged-in view
	loadGuestPermissions();
	// Redirect to main page
	if (typeof window !== 'undefined') {
		window.location.href = '/';
	}
}

export function getAuthHeaders(): Record<string, string> {
	const headers: Record<string, string> = {};
	if (authState.session?.access_token) {
		headers['Authorization'] = `Bearer ${authState.session.access_token}`;
	}
	if (authState.organizationId) {
		headers['X-Organization-Id'] = authState.organizationId;
	}
	return headers;
}

/**
 * Force a Supabase token refresh and update authState.session.
 * Returns true if a fresh session was obtained, false if it failed or there was no session.
 */
export async function refreshAuthToken(): Promise<boolean> {
	try {
		const { data, error } = await supabase.auth.refreshSession();
		if (error || !data.session) return false;
		authState.session = data.session;
		authState.user = data.session.user;
		return true;
	} catch {
		return false;
	}
}

/**
 * Returns true if the current session token expires within the given number of seconds.
 * Useful to proactively reload data before the token goes stale.
 */
export function isTokenExpiringSoon(withinSeconds = 300): boolean {
	const expiresAt = authState.session?.expires_at; // Unix timestamp in seconds
	if (!expiresAt) return false;
	return expiresAt - Math.floor(Date.now() / 1000) < withinSeconds;
}
