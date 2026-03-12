<script lang="ts">
	import {
		getReservations,
		getRooms,
		getNewGuestAlerts,
		acknowledgeGuestAlert,
		checkInReservation,
		checkOutReservation,
		getAllergens,
		getReservationByQR,
		searchReservations,
		createReservation,
		deleteAllReservations,

		type Reservation,
		type Room,
		type GuestAlert,
		type Allergen,
		type CheckInData,

	} from "$lib/api";
	import { onMount, onDestroy } from "svelte";
	import Sidebar from "$lib/components/Sidebar.svelte";
	import { authState, can } from "$lib/auth.svelte";
	import { supabase } from "$lib/supabase";

	const isStaff = $derived(authState.isStaff);

	// Navigation
	type NavItem = "reservations" | "rooms" | "notifications";
	let activeNav = $state<NavItem>("reservations");

	// Permission-based nav: auto-select first available tab
	const canViewReservations = $derived(can("reservations.view"));
	const canViewRooms = $derived(can("rooms.view"));
	const canViewNotifications = $derived(can("notifications.view"));

	// Sidebar
	let sidebarCollapsed = $state(false);
	let sidebarMobileOpen = $state(false);
	const sidebarSections = $derived.by(() => {
		const frontDeskItems: {
			icon: string;
			label: string;
			active: boolean;
			href?: string;
			onclick?: () => void;
			badge?: number;
			badgeVariant?: "alert";
		}[] = [];
		if (canViewReservations) {
			frontDeskItems.push({
				icon: "calendar_today",
				label: "予約管理",
				active: activeNav === "reservations",
				onclick: () => (activeNav = "reservations"),
			});
		}
		if (canViewRooms) {
			frontDeskItems.push({
				icon: "door_open",
				label: "客室状況",
				active: activeNav === "rooms",
				onclick: () => (activeNav = "rooms"),
			});
		}
		if (canViewNotifications) {
			frontDeskItems.push({
				icon: "notifications",
				label: "通知",
				badge: alerts.length > 0 ? alerts.length : undefined,
				badgeVariant: "alert" as const,
				active: activeNav === "notifications",
				onclick: () => (activeNav = "notifications"),
			});
		}
		// Kitchen production link
		frontDeskItems.push({
			icon: "restaurant",
			label: "厨房生産",
			href: "/kitchen-production",
			active: false,
		});

		const sections: { label: string; items: any[] }[] = [];

		// Dashboard home link always at top
		sections.push({
			label: "ホーム",
			items: [
				{
					icon: "dashboard",
					label: "ダッシュボード",
					href: "/dashboard",
					active: false,
				},
			],
		});

		if (frontDeskItems.length > 0) {
			sections.push({ label: "フロント", items: frontDeskItems });
		}
		sections.push({
			label: "食材管理",
			items: [
				{
					icon: "menu_book",
					label: "メニュー・商品管理",
					href: "/menu",
					active: false,
				},
			],
		});
		sections.push({
			label: "スタッフ",
			items: [
				{
					icon: "calendar_month",
					label: "シフトカレンダー",
					href: "/staff/calendar",
					active: false,
				},
			],
		});
		return sections;
	});

	// State
	let reservations = $state<Reservation[]>([]);
	let rooms = $state<Room[]>([]);
	let alerts = $state<GuestAlert[]>([]);
	let allergens = $state<Allergen[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Room status options
	const roomStatusOptions = [
		{ value: "all", label: "全て" },
		{ value: "available", label: "空室" },
		{ value: "occupied", label: "利用中" },
		{ value: "cleaning", label: "清掃中" },
		{ value: "maintenance", label: "メンテナンス中" },
		{ value: "out_of_order", label: "故障中" },
	];

	const roomStatusColors: Record<string, string> = {
		available: "bg-emerald-100 text-emerald-800 border-emerald-200",
		occupied: "bg-blue-100 text-blue-800 border-blue-200",
		cleaning: "bg-amber-100 text-amber-800 border-amber-200",
		maintenance: "bg-purple-100 text-purple-800 border-purple-200",
		out_of_order: "bg-red-100 text-red-800 border-red-200",
	};

	const roomStatusLabels: Record<string, string> = {
		available: "空室",
		occupied: "利用中",
		cleaning: "清掃中",
		maintenance: "メンテナンス",
		out_of_order: "故障中",
	};

	let roomFilterStatus = $state("all");
	let roomSearchQuery = $state("");

	// Derived state for rooms
	let filteredRooms = $derived(
		rooms.filter((room) => {
			if (roomFilterStatus !== "all" && room.status !== roomFilterStatus)
				return false;
			if (roomSearchQuery) {
				const q = roomSearchQuery.toLowerCase();
				return (
					room.room_number.toLowerCase().includes(q) ||
					(room.room_name || "").toLowerCase().includes(q)
				);
			}
			return true;
		}),
	);

	// Derived room stats
	let roomStats = $derived({
		total: rooms.length,
		available: rooms.filter((r) => r.status === "available").length,
		occupied: rooms.filter((r) => r.status === "occupied").length,
		cleaning: rooms.filter((r) => r.status === "cleaning").length,
		maintenance: rooms.filter(
			(r) => r.status === "maintenance" || r.status === "out_of_order",
		).length,
	});

	// Date filter
	type DateFilter = "today" | "past3" | "past7" | "past30" | "all";
	let dateFilter = $state<DateFilter>("today");

	// Filters
	let filterStatus = $state<
		"all" | "confirmed" | "checked_in" | "checked_out"
	>("confirmed");
	let tableSearchQuery = $state("");

	// Date utilities
	function getDateRange(
		filter: DateFilter,
	): { startDate: string; endDate: string } | null {
		const today = new Date();
		const formatDate = (d: Date) => d.toISOString().split("T")[0];

		switch (filter) {
			case "today":
				return {
					startDate: formatDate(today),
					endDate: formatDate(today),
				};
			case "past3": {
				// 3 days total: today + 2 previous days
				const past = new Date(today);
				past.setDate(past.getDate() - 2);
				return {
					startDate: formatDate(past),
					endDate: formatDate(today),
				};
			}
			case "past7": {
				// 7 days total: today + 6 previous days
				const past = new Date(today);
				past.setDate(past.getDate() - 6);
				return {
					startDate: formatDate(past),
					endDate: formatDate(today),
				};
			}
			case "past30": {
				// 30 days total: today + 29 previous days
				const past = new Date(today);
				past.setDate(past.getDate() - 29);
				return {
					startDate: formatDate(past),
					endDate: formatDate(today),
				};
			}
			case "all":
				return null;
		}
	}

	const dateFilterLabels: Record<DateFilter, string> = {
		today: "本日",
		past3: "過去3日間",
		past7: "過去7日間",
		past30: "過去30日間",
		all: "全期間",
	};

	// Check-in wizard state
	let showCheckInWizard = $state(false);
	let checkInStep = $state<1 | 2 | 3>(1);
	let foundReservation = $state<Reservation | null>(null);
	let checkInForm = $state<CheckInData>({
		dinner_time: "",
		breakfast_time: "",
		allergen_ids: [],
		dietary_notes: "",
		special_requests: "",
	});
	let checkInLoading = $state(false);

	// Step 1 - Search state
	let qrInput = $state("");
	let guestNameSearch = $state("");
	let phoneSearch = $state("");
	let searchLoading = $state(false);
	let searchError = $state<string | null>(null);

	// Date filter dropdown state
	let showDateDropdown = $state(false);
	let selectedDate = $state<string | null>(null);

	function selectDateFilter(filter: DateFilter) {
		dateFilter = filter;
		selectedDate = null;
		showDateDropdown = false;
		loadData();
	}

	function selectSpecificDate(dateStr: string) {
		selectedDate = dateStr;
		dateFilter = "today"; // Use 'today' but with custom date
		showDateDropdown = false;
		loadData();
	}

	// Generate calendar days for current month
	function getCalendarDays() {
		const now = new Date();
		const year = now.getFullYear();
		const month = now.getMonth();

		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const startPadding = firstDay.getDay(); // 0 = Sunday

		const days: Array<{
			date: Date;
			dateStr: string;
			isToday: boolean;
			isPast: boolean;
			count?: number;
		}> = [];

		// Add padding for days before month starts
		for (let i = 0; i < startPadding; i++) {
			const d = new Date(year, month, -(startPadding - i - 1));
			days.push({
				date: d,
				dateStr: formatDateISO(d),
				isToday: false,
				isPast: true,
			});
		}

		// Add days of current month
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		for (let day = 1; day <= lastDay.getDate(); day++) {
			const d = new Date(year, month, day);
			d.setHours(0, 0, 0, 0);
			days.push({
				date: d,
				dateStr: formatDateISO(d),
				isToday: d.getTime() === today.getTime(),
				isPast: d < today,
			});
		}

		return days;
	}

	function formatDateISO(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	}

	// Allergen search state
	let allergenSearchQuery = $state("");
	let filteredAllergens = $derived.by(() => {
		if (!allergenSearchQuery.trim()) {
			return allergens;
		}
		const query = allergenSearchQuery.toLowerCase();
		return allergens.filter((a) => a.name.toLowerCase().includes(query));
	});

	// Dashi restriction tracking (allergen ID → dashi also NG boolean)
	let dashiRestrictions = $state<Record<string, boolean>>({});

	// Allergens that support dashi option (seafood-based)
	const DASHI_CAPABLE_ALLERGENS = [
		"魚",
		"かに",
		"えび",
		"いか",
		"たこ",
		"貝類",
	];

	// Helper to check if allergen supports dashi option
	function supportsDashiOption(allergenName: string): boolean {
		return DASHI_CAPABLE_ALLERGENS.some((name) =>
			allergenName.includes(name),
		);
	}

	// Dinner time dropdown state
	let showDinnerTimeDropdown = $state(false);
	const dinnerTimeOptions = [
		{ value: "17:30", label: "17:30" },
		{ value: "18:00", label: "18:00" },
		{ value: "18:30", label: "18:30" },
		{ value: "19:00", label: "19:00" },
		{ value: "19:30", label: "19:30" },
		{ value: "20:00", label: "20:00" },
	];

	function selectDinnerTime(time: string) {
		checkInForm.dinner_time = time;
		showDinnerTimeDropdown = false;
	}

	// Toast notification state
	type ToastType = "success" | "error" | "info";
	let showToast = $state(false);
	let toastMessage = $state("");
	let toastType = $state<ToastType>("info");
	let toastTimeout: ReturnType<typeof setTimeout> | null = null;

	function notify(
		message: string,
		type: ToastType = "info",
		duration = 3000,
	) {
		if (toastTimeout) clearTimeout(toastTimeout);
		toastMessage = message;
		toastType = type;
		showToast = true;
		toastTimeout = setTimeout(() => {
			showToast = false;
		}, duration);
	}

	function closeToast() {
		if (toastTimeout) clearTimeout(toastTimeout);
		showToast = false;
	}

	// Computed
	let filteredReservations = $derived.by(() => {
		let result = reservations;

		if (filterStatus !== "all") {
			result = result.filter((r) => r.status === filterStatus);
		}

		if (tableSearchQuery.trim()) {
			const query = tableSearchQuery.toLowerCase();
			result = result.filter(
				(r) =>
					r.guest_name.toLowerCase().includes(query) ||
					r.room_number.includes(query) ||
					(r.guest_name_kana &&
						r.guest_name_kana.toLowerCase().includes(query)),
			);
		}

		return result;
	});

	let stats = $derived.by(() => {
		return {
			total: reservations.length,
			checkedIn: reservations.filter((r) => r.status === "checked_in")
				.length,
			pending: reservations.filter((r) => r.status === "confirmed")
				.length,
			checkedOut: reservations.filter((r) => r.status === "checked_out")
				.length,
			availableRooms: rooms.filter((r) => r.status === "available")
				.length,
		};
	});

	let todayFormatted = $derived.by(() => {
		const today = new Date();
		const days = ["日", "月", "火", "水", "木", "金", "土"];
		return `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日（${days[today.getDay()]}）`;
	});

	let headerTitle = $derived.by(() => {
		return dateFilter === "today" ? "本日の予約一覧" : "予約一覧";
	});

	// Calculate nights
	function calculateNights(checkIn: string, checkOut: string): number {
		const start = new Date(checkIn);
		const end = new Date(checkOut);
		return Math.ceil(
			(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
		);
	}

	// Booking source config
	const sourceColors: Record<string, string> = {
		rakuten: "bg-red-100 text-red-800",
		jalan: "bg-amber-100 text-amber-800",
		booking_com: "bg-indigo-100 text-indigo-800",
		expedia: "bg-yellow-100 text-yellow-800",
		agoda: "bg-purple-100 text-purple-800",
		direct: "bg-green-100 text-green-800",
		phone: "bg-gray-100 text-gray-800",
		walk_in: "bg-blue-100 text-blue-800",
	};

	const sourceLabels: Record<string, string> = {
		rakuten: "Rakuten Travel",
		jalan: "じゃらん",
		booking_com: "Booking.com",
		expedia: "Expedia",
		agoda: "Agoda",
		direct: "直接予約",
		phone: "電話予約",
		walk_in: "ウォークイン",
	};

	const statusLabels: Record<string, string> = {
		confirmed: "到着待ち",
		checked_in: "チェックイン済",
		checked_out: "チェックアウト済",
		cancelled: "キャンセル",
		no_show: "ノーショー",
	};

	const statusColors: Record<string, string> = {
		confirmed: "bg-blue-100 text-blue-800",
		checked_in: "bg-green-100 text-green-800",
		checked_out: "bg-gray-100 text-gray-800",
		cancelled: "bg-red-100 text-red-800",
		no_show: "bg-orange-100 text-orange-800",
	};

	const mealPlanLabels: Record<string, string> = {
		"2meals": "1泊2食付き",
		dinner_only: "夕食のみ",
		breakfast_only: "朝食のみ",
		no_meals: "素泊まり",
		room_only: "素泊まり",
	};

	// Load data
	async function loadData() {
		loading = true;
		error = null;

		try {
			const dateRange = getDateRange(dateFilter);
			// If a specific date is selected, use that instead of the filter range
			const dateParam =
				selectedDate ||
				(dateFilter === "today" ? dateRange?.startDate : undefined);

			const [
				reservationsData,
				roomsData,
				alertsData,
				allergensData,
			] = await Promise.all([
				getReservations(dateParam),
				getRooms(),
				getNewGuestAlerts(),
				getAllergens(),
			]);

			// Filter by date range on client side for multi-day ranges
			if (dateRange && dateFilter !== "today") {
				const startDate = new Date(dateRange.startDate);
				startDate.setHours(0, 0, 0, 0);
				const endDate = new Date(dateRange.endDate);
				endDate.setHours(23, 59, 59, 999);
				reservations = reservationsData.filter((r) => {
					const checkInDate = new Date(r.check_in_date);
					return checkInDate >= startDate && checkInDate <= endDate;
				});
			} else {
				reservations = reservationsData;
			}

			rooms = roomsData;
			alerts = alertsData;
			allergens = allergensData;
		} catch (e) {
			error =
				e instanceof Error
					? e.message
					: "データの読み込みに失敗しました";
		} finally {
			loading = false;
		}
	}

	// Change date filter and reload
	function changeDateFilter(filter: DateFilter) {
		dateFilter = filter;
		loadData();
	}

	// Open check-in wizard
	function openCheckInWizard(reservation?: Reservation) {
		checkInStep = reservation ? 2 : 1;
		foundReservation = reservation || null;
		qrInput = "";
		guestNameSearch = "";
		phoneSearch = "";
		searchError = null;
		allergenSearchQuery = "";
		showDinnerTimeDropdown = false;

		// Initialize allergen_details from either new or old format
		let allergenDetails: Array<{
			allergen_id: string;
			person_count: number;
		}> = [];
		if (
			reservation?.allergen_details &&
			reservation.allergen_details.length > 0
		) {
			allergenDetails = reservation.allergen_details.map((a) => ({
				allergen_id: a.allergen_id,
				person_count: a.person_count,
			}));
		} else if (
			reservation?.allergen_ids &&
			reservation.allergen_ids.length > 0
		) {
			// Convert old format to new format (assume all party members)
			allergenDetails = reservation.allergen_ids.map((allergen_id) => ({
				allergen_id,
				person_count: reservation.party_size,
			}));
		}

		checkInForm = {
			dinner_time: reservation?.dinner_time || "",
			breakfast_time: reservation?.breakfast_time || "",
			allergen_ids: reservation?.allergen_ids || [], // Keep for backward compatibility
			allergen_details: allergenDetails,
			dietary_notes: reservation?.dietary_notes || "",
			special_requests: reservation?.special_requests || "",
		};
		showCheckInWizard = true;
	}

	// Close wizard
	function closeWizard() {
		showCheckInWizard = false;
		foundReservation = null;
		checkInStep = 1;
		allergenSearchQuery = "";
		showDinnerTimeDropdown = false;
		dashiRestrictions = {};
	}

	// Step 1: Search by QR
	async function searchByQR() {
		if (!qrInput.trim()) return;

		searchLoading = true;
		searchError = null;

		try {
			const reservation = await getReservationByQR(qrInput.trim());
			foundReservation = reservation;
			checkInForm = {
				dinner_time: reservation.dinner_time || "",
				breakfast_time: reservation.breakfast_time || "",
				allergen_ids: reservation.allergen_ids || [],
				dietary_notes: reservation.dietary_notes || "",
				special_requests: reservation.special_requests || "",
			};
			checkInStep = 2;
		} catch (e) {
			searchError =
				e instanceof Error ? e.message : "予約が見つかりませんでした";
		} finally {
			searchLoading = false;
		}
	}

	// Step 1: Search by name/phone
	async function searchByNamePhone() {
		if (!guestNameSearch.trim() && !phoneSearch.trim()) return;

		searchLoading = true;
		searchError = null;

		try {
			const results = await searchReservations({
				name: guestNameSearch.trim() || undefined,
				phone: phoneSearch.trim() || undefined,
			});

			if (results.length === 0) {
				searchError = "予約が見つかりませんでした";
			} else if (results.length === 1) {
				foundReservation = results[0];
				checkInForm = {
					dinner_time: results[0].dinner_time || "",
					breakfast_time: results[0].breakfast_time || "",
					allergen_ids: results[0].allergen_ids || [],
					dietary_notes: results[0].dietary_notes || "",
					special_requests: results[0].special_requests || "",
				};
				checkInStep = 2;
			} else {
				// Multiple results - for now just take first, could show picker
				searchError = `${results.length}件の予約が見つかりました。QRコードをスキャンするか、より詳細な検索条件を入力してください。`;
			}
		} catch (e) {
			searchError = e instanceof Error ? e.message : "検索に失敗しました";
		} finally {
			searchLoading = false;
		}
	}

	// Step 2: Proceed to step 3
	function proceedToStep3() {
		checkInStep = 3;
	}

	// Step 3: Add allergen with person count
	function addAllergen(allergenId: string) {
		const details = checkInForm.allergen_details || [];
		// Don't add if already exists
		if (details.some((d) => d.allergen_id === allergenId)) return;

		// Add with default person count of 1
		checkInForm.allergen_details = [
			...details,
			{ allergen_id: allergenId, person_count: 1 },
		];

		// Also update allergen_ids for backward compatibility
		checkInForm.allergen_ids = [
			...(checkInForm.allergen_ids || []),
			allergenId,
		];

		// Clear search after selecting an allergen
		allergenSearchQuery = "";
	}

	// Update person count for an allergen
	function updateAllergenCount(allergenId: string, count: number) {
		const details = checkInForm.allergen_details || [];
		checkInForm.allergen_details = details.map((d) =>
			d.allergen_id === allergenId ? { ...d, person_count: count } : d,
		);
	}

	// Remove allergen
	function removeAllergen(allergenId: string) {
		const details = checkInForm.allergen_details || [];
		checkInForm.allergen_details = details.filter(
			(d) => d.allergen_id !== allergenId,
		);

		// Also update allergen_ids for backward compatibility
		checkInForm.allergen_ids = (checkInForm.allergen_ids || []).filter(
			(id) => id !== allergenId,
		);

		// Remove dashi restriction when allergen is removed
		const newRestrictions = { ...dashiRestrictions };
		delete newRestrictions[allergenId];
		dashiRestrictions = newRestrictions;
	}

	// Toggle dashi restriction for a specific allergen
	function toggleDashiRestriction(allergenId: string) {
		dashiRestrictions = {
			...dashiRestrictions,
			[allergenId]: !dashiRestrictions[allergenId],
		};
	}

	// Step 3: Complete check-in
	async function completeCheckIn() {
		if (!foundReservation) return;

		checkInLoading = true;
		// Save guest name before closing wizard (which sets foundReservation to null)
		const guestName = foundReservation.guest_name;
		try {
			// Build dashi restriction notes
			const dashiNotes: string[] = [];
			const allergenIds = (checkInForm.allergen_details || []).map(
				(d) => d.allergen_id,
			);
			for (const allergenId of allergenIds) {
				const allergen = allergens.find((a) => a.id === allergenId);
				if (allergen && dashiRestrictions[allergenId]) {
					dashiNotes.push(`${allergen.name}（出汁もNG）`);
				}
			}

			// Combine dashi notes with existing dietary notes
			let combinedNotes = checkInForm.dietary_notes || "";
			if (dashiNotes.length > 0) {
				const dashiText = `出汁制限: ${dashiNotes.join("、")}`;
				combinedNotes = combinedNotes
					? `${combinedNotes}\n${dashiText}`
					: dashiText;
			}

			// Build check-in data with allergen_details (new format)
			const data: CheckInData = {
				dinner_time: checkInForm.dinner_time || undefined,
				allergen_details:
					checkInForm.allergen_details &&
					checkInForm.allergen_details.length > 0
						? checkInForm.allergen_details
						: undefined,
				dietary_notes: combinedNotes || undefined,
				special_requests: checkInForm.special_requests || undefined,
			};

			await checkInReservation(foundReservation.id, data);
			closeWizard();
			await loadData();
			notify(`${guestName}様のチェックインが完了しました`, "success");
		} catch (e) {
			notify(
				e instanceof Error ? e.message : "チェックインに失敗しました",
				"error",
			);
		} finally {
			checkInLoading = false;
		}
	}

	// Handle check-out
	let showCheckOutConfirm = $state(false);
	let checkOutTarget = $state<Reservation | null>(null);

	function openCheckOutConfirm(reservation: Reservation) {
		checkOutTarget = reservation;
		showCheckOutConfirm = true;
	}

	function closeCheckOutConfirm() {
		showCheckOutConfirm = false;
		checkOutTarget = null;
	}

	async function handleCheckOut() {
		if (!checkOutTarget) return;

		try {
			await checkOutReservation(checkOutTarget.id);
			await loadData();
			notify(
				`${checkOutTarget.guest_name}様のチェックアウトが完了しました`,
				"success",
			);
			closeCheckOutConfirm();
		} catch (e) {
			notify(
				e instanceof Error ? e.message : "チェックアウトに失敗しました",
				"error",
			);
		}
	}

	// Handle acknowledge alert
	async function handleAcknowledgeAlert(alertId: string) {
		try {
			await acknowledgeGuestAlert(alertId);
			// Remove from local state
			alerts = alerts.filter((a) => a.id !== alertId);
			notify("アラートを確認済みにしました", "success");
		} catch (e) {
			notify(
				e instanceof Error ? e.message : "アラートの確認に失敗しました",
				"error",
			);
		}
	}

	// Generate dummy reservations
	let generatingDummy = $state(false);
	let deletingDummy = $state(false);

	async function generateDummyReservations() {
		generatingDummy = true;

		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const formatDateISO = (date: Date) => date.toISOString().split("T")[0];
		const addDays = (date: Date, days: number): Date => {
			const result = new Date(date);
			result.setDate(result.getDate() + days);
			return result;
		};

		// Guest data pools
		const guestNames = [
			{ name: "田中 太郎", kana: "タナカ タロウ" },
			{ name: "佐藤 花子", kana: "サトウ ハナコ" },
			{ name: "鈴木 一郎", kana: "スズキ イチロウ" },
			{ name: "高橋 美咲", kana: "タカハシ ミサキ" },
			{ name: "伊藤 健太", kana: "イトウ ケンタ" },
			{ name: "渡辺 由美", kana: "ワタナベ ユミ" },
			{ name: "山本 健一", kana: "ヤマモト ケンイチ" },
			{ name: "中村 愛", kana: "ナカムラ アイ" },
			{ name: "小林 拓也", kana: "コバヤシ タクヤ" },
			{ name: "加藤 雅人", kana: "カトウ マサト" },
		];

		const rooms = [
			{ number: "101", name: "桜" },
			{ number: "102", name: "紅葉" },
			{ number: "103", name: "桔梗" },
			{ number: "104", name: "菊" },
			{ number: "201", name: "松" },
			{ number: "202", name: "竹" },
			{ number: "203", name: "藤" },
			{ number: "301", name: "梅" },
			{ number: "302", name: "椿" },
			{ number: "303", name: "蓮" },
		];

		const bookingSources = [
			"rakuten",
			"jalan",
			"booking_com",
			"direct",
			"expedia",
			"agoda",
			"phone",
		];
		const plans = [
			"和牛懐石プラン",
			"記念日スペシャル",
			"ファミリープラン",
			"カップルプラン",
			"ビジネスプラン",
			"リラックスプラン",
			"温泉満喫プラン",
			"アニバーサリープラン",
			"グループプラン",
			"ロングステイプラン",
			"シニアプラン",
			"レディースプラン",
		];
		const mealPlans = [
			"2meals",
			"dinner_only",
			"breakfast_only",
			"room_only",
		];

		const random = <T,>(arr: T[]): T =>
			arr[Math.floor(Math.random() * arr.length)];
		const randomInt = (min: number, max: number): number =>
			Math.floor(Math.random() * (max - min + 1)) + min;
		const randomPhone = (): string => {
			const prefixes = ["090", "080", "070"];
			const prefix = random(prefixes);
			const part1 = String(randomInt(1000, 9999));
			const part2 = String(randomInt(1000, 9999));
			return `${prefix}-${part1}-${part2}`;
		};

		// Generate 7 days of data with decreasing volume
		const DAYS_TO_GENERATE = 7;
		const RESERVATIONS_BY_DAY = [20, 15, 12, 10, 8, 6, 4]; // Decreasing pattern

		// Generate stay duration distribution for a day
		const generateStayDistribution = (
			reservationCount: number,
		): number[] => {
			const distribution: number[] = [];
			const oneNightPercent = randomInt(40, 70) / 100;
			const twoNightPercent = randomInt(20, 40) / 100;
			const oneNightCount = Math.floor(
				reservationCount * oneNightPercent,
			);
			const twoNightCount = Math.floor(
				reservationCount * twoNightPercent,
			);
			const threeNightCount =
				reservationCount - oneNightCount - twoNightCount;

			for (let i = 0; i < oneNightCount; i++) distribution.push(1);
			for (let i = 0; i < twoNightCount; i++) distribution.push(2);
			for (let i = 0; i < threeNightCount; i++)
				distribution.push(randomInt(3, 5));

			return distribution.sort(() => Math.random() - 0.5);
		};

		// Generate random allergen details for a reservation (30% chance)
		const generateAllergenDetails = (
			partySize: number,
		): Array<{ allergen_id: string; person_count: number }> | undefined => {
			if (allergens.length === 0 || Math.random() > 0.3) return undefined;

			const allergenCount = randomInt(1, Math.min(3, allergens.length));
			const selectedAllergens = new Set<string>();
			const allergenDetails: Array<{
				allergen_id: string;
				person_count: number;
			}> = [];

			while (selectedAllergens.size < allergenCount) {
				const allergen = random(allergens);
				selectedAllergens.add(allergen.id);
			}

			selectedAllergens.forEach((allergenId) => {
				allergenDetails.push({
					allergen_id: allergenId,
					person_count: randomInt(1, partySize),
				});
			});

			return allergenDetails;
		};

		const allReservations: any[] = [];
		let guestIndex = 0;

		// Generate reservations for each day
		for (let dayOffset = 0; dayOffset < DAYS_TO_GENERATE; dayOffset++) {
			const checkInDate = addDays(today, dayOffset);
			const reservationCount = RESERVATIONS_BY_DAY[dayOffset];
			const stayDistribution = generateStayDistribution(reservationCount);

			for (let i = 0; i < reservationCount; i++) {
				const guest = guestNames[guestIndex % guestNames.length];
				const room = rooms[i % rooms.length];
				const stayNights = stayDistribution[i];
				const uniqueSuffix =
					dayOffset > 0 || guestIndex >= guestNames.length
						? `${(guestIndex % guestNames.length) + 1}`
						: "";
				const partySize = randomInt(1, 4);
				const allergenDetails = generateAllergenDetails(partySize);

				allReservations.push({
					booking_source: random(bookingSources),
					guest_name: `${guest.name}${uniqueSuffix}`,
					guest_name_kana: `${guest.kana}${uniqueSuffix}`,
					phone: randomPhone(),
					email: `guest${guestIndex + 1}@example.com`,
					party_size: partySize,
					room_number: room.number,
					room_name: room.name,
					check_in_date: formatDateISO(checkInDate),
					check_out_date: formatDateISO(
						addDays(checkInDate, stayNights),
					),
					plan_name: random(plans),
					meal_plan: random(mealPlans),
					allergen_details: allergenDetails,
				});

				guestIndex++;
			}
		}

		try {
			let successCount = 0;
			for (const data of allReservations) {
				await createReservation(data);
				successCount++;
			}
			await loadData();
			notify(
				`${successCount}件のダミー予約を作成しました（7日間）`,
				"success",
			);
		} catch (e) {
			notify(
				e instanceof Error
					? e.message
					: "ダミーデータの作成に失敗しました",
				"error",
			);
		} finally {
			generatingDummy = false;
		}
	}

	async function deleteDummyReservations() {
		if (
			!confirm(
				"すべての予約データを削除しますか？この操作は取り消せません。",
			)
		) {
			return;
		}

		deletingDummy = true;
		try {
			const result = await deleteAllReservations();
			await loadData();
			notify(`${result.deleted}件の予約を削除しました`, "success");
		} catch (e) {
			notify(
				e instanceof Error ? e.message : "削除に失敗しました",
				"error",
			);
		} finally {
			deletingDummy = false;
		}
	}

	// Format date
	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return `${date.getMonth() + 1}/${date.getDate()}`;
	}

	function formatDateFull(dateStr: string): string {
		const date = new Date(dateStr);
		return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
	}

	// Auto-select first permitted nav tab (once)
	let navInitialized = $state(false);
	$effect(() => {
		if (authState.loading || navInitialized) return;
		navInitialized = true;
		if (canViewReservations) {
			activeNav = "reservations";
		} else if (canViewRooms) {
			activeNav = "rooms";
		} else if (canViewNotifications) {
			activeNav = "notifications";
		}
	});

	// Supabase realtime subscription (single channel, optimized for free tier)
	let realtimeChannel: any = null;
	let realtimeStatus = $state<"connecting" | "connected" | "error" | "closed">("connecting");

	function setupRealtimeSubscriptions() {
		// Use the authenticated user's org ID — never a hardcoded env var
		const organizationId = authState.organizationId;

		// Clean up any existing channel first to avoid CLOSED status from duplicate channel names
		if (realtimeChannel) {
			supabase.removeChannel(realtimeChannel);
			realtimeChannel = null;
		}

		// Use a unique channel name per session to avoid conflicts on hot reload
		const channelName = `front-desk-realtime-${Date.now()}`;

		// Use a single channel with multiple event listeners to minimize connections
		realtimeChannel = supabase
			.channel(channelName)
			// Listen to reservations changes
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "reservations",
					filter: `organization_id=eq.${organizationId}`,
				},
				(payload) => {
					console.log("🔔 Reservation change:", payload.eventType);
					if (payload.eventType === "INSERT") {
						// INSERT may or may not match current date filter — do a targeted reload
						loadReservations();
					} else if (payload.eventType === "UPDATE") {
						const updated = payload.new as Reservation;
						const idx = reservations.findIndex((r) => r.id === updated.id);
						if (idx !== -1) {
							reservations = [
								...reservations.slice(0, idx),
								updated,
								...reservations.slice(idx + 1),
							];
						} else {
							loadReservations();
						}
					} else if (payload.eventType === "DELETE") {
						const deletedId = (payload.old as { id: string }).id;
						reservations = reservations.filter((r) => r.id !== deletedId);
					}
				},
			)
			// Listen to guest_alerts changes
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "guest_alerts",
					filter: `organization_id=eq.${organizationId}`,
				},
				(payload) => {
					console.log("Alert change:", payload.eventType);
					if (payload.eventType === "INSERT") {
						alerts = [payload.new as GuestAlert, ...alerts];
					} else if (payload.eventType === "UPDATE") {
						const updated = payload.new as GuestAlert;
						const idx = alerts.findIndex((a) => a.id === updated.id);
						if (idx !== -1) {
							alerts = [
								...alerts.slice(0, idx),
								updated,
								...alerts.slice(idx + 1),
							];
						}
					} else if (payload.eventType === "DELETE") {
						const deletedId = (payload.old as { id: string }).id;
						alerts = alerts.filter((a) => a.id !== deletedId);
					}
				},
			)
			// Listen to rooms changes
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "rooms",
					filter: `organization_id=eq.${organizationId}`,
				},
				(payload) => {
					console.log("Room change:", payload.eventType);
					if (payload.eventType === "INSERT") {
						rooms = [...rooms, payload.new as Room];
					} else if (payload.eventType === "UPDATE") {
						const updated = payload.new as Room;
						const idx = rooms.findIndex((r) => r.id === updated.id);
						if (idx !== -1) {
							rooms = [
								...rooms.slice(0, idx),
								updated,
								...rooms.slice(idx + 1),
							];
						}
					} else if (payload.eventType === "DELETE") {
						const deletedId = (payload.old as { id: string }).id;
						rooms = rooms.filter((r) => r.id !== deletedId);
					}
				},
			)
			.subscribe((status, err) => {
				if (status === "SUBSCRIBED") {
					realtimeStatus = "connected";
					console.log("✅ Front-desk realtime: connected");
				} else if (status === "CHANNEL_ERROR") {
					realtimeStatus = "error";
					console.error(
						"❌ Realtime channel error — too many connections or realtime not enabled for tables. Free tier: max 2 concurrent channels.",
						err,
					);
				} else if (status === "TIMED_OUT") {
					realtimeStatus = "error";
					console.warn("⏱️ Realtime channel timed out — retrying automatically.");
				} else if (status === "CLOSED") {
					realtimeStatus = "closed";
					console.log("📡 Front-desk realtime: closed");
				} else {
					console.log("📡 Front-desk realtime:", status, err ?? "");
				}
			});
	}

	async function loadReservations() {
		console.log("🔄 Reloading reservations...");
		try {
			const dateRange = getDateRange(dateFilter);
			const dateParam =
				dateFilter === "today" ? dateRange?.startDate : undefined;
			const reservationsData = await getReservations(dateParam);

			// Filter by date range on client side for multi-day ranges
			if (dateRange && dateFilter !== "today") {
				const startDate = new Date(dateRange.startDate);
				startDate.setHours(0, 0, 0, 0);
				const endDate = new Date(dateRange.endDate);
				endDate.setHours(23, 59, 59, 999);
				reservations = reservationsData.filter((r) => {
					const checkInDate = new Date(r.check_in_date);
					return checkInDate >= startDate && checkInDate <= endDate;
				});
			} else {
				reservations = reservationsData;
			}
			console.log(`✅ Loaded ${reservations.length} reservations`);
		} catch (e) {
			console.error("Failed to reload reservations:", e);
		}
	}

	function cleanupRealtimeSubscriptions() {
		if (realtimeChannel) {
			supabase.removeChannel(realtimeChannel);
			realtimeChannel = null;
		}
	}

	onMount(() => {
		loadData();
		setupRealtimeSubscriptions();
	});

	onDestroy(() => {
		cleanupRealtimeSubscriptions();
	});
</script>

<svelte:head>
	<title>フロントデスク - 湖南荘</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link
		rel="preconnect"
		href="https://fonts.gstatic.com"
		crossorigin="anonymous"
	/>
	<link
		href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="flex h-screen bg-gray-100 font-['Noto_Sans_JP',sans-serif]">
	<Sidebar
		sections={sidebarSections}
		bind:collapsed={sidebarCollapsed}
		bind:mobileOpen={sidebarMobileOpen}
	/>

	<!-- Main Content -->
	<div class="flex-1 flex flex-col overflow-hidden">
		<!-- Header -->
		<header class="bg-white border-b border-gray-200">
			<div class="h-16 flex items-center justify-between px-4 md:px-6">
				<div class="flex items-center gap-3 md:gap-4">
					<button
						onclick={() => (sidebarMobileOpen = true)}
						class="md:hidden p-1.5 -ml-1 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
						aria-label="メニューを開く"
					>
						<span class="material-symbols-rounded text-xl"
							>menu</span
						>
					</button>
					<h2 class="text-lg font-bold text-gray-900">
						{headerTitle}
					</h2>
					<span class="text-sm text-gray-500 hidden sm:inline"
						>{todayFormatted}</span
					>
					<!-- Calendar Date Picker -->
					<div class="relative">
						<button
							onclick={() =>
								(showDateDropdown = !showDateDropdown)}
							class="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
						>
							<span
								class="material-symbols-rounded text-base text-gray-500"
								>calendar_month</span
							>
							{selectedDate
								? new Date(selectedDate).toLocaleDateString(
										"ja-JP",
										{ month: "2-digit", day: "2-digit" },
									)
								: dateFilterLabels[dateFilter]}
							<span
								class="material-symbols-rounded text-base text-gray-400 transition-transform {showDateDropdown
									? 'rotate-180'
									: ''}">expand_more</span
							>
						</button>

						{#if showDateDropdown}
							<!-- Backdrop to close dropdown -->
							<button
								class="fixed inset-0 z-10"
								onclick={() => (showDateDropdown = false)}
								aria-label="Close dropdown"
							></button>

							<!-- Calendar View -->
							<div
								class="absolute top-full left-0 mt-1 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-20"
							>
								<!-- Quick filters -->
								<div class="flex gap-2 mb-3 pb-3 border-b">
									<button
										onclick={() =>
											selectDateFilter("today")}
										class="flex-1 px-3 py-1.5 text-xs rounded {!selectedDate &&
										dateFilter === 'today'
											? 'bg-blue-500 text-white'
											: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
									>
										本日
									</button>
									<button
										onclick={() =>
											selectDateFilter("past7")}
										class="flex-1 px-3 py-1.5 text-xs rounded {!selectedDate &&
										dateFilter === 'past7'
											? 'bg-blue-500 text-white'
											: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
									>
										過去7日
									</button>
									<button
										onclick={() => selectDateFilter("all")}
										class="flex-1 px-3 py-1.5 text-xs rounded {!selectedDate &&
										dateFilter === 'all'
											? 'bg-blue-500 text-white'
											: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
									>
										全期間
									</button>
								</div>

								<!-- Month header -->
								<div class="text-center mb-3">
									<span
										class="text-sm font-semibold text-gray-900"
									>
										{new Date().toLocaleDateString(
											"ja-JP",
											{ year: "numeric", month: "long" },
										)}
									</span>
								</div>

								<!-- Day headers -->
								<div class="grid grid-cols-7 gap-1 mb-2">
									{#each ["日", "月", "火", "水", "木", "金", "土"] as day}
										<div
											class="text-center text-xs font-medium text-gray-500 py-1"
										>
											{day}
										</div>
									{/each}
								</div>

								<!-- Calendar days -->
								<div class="grid grid-cols-7 gap-1">
									{#each getCalendarDays() as { date, dateStr, isToday, isPast }}
										{@const isSelected =
											selectedDate === dateStr}
										<button
											onclick={() =>
												selectSpecificDate(dateStr)}
											class="aspect-square p-1 text-xs rounded-lg transition-colors relative
											{isSelected
												? 'bg-blue-500 text-white font-semibold'
												: isToday
													? 'bg-blue-100 text-blue-700 font-semibold'
													: isPast &&
														  date.getMonth() !==
																new Date().getMonth()
														? 'text-gray-300'
														: isPast
															? 'text-gray-400 hover:bg-gray-100'
															: 'text-gray-900 hover:bg-gray-100'}"
										>
											{date.getDate()}
										</button>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				</div>
				<div class="flex items-center gap-3">
					{#if isStaff}
						<button
							onclick={generateDummyReservations}
							disabled={generatingDummy}
							class="inline-flex items-center gap-2 px-4 py-2 border border-dashed border-amber-400 rounded-md text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-50"
						>
							<span class="material-symbols-rounded text-lg"
								>add_circle</span
							>
							{generatingDummy ? "作成中..." : "ダミー作成"}
						</button>
						<button
							onclick={deleteDummyReservations}
							disabled={deletingDummy}
							class="inline-flex items-center gap-2 px-4 py-2 border border-dashed border-red-400 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
						>
							<span class="material-symbols-rounded text-lg"
								>delete_sweep</span
							>
							{deletingDummy ? "削除中..." : "全削除"}
						</button>
					{/if}
					<!-- Real-time indicator -->
					<div
						class="flex items-center gap-2 px-3 py-2 border rounded-md {realtimeStatus === 'connected' ? 'border-green-200 bg-green-50' : realtimeStatus === 'error' ? 'border-red-200 bg-red-50' : realtimeStatus === 'closed' ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50'}"
						title={realtimeStatus === 'connected' ? 'リアルタイム接続中' : realtimeStatus === 'error' ? 'リアルタイム接続エラー' : realtimeStatus === 'closed' ? 'リアルタイム切断中' : '接続中...'}
					>
						<span
							class="w-2 h-2 rounded-full {realtimeStatus === 'connected' ? 'bg-green-500 animate-pulse' : realtimeStatus === 'error' ? 'bg-red-500' : realtimeStatus === 'closed' ? 'bg-amber-400' : 'bg-gray-400 animate-pulse'}"
						></span>
						<span class="text-xs {realtimeStatus === 'connected' ? 'text-green-700' : realtimeStatus === 'error' ? 'text-red-700' : realtimeStatus === 'closed' ? 'text-amber-700' : 'text-gray-600'}">リアルタイム</span>
					</div>
					<button
						onclick={() => loadData()}
						class="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
					>
						<span class="material-symbols-rounded text-lg"
							>refresh</span
						>
						更新
					</button>
					<button
						onclick={() => openCheckInWizard()}
						disabled={!can("reservations.checkin")}
						class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<span class="material-symbols-rounded text-lg"
							>qr_code_scanner</span
						>
						チェックイン
					</button>
					{#if !authState.isStaff && !authState.loading}
						<div class="w-px h-8 bg-gray-200"></div>
						<a
							href="/login"
							class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
						>
							<span class="material-symbols-rounded text-lg"
								>login</span
							>
							ログイン
						</a>
					{/if}
				</div>
			</div>
			{#if !isStaff && !authState.loading}
				<div
					class="bg-amber-50 border-t border-amber-200 px-6 py-2 flex items-center gap-2"
				>
					<span
						class="material-symbols-rounded text-amber-600 text-lg"
						>visibility</span
					>
					<span class="text-sm text-amber-700"
						>閲覧モード — スタッフとしてログインすると操作できます</span
					>
				</div>
			{/if}
		</header>

		<!-- Body -->
		<main class="flex-1 overflow-auto p-3 md:p-6">
			{#if activeNav === "notifications" && canViewNotifications}
				<!-- Notifications View -->
				<div class="space-y-4">
					<div class="flex items-center justify-between mb-6">
						<h2 class="text-lg font-bold text-gray-900">
							通知一覧
						</h2>
						<button
							onclick={() => loadData()}
							class="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
						>
							<span class="material-symbols-rounded text-base"
								>refresh</span
							>
							更新
						</button>
					</div>

					{#if loading}
						<div
							class="bg-white rounded-lg border border-gray-200 p-12 text-center"
						>
							<div
								class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"
							></div>
							<p class="mt-4 text-gray-500">読み込み中...</p>
						</div>
					{:else if alerts.length === 0}
						<div
							class="bg-white rounded-lg border border-gray-200 p-12 text-center"
						>
							<span
								class="material-symbols-rounded text-6xl text-gray-300"
								>notifications_off</span
							>
							<p class="mt-4 text-gray-500">
								新しい通知はありません
							</p>
						</div>
					{:else}
						<div class="space-y-3">
							{#each alerts as alert (alert.id)}
								<div
									class="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
								>
									<div class="flex items-start gap-4">
										<!-- Alert Type Icon -->
										<div class="flex-shrink-0">
											{#if alert.alert_type === "check_in"}
												<div
													class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"
												>
													<span
														class="material-symbols-rounded text-green-600"
														>login</span
													>
												</div>
											{:else if alert.alert_type === "allergy_update"}
												<div
													class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center"
												>
													<span
														class="material-symbols-rounded text-red-600"
														>warning</span
													>
												</div>
											{:else if alert.alert_type === "special_request"}
												<div
													class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"
												>
													<span
														class="material-symbols-rounded text-blue-600"
														>star</span
													>
												</div>
											{:else}
												<div
													class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
												>
													<span
														class="material-symbols-rounded text-gray-600"
														>info</span
													>
												</div>
											{/if}
										</div>

										<!-- Alert Content -->
										<div class="flex-1 min-w-0">
											<div
												class="flex items-center gap-2 mb-1"
											>
												<span
													class="font-semibold text-gray-900"
													>{alert.guest_name}</span
												>
												<span class="text-gray-400"
													>·</span
												>
												<span
													class="text-sm text-gray-500"
													>{alert.room_number}号室</span
												>
												<span class="text-gray-400"
													>·</span
												>
												<span
													class="text-sm text-gray-500"
													>{alert.party_size}名</span
												>
											</div>

											<!-- Alert Type Label -->
											<div class="mb-2">
												{#if alert.alert_type === "check_in"}
													<span
														class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"
													>
														チェックイン
													</span>
												{:else if alert.alert_type === "allergy_update"}
													<span
														class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800"
													>
														アレルギー情報更新
													</span>
												{:else if alert.alert_type === "special_request"}
													<span
														class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
													>
														特別リクエスト
													</span>
												{:else}
													<span
														class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
													>
														その他
													</span>
												{/if}
											</div>

											<!-- Dinner Time -->
											{#if alert.dinner_time}
												<p
													class="text-sm text-gray-600 mb-1"
												>
													<span
														class="material-symbols-rounded text-sm align-middle mr-1"
														>restaurant</span
													>
													夕食時間: {alert.dinner_time}
												</p>
											{/if}

											<!-- Allergens -->
											{#if alert.allergens && alert.allergens.length > 0}
												<div
													class="flex flex-wrap gap-1 mb-2"
												>
													{#each alert.allergens as allergen}
														<span
															class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200"
														>
															{allergen.name}
														</span>
													{/each}
												</div>
											{/if}

											<!-- Dietary Notes (including dashi restrictions) -->
											{#if alert.dietary_notes}
												<div
													class="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg"
												>
													<p
														class="text-xs font-semibold text-orange-800 mb-1"
													>
														<span
															class="material-symbols-rounded text-sm align-middle mr-1"
															>info</span
														>
														食事制限
													</p>
													<p
														class="text-sm text-orange-900 whitespace-pre-wrap"
													>
														{alert.dietary_notes}
													</p>
												</div>
											{/if}

											<!-- Message -->
											{#if alert.message}
												<p
													class="text-sm text-gray-600 bg-gray-50 rounded p-2 mt-2"
												>
													{alert.message}
												</p>
											{/if}

											<!-- Timestamp -->
											<p
												class="text-xs text-gray-400 mt-2"
											>
												{new Date(
													alert.created_at,
												).toLocaleString("ja-JP")}
											</p>
										</div>

										<!-- Close Button -->
										{#if can("notifications.manage")}
											<div class="flex-shrink-0">
												<button
													onclick={() =>
														handleAcknowledgeAlert(
															alert.id,
														)}
													class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
													title="確認済みにする"
												>
													<span
														class="material-symbols-rounded text-lg"
														>close</span
													>
												</button>
											</div>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{:else if activeNav === "rooms" && canViewRooms}
				<!-- Room Status View -->
				<div class="space-y-4">
					<div class="flex items-center justify-between mb-6">
						<h2 class="text-lg font-bold text-gray-900">
							客室状況
						</h2>
					</div>

					<!-- Room Stats Cards -->
					<div class="grid grid-cols-5 gap-4 mb-6">
						<div
							class="bg-white rounded-lg border border-gray-200 p-4"
						>
							<p class="text-sm text-gray-500">全客室</p>
							<p class="text-2xl font-bold text-gray-900 mt-1">
								{roomStats.total}
							</p>
						</div>
						<div
							class="bg-emerald-50 rounded-lg border border-emerald-300 p-4"
						>
							<p class="text-sm text-emerald-700">空室</p>
							<p class="text-2xl font-bold text-emerald-700 mt-1">
								{roomStats.available}
							</p>
						</div>
						<div
							class="bg-blue-50 rounded-lg border border-blue-300 p-4"
						>
							<p class="text-sm text-blue-700">利用中</p>
							<p class="text-2xl font-bold text-blue-700 mt-1">
								{roomStats.occupied}
							</p>
						</div>
						<div
							class="bg-amber-50 rounded-lg border border-amber-300 p-4"
						>
							<p class="text-sm text-amber-700">清掃中</p>
							<p class="text-2xl font-bold text-amber-700 mt-1">
								{roomStats.cleaning}
							</p>
						</div>
						<div
							class="bg-purple-50 rounded-lg border border-purple-300 p-4"
						>
							<p class="text-sm text-purple-700">
								メンテナンス他
							</p>
							<p class="text-2xl font-bold text-purple-700 mt-1">
								{roomStats.maintenance}
							</p>
						</div>
					</div>

					<!-- Room Filters Row -->
					<div class="flex items-center justify-between mb-4">
						<div class="flex gap-2 bg-gray-100 p-1 rounded-lg">
							{#each roomStatusOptions as option}
								<button
									onclick={() =>
										(roomFilterStatus = option.value)}
									class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors {roomFilterStatus ===
									option.value
										? 'bg-white text-gray-900 shadow-sm'
										: 'text-gray-600 hover:text-gray-900'}"
								>
									{option.label}
								</button>
							{/each}
						</div>

						<div class="relative">
							<span
								class="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
								>search</span
							>
							<input
								type="text"
								bind:value={roomSearchQuery}
								placeholder="部屋番号・部屋名..."
								class="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							/>
						</div>
					</div>

					<!-- Loading State -->
					{#if loading}
						<div
							class="bg-white rounded-lg border border-gray-200 p-12 text-center"
						>
							<div
								class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"
							></div>
							<p class="mt-4 text-gray-500">読み込み中...</p>
						</div>
					{:else if error}
						<div
							class="bg-red-50 border border-red-200 rounded-lg p-6 text-center"
						>
							<p class="text-red-800">{error}</p>
							<button
								onclick={() => loadData()}
								class="mt-4 text-red-600 hover:text-red-800 font-medium"
							>
								再試行
							</button>
						</div>
					{:else}
						<!-- Room Grid -->
						<div
							class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
						>
							{#each filteredRooms as room (room.id)}
								{@const activeRes = reservations.find(
									(r) =>
										r.room_number === room.room_number &&
										r.status === "checked_in",
								)}
								{@const pendingRes = reservations.find(
									(r) =>
										r.room_number === room.room_number &&
										r.status === "confirmed" &&
										r.check_in_date === todayFormatted,
								)}
								<div
									class="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow overflow-hidden flex flex-col"
								>
									<!-- Card Header -->
									<div
										class="p-4 border-b border-gray-100 flex items-start justify-between"
									>
										<div>
											<div
												class="flex items-center gap-2"
											>
												<h3
													class="text-lg font-bold text-gray-900 font-['Plus_Jakarta_Sans']"
												>
													{room.room_number}
												</h3>
												{#if room.room_name}
													<span
														class="text-sm font-medium text-gray-600"
														>{room.room_name}</span
													>
												{/if}
											</div>
											{#if room.room_type}
												<p
													class="text-xs text-gray-500 mt-0.5"
												>
													{room.room_type}
												</p>
											{/if}
										</div>
										<span
											class="inline-flex items-center px-2 py-1 rounded text-xs font-semibold border {roomStatusColors[
												room.status
											]}"
										>
											{roomStatusLabels[room.status]}
										</span>
									</div>

									<!-- Card Body -->
									<div class="p-4 flex-1">
										{#if room.status === "occupied" && activeRes}
											<div class="space-y-3">
												<div
													class="flex items-start gap-2"
												>
													<span
														class="material-symbols-rounded text-blue-500 text-lg"
														>person</span
													>
													<div>
														<p
															class="text-sm font-bold text-gray-900"
														>
															{activeRes.guest_name}
															様
														</p>
														{#if activeRes.guest_name_kana}
															<p
																class="text-xs text-gray-500"
															>
																{activeRes.guest_name_kana}
															</p>
														{/if}
													</div>
												</div>
												<div
													class="text-sm text-gray-600 pl-7 space-y-1"
												>
													<p>
														<span
															class="text-gray-400 w-12 inline-block"
															>人数:</span
														>
														{activeRes.party_size}名
													</p>
													<p>
														<span
															class="text-gray-400 w-12 inline-block"
															>期間:</span
														>
														<span
															class="font-['Plus_Jakarta_Sans']"
															>{formatDate(
																activeRes.check_in_date,
															)}</span
														>
														-
														<span
															class="font-['Plus_Jakarta_Sans']"
															>{formatDate(
																activeRes.check_out_date,
															)}</span
														>
													</p>
													{#if activeRes.total_nights && activeRes.current_stay_night}
														<p
															class="text-xs text-blue-600 font-medium"
														>
															滞在中（{activeRes.current_stay_night}泊目
															/ {activeRes.total_nights}泊）
														</p>
													{/if}
												</div>
											</div>
										{:else if room.status === "available"}
											{#if pendingRes}
												<div
													class="h-full flex flex-col justify-center items-center text-center p-2 bg-blue-50/50 rounded-lg border border-blue-100/50"
												>
													<span
														class="material-symbols-rounded text-blue-400 mb-2"
														>schedule</span
													>
													<p
														class="text-sm font-medium text-blue-800"
													>
														本日のチェックイン予定
													</p>
													<p
														class="text-sm text-blue-600 mt-1"
													>
														{pendingRes.guest_name} 様
														({pendingRes.party_size}名)
													</p>
												</div>
											{:else}
												<div
													class="h-full flex flex-col justify-center items-center text-center p-2"
												>
													<span
														class="material-symbols-rounded text-gray-300 text-3xl mb-2"
														>meeting_room</span
													>
													<p
														class="text-sm text-gray-500"
													>
														次の予約はありません
													</p>
												</div>
											{/if}
										{:else}
											<div
												class="h-full flex flex-col justify-center items-center text-center p-2"
											>
												<span
													class="material-symbols-rounded text-gray-300 text-3xl mb-2"
												>
													{room.status === "cleaning"
														? "cleaning_services"
														: "handyman"}
												</span>
												<p
													class="text-sm text-gray-500"
												>
													{room.status === "cleaning"
														? "清掃作業中"
														: "メンテナンス作業中"}
												</p>
											</div>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{:else}
				{#if alerts.length > 0}
					<div
						class="mb-6 bg-amber-50 border border-amber-200 rounded-lg overflow-hidden"
					>
						<button
							onclick={() => (activeNav = "notifications")}
							class="w-full p-4 hover:bg-amber-100 transition-colors text-left"
						>
							<div class="flex items-center justify-between">
								<div class="flex items-center">
									<span
										class="material-symbols-rounded text-amber-600 mr-2"
										>warning</span
									>
									<span class="text-amber-800 font-medium"
										>{alerts.length}件の新しいアラートがあります</span
									>
								</div>
								<span
									class="material-symbols-rounded text-amber-600"
									>chevron_right</span
								>
							</div>
						</button>
						<!-- Inline alert list -->
						<div
							class="border-t border-amber-200 divide-y divide-amber-100"
						>
							{#each alerts.slice(0, 3) as alert (alert.id)}
								<div
									class="flex items-center justify-between px-4 py-2 bg-white"
								>
									<div
										class="flex items-center gap-3 min-w-0"
									>
										{#if alert.alert_type === "check_in"}
											<span
												class="material-symbols-rounded text-green-600 text-lg"
												>login</span
											>
										{:else if alert.alert_type === "allergy_update"}
											<span
												class="material-symbols-rounded text-red-600 text-lg"
												>warning</span
											>
										{:else}
											<span
												class="material-symbols-rounded text-blue-600 text-lg"
												>info</span
											>
										{/if}
										<div class="min-w-0">
											<span
												class="text-sm font-medium text-gray-900"
												>{alert.guest_name}</span
											>
											<span class="text-gray-400 mx-1"
												>·</span
											>
											<span class="text-sm text-gray-500"
												>{alert.room_number}号室</span
											>
											{#if alert.allergens && alert.allergens.length > 0}
												<span class="text-gray-400 mx-1"
													>·</span
												>
												<span
													class="text-xs text-red-600"
													>{alert.allergens
														.map((a) => a.name)
														.join(", ")}</span
												>
											{/if}
										</div>
									</div>
									{#if can("notifications.manage")}
										<button
											onclick={(e) => {
												e.stopPropagation();
												handleAcknowledgeAlert(
													alert.id,
												);
											}}
											class="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
											title="確認済みにする"
										>
											<span
												class="material-symbols-rounded text-base"
												>close</span
											>
										</button>
									{/if}
								</div>
							{/each}
							{#if alerts.length > 3}
								<div class="px-4 py-2 bg-amber-50 text-center">
									<button
										onclick={() =>
											(activeNav = "notifications")}
										class="text-sm text-amber-700 hover:text-amber-900 font-medium"
									>
										他 {alerts.length - 3} 件を表示
									</button>
								</div>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Stats Cards -->
				<div class="grid grid-cols-5 gap-4 mb-6">
					<div class="bg-white rounded-lg border border-gray-200 p-4">
						<p class="text-sm text-gray-500">予約数</p>
						<p class="text-2xl font-bold text-gray-900 mt-1">
							{stats.total}
						</p>
					</div>
					<div
						class="bg-blue-50 rounded-lg border border-blue-300 p-4"
					>
						<p class="text-sm text-blue-700">到着待ち</p>
						<p class="text-2xl font-bold text-blue-700 mt-1">
							{stats.pending}
						</p>
					</div>
					<div
						class="bg-emerald-50 rounded-lg border border-emerald-300 p-4"
					>
						<p class="text-sm text-emerald-700">在館中</p>
						<p class="text-2xl font-bold text-emerald-700 mt-1">
							{stats.checkedIn}
						</p>
					</div>
					<div
						class="bg-gray-100 rounded-lg border border-gray-300 p-4"
					>
						<p class="text-sm text-gray-600">チェックアウト済</p>
						<p class="text-2xl font-bold text-gray-600 mt-1">
							{stats.checkedOut}
						</p>
					</div>
					<div class="bg-white rounded-lg border border-gray-200 p-4">
						<p class="text-sm text-gray-500">空室</p>
						<p class="text-2xl font-bold text-gray-900 mt-1">
							{stats.availableRooms}
						</p>
					</div>
				</div>

				<!-- Filters Row -->
				<div class="flex items-center justify-between mb-4">
					<div class="flex gap-2">
						<button
							onclick={() => (filterStatus = "confirmed")}
							class="px-4 py-2 rounded-md text-sm font-medium transition-colors {filterStatus ===
							'confirmed'
								? 'bg-blue-600 text-white'
								: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}"
						>
							到着待ち ({stats.pending})
						</button>
						<button
							onclick={() => (filterStatus = "checked_in")}
							class="px-4 py-2 rounded-md text-sm font-medium transition-colors {filterStatus ===
							'checked_in'
								? 'bg-emerald-600 text-white'
								: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}"
						>
							在館中 ({stats.checkedIn})
						</button>
						<button
							onclick={() => (filterStatus = "checked_out")}
							class="px-4 py-2 rounded-md text-sm font-medium transition-colors {filterStatus ===
							'checked_out'
								? 'bg-gray-600 text-white'
								: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}"
						>
							チェックアウト済 ({stats.checkedOut})
						</button>
						<button
							onclick={() => (filterStatus = "all")}
							class="px-4 py-2 rounded-md text-sm font-medium transition-colors {filterStatus ===
							'all'
								? 'bg-gray-900 text-white'
								: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}"
						>
							全て ({stats.total})
						</button>
					</div>

					<div class="relative">
						<span
							class="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
							>search</span
						>
						<input
							type="text"
							bind:value={tableSearchQuery}
							placeholder="ゲスト名・部屋番号で検索..."
							class="w-72 pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>
				</div>

				<!-- Loading State -->
				{#if loading}
					<div
						class="bg-white rounded-lg border border-gray-200 p-12 text-center"
					>
						<div
							class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"
						></div>
						<p class="mt-4 text-gray-500">読み込み中...</p>
					</div>
				{:else if error}
					<div
						class="bg-red-50 border border-red-200 rounded-lg p-6 text-center"
					>
						<p class="text-red-800">{error}</p>
						<button
							onclick={() => loadData()}
							class="mt-4 text-red-600 hover:text-red-800 font-medium"
						>
							再試行
						</button>
					</div>
				{:else}
					<!-- Reservations Table -->
					<div
						class="bg-white rounded-lg border border-gray-200 overflow-hidden"
					>
						<table class="min-w-full divide-y divide-gray-200">
							<thead class="bg-gray-50">
								<tr>
									<th
										class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
										>客室</th
									>
									<th
										class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
										>ゲスト名</th
									>
									<th
										class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
										>人数</th
									>
									<th
										class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
										>予約元</th
									>
									<th
										class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
										>宿泊期間</th
									>
									<th
										class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
										>プラン</th
									>
									<th
										class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
										>アレルギー</th
									>
									<th
										class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
										>ステータス</th
									>
									<th
										class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
										>操作</th
									>
								</tr>
							</thead>
							<tbody class="bg-white divide-y divide-gray-200">
								{#each filteredReservations as reservation (reservation.id)}
									<tr class="hover:bg-gray-50">
										<td class="px-4 py-4 whitespace-nowrap">
											<div
												class="font-medium text-gray-900"
											>
												{reservation.room_number}
											</div>
											{#if reservation.room_name}
												<div
													class="text-sm text-gray-500"
												>
													{reservation.room_name}
												</div>
											{/if}
										</td>
										<td class="px-4 py-4 whitespace-nowrap">
											<div
												class="font-medium text-gray-900"
											>
												{reservation.guest_name}
											</div>
											{#if reservation.guest_name_kana}
												<div
													class="text-sm text-gray-500"
												>
													{reservation.guest_name_kana}
												</div>
											{/if}
										</td>
										<td
											class="px-4 py-4 whitespace-nowrap text-gray-900"
										>
											{reservation.party_size}名
										</td>
										<td class="px-4 py-4 whitespace-nowrap">
											<span
												class="inline-flex px-2 py-1 text-xs font-medium rounded-full {sourceColors[
													reservation.booking_source
												] ||
													'bg-gray-100 text-gray-800'}"
											>
												{sourceLabels[
													reservation.booking_source
												] || reservation.booking_source}
											</span>
										</td>
										<td class="px-4 py-4 whitespace-nowrap">
											<div class="text-sm text-gray-900">
												{formatDate(
													reservation.check_in_date,
												)} - {formatDate(
													reservation.check_out_date,
												)}
											</div>
											{#if reservation.total_nights && reservation.current_stay_night}
												<div
													class="text-xs text-gray-600 mt-0.5"
												>
													{reservation.current_stay_night}
													- {reservation.total_nights}
												</div>
											{/if}
										</td>
										<td class="px-4 py-4 whitespace-nowrap">
											<div class="text-sm text-gray-900">
												{reservation.plan_name || "-"}
											</div>
											{#if reservation.meal_plan}
												<div
													class="text-xs text-gray-500"
												>
													{mealPlanLabels[
														reservation.meal_plan
													] || reservation.meal_plan}
												</div>
											{/if}
										</td>
										<td class="px-4 py-4">
											{#if reservation.allergen_details && reservation.allergen_details.length > 0}
												<div
													class="flex flex-wrap gap-1 max-w-[200px]"
												>
													{#each reservation.allergen_details as detail}
														{#if detail.allergen}
															<span
																class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200"
															>
																{detail.allergen
																	.name}
																<span
																	class="text-[10px] font-semibold bg-red-100 px-1 rounded"
																	>{detail.person_count}名</span
																>
															</span>
														{/if}
													{/each}
												</div>
												{#if reservation.dietary_notes}
													<div
														class="mt-1.5 text-xs text-orange-700 bg-orange-50 px-2 py-1 rounded border border-orange-200 whitespace-pre-wrap max-w-[200px]"
													>
														{reservation.dietary_notes}
													</div>
												{/if}
											{:else if reservation.allergens && reservation.allergens.length > 0}
												<!-- Fallback for old format without person counts -->
												<div
													class="flex flex-wrap gap-1 max-w-[200px]"
												>
													{#each reservation.allergens as allergen}
														<span
															class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200"
														>
															{allergen.name}
														</span>
													{/each}
												</div>
												{#if reservation.dietary_notes}
													<div
														class="mt-1.5 text-xs text-orange-700 bg-orange-50 px-2 py-1 rounded border border-orange-200 whitespace-pre-wrap max-w-[200px]"
													>
														{reservation.dietary_notes}
													</div>
												{/if}
											{:else if reservation.dietary_notes}
												<div
													class="text-xs text-orange-700 bg-orange-50 px-2 py-1 rounded border border-orange-200 whitespace-pre-wrap max-w-[200px]"
												>
													{reservation.dietary_notes}
												</div>
											{:else}
												<span
													class="text-sm text-gray-400"
													>-</span
												>
											{/if}
										</td>
										<td class="px-4 py-4 whitespace-nowrap">
											<span
												class="inline-flex px-2 py-1 text-xs font-medium rounded-full {statusColors[
													reservation.status
												] ||
													'bg-gray-100 text-gray-800'}"
											>
												{statusLabels[
													reservation.status
												] || reservation.status}
											</span>
										</td>
										<td class="px-4 py-4 whitespace-nowrap">
											{#if reservation.status === "confirmed"}
												<button
													onclick={() =>
														openCheckInWizard(
															reservation,
														)}
													disabled={!can(
														"reservations.checkin",
													)}
													class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
												>
													チェックイン
												</button>
											{:else if reservation.status === "checked_in"}
												<button
													onclick={() =>
														openCheckOutConfirm(
															reservation,
														)}
													disabled={!can(
														"reservations.checkout",
													)}
													class="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
												>
													チェックアウト
												</button>
											{/if}
										</td>
									</tr>
								{:else}
									<tr>
										<td
											colspan="9"
											class="px-4 py-12 text-center text-gray-500"
										>
											予約が見つかりませんでした
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			{/if}
		</main>
	</div>
</div>

<!-- Check-in Wizard Modal -->
{#if showCheckInWizard}
	<div
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
	>
		<div
			class="bg-white rounded-xl shadow-2xl w-[420px] max-h-[90vh] overflow-hidden flex flex-col"
		>
			<!-- Step 1: Guest Lookup -->
			{#if checkInStep === 1}
				<div
					class="flex items-center justify-between px-5 py-4 border-b border-gray-200"
				>
					<h2 class="text-base font-bold text-gray-900">
						ゲスト検索
					</h2>
					<button
						onclick={closeWizard}
						class="w-8 h-8 flex items-center justify-center rounded-md bg-gray-100 text-gray-500 hover:bg-gray-200"
					>
						<span class="material-symbols-rounded text-lg"
							>close</span
						>
					</button>
				</div>

				<div class="flex-1 overflow-auto p-5 space-y-5">
					<!-- QR Section -->
					<div class="flex flex-col items-center gap-3">
						<div
							class="w-40 h-40 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center"
						>
							<span
								class="material-symbols-rounded text-6xl text-gray-400"
								style="font-weight: 300">qr_code_scanner</span
							>
						</div>
						<p class="font-semibold text-gray-900">
							QRコードをスキャン
						</p>
						<p class="text-sm text-gray-500 text-center">
							予約確認メールのQRコードを読み取ってください
						</p>

						<!-- Manual QR input for testing -->
						<div class="w-full flex gap-2">
							<input
								type="text"
								bind:value={qrInput}
								placeholder="トークンを入力..."
								class="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
								onkeydown={(e) =>
									e.key === "Enter" &&
									!e.isComposing &&
									searchByQR()}
							/>
							<button
								onclick={searchByQR}
								disabled={searchLoading || !qrInput.trim()}
								class="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium disabled:opacity-50"
							>
								検索
							</button>
						</div>
					</div>

					<!-- Divider -->
					<div class="flex items-center gap-4">
						<div class="flex-1 h-px bg-gray-200"></div>
						<span class="text-sm text-gray-400">または</span>
						<div class="flex-1 h-px bg-gray-200"></div>
					</div>

					<!-- Manual Search Section -->
					<div class="space-y-3">
						<p class="font-semibold text-gray-900">
							名前・電話番号で検索
						</p>

						<div class="flex gap-2">
							<div class="flex-1 relative">
								<span
									class="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"
									>person</span
								>
								<input
									type="text"
									bind:value={guestNameSearch}
									placeholder="ゲスト名"
									class="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md text-sm"
								/>
							</div>
							<div class="flex-1 relative">
								<span
									class="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"
									>call</span
								>
								<input
									type="text"
									bind:value={phoneSearch}
									placeholder="電話番号"
									class="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md text-sm"
								/>
							</div>
						</div>

						<button
							onclick={searchByNamePhone}
							disabled={searchLoading ||
								(!guestNameSearch.trim() &&
									!phoneSearch.trim())}
							class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-md text-sm font-semibold disabled:opacity-50"
						>
							<span class="material-symbols-rounded text-lg"
								>search</span
							>
							検索
						</button>
					</div>

					{#if searchError}
						<div
							class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
						>
							{searchError}
						</div>
					{/if}
				</div>
			{/if}

			<!-- Step 2: Confirm Identity -->
			{#if checkInStep === 2 && foundReservation}
				<div
					class="flex items-center justify-between px-5 py-4 border-b border-gray-200"
				>
					<h2 class="text-base font-bold text-gray-900">予約確認</h2>
					<button
						onclick={closeWizard}
						class="w-8 h-8 flex items-center justify-center rounded-md bg-gray-100 text-gray-500 hover:bg-gray-200"
					>
						<span class="material-symbols-rounded text-lg"
							>close</span
						>
					</button>
				</div>

				<div class="flex-1 overflow-auto p-5 space-y-4">
					<!-- Success Banner -->
					<div
						class="flex items-center gap-2.5 p-4 bg-emerald-50 border border-emerald-200 rounded-lg"
					>
						<span
							class="material-symbols-rounded text-emerald-500 text-xl"
							style="font-weight: 500">check_circle</span
						>
						<span class="text-sm font-semibold text-emerald-700"
							>予約が見つかりました</span
						>
					</div>

					<!-- Info Card -->
					<div class="bg-gray-50 rounded-lg p-4 space-y-3.5">
						<div class="flex justify-between">
							<span class="text-xs text-gray-500">ゲスト名</span>
							<span class="text-sm font-semibold text-gray-900"
								>{foundReservation.guest_name} 様</span
							>
						</div>
						<div class="flex justify-between">
							<span class="text-xs text-gray-500">客室</span>
							<span class="text-sm font-semibold text-gray-900">
								{foundReservation.room_number}
								{foundReservation.room_name || ""}
							</span>
						</div>
						<div class="flex justify-between">
							<span class="text-xs text-gray-500">宿泊期間</span>
							<span
								class="text-sm font-semibold text-gray-900 font-['Plus_Jakarta_Sans']"
							>
								{formatDateFull(foundReservation.check_in_date)}
								- {formatDateFull(
									foundReservation.check_out_date,
								).slice(5)}（{foundReservation.total_nights}泊）
							</span>
						</div>
						{#if foundReservation.meal_plan === "2meals"}
							<div class="flex justify-between">
								<span class="text-xs text-gray-500">滞在</span>
								<span
									class="text-sm font-semibold text-gray-900"
								>
									{foundReservation.total_nights}泊{foundReservation.total_nights +
										1}食付き - 本日: {foundReservation.current_stay_night}泊目
								</span>
							</div>
						{/if}
						<div class="flex justify-between">
							<span class="text-xs text-gray-500">人数</span>
							<span class="text-sm font-semibold text-gray-900"
								>{foundReservation.party_size}名</span
							>
						</div>
						{#if foundReservation.phone}
							<div class="flex justify-between">
								<span class="text-xs text-gray-500"
									>電話番号</span
								>
								<span
									class="text-sm font-semibold text-gray-900 font-['Plus_Jakarta_Sans']"
									>{foundReservation.phone}</span
								>
							</div>
						{/if}
						<div class="flex justify-between items-center">
							<span class="text-xs text-gray-500">予約元</span>
							<span
								class="px-2 py-0.5 rounded text-xs font-semibold {sourceColors[
									foundReservation.booking_source
								] || 'bg-gray-100 text-gray-800'}"
							>
								{sourceLabels[
									foundReservation.booking_source
								] || foundReservation.booking_source}
							</span>
						</div>
					</div>
				</div>

				<!-- Footer -->
				<div
					class="flex items-center gap-3 px-5 py-4 border-t border-gray-200"
				>
					<button
						onclick={() => (checkInStep = 1)}
						class="px-5 py-2.5 border border-gray-300 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50"
					>
						戻る
					</button>
					<button
						onclick={proceedToStep3}
						class="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700"
					>
						<span class="material-symbols-rounded text-lg"
							>arrow_forward</span
						>
						この予約でチェックイン
					</button>
				</div>
			{/if}

			<!-- Step 3: Additional Info Form -->
			{#if checkInStep === 3 && foundReservation}
				<div
					class="flex items-center justify-between px-5 py-4 border-b border-gray-200"
				>
					<h2 class="text-base font-bold text-gray-900">
						追加情報の入力
					</h2>
					<button
						onclick={closeWizard}
						class="w-8 h-8 flex items-center justify-center rounded-md bg-gray-100 text-gray-500 hover:bg-gray-200"
					>
						<span class="material-symbols-rounded text-lg"
							>close</span
						>
					</button>
				</div>

				<div class="flex-1 overflow-auto p-5 space-y-4">
					<!-- Guest Summary Card -->
					<div
						class="bg-sky-50 border border-sky-200 rounded-lg p-3.5"
					>
						<div class="flex items-center gap-2 mb-1.5">
							<span
								class="material-symbols-rounded text-sky-500 text-lg"
								style="font-weight: 500">check_circle</span
							>
							<span class="text-xs font-semibold text-sky-700"
								>予約情報を確認しました</span
							>
						</div>
						<div class="pl-6">
							<p class="text-sm font-semibold text-gray-900">
								{foundReservation.guest_name} 様　·　{foundReservation.party_size}名
							</p>
							<p
								class="text-xs text-gray-500 font-['Plus_Jakarta_Sans']"
							>
								{foundReservation.room_number}
								{foundReservation.room_name ||
									""}　·　{formatDateFull(
									foundReservation.check_in_date,
								)} - {formatDateFull(
									foundReservation.check_out_date,
								).slice(5)}（{calculateNights(
									foundReservation.check_in_date,
									foundReservation.check_out_date,
								)}泊）
							</p>
						</div>
					</div>

					<!-- Dinner Time Section -->
					<div class="space-y-3">
						<p class="text-sm font-semibold text-gray-900">
							夕食時間
						</p>
						<div class="relative">
							<button
								type="button"
								onclick={() =>
									(showDinnerTimeDropdown =
										!showDinnerTimeDropdown)}
								class="w-full flex items-center gap-3 px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50 transition-colors text-left"
							>
								<span
									class="material-symbols-rounded text-lg text-gray-400"
									>restaurant</span
								>
								<span
									class="flex-1 {checkInForm.dinner_time
										? 'text-gray-900'
										: 'text-gray-400'}"
								>
									{checkInForm.dinner_time ||
										"選択してください"}
								</span>
								<span
									class="material-symbols-rounded text-base text-gray-400 transition-transform {showDinnerTimeDropdown
										? 'rotate-180'
										: ''}">expand_more</span
								>
							</button>

							{#if showDinnerTimeDropdown}
								<!-- Backdrop -->
								<button
									class="fixed inset-0 z-10"
									onclick={() =>
										(showDinnerTimeDropdown = false)}
									aria-label="Close dropdown"
								></button>

								<!-- Dropdown menu -->
								<div
									class="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 max-h-48 overflow-y-auto"
								>
									{#each dinnerTimeOptions as option}
										<button
											type="button"
											onclick={() =>
												selectDinnerTime(option.value)}
											class="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors flex items-center justify-between {checkInForm.dinner_time ===
											option.value
												? 'text-blue-600 font-medium bg-blue-50'
												: 'text-gray-700'}"
										>
											<span
												class="flex items-center gap-2"
											>
												<span
													class="material-symbols-rounded text-base {checkInForm.dinner_time ===
													option.value
														? 'text-blue-600'
														: 'text-gray-400'}"
													>schedule</span
												>
												{option.label}
											</span>
											{#if checkInForm.dinner_time === option.value}
												<span
													class="material-symbols-rounded text-base text-blue-600"
													>check</span
												>
											{/if}
										</button>
									{/each}
								</div>
							{/if}
						</div>
					</div>

					<!-- Allergen Section -->
					<div class="space-y-3">
						<p class="text-sm font-semibold text-gray-900">
							アレルギー・食事制限
						</p>
						<p class="text-xs text-gray-500">
							該当するものを選択し、人数を入力してください
						</p>

						<!-- Selected allergens with person count and dashi option -->
						{#if (checkInForm.allergen_details || []).length > 0}
							<div
								class="space-y-3 p-3 bg-red-50 rounded-lg border border-red-200"
							>
								{#each checkInForm.allergen_details || [] as allergenDetail}
									{@const allergen = allergens.find(
										(a) =>
											a.id === allergenDetail.allergen_id,
									)}
									{#if allergen}
										<div
											class="flex items-center gap-2 flex-wrap"
										>
											<div
												class="flex items-center gap-2 flex-1 min-w-0"
											>
												<span
													class="text-sm font-medium text-red-900"
													>{allergen.name}</span
												>

												<!-- Person count selector -->
												<div
													class="flex items-center gap-1 bg-white rounded-md border border-gray-300 px-2 py-1"
												>
													<button
														type="button"
														onclick={() =>
															updateAllergenCount(
																allergenDetail.allergen_id,
																Math.max(
																	1,
																	allergenDetail.person_count -
																		1,
																),
															)}
														disabled={allergenDetail.person_count <=
															1}
														class="text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
													>
														<span
															class="material-symbols-rounded text-base"
															>remove</span
														>
													</button>
													<span
														class="text-sm font-semibold text-gray-900 min-w-[2ch] text-center"
														>{allergenDetail.person_count}</span
													>
													<button
														type="button"
														onclick={() =>
															updateAllergenCount(
																allergenDetail.allergen_id,
																Math.min(
																	foundReservation?.party_size ||
																		10,
																	allergenDetail.person_count +
																		1,
																),
															)}
														disabled={allergenDetail.person_count >=
															(foundReservation?.party_size ||
																10)}
														class="text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
													>
														<span
															class="material-symbols-rounded text-base"
															>add</span
														>
													</button>
													<span
														class="text-xs text-gray-500 ml-1"
														>名</span
													>
												</div>
											</div>

											<div
												class="flex items-center gap-2"
											>
												{#if supportsDashiOption(allergen.name)}
													<button
														type="button"
														onclick={() =>
															toggleDashiRestriction(
																allergenDetail.allergen_id,
															)}
														class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors {dashiRestrictions[
															allergenDetail
																.allergen_id
														]
															? 'bg-red-600 text-white'
															: 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'}"
													>
														<span
															class="material-symbols-rounded text-sm"
														>
															{dashiRestrictions[
																allergenDetail
																	.allergen_id
															]
																? "check_box"
																: "check_box_outline_blank"}
														</span>
														出汁もNG
													</button>
												{/if}

												<button
													type="button"
													onclick={() =>
														removeAllergen(
															allergenDetail.allergen_id,
														)}
													class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
												>
													<span
														class="material-symbols-rounded text-sm"
														style="font-weight: 500"
														>close</span
													>
												</button>
											</div>
										</div>
									{/if}
								{/each}
							</div>
						{/if}

						<!-- Allergen search -->
						<div class="relative">
							<span
								class="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"
								>search</span
							>
							<input
								type="text"
								bind:value={allergenSearchQuery}
								placeholder="アレルゲンを検索..."
								class="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm"
							/>
						</div>

						<!-- Allergen list -->
						<div
							class="max-h-36 overflow-y-auto border border-gray-200 rounded-lg"
						>
							<div class="flex flex-wrap gap-2 p-3">
								{#each filteredAllergens as allergen (allergen.id)}
									{@const isSelected = (
										checkInForm.allergen_details || []
									).some(
										(d) => d.allergen_id === allergen.id,
									)}
									<button
										type="button"
										onclick={() => addAllergen(allergen.id)}
										disabled={isSelected}
										class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors {isSelected
											? 'bg-red-100 text-red-700 border border-red-300 cursor-not-allowed'
											: 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
									>
										{allergen.name}
										{#if isSelected}
											<span
												class="material-symbols-rounded text-sm"
												style="font-weight: 500"
												>check</span
											>
										{/if}
									</button>
								{:else}
									<p class="text-sm text-gray-400 py-2">
										該当するアレルゲンがありません
									</p>
								{/each}
							</div>
						</div>
					</div>

					<!-- Special Requests -->
					<div class="space-y-2">
						<label
							for="special-requests"
							class="text-sm font-semibold text-gray-900"
							>特別なご要望</label
						>
						<textarea
							id="special-requests"
							bind:value={checkInForm.special_requests}
							rows="2"
							placeholder="車椅子の準備、お祝いのご用意など..."
							class="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm resize-none"
						></textarea>
					</div>
				</div>

				<!-- Footer -->
				<div
					class="flex items-center gap-3 px-5 py-4 border-t border-gray-200 bg-gray-50"
				>
					<button
						onclick={() => (checkInStep = 2)}
						class="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
					>
						キャンセル
					</button>
					<button
						onclick={completeCheckIn}
						disabled={checkInLoading}
						class="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
					>
						<span
							class="material-symbols-rounded text-lg"
							style="font-weight: 500">check</span
						>
						{checkInLoading ? "処理中..." : "チェックイン完了"}
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<!-- Check-out Confirmation Modal -->
{#if showCheckOutConfirm && checkOutTarget}
	<div
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
	>
		<div class="bg-white rounded-xl shadow-2xl w-[380px] overflow-hidden">
			<div class="p-6 text-center">
				<div
					class="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center"
				>
					<span
						class="material-symbols-rounded text-amber-600 text-2xl"
						>logout</span
					>
				</div>
				<h3 class="text-lg font-bold text-gray-900 mb-2">
					チェックアウト確認
				</h3>
				<p class="text-gray-600 mb-1">
					<span class="font-semibold"
						>{checkOutTarget.guest_name}</span
					> 様
				</p>
				<p class="text-sm text-gray-500 mb-6">
					{checkOutTarget.room_number}号室 をチェックアウトしますか？
				</p>
				<div class="flex gap-3">
					<button
						onclick={closeCheckOutConfirm}
						class="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
					>
						キャンセル
					</button>
					<button
						onclick={handleCheckOut}
						class="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700"
					>
						チェックアウト
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}


<!-- Toast Notification -->
{#if showToast}
	<div class="fixed bottom-6 right-6 z-50 animate-slide-up">
		<div
			class="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg {toastType ===
			'success'
				? 'bg-emerald-600 text-white'
				: toastType === 'error'
					? 'bg-red-600 text-white'
					: 'bg-gray-800 text-white'}"
		>
			<span
				class="material-symbols-rounded text-xl"
				style="font-weight: 500"
			>
				{#if toastType === "success"}
					check_circle
				{:else if toastType === "error"}
					error
				{:else}
					info
				{/if}
			</span>
			<span class="text-sm font-medium">{toastMessage}</span>
			<button
				onclick={closeToast}
				class="ml-2 opacity-70 hover:opacity-100"
			>
				<span class="material-symbols-rounded text-lg">close</span>
			</button>
		</div>
	</div>
{/if}

<style>
	.material-symbols-rounded {
		font-variation-settings:
			"FILL" 0,
			"wght" 400,
			"GRAD" 0,
			"opsz" 24;
	}

	@keyframes slide-up {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.animate-slide-up {
		animation: slide-up 0.3s ease-out;
	}
</style>
