<script lang="ts">
	import { fade, slide } from 'svelte/transition';
	import { AlertTriangle, ChevronDown, ChevronUp, X } from 'lucide-svelte';

	interface Violation {
		description: string;
		count: number;
		penalty: number;
	}

	interface Props {
		violations: Violation[];
		solveTime?: number;
		isOptimal?: boolean;
		onClose: () => void;
	}

	let { violations, solveTime, isOptimal, onClose }: Props = $props();

	let expanded = $state(true);

	const totalPenalty = $derived(violations.reduce((sum, v) => sum + v.penalty, 0));

	function severityClass(penalty: number): string {
		if (penalty >= 100) return 'high';
		if (penalty >= 50)  return 'medium';
		return 'low';
	}

	function severityLabel(penalty: number): string {
		if (penalty >= 100) return '高';
		if (penalty >= 50)  return '中';
		return '低';
	}

	// Translate raw solver description strings into readable Japanese
	function translateDescription(raw: string): string {
		// hard_priority_required_<ruleName>_<uuid>_<date>  →  優先ルール違反: <ruleName> (<date>)
		// Rule name may contain spaces, UUID is always 36 hex chars
		const hardRequired = raw.match(/^hard_priority_required_(.+)_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_(\d{4}-\d{2}-\d{2})$/);
		if (hardRequired) return `優先ルール違反 (必須勤務): ${hardRequired[1]} — ${hardRequired[3]}`;

		// hard_priority_avoid_<ruleName>_<uuid>_<date>
		const hardAvoid = raw.match(/^hard_priority_avoid_(.+)_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_(\d{4}-\d{2}-\d{2})$/);
		if (hardAvoid) return `優先ルール違反 (休み回避): ${hardAvoid[1]} — ${hardAvoid[3]}`;

		// hard_priority_blocked_<ruleName>_<uuid>_<date>
		const hardBlocked = raw.match(/^hard_priority_blocked_(.+)_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_(\d{4}-\d{2}-\d{2})$/);
		if (hardBlocked) return `優先ルール違反 (シフト禁止): ${hardBlocked[1]} — ${hardBlocked[3]}`;

		// early_pref_<uuid>_<date>
		const earlyPref = raw.match(/^early_pref_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_(\d{4}-\d{2}-\d{2})$/);
		if (earlyPref) return `早番希望未達成 — ${earlyPref[2]}`;

		// Monthly over-maximum for <name>
		const monthlyOver = raw.match(/^Monthly over-maximum for (.+)$/);
		if (monthlyOver) return `月間上限超過: ${monthlyOver[1]}`;

		// Monthly under-minimum for <name>
		const monthlyUnder = raw.match(/^Monthly under-minimum for (.+)$/);
		if (monthlyUnder) return `月間下限未達: ${monthlyUnder[1]}`;

		// Below target day-offs for <name> on free days (target=N)
		const belowDayoffs = raw.match(/^Below target day-offs for (.+?) on free days \(target=(\d+)\)$/);
		if (belowDayoffs) return `休日目標未達: ${belowDayoffs[1]} (目標${belowDayoffs[2]}日)`;

		// Below target early shifts for <name> on rule days (target=N)
		const belowEarly = raw.match(/^Below target early shifts for (.+?) on rule days \(target=(\d+)\)$/);
		if (belowEarly) return `早番目標未達: ${belowEarly[1]} (目標${belowEarly[2]}日)`;

		// Consecutive off days for <name> on <date1>-<date2>
		const consOff = raw.match(/^Consecutive off days for (.+?) on (\d{4}-\d{2}-\d{2})-(\d{4}-\d{2}-\d{2})$/);
		if (consOff) return `連続休み: ${consOff[1]} (${consOff[2]} 〜 ${consOff[3]})`;

		// Early-then-off for <name> on <date1>-<date2>
		const earlyOff = raw.match(/^Early-then-off for (.+?) on (\d{4}-\d{2}-\d{2})-(\d{4}-\d{2}-\d{2})$/);
		if (earlyOff) return `早番→休み連続: ${earlyOff[1]} (${earlyOff[2]} 〜 ${earlyOff[3]})`;

		// Off-then-early for <name> on <date1>-<date2>
		const offEarly = raw.match(/^Off-then-early for (.+?) on (\d{4}-\d{2}-\d{2})-(\d{4}-\d{2}-\d{2})$/);
		if (offEarly) return `休み→早番連続: ${offEarly[1]} (${offEarly[2]} 〜 ${offEarly[3]})`;

		// Consecutive early shifts for <name> on <date1>-<date2>
		const consEarly = raw.match(/^Consecutive early shifts for (.+?) on (\d{4}-\d{2}-\d{2})-(\d{4}-\d{2}-\d{2})$/);
		if (consEarly) return `早番連続: ${consEarly[1]} (${consEarly[2]} 〜 ${consEarly[3]})`;

		// 6+ consecutive work days for <name> starting <date>
		const sixDay = raw.match(/^6\+ consecutive work days for (.+?) starting (\d{4}-\d{2}-\d{2})$/);
		if (sixDay) return `6日以上連続勤務: ${sixDay[1]} (${sixDay[2]}〜)`;

		// Staff group <name> on <date>
		const staffGroup = raw.match(/^Staff group (.+?) on (\d{4}-\d{2}-\d{2})$/);
		if (staffGroup) return `グループ制約違反: ${staffGroup[1]} — ${staffGroup[2]}`;

		// Staff group <name> early shift violation on <date>
		const groupEarly = raw.match(/^Staff group (.+?) early shift violation on (\d{4}-\d{2}-\d{2})$/);
		if (groupEarly) return `グループ早番制約違反: ${groupEarly[1]} — ${groupEarly[2]}`;

		// Daily over-maximum on <date>
		const dailyOver = raw.match(/^Daily over-maximum on (\d{4}-\d{2}-\d{2})$/);
		if (dailyOver) return `日別上限超過 — ${dailyOver[1]}`;

		// Daily under-minimum on <date>
		const dailyUnder = raw.match(/^Daily under-minimum on (\d{4}-\d{2}-\d{2})$/);
		if (dailyUnder) return `日別下限未達 — ${dailyUnder[1]}`;

		// Backup <name> not covering <group> on <date>
		const backupMiss = raw.match(/^Backup (.+?) not covering (.+?) on (\d{4}-\d{2}-\d{2})$/);
		if (backupMiss) return `バックアップ未対応: ${backupMiss[1]} → ${backupMiss[2]} (${backupMiss[3]})`;

		// Forbidden early/late shift for <name> (<status>) on <date>
		const forbidden = raw.match(/^Forbidden (early|late) shift for (.+?) \((.+?)\) on (\d{4}-\d{2}-\d{2})$/);
		if (forbidden) {
			const type = forbidden[1] === 'early' ? '早番' : '遅番';
			return `${type}禁止違反: ${forbidden[2]} (${forbidden[3]}) — ${forbidden[4]}`;
		}

		// Insufficient rest-equivalent for <name>
		const rest = raw.match(/^Insufficient rest-equivalent for (.+?) \(min=.+?\)$/);
		if (rest) return `休息不足: ${rest[1]}`;

		// Post-period / prefilled / escape — keep brief
		if (raw.startsWith('HARD escape:')) return `強制違反 (エスケープ): ${raw.replace(/^HARD escape: /, '')}`;
		if (raw.startsWith('Day-off after pre-filled')) return `事前入力済み勤務の翌日休み違反`;
		if (raw.startsWith('Day-off before pre-filled')) return `事前入力済み勤務の前日休み違反`;
		if (raw.startsWith('Post-period')) return `期間後制約違反`;
		if (raw.startsWith('Staff type')) return raw; // keep as-is for now

		return raw; // fallback: show raw if no pattern matched
	}

	const sorted = $derived([...violations].sort((a, b) => b.penalty - a.penalty));
</script>

<div class="panel" transition:fade={{ duration: 180 }}>
	<!-- Header -->
	<div class="panel-header">
		<div class="header-left">
			<AlertTriangle size={15} class="icon-warn" />
			<span class="panel-title">最適化の制約違反</span>
			<span class="badge-count">{violations.length}件</span>
			{#if !isOptimal}
				<span class="badge-suboptimal">非最適解</span>
			{/if}
		</div>
		<div class="header-right">
			<span class="penalty-total">ペナルティ合計: {totalPenalty}</span>
			<button class="btn-icon" onclick={() => (expanded = !expanded)} aria-label="展開/折りたたみ">
				{#if expanded}
					<ChevronUp size={15} />
				{:else}
					<ChevronDown size={15} />
				{/if}
			</button>
			<button class="btn-icon" onclick={onClose} aria-label="閉じる">
				<X size={15} />
			</button>
		</div>
	</div>

	<!-- Body -->
	{#if expanded}
		<div class="panel-body" transition:slide={{ duration: 200 }}>
			{#if violations.length === 0}
				<p class="empty">違反なし — 完全に最適なスケジュールです。</p>
			{:else}
				<ul class="violation-list">
					{#each sorted as v}
						<li class="violation-item severity-{severityClass(v.penalty)}">
							<span class="sev-badge">{severityLabel(v.penalty)}</span>
							<span class="viol-desc">{translateDescription(v.description)}</span>
							{#if v.count > 1}
								<span class="viol-count">×{v.count}</span>
							{/if}
							<span class="viol-penalty">-{v.penalty}</span>
						</li>
					{/each}
				</ul>
				<p class="footnote">
					スケジュールは保存済みです。制約を調整して再最適化することができます。
					{#if solveTime != null}　({solveTime.toFixed(2)}秒){/if}
				</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.panel {
		margin: 0 1rem 1rem;
		border-radius: 10px;
		border: 1px solid #fde68a;
		background: #fffbeb;
		overflow: hidden;
		box-shadow: 0 1px 4px rgba(0,0,0,0.06);
	}

	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 14px;
		border-bottom: 1px solid #fde68a;
		background: #fef3c7;
		gap: 8px;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 7px;
		flex-wrap: wrap;
	}

	:global(.icon-warn) { color: #d97706; }

	.panel-title {
		font-size: 13px;
		font-weight: 600;
		color: #92400e;
	}

	.badge-count {
		font-size: 11px;
		background: #fcd34d;
		color: #78350f;
		border-radius: 999px;
		padding: 1px 7px;
		font-weight: 600;
	}

	.badge-suboptimal {
		font-size: 11px;
		background: #fee2e2;
		color: #991b1b;
		border-radius: 999px;
		padding: 1px 7px;
		font-weight: 600;
		border: 1px solid #fca5a5;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
	}

	.penalty-total {
		font-size: 11.5px;
		color: #92400e;
	}

	.btn-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border-radius: 5px;
		color: #92400e;
		background: transparent;
		border: none;
		cursor: pointer;
		transition: background 0.15s;
	}
	.btn-icon:hover { background: #fde68a; }

	.panel-body {
		padding: 10px 14px 12px;
	}

	.empty {
		font-size: 12.5px;
		color: #6b7280;
		margin: 0;
	}

	.violation-list {
		list-style: none;
		margin: 0 0 8px;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 5px;
	}

	.violation-item {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12.5px;
		padding: 6px 10px;
		border-radius: 6px;
		border-left: 3px solid transparent;
	}

	.severity-high   { background: #fff1f2; border-color: #f87171; }
	.severity-medium { background: #fffbeb; border-color: #fbbf24; }
	.severity-low    { background: #f0fdf4; border-color: #86efac; }

	.sev-badge {
		font-size: 10.5px;
		font-weight: 700;
		padding: 1px 5px;
		border-radius: 4px;
		flex-shrink: 0;
	}

	.severity-high   .sev-badge { background: #fee2e2; color: #991b1b; }
	.severity-medium .sev-badge { background: #fef3c7; color: #78350f; }
	.severity-low    .sev-badge { background: #dcfce7; color: #14532d; }

	.viol-desc {
		flex: 1;
		color: #374151;
		line-height: 1.4;
	}

	.viol-count {
		font-size: 11px;
		color: #6b7280;
		flex-shrink: 0;
	}

	.viol-penalty {
		font-size: 12px;
		font-weight: 600;
		color: #9ca3af;
		flex-shrink: 0;
	}

	.severity-high   .viol-penalty { color: #dc2626; }
	.severity-medium .viol-penalty { color: #d97706; }
	.severity-low    .viol-penalty { color: #16a34a; }

	.footnote {
		font-size: 11.5px;
		color: #9ca3af;
		margin: 0;
	}
</style>
