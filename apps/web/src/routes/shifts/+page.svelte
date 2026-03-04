<script lang="ts">
	import { onDestroy } from "svelte";
	import { authState, signInWithGoogle, isTokenExpiringSoon, refreshAuthToken } from "$lib/auth.svelte";
	import {
		getShiftStaff,
		getShiftPeriods,
		getSchedule,
		bulkUpdateCells,
		clearSchedule,
		createShiftPeriod,
		deleteShiftPeriod,
		createShiftStaff,
		updateShiftStaff,
		deleteShiftStaff,
		reorderShiftStaff,
		optimizeSchedule,
		checkOptimizerHealth,
		prefetchManager,
		apiCache,
		type CellUpdate,
	} from "$lib/shifts/api";
	import type {
		ScheduleStaff,
		SchedulePeriod,
		ShiftSymbol,
	} from "$lib/shifts/types";
	import { SHIFT_SYMBOLS, SHIFT_LABELS } from "$lib/shifts/types";
	import ScheduleTable from "$lib/shifts/components/ScheduleTable.svelte";
	import PeriodPicker from "$lib/shifts/components/PeriodPicker.svelte";
	import ScheduleSkeleton from "$lib/shifts/components/ScheduleSkeleton.svelte";
	import TableSkeleton from "$lib/shifts/components/TableSkeleton.svelte";
	import OptimizeOverlay from "$lib/shifts/components/OptimizeOverlay.svelte";
	import Sidebar from "$lib/components/Sidebar.svelte";

	// ── Sidebar State ──
	let sidebarCollapsed = $state(false);
	let sidebarMobileOpen = $state(false);
	const sidebarSections = [
		{
			label: "ホーム",
			items: [
				{
					icon: "dashboard",
					label: "ダッシュボード",
					href: "/dashboard",
					active: false,
				},
			],
		},
		{
			label: "スタッフ",
			items: [
				{
					icon: "edit_calendar",
					label: "シフト管理",
					href: "/shifts",
					active: true,
				},
				{
					icon: "calendar_month",
					label: "シフトカレンダー",
					href: "/staff/calendar",
					active: false,
				},
			],
		},
	];

	// ── Navigation State ──
	type ShiftSection = "schedule" | "settings";
	let activeSection: ShiftSection = $state("schedule");

	// ── Session cache helpers ──
	// Persist staff/periods across tab discards so the skeleton never flashes on return.
	const SESSION_KEY_STAFF = 'shifts:staff';
	const SESSION_KEY_PERIODS = 'shifts:periods';

	function sessionSave(key: string, value: unknown) {
		try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
	}
	function sessionLoad<T>(key: string): T | null {
		try {
			const raw = sessionStorage.getItem(key);
			return raw ? JSON.parse(raw) as T : null;
		} catch { return null; }
	}

	// ── Data State ──
	// Pre-seed from sessionStorage so there's no blank slate after a tab discard
	let staff: ScheduleStaff[] = $state(sessionLoad<ScheduleStaff[]>(SESSION_KEY_STAFF) ?? []);
	let periods: SchedulePeriod[] = $state(sessionLoad<SchedulePeriod[]>(SESSION_KEY_PERIODS) ?? []);
	let selectedPeriodId: string | null = $state(null);
	let scheduleData: Record<string, Record<string, string>> = $state({});
	let dateRange: string[] = $state([]);
	let loading = $state(false);
	let loadingSchedule = $state(false);
	let saving = $state(false);
	let reconnecting = $state(false); // true when reloading after tab wake-up
	let error = $state("");
	let successMessage = $state("");

	// ── Optimization State ──
	let optimizing = $state(false);
	let clearing = $state(false);
	let optimizerHealthy = $state(false);


	// ── Optimize Progress Overlay ──
	type OptimizeStage = {
		id: string;
		label: string;
		detail: string;
		icon: string;
		weight: number; // relative time fraction
	};
	const OPTIMIZE_STAGES: OptimizeStage[] = [
		{ id: 'init',        label: '初期化',           detail: 'スタッフ・日程データ読み込み中...',    icon: 'database',          weight: 8  },
		{ id: 'constraints', label: '制約チェック',      detail: '制約条件を検証・構成中...',            icon: 'rule',              weight: 12 },
		{ id: 'model',       label: 'モデル構築',        detail: 'CP-SATモデルを構築中...',              icon: 'schema',            weight: 15 },
		{ id: 'solving',     label: 'OR-Tools 最適化',   detail: 'CP-SATソルバーで最適解を探索中...',   icon: 'psychology',        weight: 50 },
		{ id: 'extract',     label: '解の抽出',          detail: 'スケジュールデータを構成中...',         icon: 'data_object',       weight: 8  },
		{ id: 'saving',      label: '保存',              detail: 'スケジュールを保存中...',               icon: 'save',              weight: 7  },
	];
	let optimizeStageIdx = $state(-1); // -1 = hidden
	let optimizeProgress = $state(0);  // 0–100
	let optimizeElapsed = $state(0);   // seconds
	let _optimizeTimer: ReturnType<typeof setInterval> | null = null;
	let _stageTimer: ReturnType<typeof setTimeout> | null = null;

	const totalWeight = OPTIMIZE_STAGES.reduce((s, st) => s + st.weight, 0);

	function startOptimizeProgress() {
		optimizeStageIdx = 0;
		optimizeProgress = 0;
		optimizeElapsed = 0;

		// Tick elapsed time every second
		_optimizeTimer = setInterval(() => { optimizeElapsed += 1; }, 1000);

		// Advance through stages except the last two (saving happens after real response)
		advanceStage(0);
	}

	function advanceStage(idx: number) {
		if (idx >= OPTIMIZE_STAGES.length - 2) return; // hold at "solving" until done

		optimizeStageIdx = idx;

		// Calculate cumulative progress up to this stage
		const cumWeight = OPTIMIZE_STAGES.slice(0, idx + 1).reduce((s, st) => s + st.weight, 0);
		const targetPct = Math.round((cumWeight / totalWeight) * 92); // cap at 92% until real done

		// Smoothly animate progress to target over stage duration
		const duration = (OPTIMIZE_STAGES[idx].weight / totalWeight) * 22000; // 22s budget for stages 0-3
		const startPct = optimizeProgress;
		const startTime = Date.now();

		function tick() {
			const elapsed = Date.now() - startTime;
			const t = Math.min(elapsed / duration, 1);
			const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // ease in-out quad
			optimizeProgress = Math.round(startPct + (targetPct - startPct) * eased);
			if (t < 1 && optimizing) {
				requestAnimationFrame(tick);
			} else if (t >= 1) {
				const next = idx + 1;
				if (next < OPTIMIZE_STAGES.length - 2) {
					_stageTimer = setTimeout(() => advanceStage(next), 200);
				}
			}
		}
		requestAnimationFrame(tick);
	}

	function finishOptimizeProgress() {
		// Jump to extract → saving → 100%
		optimizeStageIdx = OPTIMIZE_STAGES.length - 2; // extract
		optimizeProgress = 93;

		setTimeout(() => {
			optimizeStageIdx = OPTIMIZE_STAGES.length - 1; // saving
			optimizeProgress = 97;
			setTimeout(() => {
				optimizeProgress = 100;
				setTimeout(() => {
					stopOptimizeProgress();
				}, 600);
			}, 500);
		}, 400);
	}

	function stopOptimizeProgress() {
		if (_optimizeTimer) { clearInterval(_optimizeTimer); _optimizeTimer = null; }
		if (_stageTimer)    { clearTimeout(_stageTimer);     _stageTimer = null; }
		optimizeStageIdx = -1;
		optimizeProgress = 0;
		optimizeElapsed = 0;
	}

	// ── Confirm Modal ──
	type ConfirmModalOptions = {
		title: string;
		message: string;
		confirmLabel?: string;
		confirmClass?: string;
		icon?: string;
		onConfirm: () => void;
	};
	let confirmModal = $state<ConfirmModalOptions | null>(null);

	function showConfirm(opts: ConfirmModalOptions) {
		confirmModal = opts;
	}
	function closeConfirmModal() {
		confirmModal = null;
	}

	// ── Staff Modal State ──
	let showStaffModal = $state(false);
	let editingStaff: ScheduleStaff | null = $state(null);
	let staffForm = $state({
		name: "",
		position: "",
		department: "",
		type: "regular",
		status: "",
	});

	// ── Period Modal State ──
	let showPeriodModal = $state(false);
	let periodForm = $state({
		label: "",
		start_date: "",
		end_date: "",
	});

	// ── Computed ──
	let selectedPeriod = $derived(
		periods.find((p) => p.id === selectedPeriodId) || null,
	);

	// Format period label with year for disambiguation
	function formatPeriodLabel(period: SchedulePeriod): string {
		const year = period.start_date.split("-")[0];
		return `${period.label} (${year})`;
	}

	// Available shift symbols for legend
	const availableSymbols: {
		symbol: ShiftSymbol;
		label: string;
		color: string;
	}[] = [
		{ symbol: "", label: "出勤", color: "text-gray-600" },
		{ symbol: "○", label: "出勤", color: "text-gray-700" },
		{ symbol: "×", label: "休み", color: "text-red-600" },
		{ symbol: "△", label: "早番", color: "text-blue-600" },
		{ symbol: "◇", label: "遅番", color: "text-purple-600" },
		{ symbol: "★", label: "管理", color: "text-yellow-600" },
		{ symbol: "●", label: "特別", color: "text-green-600" },
		{ symbol: "◎", label: "優先", color: "text-orange-600" },
		{ symbol: "▣", label: "予備", color: "text-gray-500" },
		{ symbol: "⊘", label: "バックアップ", color: "text-gray-400" },
	];

	// ── Lifecycle ──
	let initialized = $state(false);
	// Track when the page was last hidden so we can decide whether to reload on focus
	let hiddenAt: number | null = null;
	// If the page has been hidden for more than this long, reload data when it becomes visible again
	const RELOAD_AFTER_HIDDEN_MS = 5 * 60 * 1000; // 5 minutes

	// Wait for auth to be ready AND user to be logged in before loading data
	$effect(() => {
		if (authState.loading || initialized) return;

		// Only load data if user is authenticated
		if (!authState.session) {
			// User not logged in - the UI will show login prompt
			loading = false;
			return;
		}

		initialized = true;

		// Load data only after auth is ready
		loadInitialData();

		// Check optimizer health
		checkOptimizerHealth()
			.then((health) => {
				optimizerHealthy = health.healthy;
			})
			.catch(() => {
				optimizerHealthy = false;
			});

		// Re-fetch data when the tab becomes visible again after being hidden.
		// Supabase free tier pauses the DB after inactivity — coming back to the
		// tab can leave the page stuck on skeletons. This triggers a fresh load.
		async function handleVisibilityChange() {
			if (document.visibilityState === 'hidden') {
				hiddenAt = Date.now();
			} else if (document.visibilityState === 'visible' && authState.session) {
				const wasHiddenMs = hiddenAt ? Date.now() - hiddenAt : 0;
				hiddenAt = null;

				// Proactively refresh the token if it's expiring soon (within 5 min)
				if (isTokenExpiringSoon(300)) {
					await refreshAuthToken();
				}

				if (wasHiddenMs >= RELOAD_AFTER_HIDDEN_MS) {
					// Clear cache so we get fresh data, not stale cached data
					apiCache.clear();
					reconnecting = true;
					loadInitialData().finally(() => { reconnecting = false; });
					checkOptimizerHealth()
						.then((health) => { optimizerHealthy = health.healthy; })
						.catch(() => { optimizerHealthy = false; });
				}
			}
		}

		document.addEventListener('visibilitychange', handleVisibilityChange);
		// Cleanup is handled by onDestroy below
		onDestroyCallbacks.push(() =>
			document.removeEventListener('visibilitychange', handleVisibilityChange)
		);
	});

	// Collect cleanup callbacks from effects
	const onDestroyCallbacks: (() => void)[] = [];
	onDestroy(() => onDestroyCallbacks.forEach((fn) => fn()));

	// ── Data Loading ──
	async function loadInitialData() {
		// Only show the skeleton if we have no cached data to show
		const hasCachedData = staff.length > 0 || periods.length > 0;
		try {
			loading = !hasCachedData;
			error = "";

			const [staffResult, periodsResult] = await Promise.all([
				getShiftStaff(),
				getShiftPeriods(),
			]);

			staff = staffResult;
			periods = periodsResult;
			sessionSave(SESSION_KEY_STAFF, staffResult);
			sessionSave(SESSION_KEY_PERIODS, periodsResult);
			console.log(
				"📊 [loadInitialData] Staff count:",
				staffResult.length,
			);
			console.log(
				"📊 [loadInitialData] Periods:",
				periodsResult.map((p) => ({
					id: p.id,
					label: p.label,
					start: p.start_date,
					end: p.end_date,
				})),
			);

			// Select the period that contains today's date, or the closest upcoming/recent one
			if (periods.length > 0) {
				// Use local date string (YYYY-MM-DD) for timezone-safe comparison
				const now = new Date();
				const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

				// Find period that contains today using string comparison (avoids UTC parsing issues)
				let selectedPeriod = periods.find(
					(p) => todayStr >= p.start_date && todayStr <= p.end_date,
				);

				// If no period contains today, find the most recent past period (not closest by distance)
				if (!selectedPeriod) {
					const pastPeriods = periods
						.filter((p) => p.start_date <= todayStr)
						.sort((a, b) =>
							b.start_date.localeCompare(a.start_date),
						);
					selectedPeriod =
						pastPeriods[0] ??
						[...periods].sort((a, b) =>
							a.start_date.localeCompare(b.start_date),
						)[0];
				}

				selectedPeriodId = selectedPeriod.id;
				await loadSchedule(selectedPeriod.id);

				// Start prefetching all period schedules in background (non-blocking)
				// This enables instant period switching like React's caching
				prefetchManager
					.prefetchAllPeriodSchedules(periodsResult)
					.catch(() => {
						// Silently handle prefetch errors - it's just an optimization
					});
			}
		} catch (e) {
			error = e instanceof Error ? e.message : "Failed to load data";
		} finally {
			loading = false;
		}
	}

	/**
	 * Remap schedule data from stored dates to current period dates based on day position.
	 * This handles the case where schedule data was created for a different period
	 * (e.g., Jan 21 - Feb 20) but we want to view it in the current period (e.g., Feb 21 - Mar 20).
	 */
	function remapScheduleDataToPeriod(
		rawScheduleData: Record<string, Record<string, string>>,
		periodStartDate: string,
		periodEndDate: string,
	): Record<string, Record<string, string>> {
		if (!rawScheduleData || Object.keys(rawScheduleData).length === 0) {
			return {};
		}

		// Find the date range in the stored schedule data
		const allDates = new Set<string>();
		Object.values(rawScheduleData).forEach((staffSchedule) => {
			if (staffSchedule && typeof staffSchedule === "object") {
				Object.keys(staffSchedule).forEach((dateKey) =>
					allDates.add(dateKey),
				);
			}
		});

		if (allDates.size === 0) {
			return rawScheduleData;
		}

		const sortedDates = Array.from(allDates).sort();
		const oldStartDateStr = sortedDates[0];
		const newStartDateStr = periodStartDate;

		// If dates already match, no remapping needed
		if (oldStartDateStr === newStartDateStr) {
			return rawScheduleData;
		}

		const oldStartDate = new Date(oldStartDateStr + "T00:00:00.000Z");
		const newStartDate = new Date(newStartDateStr + "T00:00:00.000Z");
		const newEndDate = new Date(periodEndDate + "T00:00:00.000Z");

		const remappedData: Record<string, Record<string, string>> = {};

		Object.entries(rawScheduleData).forEach(([staffId, staffSchedule]) => {
			if (staffId === "_staff_members") return; // Skip metadata
			if (!staffSchedule || typeof staffSchedule !== "object") {
				return;
			}

			remappedData[staffId] = {};

			Object.entries(staffSchedule).forEach(
				([oldDateKey, shiftValue]) => {
					if (!shiftValue || shiftValue === "") return; // Skip empty values

					// Calculate day offset from old period start
					const oldDate = new Date(oldDateKey + "T00:00:00.000Z");
					const dayOffset = Math.round(
						(oldDate.getTime() - oldStartDate.getTime()) /
							(1000 * 60 * 60 * 24),
					);

					// Calculate new date based on day offset
					const newDate = new Date(newStartDate);
					newDate.setUTCDate(newDate.getUTCDate() + dayOffset);

					// Only include if within current period range
					if (newDate <= newEndDate) {
						const newDateKey = newDate.toISOString().split("T")[0];
						remappedData[staffId][newDateKey] = shiftValue;
					}
				},
			);
		});

		return remappedData;
	}

	async function loadSchedule(periodId: string) {
		try {
			loadingSchedule = true;
			const response = await getSchedule(periodId);

			// Generate date range from period
			const period = periods.find((p) => p.id === periodId);
			if (period) {
				dateRange = generateDateRange(
					period.start_date,
					period.end_date,
				);

				// Remap schedule data to match current period's dates
				const rawData = response.schedule?.schedule_data || {};
				scheduleData = remapScheduleDataToPeriod(
					rawData,
					period.start_date,
					period.end_date,
				);
			} else {
				scheduleData = response.schedule?.schedule_data || {};
			}
		} catch (e) {
			console.error("Failed to load schedule:", e);
			error = e instanceof Error ? e.message : "Failed to load schedule";
		} finally {
			loadingSchedule = false;
		}
	}

	function generateDateRange(startDate: string, endDate: string): string[] {
		const dates: string[] = [];
		// Use UTC to avoid timezone issues with toISOString()
		const start = new Date(startDate + "T00:00:00.000Z");
		const end = new Date(endDate + "T00:00:00.000Z");

		for (
			let d = new Date(start);
			d <= end;
			d.setUTCDate(d.getUTCDate() + 1)
		) {
			dates.push(d.toISOString().split("T")[0]);
		}

		return dates;
	}

	// ── Period Selection ──
	async function handlePeriodChange(periodId: string) {
		selectedPeriodId = periodId;
		await loadSchedule(periodId);

		// Prefetch adjacent periods for instant navigation (non-blocking)
		prefetchManager.prefetchAdjacentPeriods(periodId, periods).catch(() => {
			// Silently handle prefetch errors
		});
	}

	// ── Cell Update Handler ──
	async function handleCellUpdate(
		staffId: string,
		date: string,
		symbol: string,
	) {
		if (!selectedPeriodId) return;

		// Update local state immediately (optimistic)
		if (!scheduleData[staffId]) {
			scheduleData[staffId] = {};
		}
		scheduleData[staffId][date] = symbol;
		scheduleData = { ...scheduleData };

		try {
			saving = true;
			await bulkUpdateCells(selectedPeriodId, [{ staffId, date, symbol }]);
		} catch (e) {
			// Revert on failure
			error = e instanceof Error ? e.message : "Failed to save";
		} finally {
			saving = false;
		}
	}

	// ── Bulk Update Handler ──
	async function handleBulkUpdate(
		updates: Array<{ staffId: string; date: string; symbol: string }>,
	) {
		if (!selectedPeriodId || updates.length === 0) return;

		try {
			saving = true;

			// Update local state immediately
			for (const { staffId, date, symbol } of updates) {
				if (!scheduleData[staffId]) {
					scheduleData[staffId] = {};
				}
				scheduleData[staffId][date] = symbol;
			}
			scheduleData = { ...scheduleData };

			// Save to server
			await bulkUpdateCells(selectedPeriodId, updates);
			showSuccess("保存しました");
		} catch (e) {
			error = e instanceof Error ? e.message : "Failed to save";
		} finally {
			saving = false;
		}
	}

	// ── Optimization ──
	async function handleOptimize() {
		if (!selectedPeriodId || !optimizerHealthy) return;

		try {
			optimizing = true;
			error = "";
			startOptimizeProgress();

			const result = await optimizeSchedule({
				periodId: selectedPeriodId,
				timeout: 30,
				preservePrefilled: true,
			});

			if (result.success && result.schedule) {
				finishOptimizeProgress();

				scheduleData = result.schedule;

				// Save optimized schedule
				const updates: CellUpdate[] = [];
				for (const [staffId, dates] of Object.entries(result.schedule)) {
					for (const [date, symbol] of Object.entries(dates)) {
						updates.push({ staffId, date, symbol });
					}
				}
				await bulkUpdateCells(selectedPeriodId, updates);
				showSuccess(`最適化完了 (${result.solve_time?.toFixed(2)}秒)`);
			} else {
				stopOptimizeProgress();
				error = result.error || "Optimization failed";
			}
		} catch (e) {
			stopOptimizeProgress();
			error = e instanceof Error ? e.message : "Optimization failed";
		} finally {
			optimizing = false;
		}
	}

	function handleClear() {
		if (!selectedPeriodId) return;
		showConfirm({
			title: 'スケジュールをクリア',
			message: 'この期間のスケジュールデータをすべて削除します。この操作は元に戻せません。',
			confirmLabel: 'クリアする',
			confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
			icon: 'delete_sweep',
			onConfirm: async () => {
				try {
					clearing = true;
					error = '';
					await clearSchedule(selectedPeriodId!);
					scheduleData = {};
					showSuccess('スケジュールをクリアしました');
				} catch (e) {
					error = e instanceof Error ? e.message : 'Clear failed';
				} finally {
					clearing = false;
				}
			},
		});
	}

	// ── Staff Management ──
	function openAddStaffModal() {
		editingStaff = null;
		staffForm = {
			name: "",
			position: "",
			department: "",
			type: "regular",
			status: "",
		};
		showStaffModal = true;
	}

	function openEditStaffModal(s: ScheduleStaff) {
		editingStaff = s;
		staffForm = {
			name: s.name,
			position: s.position || "",
			department: s.department || "",
			type: s.type || "regular",
			status: s.status || "",
		};
		showStaffModal = true;
	}

	async function saveStaff() {
		try {
			saving = true;

			if (editingStaff) {
				await updateShiftStaff(editingStaff.id, staffForm);
			} else {
				await createShiftStaff(staffForm);
			}

			// Reload staff
			staff = await getShiftStaff();
			showStaffModal = false;
			showSuccess(
				editingStaff
					? "スタッフを更新しました"
					: "スタッフを追加しました",
			);
		} catch (e) {
			error = e instanceof Error ? e.message : "Failed to save staff";
		} finally {
			saving = false;
		}
	}

	function handleDeleteStaff(s: ScheduleStaff) {
		showConfirm({
			title: 'スタッフを削除',
			message: `${s.name} を削除しますか？この操作は元に戻せません。`,
			confirmLabel: '削除する',
			confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
			icon: 'person_remove',
			onConfirm: async () => {
				try {
					await deleteShiftStaff(s.id);
					staff = await getShiftStaff();
					showSuccess("スタッフを削除しました");
				} catch (e) {
					error = e instanceof Error ? e.message : "Failed to delete staff";
				}
			},
		});
	}

	// ── Period Management ──
	function openAddPeriodModal() {
		periodForm = {
			label: "",
			start_date: "",
			end_date: "",
		};
		showPeriodModal = true;
	}

	async function savePeriod() {
		try {
			saving = true;
			await createShiftPeriod(periodForm);
			periods = await getShiftPeriods();
			showPeriodModal = false;
			showSuccess("期間を作成しました");
		} catch (e) {
			error = e instanceof Error ? e.message : "Failed to create period";
		} finally {
			saving = false;
		}
	}

	function handleDeletePeriod(p: SchedulePeriod) {
		showConfirm({
			title: '期間を削除',
			message: `「${p.label}」を削除しますか？この操作は元に戻せません。`,
			confirmLabel: '削除する',
			confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
			icon: 'event_busy',
			onConfirm: async () => {
				try {
					await deleteShiftPeriod(p.id);
					periods = await getShiftPeriods();
					if (selectedPeriodId === p.id) {
						selectedPeriodId = periods[0]?.id || null;
						if (selectedPeriodId) {
							await loadSchedule(selectedPeriodId);
						}
					}
					showSuccess("期間を削除しました");
				} catch (e) {
					error = e instanceof Error ? e.message : "Failed to delete period";
				}
			},
		});
	}

	// ── Utilities ──
	function showSuccess(message: string) {
		successMessage = message;
		setTimeout(() => {
			successMessage = "";
		}, 3000);
	}

	function getSymbolClass(symbol: string): string {
		switch (symbol) {
			case "×":
				return "text-red-600 bg-red-50";
			case "△":
				return "text-blue-600 bg-blue-50";
			case "◇":
				return "text-purple-600 bg-purple-50";
			case "★":
				return "text-yellow-600 bg-yellow-50";
			case "●":
				return "text-green-600 bg-green-50";
			case "◎":
				return "text-orange-600 bg-orange-50";
			default:
				return "";
		}
	}
</script>

<div class="flex h-screen overflow-hidden bg-gray-100">
	<Sidebar
		sections={sidebarSections}
		bind:collapsed={sidebarCollapsed}
		bind:mobileOpen={sidebarMobileOpen}
	/>

	<!-- Main Content Wrapper -->
	<div class="flex-1 flex flex-col overflow-hidden relative">
		<!-- Header -->
		<header class="bg-white shadow shrink-0 z-10">
			<div
				class="max-w-full mx-auto px-4 py-4 flex items-center justify-between"
			>
				<div class="flex items-center gap-4">
					<button
						onclick={() => (sidebarMobileOpen = true)}
						class="md:hidden p-1.5 -ml-1 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
						aria-label="メニューを開く"
					>
						<span class="material-symbols-rounded text-xl"
							>menu</span
						>
					</button>
					<a
						href="/dashboard"
						class="text-gray-500 hover:text-gray-700 hidden sm:block"
					>
						<span class="material-symbols-rounded">arrow_back</span>
					</a>
					<h1 class="text-xl font-bold text-gray-900 hidden sm:block">
						シフト管理
					</h1>
				</div>

				<!-- Navigation tabs -->
				<div class="flex gap-2">
					<button
						class="px-4 py-2 rounded-lg font-medium transition-colors {activeSection ===
						'schedule'
							? 'bg-blue-600 text-white'
							: 'text-gray-600 hover:bg-gray-100'}"
						onclick={() => (activeSection = "schedule")}
					>
						<span
							class="material-symbols-rounded text-sm align-middle mr-1"
							>calendar_month</span
						>
						スケジュール
					</button>
					<button
						class="px-4 py-2 rounded-lg font-medium transition-colors {activeSection ===
						'settings'
							? 'bg-blue-600 text-white'
							: 'text-gray-600 hover:bg-gray-100'}"
						onclick={() => (activeSection = "settings")}
					>
						<span
							class="material-symbols-rounded text-sm align-middle mr-1"
							>settings</span
						>
						設定
					</button>
				</div>

				<div class="flex items-center gap-3">
					{#if optimizerHealthy}
						<span
							class="text-xs text-green-600 flex items-center gap-1"
						>
							<span class="w-2 h-2 bg-green-500 rounded-full"
							></span>
							OR-Tools
						</span>
					{:else}
						<span
							class="text-xs text-red-600 flex items-center gap-1"
						>
							<span class="w-2 h-2 bg-red-500 rounded-full"
							></span>
							Optimizer Offline
						</span>
					{/if}
					<button
						class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
						onclick={openAddStaffModal}
						title="スタッフ追加"
					>
						<span class="material-symbols-rounded text-xl"
							>person_add</span
						>
					</button>
				</div>
			</div>
		</header>

		<!-- Scrollable Body -->
		<div class="flex-1 overflow-x-hidden overflow-y-auto">
			<!-- Messages -->
			{#if error}
				<div class="bg-red-50 border-l-4 border-red-500 p-4 mx-4 mt-4">
					<div class="flex items-center">
						<span class="material-symbols-rounded text-red-500 mr-2"
							>error</span
						>
						<span class="text-red-700">{error}</span>
						<button
							class="ml-auto text-red-500"
							onclick={() => (error = "")}
						>
							<span class="material-symbols-rounded">close</span>
						</button>
					</div>
				</div>
			{/if}

			{#if successMessage}
				<div
					class="bg-green-50 border-l-4 border-green-500 p-4 mx-4 mt-4"
				>
					<div class="flex items-center">
						<span
							class="material-symbols-rounded text-green-500 mr-2"
							>check_circle</span
						>
						<span class="text-green-700">{successMessage}</span>
					</div>
				</div>
			{/if}

			<!-- Main Content -->
			{#if reconnecting}
				<!-- Waking up after inactivity - show banner over existing data -->
				<div class="sticky top-0 z-20 flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-sm">
					<span class="material-symbols-rounded text-base animate-spin" style="animation-duration:1.2s">autorenew</span>
					再接続中です。しばらくお待ちください…
				</div>
			{/if}
			{#if (authState.loading || loading) && staff.length === 0 && periods.length === 0}
				<!-- Show skeleton only on true first load — no cached data available yet -->
				<div class="p-4">
					<ScheduleSkeleton rows={12} columns={15} />
				</div>
			{:else if !authState.loading && !authState.session}
				<!-- Not logged in - show login prompt -->
				<div class="flex items-center justify-center h-64">
					<div class="text-center">
						<span
							class="material-symbols-rounded text-6xl text-gray-400 mb-4"
							>lock</span
						>
						<h2 class="text-xl font-semibold text-gray-700 mb-2">
							ログインが必要です
						</h2>
						<p class="text-gray-500 mb-4">
							シフト管理機能を利用するにはログインしてください
						</p>
						<button
							class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
							onclick={() =>
								signInWithGoogle(window.location.href)}
						>
							<svg class="w-5 h-5" viewBox="0 0 24 24">
								<path
									fill="currentColor"
									d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
								/>
								<path
									fill="currentColor"
									d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
								/>
								<path
									fill="currentColor"
									d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
								/>
								<path
									fill="currentColor"
									d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
								/>
							</svg>
							Googleでログイン
						</button>
					</div>
				</div>
			{:else if activeSection === "schedule"}
				<!-- Schedule Section -->
				<div class="p-4">
					<!-- Toolbar -->
					<div
						class="bg-white rounded-lg shadow p-4 mb-4 flex flex-wrap items-center gap-4"
					>
						<!-- Period Picker -->
						<PeriodPicker
							{periods}
							{selectedPeriodId}
							onSelect={handlePeriodChange}
						/>

						<!-- Divider -->
						<div class="w-px h-8 bg-gray-200 shrink-0"></div>

						<!-- Optimize Button (left, next to period picker) -->
						<button
							class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1.5 disabled:opacity-50 transition-colors"
							onclick={handleOptimize}
							disabled={optimizing || clearing || !optimizerHealthy}
						>
							{#if optimizing}
								<span class="animate-spin rounded-full h-4 w-4 border-b-2 border-white shrink-0"></span>
							{:else}
								<span class="material-symbols-rounded text-sm shrink-0">auto_fix_high</span>
							{/if}
							自動最適化
						</button>

						<!-- Clear Button -->
						<button
							class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-300 flex items-center gap-1.5 disabled:opacity-50 transition-colors"
							onclick={handleClear}
							disabled={clearing || optimizing}
							title="スケジュールをクリア"
						>
							{#if clearing}
								<span class="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 shrink-0"></span>
							{:else}
								<span class="material-symbols-rounded text-sm shrink-0">delete_sweep</span>
							{/if}
							クリア
						</button>

						<div class="flex-1"></div>

						<!-- Settings icon (right) -->
						<a
							href="/shifts/settings"
							class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
							title="制約設定"
						>
							<span class="material-symbols-rounded text-xl">tune</span>
						</a>
					</div>

					<!-- Schedule Table (Transposed: dates as rows, staff as columns) -->
					<div class="relative bg-white rounded-lg shadow">
						{#if loadingSchedule}
							<TableSkeleton
								rows={dateRange.length || 20}
								columns={staff.length || 12}
							/>
						{:else}
							{@const hasScheduleData = Object.keys(
								scheduleData,
							).some(
								(k) =>
									k !== "_staff_members" &&
									Object.keys(scheduleData[k] || {}).length >
										0,
							)}
							{#if optimizing}
								<!-- Skeleton behind glass overlay while optimizing -->
								<TableSkeleton
									rows={dateRange.length || 20}
									columns={staff.length || 12}
								/>
								<OptimizeOverlay progress={optimizeProgress} elapsed={optimizeElapsed} />
							{:else if !hasScheduleData && staff.length > 0}
								<!-- Empty schedule notice -->
								<div class="p-8 text-center">
									<span
										class="material-symbols-rounded text-5xl text-gray-300 mb-4"
										>event_busy</span
									>
									<h3
										class="text-lg font-medium text-gray-700 mb-2"
									>
										この期間のスケジュールデータはありません
									</h3>
									<p class="text-sm text-gray-500 mb-4">
										{#if selectedPeriod}
											{selectedPeriod.start_date.split(
												"-",
											)[0]}年 {selectedPeriod.label} のスケジュールはまだ作成されていません。
										{:else}
											スケジュールはまだ作成されていません。
										{/if}
									</p>
									<div
										class="flex items-center justify-center gap-3"
									>
										<button
											class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
											onclick={handleOptimize}
											disabled={optimizing ||
												!optimizerHealthy}
										>
											<span
												class="material-symbols-rounded text-sm"
												>auto_fix_high</span
											>
											自動生成する
										</button>
										<span class="text-sm text-gray-400"
											>または手動でセルをクリックして入力</span
										>
									</div>
								</div>
							{/if}
							<ScheduleTable
								{staff}
								{dateRange}
								{scheduleData}
								onCellUpdate={handleCellUpdate}
								onBulkUpdate={handleBulkUpdate}
								onStaffEdit={openEditStaffModal}
								onStaffDelete={handleDeleteStaff}
							/>
						{/if}
					</div>

					<!-- Legend -->
					<div class="mt-4 bg-white rounded-lg shadow p-4">
						<h3 class="text-sm font-medium text-gray-700 mb-2">
							凡例
						</h3>
						<div class="flex flex-wrap gap-4">
							{#each availableSymbols as { symbol, label, color }}
								<div class="flex items-center gap-2">
									<span
										class="w-8 h-8 flex items-center justify-center border rounded text-lg font-bold {color}"
									>
										{symbol || "-"}
									</span>
									<span class="text-sm text-gray-600"
										>{label}</span
									>
								</div>
							{/each}
						</div>
					</div>

					<!-- Keyboard shortcuts -->
					<div class="mt-2 text-xs text-gray-500">
						<span class="font-medium">ショートカット:</span>
						1=早番(△), 2=出勤(○), 3=遅番(◇), 4/X=休み(×), S=管理(★),
						Space/Delete=クリア, Escape=選択解除, Ctrl+C=コピー, Ctrl+V=ペースト,
						矢印キー=移動
					</div>
				</div>
			{:else}
				<!-- Settings Section -->
				<div class="p-4">
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
						<!-- Staff List -->
						<div class="bg-white rounded-lg shadow p-4">
							<div class="flex items-center justify-between mb-4">
								<h2 class="text-lg font-bold text-gray-900">
									スタッフ一覧
								</h2>
								<button
									class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
									onclick={openAddStaffModal}
								>
									追加
								</button>
							</div>
							<div class="space-y-2">
								{#each staff as s}
									<div
										class="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
									>
										<div>
											<div class="font-medium">
												{s.name}
											</div>
											<div class="text-sm text-gray-500">
												{s.position || "-"}
												{s.status
													? `(${s.status})`
													: ""}
											</div>
										</div>
										<div class="flex items-center gap-2">
											<button
												class="p-1 text-gray-500 hover:text-blue-600"
												onclick={() =>
													openEditStaffModal(s)}
											>
												<span
													class="material-symbols-rounded text-sm"
													>edit</span
												>
											</button>
											<button
												class="p-1 text-gray-500 hover:text-red-600"
												onclick={() =>
													handleDeleteStaff(s)}
											>
												<span
													class="material-symbols-rounded text-sm"
													>delete</span
												>
											</button>
										</div>
									</div>
								{/each}
							</div>
						</div>

						<!-- Periods List -->
						<div class="bg-white rounded-lg shadow p-4">
							<div class="flex items-center justify-between mb-4">
								<h2 class="text-lg font-bold text-gray-900">
									期間一覧
								</h2>
								<button
									class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
									onclick={openAddPeriodModal}
								>
									追加
								</button>
							</div>
							<div class="space-y-2">
								{#each periods as p}
									<div
										class="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
									>
										<div>
											<div class="font-medium">
												{p.label}
											</div>
											<div class="text-sm text-gray-500">
												{p.start_date} 〜 {p.end_date}
											</div>
										</div>
										<button
											class="p-1 text-gray-500 hover:text-red-600"
											onclick={() =>
												handleDeletePeriod(p)}
										>
											<span
												class="material-symbols-rounded text-sm"
												>delete</span
											>
										</button>
									</div>
								{/each}
							</div>
						</div>
					</div>

					<!-- Additional Settings Link -->
					<div class="mt-4">
						<a
							href="/shifts/settings"
							class="text-blue-600 hover:underline flex items-center gap-1"
						>
							<span class="material-symbols-rounded text-sm"
								>tune</span
							>
							詳細設定 (制約条件、最適化パラメータ)
						</a>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>





<!-- Confirm Modal -->
{#if confirmModal}
	<div
		class="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
		onclick={(e) => { if (e.target === e.currentTarget) closeConfirmModal(); }}
	>
		<div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
			<!-- Icon + Title -->
			<div class="px-6 pt-6 pb-4 flex flex-col items-center text-center">
				<div class="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-4">
					<span class="material-symbols-rounded text-2xl text-red-600">{confirmModal.icon ?? 'warning'}</span>
				</div>
				<h2 class="text-lg font-bold text-gray-900 mb-1">{confirmModal.title}</h2>
				<p class="text-sm text-gray-500 leading-relaxed">{confirmModal.message}</p>
			</div>

			<!-- Actions -->
			<div class="px-6 pb-6 flex gap-3">
				<button
					class="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
					onclick={closeConfirmModal}
				>
					キャンセル
				</button>
				<button
					class="flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors {confirmModal.confirmClass ?? 'bg-blue-600 hover:bg-blue-700 text-white'}"
					onclick={() => { const fn = confirmModal!.onConfirm; closeConfirmModal(); fn(); }}
				>
					{confirmModal.confirmLabel ?? '確認'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Staff Modal -->
{#if showStaffModal}
	<div
		class="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center"
		role="dialog"
	>
		<div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
			<div class="p-4 border-b flex items-center justify-between">
				<h2 class="text-lg font-bold">
					{editingStaff ? "スタッフ編集" : "スタッフ追加"}
				</h2>
				<button
					class="text-gray-500 hover:text-gray-700"
					onclick={() => (showStaffModal = false)}
				>
					<span class="material-symbols-rounded">close</span>
				</button>
			</div>
			<div class="p-4 space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1"
						>名前 *</label
					>
					<input
						type="text"
						class="w-full border rounded-lg px-3 py-2"
						bind:value={staffForm.name}
						required
					/>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1"
						>役職</label
					>
					<input
						type="text"
						class="w-full border rounded-lg px-3 py-2"
						bind:value={staffForm.position}
					/>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1"
						>部門</label
					>
					<input
						type="text"
						class="w-full border rounded-lg px-3 py-2"
						bind:value={staffForm.department}
					/>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1"
						>雇用形態</label
					>
					<select
						class="w-full border rounded-lg px-3 py-2"
						bind:value={staffForm.status}
					>
						<option value="">選択してください</option>
						<option value="社員">社員</option>
						<option value="派遣">派遣</option>
						<option value="パート">パート</option>
					</select>
				</div>
			</div>
			<div class="p-4 border-t flex justify-end gap-2">
				<button
					class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
					onclick={() => (showStaffModal = false)}
				>
					キャンセル
				</button>
				<button
					class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
					onclick={saveStaff}
					disabled={saving || !staffForm.name}
				>
					{saving ? "保存中..." : "保存"}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Period Modal -->
{#if showPeriodModal}
	<div
		class="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center"
		role="dialog"
	>
		<div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
			<div class="p-4 border-b flex items-center justify-between">
				<h2 class="text-lg font-bold">新しい期間</h2>
				<button
					class="text-gray-500 hover:text-gray-700"
					onclick={() => (showPeriodModal = false)}
				>
					<span class="material-symbols-rounded">close</span>
				</button>
			</div>
			<div class="p-4 space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1"
						>ラベル *</label
					>
					<input
						type="text"
						class="w-full border rounded-lg px-3 py-2"
						bind:value={periodForm.label}
						placeholder="例: 2024年3月"
						required
					/>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1"
						>開始日 *</label
					>
					<input
						type="date"
						class="w-full border rounded-lg px-3 py-2"
						bind:value={periodForm.start_date}
						required
					/>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1"
						>終了日 *</label
					>
					<input
						type="date"
						class="w-full border rounded-lg px-3 py-2"
						bind:value={periodForm.end_date}
						required
					/>
				</div>
			</div>
			<div class="p-4 border-t flex justify-end gap-2">
				<button
					class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
					onclick={() => (showPeriodModal = false)}
				>
					キャンセル
				</button>
				<button
					class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
					onclick={savePeriod}
					disabled={saving ||
						!periodForm.label ||
						!periodForm.start_date ||
						!periodForm.end_date}
				>
					{saving ? "作成中..." : "作成"}
				</button>
			</div>
		</div>
	</div>
{/if}
