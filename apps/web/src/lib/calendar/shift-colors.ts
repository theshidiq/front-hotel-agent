export const SHIFT_COLORS: Record<string, { bg: string; text: string; label: string; dot: string }> = {
	'×': { bg: 'bg-red-100', text: 'text-red-900', label: '休み', dot: 'bg-red-500' },
	'△': { bg: 'bg-blue-100', text: 'text-blue-900', label: '早番', dot: 'bg-blue-500' },
	'○': { bg: 'bg-emerald-100', text: 'text-emerald-900', label: '通常', dot: 'bg-emerald-500' },
	'◇': { bg: 'bg-purple-100', text: 'text-purple-900', label: '遅番', dot: 'bg-purple-500' },
	'★': { bg: 'bg-amber-100', text: 'text-amber-900', label: '特別', dot: 'bg-amber-500' },
	'●': { bg: 'bg-gray-200', text: 'text-gray-800', label: '黒丸', dot: 'bg-gray-500' },
	'◎': { bg: 'bg-teal-100', text: 'text-teal-900', label: '二重丸', dot: 'bg-teal-500' },
	'': { bg: 'bg-white', text: 'text-gray-400', label: '勤務', dot: 'bg-gray-300' },
};

export const CUSTOM_SHIFT_COLOR = {
	bg: 'bg-orange-100',
	text: 'text-orange-900',
	label: '備考',
	dot: 'bg-orange-500',
};

export function getShiftColor(shift: string): { bg: string; text: string; label: string; dot: string } {
	return SHIFT_COLORS[shift] ?? CUSTOM_SHIFT_COLOR;
}
