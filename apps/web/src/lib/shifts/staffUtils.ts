/**
 * Staff Utilities - Filtering, ordering, and active period checking
 * Ported from React shift-schedule-manager-ortools/src/utils/staffUtils.js
 */

import type { ScheduleStaff } from './types';

/**
 * Staff status types in order of priority
 */
export const STAFF_STATUS_ORDER = ['社員', '派遣', 'パート'] as const;
export type StaffStatus = (typeof STAFF_STATUS_ORDER)[number];

/**
 * Check if a staff member is active in the current period
 * @param staff - The staff member to check
 * @param dateRange - Array of date strings (YYYY-MM-DD format)
 * @returns true if staff should be included in the current period
 */
export function isStaffActiveInCurrentPeriod(
	staff: ScheduleStaff,
	dateRange: string[] = []
): boolean {
	// If no staff data or no date range, include the staff member
	if (!staff || !dateRange.length) return true;

	// If staff has no start period defined, include them (legacy data)
	if (!staff.start_period) return true;

	try {
		const periodStart = new Date(dateRange[0]);
		const periodEnd = new Date(dateRange[dateRange.length - 1]);

		// Create start date from staff start_period
		const staffStartDate = new Date(
			staff.start_period.year,
			staff.start_period.month - 1, // month is 0-indexed
			staff.start_period.day || 1
		);

		// Check if staff starts after period ends
		if (staffStartDate > periodEnd) {
			return false;
		}

		// Check if staff has ended before period starts
		if (staff.end_period) {
			const staffEndDate = new Date(
				staff.end_period.year,
				staff.end_period.month - 1, // month is 0-indexed
				staff.end_period.day || 31
			);

			// If staff ended before period starts
			if (staffEndDate < periodStart) {
				return false;
			}
		}

		return true;
	} catch (error) {
		console.warn('Error checking staff activity:', error, staff);
		return true; // Default to showing staff if there's an error
	}
}

/**
 * Helper function to sort staff by start date (earliest first, no start date goes to end)
 * @param staffArray - Array of staff members to sort
 * @returns Sorted array of staff members
 */
function sortByStartDate(staffArray: ScheduleStaff[]): ScheduleStaff[] {
	return [...staffArray].sort((a, b) => {
		// If neither has start period, maintain original order
		if (!a.start_period && !b.start_period) return 0;

		// Staff without start period goes to end
		if (!a.start_period) return 1;
		if (!b.start_period) return -1;

		// Compare by year, then month, then day
		const aYear = a.start_period.year || 2018;
		const bYear = b.start_period.year || 2018;

		if (aYear !== bYear) {
			return aYear - bYear;
		}

		const aMonth = a.start_period.month || 1;
		const bMonth = b.start_period.month || 1;

		if (aMonth !== bMonth) {
			return aMonth - bMonth;
		}

		const aDay = a.start_period.day || 1;
		const bDay = b.start_period.day || 1;

		return aDay - bDay;
	});
}

/**
 * Get ordered staff members with special ordering
 * Order: 社員 > 派遣 > パート (each sorted by start date), then 中田 at the very end
 *
 * @param staffMembers - Array of all staff members
 * @param dateRange - Array of date strings for the current period
 * @returns Ordered array of active staff members
 */
export function getOrderedStaffMembers(
	staffMembers: ScheduleStaff[],
	dateRange: string[] = []
): ScheduleStaff[] {
	try {
		// Defensive check
		if (!staffMembers || !Array.isArray(staffMembers) || staffMembers.length === 0) {
			return []; // Return empty array if no staff members
		}

		// First filter out staff who are not active in the current period
		const activeStaff = staffMembers.filter((staff) => {
			try {
				return staff && isStaffActiveInCurrentPeriod(staff, dateRange);
			} catch (error) {
				// If there's an error checking activity, include the staff member
				console.warn('Error checking staff activity:', error, staff);
				return true;
			}
		});

		// Helper function to get staff status (handles both status and staff_status fields)
		const getStatus = (staff: ScheduleStaff): string => {
			return staff.status || staff.staff_status || '派遣';
		};

		// If no active staff found but we have staff members, return all staff (fallback)
		if (activeStaff.length === 0 && staffMembers.length > 0) {
			const nakataStaff = staffMembers.find((staff) => staff && staff.name === '中田');
			const shainnStaff = sortByStartDate(
				staffMembers.filter(
					(staff) => staff && getStatus(staff) === '社員' && staff.name !== '中田'
				)
			);
			const hakennStaff = sortByStartDate(
				staffMembers.filter(
					(staff) => staff && getStatus(staff) === '派遣' && staff.name !== '中田'
				)
			);
			const partTimeStaff = sortByStartDate(
				staffMembers.filter(
					(staff) => staff && getStatus(staff) === 'パート' && staff.name !== '中田'
				)
			);
			return [...shainnStaff, ...hakennStaff, ...partTimeStaff, ...(nakataStaff ? [nakataStaff] : [])];
		}

		// Separate staff by status: 社員, 派遣, パート, and 中田
		const nakataStaff = activeStaff.find((staff) => staff && staff.name === '中田');
		const shainnStaff = sortByStartDate(
			activeStaff.filter((staff) => staff && getStatus(staff) === '社員' && staff.name !== '中田')
		);
		const hakennStaff = sortByStartDate(
			activeStaff.filter((staff) => staff && getStatus(staff) === '派遣' && staff.name !== '中田')
		);
		const partTimeStaff = sortByStartDate(
			activeStaff.filter((staff) => staff && getStatus(staff) === 'パート' && staff.name !== '中田')
		);

		// Order: 社員 first, then 派遣, then パート (each sorted by start date), then 中田 at the very end
		const finalOrder = [
			...shainnStaff,
			...hakennStaff,
			...partTimeStaff,
			...(nakataStaff ? [nakataStaff] : [])
		];

		return finalOrder;
	} catch (error) {
		console.error('Error in getOrderedStaffMembers:', error);
		return staffMembers || []; // Return original staff members or empty array
	}
}

/**
 * Filter staff by status
 * @param staffMembers - Array of staff members
 * @param status - Status to filter by (社員, 派遣, パート)
 * @returns Filtered array of staff members
 */
export function filterStaffByStatus(
	staffMembers: ScheduleStaff[],
	status: StaffStatus
): ScheduleStaff[] {
	return staffMembers.filter((staff) => {
		const staffStatus = staff.status || staff.staff_status;
		return staffStatus === status;
	});
}

/**
 * Get active staff count by status
 * @param staffMembers - Array of staff members
 * @param dateRange - Array of date strings for the current period
 * @returns Object with counts for each status type
 */
export function getActiveStaffCountByStatus(
	staffMembers: ScheduleStaff[],
	dateRange: string[] = []
): Record<StaffStatus, number> {
	const activeStaff = staffMembers.filter((staff) =>
		isStaffActiveInCurrentPeriod(staff, dateRange)
	);

	return {
		社員: activeStaff.filter((s) => (s.status || s.staff_status) === '社員').length,
		派遣: activeStaff.filter((s) => (s.status || s.staff_status) === '派遣').length,
		パート: activeStaff.filter((s) => (s.status || s.staff_status) === 'パート').length
	};
}

/**
 * Check if a specific date is within a staff member's work period
 * @param staff - The staff member
 * @param date - The date string (YYYY-MM-DD format)
 * @returns true if the date is within the staff's work period
 */
export function isDateWithinStaffWorkPeriod(staff: ScheduleStaff, date: string): boolean {
	if (!staff) return false;

	const currentDate = new Date(date);
	currentDate.setHours(0, 0, 0, 0);

	// Check start period
	if (staff.start_period?.year && staff.start_period?.month) {
		const startDate = new Date(
			staff.start_period.year,
			staff.start_period.month - 1,
			staff.start_period.day || 1
		);
		startDate.setHours(0, 0, 0, 0);

		if (currentDate < startDate) {
			return false;
		}
	}

	// Check end period
	if (staff.end_period?.year && staff.end_period?.month) {
		const endDate = new Date(
			staff.end_period.year,
			staff.end_period.month - 1,
			staff.end_period.day || 1
		);
		endDate.setHours(0, 0, 0, 0);

		if (currentDate > endDate) {
			return false;
		}
	}

	return true;
}

/**
 * Get staff period label for a specific date (START or END)
 * @param staff - The staff member
 * @param date - The date string (YYYY-MM-DD format)
 * @returns 'START', 'END', or null
 */
export function getStaffPeriodLabel(
	staff: ScheduleStaff,
	date: string
): 'START' | 'END' | null {
	if (!staff || (!staff.start_period && !staff.end_period)) {
		return null;
	}

	const currentDate = new Date(date);
	currentDate.setHours(0, 0, 0, 0);

	// Check if it's start date
	if (staff.start_period?.year && staff.start_period?.month) {
		const startDate = new Date(
			staff.start_period.year,
			staff.start_period.month - 1,
			staff.start_period.day || 1
		);
		startDate.setHours(0, 0, 0, 0);

		if (currentDate.getTime() === startDate.getTime()) {
			return 'START';
		}
	}

	// Check if it's end date
	if (staff.end_period?.year && staff.end_period?.month) {
		const endDate = new Date(
			staff.end_period.year,
			staff.end_period.month - 1,
			staff.end_period.day || 1
		);
		endDate.setHours(0, 0, 0, 0);

		if (currentDate.getTime() === endDate.getTime()) {
			return 'END';
		}
	}

	return null;
}
