<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { authState } from '$lib/auth.svelte';
	import { uploadImage, compressImageForOCR } from '$lib/supabase';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import {
		getProducts,
		createProduct,
		updateProduct,
		deleteProduct,
		getAllergens,
		createAllergen,
		deleteAllergen,
		scanExtract,
		getMenus,
		createMenu,
		updateMenu,
		deleteMenu,
		getCategories,
		createCategoryApi,
		deleteCategoryApi,
		type Product,
		type Allergen,
		type Menu,
		type Category,
		type CreateProductData,
		type UpdateProductData,
		type CreateMenuData,
	} from '$lib/api';

	// ── Sidebar ─────────────────────────────────────────────
	let sidebarCollapsed = $state(false);
	let sidebarMobileOpen = $state(false);

	type Tab = 'products' | 'menus';
	let activeTab = $state<Tab>('products');

	const sidebarSections = $derived.by(() => [
		{
			label: 'ホーム',
			items: [{ icon: 'dashboard', label: 'ダッシュボード', href: '/dashboard', active: false }],
		},
		{
			label: '厨房・メニュー',
			items: [
				{
					icon: 'inventory_2',
					label: '商品管理',
					active: activeTab === 'products',
					onclick: () => (activeTab = 'products'),
				},
				{
					icon: 'restaurant_menu',
					label: 'メニュー管理',
					active: activeTab === 'menus',
					onclick: () => (activeTab = 'menus'),
				},
				{ icon: 'cooking', label: '厨房生産管理', href: '/kitchen-production', active: false },
			],
		},
	]);

	// ── Data ────────────────────────────────────────────────
	let products = $state<Product[]>([]);
	let allergens = $state<Allergen[]>([]);
	let menus = $state<Menu[]>([]);
	let productCategories = $state<Category[]>([]);
	let menuCategories = $state<Category[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// ── Product form ─────────────────────────────────────────
	let showAddProduct = $state(false);
	let addMode = $state<'scan' | 'manual'>('scan');
	let editingProduct = $state<Product | null>(null);
	let expandedProductId = $state<string | null>(null);

	// Scan state
	let scanFile = $state<File | null>(null);
	let scanPreviewUrl = $state<string | null>(null);
	let scanning = $state(false);
	let scanDone = $state(false);

	// Webcam state
	let webcamActive = $state(false);
	let webcamError = $state<string | null>(null);
	let videoEl = $state<HTMLVideoElement | null>(null);
	let stream: MediaStream | null = null;

	async function startWebcam() {
		webcamError = null;
		try {
			stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
			webcamActive = true;
			// bind stream after videoEl is in DOM
			setTimeout(() => {
				if (videoEl && stream) {
					videoEl.srcObject = stream;
					videoEl.play();
				}
			}, 50);
		} catch {
			webcamError = 'カメラへのアクセスが拒否されました。ブラウザの設定を確認してください。';
		}
	}

	function stopWebcam() {
		stream?.getTracks().forEach((t) => t.stop());
		stream = null;
		webcamActive = false;
		if (videoEl) videoEl.srcObject = null;
	}

	function captureFrame() {
		if (!videoEl) return;
		const canvas = document.createElement('canvas');
		canvas.width = videoEl.videoWidth;
		canvas.height = videoEl.videoHeight;
		canvas.getContext('2d')!.drawImage(videoEl, 0, 0);
		canvas.toBlob((blob) => {
			if (!blob) return;
			const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
			scanFile = file;
			scanPreviewUrl = URL.createObjectURL(blob);
			scanDone = false;
			stopWebcam();
		}, 'image/jpeg', 0.95);
	}

	// Product form fields
	let pName = $state('');
	let pBrand = $state('');
	let pCategory = $state('');
	let pIngredients = $state('');
	let pIsVeg = $state(false);
	let pIsVegan = $state(false);
	let pIsHalal = $state(false);
	let pIsGF = $state(false);
	let pAllergenIds = $state<string[]>([]);
	let pAllergenSearch = $state('');
	let pImageUrl = $state<string | null>(null);
	let pImageFile = $state<File | null>(null);
	let savingProduct = $state(false);

	// ── Menu form ────────────────────────────────────────────
	let showAddMenu = $state(false);
	let editingMenu = $state<Menu | null>(null);
	let expandedMenuId = $state<string | null>(null);

	let mName = $state('');
	let mDescription = $state('');
	let mPrice = $state('');
	let mCategory = $state('');
	let mProductIds = $state<string[]>([]);
	let mIsAvailable = $state(true);
	let mProductSearch = $state('');
	let savingMenu = $state(false);

	// ── Settings modals ──────────────────────────────────────
	let showManageAllergens = $state(false);
	let showManageCategories = $state(false);
	let newAllergenName = $state('');
	let newAllergenCategory = $state('grain');
	let newCategoryName = $state('');
	let newCategoryType = $state<'product' | 'menu'>('product');
	let savingSettings = $state(false);

	// ── Derived ──────────────────────────────────────────────
	const filteredAllergens = $derived(
		pAllergenSearch.trim()
			? allergens.filter(
					(a) =>
						a.name.toLowerCase().includes(pAllergenSearch.toLowerCase()) ||
						a.category.toLowerCase().includes(pAllergenSearch.toLowerCase()),
				)
			: allergens,
	);

	const filteredMenuProducts = $derived(
		mProductSearch.trim()
			? products.filter(
					(p) =>
						p.name.toLowerCase().includes(mProductSearch.toLowerCase()) ||
						(p.brand ?? '').toLowerCase().includes(mProductSearch.toLowerCase()),
				)
			: products,
	);

	// ── Load data ────────────────────────────────────────────
	async function loadAll() {
		loading = true;
		error = null;
		try {
			const [p, a, m, pc, mc] = await Promise.all([
				getProducts(),
				getAllergens(),
				getMenus(),
				getCategories('product'),
				getCategories('menu'),
			]);
			products = p;
			allergens = a;
			menus = m;
			productCategories = pc;
			menuCategories = mc;
		} catch (e) {
			error = e instanceof Error ? e.message : '読み込みに失敗しました';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		if (!authState.isStaff && !authState.loading) {
			window.location.href = '/login';
			return;
		}
		const tab = $page.url.searchParams.get('tab');
		if (tab === 'menus' || tab === 'menu') activeTab = 'menus';
		loadAll();
	});

	// ── Scan ─────────────────────────────────────────────────
	function onScanFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0] ?? null;
		scanFile = file;
		scanPreviewUrl = file ? URL.createObjectURL(file) : null;
		scanDone = false;
	}

	async function handleScan() {
		if (!scanFile) return;
		scanning = true;
		error = null;
		try {
			const compressed = await compressImageForOCR(scanFile);
			const url = await uploadImage(compressed);
			const result = await scanExtract(url);
			const d = result.extracted_data;
			pName = d.product_name ?? '';
			pBrand = d.brand ?? '';
			pCategory = d.category ?? '';
			pIngredients = d.ingredients_raw ?? '';
			pIsVeg = d.is_vegetarian;
			pIsVegan = d.is_vegan;
			pIsHalal = d.is_halal;
			pIsGF = d.is_gluten_free;
			pAllergenIds = result.matched_allergens.map((a) => a.id);
			pImageUrl = result.image_url;
			scanDone = true;
			addMode = 'manual';
		} catch (e) {
			error = e instanceof Error ? e.message : 'スキャンに失敗しました';
		} finally {
			scanning = false;
		}
	}

	// ── Product CRUD ─────────────────────────────────────────
	function openAddProduct() {
		editingProduct = null;
		pName = ''; pBrand = ''; pCategory = ''; pIngredients = '';
		pIsVeg = false; pIsVegan = false; pIsHalal = false; pIsGF = false;
		pAllergenIds = []; pAllergenSearch = ''; pImageUrl = null; pImageFile = null;
		scanFile = null; scanPreviewUrl = null; scanDone = false;
		webcamActive = false; webcamError = null; stopWebcam();
		addMode = 'scan';
		showAddProduct = true;
	}

	function closeAddProduct() {
		stopWebcam();
		showAddProduct = false;
	}

	function openEditProduct(p: Product) {
		editingProduct = p;
		pName = p.name; pBrand = p.brand ?? ''; pCategory = p.category ?? '';
		pIngredients = p.ingredients_raw ?? '';
		pIsVeg = p.is_vegetarian; pIsVegan = p.is_vegan; pIsHalal = p.is_halal; pIsGF = p.is_gluten_free;
		pAllergenIds = p.allergens.map((a) => a.id);
		pAllergenSearch = ''; pImageUrl = p.image_url; pImageFile = null;
		addMode = 'manual';
		showAddProduct = true;
	}

	function toggleAllergen(id: string) {
		pAllergenIds = pAllergenIds.includes(id)
			? pAllergenIds.filter((a) => a !== id)
			: [...pAllergenIds, id];
	}

	async function saveProduct() {
		if (!pName.trim()) return;
		savingProduct = true;
		error = null;
		try {
			let imageUrl = pImageUrl;
			if (pImageFile) imageUrl = await uploadImage(pImageFile);

			if (editingProduct) {
				const data: UpdateProductData = {
					name: pName.trim(), brand: pBrand.trim() || null, category: pCategory || null,
					ingredients_raw: pIngredients.trim() || null,
					is_vegetarian: pIsVeg, is_vegan: pIsVegan, is_halal: pIsHalal, is_gluten_free: pIsGF,
					allergen_ids: pAllergenIds,
				};
				const updated = await updateProduct(editingProduct.id, data);
				products = products.map((p) => (p.id === updated.id ? updated : p));
			} else {
				const data: CreateProductData = {
					name: pName.trim(), brand: pBrand.trim() || null, category: pCategory || null,
					ingredients_raw: pIngredients.trim() || null,
					is_vegetarian: pIsVeg, is_vegan: pIsVegan, is_halal: pIsHalal, is_gluten_free: pIsGF,
					allergen_ids: pAllergenIds, image_url: imageUrl,
				};
				const created = await createProduct(data);
				products = [created, ...products];
			}
			showAddProduct = false;
		} catch (e) {
			error = e instanceof Error ? e.message : '保存に失敗しました';
		} finally {
			savingProduct = false;
		}
	}

	async function handleDeleteProduct(id: string) {
		if (!confirm('この商品を削除しますか？')) return;
		try {
			await deleteProduct(id);
			products = products.filter((p) => p.id !== id);
			if (expandedProductId === id) expandedProductId = null;
		} catch (e) {
			error = e instanceof Error ? e.message : '削除に失敗しました';
		}
	}

	// ── Menu CRUD ────────────────────────────────────────────
	function openAddMenu() {
		editingMenu = null;
		mName = ''; mDescription = ''; mPrice = ''; mCategory = '';
		mProductIds = []; mProductSearch = ''; mIsAvailable = true;
		showAddMenu = true;
	}

	function openEditMenu(m: Menu) {
		editingMenu = m;
		mName = m.name; mDescription = m.description ?? ''; mPrice = m.price != null ? String(m.price) : '';
		mCategory = m.category ?? ''; mProductIds = m.products.map((p) => p.id);
		mProductSearch = ''; mIsAvailable = m.is_available;
		showAddMenu = true;
	}

	function toggleMenuProduct(id: string) {
		mProductIds = mProductIds.includes(id)
			? mProductIds.filter((p) => p !== id)
			: [...mProductIds, id];
	}

	async function saveMenu() {
		if (!mName.trim()) return;
		savingMenu = true;
		error = null;
		try {
			const data: CreateMenuData = {
				name: mName.trim(), description: mDescription.trim() || null,
				price: mPrice ? Number(mPrice) : null, category: mCategory || null,
				is_available: mIsAvailable, product_ids: mProductIds,
			};
			if (editingMenu) {
				const updated = await updateMenu(editingMenu.id, data);
				menus = menus.map((m) => (m.id === updated.id ? updated : m));
			} else {
				const created = await createMenu(data);
				menus = [created, ...menus];
			}
			showAddMenu = false;
		} catch (e) {
			error = e instanceof Error ? e.message : '保存に失敗しました';
		} finally {
			savingMenu = false;
		}
	}

	async function handleDeleteMenu(id: string) {
		if (!confirm('このメニューを削除しますか？')) return;
		try {
			await deleteMenu(id);
			menus = menus.filter((m) => m.id !== id);
			if (expandedMenuId === id) expandedMenuId = null;
		} catch (e) {
			error = e instanceof Error ? e.message : '削除に失敗しました';
		}
	}

	// ── Settings ─────────────────────────────────────────────
	async function handleAddAllergen() {
		if (!newAllergenName.trim()) return;
		savingSettings = true;
		try {
			const a = await createAllergen(newAllergenName.trim(), newAllergenCategory);
			allergens = [...allergens, a];
			newAllergenName = '';
		} catch (e) {
			error = e instanceof Error ? e.message : 'アレルゲン追加に失敗しました';
		} finally {
			savingSettings = false;
		}
	}

	async function handleDeleteAllergen(id: string) {
		if (!confirm('このアレルゲンを削除しますか？')) return;
		try {
			await deleteAllergen(id);
			allergens = allergens.filter((a) => a.id !== id);
		} catch (e) {
			error = e instanceof Error ? e.message : '削除に失敗しました';
		}
	}

	async function handleAddCategory() {
		if (!newCategoryName.trim()) return;
		savingSettings = true;
		try {
			const c = await createCategoryApi(newCategoryName.trim(), newCategoryType);
			if (newCategoryType === 'product') productCategories = [...productCategories, c];
			else menuCategories = [...menuCategories, c];
			newCategoryName = '';
		} catch (e) {
			error = e instanceof Error ? e.message : 'カテゴリー追加に失敗しました';
		} finally {
			savingSettings = false;
		}
	}

	async function handleDeleteCategory(id: string, type: 'product' | 'menu') {
		if (!confirm('このカテゴリーを削除しますか？')) return;
		try {
			await deleteCategoryApi(id);
			if (type === 'product') productCategories = productCategories.filter((c) => c.id !== id);
			else menuCategories = menuCategories.filter((c) => c.id !== id);
		} catch (e) {
			error = e instanceof Error ? e.message : '削除に失敗しました';
		}
	}

	// ── Helpers ──────────────────────────────────────────────
	function dietaryBadges(p: Product) {
		return [
			p.is_vegetarian && { label: 'V', title: 'ベジタリアン', color: 'bg-green-100 text-green-700' },
			p.is_vegan && { label: 'VG', title: 'ビーガン', color: 'bg-emerald-100 text-emerald-700' },
			p.is_halal && { label: 'H', title: 'ハラール', color: 'bg-blue-100 text-blue-700' },
			p.is_gluten_free && { label: 'GF', title: 'グルテンフリー', color: 'bg-amber-100 text-amber-700' },
		].filter(Boolean) as { label: string; title: string; color: string }[];
	}

	const allergenCategoryLabels: Record<string, string> = {
		grain: '穀物', egg: '卵', dairy: '乳製品', meat: '肉類',
		fish: '魚類', shellfish: '甲殻類', nut: 'ナッツ', legume: '豆類', other: 'その他',
	};
</script>

<svelte:head>
	<title>メニュー管理 — {authState.organization?.name ?? 'Sinara'}</title>
</svelte:head>

<div class="flex h-screen bg-gray-100">
	<Sidebar
		sections={sidebarSections}
		bind:collapsed={sidebarCollapsed}
		bind:mobileOpen={sidebarMobileOpen}
	/>

	<div class="flex-1 flex flex-col overflow-hidden">
		<!-- Header -->
		<header class="bg-white border-b border-gray-200">
			<div class="h-16 flex items-center justify-between px-4 md:px-6">
				<div class="flex items-center gap-3">
					<button
						onclick={() => (sidebarMobileOpen = true)}
						class="md:hidden p-1.5 -ml-1 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
						aria-label="メニューを開く"
					>
						<span class="material-symbols-rounded text-xl">menu</span>
					</button>
					<h2 class="text-lg font-bold text-gray-900">
						{activeTab === 'products' ? '商品管理' : 'メニュー管理'}
					</h2>
				</div>
				<div class="flex items-center gap-2">
					<button
						onclick={() => (showManageAllergens = true)}
						class="hidden sm:flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
					>
						<span class="material-symbols-rounded text-sm">warning</span>
						アレルゲン
					</button>
					<button
						onclick={() => (showManageCategories = true)}
						class="hidden sm:flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
					>
						<span class="material-symbols-rounded text-sm">category</span>
						カテゴリー
					</button>
					{#if activeTab === 'products'}
						<button
							onclick={openAddProduct}
							class="flex items-center gap-1 px-4 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
						>
							<span class="material-symbols-rounded text-sm">add</span>
							商品を追加
						</button>
					{:else}
						<button
							onclick={openAddMenu}
							class="flex items-center gap-1 px-4 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
						>
							<span class="material-symbols-rounded text-sm">add</span>
							メニューを追加
						</button>
					{/if}
				</div>
			</div>
		</header>

		<!-- Error banner -->
		{#if error}
			<div class="mx-4 mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
				<span>{error}</span>
				<button onclick={() => (error = null)} class="ml-4 text-red-400 hover:text-red-600">
					<span class="material-symbols-rounded text-base">close</span>
				</button>
			</div>
		{/if}

		<!-- Scrollable body -->
		<main class="flex-1 overflow-auto p-4 md:p-6">
			{#if authState.loading || loading}
				<div class="space-y-3">
					{#each [1, 2, 3] as _}
						<div class="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
							<div class="flex items-center gap-3">
								<div class="w-12 h-12 bg-gray-200 rounded-lg"></div>
								<div class="flex-1 space-y-2">
									<div class="h-4 bg-gray-200 rounded w-1/3"></div>
									<div class="h-3 bg-gray-100 rounded w-1/4"></div>
								</div>
							</div>
						</div>
					{/each}
				</div>

			{:else if !authState.isStaff}
				<div class="flex items-center justify-center h-64">
					<p class="text-gray-500">ログインが必要です。<a href="/login" class="text-blue-600 underline">ログイン</a></p>
				</div>

			{:else if activeTab === 'products'}
				<!-- Products list -->
				{#if products.length === 0}
					<div class="text-center py-16">
						<span class="material-symbols-rounded text-5xl text-gray-300 mb-4 block">inventory_2</span>
						<h3 class="text-lg font-medium text-gray-700 mb-2">商品がまだありません</h3>
						<p class="text-sm text-gray-400 mb-4">スキャンまたは手動で商品を追加してください</p>
						<button onclick={openAddProduct} class="px-5 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors">
							最初の商品を追加
						</button>
					</div>
				{:else}
					<div class="space-y-2">
						{#each products as product (product.id)}
							<div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<div
									class="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
									onclick={() => (expandedProductId = expandedProductId === product.id ? null : product.id)}
								>
									{#if product.image_url}
										<img src={product.image_url} alt={product.name} class="w-12 h-12 rounded-lg object-cover shrink-0" />
									{:else}
										<div class="w-12 h-12 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
											<span class="material-symbols-rounded text-orange-400">inventory_2</span>
										</div>
									{/if}
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2 flex-wrap">
											<span class="font-semibold text-gray-900 truncate">{product.name}</span>
											{#if product.brand}
												<span class="text-xs text-gray-400">{product.brand}</span>
											{/if}
											{#each dietaryBadges(product) as badge}
												<span class="text-xs font-bold px-1.5 py-0.5 rounded {badge.color}" title={badge.title}>{badge.label}</span>
											{/each}
										</div>
										<div class="flex items-center gap-2 mt-0.5 flex-wrap">
											{#if product.category}
												<span class="text-xs text-gray-400">{product.category}</span>
											{/if}
											{#if product.allergens.length > 0}
												<span class="text-xs text-red-500">{product.allergens.length}種アレルゲン</span>
											{/if}
										</div>
									</div>
									<!-- svelte-ignore a11y_no_static_element_interactions -->
									<!-- svelte-ignore a11y_click_events_have_key_events -->
									<div class="flex items-center gap-1 shrink-0" onclick={(e) => e.stopPropagation()}>
										<button onclick={() => openEditProduct(product)} class="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="編集">
											<span class="material-symbols-rounded text-base">edit</span>
										</button>
										<button onclick={() => handleDeleteProduct(product.id)} class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="削除">
											<span class="material-symbols-rounded text-base">delete</span>
										</button>
										<span class="material-symbols-rounded text-gray-300 text-base">{expandedProductId === product.id ? 'expand_less' : 'expand_more'}</span>
									</div>
								</div>
								{#if expandedProductId === product.id}
									<div class="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-3">
										{#if product.ingredients_raw}
											<div>
												<p class="text-xs font-medium text-gray-500 mb-1">原材料</p>
												<p class="text-sm text-gray-700">{product.ingredients_raw}</p>
											</div>
										{/if}
										{#if product.allergens.length > 0}
											<div>
												<p class="text-xs font-medium text-gray-500 mb-1">アレルゲン</p>
												<div class="flex flex-wrap gap-1">
													{#each product.allergens as a}
														<span class="px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs">{a.name}</span>
													{/each}
												</div>
											</div>
										{/if}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}

			{:else}
				<!-- Menus list -->
				{#if menus.length === 0}
					<div class="text-center py-16">
						<span class="material-symbols-rounded text-5xl text-gray-300 mb-4 block">restaurant_menu</span>
						<h3 class="text-lg font-medium text-gray-700 mb-2">メニューがまだありません</h3>
						<p class="text-sm text-gray-400 mb-4">商品を組み合わせてメニューを作成してください</p>
						<button onclick={openAddMenu} class="px-5 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors">
							最初のメニューを作成
						</button>
					</div>
				{:else}
					<div class="space-y-2">
						{#each menus as menu (menu.id)}
							<div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<div
									class="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
									onclick={() => (expandedMenuId = expandedMenuId === menu.id ? null : menu.id)}
								>
									<div class="w-12 h-12 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
										<span class="material-symbols-rounded text-orange-400">restaurant_menu</span>
									</div>
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2 flex-wrap">
											<span class="font-semibold text-gray-900 truncate">{menu.name}</span>
											{#if menu.price != null}
												<span class="text-xs font-medium text-gray-500">¥{menu.price.toLocaleString()}</span>
											{/if}
											{#if !menu.is_available}
												<span class="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">非公開</span>
											{/if}
										</div>
										<div class="flex items-center gap-2 mt-0.5">
											{#if menu.category}
												<span class="text-xs text-gray-400">{menu.category}</span>
											{/if}
											<span class="text-xs text-gray-400">{menu.products.length}品</span>
											{#if menu.allergens.length > 0}
												<span class="text-xs text-red-500">{menu.allergens.length}種アレルゲン</span>
											{/if}
										</div>
									</div>
									<!-- svelte-ignore a11y_no_static_element_interactions -->
									<!-- svelte-ignore a11y_click_events_have_key_events -->
									<div class="flex items-center gap-1 shrink-0" onclick={(e) => e.stopPropagation()}>
										<button onclick={() => openEditMenu(menu)} class="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="編集">
											<span class="material-symbols-rounded text-base">edit</span>
										</button>
										<button onclick={() => handleDeleteMenu(menu.id)} class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="削除">
											<span class="material-symbols-rounded text-base">delete</span>
										</button>
										<span class="material-symbols-rounded text-gray-300 text-base">{expandedMenuId === menu.id ? 'expand_less' : 'expand_more'}</span>
									</div>
								</div>
								{#if expandedMenuId === menu.id}
									<div class="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-3">
										{#if menu.description}
											<p class="text-sm text-gray-600">{menu.description}</p>
										{/if}
										{#if menu.products.length > 0}
											<div>
												<p class="text-xs font-medium text-gray-500 mb-1">使用商品</p>
												<div class="flex flex-wrap gap-1">
													{#each menu.products as p}
														<span class="px-2 py-0.5 bg-white border border-gray-200 text-gray-700 rounded text-xs">{p.name}</span>
													{/each}
												</div>
											</div>
										{/if}
										{#if menu.allergens.length > 0}
											<div>
												<p class="text-xs font-medium text-gray-500 mb-1">含まれるアレルゲン（自動算出）</p>
												<div class="flex flex-wrap gap-1">
													{#each menu.allergens as a}
														<span class="px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs">{a.name}</span>
													{/each}
												</div>
											</div>
										{/if}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			{/if}
		</main>
	</div>
</div>

<!-- ── Add/Edit Product Modal ────────────────────────────────────────── -->
{#if showAddProduct}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto"
		onclick={(e) => { if (e.target === e.currentTarget) closeAddProduct(); }}
	>
		<div class="bg-white rounded-2xl shadow-xl w-full max-w-xl my-8">
			<div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
				<h2 class="text-lg font-bold text-gray-900">{editingProduct ? '商品を編集' : '商品を追加'}</h2>
				<button onclick={closeAddProduct} class="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
					<span class="material-symbols-rounded">close</span>
				</button>
			</div>

			<div class="px-6 py-4 space-y-4">
				{#if !editingProduct}
					<div class="flex rounded-lg border border-gray-200 overflow-hidden">
						<button
							onclick={() => (addMode = 'scan')}
							class="flex-1 py-2.5 text-sm font-medium transition-colors {addMode === 'scan' ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-50'}"
						>
							<span class="material-symbols-rounded text-sm align-middle mr-1">qr_code_scanner</span>
							画像スキャン
						</button>
						<button
							onclick={() => (addMode = 'manual')}
							class="flex-1 py-2.5 text-sm font-medium transition-colors {addMode === 'manual' ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-50'}"
						>
							<span class="material-symbols-rounded text-sm align-middle mr-1">edit_note</span>
							手動入力
						</button>
					</div>
				{/if}

				{#if addMode === 'scan' && !editingProduct}
					<!-- Scan tab -->
					<div class="space-y-3">
						<!-- Hidden file input for gallery/file picker -->
						<input id="scan-file" type="file" accept="image/*" onchange={onScanFileChange} class="hidden" />

						{#if webcamActive}
							<!-- Live webcam view -->
							<div class="relative rounded-xl overflow-hidden bg-black">
								<!-- svelte-ignore a11y_media_has_caption -->
								<video
									bind:this={videoEl}
									autoplay
									playsinline
									class="w-full h-56 object-cover"
								></video>
								<button
									onclick={stopWebcam}
									class="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
									title="キャンセル"
								>
									<span class="material-symbols-rounded text-base">close</span>
								</button>
							</div>
							<button
								onclick={captureFrame}
								class="w-full py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 text-base"
							>
								<span class="material-symbols-rounded text-xl">camera</span>
								撮影する
							</button>
						{:else if scanPreviewUrl}
							<!-- Captured / selected preview -->
							<div class="relative">
								<img src={scanPreviewUrl} alt="プレビュー" class="w-full h-52 object-contain rounded-xl border border-gray-200 bg-gray-50" />
								<button
									onclick={() => { scanFile = null; scanPreviewUrl = null; scanDone = false; }}
									class="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
									title="やり直す"
								>
									<span class="material-symbols-rounded text-base">close</span>
								</button>
							</div>
						{:else}
							<!-- Initial state: camera or file picker -->
							{#if webcamError}
								<div class="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
									{webcamError}
								</div>
							{/if}
							<div class="grid grid-cols-2 gap-2">
								<button
									onclick={startWebcam}
									class="flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors"
								>
									<span class="material-symbols-rounded text-3xl">photo_camera</span>
									<span class="text-xs font-medium">カメラで撮影</span>
								</button>
								<label
									for="scan-file"
									class="flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
								>
									<span class="material-symbols-rounded text-3xl">photo_library</span>
									<span class="text-xs font-medium">ファイルを選択</span>
								</label>
							</div>
						{/if}

						{#if scanPreviewUrl && !webcamActive}
							<button
								onclick={handleScan}
								disabled={!scanFile || scanning}
								class="w-full py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
							>
								{#if scanning}
									<span class="material-symbols-rounded text-base animate-spin">refresh</span>
									スキャン中...
								{:else}
									<span class="material-symbols-rounded text-base">qr_code_scanner</span>
									OCRスキャン実行
								{/if}
							</button>
						{/if}

						{#if scanDone}
							<div class="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
								<span class="material-symbols-rounded text-base">check_circle</span>
								スキャン完了 — 「手動入力」タブで内容を確認・編集してください。
							</div>
						{/if}
					</div>
				{:else}
					<!-- Manual / review tab -->
					<div class="space-y-3">
						{#if scanDone}
							<div class="px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 flex items-center gap-1.5">
								<span class="material-symbols-rounded text-sm">check_circle</span>
								OCRから自動入力しました。内容を確認してください。
							</div>
						{/if}
						<div>
							<label class="text-sm font-medium text-gray-700 block mb-1">商品名 <span class="text-red-500">*</span></label>
							<input type="text" bind:value={pName} placeholder="商品名を入力" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
						</div>
						<div class="grid grid-cols-2 gap-3">
							<div>
								<label class="text-sm font-medium text-gray-700 block mb-1">ブランド</label>
								<input type="text" bind:value={pBrand} placeholder="ブランド名" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
							</div>
							<div>
								<label class="text-sm font-medium text-gray-700 block mb-1">カテゴリー</label>
								<select bind:value={pCategory} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
									<option value="">未選択</option>
									{#each productCategories as c}
										<option value={c.value}>{c.name}</option>
									{/each}
								</select>
							</div>
						</div>
						<div>
							<label class="text-sm font-medium text-gray-700 block mb-1">原材料</label>
							<textarea bind:value={pIngredients} rows="3" placeholder="原材料を入力" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"></textarea>
						</div>
						<div>
							<label class="text-sm font-medium text-gray-700 block mb-2">食事制限</label>
							<div class="flex flex-wrap gap-4">
								<label class="flex items-center gap-1.5 cursor-pointer">
									<input type="checkbox" bind:checked={pIsVeg} class="rounded" />
									<span class="text-sm text-gray-700">ベジタリアン</span>
								</label>
								<label class="flex items-center gap-1.5 cursor-pointer">
									<input type="checkbox" bind:checked={pIsVegan} class="rounded" />
									<span class="text-sm text-gray-700">ビーガン</span>
								</label>
								<label class="flex items-center gap-1.5 cursor-pointer">
									<input type="checkbox" bind:checked={pIsHalal} class="rounded" />
									<span class="text-sm text-gray-700">ハラール</span>
								</label>
								<label class="flex items-center gap-1.5 cursor-pointer">
									<input type="checkbox" bind:checked={pIsGF} class="rounded" />
									<span class="text-sm text-gray-700">グルテンフリー</span>
								</label>
							</div>
						</div>
						<div>
							<label class="text-sm font-medium text-gray-700 block mb-1">アレルゲン</label>
							<input type="text" bind:value={pAllergenSearch} placeholder="アレルゲンを検索..." class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 mb-2" />
							<div class="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 grid grid-cols-2 gap-0.5">
								{#each filteredAllergens as a}
									<label class="flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded hover:bg-gray-50">
										<input type="checkbox" checked={pAllergenIds.includes(a.id)} onchange={() => toggleAllergen(a.id)} class="rounded shrink-0" />
										<span class="text-xs text-gray-700">{a.name}</span>
									</label>
								{/each}
								{#if filteredAllergens.length === 0}
									<p class="text-xs text-gray-400 col-span-2 py-2 text-center">見つかりません</p>
								{/if}
							</div>
							{#if pAllergenIds.length > 0}
								<p class="text-xs text-orange-600 mt-1">{pAllergenIds.length}件選択中</p>
							{/if}
						</div>
						{#if !editingProduct}
							<div>
								<label class="text-sm font-medium text-gray-700 block mb-1">商品画像</label>
								<input
									type="file"
									accept="image/*"
									onchange={(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) pImageFile = f; }}
									class="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-50 file:text-gray-700 file:font-medium hover:file:bg-gray-100"
								/>
								{#if pImageUrl && !pImageFile}
									<img src={pImageUrl} alt="スキャン画像" class="mt-2 h-24 rounded-lg object-contain border border-gray-200 bg-gray-50" />
								{/if}
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
				<button onclick={closeAddProduct} class="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
					キャンセル
				</button>
				{#if addMode === 'manual' || editingProduct}
					<button
						onclick={saveProduct}
						disabled={savingProduct || !pName.trim()}
						class="px-5 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
					>
						{#if savingProduct}
							<span class="material-symbols-rounded text-sm animate-spin">refresh</span>
						{/if}
						{editingProduct ? '更新' : '保存'}
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- ── Add/Edit Menu Modal ───────────────────────────────────────────── -->
{#if showAddMenu}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto"
		onclick={(e) => { if (e.target === e.currentTarget) showAddMenu = false; }}
	>
		<div class="bg-white rounded-2xl shadow-xl w-full max-w-xl my-8">
			<div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
				<h2 class="text-lg font-bold text-gray-900">{editingMenu ? 'メニューを編集' : 'メニューを追加'}</h2>
				<button onclick={() => (showAddMenu = false)} class="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
					<span class="material-symbols-rounded">close</span>
				</button>
			</div>
			<div class="px-6 py-4 space-y-4">
				<div>
					<label class="text-sm font-medium text-gray-700 block mb-1">メニュー名 <span class="text-red-500">*</span></label>
					<input type="text" bind:value={mName} placeholder="メニュー名を入力" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
				</div>
				<div>
					<label class="text-sm font-medium text-gray-700 block mb-1">説明</label>
					<textarea bind:value={mDescription} rows="2" placeholder="説明（任意）" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"></textarea>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="text-sm font-medium text-gray-700 block mb-1">価格（円）</label>
						<input type="number" bind:value={mPrice} placeholder="0" min="0" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
					</div>
					<div>
						<label class="text-sm font-medium text-gray-700 block mb-1">カテゴリー</label>
						<select bind:value={mCategory} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
							<option value="">未選択</option>
							{#each menuCategories as c}
								<option value={c.value}>{c.name}</option>
							{/each}
						</select>
					</div>
				</div>
				<label class="flex items-center gap-2 cursor-pointer">
					<input type="checkbox" bind:checked={mIsAvailable} class="rounded" />
					<span class="text-sm text-gray-700">公開する</span>
				</label>
				<div>
					<label class="text-sm font-medium text-gray-700 block mb-1">使用する商品</label>
					<input type="text" bind:value={mProductSearch} placeholder="商品を検索..." class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 mb-2" />
					<div class="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
						{#each filteredMenuProducts as p}
							<label class="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50">
								<input type="checkbox" checked={mProductIds.includes(p.id)} onchange={() => toggleMenuProduct(p.id)} class="rounded shrink-0" />
								<div class="flex-1 min-w-0">
									<p class="text-sm font-medium text-gray-800 truncate">{p.name}</p>
									{#if p.allergens.length > 0}
										<p class="text-xs text-red-500">{p.allergens.length}種アレルゲン</p>
									{/if}
								</div>
							</label>
						{/each}
						{#if filteredMenuProducts.length === 0}
							<p class="text-xs text-gray-400 py-4 text-center">商品が見つかりません</p>
						{/if}
					</div>
					{#if mProductIds.length > 0}
						<p class="text-xs text-orange-600 mt-1">{mProductIds.length}品選択中</p>
					{/if}
				</div>
			</div>
			<div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
				<button onclick={() => (showAddMenu = false)} class="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
					キャンセル
				</button>
				<button
					onclick={saveMenu}
					disabled={savingMenu || !mName.trim()}
					class="px-5 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
				>
					{#if savingMenu}
						<span class="material-symbols-rounded text-sm animate-spin">refresh</span>
					{/if}
					{editingMenu ? '更新' : '保存'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ── Manage Allergens Modal ──────────────────────────────────────────── -->
{#if showManageAllergens}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto"
		onclick={(e) => { if (e.target === e.currentTarget) showManageAllergens = false; }}
	>
		<div class="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8">
			<div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
				<h2 class="text-lg font-bold text-gray-900">アレルゲン管理</h2>
				<button onclick={() => (showManageAllergens = false)} class="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
					<span class="material-symbols-rounded">close</span>
				</button>
			</div>
			<div class="px-6 py-4 space-y-4">
				<div class="flex gap-2">
					<input type="text" bind:value={newAllergenName} placeholder="アレルゲン名（日本語）" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
					<select bind:value={newAllergenCategory} class="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
						{#each Object.entries(allergenCategoryLabels) as [val, label]}
							<option value={val}>{label}</option>
						{/each}
					</select>
					<button onclick={handleAddAllergen} disabled={savingSettings || !newAllergenName.trim()} class="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50">
						追加
					</button>
				</div>
				<div class="max-h-72 overflow-y-auto space-y-1">
					{#each allergens as a}
						<div class="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50">
							<div>
								<span class="text-sm font-medium text-gray-800">{a.name}</span>
								<span class="ml-2 text-xs text-gray-400">{allergenCategoryLabels[a.category] ?? a.category}</span>
							</div>
							<button onclick={() => handleDeleteAllergen(a.id)} class="p-1 text-gray-300 hover:text-red-500 transition-colors">
								<span class="material-symbols-rounded text-base">delete</span>
							</button>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- ── Manage Categories Modal ─────────────────────────────────────────── -->
{#if showManageCategories}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto"
		onclick={(e) => { if (e.target === e.currentTarget) showManageCategories = false; }}
	>
		<div class="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8">
			<div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
				<h2 class="text-lg font-bold text-gray-900">カテゴリー管理</h2>
				<button onclick={() => (showManageCategories = false)} class="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
					<span class="material-symbols-rounded">close</span>
				</button>
			</div>
			<div class="px-6 py-4 space-y-4">
				<div class="flex gap-2">
					<input type="text" bind:value={newCategoryName} placeholder="カテゴリー名" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
					<select bind:value={newCategoryType} class="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
						<option value="product">商品</option>
						<option value="menu">メニュー</option>
					</select>
					<button onclick={handleAddCategory} disabled={savingSettings || !newCategoryName.trim()} class="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50">
						追加
					</button>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div>
						<p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">商品カテゴリー</p>
						<div class="space-y-1">
							{#each productCategories as c}
								<div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50">
									<span class="text-sm text-gray-700">{c.name}</span>
									<button onclick={() => handleDeleteCategory(c.id, 'product')} class="p-1 text-gray-300 hover:text-red-500">
										<span class="material-symbols-rounded text-sm">delete</span>
									</button>
								</div>
							{/each}
							{#if productCategories.length === 0}
								<p class="text-xs text-gray-400 py-2">なし</p>
							{/if}
						</div>
					</div>
					<div>
						<p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">メニューカテゴリー</p>
						<div class="space-y-1">
							{#each menuCategories as c}
								<div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50">
									<span class="text-sm text-gray-700">{c.name}</span>
									<button onclick={() => handleDeleteCategory(c.id, 'menu')} class="p-1 text-gray-300 hover:text-red-500">
										<span class="material-symbols-rounded text-sm">delete</span>
									</button>
								</div>
							{/each}
							{#if menuCategories.length === 0}
								<p class="text-xs text-gray-400 py-2">なし</p>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
