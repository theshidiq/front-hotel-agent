/**
 * Schedule Selection Store - Svelte 5 runes-based selection management
 * Handles multi-cell selection, clipboard operations, and bulk editing
 */

import { getContext, setContext } from 'svelte';

// Types
export interface CellData {
	cellKey: string;
	staffId: string;
	dateKey: string;
	value: string;
}

export interface SelectionStats {
	selectedCount: number;
	hasClipboard: boolean;
	clipboardSize: number;
	isNavigating: boolean;
}

export interface SelectionState {
	selectedCells: Set<string>;
	focusedCell: string | null;
	isSelecting: boolean;
	selectionStart: string | null;
	clipboard: CellData[] | null;
	clipboardType: 'cells' | 'row' | 'column' | null;
	navigationMode: boolean;
}

const SELECTION_CONTEXT_KEY = 'schedule-selection';

/**
 * Create a new selection store instance
 */
export function createSelectionStore() {
	// Selection state using runes
	let selectedCells = $state<Set<string>>(new Set());
	let focusedCell = $state<string | null>(null);
	let isSelecting = $state(false);
	let selectionStart = $state<string | null>(null);
	let clipboard = $state<CellData[] | null>(null);
	let clipboardType = $state<'cells' | 'row' | 'column' | null>(null);
	let navigationMode = $state(false);

	// External data references (will be set by the component)
	let staffMembers: { id: string; name: string; status?: string }[] = [];
	let dates: string[] = [];
	let scheduleData: Record<string, Record<string, string>> = {};
	let updateShiftFn: ((staffId: string, dateKey: string, value: string) => void) | null = null;
	let updateScheduleFn: ((schedule: Record<string, Record<string, string>>) => void) | null = null;

	/**
	 * Initialize the store with external data
	 */
	function init(
		staff: typeof staffMembers,
		dateRange: string[],
		schedule: typeof scheduleData,
		updateShift: typeof updateShiftFn,
		updateSchedule?: typeof updateScheduleFn
	) {
		staffMembers = staff;
		dates = dateRange;
		scheduleData = schedule;
		updateShiftFn = updateShift;
		updateScheduleFn = updateSchedule || null;
	}

	/**
	 * Generate cell key from staff ID and date
	 */
	function getCellKey(staffId: string, dateKey: string): string {
		return `${staffId}-${dateKey}`;
	}

	/**
	 * Parse cell key to get staff ID and date
	 */
	function parseCellKey(cellKey: string): { staffId: string; dateKey: string } {
		const dateKey = cellKey.slice(-10); // Extract last 10 characters (YYYY-MM-DD)
		const staffId = cellKey.slice(0, -11); // Everything except last 11 characters (-YYYY-MM-DD)
		return { staffId, dateKey };
	}

	/**
	 * Check if a cell is selected
	 */
	function isCellSelected(staffId: string, dateKey: string): boolean {
		return selectedCells.has(getCellKey(staffId, dateKey));
	}

	/**
	 * Check if a cell is focused
	 */
	function isCellFocused(staffId: string, dateKey: string): boolean {
		return focusedCell === getCellKey(staffId, dateKey);
	}

	/**
	 * Get range selection between two cells
	 */
	function getRangeSelection(startKey: string, endKey: string): string[] {
		if (!staffMembers || staffMembers.length === 0 || !dates || dates.length === 0) {
			return [];
		}

		const start = parseCellKey(startKey);
		const end = parseCellKey(endKey);

		const startStaffIndex = staffMembers.findIndex((s) => s?.id === start.staffId);
		const endStaffIndex = staffMembers.findIndex((s) => s?.id === end.staffId);
		const startDateIndex = dates.findIndex((d) => d === start.dateKey);
		const endDateIndex = dates.findIndex((d) => d === end.dateKey);

		if (
			startStaffIndex === -1 ||
			endStaffIndex === -1 ||
			startDateIndex === -1 ||
			endDateIndex === -1
		) {
			return [];
		}

		const minStaffIndex = Math.min(startStaffIndex, endStaffIndex);
		const maxStaffIndex = Math.max(startStaffIndex, endStaffIndex);
		const minDateIndex = Math.min(startDateIndex, endDateIndex);
		const maxDateIndex = Math.max(startDateIndex, endDateIndex);

		const range: string[] = [];
		for (let si = minStaffIndex; si <= maxStaffIndex; si++) {
			for (let di = minDateIndex; di <= maxDateIndex; di++) {
				if (staffMembers[si]?.id && dates[di]) {
					range.push(getCellKey(staffMembers[si].id, dates[di]));
				}
			}
		}

		return range;
	}

	/**
	 * Start cell selection
	 */
	function startSelection(
		staffId: string,
		dateKey: string,
		isShiftKey = false,
		isCtrlKey = false
	) {
		const cellKey = getCellKey(staffId, dateKey);

		if (isShiftKey && selectionStart) {
			// Extend selection from start to current cell
			const rangeSelection = getRangeSelection(selectionStart, cellKey);
			selectedCells = new Set([...selectedCells, ...rangeSelection]);
		} else if (isCtrlKey) {
			// Toggle individual cell selection
			const newSelection = new Set(selectedCells);
			if (newSelection.has(cellKey)) {
				newSelection.delete(cellKey);
			} else {
				newSelection.add(cellKey);
				selectionStart = cellKey;
			}
			selectedCells = newSelection;
		} else {
			// Start new selection
			selectionStart = cellKey;
			selectedCells = new Set([cellKey]);
		}

		focusedCell = cellKey;
	}

	/**
	 * Start drag selection mode
	 */
	function startDragSelection(staffId: string, dateKey: string) {
		const cellKey = getCellKey(staffId, dateKey);
		selectionStart = cellKey;
		selectedCells = new Set([cellKey]);
		isSelecting = true;
		focusedCell = cellKey;
	}

	/**
	 * Extend selection during drag
	 */
	function extendSelection(staffId: string, dateKey: string) {
		if (!isSelecting || !selectionStart) return;

		const cellKey = getCellKey(staffId, dateKey);
		const newSelection = getRangeSelection(selectionStart, cellKey);
		selectedCells = new Set(newSelection);
		focusedCell = cellKey;
	}

	/**
	 * End selection
	 */
	function endSelection() {
		isSelecting = false;
	}

	/**
	 * Clear selection
	 */
	function clearSelection() {
		selectedCells = new Set();
		selectionStart = null;
		isSelecting = false;
		focusedCell = null;
	}

	/**
	 * Select entire row (all dates for a staff member)
	 */
	function selectRow(staffId: string) {
		const rowCells = dates.map((dateKey) => getCellKey(staffId, dateKey));
		selectedCells = new Set(rowCells);
		selectionStart = rowCells[0] || null;
		focusedCell = rowCells[0] || null;
		isSelecting = false;
	}

	/**
	 * Select entire column (all staff for a specific date)
	 */
	function selectColumn(dateKey: string) {
		if (!staffMembers || staffMembers.length === 0) return;

		const columnCells = staffMembers
			.filter((staff) => staff?.id)
			.map((staff) => getCellKey(staff.id, dateKey));

		if (columnCells.length === 0) return;

		selectedCells = new Set(columnCells);
		selectionStart = columnCells[0];
		focusedCell = columnCells[0];
		isSelecting = false;
	}

	/**
	 * Apply shift value to selected cells
	 */
	function applyToSelected(shiftValue: string) {
		if (selectedCells.size === 0) return;

		if (updateScheduleFn) {
			// Batch update
			const newSchedule = { ...scheduleData };
			selectedCells.forEach((cellKey) => {
				const { staffId, dateKey } = parseCellKey(cellKey);
				if (!newSchedule[staffId]) {
					newSchedule[staffId] = {};
				}
				newSchedule[staffId] = { ...newSchedule[staffId], [dateKey]: shiftValue };
			});
			updateScheduleFn(newSchedule);
		} else if (updateShiftFn) {
			// Individual updates
			const fn = updateShiftFn;
			selectedCells.forEach((cellKey) => {
				const { staffId, dateKey } = parseCellKey(cellKey);
				fn(staffId, dateKey, shiftValue);
			});
		}
	}

	/**
	 * Clear selected cells
	 */
	function clearSelected() {
		applyToSelected('');
	}

	/**
	 * Copy selected cells to clipboard
	 */
	function copySelected(): number {
		if (selectedCells.size === 0) return 0;

		const cellData: CellData[] = Array.from(selectedCells).map((cellKey) => {
			const { staffId, dateKey } = parseCellKey(cellKey);
			const value = scheduleData[staffId]?.[dateKey] || '';
			return { cellKey, staffId, dateKey, value };
		});

		clipboard = cellData;
		clipboardType = 'cells';

		return cellData.length;
	}

	/**
	 * Paste clipboard data to selected cells
	 */
	function pasteToSelected(): number {
		if (!clipboard || clipboard.length === 0 || selectedCells.size === 0) return 0;

		// Simple paste - apply first clipboard value to all selected cells
		const firstValue = clipboard[0].value;
		applyToSelected(firstValue);

		return selectedCells.size;
	}

	/**
	 * Navigate with keyboard
	 */
	function navigateCell(direction: 'up' | 'down' | 'left' | 'right') {
		if (!focusedCell) {
			if (staffMembers.length > 0 && dates.length > 0) {
				const firstCell = getCellKey(staffMembers[0].id, dates[0]);
				focusedCell = firstCell;
				selectedCells = new Set([firstCell]);
			}
			return;
		}

		if (!staffMembers?.length || !dates?.length) return;

		const { staffId, dateKey } = parseCellKey(focusedCell);
		const staffIndex = staffMembers.findIndex((s) => s?.id === staffId);
		const dateIndex = dates.findIndex((d) => d === dateKey);

		if (staffIndex === -1 || dateIndex === -1) {
			const firstCell = getCellKey(staffMembers[0].id, dates[0]);
			focusedCell = firstCell;
			selectedCells = new Set([firstCell]);
			return;
		}

		let newStaffIndex = staffIndex;
		let newDateIndex = dateIndex;

		// Note: In transposed layout (dates as rows), up/down moves through dates, left/right moves through staff
		switch (direction) {
			case 'up':
				newDateIndex = Math.max(0, dateIndex - 1);
				break;
			case 'down':
				newDateIndex = Math.min(dates.length - 1, dateIndex + 1);
				break;
			case 'left':
				newStaffIndex = Math.max(0, staffIndex - 1);
				break;
			case 'right':
				newStaffIndex = Math.min(staffMembers.length - 1, staffIndex + 1);
				break;
		}

		if (
			newStaffIndex < 0 ||
			newStaffIndex >= staffMembers.length ||
			newDateIndex < 0 ||
			newDateIndex >= dates.length ||
			!staffMembers[newStaffIndex]?.id
		) {
			return;
		}

		const newCellKey = getCellKey(staffMembers[newStaffIndex].id, dates[newDateIndex]);
		focusedCell = newCellKey;
		selectedCells = new Set([newCellKey]);
		navigationMode = true;
	}

	/**
	 * Handle keyboard shortcuts
	 */
	function handleKeyboardShortcut(key: string, ctrlKey = false, shiftKey = false): number {
		if (ctrlKey) {
			switch (key.toLowerCase()) {
				case 'c':
					return copySelected();
				case 'v':
					return pasteToSelected();
				case 'a':
					if (!staffMembers?.length || !dates?.length) return 0;
					const allCells = staffMembers
						.filter((staff) => staff?.id)
						.flatMap((staff) => dates.map((date) => getCellKey(staff.id, date)));
					selectedCells = new Set(allCells);
					return allCells.length;
				default:
					return 0;
			}
		}

		// Quick shift entry
		switch (key) {
			case '1':
				applyToSelected('△');
				return selectedCells.size;
			case '2':
				applyToSelected('○');
				return selectedCells.size;
			case '3':
				applyToSelected('◇');
				return selectedCells.size;
			case '4':
			case 'x':
			case 'X':
				applyToSelected('×');
				return selectedCells.size;
			case 's':
			case 'S':
				applyToSelected('★');
				return selectedCells.size;
			case ' ':
			case 'Delete':
			case 'Backspace':
				clearSelected();
				return selectedCells.size;
			case 'ArrowUp':
				navigateCell('up');
				return 0;
			case 'ArrowDown':
				navigateCell('down');
				return 0;
			case 'ArrowLeft':
				navigateCell('left');
				return 0;
			case 'ArrowRight':
				navigateCell('right');
				return 0;
			case 'Escape':
				clearSelection();
				return 0;
			default:
				return 0;
		}
	}

	/**
	 * Get selection statistics
	 */
	function getSelectionStats(): SelectionStats {
		return {
			selectedCount: selectedCells.size,
			hasClipboard: clipboard !== null && clipboard.length > 0,
			clipboardSize: clipboard?.length || 0,
			isNavigating: navigationMode
		};
	}

	return {
		// State (getters)
		get selectedCells() {
			return selectedCells;
		},
		get focusedCell() {
			return focusedCell;
		},
		get isSelecting() {
			return isSelecting;
		},
		get selectionStart() {
			return selectionStart;
		},
		get clipboard() {
			return clipboard;
		},

		// Methods
		init,
		getCellKey,
		parseCellKey,
		isCellSelected,
		isCellFocused,
		startSelection,
		startDragSelection,
		extendSelection,
		endSelection,
		clearSelection,
		selectRow,
		selectColumn,
		applyToSelected,
		clearSelected,
		copySelected,
		pasteToSelected,
		navigateCell,
		handleKeyboardShortcut,
		getSelectionStats
	};
}

export type SelectionStore = ReturnType<typeof createSelectionStore>;

/**
 * Set selection context
 */
export function setSelectionContext(store: SelectionStore) {
	setContext(SELECTION_CONTEXT_KEY, store);
}

/**
 * Get selection context
 */
export function getSelectionContext(): SelectionStore {
	return getContext(SELECTION_CONTEXT_KEY);
}
