<script lang="ts">
	import { authState, signInWithGoogle, isTokenExpiringSoon, refreshAuthToken } from '$lib/auth.svelte';
	import { getDepartments, type OrgDepartment } from '$lib/api';
	import {
		getDailyLimits,
		getMonthlyLimits,
		getSolverConfig,
		getCalendarRules,
		getStaffGroups,
		getShiftStaff,
		getPriorityRules,
		getEarlyShiftPreferences,
		getPeriodConfiguration,
		getShiftPeriods
	} from '$lib/shifts/api';
	import type {
		DailyLimits,
		MonthlyLimits,
		ORToolsSolverConfig,
		CalendarRule,
		ScheduleStaffGroup,
		ScheduleStaff,
		SchedulePeriod
	} from '$lib/shifts/types';
	import type {
		PriorityRule,
		EarlyShiftPreference,
		PeriodConfiguration
	} from '$lib/shifts/api';

	// Import all tab components
	import LimitsTab from '$lib/shifts/components/LimitsTab.svelte';
	import ConstraintsTab from '$lib/shifts/components/ConstraintsTab.svelte';
	import CalendarRulesTab from '$lib/shifts/components/CalendarRulesTab.svelte';
	import StaffGroupsTab from '$lib/shifts/components/StaffGroupsTab.svelte';
	import PriorityRulesTab from '$lib/shifts/components/PriorityRulesTab.svelte';
	import EarlyShiftTab from '$lib/shifts/components/EarlyShiftTab.svelte';
	import PeriodsTab from '$lib/shifts/components/PeriodsTab.svelte';
	import BackupCoverageTab from '$lib/shifts/components/BackupCoverageTab.svelte';
	import ShiftCapabilitiesTab from '$lib/shifts/components/ShiftCapabilitiesTab.svelte';
	import StaffUnavailabilityTab from '$lib/shifts/components/StaffUnavailabilityTab.svelte';

	// ── Tab Navigation ──
	type SettingsTab = 'limits' | 'solver' | 'calendar' | 'groups' | 'priority' | 'early' | 'periods' | 'backup' | 'capabilities' | 'vacation';
	let activeTab: SettingsTab = $state('groups');

	// ── Department State ──
	let departments: OrgDepartment[] = $state([]);
	let activeDepartmentId: string | null = $state(null);

	// Dept-specific tabs
	const DEPT_TABS: SettingsTab[] = ['limits', 'groups', 'priority', 'early', 'capabilities', 'vacation', 'backup'];

	// ── Data State ──
	let dailyLimits: DailyLimits | null = $state(null);
	let monthlyLimits: MonthlyLimits | null = $state(null);
	let solverConfig: ORToolsSolverConfig | null = $state(null);
	let calendarRules: CalendarRule[] = $state([]);
	let staffGroups: ScheduleStaffGroup[] = $state([]);
	let allStaff: ScheduleStaff[] = $state([]);
	let allOrgStaff: ScheduleStaff[] = $state([]); // unscoped — all org staff for group member lookup
	let priorityRules: PriorityRule[] = $state([]);
	let earlyShiftPreferences: EarlyShiftPreference[] = $state([]);
	let periodConfig: PeriodConfiguration | null = $state(null);
	let periods: SchedulePeriod[] = $state([]);

	// Staff active in the current (latest) period — excludes staff whose end_period is before the period start
	const activeStaffForPeriod = $derived(() => {
		const latestPeriod = [...periods].sort((a, b) => b.start_date.localeCompare(a.start_date))[0];
		if (!latestPeriod) return allStaff.filter(s => s.is_active);
		const periodStart = new Date(latestPeriod.start_date);
		return allStaff.filter(s => {
			if (!s.is_active) return false;
			if (!s.end_period) return true;
			const ep = s.end_period;
			const endDate = new Date(ep.year, ep.month - 1, ep.day);
			return endDate >= periodStart;
		});
	});

	let loading = $state(true);
	let error = $state('');

	// ── Lifecycle ──
	let initialized = $state(false);

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
		loadAllSettings(activeDepartmentId);

		// Proactively refresh the token when the page becomes visible again
		function handleVisibilityChange() {
			if (document.visibilityState === 'visible' && authState.session) {
				if (isTokenExpiringSoon(300)) {
					refreshAuthToken();
				}
			}
		}
		document.addEventListener('visibilitychange', handleVisibilityChange);
		return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
	});

	async function loadAllSettings(deptId?: string | null) {
		try {
			loading = true;
			error = '';

			const deptParam = deptId ?? undefined;

			const [daily, monthly, solver, rules, groups, staff, orgStaff, priority, early, period, periodsList, depts] = await Promise.all([
				getDailyLimits(deptParam),
				getMonthlyLimits(deptParam),
				getSolverConfig(),
				getCalendarRules(),
				getStaffGroups(deptParam),
				getShiftStaff(deptParam),
				getShiftStaff(), // all org staff — needed for group member display across departments
				getPriorityRules(deptParam),
				getEarlyShiftPreferences(deptParam),
				getPeriodConfiguration(),
				getShiftPeriods(),
				getDepartments()
			]);

			dailyLimits = daily;
			monthlyLimits = monthly;
			solverConfig = solver;
			calendarRules = rules;
			staffGroups = groups;
			allStaff = staff.map(s => ({ ...s, staff_status: s.status }));
			allOrgStaff = orgStaff.map(s => ({ ...s, staff_status: s.status }));
			priorityRules = priority;
			earlyShiftPreferences = early;
			periodConfig = period;
			periods = periodsList;
			departments = depts;

			if (!activeDepartmentId && depts.length > 0) {
				activeDepartmentId = depts[0].id;
				// Re-fetch staff scoped to the first department (initial load had no deptId)
				if (!deptId) {
					const deptStaff = await getShiftStaff(depts[0].id);
					allStaff = deptStaff.map(s => ({ ...s, staff_status: s.status }));
				}
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load settings';
		} finally {
			loading = false;
		}
	}

	async function handleDepartmentChange(deptId: string) {
		activeDepartmentId = deptId;
		const deptParam = deptId;
		const [daily, monthly, groups, staff, priority, early] = await Promise.all([
			getDailyLimits(deptParam),
			getMonthlyLimits(deptParam),
			getStaffGroups(deptParam),
			getShiftStaff(deptParam),
			getPriorityRules(deptParam),
			getEarlyShiftPreferences(deptParam),
		]);
		dailyLimits = daily;
		monthlyLimits = monthly;
		staffGroups = groups;
		allStaff = staff.map(s => ({ ...s, staff_status: s.status }));
		priorityRules = priority;
		earlyShiftPreferences = early;
	}

	// ── Callback Functions for Components ──
	async function handleLimitsSave() {
		const deptParam = activeDepartmentId ?? undefined;
		const [daily, monthly, solver] = await Promise.all([
			getDailyLimits(deptParam),
			getMonthlyLimits(deptParam),
			getSolverConfig(),
		]);
		dailyLimits = daily;
		monthlyLimits = monthly;
		solverConfig = solver;
	}

	async function handleSolverSave() {
		solverConfig = await getSolverConfig();
	}

	async function handleCalendarRulesChange() {
		calendarRules = await getCalendarRules();
	}

	async function handleGroupsChange() {
		staffGroups = await getStaffGroups(activeDepartmentId ?? undefined);
	}

	async function handlePriorityRulesChange() {
		priorityRules = await getPriorityRules(activeDepartmentId ?? undefined);
	}

	async function handleEarlyShiftSave() {
		earlyShiftPreferences = await getEarlyShiftPreferences(activeDepartmentId ?? undefined);
	}

	async function handleStaffChange() {
		allStaff = (await getShiftStaff(activeDepartmentId ?? undefined)).map(s => ({ ...s, staff_status: s.status }));
	}

	async function handlePeriodsSave() {
		const [config, list] = await Promise.all([
			getPeriodConfiguration(),
			getShiftPeriods()
		]);
		periodConfig = config;
		periods = list;
	}

	// Tab definitions
	const tabs = [
		{ id: 'groups', label: 'グループ', icon: 'group', description: 'スタッフグループ管理' },
		{ id: 'backup', label: 'バックアップ', icon: 'backup', description: 'バックアップカバレッジ設定' },
		{ id: 'capabilities', label: 'シフト能力', icon: 'accessibility', description: '早番・遅番の可否設定' },
		{ id: 'vacation', label: '休暇設定', icon: 'event_busy', description: 'スタッフ休暇・不在日管理' },
		{ id: 'limits', label: '制限設定', icon: 'tune', description: '日次・月次の人数制限' },
		{ id: 'priority', label: '優先ルール', icon: 'priority_high', description: 'シフト優先度ルール' },
		{ id: 'calendar', label: 'カレンダー', icon: 'event_note', description: '祝日・定休日の設定' },
		{ id: 'early', label: '早番設定', icon: 'wb_sunny', description: '早番可能スタッフ' },
		{ id: 'periods', label: '期間設定', icon: 'date_range', description: 'シフト期間の設定' },
		{ id: 'solver', label: 'ソルバー設定', icon: 'psychology', description: '最適化エンジンの設定' }
	] as const;
</script>

<div class="min-h-screen bg-gray-100">
	<!-- Header -->
	<header class="bg-white shadow">
		<div class="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4 flex-wrap">
			<a href="/shifts" class="text-gray-500 hover:text-gray-700 transition-colors">
				<span class="material-symbols-rounded">arrow_back</span>
			</a>
			<div class="flex-1">
				<h1 class="text-xl font-bold text-gray-900">シフト設定</h1>
				<p class="text-sm text-gray-500">シフトスケジュールの各種設定を管理します</p>
			</div>
			{#if departments.length > 0}
				<div class="flex items-center gap-2">
					<span class="text-xs text-gray-400">部署</span>
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
				</div>
			{/if}
		</div>
	</header>

	<!-- Error Message -->
	{#if error}
		<div class="bg-red-50 border-l-4 border-red-500 p-4 mx-4 mt-4 max-w-7xl mx-auto">
			<div class="flex items-center">
				<span class="material-symbols-rounded text-red-500 mr-2">error</span>
				<span class="text-red-700">{error}</span>
				<button class="ml-auto text-red-500" onclick={() => error = ''}>
					<span class="material-symbols-rounded">close</span>
				</button>
			</div>
		</div>
	{/if}

	{#if !authState.session && !authState.loading}
		<!-- Not logged in - show login prompt -->
		<div class="flex items-center justify-center h-64">
			<div class="text-center">
				<span class="material-symbols-rounded text-6xl text-gray-400 mb-4">lock</span>
				<h2 class="text-xl font-semibold text-gray-700 mb-2">ログインが必要です</h2>
				<p class="text-gray-500 mb-4">シフト設定機能を利用するにはログインしてください</p>
				<button
					class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
					onclick={() => signInWithGoogle(window.location.href)}
				>
					<svg class="w-5 h-5" viewBox="0 0 24 24">
						<path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
						<path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
						<path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
						<path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
					</svg>
					Googleでログイン
				</button>
			</div>
		</div>
	{:else if loading}
		<div class="flex items-center justify-center h-64">
			<div class="text-center">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
				<p class="text-gray-500">設定を読み込んでいます...</p>
			</div>
		</div>
	{:else}
		<div class="max-w-7xl mx-auto p-4">
			<div class="flex flex-col lg:flex-row gap-6">
				<!-- Sidebar Navigation -->
				<div class="lg:w-64 flex-shrink-0">
					<nav class="bg-white rounded-lg shadow overflow-hidden">
						{#each tabs as tab}
							<button
								type="button"
								onclick={() => activeTab = tab.id as SettingsTab}
								class="w-full flex items-start gap-3 p-4 text-left transition-colors border-l-4
									{activeTab === tab.id
										? 'bg-blue-50 border-blue-600 text-blue-700'
										: 'border-transparent text-gray-600 hover:bg-gray-50'}"
							>
								<span class="material-symbols-rounded {activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'}">
									{tab.icon}
								</span>
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-1.5">
										<span class="font-medium">{tab.label}</span>
										{#if DEPT_TABS.includes(tab.id as SettingsTab)}
											<span class="text-[10px] px-1 py-0.5 rounded bg-indigo-100 text-indigo-600 font-medium leading-none">部署</span>
										{/if}
									</div>
									<div class="text-xs text-gray-500 truncate">{tab.description}</div>
								</div>
							</button>
						{/each}
					</nav>

					<!-- Help Box -->
					<div class="mt-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
						<div class="flex items-start gap-2">
							<span class="material-symbols-rounded text-blue-600">help_outline</span>
							<div>
								<h4 class="font-medium text-blue-900 text-sm">ヘルプ</h4>
								<p class="text-xs text-blue-700 mt-1">
									各タブで設定を変更後、保存ボタンを押して反映してください。
								</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Main Content -->
				<div class="flex-1 min-w-0">
					<div class="bg-white rounded-lg shadow p-6">
						{#if activeTab === 'limits'}
							<LimitsTab
								{dailyLimits}
								{monthlyLimits}
								{solverConfig}
								staff={allStaff.filter(s => s.is_active)}
								periodStaff={activeStaffForPeriod()}
								onSave={handleLimitsSave}
								departmentId={activeDepartmentId ?? undefined}
							/>

						{:else if activeTab === 'solver'}
							<ConstraintsTab
								{solverConfig}
								onSave={handleSolverSave}
							/>

						{:else if activeTab === 'calendar'}
							<CalendarRulesTab
								{calendarRules}
								onRulesChange={handleCalendarRulesChange}
							/>

						{:else if activeTab === 'groups'}
							<StaffGroupsTab
								{staffGroups}
								{allStaff}
								orgStaff={allOrgStaff}
								onGroupsChange={handleGroupsChange}
								departmentId={activeDepartmentId ?? undefined}
							/>

						{:else if activeTab === 'backup'}
							<BackupCoverageTab
								{allStaff}
								{staffGroups}
								departmentId={activeDepartmentId ?? undefined}
							/>

						{:else if activeTab === 'capabilities'}
							<ShiftCapabilitiesTab
								{allStaff}
								onStaffChange={handleStaffChange}
								departmentId={activeDepartmentId ?? undefined}
							/>

						{:else if activeTab === 'priority'}
							<PriorityRulesTab
								{priorityRules}
								{allStaff}
								onRulesChange={handlePriorityRulesChange}
								departmentId={activeDepartmentId ?? undefined}
							/>

						{:else if activeTab === 'early'}
							<EarlyShiftTab
								{earlyShiftPreferences}
								{allStaff}
								onSave={handleEarlyShiftSave}
								departmentId={activeDepartmentId ?? undefined}
							/>

						{:else if activeTab === 'periods'}
							<PeriodsTab
								{periodConfig}
								{periods}
								onSave={handlePeriodsSave}
							/>

						{:else if activeTab === 'vacation'}
							<StaffUnavailabilityTab
								{allStaff}
								departmentId={activeDepartmentId ?? undefined}
							/>
						{/if}
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
