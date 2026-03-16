import { getShiftStaff, getShiftPeriods, getSchedule } from '$lib/shifts/api';
import type { ScheduleStaff, SchedulePeriod } from '$lib/shifts/types';
import type { Period, StaffInfo, Shifts, ShiftStats } from './types';

// Convert SchedulePeriod → Period (same shape)
function toPeriod(p: SchedulePeriod): Period {
	return { id: p.id, start_date: p.start_date, end_date: p.end_date, label: p.label };
}

// Convert ScheduleStaff → StaffInfo
function toStaffInfo(s: ScheduleStaff): StaffInfo {
	return {
		id: s.id,
		name: s.name,
		position: s.position ?? null,
		status: s.status ?? null,
		department: s.department ?? null,
		department_id: s.department_id ?? null,
	};
}

export async function fetchStaffById(id: string): Promise<StaffInfo | null> {
	const all = await getShiftStaff();
	const found = all.find(s => s.id === id);
	return found ? toStaffInfo(found) : null;
}

export async function fetchPeriods(): Promise<Period[]> {
	const periods = await getShiftPeriods();
	return periods.map(toPeriod);
}

export function findCurrentPeriodIndex(periods: Period[]): number {
	const now = new Date();
	const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
	const idx = periods.findIndex((p) => today >= p.start_date && today <= p.end_date);
	return idx >= 0 ? idx : periods.length - 1;
}


export async function fetchStaffShifts(
	staffId: string,
	period: Period,
	departmentId?: string | null
): Promise<Shifts> {
	try {
		const schedule = await getSchedule(period.id, departmentId ?? undefined);
		const scheduleData = schedule?.schedule?.schedule_data;
		if (!scheduleData || typeof scheduleData !== 'object') return {};
		return (scheduleData[staffId] as Shifts) ?? {};
	} catch {
		return {};
	}
}

const KNOWN_SYMBOLS = new Set(['×', '△', '○', '◇', '★', '●', '◎', '']);

export function calculateStats(shifts: Shifts): ShiftStats {
	const stats: ShiftStats = {
		off: 0,
		early: 0,
		normal: 0,
		late: 0,
		special: 0,
		work: 0,
		custom: 0,
		total: 0,
	};

	for (const shift of Object.values(shifts)) {
		stats.total++;
		switch (shift) {
			case '×': stats.off++; break;
			case '△': stats.early++; break;
			case '○': stats.normal++; break;
			case '◇': stats.late++; break;
			case '★': stats.special++; break;
			case '': stats.work++; break;
			default:
				if (KNOWN_SYMBOLS.has(shift)) stats.work++;
				else stats.custom++;
				break;
		}
	}

	return stats;
}
