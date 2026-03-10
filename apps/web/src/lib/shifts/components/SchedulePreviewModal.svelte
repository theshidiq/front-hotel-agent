<script lang="ts">
	import { fade } from 'svelte/transition';
	import { X, CheckCircle, Trash2 } from 'lucide-svelte';
	import type { ScheduleStaff } from '$lib/shifts/types';
	import { getOrderedStaffMembers } from '$lib/shifts/staffUtils';

	interface Violation {
		description: string;
		count: number;
		penalty: number;
	}

	interface Props {
		schedule: Record<string, Record<string, string>>;
		violations: Violation[];
		staff: ScheduleStaff[];
		dateRange: string[];
		solveTime?: number;
		onCommit: () => void;
		onDiscard: () => void;
	}

	let { schedule, violations, staff, dateRange, solveTime, onCommit, onDiscard }: Props = $props();

	const orderedStaff = $derived(getOrderedStaffMembers(staff, dateRange));
	const totalPenalty = $derived(violations.reduce((s, v) => s + v.penalty, 0));

	// Day-of-week labels (short)
	const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

	function dayLabel(dateStr: string): string {
		const d = new Date(dateStr + 'T00:00:00');
		return DAY_LABELS[d.getDay()];
	}

	function isWeekend(dateStr: string): boolean {
		const d = new Date(dateStr + 'T00:00:00');
		return d.getDay() === 0 || d.getDay() === 6;
	}

	function cellClass(symbol: string): string {
		switch (symbol) {
			case '×': return 'cell-off';
			case '△': return 'cell-early';
			case '◇': return 'cell-late';
			case '★': case '●': case '◎': case '▣': case '⊘': return 'cell-special';
			default: return 'cell-work';
		}
	}

	function severityClass(penalty: number): string {
		if (penalty >= 100) return 'high';
		if (penalty >= 50) return 'medium';
		return 'low';
	}

	function severityLabel(penalty: number): string {
		if (penalty >= 100) return '高';
		if (penalty >= 50) return '中';
		return '低';
	}

	const sortedViolations = $derived([...violations].sort((a, b) => b.penalty - a.penalty));
</script>

<div class="overlay" transition:fade={{ duration: 150 }}>
	<div class="modal">
		<!-- Header -->
		<div class="modal-header">
			<div class="header-left">
				<span class="material-symbols-rounded header-icon">preview</span>
				<div>
					<h2 class="modal-title">スケジュールプレビュー</h2>
					<p class="modal-subtitle">
						保存前に確認してください
						{#if solveTime != null}　({solveTime.toFixed(2)}秒){/if}
					</p>
				</div>
			</div>
			<button class="btn-close" onclick={onDiscard} aria-label="閉じる">
				<X size={16} />
			</button>
		</div>

		<!-- Violations summary bar -->
		{#if violations.length > 0}
			<div class="violations-bar">
				<span class="material-symbols-rounded warn-icon">warning</span>
				<span>{violations.length}件の制約違反 (ペナルティ合計: {totalPenalty})</span>
			</div>
		{:else}
			<div class="optimal-bar">
				<CheckCircle size={14} />
				<span>制約違反なし — 完全に最適なスケジュールです</span>
			</div>
		{/if}

		<!-- Schedule grid -->
		<div class="grid-wrapper">
			<table class="grid-table">
				<thead>
					<tr>
						<th class="th-name">スタッフ</th>
						{#each dateRange as date}
							<th class="th-date" class:weekend={isWeekend(date)}>
								<div class="date-num">{new Date(date + 'T00:00:00').getDate()}</div>
								<div class="date-dow" class:weekend={isWeekend(date)}>{dayLabel(date)}</div>
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each orderedStaff as member}
						<tr>
							<td class="td-name">{member.name}</td>
							{#each dateRange as date}
								{@const symbol = schedule[member.id]?.[date] ?? ''}
								<td class="td-cell {cellClass(symbol)}">{symbol}</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Violations list (if any) -->
		{#if sortedViolations.length > 0}
			<div class="violations-section">
				<h3 class="violations-title">制約違反の詳細</h3>
				<ul class="violations-list">
					{#each sortedViolations.slice(0, 10) as v}
						<li class="v-item severity-{severityClass(v.penalty)}">
							<span class="sev-badge">{severityLabel(v.penalty)}</span>
							<span class="v-desc">{v.description}</span>
							{#if v.count > 1}<span class="v-count">×{v.count}</span>{/if}
							<span class="v-penalty">-{v.penalty}</span>
						</li>
					{/each}
					{#if sortedViolations.length > 10}
						<li class="v-more">他 {sortedViolations.length - 10} 件…</li>
					{/if}
				</ul>
			</div>
		{/if}

		<!-- Footer -->
		<div class="modal-footer">
			<button class="btn-discard" onclick={onDiscard}>
				<Trash2 size={14} />
				破棄
			</button>
			<button class="btn-commit" onclick={onCommit}>
				<CheckCircle size={14} />
				確定して保存
			</button>
		</div>
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 60;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.45);
		backdrop-filter: blur(2px);
		padding: 1rem;
	}

	.modal {
		background: #fff;
		border-radius: 12px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
		width: 100%;
		max-width: 92vw;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 18px;
		border-bottom: 1px solid #e5e7eb;
		background: #f9fafb;
		flex-shrink: 0;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.header-icon {
		font-size: 22px;
		color: #3b82f6;
	}

	.modal-title {
		font-size: 14px;
		font-weight: 700;
		color: #111827;
		margin: 0;
	}

	.modal-subtitle {
		font-size: 12px;
		color: #6b7280;
		margin: 1px 0 0;
	}

	.btn-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border: none;
		background: transparent;
		border-radius: 6px;
		cursor: pointer;
		color: #6b7280;
		transition: background 0.15s;
	}
	.btn-close:hover { background: #f3f4f6; }

	.violations-bar {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 18px;
		background: #fffbeb;
		border-bottom: 1px solid #fde68a;
		font-size: 12.5px;
		color: #92400e;
		flex-shrink: 0;
	}

	.warn-icon {
		font-size: 15px;
		color: #d97706;
	}

	.optimal-bar {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 18px;
		background: #f0fdf4;
		border-bottom: 1px solid #bbf7d0;
		font-size: 12.5px;
		color: #166534;
		flex-shrink: 0;
	}

	/* Grid */
	.grid-wrapper {
		overflow: auto;
		flex: 1;
		min-height: 0;
	}

	.grid-table {
		border-collapse: collapse;
		font-size: 11.5px;
		white-space: nowrap;
		width: 100%;
	}

	.th-name {
		position: sticky;
		left: 0;
		background: #f9fafb;
		z-index: 2;
		padding: 5px 12px;
		text-align: left;
		font-weight: 600;
		color: #374151;
		border-bottom: 1px solid #e5e7eb;
		border-right: 1px solid #e5e7eb;
		min-width: 80px;
	}

	.th-date {
		padding: 4px 3px;
		text-align: center;
		min-width: 28px;
		border-bottom: 1px solid #e5e7eb;
		border-right: 1px solid #f3f4f6;
		background: #f9fafb;
	}
	.th-date.weekend { background: #fef3c7; }

	.date-num {
		font-size: 11px;
		font-weight: 600;
		color: #374151;
		line-height: 1.2;
	}

	.date-dow {
		font-size: 9.5px;
		color: #9ca3af;
		line-height: 1;
	}
	.date-dow.weekend { color: #d97706; }

	.td-name {
		position: sticky;
		left: 0;
		background: #fff;
		z-index: 1;
		padding: 4px 12px;
		font-size: 12px;
		color: #374151;
		border-bottom: 1px solid #f3f4f6;
		border-right: 1px solid #e5e7eb;
		white-space: nowrap;
	}

	.td-cell {
		padding: 3px 2px;
		text-align: center;
		border-bottom: 1px solid #f3f4f6;
		border-right: 1px solid #f3f4f6;
		font-size: 11.5px;
		font-weight: 500;
	}

	.cell-work    { color: #1d4ed8; background: #eff6ff; }
	.cell-off     { color: #dc2626; background: #fef2f2; }
	.cell-early   { color: #d97706; background: #fffbeb; }
	.cell-late    { color: #7c3aed; background: #f5f3ff; }
	.cell-special { color: #374151; background: #f9fafb; }

	/* Violations list */
	.violations-section {
		padding: 10px 18px 6px;
		border-top: 1px solid #e5e7eb;
		flex-shrink: 0;
		max-height: 200px;
		overflow-y: auto;
	}

	.violations-title {
		font-size: 11.5px;
		font-weight: 600;
		color: #6b7280;
		margin: 0 0 6px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.violations-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.v-item {
		display: flex;
		align-items: center;
		gap: 7px;
		font-size: 12px;
		padding: 4px 8px;
		border-radius: 5px;
		border-left: 3px solid transparent;
	}

	.severity-high   { background: #fff1f2; border-color: #f87171; }
	.severity-medium { background: #fffbeb; border-color: #fbbf24; }
	.severity-low    { background: #f0fdf4; border-color: #86efac; }

	.sev-badge {
		font-size: 10px;
		font-weight: 700;
		padding: 1px 4px;
		border-radius: 3px;
		flex-shrink: 0;
	}
	.severity-high   .sev-badge { background: #fee2e2; color: #991b1b; }
	.severity-medium .sev-badge { background: #fef3c7; color: #78350f; }
	.severity-low    .sev-badge { background: #dcfce7; color: #14532d; }

	.v-desc { flex: 1; color: #374151; }

	.v-count {
		font-size: 10.5px;
		color: #9ca3af;
		flex-shrink: 0;
	}

	.v-penalty {
		font-size: 11px;
		font-weight: 600;
		flex-shrink: 0;
	}
	.severity-high   .v-penalty { color: #dc2626; }
	.severity-medium .v-penalty { color: #d97706; }
	.severity-low    .v-penalty { color: #16a34a; }

	.v-more {
		font-size: 11.5px;
		color: #9ca3af;
		padding: 2px 8px;
	}

	/* Footer */
	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		padding: 12px 18px;
		border-top: 1px solid #e5e7eb;
		background: #f9fafb;
		flex-shrink: 0;
	}

	.btn-discard {
		display: flex;
		align-items: center;
		gap: 5px;
		padding: 8px 16px;
		border-radius: 8px;
		border: 1px solid #d1d5db;
		background: #fff;
		color: #6b7280;
		font-size: 13px;
		cursor: pointer;
		transition: background 0.15s;
	}
	.btn-discard:hover { background: #f9fafb; color: #374151; }

	.btn-commit {
		display: flex;
		align-items: center;
		gap: 5px;
		padding: 8px 18px;
		border-radius: 8px;
		border: none;
		background: #2563eb;
		color: #fff;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
	}
	.btn-commit:hover { background: #1d4ed8; }
</style>
