<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import { authState } from "$lib/auth.svelte";
	import {
		getReservations,
		getMenuGroups,
		getMenus,
		type Reservation,
		type MenuGroup,
		type Menu,
	} from "$lib/api";
	import { supabase } from "$lib/supabase";
	import type { RealtimeChannel } from "@supabase/supabase-js";

	const isStaff = $derived(authState.isStaff);

	// Date picker state
	let showDateDropdown = $state(false);
	let selectedDate = $state<string | null>(null);

	// Search filter for allergen table
	let allergenSearchQuery = $state("");

	// Stay period filter for allergen table
	let selectedStayPeriod = $state<"all" | 1 | 2 | "3+">("all");

	// Data
	let reservations = $state<Reservation[]>([]);
	let menuGroups = $state<MenuGroup[]>([]);
	let menus = $state<Menu[]>([]);
	let loading = $state(true);
	let lastRefresh = $state<Date | null>(null);

	// Expanded rows state — stores unique keys like "101-2"
	let expandedRows = $state(new Set<string>());

	function toggleRow(key: string) {
		const next = new Set(expandedRows);
		if (next.has(key)) {
			next.delete(key);
		} else {
			next.add(key);
		}
		expandedRows = next;
	}

	// Derived: which menu groups are kids menus
	const kidsMenuGroupIds = $derived(
		new Set(menuGroups.flatMap((mg) => mg.kids_group_ids || [])),
	);

	// Simplified PAX count: one row per menu group + stay night combination
	interface SimplifiedPaxRow {
		menuGroupId: string;
		menuGroupName: string;
		stayNight: number;
		count: number;
		isKidsMenu: boolean;
	}

	const simplifiedPaxData = $derived.by(() => {
		const rows: SimplifiedPaxRow[] = [];

		if (!selectedDate) return [];

		const targetDate = new Date(selectedDate);
		targetDate.setHours(0, 0, 0, 0);

		// Get all confirmed reservations
		const confirmedReservations = reservations.filter(
			(r) => r.status === "confirmed",
		);

		// Count guests by menu group and stay night
		const counts: Record<string, SimplifiedPaxRow> = {};

		confirmedReservations.forEach((res) => {
			const checkInDate = new Date(res.check_in_date);
			checkInDate.setHours(0, 0, 0, 0);
			const checkOutDate = new Date(res.check_out_date);
			checkOutDate.setHours(0, 0, 0, 0);

			// Only count guests who are actually staying on the selected date
			if (targetDate < checkInDate || targetDate >= checkOutDate) {
				return;
			}

			// Calculate which night of their stay this is
			const daysDiff = Math.floor(
				(targetDate.getTime() - checkInDate.getTime()) /
					(1000 * 60 * 60 * 24),
			);
			const stayNight = daysDiff + 1; // 1泊目, 2泊目, 3泊目, etc.

			// Find matching menu groups by stay_period_nights
			const matchingGroups = menuGroups.filter(
				(mg) =>
					mg.stay_period_nights &&
					mg.stay_period_nights.includes(stayNight),
			);

			matchingGroups.forEach((mg) => {
				const key = `${mg.id}-${stayNight}`;
				if (!counts[key]) {
					counts[key] = {
						menuGroupId: mg.id,
						menuGroupName: mg.name,
						stayNight,
						count: 0,
						isKidsMenu: kidsMenuGroupIds.has(mg.id),
					};
				}
				counts[key].count += res.party_size;
			});
		});

		// Convert to array and sort by stay night, then by menu group name
		return Object.values(counts).sort((a, b) => {
			if (a.stayNight !== b.stayNight) return a.stayNight - b.stayNight;
			return a.menuGroupName.localeCompare(b.menuGroupName);
		});
	});

	// Allergen information table - only guests with allergens on selected date
	interface AllergenRow {
		roomNumber: string;
		stayNight: number;
		totalNights: number;
		allergenDetails: Array<{
			allergen_id: string;
			person_count: number;
			allergen?: any;
		}>;
	}

	// Helper function to convert katakana to hiragana for flexible search
	function toHiragana(str: string): string {
		return str.replace(/[\u30A1-\u30F6]/g, (match) => {
			const chr = match.charCodeAt(0) - 0x60;
			return String.fromCharCode(chr);
		});
	}

	// Helper function to normalize full-width to half-width
	function toHalfWidth(str: string): string {
		return str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => {
			return String.fromCharCode(s.charCodeAt(0) - 0xfee0);
		});
	}

	// Kanji to reading map for common allergen-related characters
	const kanjiReadingMap: Record<string, string> = {
		牛: "ぎゅう",
		肉: "にく",
		豚: "ぶた",
		鶏: "とり",
		卵: "たまご",
		乳: "にゅう",
		小: "こ",
		麦: "むぎ",
		大: "だい",
		豆: "まめ",
		落: "らっ",
		花: "か",
		生: "なま",
		蕎: "そ",
		麦: "ばく",
		海: "かい",
		老: "えび",
		蟹: "かに",
		貝: "かい",
		魚: "さかな",
		鮭: "さけ",
		鯖: "さば",
		鱈: "たら",
		鰤: "ぶり",
		秋: "あき",
		刀: "さんま",
		鰺: "あじ",
		鰯: "いわし",
		鮪: "まぐろ",
		鯛: "たい",
		鰹: "かつお",
		鮃: "ひらめ",
		鱸: "すずき",
		鰈: "かれい",
		鰻: "うなぎ",
		烏: "いか",
		賊: "ぞく",
		蛸: "たこ",
		帆: "ほ",
		立: "たて",
		鮑: "あわび",
		栄: "さざえ",
		螺: "えい",
		牡: "かき",
		蛎: "れい",
		赤: "あか",
		貝: "がい",
		松: "まつ",
		茸: "たけ",
		山: "やま",
		芋: "いも",
		桃: "もも",
		林: "りん",
		檎: "ご",
		葡: "ぶ",
		萄: "どう",
		柿: "かき",
		梨: "なし",
		胡: "ご",
		麻: "ま",
		蜂: "はち",
		蜜: "みつ",
		海: "かい",
		苔: "たい",
		若: "わか",
		芽: "め",
	};

	// Convert kanji string to hiragana reading
	function kanjiToReading(str: string): string {
		return str
			.split("")
			.map((char) => kanjiReadingMap[char] || char)
			.join("");
	}

	// Available stay periods (to show/hide filter buttons)
	const availableStayPeriods = $derived.by(() => {
		const periods = new Set<number>();

		if (!selectedDate) return periods;

		const targetDate = new Date(selectedDate);
		targetDate.setHours(0, 0, 0, 0);

		const confirmedReservations = reservations.filter(
			(r) => r.status === "confirmed",
		);

		confirmedReservations.forEach((res) => {
			if (!res.allergen_details || res.allergen_details.length === 0) {
				return;
			}

			const checkInDate = new Date(res.check_in_date);
			checkInDate.setHours(0, 0, 0, 0);
			const checkOutDate = new Date(res.check_out_date);
			checkOutDate.setHours(0, 0, 0, 0);

			if (targetDate < checkInDate || targetDate >= checkOutDate) {
				return;
			}

			const daysDiff = Math.floor(
				(targetDate.getTime() - checkInDate.getTime()) /
					(1000 * 60 * 60 * 24),
			);
			const stayNight = daysDiff + 1;
			periods.add(stayNight);
		});

		return periods;
	});

	const allergenData = $derived.by(() => {
		const rows: AllergenRow[] = [];

		if (!selectedDate) return [];

		const targetDate = new Date(selectedDate);
		targetDate.setHours(0, 0, 0, 0);

		// Get all confirmed reservations with allergens
		const confirmedReservations = reservations.filter(
			(r) => r.status === "confirmed",
		);

		confirmedReservations.forEach((res) => {
			// Skip if no allergen details
			if (!res.allergen_details || res.allergen_details.length === 0) {
				return;
			}

			const checkInDate = new Date(res.check_in_date);
			checkInDate.setHours(0, 0, 0, 0);
			const checkOutDate = new Date(res.check_out_date);
			checkOutDate.setHours(0, 0, 0, 0);

			// Only include guests who are staying on the selected date
			if (targetDate < checkInDate || targetDate >= checkOutDate) {
				return;
			}

			// Calculate which night of their stay this is
			const daysDiff = Math.floor(
				(targetDate.getTime() - checkInDate.getTime()) /
					(1000 * 60 * 60 * 24),
			);
			const stayNight = daysDiff + 1; // 1泊目, 2泊目, 3泊目, etc.

			rows.push({
				roomNumber: res.room_number,
				stayNight,
				totalNights: res.total_nights,
				allergenDetails: res.allergen_details,
			});
		});

		// Sort by room number
		let sortedRows = rows.sort((a, b) =>
			a.roomNumber.localeCompare(b.roomNumber),
		);

		// Apply stay period filter
		if (selectedStayPeriod !== "all") {
			sortedRows = sortedRows.filter((row) => {
				if (selectedStayPeriod === "3+") {
					return row.stayNight >= 3;
				}
				return row.stayNight === selectedStayPeriod;
			});
		}

		// Apply search filter
		if (!allergenSearchQuery.trim()) {
			return sortedRows;
		}

		// Normalize search query: convert to hiragana, half-width, and lowercase
		const normalizedSearch = toHiragana(
			toHalfWidth(allergenSearchQuery.toLowerCase()),
		);

		return sortedRows.filter((row) => {
			// Search by room number (normalize for full-width numbers)
			const normalizedRoom = toHalfWidth(row.roomNumber.toLowerCase());
			if (normalizedRoom.includes(normalizedSearch)) {
				return true;
			}

			// Search by allergen name (support hiragana/katakana/kanji)
			return row.allergenDetails.some((detail) => {
				if (!detail.allergen) return false;

				const allergenName = detail.allergen.name;

				// Check direct match (exact text)
				if (
					allergenName
						.toLowerCase()
						.includes(allergenSearchQuery.toLowerCase())
				) {
					return true;
				}

				// Check hiragana/katakana normalized match
				const normalizedAllergen = toHiragana(
					allergenName.toLowerCase(),
				);
				if (normalizedAllergen.includes(normalizedSearch)) {
					return true;
				}

				// Check kanji reading match (convert kanji to hiragana)
				const allergenReading = toHiragana(
					kanjiToReading(allergenName).toLowerCase(),
				);
				return allergenReading.includes(normalizedSearch);
			});
		});
	});

	// Calendar functions
	function formatDateISO(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	}

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

	function selectSpecificDate(dateStr: string) {
		selectedDate = dateStr;
		showDateDropdown = false;
		loadData();
	}

	// Allergen → menu group + products cross-reference map
	// Maps allergen_id → Array<{ menuGroupName: string; menuName: string; productNames: string[] }>
	const allergenMenuMap = $derived.by(() => {
		const map = new Map<
			string,
			Array<{
				menuGroupName: string;
				menuName: string;
				productNames: string[];
			}>
		>();

		for (const menu of menus) {
			// Find matching menu group
			const menuGroup = menuGroups.find(
				(mg) => mg.id === menu.menu_group_id,
			);
			const menuGroupName = menuGroup
				? menuGroup.name
				: menu.menu_group_id
					? "不明なグループ"
					: "グループなし";

			// Collect unique allergen IDs in this menu from products
			const seenAllergenIds = new Set<string>();
			for (const product of menu.products || []) {
				for (const allergen of product.allergens || []) {
					if (!seenAllergenIds.has(allergen.id)) {
						seenAllergenIds.add(allergen.id);
					}
				}
			}

			// Also collect allergens directly on the menu
			for (const allergen of menu.allergens || []) {
				if (!seenAllergenIds.has(allergen.id)) {
					seenAllergenIds.add(allergen.id);
				}
			}

			for (const allergenId of seenAllergenIds) {
				// Find which products in this menu contain this allergen
				const affectedProducts = (menu.products || [])
					.filter((p) =>
						(p.allergens || []).some((a) => a.id === allergenId),
					)
					.map((p) => p.name);

				const entry = {
					menuGroupName,
					menuName: menu.name,
					productNames: affectedProducts,
				};

				if (!map.has(allergenId)) {
					map.set(allergenId, []);
				}
				map.get(allergenId)!.push(entry);
			}
		}

		return map;
	});

	// Allergen synonym pairs — guest vocabulary vs. kitchen/ingredient vocabulary
	// Both directions are listed so lookup works regardless of which the guest used
	const allergenSynonymNames: Record<string, string[]> = {
		グルテン: ["小麦"],
		小麦: ["グルテン"],
		乳: ["牛乳", "ミルク", "ラクトース"],
		牛乳: ["乳", "ミルク"],
		ミルク: ["乳", "牛乳"],
	};

	// Build name → [id] map from all menus' allergen data so we can resolve synonym names to IDs
	const allergenNameToIds = $derived.by(() => {
		const map = new Map<string, string[]>();
		for (const menu of menus) {
			for (const allergen of menu.allergens || []) {
				if (!map.has(allergen.name)) map.set(allergen.name, []);
				if (!map.get(allergen.name)!.includes(allergen.id)) {
					map.get(allergen.name)!.push(allergen.id);
				}
			}
			for (const product of menu.products || []) {
				for (const allergen of product.allergens || []) {
					if (!map.has(allergen.name)) map.set(allergen.name, []);
					if (!map.get(allergen.name)!.includes(allergen.id)) {
						map.get(allergen.name)!.push(allergen.id);
					}
				}
			}
		}
		return map;
	});

	// Returns all related menus for an allergen, including its synonyms
	function getMenusForAllergen(allergenId: string, allergenName: string) {
		const direct = allergenMenuMap.get(allergenId) ?? [];
		const synonymNames = allergenSynonymNames[allergenName] ?? [];
		const synonymEntries = synonymNames.flatMap((synName) => {
			const synIds = allergenNameToIds.get(synName) ?? [];
			return synIds.flatMap((id) => allergenMenuMap.get(id) ?? []);
		});
		// Deduplicate by menuName in case both IDs point to the same menu entries
		const seen = new Set<string>();
		return [...direct, ...synonymEntries].filter((entry) => {
			const key = entry.menuName;
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});
	}

	// Load data
	async function loadData() {
		loading = true;
		try {
			const [resData, mgData, menuData] = await Promise.all([
				getReservations(selectedDate ?? undefined, "confirmed"),
				getMenuGroups(),
				getMenus(),
			]);
			reservations = resData;
			menuGroups = mgData;
			menus = menuData;
			lastRefresh = new Date();
			// Reset expanded rows on data refresh
			expandedRows = new Set();
			console.log(
				`✅ Data refreshed at ${lastRefresh.toLocaleTimeString("ja-JP")}`,
			);
		} catch (err) {
			console.error("Failed to load data:", err);
		} finally {
			loading = false;
		}
	}

	// Real-time subscription
	let realtimeChannel: RealtimeChannel | null = null;

	onMount(() => {
		if (!isStaff) {
			window.location.href = "/login";
			return;
		}
		// Set today's date by default
		const now = new Date();
		selectedDate = formatDateISO(now);
		loadData();

		// Subscribe to real-time changes on reservations and menu_groups tables
		realtimeChannel = supabase
			.channel("kitchen-production-changes")
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "reservations",
				},
				(payload) => {
					console.log("🔔 Reservation changed:", payload.eventType);
					if (payload.eventType === "UPDATE") {
						// Patch in-place for status/field changes — avoids full refetch
						const updated = payload.new as Reservation;
						const idx = reservations.findIndex((r) => r.id === updated.id);
						if (idx !== -1) {
							reservations = [
								...reservations.slice(0, idx),
								updated,
								...reservations.slice(idx + 1),
							];
						} else {
							loadData();
						}
					} else {
						// INSERT/DELETE may affect date-filtered set — reload
						loadData();
					}
				},
			)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "menu_groups",
				},
				(payload) => {
					console.log("🔔 Menu group changed:", payload.eventType);
					loadData(); // Structure change — always reload
				},
			)
			.subscribe((status, err) => {
				console.log("📡 Kitchen realtime status:", status, err);
				if (status === "CHANNEL_ERROR") {
					console.error(
						"❌ Channel error - Supabase free tier allows only 2 concurrent real-time connections. Close other tabs or upgrade plan.",
					);
				}
			});
	});

	onDestroy(() => {
		if (realtimeChannel) {
			supabase.removeChannel(realtimeChannel);
		}
	});
</script>

<div class="h-screen flex flex-col overflow-hidden bg-gray-50">
	<!-- Header -->
	<header
		class="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between"
	>
		<!-- Title and Date selector on left -->
		<div class="flex items-center gap-4">
			<div>
				<h1 class="text-2xl font-bold text-gray-900">厨房生産管理</h1>
				<p class="text-sm text-gray-600 mt-0.5">
					Kitchen Production Table
				</p>
			</div>

			<!-- Date Selector -->
			<div class="relative">
				<button
					onclick={() => (showDateDropdown = !showDateDropdown)}
					class="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-base font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
				>
					<span class="material-symbols-rounded text-xl text-gray-500"
						>calendar_month</span
					>
					{selectedDate
						? new Date(selectedDate).toLocaleDateString("ja-JP", {
								year: "numeric",
								month: "long",
								day: "numeric",
							})
						: new Date().toLocaleDateString("ja-JP", {
								year: "numeric",
								month: "long",
								day: "numeric",
							})}
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
						<!-- Month header -->
						<div class="text-center mb-3">
							<span class="text-sm font-semibold text-gray-900">
								{new Date().toLocaleDateString("ja-JP", {
									year: "numeric",
									month: "long",
								})}
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
								{@const isSelected = selectedDate === dateStr}
								<button
									onclick={() => selectSpecificDate(dateStr)}
									class="aspect-square p-1 text-xs rounded-lg transition-colors relative
										{isSelected
										? 'bg-slate-800 text-white font-semibold'
										: isToday
											? 'bg-blue-100 text-slate-800 font-semibold'
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

		<!-- Real-time indicator on right -->
		<div class="flex items-center gap-2 text-xs text-gray-500">
			<span
				class="material-symbols-rounded text-sm text-green-600 {loading
					? 'animate-spin'
					: ''}">sensors</span
			>
			<div class="flex flex-col">
				<span class="flex items-center gap-1">
					<span
						class="w-2 h-2 bg-green-500 rounded-full animate-pulse"
					></span>
					リアルタイム更新
				</span>
				{#if lastRefresh}
					<span class="text-xs text-gray-400"
						>最終更新: {lastRefresh.toLocaleTimeString(
							"ja-JP",
						)}</span
					>
				{/if}
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="flex-1 overflow-auto p-6">
		{#if loading}
			<div class="flex items-center justify-center h-64">
				<div class="text-center">
					<div
						class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-navy"
					></div>
					<p class="mt-4 text-gray-600">読み込み中...</p>
				</div>
			</div>
		{:else}
			<!-- PAX Summary Table (Simplified) -->
			<div
				class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6"
			>
				<div class="px-6 py-4 border-b border-gray-200">
					<h2 class="text-lg font-semibold text-gray-900">
						滞在期間別 PAX集計
					</h2>
				</div>

				<div class="overflow-x-auto">
					<table class="w-full">
						<thead class="bg-gray-50 border-b border-gray-200">
							<tr>
								<th
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
								>
									Menu Group
								</th>
								<th
									class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
								>
									Total PAX
								</th>
							</tr>
						</thead>
						<tbody class="bg-white divide-y divide-gray-200">
							{#if simplifiedPaxData.length === 0}
								<tr>
									<td
										colspan="2"
										class="px-6 py-12 text-center text-gray-500"
									>
										データがありません
									</td>
								</tr>
							{:else}
								{#each simplifiedPaxData as row}
									<tr class="hover:bg-gray-50">
										<td class="px-6 py-4 whitespace-nowrap">
											<div
												class="flex items-center gap-2"
											>
												<span
													class="text-sm font-medium text-gray-900"
													>{row.menuGroupName}</span
												>
												<span
													class="text-xs text-gray-500"
													>({row.stayNight}泊目)</span
												>
												{#if row.isKidsMenu}
													<span
														class="px-2 py-0.5 text-xs bg-pink-100 text-pink-800 rounded"
														>子供</span
													>
												{/if}
											</div>
										</td>
										<td
											class="px-6 py-4 text-center whitespace-nowrap"
										>
											<span
												class="text-sm font-semibold text-gray-900"
												>{row.count}</span
											>
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>

			<!-- Allergen Information Table -->
			<div
				class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
			>
				<div class="px-6 py-4 border-b border-gray-200">
					<div class="flex items-center justify-between mb-3">
						<h2 class="text-lg font-semibold text-gray-900">
							アレルギー情報
						</h2>

						<!-- Search Filter -->
						<div class="relative">
							<input
								type="text"
								bind:value={allergenSearchQuery}
								placeholder="部屋番号・アレルゲン検索..."
								class="w-64 px-3 py-2 pl-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy focus:border-transparent"
							/>
							<span
								class="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"
								>search</span
							>
							{#if allergenSearchQuery}
								<button
									onclick={() => (allergenSearchQuery = "")}
									class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
								>
									<span
										class="material-symbols-rounded text-lg"
										>close</span
									>
								</button>
							{/if}
						</div>
					</div>

					<!-- Stay Period Filter Buttons -->
					{#if availableStayPeriods.size > 0}
						<div class="flex items-center gap-2">
							<span class="text-xs font-medium text-gray-600 mr-2"
								>滞在期間:</span
							>
							<button
								onclick={() => (selectedStayPeriod = "all")}
								class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors {selectedStayPeriod ===
								'all'
									? 'bg-blue-100 text-slate-800 border border-blue-300'
									: 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'}"
							>
								全て
							</button>
							{#if availableStayPeriods.has(1)}
								<button
									onclick={() => (selectedStayPeriod = 1)}
									class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors {selectedStayPeriod ===
									1
										? 'bg-blue-100 text-slate-800 border border-blue-300'
										: 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'}"
								>
									1泊目
								</button>
							{/if}
							{#if availableStayPeriods.has(2)}
								<button
									onclick={() => (selectedStayPeriod = 2)}
									class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors {selectedStayPeriod ===
									2
										? 'bg-blue-100 text-slate-800 border border-blue-300'
										: 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'}"
								>
									2泊目
								</button>
							{/if}
							{#if Array.from(availableStayPeriods).some((night) => night >= 3)}
								<button
									onclick={() => (selectedStayPeriod = "3+")}
									class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors {selectedStayPeriod ===
									'3+'
										? 'bg-blue-100 text-slate-800 border border-blue-300'
										: 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'}"
								>
									3+泊目
								</button>
							{/if}
						</div>
					{/if}
				</div>

				<div class="overflow-x-auto">
					<table class="w-full">
						<thead class="bg-gray-50 border-b border-gray-200">
							<tr>
								<th
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32"
								>
									部屋番号
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40"
								>
									滞在期間
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
								>
									アレルゲン
								</th>
								<th class="px-4 py-3 w-10"></th>
							</tr>
						</thead>
						<tbody class="bg-white">
							{#if allergenData.length === 0}
								<tr>
									<td
										colspan="4"
										class="px-6 py-12 text-center text-gray-500"
									>
										アレルギー情報がありません
									</td>
								</tr>
							{:else}
								{#each allergenData as row}
									{@const rowKey = `${row.roomNumber}-${row.stayNight}`}
									{@const isExpanded =
										expandedRows.has(rowKey)}
									<!-- Main row -->
									<tr
										class="border-b border-gray-200 cursor-pointer transition-colors {isExpanded
											? 'bg-red-50/40 hover:bg-red-50/60'
											: 'hover:bg-gray-50'}"
										onclick={() => toggleRow(rowKey)}
									>
										<td class="px-6 py-4 whitespace-nowrap">
											<span
												class="text-sm font-medium text-gray-900"
												>{row.roomNumber}</span
											>
										</td>
										<td class="px-6 py-4 whitespace-nowrap">
											<span class="text-sm text-gray-900"
												>{row.stayNight} - {row.totalNights}</span
											>
										</td>
										<td class="px-6 py-4">
											<div class="flex flex-wrap gap-1">
												{#each row.allergenDetails as detail}
													{#if detail.allergen}
														<span
															class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200"
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
										</td>
										<!-- Chevron -->
										<td class="px-4 py-4 text-right">
											<span
												class="material-symbols-rounded text-gray-400 text-xl transition-transform duration-200 {isExpanded
													? 'rotate-180'
													: ''}"
											>
												expand_more
											</span>
										</td>
									</tr>

									<!-- Expanded detail row -->
									{#if isExpanded}
										<tr
											class="border-b border-gray-200 bg-orange-50/30"
										>
											<td colspan="4" class="px-6 py-5">
												<div class="space-y-4">
													<p
														class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3"
													>
														アレルゲン詳細 —
														影響するメニューグループ・商品
													</p>
													{#each row.allergenDetails as detail}
														{#if detail.allergen}
															{@const relatedMenus =
																getMenusForAllergen(
																	detail
																		.allergen
																		.id,
																	detail
																		.allergen
																		.name,
																)}
															<div
																class="rounded-xl border border-red-200 bg-white overflow-hidden shadow-sm"
															>
																<!-- Allergen header -->
																<div
																	class="flex items-center gap-3 px-4 py-3 bg-red-50 border-b border-red-100"
																>
																	<span
																		class="material-symbols-rounded text-red-500 text-base"
																		>warning</span
																	>
																	<span
																		class="text-sm font-bold text-red-700"
																		>{detail
																			.allergen
																			.name}</span
																	>
																	<span
																		class="ml-1 px-2 py-0.5 bg-red-100 text-red-600 text-xs font-semibold rounded-full"
																		>{detail.person_count}名</span
																	>
																	{#if detail.allergen.category}
																		<span
																			class="ml-auto text-xs text-gray-400"
																			>{detail
																				.allergen
																				.category}</span
																		>
																	{/if}
																</div>
																<!-- Related menus/products -->
																<div
																	class="px-4 py-3"
																>
																	{#if relatedMenus.length === 0}
																		<p
																			class="text-xs text-gray-400 italic"
																		>
																			このアレルゲンを含むメニュー情報が見つかりません
																		</p>
																	{:else}
																		<div
																			class="space-y-2.5"
																		>
																			{#each relatedMenus as menuEntry}
																				<div
																					class="flex items-start gap-3"
																				>
																					<!-- Menu group tag -->
																					<div
																						class="flex-shrink-0"
																					>
																						<span
																							class="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-slate-800 border border-blue-200 rounded-lg text-xs font-semibold whitespace-nowrap"
																						>
																							<span
																								class="material-symbols-rounded text-[13px]"
																								>restaurant_menu</span
																							>
																							{menuEntry.menuGroupName}
																						</span>
																					</div>
																					<!-- Menu name + products -->
																					<div
																						class="flex flex-col gap-1 min-w-0"
																					>
																						<span
																							class="text-xs font-medium text-gray-700"
																							>{menuEntry.menuName}</span
																						>
																						{#if menuEntry.productNames.length > 0}
																							<div
																								class="flex flex-wrap gap-1"
																							>
																								{#each menuEntry.productNames as productName}
																									<span
																										class="inline-flex items-center px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[11px] font-medium"
																									>
																										{productName}
																									</span>
																								{/each}
																							</div>
																						{/if}
																					</div>
																				</div>
																			{/each}
																		</div>
																	{/if}
																</div>
															</div>
														{/if}
													{/each}
												</div>
											</td>
										</tr>
									{/if}
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	</main>
</div>
