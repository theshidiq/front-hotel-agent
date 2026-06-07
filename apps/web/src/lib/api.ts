import { getAuthHeaders, refreshAuthToken } from './auth.svelte';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
	return { ...extra, ...getAuthHeaders() };
}

// ── Allergen cache ─────────────────────────────────────────────────────────
// Allergens are nearly static (changed only by admins). Cache for 10 minutes
// across all pages so /front-desk, /menu, and /kitchen-production share one fetch.
const ALLERGEN_TTL_MS = 10 * 60 * 1000;
interface AllergenShape { id: string; name: string; category: string; source: string }
let allergenCache: { data: AllergenShape[]; expiresAt: number } | null = null;
let allergenPending: Promise<AllergenShape[]> | null = null;
// ────────────────────────────────────────────────────────────────────────────

/** Fetch wrapper that retries once on 401 by refreshing the Supabase token. */
async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
	const response = await fetch(url, options);
	if (response.status === 401) {
		const refreshed = await refreshAuthToken();
		if (refreshed) {
			return fetch(url, {
				...options,
				headers: { ...(options.headers as Record<string, string>), ...getAuthHeaders() },
			});
		}
	}
	return response;
}

export interface Allergen {
	id: string;
	name: string;
	category: string;
	source: string;
}

export interface Product {
	id: string;
	name: string;
	brand: string | null;
	category: string | null;
	ingredients_raw: string | null;
	nutrition_per_100g: Record<string, number> | null;
	storage_instructions: string | null;
	preparation_instructions: string | null;
	is_vegetarian: boolean;
	is_vegan: boolean;
	is_halal: boolean;
	is_gluten_free: boolean;
	image_url: string | null;
	allergens: { id: string; name: string; category: string; source: string }[];
}

export interface ScanResult {
	scan_session: {
		id: string;
		status: string;
		image_url: string;
	};
	product: Product;
	existing_product?: {
		id: string;
		name: string;
		brand: string | null;
		image_url: string | null;
	};
}

export async function scanProduct(imageUrl: string): Promise<ScanResult> {
	const response = await apiFetch(`${API_URL}/scan`, {
		method: 'POST',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify({ imageUrl }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Scan failed');
	}

	return response.json();
}

export interface ScanExtractResult {
	scan_session: {
		id: string;
		status: string;
		image_url: string;
	};
	extracted_data: {
		product_name: string | null;
		brand: string | null;
		category: string | null;
		ingredients_raw: string | null;
		nutrition_per_100g: { calories?: number; protein?: number; fat?: number; carbs?: number; sodium?: number } | null;
		storage_instructions: string | null;
		preparation_instructions: string | null;
		is_vegetarian: boolean;
		is_vegan: boolean;
		is_halal: boolean;
		is_gluten_free: boolean;
	};
	matched_allergens: { id: string; name: string; category: string; source: string }[];
	image_url: string;
}

export async function scanExtract(imageUrl: string, signal?: AbortSignal): Promise<ScanExtractResult> {
	const response = await apiFetch(`${API_URL}/scan/extract`, {
		method: 'POST',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify({ imageUrl }),
		signal,
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Scan failed');
	}

	return response.json();
}

export async function scanExtractUpload(file: File, signal?: AbortSignal): Promise<ScanExtractResult> {
	const formData = new FormData();
	formData.append('file', file);

	const response = await apiFetch(`${API_URL}/scan/extract-upload`, {
		method: 'POST',
		headers: authHeaders(),
		body: formData,
		signal,
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Scan failed');
	}

	return response.json();
}

export async function getProducts(opts?: { search?: string; category?: string }): Promise<Product[]> {
	const params = new URLSearchParams();
	if (opts?.search) params.set('search', opts.search);
	if (opts?.category) params.set('category', opts.category);
	const qs = params.size > 0 ? `?${params}` : '';
	const response = await apiFetch(`${API_URL}/products${qs}`, { headers: authHeaders() });

	if (!response.ok) {
		throw new Error('Failed to fetch products');
	}

	return response.json();
}

export interface UpdateProductData {
	name?: string;
	brand?: string | null;
	category?: string | null;
	ingredients_raw?: string | null;
	storage_instructions?: string | null;
	preparation_instructions?: string | null;
	is_vegetarian?: boolean;
	is_vegan?: boolean;
	is_halal?: boolean;
	is_gluten_free?: boolean;
	allergen_ids?: string[];
}

export interface CreateProductData {
	name: string;
	brand?: string | null;
	category?: string | null;
	ingredients_raw?: string | null;
	storage_instructions?: string | null;
	preparation_instructions?: string | null;
	is_vegetarian?: boolean;
	is_vegan?: boolean;
	is_halal?: boolean;
	is_gluten_free?: boolean;
	allergen_ids?: string[];
	image_url?: string | null;
}

export async function updateProduct(id: string, data: UpdateProductData): Promise<Product> {
	const response = await apiFetch(`${API_URL}/products/${id}`, {
		method: 'PUT',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Update failed');
	}

	return response.json();
}

export async function deleteProduct(id: string): Promise<void> {
	const response = await apiFetch(`${API_URL}/products/${id}`, {
		method: 'DELETE',
		headers: authHeaders(),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Delete failed');
	}
}

export async function createProduct(data: CreateProductData): Promise<Product> {
	const response = await apiFetch(`${API_URL}/products`, {
		method: 'POST',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Create failed');
	}

	return response.json();
}

export async function getAllergens(): Promise<Allergen[]> {
	const now = Date.now();

	// Return cached data if still fresh
	if (allergenCache && now < allergenCache.expiresAt) {
		return allergenCache.data as Allergen[];
	}

	// Deduplicate concurrent callers — return the same in-flight request
	if (allergenPending) return allergenPending;

	allergenPending = apiFetch(`${API_URL}/allergens`, { headers: authHeaders() })
		.then(async (response) => {
			if (!response.ok) throw new Error('Failed to fetch allergens');
			const data: AllergenShape[] = await response.json();
			allergenCache = { data, expiresAt: Date.now() + ALLERGEN_TTL_MS };
			allergenPending = null;
			return data as Allergen[];
		})
		.catch((err) => {
			allergenPending = null;
			throw err;
		});

	return allergenPending;
}

export async function createAllergen(name: string, category: string): Promise<Allergen> {
	const response = await apiFetch(`${API_URL}/allergens`, {
		method: 'POST',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify({ name, category }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Create allergen failed');
	}

	allergenCache = null; // invalidate so next fetch is fresh
	return response.json();
}

export async function deleteAllergen(id: string): Promise<void> {
	const response = await apiFetch(`${API_URL}/allergens/${id}`, {
		method: 'DELETE',
		headers: authHeaders(),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Delete allergen failed');
	}

	allergenCache = null; // invalidate so next fetch is fresh
}

// Category Types
export interface Category {
	id: string;
	organization_id: string;
	type: 'product' | 'menu';
	name: string;
	value: string;
	image_url: string | null;
	description: string | null;
	price: number | null;
	created_at: string;
}

export interface UpdateCategoryData {
	name?: string;
	image_url?: string | null;
	description?: string | null;
	price?: number | null;
}

export async function getCategories(type: 'product' | 'menu'): Promise<Category[]> {
	const response = await apiFetch(`${API_URL}/categories?type=${type}`, { headers: authHeaders() });

	if (!response.ok) {
		throw new Error('Failed to fetch categories');
	}

	return response.json();
}

export async function createCategoryApi(name: string, type: 'product' | 'menu'): Promise<Category> {
	const response = await apiFetch(`${API_URL}/categories`, {
		method: 'POST',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify({ name, type }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Create category failed');
	}

	return response.json();
}

export async function updateCategoryApi(id: string, data: UpdateCategoryData): Promise<Category> {
	const response = await apiFetch(`${API_URL}/categories/${id}`, {
		method: 'PUT',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Update category failed');
	}

	return response.json();
}

export async function deleteCategoryApi(id: string): Promise<void> {
	const response = await apiFetch(`${API_URL}/categories/${id}`, {
		method: 'DELETE',
		headers: authHeaders(),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Delete category failed');
	}
}

// Seasonal Menu Types
export interface SeasonalMenu {
	id: string;
	organization_id: string;
	name: string;
	start_date: string | null;
	end_date: string | null;
	is_active: boolean;
	sort_order: number;
	created_at: string;
}

export interface CreateSeasonalMenuData {
	name: string;
	start_date?: string;
	end_date?: string;
}

export interface UpdateSeasonalMenuData {
	name?: string;
	start_date?: string;
	end_date?: string;
	is_active?: boolean;
}

export async function getSeasonalMenus(): Promise<SeasonalMenu[]> {
	const response = await apiFetch(`${API_URL}/seasonal-menus`, { headers: authHeaders() });
	if (!response.ok) {
		throw new Error('Failed to fetch seasonal menus');
	}
	return response.json();
}

export async function createSeasonalMenu(data: CreateSeasonalMenuData): Promise<SeasonalMenu> {
	const response = await apiFetch(`${API_URL}/seasonal-menus`, {
		method: 'POST',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Create seasonal menu failed');
	}
	return response.json();
}

export async function updateSeasonalMenu(
	id: string,
	data: UpdateSeasonalMenuData
): Promise<SeasonalMenu> {
	const response = await apiFetch(`${API_URL}/seasonal-menus/${id}`, {
		method: 'PUT',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Update seasonal menu failed');
	}
	return response.json();
}

export async function deleteSeasonalMenu(id: string): Promise<void> {
	const response = await apiFetch(`${API_URL}/seasonal-menus/${id}`, {
		method: 'DELETE',
		headers: authHeaders(),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Delete seasonal menu failed');
	}
}

// Menu Group Types
export interface AllowedCourse {
	id: string;
	category_id: string;
	category_name: string;
	category_value: string;
}

export interface MenuGroup {
	id: string;
	organization_id: string;
	name: string;
	display_title: string | null;
	seasonal_menu_id: string | null;
	kids_group_ids: string[];
	stay_period_nights: number[] | null;
	sort_order: number;
	created_at: string;
	allowed_courses: AllowedCourse[];
}

export interface CreateMenuGroupData {
	name: string;
	display_title?: string;
	seasonal_menu_id?: string;
	course_ids?: string[];
}

export interface UpdateMenuGroupData {
	name?: string;
	display_title?: string | null;
	seasonal_menu_id?: string | null;
	kids_group_id?: string | null;
	course_ids?: string[];
}

export async function getMenuGroups(seasonalMenuId?: string, stayPeriodNights?: number): Promise<MenuGroup[]> {
	const params = new URLSearchParams();
	if (seasonalMenuId) params.append('seasonal_menu_id', seasonalMenuId);
	if (stayPeriodNights !== undefined) params.append('stay_period_nights', stayPeriodNights.toString());

	const queryString = params.toString();
	const url = queryString ? `${API_URL}/menu-groups?${queryString}` : `${API_URL}/menu-groups`;
	const response = await apiFetch(url, { headers: authHeaders() });

	if (!response.ok) {
		throw new Error('Failed to fetch menu groups');
	}

	return response.json();
}

export async function createMenuGroup(data: CreateMenuGroupData): Promise<MenuGroup> {
	const response = await apiFetch(`${API_URL}/menu-groups`, {
		method: 'POST',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Create menu group failed');
	}

	return response.json();
}

export async function updateMenuGroup(id: string, data: UpdateMenuGroupData): Promise<MenuGroup> {
	const response = await apiFetch(`${API_URL}/menu-groups/${id}`, {
		method: 'PUT',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Update menu group failed');
	}

	return response.json();
}

export async function deleteMenuGroup(id: string): Promise<void> {
	const response = await apiFetch(`${API_URL}/menu-groups/${id}`, {
		method: 'DELETE',
		headers: authHeaders(),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Delete menu group failed');
	}
}

// Menu Types
export interface MenuProduct {
	id: string;
	name: string;
	brand: string | null;
	category: string | null;
	allergens: Allergen[];
}

export interface Menu {
	id: string;
	organization_id: string;
	name: string;
	description: string | null;
	price: number | null;
	category: string | null;
	seasonal_menu_id: string | null;
	menu_group_id: string | null;
	image_url: string | null;
	is_available: boolean;
	products: MenuProduct[];
	allergens: Allergen[]; // Derived from products
	created_at: string;
	updated_at: string;
}

export interface CreateMenuData {
	name: string;
	description?: string | null;
	price?: number | null;
	category?: string | null;
	seasonal_menu_id?: string | null;
	menu_group_id?: string | null;
	image_url?: string | null;
	is_available?: boolean;
	product_ids?: string[];
}

export interface UpdateMenuData extends Partial<CreateMenuData> {}

// Menu API Functions
export async function getMenus(): Promise<Menu[]> {
	const response = await apiFetch(`${API_URL}/menus`, { headers: authHeaders() });

	if (!response.ok) {
		throw new Error('Failed to fetch menus');
	}

	return response.json();
}

export async function getMenu(id: string): Promise<Menu> {
	const response = await apiFetch(`${API_URL}/menus/${id}`, { headers: authHeaders() });

	if (!response.ok) {
		throw new Error('Failed to fetch menu');
	}

	return response.json();
}

export async function createMenu(data: CreateMenuData): Promise<Menu> {
	const response = await apiFetch(`${API_URL}/menus`, {
		method: 'POST',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Create failed');
	}

	return response.json();
}

export async function updateMenu(id: string, data: UpdateMenuData): Promise<Menu> {
	const response = await apiFetch(`${API_URL}/menus/${id}`, {
		method: 'PUT',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Update failed');
	}

	return response.json();
}

export async function deleteMenu(id: string): Promise<void> {
	const response = await apiFetch(`${API_URL}/menus/${id}`, {
		method: 'DELETE',
		headers: authHeaders(),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Delete failed');
	}
}

// ============ ROOMS ============

export interface Room {
	id: string;
	organization_id: string;
	room_number: string;
	room_name: string | null;
	room_type: string | null;
	capacity: number;
	floor: number | null;
	status: 'available' | 'occupied' | 'cleaning' | 'maintenance' | 'out_of_order';
	current_reservation_id: string | null;
	image_url: string | null;
	description: string | null;
	amenities: string[] | null;
	created_at: string;
	updated_at: string;
}

export async function getRooms(): Promise<Room[]> {
	const response = await apiFetch(`${API_URL}/rooms`, { headers: authHeaders() });

	if (!response.ok) {
		throw new Error('Failed to fetch rooms');
	}

	return response.json();
}

export async function getRoom(id: string): Promise<Room> {
	const response = await apiFetch(`${API_URL}/rooms/${id}`, { headers: authHeaders() });

	if (!response.ok) {
		throw new Error('Failed to fetch room');
	}

	return response.json();
}

export async function updateRoomStatus(
	roomNumber: string,
	status: Room['status'],
	reservationId?: string | null
): Promise<Room> {
	const response = await apiFetch(`${API_URL}/rooms/${roomNumber}/status`, {
		method: 'PATCH',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify({ status, current_reservation_id: reservationId }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Update room status failed');
	}

	return response.json();
}

// ============ RESERVATIONS ============

export interface Reservation {
	id: string;
	organization_id: string;
	booking_source: string;
	external_booking_id: string | null;
	guest_token: string | null;
	token_expires_at: string | null;
	guest_name: string;
	guest_name_kana: string | null;
	email: string | null;
	phone: string | null;
	party_size: number;
	room_number: string;
	room_name: string | null;
	check_in_date: string;
	check_out_date: string;
	plan_name: string | null;
	meal_plan: string | null;
	dinner_time: string | null;
	breakfast_time: string | null;
	allergen_ids: string[]; // DEPRECATED: Use allergen_details instead
	allergen_details?: Array<{
		allergen_id: string;
		person_count: number;
		allergen?: Allergen;
	}>;
	allergens?: Allergen[];
	dietary_notes: string | null;
	special_requests: string | null;
	status: 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
	checked_in_at: string | null;
	checked_out_at: string | null;
	checked_in_by: string | null;
	created_at: string;
	updated_at: string;
	total_nights: number;
	current_stay_night: number;
}

export interface AllergenWithCount {
	allergen_id: string;
	person_count: number;
}

export interface CheckInData {
	dinner_time?: string;
	breakfast_time?: string;
	allergen_ids?: string[]; // DEPRECATED: Use allergen_details instead
	allergen_details?: AllergenWithCount[];
	dietary_notes?: string;
	special_requests?: string;
	checked_in_by?: string;
}

export interface SearchReservationParams {
	name?: string;
	phone?: string;
	date?: string;
}

export interface CreateReservationData {
	booking_source: string;
	external_booking_id?: string;
	guest_name: string;
	guest_name_kana?: string;
	email?: string;
	phone?: string;
	party_size: number;
	room_number: string;
	room_name?: string;
	check_in_date: string;
	check_out_date: string;
	plan_name?: string;
	meal_plan?: string;
	status?: string;
	allergen_details?: AllergenWithCount[];
}

export async function getReservations(date?: string, status?: string): Promise<Reservation[]> {
	const params = new URLSearchParams();
	if (date) params.append('date', date);
	if (status) params.append('status', status);

	const url = params.toString() ? `${API_URL}/reservations?${params}` : `${API_URL}/reservations`;
	const response = await apiFetch(url, { headers: authHeaders() });

	if (!response.ok) {
		throw new Error('Failed to fetch reservations');
	}

	return response.json();
}

export async function getTodayReservations(): Promise<Reservation[]> {
	const response = await apiFetch(`${API_URL}/reservations/today`, { headers: authHeaders() });

	if (!response.ok) {
		throw new Error('Failed to fetch today reservations');
	}

	return response.json();
}

export async function getReservation(id: string): Promise<Reservation> {
	const response = await apiFetch(`${API_URL}/reservations/${id}`, { headers: authHeaders() });

	if (!response.ok) {
		throw new Error('Failed to fetch reservation');
	}

	return response.json();
}

export async function getReservationByQR(token: string): Promise<Reservation> {
	const response = await fetch(`${API_URL}/reservations/qr/${token}`);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to fetch reservation by QR');
	}

	return response.json();
}

export async function searchReservations(params: SearchReservationParams): Promise<Reservation[]> {
	const searchParams = new URLSearchParams();
	if (params.name) searchParams.append('name', params.name);
	if (params.phone) searchParams.append('phone', params.phone);
	if (params.date) searchParams.append('date', params.date);

	const response = await fetch(`${API_URL}/reservations/search?${searchParams}`);

	if (!response.ok) {
		throw new Error('Failed to search reservations');
	}

	return response.json();
}

export async function createReservation(data: CreateReservationData): Promise<Reservation> {
	const response = await apiFetch(`${API_URL}/reservations`, {
		method: 'POST',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Create reservation failed');
	}

	return response.json();
}

export async function checkInReservation(id: string, data: CheckInData): Promise<Reservation> {
	const response = await apiFetch(`${API_URL}/reservations/${id}/check-in`, {
		method: 'PATCH',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Check-in failed');
	}

	return response.json();
}

export async function checkOutReservation(id: string): Promise<Reservation> {
	const response = await apiFetch(`${API_URL}/reservations/${id}/check-out`, {
		method: 'PATCH',
		headers: authHeaders(),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Check-out failed');
	}

	return response.json();
}

export async function deleteAllReservations(): Promise<{ deleted: number }> {
	const response = await apiFetch(`${API_URL}/reservations/test-data`, {
		method: 'DELETE',
		headers: authHeaders(),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Delete all reservations failed');
	}

	return response.json();
}

export interface GuestUpdateData {
	allergen_ids?: string[];
	dietary_notes?: string;
	special_requests?: string;
}

export async function updateReservationByToken(
	token: string,
	data: GuestUpdateData
): Promise<Reservation> {
	const response = await fetch(`${API_URL}/reservations/qr/${token}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Update failed');
	}

	return response.json();
}

// ============ GUEST ALERTS ============

export interface GuestAlert {
	id: string;
	organization_id: string;
	reservation_id: string;
	alert_type: 'check_in' | 'allergy_update' | 'special_request' | 'other';
	room_number: string;
	guest_name: string;
	party_size: number;
	dinner_time: string | null;
	allergen_ids: string[];
	allergens?: Allergen[];
	dietary_notes: string | null;
	message: string | null;
	status: 'new' | 'acknowledged' | 'resolved';
	acknowledged_by: string | null;
	acknowledged_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface CreateGuestAlertData {
	reservation_id: string;
	alert_type: GuestAlert['alert_type'];
	room_number: string;
	guest_name: string;
	party_size: number;
	dinner_time?: string;
	allergen_ids?: string[];
	message?: string;
}

export async function getGuestAlerts(status?: string): Promise<GuestAlert[]> {
	const url = status ? `${API_URL}/guest-alerts?status=${status}` : `${API_URL}/guest-alerts`;
	const response = await apiFetch(url, { headers: authHeaders() });

	if (!response.ok) {
		throw new Error('Failed to fetch guest alerts');
	}

	return response.json();
}

export async function getNewGuestAlerts(): Promise<GuestAlert[]> {
	const response = await apiFetch(`${API_URL}/guest-alerts/new`, { headers: authHeaders() });

	if (!response.ok) {
		throw new Error('Failed to fetch new guest alerts');
	}

	return response.json();
}

export async function getGuestAlert(id: string): Promise<GuestAlert> {
	const response = await apiFetch(`${API_URL}/guest-alerts/${id}`, { headers: authHeaders() });

	if (!response.ok) {
		throw new Error('Failed to fetch guest alert');
	}

	return response.json();
}

export async function createGuestAlert(data: CreateGuestAlertData): Promise<GuestAlert> {
	const response = await apiFetch(`${API_URL}/guest-alerts`, {
		method: 'POST',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Create guest alert failed');
	}

	return response.json();
}

export async function acknowledgeGuestAlert(id: string, acknowledgedBy?: string): Promise<GuestAlert> {
	const response = await apiFetch(`${API_URL}/guest-alerts/${id}/acknowledge`, {
		method: 'PATCH',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify({ acknowledged_by: acknowledgedBy }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Acknowledge alert failed');
	}

	return response.json();
}

export async function resolveGuestAlert(id: string): Promise<GuestAlert> {
	const response = await apiFetch(`${API_URL}/guest-alerts/${id}/resolve`, {
		method: 'PATCH',
		headers: authHeaders(),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Resolve alert failed');
	}

	return response.json();
}

// ── Staff ─────────────────────────────────────────────────

export interface PeriodJson {
	year: number;
	month: number;
	day: number;
}

export interface StaffMember {
	id: string;
	name: string;
	email: string | null;
	position: string | null;
	department_id: string | null;
	position_id: string | null;
	is_admin: boolean;
	role_id: string | null;
	is_active: boolean;
	employment_type: string | null;
	start_period: PeriodJson | null;
	end_period: PeriodJson | null;
	created_at: string;
}

export interface CreateStaffData {
	name: string;
	email?: string;
	position?: string;
	department_id?: string | null;
	position_id?: string | null;
}

export async function getStaffs(): Promise<StaffMember[]> {
	const response = await apiFetch(`${API_URL}/staffs`, { headers: authHeaders() });
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to fetch staffs');
	}
	return response.json();
}

export async function updateStaffEmail(id: string, email: string): Promise<StaffMember> {
	const response = await apiFetch(`${API_URL}/staffs/${id}/email`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email }),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to update staff email');
	}
	return response.json();
}

export async function createStaff(data: CreateStaffData): Promise<StaffMember> {
	const response = await apiFetch(`${API_URL}/staffs`, {
		method: 'POST',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Create staff failed');
	}
	return response.json();
}

export async function updateStaffRole(id: string, roleId: string | null): Promise<StaffMember> {
	const response = await apiFetch(`${API_URL}/staffs/${id}/role`, {
		method: 'PATCH',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify({ role_id: roleId }),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to update staff role');
	}
	return response.json();
}

export async function updateStaffAdmin(id: string, isAdmin: boolean): Promise<StaffMember> {
	const response = await apiFetch(`${API_URL}/staffs/${id}/admin`, {
		method: 'PATCH',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify({ is_admin: isAdmin }),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to update admin status');
	}
	return response.json();
}

export async function getAllStaffs(): Promise<StaffMember[]> {
	const response = await apiFetch(`${API_URL}/staffs/all`, {
		headers: authHeaders(),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to fetch all staff');
	}
	return response.json();
}

export async function updateStaffOrg(
	id: string,
	data: { name?: string; position?: string; department_id?: string | null; position_id?: string | null; is_active?: boolean; employment_type?: string | null; start_period?: PeriodJson | null; end_period?: PeriodJson | null }
): Promise<StaffMember> {
	const response = await apiFetch(`${API_URL}/staffs/${id}/org`, {
		method: 'PATCH',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to update staff');
	}
	return response.json();
}

export async function deactivateStaff(id: string): Promise<void> {
	const response = await apiFetch(`${API_URL}/staffs/${id}`, {
		method: 'DELETE',
		headers: authHeaders(),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to deactivate staff');
	}
}

export async function deleteStaffPermanent(id: string): Promise<void> {
	const response = await apiFetch(`${API_URL}/staffs/${id}/permanent`, {
		method: 'DELETE',
		headers: authHeaders(),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to permanently delete staff');
	}
}

// ── Departments & Positions ────────────────────────────────

export interface OrgPosition {
	id: string;
	organization_id: string;
	department_id: string;
	name: string;
	sort_order: number;
	created_at: string;
}

export interface OrgDepartment {
	id: string;
	organization_id: string;
	name: string;
	color: string;
	sort_order: number;
	created_at: string;
	positions: OrgPosition[];
}

export async function getDepartments(): Promise<OrgDepartment[]> {
	const response = await apiFetch(`${API_URL}/departments`, {
		headers: authHeaders(),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to fetch departments');
	}
	return response.json();
}

export async function createDepartment(name: string, color: string): Promise<OrgDepartment> {
	const response = await apiFetch(`${API_URL}/departments`, {
		method: 'POST',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify({ name, color }),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Create department failed');
	}
	return response.json();
}

export async function updateDepartment(id: string, data: { name?: string; color?: string }): Promise<OrgDepartment> {
	const response = await apiFetch(`${API_URL}/departments/${id}`, {
		method: 'PUT',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Update department failed');
	}
	return response.json();
}

export async function deleteDepartment(id: string): Promise<void> {
	const response = await apiFetch(`${API_URL}/departments/${id}`, {
		method: 'DELETE',
		headers: authHeaders(),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Delete department failed');
	}
}

export async function createPosition(departmentId: string, name: string): Promise<OrgPosition> {
	const response = await apiFetch(`${API_URL}/departments/${departmentId}/positions`, {
		method: 'POST',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify({ name }),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Create position failed');
	}
	return response.json();
}

export async function updatePosition(id: string, data: { name?: string }): Promise<OrgPosition> {
	const response = await apiFetch(`${API_URL}/departments/positions/${id}`, {
		method: 'PUT',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Update position failed');
	}
	return response.json();
}

export async function deletePosition(id: string): Promise<void> {
	const response = await apiFetch(`${API_URL}/departments/positions/${id}`, {
		method: 'DELETE',
		headers: authHeaders(),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Delete position failed');
	}
}

// ── Roles ─────────────────────────────────────────────────

export interface Role {
	id: string;
	organization_id: string;
	name: string;
	description: string | null;
	is_default: boolean;
	created_at: string;
	permissions: string[];
}

export interface CreateRoleData {
	name: string;
	description?: string;
	permissions?: string[];
}

export interface UpdateRoleData {
	name?: string;
	description?: string;
}

export async function getRoles(): Promise<Role[]> {
	const response = await apiFetch(`${API_URL}/roles`, {
		headers: authHeaders(),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to fetch roles');
	}
	return response.json();
}

export async function getRolePermissionsList(): Promise<string[]> {
	const response = await apiFetch(`${API_URL}/roles/permissions`, {
		headers: authHeaders(),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to fetch permissions list');
	}
	return response.json();
}

export async function createRole(data: CreateRoleData): Promise<Role> {
	const response = await apiFetch(`${API_URL}/roles`, {
		method: 'POST',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Create role failed');
	}
	return response.json();
}

export async function updateRoleApi(id: string, data: UpdateRoleData): Promise<Role> {
	const response = await apiFetch(`${API_URL}/roles/${id}`, {
		method: 'PUT',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Update role failed');
	}
	return response.json();
}

export async function updateRolePermissions(id: string, permissions: string[]): Promise<Role> {
	const response = await apiFetch(`${API_URL}/roles/${id}/permissions`, {
		method: 'PUT',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify({ permissions }),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Update role permissions failed');
	}
	return response.json();
}

export async function deleteRole(id: string): Promise<void> {
	const response = await apiFetch(`${API_URL}/roles/${id}`, {
		method: 'DELETE',
		headers: authHeaders(),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Delete role failed');
	}
}

export async function getDefaultRole(): Promise<Role | null> {
	const response = await fetch(`${API_URL}/roles/default`);
	if (!response.ok) return null;
	const data = await response.json();
	return data || null;
}

export async function setRoleAsDefault(id: string): Promise<Role> {
	const response = await apiFetch(`${API_URL}/roles/${id}/default`, {
		method: 'PATCH',
		headers: authHeaders(),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to set default role');
	}
	return response.json();
}

export async function clearRoleDefault(id: string): Promise<void> {
	const response = await apiFetch(`${API_URL}/roles/${id}/default`, {
		method: 'DELETE',
		headers: authHeaders(),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to clear default role');
	}
}

// Product Alternates
export interface ProductAlternate {
	id: string;
	organization_id: string;
	product_id: string;
	alternate_product_id: string;
	created_at: string;
}

export async function getProductAlternates(): Promise<ProductAlternate[]> {
	const response = await apiFetch(`${API_URL}/product-alternates`, {
		headers: authHeaders(),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to fetch product alternates');
	}
	return response.json();
}

export async function addProductAlternate(productId: string, alternateProductId: string): Promise<ProductAlternate> {
	const response = await apiFetch(`${API_URL}/product-alternates`, {
		method: 'POST',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify({ product_id: productId, alternate_product_id: alternateProductId }),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to add product alternate');
	}
	return response.json();
}

export async function removeProductAlternate(productId: string, alternateProductId: string): Promise<void> {
	const response = await apiFetch(`${API_URL}/product-alternates/${productId}/${alternateProductId}`, {
		method: 'DELETE',
		headers: authHeaders(),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to remove product alternate');
	}
}

// ── Menu Scan (handwritten menu OCR) ──────────────────────────────────────────

export interface ScannedMenuCourse {
	name: string;
	reading: string | null;
	description: string | null;
	category: string;
	sort_order: number;
	/**
	 * Optional sub-column layout for the menu-scan editor: each inner array is a
	 * sub-column of dish texts. Persisted in drafts so the chef's manual column
	 * splits survive a refresh. Ignored by menu creation (which uses description).
	 */
	cols?: string[][];
}

export interface MenuScanExtractResult {
	courses: ScannedMenuCourse[];
	menu_title: string | null;
	image_url: string;
	session_id?: string;
}

export interface MenuScanDraft {
	session_id: string;
	menu_group_id: string;
	menu_title: string | null;
	courses: ScannedMenuCourse[];
	image_url: string;
	created_at: string;
	updated_at: string;
}

export async function menuScanExtract(file: File, menuGroupId: string, signal?: AbortSignal): Promise<MenuScanExtractResult> {
	const formData = new FormData();
	formData.append('file', file);
	formData.append('menu_group_id', menuGroupId);
	const response = await apiFetch(`${API_URL}/menu-scan/extract`, {
		method: 'POST',
		headers: authHeaders(),
		body: formData,
		signal,
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Menu scan extraction failed');
	}
	return response.json();
}

export async function menuScanGetDrafts(): Promise<MenuScanDraft[]> {
	const response = await apiFetch(`${API_URL}/menu-scan/drafts`, {
		headers: authHeaders(),
	});
	if (!response.ok) return [];
	return response.json();
}

export async function menuScanSaveDraft(data: {
	menu_group_id: string;
	menu_title?: string | null;
	courses: ScannedMenuCourse[];
	image_url?: string;
	session_id?: string | null;
}): Promise<{ session_id: string }> {
	const response = await apiFetch(`${API_URL}/menu-scan/drafts`, {
		method: 'POST',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to save draft');
	}
	return response.json();
}

export async function menuScanDeleteDraft(sessionId: string): Promise<void> {
	await apiFetch(`${API_URL}/menu-scan/drafts/${sessionId}`, {
		method: 'DELETE',
		headers: authHeaders(),
	});
}

export interface MenuScanConfirmData {
	courses: { name: string; description?: string | null; category?: string | null }[];
	menu_group_id: string;
	seasonal_menu_id?: string | null;
	draft_session_id?: string | null;
}

export async function menuScanConfirm(data: MenuScanConfirmData): Promise<Menu[]> {
	const response = await apiFetch(`${API_URL}/menu-scan/confirm`, {
		method: 'POST',
		headers: authHeaders({ 'Content-Type': 'application/json' }),
		body: JSON.stringify(data),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Menu scan confirm failed');
	}
	return response.json();
}
