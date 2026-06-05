// Single source of truth for searchable navigation destinations.
// Powers the global search bar in the app header (AWS-console-style "go to feature").

export type NavDestination = {
	id: string;
	/** Japanese primary label, e.g. "メニュースキャン" */
	label: string;
	/** English label — also searchable, e.g. "Menu Scan" */
	labelEn: string;
	/** Extra search terms (romaji, kana, synonyms) */
	keywords?: string[];
	description?: string;
	/** Material Symbols icon name */
	icon: string;
	/** Target href; may include query params, e.g. "/menu?structure=1&scan=1" */
	href: string;
	/** Group heading shown in results */
	group: string;
	/** Optional permission gate(s) — visible if ANY listed permission passes can() */
	permissions?: string[];
	/** Gate behind authState.isAdmin */
	adminOnly?: boolean;
	/** Fine-grained tie-breaker within the same kind (default 0) */
	priority?: number;
	/** "doc" entries sort below "primary" feature entries on shared terms (default "primary") */
	kind?: 'primary' | 'doc';
};

export const NAV_DESTINATIONS: NavDestination[] = [
	// ── フロント ──
	{
		id: 'front-desk',
		label: '予約管理',
		labelEn: 'Reservations',
		keywords: ['front desk', 'reservation', 'booking', 'check-in', 'checkout', 'よやく', 'フロント'],
		description: '予約の確認・チェックイン・チェックアウト',
		icon: 'calendar_today',
		href: '/front-desk',
		group: 'フロント',
		permissions: ['reservations.view', 'rooms.view', 'notifications.view'],
	},

	// ── 厨房・メニュー ──
	{
		id: 'menu-management',
		label: 'メニュー管理',
		labelEn: 'Menu Management',
		keywords: ['menu', 'メニュー', 'menyu-'],
		description: 'メニュー・商品の登録・編集',
		icon: 'restaurant_menu',
		href: '/menu?tab=menu',
		group: '厨房・メニュー',
		permissions: ['menus.view'],
	},
	{
		id: 'product-management',
		label: '商品管理',
		labelEn: 'Product Management',
		keywords: ['product', 'ingredient', 'shohin', '商品', '食材'],
		description: '商品・食材の登録・編集',
		icon: 'inventory_2',
		href: '/menu?tab=products',
		group: '厨房・メニュー',
		permissions: ['products.view'],
	},
	{
		id: 'menu-structure',
		label: 'メニュー構成',
		labelEn: 'Menu Structure',
		keywords: ['structure', 'tree', 'kosei', '構成', 'メニュー'],
		description: 'メニューの構成を編集',
		icon: 'account_tree',
		href: '/menu?structure=1',
		group: '厨房・メニュー',
		permissions: ['menus.view'],
	},
	{
		id: 'menu-scan',
		label: 'メニュースキャン',
		labelEn: 'Menu Scan',
		keywords: ['scan', 'ocr', 'スキャン', 'menu scan', 'menyu- sukyan', 'camera', 'image'],
		description: '画像からメニューを読み取り',
		icon: 'document_scanner',
		href: '/menu?structure=1&scan=1',
		group: '厨房・メニュー',
		permissions: ['menus.view'],
	},
	{
		id: 'kitchen-production',
		label: '厨房生産管理',
		labelEn: 'Kitchen Production',
		keywords: ['kitchen', 'production', 'pax', 'allergen', 'chubo', '厨房', 'アレルギー'],
		description: '日別PAX集計・アレルギー情報',
		icon: 'cooking',
		href: '/kitchen-production',
		group: '厨房・メニュー',
	},

	// ── スタッフ ──
	{
		id: 'shifts',
		label: 'シフト管理',
		labelEn: 'Shift Management',
		keywords: ['shift', 'schedule', 'shifuto', 'シフト'],
		description: 'シフトの作成・自動最適化',
		icon: 'edit_calendar',
		href: '/shifts',
		group: 'スタッフ',
	},
	{
		id: 'shift-settings',
		label: 'シフト設定',
		labelEn: 'Shift Settings',
		keywords: ['shift settings', 'config', 'シフト', '設定'],
		description: 'シフトの設定',
		icon: 'tune',
		href: '/shifts/settings',
		group: 'スタッフ',
	},
	{
		id: 'shift-calendar',
		label: 'シフトカレンダー',
		labelEn: 'Shift Calendar',
		keywords: ['calendar', 'shift calendar', 'カレンダー', 'シフト'],
		description: 'シフトの確認・管理',
		icon: 'calendar_month',
		href: '/staff/calendar',
		group: 'スタッフ',
	},

	// ── ドキュメント ──
	{
		id: 'docs',
		label: 'ドキュメント',
		labelEn: 'Documentation',
		keywords: ['docs', 'manual', 'help', 'ドキュメント', 'マニュアル'],
		description: '操作マニュアル・API仕様',
		icon: 'menu_book',
		href: '/docs',
		group: 'ドキュメント',
	},
	{
		id: 'docs-allergen',
		label: 'アレルゲン管理ドキュメント',
		labelEn: 'Allergen Management Docs',
		keywords: ['allergen', 'docs', 'アレルゲン', 'アレルギー'],
		icon: 'description',
		href: '/docs/allergen-management',
		group: 'ドキュメント',
		kind: 'doc',
	},
	{
		id: 'docs-menus',
		label: 'メニューシステムドキュメント',
		labelEn: 'Menu System Docs',
		keywords: ['menu', 'docs', 'メニュー'],
		icon: 'description',
		href: '/docs/menus',
		group: 'ドキュメント',
		kind: 'doc',
	},
	{
		id: 'docs-front-desk',
		label: 'フロントデスクドキュメント',
		labelEn: 'Front Desk Docs',
		keywords: ['front desk', 'docs', 'フロント'],
		icon: 'description',
		href: '/docs/front-desk',
		group: 'ドキュメント',
		kind: 'doc',
	},
	{
		id: 'docs-kitchen',
		label: '厨房生産管理ドキュメント',
		labelEn: 'Kitchen Production Docs',
		keywords: ['kitchen', 'docs', '厨房'],
		icon: 'description',
		href: '/docs/kitchen-production',
		group: 'ドキュメント',
		kind: 'doc',
	},
	{
		id: 'docs-shifts',
		label: 'シフト管理ドキュメント',
		labelEn: 'Shift Management Docs',
		keywords: ['shift', 'docs', 'シフト'],
		icon: 'description',
		href: '/docs/shifts',
		group: 'ドキュメント',
		kind: 'doc',
	},

	// ── 管理者 ──
	{
		id: 'admin',
		label: '管理者ダッシュボード',
		labelEn: 'Admin Dashboard',
		keywords: ['admin', 'settings', 'staff', 'role', 'permission', '管理者', '権限'],
		description: 'スタッフ・権限・システム設定',
		icon: 'admin_panel_settings',
		href: '/admin',
		group: '管理者',
		adminOnly: true,
	},

	// ── アカウント ──
	{
		id: 'account',
		label: 'アカウント',
		labelEn: 'My Account',
		keywords: ['account', 'profile', 'me', 'アカウント', 'プロフィール'],
		description: '自分のアカウント情報',
		icon: 'person',
		href: '/account',
		group: 'アカウント',
	},
];

type SearchOpts = { isAdmin: boolean; can: (p: string) => boolean };

function isVisible(d: NavDestination, opts: SearchOpts): boolean {
	if (d.adminOnly && !opts.isAdmin) return false;
	if (d.permissions && d.permissions.length > 0) {
		if (opts.isAdmin) return true;
		return d.permissions.some((p) => opts.can(p));
	}
	return true;
}

/** Tokens to match: label, labelEn, keywords, description — all lowercased. */
function haystacks(d: NavDestination): string[] {
	return [
		d.label.toLowerCase(),
		d.labelEn.toLowerCase(),
		...(d.keywords ?? []).map((k) => k.toLowerCase()),
		...(d.description ? [d.description.toLowerCase()] : []),
	];
}

/**
 * Rank a destination against a query. Higher is better; null means no match.
 * Multi-word queries (e.g. "menu scan") match if every word is found somewhere.
 */
function scoreDestination(d: NavDestination, query: string): number | null {
	const q = query.trim().toLowerCase();
	if (!q) return 0;
	const words = q.split(/\s+/).filter(Boolean);
	const fields = haystacks(d);

	// Every query word must appear in at least one field
	const allWordsMatch = words.every((w) => fields.some((f) => f.includes(w)));
	if (!allWordsMatch) return null;

	let score = 0;
	const label = d.label.toLowerCase();
	const labelEn = d.labelEn.toLowerCase();

	if (label === q || labelEn === q) score += 1000;
	// Exact keyword match (e.g. query "docs" === a keyword) — strong signal of intent
	if ((d.keywords ?? []).some((k) => k.toLowerCase() === q)) score += 150;
	if (label.startsWith(q) || labelEn.startsWith(q)) score += 200;
	if (label.includes(q) || labelEn.includes(q)) score += 100;
	// Reward primary-label/labelEn hits over keyword-only hits
	for (const w of words) {
		if (label.includes(w) || labelEn.includes(w)) score += 25;
		else score += 5; // matched via keyword/description only
	}
	// Shorter labels rank slightly higher on ties
	score -= label.length * 0.1;
	// Fine-grained per-entry tie-breaker
	score += d.priority ?? 0;
	return score;
}

/**
 * Search visible destinations for the query, ranked best-first.
 * Empty query returns all visible destinations (in registry order) as a default list.
 */
export function searchDestinations(query: string, opts: SearchOpts): NavDestination[] {
	const visible = NAV_DESTINATIONS.filter((d) => isVisible(d, opts));
	const q = query.trim();
	if (!q) return visible;

	return visible
		.map((d) => ({ d, s: scoreDestination(d, q) }))
		.filter((x): x is { d: NavDestination; s: number } => x.s !== null)
		.sort((a, b) => {
			// Primary destinations always rank above doc sub-pages on shared terms
			const ak = a.d.kind === 'doc' ? 1 : 0;
			const bk = b.d.kind === 'doc' ? 1 : 0;
			if (ak !== bk) return ak - bk;
			return b.s - a.s;
		})
		.map((x) => x.d);
}
