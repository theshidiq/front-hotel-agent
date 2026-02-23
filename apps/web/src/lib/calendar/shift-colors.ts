export const SHIFT_COLORS: Record<string, { bg: string; text: string; label: string }> = {
	'×': { bg: 'bg-red-100', text: 'text-red-800', label: '休み' },
	'△': { bg: 'bg-blue-100', text: 'text-blue-800', label: '早番' },
	'○': { bg: 'bg-green-100', text: 'text-green-800', label: '通常' },
	'◇': { bg: 'bg-purple-100', text: 'text-purple-800', label: '遅番' },
	'★': { bg: 'bg-amber-100', text: 'text-amber-800', label: '特別' },
	'●': { bg: 'bg-gray-200', text: 'text-gray-700', label: '黒丸' },
	'◎': { bg: 'bg-teal-100', text: 'text-teal-800', label: '二重丸' },
	'': { bg: 'bg-gray-50', text: 'text-gray-500', label: '勤務' },
};

export const CUSTOM_SHIFT_COLOR = {
	bg: 'bg-orange-100',
	text: 'text-orange-800',
	label: '備考',
};

export function getShiftColor(shift: string): { bg: string; text: string; label: string } {
	return SHIFT_COLORS[shift] ?? CUSTOM_SHIFT_COLOR;
}
