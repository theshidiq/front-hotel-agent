<script lang="ts">
	import { onDestroy } from "svelte";
	import { authState, signInWithGoogle, isTokenExpiringSoon, refreshAuthToken } from "$lib/auth.svelte";
	import { getDepartments, type OrgDepartment } from "$lib/api";
	import {
		getShiftStaff,
		getShiftPeriods,
		getSchedule,
		bulkUpdateCells,
		clearSchedule,
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
	import ViolationsPanel from "$lib/shifts/components/ViolationsPanel.svelte";
import Sidebar from "$lib/components/Sidebar.svelte";
	import { printSchedule } from "$lib/shifts/printSchedule";

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
	let departments: OrgDepartment[] = $state([]);
	let activeDepartmentId: string | null = $state(null);
	let selectedPeriodId: string | null = $state(null);
	let scheduleData: Record<string, Record<string, string>> = $state({});
	let dateRange: string[] = $state([]);
	let loading = $state(false);
	let loadingSchedule = $state(false);
	let saving = $state(false);
	let reconnecting = $state(false); // true when reloading after tab wake-up
	let loadFailed = $state(false);   // true when initial load failed (DB paused etc.)
	let error = $state("");
	let successMessage = $state("");

	// ── Optimization State ──
	let optimizing = $state(false);
	let clearing = $state(false);
	let optimizerHealthy = $state(false);
	let _optimizeAbortController: AbortController | null = null;

	// ── Partial Result Dialog ──
	let showPartialDialog = $state(false);
	let partialResult = $state<{ schedule: Record<string, Record<string, string>>; solve_time?: number; violations: Array<{ description: string; count: number; penalty: number }> } | null>(null);

// ── Violations State ──
	let optimizeViolations = $state<Array<{ description: string; count: number; penalty: number }>>([]);
	let showViolations = $state(false);
	let lastSolveTime = $state<number | undefined>(undefined);
	let lastIsOptimal = $state<boolean | undefined>(undefined);


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

		// Check optimizer health + poll every 30s so "Offline" self-heals
		// when Supabase free tier wakes the DB back up.
		async function refreshHealth() {
			try {
				const health = await checkOptimizerHealth();
				optimizerHealthy = health.healthy;
			} catch {
				optimizerHealthy = false;
			}
		}
		refreshHealth();
		const healthInterval = setInterval(refreshHealth, 30_000);
		onDestroyCallbacks.push(() => clearInterval(healthInterval));

		// Re-fetch data when the tab becomes visible again after being hidden.
		// Supabase free tier pauses the DB after inactivity — coming back to the
		// tab can leave the page stuck on skeletons. This triggers a fresh load.
		async function handleVisibilityChange() {
			if (document.visibilityState === 'hidden') {
				hiddenAt = Date.now();
			} else if (document.visibilityState === 'visible' && authState.session) {
				const wasHiddenMs = hiddenAt ? Date.now() - hiddenAt : 0;
				hiddenAt = null;

				// Always re-check optimizer health when returning to the tab
				refreshHealth();

				// Proactively refresh the token if it's expiring soon (within 5 min)
				if (isTokenExpiringSoon(300)) {
					await refreshAuthToken();
				}

				if (wasHiddenMs >= RELOAD_AFTER_HIDDEN_MS) {
					// Clear cache so we get fresh data, not stale cached data
					apiCache.clear();
					reconnecting = true;
					loadInitialData().finally(() => { reconnecting = false; });
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

			const [staffResult, periodsResult, deptResult] = await Promise.all([
				getShiftStaff(),
				getShiftPeriods(),
				getDepartments(),
			]);

			staff = staffResult;
			periods = periodsResult;
			departments = deptResult;
			// Default to first department if none selected
			if (!activeDepartmentId && deptResult.length > 0) {
				activeDepartmentId = deptResult[0].id;
			}
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
			// If we have no data at all, mark as failed so the UI shows a retry button.
			// Then auto-retry after 10s (Supabase free tier takes ~5-10s to wake).
			if (staff.length === 0) {
				loadFailed = true;
				setTimeout(() => {
					loadFailed = false;
					loadInitialData();
				}, 10_000);
			}
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

	async function loadSchedule(periodId: string, deptId?: string | null) {
		const effectiveDeptId = deptId !== undefined ? deptId : activeDepartmentId;
		try {
			loadingSchedule = true;
			const [response, deptStaff] = await Promise.all([
				getSchedule(periodId, effectiveDeptId ?? undefined),
				getShiftStaff(effectiveDeptId ?? undefined),
			]);
			staff = deptStaff;

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

	// ── Department Selection ──
	async function handleDepartmentChange(deptId: string) {
		activeDepartmentId = deptId;
		if (selectedPeriodId) {
			await loadSchedule(selectedPeriodId, deptId);
		}
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
			await bulkUpdateCells(selectedPeriodId, [{ staffId, date, symbol }], activeDepartmentId ?? undefined);
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
			await bulkUpdateCells(selectedPeriodId, updates, activeDepartmentId ?? undefined);
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

		_optimizeAbortController = new AbortController();

		try {
			optimizing = true;
			error = "";
			startOptimizeProgress();

			const result = await optimizeSchedule({
				periodId: selectedPeriodId,
				departmentId: activeDepartmentId ?? undefined,
				timeout: 30,
				preservePrefilled: true,
				signal: _optimizeAbortController.signal,
			});

			if (result.success && result.schedule) {
				// If not optimal (FEASIBLE / timed out), show partial result dialog instead of auto-saving
				if (result.is_optimal === false) {
					stopOptimizeProgress();
					partialResult = {
						schedule: result.schedule,
						solve_time: result.solve_time,
						violations: result.violations ?? [],
					};
					showPartialDialog = true;
					return;
				}

				finishOptimizeProgress();
				await _commitSchedule(result.schedule);

				lastSolveTime = result.solve_time;
				lastIsOptimal = result.is_optimal;
				const userViolations = (result.violations ?? []).filter(
					(v: { description: string }) => !(v.description.startsWith('Backup ') && v.description.includes('has day off (not on holiday)'))
				);
				if (userViolations.length > 0) {
					optimizeViolations = userViolations;
					showViolations = true;
					showSuccess(`最適化完了 (${result.solve_time?.toFixed(2)}秒) — ${userViolations.length}件の制約違反`);
				} else {
					optimizeViolations = [];
					showViolations = false;
					showSuccess(`最適化完了 (${result.solve_time?.toFixed(2)}秒)`);
				}
			} else {
				stopOptimizeProgress();
				error = result.error || "Optimization failed";
			}
		} catch (e) {
			stopOptimizeProgress();
			if (e instanceof Error && e.name === 'AbortError') {
				showSuccess('最適化をキャンセルしました');
			} else {
				error = e instanceof Error ? e.message : "Optimization failed";
			}
		} finally {
			optimizing = false;
			_optimizeAbortController = null;
		}
	}

	function handleCancelOptimize() {
		_optimizeAbortController?.abort();
	}

async function _commitSchedule(schedule: Record<string, Record<string, string>>) {
		if (!selectedPeriodId) return;
		scheduleData = schedule;
		const updates: CellUpdate[] = [];
		for (const [staffId, dates] of Object.entries(schedule)) {
			for (const [date, symbol] of Object.entries(dates)) {
				updates.push({ staffId, date, symbol });
			}
		}
		await bulkUpdateCells(selectedPeriodId, updates, activeDepartmentId ?? undefined);
	}

	async function handleUsePartialSchedule() {
		if (!partialResult) return;
		showPartialDialog = false;
		try {
			optimizing = true;
			finishOptimizeProgress();
			await _commitSchedule(partialResult.schedule);
			lastSolveTime = partialResult.solve_time;
			lastIsOptimal = false;
			const partialUserViolations = partialResult.violations.filter(
				(v: { description: string }) => !(v.description.startsWith('Backup ') && v.description.includes('has day off (not on holiday)'))
			);
			if (partialUserViolations.length > 0) {
				optimizeViolations = partialUserViolations;
				showViolations = true;
				showSuccess(`部分最適化スケジュールを保存しました — ${partialUserViolations.length}件の制約違反`);
			} else {
				optimizeViolations = [];
				showViolations = false;
				showSuccess('部分最適化スケジュールを保存しました');
			}
		} catch (e) {
			stopOptimizeProgress();
			error = e instanceof Error ? e.message : 'Save failed';
		} finally {
			optimizing = false;
			partialResult = null;
		}
	}

	function handleDiscardPartialSchedule() {
		showPartialDialog = false;
		partialResult = null;
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
					await clearSchedule(selectedPeriodId!, activeDepartmentId ?? undefined);
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

	// ── Print ──
	function handlePrint() {
		printSchedule(staff, dateRange, scheduleData, selectedPeriod);
	}

	// ── Period Management ──



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
					{#if departments.length > 0}
						<div class="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
							{#each departments as dept}
								<button
									onclick={() => handleDepartmentChange(dept.id)}
									class="px-3 py-1.5 rounded-md text-sm font-medium transition-all {activeDepartmentId === dept.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}"
								>
									{dept.name}
								</button>
							{/each}
						</div>
					{/if}
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

			<!-- Violations Panel -->
			{#if showViolations && optimizeViolations.length > 0}
				<ViolationsPanel
					violations={optimizeViolations}
					solveTime={lastSolveTime}
					isOptimal={lastIsOptimal}
					onClose={() => (showViolations = false)}
				/>
			{/if}

<!-- Partial Result Dialog -->
			{#if showPartialDialog && partialResult}
				<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
					<div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4">
						<div class="flex items-start gap-3">
							<span class="material-symbols-rounded text-amber-500 text-2xl mt-0.5">timer_off</span>
							<div>
								<h2 class="text-base font-semibold text-gray-900">タイムアウト — 部分解が見つかりました</h2>
								<p class="text-sm text-gray-500 mt-1">
									ソルバーが時間内に最適解を見つけられませんでした。部分的なスケジュールが得られています。
									{#if partialResult.solve_time != null}
										（{partialResult.solve_time.toFixed(2)}秒）
									{/if}
								</p>
							</div>
						</div>
						{#if partialResult.violations.length > 0}
							<div class="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800">
								{partialResult.violations.length}件の制約違反が含まれます
							</div>
						{/if}
						<div class="flex gap-2 justify-end mt-1">
							<button
								class="px-4 py-2 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50"
								onclick={handleDiscardPartialSchedule}
							>
								破棄
							</button>
							<button
								class="px-4 py-2 rounded-lg text-sm bg-amber-500 hover:bg-amber-600 text-white font-medium"
								onclick={handleUsePartialSchedule}
							>
								このスケジュールを使用
							</button>
						</div>
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
			{#if loadFailed}
				<!-- DB was paused (Supabase free tier) — auto-retrying, but show manual option -->
				<div class="sticky top-0 z-20 flex items-center justify-between gap-2 px-4 py-2 bg-red-50 border-b border-red-200 text-red-800 text-sm">
					<div class="flex items-center gap-2">
						<span class="material-symbols-rounded text-base animate-spin" style="animation-duration:2s">sync_problem</span>
						<span>データベースが起動中です。10秒後に自動で再試行します…</span>
					</div>
					<button
						class="px-3 py-1 text-xs bg-red-100 hover:bg-red-200 border border-red-300 rounded-md font-medium transition-colors"
						onclick={() => { loadFailed = false; loadInitialData(); }}
					>
						今すぐ再試行
					</button>
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
			{:else}
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

						<!-- Print Button -->
						<button
							class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-800 flex items-center gap-1.5 disabled:opacity-50 transition-colors"
							onclick={handlePrint}
							disabled={optimizing || !dateRange.length}
							title="印刷"
						>
							<span class="material-symbols-rounded text-sm shrink-0">print</span>
							印刷
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
								<OptimizeOverlay progress={optimizeProgress} elapsed={optimizeElapsed} oncancel={handleCancelOptimize} />
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
