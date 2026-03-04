import type { ScheduleStaff, SchedulePeriod } from './types';
import { getOrderedStaffMembers, isDateWithinStaffWorkPeriod } from './staffUtils';

const SHIFT_COLOR: Record<string, string> = {
	'×': '#dc2626', '△': '#2563eb', '◇': '#7c3aed',
	'★': '#ca8a04', '●': '#16a34a', '○': '#374151',
	'◎': '#ea580c', '▣': '#6b7280', '⊘': '#991b1b',
};

function resolveSymbol(raw: string, status: string): string {
	if (!raw || raw === 'normal') return status === 'パート' ? '○' : '';
	if (raw === 'late')    return '◇';
	if (raw === 'early')   return '△';
	if (raw === 'off')     return '×';
	if (raw === 'holiday') return '★';
	return raw;
}

export function printSchedule(
	staff: ScheduleStaff[],
	dateRange: string[],
	scheduleData: Record<string, Record<string, string>>,
	selectedPeriod: SchedulePeriod | null,
) {
	const orderedStaff = getOrderedStaffMembers(staff, dateRange);
	const periodLabel = selectedPeriod
		? selectedPeriod.start_date.replace(/-/g, '/') + ' 〜 ' + selectedPeriod.end_date.replace(/-/g, '/')
		: '';

	const rowCount = dateRange.length;
	const rowPx   = Math.max(14, Math.min(22, Math.floor(480 / rowCount)));
	const fs       = Math.max(7,  Math.min(11, Math.floor(rowPx * 0.55)));
	const symFs    = Math.max(9,  Math.min(13, fs + 2));

	const headerCells = orderedStaff.map((s) => '<th>' + s.name + '</th>').join('');

	const weekdays = ['日','月','火','水','木','金','土'];
	const bodyRows = dateRange.map((date) => {
		const d   = new Date(date + 'T00:00:00');
		const day = d.getDate();
		const wd  = weekdays[d.getDay()];
		const isWeekend = d.getDay() === 0 || d.getDay() === 6;
		const dateClass = isWeekend ? 'weekend' : '';

		const cells = orderedStaff.map((s) => {
			if (!isDateWithinStaffWorkPeriod(s, date)) {
				return '<td class="not-working">-</td>';
			}
			const raw    = (scheduleData[s.id]?.[date]) ?? '';
			const symbol = resolveSymbol(raw, s.status ?? '');
			const color  = SHIFT_COLOR[symbol] ?? '#374151';
			const style  = symbol ? ('color:' + color + ';') : '';
			return '<td><span class="sym" style="' + style + '">' + symbol + '</span></td>';
		}).join('');

		return '<tr>'
			+ '<td class="date-col ' + dateClass + '">'
			+ day + ' <span class="wd">' + wd + '</span>'
			+ '</td>'
			+ cells
			+ '</tr>';
	}).join('');

	// CSS is plain string concatenation — no template literals with ${} so no
	// risk of a bundler/preprocessor mistaking this for a style block.
	const css = [
		'*{box-sizing:border-box;margin:0;padding:0}',
		'body{font-family:Arial,sans-serif;background:#fff}',
		'.page{padding:6mm}',
		'.title-row{display:flex;align-items:baseline;justify-content:center;gap:10px;margin-bottom:3px}',
		'h1{font-size:13px;font-weight:700}',
		'.period{font-size:10px;color:#555}',
		'table{border-collapse:collapse;width:100%;table-layout:fixed}',
		'th{background:#1f2937;color:#fff;font-size:' + fs + 'px;font-weight:600;'
			+ 'padding:3px 1px;height:' + (rowPx + 4) + 'px;border:1px solid #374151;'
			+ 'overflow:hidden;word-break:break-all;vertical-align:middle}',
		'td{border:1px solid #e5e7eb;text-align:center;vertical-align:middle;'
			+ 'font-size:' + fs + 'px;height:' + rowPx + 'px;padding:0;overflow:hidden}',
		'.date-col{background:#f9fafb;font-weight:600;white-space:nowrap;text-align:left;padding-left:4px}',
		'.wd{font-weight:400;color:#6b7280;margin-left:2px}',
		'.weekend{color:#dc2626}',
		'.weekend .wd{color:#dc2626}',
		'.not-working{background:#f3f4f6;color:#d1d5db}',
		'.sym{font-size:' + symFs + 'px;font-weight:700;line-height:1}',
		'tr:nth-child(even) td:not(.date-col):not(.not-working){background:#fafafa}',
		'.legend{margin-top:4px;font-size:8px;text-align:center;color:#9ca3af}',
		'@media print{@page{size:A4 landscape;margin:0}body{margin:0}.page{padding:5mm}}',
	].join('\n');

	const html = '<!DOCTYPE html>'
		+ '<html><head><meta charset="utf-8"><title>調理場シフト表</title>'
		+ '<style>' + css + '</style>'
		+ '</head><body>'
		+ '<div class="page">'
		+ '<div class="title-row"><h1>調理場シフト表</h1><span class="period">' + periodLabel + '</span></div>'
		+ '<table>'
		+ '<thead><tr><th style="text-align:left;padding-left:4px;">日付</th>' + headerCells + '</tr></thead>'
		+ '<tbody>' + bodyRows + '</tbody>'
		+ '</table>'
		+ '<div class="legend">△ 早番 · ○ 出勤 · ◇ 遅番 · × 休み · ★ 管理 · ⊘ 不可</div>'
		+ '</div>'
		+ '<script>window.onload=function(){window.print();}<' + '/script>'
		+ '</body></html>';

	const w = window.open('', '_blank');
	if (w) {
		w.document.write(html);
		w.document.close();
	} else {
		alert('ポップアップがブロックされました。許可してください。');
	}
}
