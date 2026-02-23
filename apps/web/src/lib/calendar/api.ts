import { supabase } from '$lib/supabase';
import type { Period, StaffInfo, Shifts, ShiftStats } from './types';

export async function fetchStaffById(id: string): Promise<StaffInfo | null> {
	const { data, error } = await supabase
		.from('staff')
		.select('id, name, position, status, department')
		.eq('id', id)
		.single();

	if (error || !data) return null;
	return data as StaffInfo;
}

export async function fetchPeriods(): Promise<Period[]> {
	const { data, error } = await supabase
		.from('periods')
		.select('id, start_date, end_date, label')
		.order('start_date', { ascending: true });

	if (error || !data) return [];
	return data as Period[];
}

export function findCurrentPeriodIndex(periods: Period[]): number {
	const now = new Date();
	const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
	const idx = periods.findIndex((p) => today >= p.start_date && today <= p.end_date);
	return idx >= 0 ? idx : periods.length - 1;
}

export async function fetchStaffShifts(
	staffId: string,
	periodIndex: number
): Promise<Shifts> {
	const { data, error } = await supabase
		.from('schedule_staff_assignments')
		.select('schedule_id, schedules(schedule_data)')
		.eq('period_index', periodIndex)
		.limit(1)
		.single();

	if (error || !data) return {};

	const scheduleData = (data as any).schedules?.schedule_data;
	if (!scheduleData || typeof scheduleData !== 'object') return {};

	const staffShifts = scheduleData[staffId];
	if (!staffShifts || typeof staffShifts !== 'object') return {};

	return staffShifts as Shifts;
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
