<script lang="ts">
	import type { ScheduleStaff, ShiftSymbol } from '$lib/shifts/types';
	import { SHIFT_SYMBOLS, SHIFT_LABELS } from '$lib/shifts/types';
	import { createSelectionStore, setSelectionContext } from '../stores/scheduleSelection.svelte';
	import { getOrderedStaffMembers, isDateWithinStaffWorkPeriod, getStaffPeriodLabel } from '../staffUtils';
	import { Copy, Clipboard, X, Check, Trash2, Edit } from 'lucide-svelte';

	interface Props {
		staff: ScheduleStaff[];
		dateRange: string[];
		scheduleData: Record<string, Record<string, string>>;
		onCellUpdate: (staffId: string, date: string, symbol: string) => void;
		onBulkUpdate?: (updates: Array<{ staffId: string; date: string; symbol: string }>) => void;
		onStaffEdit?: (staff: ScheduleStaff) => void;
		onStaffDelete?: (staff: ScheduleStaff) => void;
		// Connection and offline queue state
		pendingCells?: Set<string>;
		hasPendingChanges?: boolean;
		isConnected?: boolean;
		offlineQueueSize?: number;
	}

	let {
		staff,
		dateRange,
		scheduleData,
		onCellUpdate,
		onBulkUpdate,
		onStaffEdit,
		onStaffDelete,
		pendingCells = new Set(),
		hasPendingChanges = false,
		isConnected = true,
		offlineQueueSize = 0
	}: Props = $props();

	// Derived: Ordered staff members (社員 > 派遣 > パート, sorted by start date, 中田 at end)
	// This applies the same ordering logic as React's staffUtils.js
	let orderedStaff = $derived(getOrderedStaffMembers(staff, dateRange));

	// Create and provide selection store
	const selection = createSelectionStore();
	setSelectionContext(selection);

	// Initialize selection store when props change (use ordered staff for navigation)
	$effect(() => {
		selection.init(
			orderedStaff,
			dateRange,
			scheduleData,
			onCellUpdate,
			onBulkUpdate
				? (schedule) => {
						const updates: Array<{ staffId: string; date: string; symbol: string }> = [];
						for (const [staffId, dates] of Object.entries(schedule)) {
							for (const [date, symbol] of Object.entries(dates)) {
								updates.push({ staffId, date, symbol });
							}
						}
						onBulkUpdate(updates);
					}
				: undefined
		);
	});

	// Local state
	let showDropdown = $state<string | null>(null);
	let customInputText = $state('');
	let contextMenu = $state<{ x: number; y: number; cellKey: string } | null>(null);
	let isDragging = $state(false);
	let dragStartCell = $state<{ staffId: string; dateKey: string } | null>(null);
	let tableRef = $state<HTMLDivElement | null>(null);

	// Computed: Show bulk toolbar when multiple cells selected
	let showBulkToolbar = $derived(selection.selectedCells.size > 1);

	// Shift symbols - matches React shiftConstants.js
	const shiftSymbols = {
		early: { symbol: '△', label: '早番', color: 'text-blue-600' },
		normal: { symbol: '', label: '出勤（空白）', color: 'text-gray-600' },
		late: { symbol: '◇', label: '遅番', color: 'text-purple-600' },
		special: { symbol: '●', label: '特別', color: 'text-green-600' },
		medamayaki: { symbol: '◎', label: '目玉焼き', color: 'text-orange-600' },
		zensai: { symbol: '▣', label: '前菜', color: 'text-teal-600' },
		off: { symbol: '×', label: '休み', color: 'text-red-600' },
		holiday: { symbol: '★', label: '指定休', color: 'text-yellow-600' },
		unavailable: { symbol: '⊘', label: '不可', color: 'text-red-800' }
	};

	// Get available shifts based on staff status
	function getAvailableShifts(status?: string): string[] {
		if (!status) status = '派遣';

		if (status === '社員') {
			// 社員 staff get late shift + special options
			return ['normal', 'off', 'early', 'late', 'medamayaki', 'zensai', 'holiday'];
		} else if (status === 'パート') {
			// パート staff get limited options
			return ['unavailable', 'normal', 'off'];
		} else {
			// 派遣 staff get standard options
			return ['normal', 'off', 'early', 'holiday'];
		}
	}

	// Convert shift keys to dropdown options
	function getShiftOptions(status?: string) {
		const keys = getAvailableShifts(status);
		return keys.map(key => ({
			key,
			...shiftSymbols[key as keyof typeof shiftSymbols]
		}));
	}

	// Format date for display
	function formatDate(dateStr: string): { day: number; weekday: string; isWeekend: boolean } {
		const date = new Date(dateStr);
		const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
		const dayOfWeek = date.getDay();
		return {
			day: date.getDate(),
			weekday: weekdays[dayOfWeek],
			isWeekend: dayOfWeek === 0 || dayOfWeek === 6
		};
	}

	// Get cell value
	function getCellValue(staffId: string, date: string): string {
		return scheduleData[staffId]?.[date] || '';
	}

	// Get symbol color class - matches React getSymbolColor
	function getSymbolColor(value: string, staffStatus?: string): string {
		// For パート staff, if value is empty, default to unavailable color
		if (staffStatus === 'パート' && (!value || value === '')) {
			return shiftSymbols.unavailable.color;
		}

		if (!value) return 'text-gray-400'; // Empty/blank cells

		// Handle 'late' specially
		if (value === 'late') {
			return shiftSymbols.late.color;
		}

		// Find the shift type by symbol
		const shiftEntry = Object.entries(shiftSymbols).find(
			([_, shift]) => shift.symbol === value
		);

		if (shiftEntry) {
			return shiftEntry[1].color;
		}

		// For custom text (not a predefined symbol)
		return 'text-gray-700';
	}

	// Get display value for cell - matches React getCellDisplayValue
	function getCellDisplayValue(value: string, staffStatus?: string): string {
		// For パート staff, if value is empty, default to unavailable symbol
		if (staffStatus === 'パート' && (!value || value === '')) {
			return shiftSymbols.unavailable.symbol;
		}

		// For late shift, don't display symbol (show as background color only)
		if (value === 'late') {
			return '';
		}

		return value;
	}

	// Handle cell click
	function handleCellClick(staffId: string, dateKey: string, event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();

		const cellKey = selection.getCellKey(staffId, dateKey);

		// Handle selection with modifier keys
		if (event.shiftKey) {
			selection.startSelection(staffId, dateKey, true, false);
			showDropdown = null;
			return;
		}

		if (event.ctrlKey || event.metaKey) {
			selection.startSelection(staffId, dateKey, false, true);
			showDropdown = null;
			return;
		}

		// Regular click - select and show dropdown
		selection.startSelection(staffId, dateKey, false, false);

		// Show dropdown for single cell
		if (selection.selectedCells.size <= 1) {
			showDropdown = cellKey;
		}
	}

	// Handle cell double-click (enter custom text mode)
	function handleCellDoubleClick(staffId: string, dateKey: string, event: MouseEvent) {
		event.preventDefault();
		const cellKey = selection.getCellKey(staffId, dateKey);
		const currentValue = getCellValue(staffId, dateKey);
		customInputText = currentValue;
		showDropdown = cellKey;
	}

	// Handle mouse down for drag selection
	function handleCellMouseDown(staffId: string, dateKey: string, event: MouseEvent) {
		if (event.button !== 0) return; // Left button only
		if (event.shiftKey || event.ctrlKey || event.metaKey) return;

		event.preventDefault();
		dragStartCell = { staffId, dateKey };
		isDragging = false;
	}

	// Handle mouse move for drag selection
	function handleCellMouseMove(staffId: string, dateKey: string, event: MouseEvent) {
		if (dragStartCell && !isDragging) {
			// Started moving - begin drag selection
			isDragging = true;
			selection.startDragSelection(dragStartCell.staffId, dragStartCell.dateKey);
			showDropdown = null;
		}
	}

	// Handle mouse enter during drag
	function handleCellMouseEnter(staffId: string, dateKey: string) {
		if (selection.isSelecting && isDragging) {
			selection.extendSelection(staffId, dateKey);
		}
	}

	// Handle mouse up
	function handleMouseUp() {
		if (isDragging || dragStartCell) {
			isDragging = false;
			dragStartCell = null;
			selection.endSelection();
		}
	}

	// Handle right-click context menu
	function handleContextMenu(staffId: string, dateKey: string, event: MouseEvent) {
		event.preventDefault();

		if (!selection.isCellSelected(staffId, dateKey)) {
			selection.startSelection(staffId, dateKey, false, false);
		}

		contextMenu = {
			x: event.clientX,
			y: event.clientY,
			cellKey: selection.getCellKey(staffId, dateKey)
		};
	}

	// Handle shift selection from dropdown - matches React handleShiftSelect logic
	function handleShiftSelect(staffId: string, dateKey: string, shiftKeyOrSymbol: string) {
		const staffMember = orderedStaff.find(s => s.id === staffId);
		let shiftValue: string;

		// Handle different shift types
		if (shiftKeyOrSymbol === '') {
			// Normal/blank shift
			if (staffMember?.status === 'パート') {
				// For パート staff, normal shift shows circle symbol
				shiftValue = '○';
			} else {
				// Normal shift shows as blank for other staff
				shiftValue = '';
			}
		} else if (shiftKeyOrSymbol === 'late') {
			// Late shift stores as 'late' key, not symbol
			shiftValue = 'late';
		} else {
			// Other shifts show their symbols directly
			shiftValue = shiftKeyOrSymbol;
		}

		onCellUpdate(staffId, dateKey, shiftValue);
		showDropdown = null;
		customInputText = '';
	}

	// Handle custom text save
	function handleCustomTextSave(staffId: string, dateKey: string) {
		const finalText = customInputText.trim();
		onCellUpdate(staffId, dateKey, finalText);
		showDropdown = null;
		customInputText = '';
	}

	// Handle custom text cancel
	function handleCustomTextCancel() {
		customInputText = '';
		showDropdown = null;
	}

	// Quick action handler for bulk operations
	function handleQuickAction(action: string) {
		switch (action) {
			case 'copy':
				selection.copySelected();
				break;
			case 'paste':
				selection.pasteToSelected();
				break;
			case 'clear':
				selection.clearSelected();
				break;
			case 'early':
				selection.applyToSelected('△');
				break;
			case 'normal':
				selection.applyToSelected('○');
				break;
			case 'off':
				selection.applyToSelected('×');
				break;
			case 'star':
				selection.applyToSelected('★');
				break;
		}
		contextMenu = null;
	}

	// Handle keyboard events
	function handleKeydown(event: KeyboardEvent) {
		// Don't handle when dropdown is open or context menu is open
		if (showDropdown || contextMenu) return;

		// Don't handle when typing in an input
		const target = event.target as HTMLElement;
		if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

		// Navigation and shortcuts
		const result = selection.handleKeyboardShortcut(
			event.key,
			event.ctrlKey || event.metaKey,
			event.shiftKey
		);

		// Prevent default for handled keys
		const handledKeys = [
			'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
			' ', 'Delete', 'Backspace', 'Escape', 'Enter',
			'1', '2', '3', '4', 's', 'S', 'x', 'X'
		];

		if (result > 0 || handledKeys.includes(event.key)) {
			event.preventDefault();
		}

		// Ctrl shortcuts
		if ((event.ctrlKey || event.metaKey) && ['c', 'v', 'a'].includes(event.key.toLowerCase())) {
			event.preventDefault();
		}

		// Scroll focused cell into view on navigation
		if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
			scrollFocusedCellIntoView();
		}

		// Enter key opens dropdown for focused cell
		if (event.key === 'Enter' && selection.focusedCell) {
			event.preventDefault();
			showDropdown = selection.focusedCell;
		}
	}

	// Scroll focused cell into view
	function scrollFocusedCellIntoView() {
		if (!selection.focusedCell || !tableRef) return;

		// Small delay to allow state to update
		requestAnimationFrame(() => {
			const focusedElement = tableRef?.querySelector(`[data-cell-key="${selection.focusedCell}"]`);
			if (focusedElement) {
				focusedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
			}
		});
	}

	// Close dropdown on outside click
	function handleOutsideClick(event: MouseEvent) {
		const target = event.target as HTMLElement;

		// Check if click is outside table
		if (tableRef && !tableRef.contains(target)) {
			// Check if not clicking on bulk toolbar or context menu
			const bulkToolbar = document.querySelector('.bulk-toolbar');
			const ctxMenu = document.querySelector('.context-menu');

			if (
				(!bulkToolbar || !bulkToolbar.contains(target)) &&
				(!ctxMenu || !ctxMenu.contains(target))
			) {
				selection.clearSelection();
				contextMenu = null;
				showDropdown = null;
			}
		}
	}

	// Check if a cell has pending changes
	function isCellPending(staffId: string, dateKey: string): boolean {
		const cellKey = `${staffId}_${dateKey}`;
		return pendingCells.has(cellKey);
	}

	// Calculate day-off count for a staff member
	function getDayOffCount(staffId: string): number {
		const staffSchedule = scheduleData[staffId] || {};
		const staffMember = orderedStaff.find((s) => s.id === staffId);
		let count = 0;

		for (const date of dateRange) {
			const value = staffSchedule[date] || '';

			if (staffMember?.status === 'パート') {
				if (value === '' || value === '⊘' || value === '×') {
					count += 1;
				}
			} else {
				if (value === '×') count += 1;
				else if (value === '△') count += 0.5;
				else if (value === '★') count += 1;
			}
		}

		return count;
	}

	// Get dropdown position
	function getDropdownPosition(
		staffIndex: number,
		dateIndex: number
	): { top?: string; bottom?: string; left?: string; right?: string } {
		const isNearBottom = dateIndex > dateRange.length - 5;
		const isNearRight = staffIndex > orderedStaff.length - 3;

		return {
			...(isNearBottom ? { bottom: '100%' } : { top: '100%' }),
			...(isNearRight ? { right: '0' } : { left: '0' })
		};
	}

	// Note: getStaffPeriodLabel and isDateWithinStaffWorkPeriod are now imported from staffUtils

	// Click on staff name header to select entire column
	function handleStaffHeaderClick(staffId: string, event: MouseEvent) {
		event.stopPropagation();
		selection.selectRow(staffId);
	}

	// Click on date header to select entire row
	function handleDateHeaderClick(dateKey: string, event: MouseEvent) {
		event.stopPropagation();
		selection.selectColumn(dateKey);
	}
</script>

<svelte:window
	onkeydown={handleKeydown}
	onmouseup={handleMouseUp}
	onmousedown={handleOutsideClick}
/>

<div class="relative">
	<!-- Connection and Queue Status Indicator -->
	{#if !isConnected || hasPendingChanges}
		<div class="mb-2 flex items-center gap-2 px-3 py-2 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-md">
			{#if !isConnected}
				<div class="flex items-center gap-2">
					<div class="w-2 h-2 bg-red-500 rounded-full"></div>
					<span class="text-sm font-medium text-red-700">オフライン</span>
				</div>
			{/if}
			{#if hasPendingChanges}
				<div class="flex items-center gap-2">
					<div class="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
					<span class="text-sm font-medium text-orange-700">
						保存待ち: {offlineQueueSize}件
					</span>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Bulk Operations Toolbar -->
	{#if showBulkToolbar}
		<div
			class="bulk-toolbar fixed bottom-0 left-1/2 transform -translate-x-1/2 bg-white border border-gray-300 rounded-t-lg shadow-2xl p-4 z-50 flex items-center gap-3"
			style="min-width: 400px; box-shadow: 0 -10px 25px -5px rgba(0, 0, 0, 0.1);"
		>
			<span class="text-sm text-gray-600 mr-2">
				{selection.selectedCells.size} cells selected
			</span>
			<button
				type="button"
				onmousedown={(e) => {
					e.preventDefault();
					handleQuickAction('copy');
				}}
				class="p-2 hover:bg-gray-100 rounded focus:outline-none"
				title="Copy (Ctrl+C)"
			>
				<Copy class="w-4 h-4" />
			</button>
			<button
				type="button"
				onmousedown={(e) => {
					e.preventDefault();
					handleQuickAction('paste');
				}}
				class="p-2 hover:bg-gray-100 rounded focus:outline-none"
				title="Paste (Ctrl+V)"
				disabled={!selection.getSelectionStats().hasClipboard}
			>
				<Clipboard
					class="w-4 h-4 {selection.getSelectionStats().hasClipboard
						? 'text-blue-600'
						: 'text-gray-400'}"
				/>
			</button>
			<div class="w-px h-6 bg-gray-300 mx-1"></div>
			<button
				type="button"
				onmousedown={(e) => {
					e.preventDefault();
					handleQuickAction('off');
				}}
				class="px-2 py-1 hover:bg-gray-100 rounded font-bold text-red-600 text-2xl"
				title="Day Off (Press 4)"
			>
				×
			</button>
			<button
				type="button"
				onmousedown={(e) => {
					e.preventDefault();
					handleQuickAction('early');
				}}
				class="px-2 py-1 hover:bg-gray-100 rounded font-medium text-blue-600"
				title="Early Shift (Press 1)"
			>
				△
			</button>
			<button
				type="button"
				onmousedown={(e) => {
					e.preventDefault();
					handleQuickAction('star');
				}}
				class="px-2 py-1 hover:bg-gray-100 rounded font-bold text-yellow-600"
				title="Star (Press S)"
			>
				★
			</button>
			<div class="w-px h-6 bg-gray-300 mx-1"></div>
			<button
				type="button"
				onmousedown={(e) => {
					e.preventDefault();
					handleQuickAction('clear');
				}}
				class="px-2 py-1 text-sm hover:bg-red-100 rounded text-red-600"
				title="Clear (Delete)"
			>
				Clear
			</button>
			<button
				type="button"
				onmousedown={(e) => {
					e.preventDefault();
					selection.clearSelection();
				}}
				class="p-1 hover:bg-gray-100 rounded"
				title="Close"
			>
				<X class="w-4 h-4" />
			</button>
		</div>
	{/if}

	<!-- Table Container -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div bind:this={tableRef} class="table-container overflow-x-auto" tabindex="0" role="grid">
		<table
			class="w-full text-sm border-collapse"
			style="table-layout: fixed; min-width: {40 + orderedStaff.length * 40}px;"
		>
			<!-- Header Row: Staff Names -->
			<thead>
				<tr>
					<!-- Corner Cell - 日付 -->
					<th
						class="sticky left-0 z-20 bg-gray-700 text-white text-center font-bold p-0"
						style="min-width: 40px; width: 40px; max-width: 40px; height: 50px;"
					>
						<span class="text-xs font-bold">日付</span>
					</th>

					<!-- Staff Name Headers -->
					{#each orderedStaff as s, staffIndex}
						<th
							class="bg-gray-700 text-white text-center cursor-pointer font-bold hover:bg-gray-600 relative h-[50px] p-0"
							style="min-width: 40px; width: 40px; max-width: 40px; height: 50px;"
							onclick={(e) => handleStaffHeaderClick(s.id, e)}
							title="Click to select entire column for {s.name}"
						>
							<div class="flex flex-col items-center justify-center py-1 px-1 h-full">
								<span
									class="text-sm font-bold cursor-pointer px-1 py-0.5 rounded transition-colors duration-200"
									style="font-size: 14px; line-height: 16px; max-width: 80px; overflow: hidden; word-break: break-all; white-space: nowrap; text-overflow: ellipsis;"
									title={s.name}
								>
									{s.name}
								</span>
							</div>
						</th>
					{/each}
				</tr>
			</thead>

			<!-- Table Body: Date Rows -->
			<tbody>
				{#each dateRange as date, dateIndex}
					{@const dateInfo = formatDate(date)}
					<tr class="hover:bg-gray-50">
						<!-- Date Cell (Sticky Left Column) -->
						<td
							class="sticky left-0 z-10 bg-white text-center font-medium cursor-pointer hover:bg-gray-100"
							style="min-width: 40px; width: 40px; box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);"
							onclick={(e) => handleDateHeaderClick(date, e)}
							title="Click to select entire row"
						>
							<div class="py-1 px-1 flex items-center justify-center gap-0.5">
								<span
									class="text-xs font-bold {dateInfo.isWeekend
										? 'text-red-600'
										: 'text-gray-700'}"
								>
									{dateInfo.day}
								</span>
								<span
									class="text-xs opacity-75 {dateInfo.isWeekend ? 'text-red-600' : 'text-gray-700'}"
								>
									{dateInfo.weekday}
								</span>
							</div>
						</td>

						<!-- Staff Shift Cells -->
						{#each orderedStaff as s, staffIndex}
							{@const cellKey = selection.getCellKey(s.id, date)}
							{@const cellValue = getCellValue(s.id, date)}
							{@const isSelected = selection.isCellSelected(s.id, date)}
							{@const isFocused = selection.isCellFocused(s.id, date)}
							{@const isLateShift = cellValue === 'late'}
							{@const periodLabel = getStaffPeriodLabel(s, date)}
							{@const isActive = isDateWithinStaffWorkPeriod(s, date)}
							{@const isPending = isCellPending(s.id, date)}

							<td
								class="text-center relative {!isActive
									? 'bg-gray-100'
									: isLateShift
										? 'bg-purple-200 hover:bg-purple-300'
										: 'hover:bg-gray-100'}"
								style="min-width: 40px; width: 40px; max-width: 40px; height: 50px; padding: 0;"
							>
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<div
									class="w-full h-full flex items-center justify-center p-0 transition-all duration-200 relative
										{!isActive
										? 'cursor-not-allowed text-gray-400'
										: 'cursor-pointer hover:bg-gray-100'}
										{isActive && isSelected ? 'bg-blue-100 hover:bg-blue-200' : ''}
										{isFocused ? 'ring-2 ring-blue-500 ring-inset' : ''}
										{isPending ? 'ring-2 ring-orange-400 ring-inset bg-orange-50 hover:bg-orange-100' : ''}"
									role="gridcell"
									tabindex="-1"
									onclick={(e) => isActive && handleCellClick(s.id, date, e)}
									ondblclick={(e) => isActive && handleCellDoubleClick(s.id, date, e)}
									onmousedown={(e) => isActive && handleCellMouseDown(s.id, date, e)}
									onmousemove={(e) => isActive && handleCellMouseMove(s.id, date, e)}
									onmouseenter={() => isActive && handleCellMouseEnter(s.id, date)}
									oncontextmenu={(e) => isActive && handleContextMenu(s.id, date, e)}
									data-cell-key={cellKey}
									title="{s.name} - {date}{!isActive ? ' (Inactive)' : ''}{isSelected ? ' (Selected)' : ''}"
								>
									<!-- Period Label (START/END) -->
									{#if periodLabel}
										<div
											class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs font-bold px-2 py-1 rounded z-10 {periodLabel ===
											'START'
												? 'bg-green-500 text-white'
												: 'bg-red-500 text-white'}"
										>
											{periodLabel}
										</div>
									{:else}
									<!-- Show shift symbol only when no period label -->
									<span
										class="text-2xl font-bold select-none {!isActive ? 'text-gray-400' : getSymbolColor(
											cellValue,
											s.status
										)}"
										style={cellValue === '△'
											? 'font-weight: 500; font-size: 1.5rem;'
											: cellValue === '×'
												? 'font-size: 2rem; line-height: 2rem;'
												: ''}
									>
										{!isActive ? '-' : getCellDisplayValue(cellValue, s.status)}
									</span>
								{/if}

									<!-- Pending changes indicator -->
									{#if isPending}
										<div
											class="absolute bottom-0 left-0 w-2 h-2 bg-orange-500 rounded-full animate-pulse transform -translate-x-1 translate-y-1"
											title="保存待ち"
										></div>
									{/if}

									<!-- Selection indicator -->
									{#if isSelected}
										<div
											class="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full transform translate-x-1 -translate-y-1"
										></div>
									{/if}
								</div>

								<!-- Shift Dropdown -->
								{#if showDropdown === cellKey}
									{@const staffShiftOptions = getShiftOptions(s.status)}
									<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
									<!-- svelte-ignore a11y_click_events_have_key_events -->
									<div
										class="shift-dropdown absolute bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-[140px]"
										style={Object.entries(getDropdownPosition(staffIndex, dateIndex))
											.map(([k, v]) => `${k}: ${v}`)
											.join('; ')}
										onclick={(e) => e.stopPropagation()}
										role="listbox"
										tabindex="-1"
									>
										<div class="py-1">
											{#each staffShiftOptions as shift}
												<button
													type="button"
													onclick={() =>
														handleShiftSelect(s.id, date, shift.key === 'late' ? 'late' : shift.symbol)}
													class="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
												>
													<span class="font-bold {shift.color}" style="min-width: 20px;">
														{shift.symbol || '-'}
													</span>
													<span class="text-gray-700">{shift.label}</span>
												</button>
											{/each}

											<!-- Custom Text Input -->
											<div class="border-t border-gray-100 p-2">
												<input
													type="text"
													class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
													placeholder="カスタムテキスト..."
													bind:value={customInputText}
													onkeydown={(e) => {
														if (e.key === 'Enter') {
															handleCustomTextSave(s.id, date);
														} else if (e.key === 'Escape') {
															handleCustomTextCancel();
														}
													}}
												/>
												<div class="flex items-center gap-1 mt-2">
													<button
														type="button"
														onclick={handleCustomTextCancel}
														class="flex-1 px-2 py-1 text-sm text-white bg-red-600 hover:bg-red-700 rounded flex items-center justify-center"
													>
														<X class="w-4 h-4" />
													</button>
													<button
														type="button"
														onclick={() => handleCustomTextSave(s.id, date)}
														class="flex-1 px-2 py-1 text-sm text-white bg-green-600 hover:bg-green-700 rounded flex items-center justify-center"
													>
														<Check class="w-4 h-4" />
													</button>
												</div>
											</div>
										</div>
									</div>
								{/if}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>

			<!-- Footer: Day Off Counts -->
			<tfoot>
				<tr class="bg-yellow-100">
					<td
						class="sticky left-0 z-10 bg-yellow-100 text-center font-bold text-xs text-red-600 py-2"
						style="min-width: 40px; width: 40px; box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);"
					>
						休日数
					</td>
					{#each orderedStaff as s, staffIndex}
						{@const dayOffCount = getDayOffCount(s.id)}
						<td
							class="text-center font-bold text-xs bg-yellow-100 text-red-600 py-2"
							style="min-width: 40px; width: 40px; max-width: 40px;"
						>
							{dayOffCount % 1 === 0 ? dayOffCount : dayOffCount.toFixed(1)}
						</td>
					{/each}
				</tr>
			</tfoot>
		</table>
	</div>

	<!-- Context Menu -->
	{#if contextMenu}
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="context-menu fixed bg-white border border-gray-300 rounded-lg shadow-lg py-2 z-50"
			style="left: {contextMenu.x}px; top: {contextMenu.y}px;"
			onclick={(e) => e.stopPropagation()}
			role="listbox"
			tabindex="-1"
		>
			<button
				type="button"
				class="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
				onclick={() => handleQuickAction('copy')}
			>
				<Copy class="w-4 h-4" />
				Copy ({selection.selectedCells.size} cells)
			</button>
			{#if selection.getSelectionStats().hasClipboard}
				<button
					type="button"
					class="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
					onclick={() => handleQuickAction('paste')}
				>
					<Clipboard class="w-4 h-4" />
					Paste
				</button>
			{/if}
			<hr class="my-1" />
			<button
				type="button"
				class="w-full px-4 py-2 text-left hover:bg-gray-100 text-red-600 font-bold flex items-center gap-2"
				onclick={() => handleQuickAction('off')}
			>
				<span class="text-xl">×</span>
				Day Off
			</button>
			<button
				type="button"
				class="w-full px-4 py-2 text-left hover:bg-gray-100 text-blue-600 font-medium flex items-center gap-2"
				onclick={() => handleQuickAction('early')}
			>
				<span class="text-lg">△</span>
				Early Shift
			</button>
			<button
				type="button"
				class="w-full px-4 py-2 text-left hover:bg-gray-100 text-yellow-600 font-bold flex items-center gap-2"
				onclick={() => handleQuickAction('star')}
			>
				<span>★</span>
				Star
			</button>
			<hr class="my-1" />
			<button
				type="button"
				class="w-full px-4 py-2 text-left hover:bg-red-100 text-red-600 text-sm"
				onclick={() => handleQuickAction('clear')}
			>
				Clear Selected
			</button>
		</div>
	{/if}
</div>

<style>
	.table-container {
		max-height: calc(100vh - 200px);
		overflow: auto;
		position: relative;
	}

	.table-container:focus {
		outline: none;
	}

	/* Table cell borders - grid style like React */
	table {
		border-collapse: collapse;
		border-spacing: 0;
	}

	/* All cells get borders */
	th, td {
		border: 1px solid #e5e7eb;
	}

	/* Header cells get slightly darker borders */
	thead th {
		border-color: #6b7280;
	}

	/* Shift dropdown animation */
	.shift-dropdown {
		animation: fadeIn 0.15s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(-5px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Bulk toolbar slide up animation */
	.bulk-toolbar {
		animation: slideUp 0.2s ease-out;
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translate(-50%, 20px);
		}
		to {
			opacity: 1;
			transform: translate(-50%, 0);
		}
	}

	/* Sticky header remains visible on scroll */
	thead {
		position: sticky;
		top: 0;
		z-index: 100;
	}

	/* Sticky left column for date cells */
	tbody td:first-child,
	tfoot td:first-child {
		position: sticky;
		left: 0;
		z-index: 50;
	}
</style>
