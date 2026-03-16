export interface Period {
	id: string;
	start_date: string;
	end_date: string;
	label: string;
}

export interface StaffInfo {
	id: string;
	name: string;
	position: string | null;
	status: string | null;
	department: string | null;
	department_id: string | null;
}

export interface ShiftStats {
	off: number;
	early: number;
	normal: number;
	late: number;
	special: number;
	work: number;
	custom: number;
	total: number;
}

export type Shifts = Record<string, string>;
