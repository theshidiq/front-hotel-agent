<script lang="ts">
	import { onMount } from 'svelte';
	import { uploadImage, compressImage, compressImageForOCR } from '$lib/supabase';
	import { scanProduct, scanExtract, getProducts, updateProduct, deleteProduct, createProduct, getAllergens, createAllergen, deleteAllergen, getMenus, createMenu, updateMenu, deleteMenu, getCategories, createCategoryApi, updateCategoryApi, deleteCategoryApi, getMenuGroups, createMenuGroup, updateMenuGroup, deleteMenuGroup, getSeasonalMenus, createSeasonalMenu, updateSeasonalMenu, deleteSeasonalMenu, getProductAlternates, addProductAlternate, removeProductAlternate, type Product, type UpdateProductData, type CreateProductData, type Allergen, type Menu, type CreateMenuData, type UpdateMenuData, type Category, type MenuGroup, type SeasonalMenu, type UpdateCategoryData, type ScanExtractResult } from '$lib/api';
	import CustomSelect from '$lib/components/CustomSelect.svelte';
	import MenuTreeConfig from '$lib/components/MenuTreeConfig.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { authState } from '$lib/auth.svelte';

	const isStaff = $derived(authState.isStaff);

	// Main Tab (Products vs Menu)
	let mainTab: 'products' | 'menu' = $state('products');

	// Sidebar
	let sidebarCollapsed = $state(false);
	let sidebarMobileOpen = $state(false);

	// Add Product Mode
	let showAddProduct = $state(false);
	let addMode: 'scan' | 'manual' = $state('scan');

	// Scanner State
	let dragOver = $state(false);
	let selectedFile: File | null = $state(null);
	let previewUrl: string | null = $state(null);
	let isScanning = $state(false);
	let scanResult: { product: Product; existing_product?: { id: string; name: string; brand: string | null; image_url: string | null } } | null = $state(null);
	let scanError: string | null = $state(null);

	// Scan review form state
	let scanExtractData: ScanExtractResult | null = $state(null);
	let scanReviewProduct: CreateProductData = $state({
		name: '',
		brand: '',
		category: '',
		ingredients_raw: '',
		storage_instructions: '',
		preparation_instructions: '',
		is_vegetarian: false,
		is_vegan: false,
		is_halal: false,
		is_gluten_free: false,
		allergen_ids: [],
		image_url: null,
	});
	let isSavingScan = $state(false);
	let scanSaveError: string | null = $state(null);
	let scanSaveSuccess = $state(false);

	// Camera State
	let showCamera = $state(false);
	let videoEl: HTMLVideoElement | null = $state(null);
	let cameraStream: MediaStream | null = $state(null);
	let cameraError: string | null = $state(null);

	// Image Lightbox
	let expandedImageUrl: string | null = $state(null);

	// Manual Add State
	let allergens: Allergen[] = $state([]);
	let isCreating = $state(false);

	// Allergen Search
	let allergenSearch = $state('');
	let editAllergenSearch = $state('');
	const searchedAllergens = $derived(
		allergenSearch ? allergens.filter(a => a.name.toLowerCase().includes(allergenSearch.toLowerCase())) : allergens
	);
	const searchedEditAllergens = $derived(
		editAllergenSearch ? allergens.filter(a => a.name.toLowerCase().includes(editAllergenSearch.toLowerCase())) : allergens
	);

	// Product Categories (managed like menu categories)
	let productCategories: { value: string; label: string; id: string }[] = $state([]);

	// Manage Product Categories Modal
	let showManageProductCategories = $state(false);
	let newProductCategoryName = $state('');
	let addProductCategoryError: string | null = $state(null);
	let isAddingProductCategory = $state(false);

	function openManageProductCategories() {
		newProductCategoryName = '';
		addProductCategoryError = null;
		showManageProductCategories = true;
	}

	function closeManageProductCategories() {
		showManageProductCategories = false;
		newProductCategoryName = '';
		addProductCategoryError = null;
	}

	async function addProductCategory() {
		const trimmedName = newProductCategoryName.trim();
		if (!trimmedName) {
			addProductCategoryError = 'Category name is required';
			return;
		}
		const value = trimmedName.toLowerCase().replace(/\s+/g, '-');
		if (productCategories.some(c => c.value === value || c.label.toLowerCase() === trimmedName.toLowerCase())) {
			addProductCategoryError = 'Category already exists';
			return;
		}
		try {
			isAddingProductCategory = true;
			const created = await createCategoryApi(trimmedName, 'product');
			productCategories = [...productCategories, { value: created.value, label: created.name, id: created.id }];
			newProductCategoryName = '';
			addProductCategoryError = null;
		} catch (e: any) {
			addProductCategoryError = e.message || 'Failed to add category';
		} finally {
			isAddingProductCategory = false;
		}
	}

	async function deleteProductCategory(id: string) {
		try {
			await deleteCategoryApi(id);
			productCategories = productCategories.filter(c => c.id !== id);
		} catch (e: any) {
			console.error('Failed to delete product category:', e);
		}
	}

	// Manage Allergens Modal
	let showManageAllergens = $state(false);
	let newAllergenName = $state('');
	let newAllergenCategory = $state('other');
	let addAllergenError: string | null = $state(null);
	let isAddingAllergen = $state(false);

	function openManageAllergens() {
		newAllergenName = '';
		newAllergenCategory = 'other';
		addAllergenError = null;
		showManageAllergens = true;
	}

	function closeManageAllergens() {
		showManageAllergens = false;
		newAllergenName = '';
		addAllergenError = null;
	}

	async function addAllergenItem() {
		const trimmedName = newAllergenName.trim();
		if (!trimmedName) {
			addAllergenError = 'Allergen name is required';
			return;
		}
		if (allergens.some(a => a.name.toLowerCase() === trimmedName.toLowerCase())) {
			addAllergenError = 'Allergen already exists';
			return;
		}
		isAddingAllergen = true;
		addAllergenError = null;
		try {
			const newAllergen = await createAllergen(trimmedName, newAllergenCategory);
			allergens = [...allergens, newAllergen];
			newAllergenName = '';
			newAllergenCategory = 'other';
		} catch (e: any) {
			addAllergenError = e.message || 'Failed to create allergen';
		} finally {
			isAddingAllergen = false;
		}
	}

	async function deleteAllergenItem(id: string) {
		try {
			await deleteAllergen(id);
			allergens = allergens.filter(a => a.id !== id);
		} catch (e: any) {
			console.error('Failed to delete allergen:', e);
		}
	}

	let createError: string | null = $state(null);
	let createSuccess = $state(false);
	let manualImageFile: File | null = $state(null);
	let manualImagePreview: string | null = $state(null);
	let isUploadingImage = $state(false);
	let newProduct: CreateProductData = $state({
		name: '',
		brand: '',
		category: '',
		ingredients_raw: '',
		storage_instructions: '',
		preparation_instructions: '',
		is_vegetarian: false,
		is_vegan: false,
		is_halal: false,
		is_gluten_free: false,
		allergen_ids: [],
		image_url: null,
	});

	function resetNewProduct() {
		newProduct = {
			name: '',
			brand: '',
			category: '',
			ingredients_raw: '',
			storage_instructions: '',
			preparation_instructions: '',
			is_vegetarian: false,
			is_vegan: false,
			is_halal: false,
			is_gluten_free: false,
			allergen_ids: [],
			image_url: null,
		};
		if (manualImagePreview) URL.revokeObjectURL(manualImagePreview);
		manualImageFile = null;
		manualImagePreview = null;
		createError = null;
		createSuccess = false;
	}

	async function handleManualImageInput(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			const file = input.files[0];
			if (!file.type.startsWith('image/')) {
				createError = 'Please select an image file';
				return;
			}
			const compressed = await compressImage(file);
			manualImageFile = compressed;
			if (manualImagePreview) URL.revokeObjectURL(manualImagePreview);
			manualImagePreview = URL.createObjectURL(compressed);
			createError = null;
		}
	}

	function clearManualImage() {
		if (manualImagePreview) URL.revokeObjectURL(manualImagePreview);
		manualImageFile = null;
		manualImagePreview = null;
		newProduct.image_url = null;
	}

	async function handleCreateProduct() {
		if (!newProduct.name.trim()) {
			createError = 'Product name is required';
			return;
		}
		isCreating = true;
		createError = null;
		try {
			// Upload image first if selected
			if (manualImageFile) {
				isUploadingImage = true;
				const imageUrl = await uploadImage(manualImageFile);
				newProduct.image_url = imageUrl;
				isUploadingImage = false;
			}

			await createProduct(newProduct);
			await loadProducts();
			createSuccess = true;
			setTimeout(() => {
				resetNewProduct();
			}, 2000);
		} catch (e: any) {
			createError = e.message || 'Failed to create product';
		} finally {
			isCreating = false;
			isUploadingImage = false;
		}
	}

	function toggleAllergen(allergenId: string) {
		const ids = newProduct.allergen_ids || [];
		if (ids.includes(allergenId)) {
			newProduct.allergen_ids = ids.filter(id => id !== allergenId);
		} else {
			newProduct.allergen_ids = [...ids, allergenId];
		}
	}

	let scanAllergenSearch = $state('');
	const scanSearchedAllergens = $derived(
		scanAllergenSearch ? allergens.filter(a => a.name.toLowerCase().includes(scanAllergenSearch.toLowerCase())) : allergens
	);

	function toggleScanAllergen(allergenId: string) {
		const ids = scanReviewProduct.allergen_ids || [];
		if (ids.includes(allergenId)) {
			scanReviewProduct.allergen_ids = ids.filter(id => id !== allergenId);
		} else {
			scanReviewProduct.allergen_ids = [...ids, allergenId];
		}
	}

	function toggleEditAllergen(allergenId: string) {
		const ids = editForm.allergen_ids || [];
		if (ids.includes(allergenId)) {
			editForm.allergen_ids = ids.filter(id => id !== allergenId);
		} else {
			editForm.allergen_ids = [...ids, allergenId];
		}
	}

	// Products State
	let searchQuery = $state('');
	let products: Product[] = $state([]);
	let isLoading = $state(true);
	let expandedProductId: string | null = $state(null);
	let editingProductId: string | null = $state(null);
	let editForm: UpdateProductData = $state({});
	let isSaving = $state(false);
	let saveError: string | null = $state(null);

	function toggleProduct(id: string) {
		expandedProductId = expandedProductId === id ? null : id;
		// Close edit mode when collapsing
		if (expandedProductId !== id) {
			editingProductId = null;
		}
	}

	function startEditing(product: Product) {
		editingProductId = product.id;
		editForm = {
			name: product.name,
			brand: product.brand,
			category: product.category,
			ingredients_raw: product.ingredients_raw,
			storage_instructions: product.storage_instructions,
			preparation_instructions: product.preparation_instructions,
			is_vegetarian: product.is_vegetarian,
			is_vegan: product.is_vegan,
			is_halal: product.is_halal,
			is_gluten_free: product.is_gluten_free,
			allergen_ids: product.allergens?.map(a => a.id) || [],
		};
		saveError = null;
	}

	function cancelEditing() {
		editingProductId = null;
		editForm = {};
		saveError = null;
	}

	async function saveProduct(id: string) {
		isSaving = true;
		saveError = null;
		try {
			await updateProduct(id, editForm);
			await loadProducts();
			editingProductId = null;
			editForm = {};
		} catch (e: any) {
			saveError = e.message || 'Failed to save';
		} finally {
			isSaving = false;
		}
	}

	async function handleDeleteProduct(id: string) {
		if (!confirm('Are you sure you want to delete this product?')) return;
		try {
			await deleteProduct(id);
			await loadProducts();
			expandedProductId = null;
			editingProductId = null;
		} catch (e: any) {
			alert(e.message || 'Failed to delete');
		}
	}

	// Menu State (declared early so derived blocks below can reference it)
	let menus: Menu[] = $state([]);

	// Sidebar sections (must be after products & menus declarations)
	const sidebarSections = $derived([
		{
			label: 'フロント',
			items: [
				{ icon: 'calendar_today', label: '予約管理', href: '/front-desk', active: false },
			]
		},
		{
			label: '食材管理',
			items: [
				{ icon: 'inventory_2', label: '商品管理', badge: products.length, active: mainTab === 'products', onclick: () => mainTab = 'products' },
				{ icon: 'restaurant_menu', label: 'メニュー管理', badge: menus.length, active: mainTab === 'menu', onclick: () => mainTab = 'menu' },
			]
		}
	]);

	// Menu Group filter for products
	let selectedProductMenuGroup: string = $state('all');

	// Derive which products belong to which menu groups (via menus)
	const productMenuGroupMap = $derived.by(() => {
		const map = new Map<string, Set<string>>();
		for (const menu of menus) {
			if (menu.menu_group_id) {
				for (const product of menu.products) {
					if (!map.has(product.id)) {
						map.set(product.id, new Set());
					}
					map.get(product.id)!.add(menu.menu_group_id);
				}
			}
		}
		return map;
	});

	const linkedProductIds = $derived(new Set(productMenuGroupMap.keys()));

	const filteredProducts = $derived(
		products.filter(p => {
			const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(p.brand?.toLowerCase() || '').includes(searchQuery.toLowerCase());
			if (!matchesSearch) return false;
			if (selectedProductMenuGroup === 'all') return true;
			if (selectedProductMenuGroup === 'unlinked') return !linkedProductIds.has(p.id);
			const groups = productMenuGroupMap.get(p.id);
			return groups ? groups.has(selectedProductMenuGroup) : false;
		})
	);

	let menuSearchQuery = $state('');
	let isLoadingMenus = $state(true);
	let expandedMenuId: string | null = $state(null);
	let editingMenuId: string | null = $state(null);
	let menuEditForm: UpdateMenuData = $state({});
	let isSavingMenu = $state(false);
	let saveMenuError: string | null = $state(null);

	// Delete Menu Modal State
	let showDeleteMenuModal = $state(false);
	let menuToDelete: string | null = $state(null);
	let isDeletingMenu = $state(false);

	// Menu Categories
	let menuCategories: { value: string; label: string; id: string; image_url?: string | null; description?: string | null; price?: number | null }[] = $state([]);

	// Menu Tree Config overlay
	let showMenuTreeConfig = $state(false);

	// Seasonal Menus
	let seasonalMenus: SeasonalMenu[] = $state([]);

	// Menu Groups
	let menuGroups: MenuGroup[] = $state([]);

	// Tree config callbacks (wrappers that reload data after mutations)
	async function treeCreateSeason(data: import('$lib/api').CreateSeasonalMenuData) {
		const created = await createSeasonalMenu(data);
		seasonalMenus = [...seasonalMenus, created];
	}

	async function treeUpdateSeason(id: string, data: import('$lib/api').UpdateSeasonalMenuData) {
		const prev = seasonalMenus;
		seasonalMenus = seasonalMenus.map(s => s.id === id ? { ...s, ...data } : s);
		try {
			const updated = await updateSeasonalMenu(id, data);
			seasonalMenus = seasonalMenus.map(s => s.id === id ? updated : s);
		} catch {
			seasonalMenus = prev;
		}
	}

	async function treeDeleteSeason(id: string) {
		await deleteSeasonalMenu(id);
		seasonalMenus = seasonalMenus.filter(s => s.id !== id);
		menuGroups = menuGroups.map(g => g.seasonal_menu_id === id ? { ...g, seasonal_menu_id: null } : g);
	}

	async function treeCreateGroup(data: import('$lib/api').CreateMenuGroupData) {
		const created = await createMenuGroup(data);
		menuGroups = [...menuGroups, created];
	}

	async function treeUpdateGroup(id: string, data: import('$lib/api').UpdateMenuGroupData) {
		const prev = menuGroups;
		menuGroups = menuGroups.map(g => g.id === id ? { ...g, ...data } : g);
		try {
			const updated = await updateMenuGroup(id, data);
			menuGroups = menuGroups.map(g => g.id === id ? updated : g);
		} catch {
			menuGroups = prev;
		}
	}

	async function treeDeleteGroup(id: string) {
		await deleteMenuGroup(id);
		menuGroups = menuGroups.filter(g => g.id !== id);
	}

	async function treeCreateCourse(name: string) {
		const created = await createCategoryApi(name, 'menu');
		menuCategories = [...menuCategories, { value: created.value, label: created.name, id: created.id }];
	}

	async function treeUpdateCourse(id: string, name: string) {
		const prev = menuCategories;
		menuCategories = menuCategories.map(c => c.id === id ? { ...c, label: name } : c);
		try {
			const updated = await updateCategoryApi(id, { name });
			menuCategories = menuCategories.map(c => c.id === id ? { value: updated.value, label: updated.name, id: updated.id } : c);
		} catch {
			menuCategories = prev;
		}
	}

	async function treeUpdateCourseDetails(id: string, data: UpdateCategoryData) {
		await updateCategoryApi(id, data);
	}

	async function treeDeleteCourse(id: string) {
		await deleteCategoryApi(id);
		menuCategories = menuCategories.filter(c => c.id !== id);
	}

	async function treeCreateMenu(data: import('$lib/api').CreateMenuData) {
		await createMenu(data);
		menus = await getMenus();
	}

	async function treeUpdateMenu(id: string, data: import('$lib/api').UpdateMenuData) {
		await updateMenu(id, data);
		menus = await getMenus();
	}

	async function treeDeleteMenu(id: string) {
		await deleteMenu(id);
		menus = menus.filter(m => m.id !== id);
	}

	// Menu Create State
	let isCreatingMenu = $state(false);
	let createMenuError: string | null = $state(null);
	let createMenuSuccess = $state(false);
	let menuImageFile: File | null = $state(null);
	let menuImagePreview: string | null = $state(null);
	let isUploadingMenuImage = $state(false);
	let newMenu: CreateMenuData = $state({
		name: '',
		description: '',
		price: null,
		category: '',
		seasonal_menu_id: '',
		menu_group_id: '',
		image_url: null,
		is_available: true,
		product_ids: [],
	});

	// Alternate Ingredients State (maps product_id -> array of alternate product_ids)
	let productAlternates: Record<string, string[]> = $state({});
	let showAlternatesModal = $state(false);
	let alternatesForProductId: string | null = $state(null);
	let alternateSearchTerm = $state('');
	let alternateSearchFocused = $state(false);

	// Get the product being configured for alternates
	const alternatesProduct = $derived(
		alternatesForProductId ? products.find(p => p.id === alternatesForProductId) : null
	);

	// Get available products for alternates (exclude the main product and already selected alternates)
	const availableAlternates = $derived(() => {
		if (!alternatesForProductId) return [];
		const currentAlternates = productAlternates[alternatesForProductId] || [];
		return products.filter(p =>
			p.id !== alternatesForProductId &&
			!currentAlternates.includes(p.id) &&
			(alternateSearchTerm === '' || p.name.toLowerCase().includes(alternateSearchTerm.toLowerCase()))
		);
	});

	// Get selected alternates for current product
	const selectedAlternates = $derived(() => {
		if (!alternatesForProductId) return [];
		const alternateIds = productAlternates[alternatesForProductId] || [];
		return products.filter(p => alternateIds.includes(p.id));
	});

	function openAlternatesModal(productId: string) {
		alternatesForProductId = productId;
		alternateSearchTerm = '';
		alternateSearchFocused = false;
		showAlternatesModal = true;
	}

	function closeAlternatesModal() {
		showAlternatesModal = false;
		alternatesForProductId = null;
		alternateSearchTerm = '';
	}

	async function addAlternate(productId: string) {
		if (!alternatesForProductId) return;
		const current = productAlternates[alternatesForProductId] || [];
		if (!current.includes(productId)) {
			productAlternates[alternatesForProductId] = [...current, productId];
			try {
				await addProductAlternate(alternatesForProductId, productId);
			} catch (e) {
				console.error('Failed to save alternate:', e);
				productAlternates[alternatesForProductId] = current;
			}
		}
		alternateSearchTerm = '';
	}

	async function removeAlternate(productId: string) {
		if (!alternatesForProductId) return;
		const prev = productAlternates[alternatesForProductId] || [];
		productAlternates[alternatesForProductId] = prev.filter(id => id !== productId);
		try {
			await removeProductAlternate(alternatesForProductId, productId);
		} catch (e) {
			console.error('Failed to remove alternate:', e);
			productAlternates[alternatesForProductId] = prev;
		}
	}

	function getAlternatesCount(productId: string): number {
		return (productAlternates[productId] || []).length;
	}

	function getAlternatesForProduct(productId: string): typeof products {
		const alternateIds = productAlternates[productId] || [];
		return products.filter(p => alternateIds.includes(p.id));
	}

	async function loadAlternates() {
		try {
			const rows = await getProductAlternates();
			const map: Record<string, string[]> = {};
			for (const row of rows) {
				if (!map[row.product_id]) map[row.product_id] = [];
				map[row.product_id].push(row.alternate_product_id);
			}
			productAlternates = map;
		} catch (e) {
			console.error('Failed to load alternates:', e);
		}
	}

	// Callback for CourseDetailSidebar to add/remove alternates via API
	async function handleAddAlternate(productId: string, alternateProductId: string) {
		const current = productAlternates[productId] || [];
		if (!current.includes(alternateProductId)) {
			productAlternates[productId] = [...current, alternateProductId];
			try {
				await addProductAlternate(productId, alternateProductId);
			} catch (e) {
				console.error('Failed to save alternate:', e);
				productAlternates[productId] = current;
			}
		}
	}

	async function handleRemoveAlternate(productId: string, alternateProductId: string) {
		const prev = productAlternates[productId] || [];
		productAlternates[productId] = prev.filter(id => id !== alternateProductId);
		try {
			await removeProductAlternate(productId, alternateProductId);
		} catch (e) {
			console.error('Failed to remove alternate:', e);
			productAlternates[productId] = prev;
		}
	}

	// Product search for menu creation
	let productSearchTerm = $state('');
	let productSearchFocused = $state(false);
	const availableProductsForMenu = $derived(
		products.filter(p =>
			!(newMenu.product_ids || []).includes(p.id) &&
			(productSearchTerm === '' || p.name.toLowerCase().includes(productSearchTerm.toLowerCase()))
		)
	);
	const selectedProductsForMenu = $derived(
		products.filter(p => (newMenu.product_ids || []).includes(p.id))
	);
	const derivedMenuAllergens = $derived(() => {
		const allergenMap = new Map<string, Allergen>();
		for (const product of selectedProductsForMenu) {
			for (const allergen of product.allergens || []) {
				if (!allergenMap.has(allergen.id)) {
					allergenMap.set(allergen.id, allergen);
				}
			}
		}
		return Array.from(allergenMap.values());
	});

	const filteredMenus = $derived(
		menus.filter(m =>
			m.name.toLowerCase().includes(menuSearchQuery.toLowerCase()) ||
			(m.description?.toLowerCase() || '').includes(menuSearchQuery.toLowerCase())
		)
	);

	// Cascading dropdown logic for create form
	const filteredMenuGroupsForCreate = $derived(
		newMenu.seasonal_menu_id
			? menuGroups.filter(g => g.seasonal_menu_id === newMenu.seasonal_menu_id)
			: menuGroups
	);
	const filteredCoursesForCreate = $derived(() => {
		if (!newMenu.menu_group_id) return menuCategories;
		const group = menuGroups.find(g => g.id === newMenu.menu_group_id);
		if (!group || !group.allowed_courses || group.allowed_courses.length === 0) return menuCategories;
		const allowedValues = new Set(group.allowed_courses.map(c => c.category_value));
		return menuCategories.filter(c => allowedValues.has(c.value));
	});

	// Cascading dropdown logic for edit form
	const filteredMenuGroupsForEdit = $derived(
		menuEditForm.seasonal_menu_id
			? menuGroups.filter(g => g.seasonal_menu_id === menuEditForm.seasonal_menu_id)
			: menuGroups
	);
	const filteredCoursesForEdit = $derived(() => {
		if (!menuEditForm.menu_group_id) return menuCategories;
		const group = menuGroups.find(g => g.id === menuEditForm.menu_group_id);
		if (!group || !group.allowed_courses || group.allowed_courses.length === 0) return menuCategories;
		const allowedValues = new Set(group.allowed_courses.map(c => c.category_value));
		return menuCategories.filter(c => allowedValues.has(c.value));
	});

	// Track previous values for cascade resets
	let prevCreateSeasonalMenuId = $state('');
	let prevCreateMenuGroupId = $state('');
	let prevEditSeasonalMenuId = $state('');
	let prevEditMenuGroupId = $state('');

	$effect(() => {
		const current = newMenu.seasonal_menu_id || '';
		if (prevCreateSeasonalMenuId !== '' && current !== prevCreateSeasonalMenuId) {
			newMenu.menu_group_id = '';
			newMenu.category = '';
		}
		prevCreateSeasonalMenuId = current;
	});

	$effect(() => {
		const current = newMenu.menu_group_id || '';
		if (prevCreateMenuGroupId !== '' && current !== prevCreateMenuGroupId) {
			newMenu.category = '';
		}
		prevCreateMenuGroupId = current;
	});

	$effect(() => {
		const current = menuEditForm.seasonal_menu_id || '';
		if (prevEditSeasonalMenuId !== '' && current !== prevEditSeasonalMenuId) {
			menuEditForm.menu_group_id = '';
			menuEditForm.category = '';
		}
		prevEditSeasonalMenuId = current;
	});

	$effect(() => {
		const current = menuEditForm.menu_group_id || '';
		if (prevEditMenuGroupId !== '' && current !== prevEditMenuGroupId) {
			menuEditForm.category = '';
		}
		prevEditMenuGroupId = current;
	});

	// Allergen Report Table - compute rows grouped by menu
	const allergenColors: Record<string, string> = {
		'牛肉': 'bg-red-500', '豚肉': 'bg-red-400', '鶏肉': 'bg-red-300',
		'小麦': 'bg-amber-500', '大麦': 'bg-amber-400', 'ライ麦': 'bg-amber-400', 'オーツ麦': 'bg-amber-400',
		'卵': 'bg-orange-500',
		'乳': 'bg-blue-500', 'チーズ': 'bg-blue-400',
		'えび': 'bg-pink-500', 'かに': 'bg-cyan-500',
		'大豆': 'bg-violet-500',
		'ごま': 'bg-yellow-600',
		'落花生': 'bg-amber-700', 'くるみ': 'bg-amber-600', 'カシューナッツ': 'bg-amber-600', 'アーモンド': 'bg-amber-600',
		'そば': 'bg-stone-500',
		'さば': 'bg-teal-500', 'さけ': 'bg-teal-400', 'いくら': 'bg-teal-400', 'あわび': 'bg-teal-400', 'いか': 'bg-teal-400',
	};

	function getAllergenColor(name: string): string {
		return allergenColors[name] || 'bg-gray-500';
	}

	// Allergen table grouped by course then by menu
	type AllergenTableMenuGroup = {
		menu: Menu;
		products: { id: string; name: string; image_url: string | null; allergens: { id: string; name: string }[] }[];
	};

	type AllergenTableCourseGroup = {
		courseName: string;
		courseImage: string | null;
		menus: AllergenTableMenuGroup[];
	};

	const allergenTableGrouped = $derived.by(() => {
		const productMap = new Map(products.map(p => [p.id, p]));
		const groups: AllergenTableMenuGroup[] = [];
		for (const menu of menus) {
			const prods = (menu.products || [])
				.filter(p => (p.allergens || []).length > 0)
				.map(p => ({ id: p.id, name: p.name, image_url: productMap.get(p.id)?.image_url || null, allergens: p.allergens || [] }));
			if (prods.length > 0) {
				groups.push({ menu, products: prods });
			}
		}
		return groups;
	});

	const allergenTableByCourse = $derived.by(() => {
		const courseMap = new Map<string, AllergenTableCourseGroup>();
		for (const group of allergenTableGrouped) {
			const courseValue = group.menu.category || 'uncategorized';
			const cat = menuCategories.find(c => c.value === courseValue);
			const courseName = cat?.label || courseValue;
			const courseImage = cat?.image_url || null;
			if (!courseMap.has(courseValue)) {
				courseMap.set(courseValue, { courseName, courseImage, menus: [] });
			}
			courseMap.get(courseValue)!.menus.push(group);
		}
		return Array.from(courseMap.values());
	});

	let showAllergenReport = $state(false);
	let isExporting = $state(false);
	let isPrinting = $state(false);
	let allergenReportSearch = $state('');

	const filteredAllergenTableByCourse = $derived.by(() => {
		const q = allergenReportSearch.trim().toLowerCase();
		if (!q) return allergenTableByCourse;
		return allergenTableByCourse.filter(course => {
			if (course.courseName.toLowerCase().includes(q)) return true;
			return course.menus.some(group =>
				group.products.some(product =>
					product.name.toLowerCase().includes(q) ||
					product.allergens.some(a => a.name.toLowerCase().includes(q))
				)
			);
		});
	});

	async function exportAllergenXlsx() {
		isExporting = true;
		try {
			const { utils, writeFile } = await import('xlsx');
			const wsData: string[][] = [['コース', '商品/食材', 'アレルギー']];
			for (const course of allergenTableByCourse) {
				let isCourseFirst = true;
				for (const group of course.menus) {
					for (const product of group.products) {
						wsData.push([
							isCourseFirst ? course.courseName : '',
							product.name,
							product.allergens.map(a => a.name).join('、'),
						]);
						isCourseFirst = false;
					}
				}
			}
			const ws = utils.aoa_to_sheet(wsData);
			ws['!cols'] = [{ wch: 20 }, { wch: 40 }, { wch: 40 }];
			const wb = utils.book_new();
			utils.book_append_sheet(wb, ws, 'Allergen Report');
			const today = new Date().toISOString().split('T')[0];
			writeFile(wb, `allergen-report-${today}.xlsx`);
		} catch (e) {
			console.error('Export failed:', e);
		} finally {
			isExporting = false;
		}
	}

	const allergenHexColors: Record<string, string> = {
		'牛肉': '#ef4444', '豚肉': '#f87171', '鶏肉': '#fca5a5',
		'小麦': '#f59e0b', '大麦': '#fbbf24', 'ライ麦': '#fbbf24', 'オーツ麦': '#fbbf24',
		'卵': '#f97316',
		'乳': '#3b82f6', 'チーズ': '#60a5fa',
		'えび': '#ec4899', 'かに': '#06b6d4',
		'大豆': '#8b5cf6',
		'ごま': '#ca8a04',
		'落花生': '#92400e', 'くるみ': '#d97706', 'カシューナッツ': '#d97706', 'アーモンド': '#d97706',
		'そば': '#78716c',
		'さば': '#14b8a6', 'さけ': '#2dd4bf', 'いくら': '#2dd4bf', 'あわび': '#2dd4bf', 'いか': '#2dd4bf',
	};

	function getAllergenHexColor(name: string): string {
		return allergenHexColors[name] || '#6b7280';
	}

	function printAllergenReport() {
		isPrinting = true;
		try {
			const today = new Date().toISOString().split('T')[0];
			let coursesHtml = '';
			for (const course of allergenTableByCourse) {
				const courseImgHtml = course.courseImage
					? `<img src="${course.courseImage}" style="width:100%;height:100%;object-fit:cover;" />`
					: `<div style="width:100%;height:100%;background:#334155;display:flex;align-items:center;justify-content:center;"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>`;

				let productsHtml = '';
				let idx = 0;
				for (let gi = 0; gi < course.menus.length; gi++) {
					const group = course.menus[gi];
					for (let pi = 0; pi < group.products.length; pi++) {
						const product = group.products[pi];
						const bgColor = pi % 2 === 0 ? '#ffffff' : '#f9fafb';
						const groupBorder = pi === 0 && gi > 0 ? 'border-top:2px solid #e2e8f0;' : 'border-top:1px solid #f3f4f6;';
						const productImgHtml = product.image_url
							? `<img src="${product.image_url}" style="width:36px;height:36px;border-radius:4px;object-fit:cover;flex-shrink:0;" />`
							: `<div style="width:36px;height:36px;border-radius:4px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg></div>`;

						const allergensHtml = product.allergens.map(a =>
							`<span style="display:inline-block;padding:2px 8px;background:${getAllergenHexColor(a.name)};color:white;font-size:10px;font-weight:500;border-radius:4px;margin:1px;">${a.name}</span>`
						).join('');

						productsHtml += `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:${bgColor};${groupBorder}">
							${productImgHtml}
							<span style="font-size:13px;font-weight:500;color:#1f2937;width:140px;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${product.name}</span>
							<div style="display:flex;flex-wrap:wrap;gap:3px;flex:1;">${allergensHtml}</div>
						</div>`;

						// Alternate products
						const alts = getAlternatesForProduct(product.id);
						for (const alt of alts) {
							const altImgHtml = alt.image_url
								? `<img src="${alt.image_url}" style="width:28px;height:28px;border-radius:4px;object-fit:cover;flex-shrink:0;" />`
								: `<div style="width:28px;height:28px;border-radius:4px;background:#fff7ed;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fdba74" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg></div>`;
							const altAllergensHtml = (alt.allergens || []).map(a =>
								`<span style="display:inline-block;padding:1px 6px;background:${getAllergenHexColor(a.name)};color:white;font-size:9px;font-weight:500;border-radius:4px;margin:1px;">${a.name}</span>`
							).join('');

							productsHtml += `<div style="display:flex;align-items:center;gap:8px;padding:4px 12px 4px 32px;background:#fff7ed40;border-top:1px solid #f3f4f6;">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fb923c" stroke-width="2" style="flex-shrink:0;"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
								${altImgHtml}
								<span style="font-size:11px;font-weight:500;color:#c2410c;width:140px;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${alt.name}</span>
								<div style="display:flex;flex-wrap:wrap;gap:2px;flex:1;">${altAllergensHtml}</div>
							</div>`;
						}

						idx++;
					}
				}

				const totalProducts = course.menus.reduce((sum: number, g: AllergenTableMenuGroup) => sum + g.products.length, 0);
				coursesHtml += `<div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:16px;display:flex;break-inside:avoid;">
					<div style="width:140px;flex-shrink:0;background:#1e293b;overflow:hidden;">${courseImgHtml}</div>
					<div style="flex:1;min-width:0;">
						<div style="background:white;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e5e7eb;">
							<span style="color:#111827;font-size:16px;font-weight:700;letter-spacing:0.5px;">${course.courseName}</span>
							<span style="color:#9ca3af;font-size:11px;">${totalProducts} products</span>
						</div>
						${productsHtml}
					</div>
				</div>`;
			}

			const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>アレルゲン一覧表 - ${today}</title>
<style>
	@page { size: A4 portrait; margin: 15mm 12mm; }
	* { margin: 0; padding: 0; box-sizing: border-box; }
	body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1f2937; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
	.header { text-align: center; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #e5e7eb; }
	.header h1 { font-size: 20px; font-weight: 700; color: #0f172a; }
	.header p { font-size: 11px; color: #9ca3af; margin-top: 4px; }
	.footer { text-align: center; font-size: 9px; color: #9ca3af; margin-top: 16px; padding-top: 8px; border-top: 1px solid #e5e7eb; }
</style>
</head>
<body>
<div class="header">
	<h1>アレルゲン一覧表</h1>
	<p>Allergen Report | ${today} | ${allergenTableByCourse.length} courses</p>
</div>
${coursesHtml}
<div class="footer">Generated: ${today} | ${allergenTableByCourse.length} courses, ${allergenTableGrouped.length} menu entries</div>
</body>
</html>`;

			const printWindow = window.open('', '_blank');
			if (printWindow) {
				printWindow.document.write(html);
				printWindow.document.close();
				printWindow.onload = () => {
					printWindow.print();
				};
			}
		} catch (e) {
			console.error('Print failed:', e);
		} finally {
			isPrinting = false;
		}
	}

	function resetNewMenu() {
		newMenu = {
			name: '',
			description: '',
			price: null,
			category: '',
			seasonal_menu_id: '',
			menu_group_id: '',
			image_url: null,
			is_available: true,
			product_ids: [],
		};
		if (menuImagePreview) URL.revokeObjectURL(menuImagePreview);
		menuImageFile = null;
		menuImagePreview = null;
		createMenuError = null;
		createMenuSuccess = false;
		productSearchTerm = '';
	}

	function handleMenuImageInput(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			const file = input.files[0];
			if (!file.type.startsWith('image/')) {
				createMenuError = 'Please select an image file';
				return;
			}
			menuImageFile = file;
			if (menuImagePreview) URL.revokeObjectURL(menuImagePreview);
			menuImagePreview = URL.createObjectURL(file);
			createMenuError = null;
		}
	}

	function clearMenuImage() {
		if (menuImagePreview) URL.revokeObjectURL(menuImagePreview);
		menuImageFile = null;
		menuImagePreview = null;
		newMenu.image_url = null;
	}

	function addProductToMenu(productId: string) {
		const ids = newMenu.product_ids || [];
		if (!ids.includes(productId)) {
			newMenu.product_ids = [...ids, productId];
		}
		productSearchTerm = '';
	}

	function removeProductFromMenu(productId: string) {
		newMenu.product_ids = (newMenu.product_ids || []).filter(id => id !== productId);
	}

	async function handleCreateMenu() {
		if (!newMenu.name.trim()) {
			createMenuError = 'Menu name is required';
			return;
		}
		isCreatingMenu = true;
		createMenuError = null;
		try {
			if (menuImageFile) {
				isUploadingMenuImage = true;
				const imageUrl = await uploadImage(menuImageFile);
				newMenu.image_url = imageUrl;
				isUploadingMenuImage = false;
			}

			const menuData = { ...newMenu, seasonal_menu_id: newMenu.seasonal_menu_id || null, menu_group_id: newMenu.menu_group_id || null };
			await createMenu(menuData);
			await loadMenus();
			createMenuSuccess = true;
			setTimeout(() => {
				resetNewMenu();
			}, 2000);
		} catch (e: any) {
			createMenuError = e.message || 'Failed to create menu';
		} finally {
			isCreatingMenu = false;
			isUploadingMenuImage = false;
		}
	}

	function toggleMenu(id: string) {
		expandedMenuId = expandedMenuId === id ? null : id;
		if (expandedMenuId !== id) {
			editingMenuId = null;
		}
	}

	// Edit mode product search
	let editProductSearchTerm = $state('');
	let editProductSearchFocused = $state(false);
	const availableProductsForEdit = $derived(
		products.filter(p =>
			!(menuEditForm.product_ids || []).includes(p.id) &&
			(editProductSearchTerm === '' || p.name.toLowerCase().includes(editProductSearchTerm.toLowerCase()))
		)
	);
	const selectedProductsForEdit = $derived(
		products.filter(p => (menuEditForm.product_ids || []).includes(p.id))
	);
	const derivedEditAllergens = $derived(() => {
		const allergenMap = new Map<string, Allergen>();
		for (const product of selectedProductsForEdit) {
			for (const allergen of product.allergens || []) {
				if (!allergenMap.has(allergen.id)) {
					allergenMap.set(allergen.id, allergen);
				}
			}
		}
		return Array.from(allergenMap.values());
	});

	function addProductToEdit(productId: string) {
		const ids = menuEditForm.product_ids || [];
		if (!ids.includes(productId)) {
			menuEditForm.product_ids = [...ids, productId];
		}
		editProductSearchTerm = '';
	}

	function removeProductFromEdit(productId: string) {
		menuEditForm.product_ids = (menuEditForm.product_ids || []).filter(id => id !== productId);
	}

	function startEditingMenu(menu: Menu) {
		editingMenuId = menu.id;
		menuEditForm = {
			name: menu.name,
			description: menu.description,
			price: menu.price,
			category: menu.category,
			seasonal_menu_id: menu.seasonal_menu_id || '',
			menu_group_id: menu.menu_group_id,
			is_available: menu.is_available,
			product_ids: menu.products.map(p => p.id),
		};
		saveMenuError = null;
		editProductSearchTerm = '';
		editProductSearchFocused = false;
	}

	function cancelEditingMenu() {
		editingMenuId = null;
		menuEditForm = {};
		saveMenuError = null;
	}

	async function saveMenu(id: string) {
		isSavingMenu = true;
		saveMenuError = null;
		try {
			const editData = { ...menuEditForm, seasonal_menu_id: menuEditForm.seasonal_menu_id || null, menu_group_id: menuEditForm.menu_group_id || null } as UpdateMenuData;
			await updateMenu(id, editData);
			await loadMenus();
			editingMenuId = null;
			menuEditForm = {};
		} catch (e: any) {
			saveMenuError = e.message || 'Failed to save';
		} finally {
			isSavingMenu = false;
		}
	}

	function openDeleteMenuModal(id: string) {
		menuToDelete = id;
		showDeleteMenuModal = true;
	}

	function closeDeleteMenuModal() {
		showDeleteMenuModal = false;
		menuToDelete = null;
	}

	async function confirmDeleteMenu() {
		if (!menuToDelete) return;
		isDeletingMenu = true;
		try {
			await deleteMenu(menuToDelete);
			await loadMenus();
			expandedMenuId = null;
			editingMenuId = null;
			closeDeleteMenuModal();
		} catch (e: any) {
			alert(e.message || 'Failed to delete');
		} finally {
			isDeletingMenu = false;
		}
	}

	async function loadMenus() {
		try {
			isLoadingMenus = true;
			menus = await getMenus();
		} catch (e) {
			console.error('Failed to load menus:', e);
		} finally {
			isLoadingMenus = false;
		}
	}

	onMount(async () => {
		await Promise.all([loadProducts(), loadAllergens(), loadMenus(), loadCategories(), loadAlternates()]);
	});

	async function loadCategories() {
		try {
			const [productCats, menuCats, groups, seasons] = await Promise.all([
				getCategories('product'),
				getCategories('menu'),
				getMenuGroups(),
				getSeasonalMenus(),
			]);
			productCategories = productCats.map(c => ({ value: c.value, label: c.name, id: c.id }));
			menuCategories = menuCats.map(c => ({ value: c.value, label: c.name, id: c.id, image_url: c.image_url, description: c.description, price: c.price }));
			menuGroups = groups;
			seasonalMenus = seasons;
		} catch (e) {
			console.error('Failed to load categories:', e);
		}
	}

	async function loadAllergens() {
		try {
			allergens = await getAllergens();
		} catch (e) {
			console.error('Failed to load allergens:', e);
		}
	}

	async function loadProducts() {
		try {
			isLoading = true;
			products = await getProducts();
		} catch (e) {
			console.error('Failed to load products:', e);
		} finally {
			isLoading = false;
		}
	}

	// Scanner Functions
	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragOver = true;
	}

	function handleDragLeave() {
		dragOver = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		const files = e.dataTransfer?.files;
		if (files && files.length > 0) handleFile(files[0]);
	}

	function handleFileInput(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files && input.files.length > 0) handleFile(input.files[0]);
	}

	async function handleFile(file: File) {
		if (!file.type.startsWith('image/')) {
			scanError = 'Please select an image file';
			return;
		}
		const compressed = await compressImageForOCR(file);
		selectedFile = compressed;
		previewUrl = URL.createObjectURL(compressed);
		scanError = null;
		scanResult = null;
		scanExtractData = null;
		scanSaveSuccess = false;
		scanSaveError = null;
	}

	function clearSelection() {
		selectedFile = null;
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		previewUrl = null;
		scanResult = null;
		scanError = null;
		scanExtractData = null;
		scanSaveSuccess = false;
		scanSaveError = null;
	}

	async function openCamera() {
		cameraError = null;
		showCamera = true;
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: {
					facingMode: 'environment',
					width: { ideal: 2560 },
					height: { ideal: 1920 }
				}
			});
			cameraStream = stream;
			if (videoEl) {
				videoEl.srcObject = stream;
			}
		} catch (err: any) {
			cameraError = err.name === 'NotAllowedError'
				? 'Camera permission denied. Please allow camera access.'
				: 'Could not access camera: ' + (err.message || 'Unknown error');
			showCamera = false;
		}
	}

	function capturePhoto() {
		if (!videoEl) return;
		const canvas = document.createElement('canvas');
		canvas.width = videoEl.videoWidth;
		canvas.height = videoEl.videoHeight;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		ctx.drawImage(videoEl, 0, 0);
		canvas.toBlob((blob) => {
			if (blob) {
				const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
				handleFile(file);
			}
			closeCamera();
		}, 'image/jpeg', 1.0);
	}

	function closeCamera() {
		if (cameraStream) {
			cameraStream.getTracks().forEach(track => track.stop());
			cameraStream = null;
		}
		showCamera = false;
		cameraError = null;
	}

	// Wire up camera stream to video element when both are ready
	$effect(() => {
		if (videoEl && cameraStream) {
			videoEl.srcObject = cameraStream;
		}
		return () => {
			if (cameraStream) {
				cameraStream.getTracks().forEach(track => track.stop());
			}
		};
	});

	async function startScan() {
		if (!selectedFile) return;
		isScanning = true;
		scanError = null;
		scanExtractData = null;
		scanSaveSuccess = false;
		scanSaveError = null;

		try {
			// 1. Upload image to Supabase storage
			const imageUrl = await uploadImage(selectedFile);

			// 2. Call extract-only API (no auto-save)
			const result = await scanExtract(imageUrl);
			scanExtractData = result;

			// 3. Populate review form with extracted data
			const d = result.extracted_data;
			scanReviewProduct = {
				name: d.product_name || '',
				brand: d.brand || '',
				category: d.category || '',
				ingredients_raw: d.ingredients_raw || '',
				storage_instructions: d.storage_instructions || '',
				preparation_instructions: d.preparation_instructions || '',
				is_vegetarian: d.is_vegetarian,
				is_vegan: d.is_vegan,
				is_halal: d.is_halal,
				is_gluten_free: d.is_gluten_free,
				allergen_ids: result.matched_allergens.map(a => a.id),
				image_url: result.image_url,
			};
		} catch (e: any) {
			scanError = e.message || 'Scan failed';
		} finally {
			isScanning = false;
		}
	}

	async function confirmScanSave() {
		if (!scanReviewProduct.name.trim()) {
			scanSaveError = 'Product name is required';
			return;
		}
		isSavingScan = true;
		scanSaveError = null;

		try {
			await createProduct(scanReviewProduct);
			await loadProducts();
			scanSaveSuccess = true;
		} catch (e: any) {
			scanSaveError = e.message || 'Failed to save product';
		} finally {
			isSavingScan = false;
		}
	}

	function scanAnother() {
		clearSelection();
		scanExtractData = null;
		scanSaveSuccess = false;
		scanSaveError = null;
		scanReviewProduct = {
			name: '',
			brand: '',
			category: '',
			ingredients_raw: '',
			storage_instructions: '',
			preparation_instructions: '',
			is_vegetarian: false,
			is_vegan: false,
			is_halal: false,
			is_gluten_free: false,
			allergen_ids: [],
			image_url: null,
		};
	}
</script>

<svelte:head>
	<title>Hotel Front Agent - Allergen Management</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="flex h-screen bg-gray-100 font-['Noto_Sans_JP',sans-serif]">
	<Sidebar sections={sidebarSections} bind:collapsed={sidebarCollapsed} bind:mobileOpen={sidebarMobileOpen} />

	<!-- Main Content -->
	<div class="flex-1 flex flex-col overflow-hidden">
		<header class="bg-white border-b border-gray-200 shrink-0">
			<div class="h-16 flex items-center justify-between px-4 md:px-6">
				<div class="flex items-center gap-3">
					<button
						onclick={() => sidebarMobileOpen = true}
						class="md:hidden p-1.5 -ml-1 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
						aria-label="メニューを開く"
					>
						<span class="material-symbols-rounded text-xl">menu</span>
					</button>
					<h2 class="text-lg font-bold text-gray-900">{mainTab === 'products' ? '商品管理' : 'メニュー管理'}</h2>
					<span class="text-sm text-gray-500 hidden sm:inline">Allergen Management System</span>
				</div>
				<div class="flex items-center gap-3">
					{#if mainTab === 'products' && isStaff}
						<button
							onclick={() => showAddProduct = !showAddProduct}
							class="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
							</svg>
							Add Product
						</button>
					{/if}
					{#if !authState.isStaff && !authState.loading}
						<a
							href="/login"
							class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
						>
							<span class="material-symbols-rounded text-lg">login</span>
							ログイン
						</a>
					{/if}
				</div>
			</div>
			{#if !isStaff && !authState.loading}
				<div class="bg-amber-50 border-t border-amber-200 px-4 md:px-6 py-2 flex items-center gap-2">
					<span class="material-symbols-rounded text-amber-600 text-lg">visibility</span>
					<span class="text-sm text-amber-700">閲覧モード — スタッフとしてログインすると編集できます</span>
				</div>
			{/if}
		</header>

		<main class="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 md:space-y-6">
			<div class="max-w-5xl lg:max-w-7xl mx-auto space-y-4 md:space-y-6">

		{#if mainTab === 'products'}
		<!-- Add Product Section (always visible on mobile, toggle on desktop) -->
		{#if isStaff}
		<section class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 {showAddProduct ? '' : 'md:hidden'}">
			<!-- Tab Header -->
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-lg font-semibold text-gray-900">Add Product</h2>
				<div class="flex bg-gray-100 rounded-lg p-1">
					<button
						onclick={() => { addMode = 'scan'; resetNewProduct(); }}
						class="px-3 py-1.5 text-sm rounded-md transition-colors {addMode === 'scan' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'}"
					>
						Scan Image
					</button>
					<button
						onclick={() => { addMode = 'manual'; clearSelection(); }}
						class="px-3 py-1.5 text-sm rounded-md transition-colors {addMode === 'manual' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'}"
					>
						Add Manually
					</button>
				</div>
			</div>

			{#if addMode === 'scan'}
				<!-- Scan Mode -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<!-- Upload Area -->
					<div>
						{#if showCamera}
							<!-- Mobile: fullscreen camera overlay -->
							<div class="fixed inset-0 z-50 bg-black flex flex-col md:relative md:inset-auto md:z-auto md:bg-transparent md:rounded-lg md:overflow-hidden">
								<video bind:this={videoEl} autoplay playsinline muted class="flex-1 object-cover w-full md:rounded-lg md:object-contain"></video>
								{#if cameraError}
									<div class="absolute top-12 left-4 right-4 md:static md:mt-2 md:mx-0">
										<p class="text-red-400 text-sm bg-black/70 rounded-lg px-3 py-2 md:bg-transparent md:text-red-600 md:p-0">{cameraError}</p>
									</div>
								{/if}
								<!-- Mobile: bottom controls -->
								<div class="absolute bottom-0 left-0 right-0 p-6 pb-10 flex items-center justify-center gap-6 bg-gradient-to-t from-black/80 to-transparent md:hidden">
									<button
										onclick={closeCamera}
										class="w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center backdrop-blur-sm"
									>
										<span class="material-symbols-rounded text-2xl">close</span>
									</button>
									<button
										onclick={capturePhoto}
										class="rounded-full bg-white flex items-center justify-center shadow-lg"
										style="width: 72px; height: 72px;"
									>
										<div class="rounded-full border-4 border-gray-300" style="width: 62px; height: 62px;"></div>
									</button>
									<div class="w-12 h-12"></div>
								</div>
								<!-- Desktop: inline controls -->
								<div class="hidden md:flex mt-3 gap-2">
									<button
										onclick={capturePhoto}
										class="flex-1 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
										</svg>
										Capture
									</button>
									<button onclick={closeCamera} class="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
										Cancel
									</button>
								</div>
							</div>
						{:else if !previewUrl}
							<div
								class="border-2 border-dashed rounded-lg p-6 text-center transition-colors {dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}"
								ondragover={handleDragOver}
								ondragleave={handleDragLeave}
								ondrop={handleDrop}
							>
								<svg class="w-10 h-10 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
								</svg>
								<p class="text-gray-600 text-sm mb-3">Drag & drop or browse</p>
								<div class="flex gap-2 justify-center">
									<label class="cursor-pointer px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
										Choose File
										<input type="file" accept="image/*" class="hidden" onchange={handleFileInput} />
									</label>
									<button onclick={openCamera} class="px-3 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
										Camera
									</button>
								</div>
							</div>
						{:else}
							<div class="relative">
								<img src={previewUrl} alt="Preview" class="w-full rounded-lg object-contain max-h-48" />
								<button onclick={clearSelection} class="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>
						<div class="mt-3 flex gap-2">
							<button
								onclick={startScan}
								disabled={isScanning}
								class="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
							>
								{#if isScanning}
									<svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
									Scanning...
								{:else}
									Scan
								{/if}
							</button>
							<button onclick={clearSelection} class="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
								Clear
							</button>
						</div>
					{/if}
					{#if scanError}
						<p class="mt-2 text-red-600 text-sm">{scanError}</p>
					{/if}
				</div>

				<!-- Results / Review Form -->
				<div>
					{#if isScanning}
						<div class="flex flex-col items-center justify-center h-full py-8 text-center">
							<svg class="w-8 h-8 text-blue-600 animate-pulse mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
							</svg>
							<p class="text-gray-600 text-sm">Analyzing image...</p>
							<p class="text-gray-400 text-xs mt-1">This may take a few seconds</p>
						</div>
					{:else if scanSaveSuccess}
						<div class="space-y-4 py-4">
							<div class="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
								<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
								<span class="text-green-700 text-sm font-medium">Product saved successfully!</span>
							</div>
							<button onclick={scanAnother} class="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
								Scan Another
							</button>
						</div>
					{:else if scanExtractData}
						<!-- Editable review form pre-filled with OCR data -->
						<div class="space-y-4">
							<div class="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
								<svg class="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								<span class="text-blue-700 text-xs">Review extracted data and confirm to save</span>
							</div>

							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<!-- Left Column -->
								<div class="space-y-3">
									<div>
										<label class="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
										<input
											type="text"
											bind:value={scanReviewProduct.name}
											placeholder="Product name"
											class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
										/>
									</div>

									<div class="grid grid-cols-2 gap-3">
										<div>
											<label class="block text-sm font-medium text-gray-700 mb-1">Brand</label>
											<input
												type="text"
												bind:value={scanReviewProduct.brand}
												placeholder="Brand"
												class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
											/>
										</div>
										<div>
											<label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
											<CustomSelect
												bind:value={scanReviewProduct.category}
												options={productCategories.map(c => ({ value: c.value, label: c.label }))}
												placeholder="Select..."
											/>
										</div>
									</div>

									<div>
										<label class="block text-sm font-medium text-gray-700 mb-2">Dietary Information</label>
										<div class="grid grid-cols-2 gap-2">
											<label class="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors {scanReviewProduct.is_vegetarian ? 'bg-green-100 ring-2 ring-green-300' : 'bg-gray-50 hover:bg-gray-100'}">
												<input type="checkbox" bind:checked={scanReviewProduct.is_vegetarian} class="w-4 h-4 text-green-600 rounded" />
												<span class="text-sm {scanReviewProduct.is_vegetarian ? 'text-green-700 font-medium' : ''}">Vegetarian</span>
											</label>
											<label class="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors {scanReviewProduct.is_vegan ? 'bg-green-100 ring-2 ring-green-300' : 'bg-gray-50 hover:bg-gray-100'}">
												<input type="checkbox" bind:checked={scanReviewProduct.is_vegan} class="w-4 h-4 text-green-600 rounded" />
												<span class="text-sm {scanReviewProduct.is_vegan ? 'text-green-700 font-medium' : ''}">Vegan</span>
											</label>
											<label class="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors {scanReviewProduct.is_halal ? 'bg-emerald-100 ring-2 ring-emerald-300' : 'bg-gray-50 hover:bg-gray-100'}">
												<input type="checkbox" bind:checked={scanReviewProduct.is_halal} class="w-4 h-4 text-emerald-600 rounded" />
												<span class="text-sm {scanReviewProduct.is_halal ? 'text-emerald-700 font-medium' : ''}">Halal</span>
											</label>
											<label class="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors {scanReviewProduct.is_gluten_free ? 'bg-amber-100 ring-2 ring-amber-300' : 'bg-gray-50 hover:bg-gray-100'}">
												<input type="checkbox" bind:checked={scanReviewProduct.is_gluten_free} class="w-4 h-4 text-amber-600 rounded" />
												<span class="text-sm {scanReviewProduct.is_gluten_free ? 'text-amber-700 font-medium' : ''}">Gluten-Free</span>
											</label>
										</div>
									</div>

									<div>
										<label class="block text-sm font-medium text-gray-700 mb-2">Allergens</label>
										<!-- Selected allergens shown at top -->
										{#if (scanReviewProduct.allergen_ids || []).length > 0}
											<div class="mb-2">
												<p class="text-xs text-gray-500 mb-1">Selected ({(scanReviewProduct.allergen_ids || []).length})</p>
												<div class="flex flex-wrap gap-1.5">
													{#each allergens.filter(a => (scanReviewProduct.allergen_ids || []).includes(a.id)) as allergen}
														<button
															type="button"
															onclick={() => toggleScanAllergen(allergen.id)}
															class="px-2.5 py-1 rounded-md text-sm bg-red-100 text-red-700 ring-2 ring-red-300 flex items-center gap-1"
														>
															{allergen.name}
															<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
														</button>
													{/each}
												</div>
											</div>
										{/if}
										<!-- Search and all allergens -->
										<div class="mb-2">
											<input type="text" bind:value={scanAllergenSearch} placeholder="Search allergens..." class="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
										</div>
										<div class="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-lg max-h-32 overflow-y-auto">
											{#each scanSearchedAllergens.filter(a => !(scanReviewProduct.allergen_ids || []).includes(a.id)) as allergen}
												<button
													type="button"
													onclick={() => toggleScanAllergen(allergen.id)}
													class="px-2.5 py-1 rounded-md text-sm transition-colors bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
												>
													{allergen.name}
												</button>
											{/each}
											{#if scanSearchedAllergens.filter(a => !(scanReviewProduct.allergen_ids || []).includes(a.id)).length === 0}
												<span class="text-gray-400 text-xs">All allergens selected or no results</span>
											{/if}
										</div>
									</div>
								</div>

								<!-- Right Column -->
								<div class="space-y-3">
									<div>
										<label class="block text-sm font-medium text-gray-700 mb-1">Ingredients</label>
										<textarea
											bind:value={scanReviewProduct.ingredients_raw}
											rows="3"
											placeholder="Ingredients list..."
											class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
										></textarea>
									</div>

									<div>
										<label class="block text-sm font-medium text-gray-700 mb-1">Storage Instructions</label>
										<textarea
											bind:value={scanReviewProduct.storage_instructions}
											rows="2"
											placeholder="Storage instructions..."
											class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
										></textarea>
									</div>

									<div>
										<label class="block text-sm font-medium text-gray-700 mb-1">Preparation Instructions</label>
										<textarea
											bind:value={scanReviewProduct.preparation_instructions}
											rows="2"
											placeholder="Preparation instructions..."
											class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
										></textarea>
									</div>
								</div>
							</div>

							{#if scanSaveError}
								<p class="text-red-600 text-sm">{scanSaveError}</p>
							{/if}

							<div class="flex gap-2 pt-2">
								<button
									onclick={confirmScanSave}
									disabled={isSavingScan}
									class="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
								>
									{#if isSavingScan}
										<svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
										Saving...
									{:else}
										Confirm & Save
									{/if}
								</button>
								<button onclick={scanAnother} class="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
									Discard
								</button>
							</div>
						</div>
					{:else}
						<div class="flex flex-col items-center justify-center h-full py-8 text-center text-gray-400">
							<svg class="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
							</svg>
							<p class="text-sm">Upload an image to scan</p>
						</div>
					{/if}
				</div>
			</div>
			{:else}
				<!-- Manual Add Mode -->
				<div class="space-y-4">
					{#if createSuccess}
						<div class="flex items-center gap-2 p-4 bg-green-50 rounded-lg">
							<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
							<span class="text-green-700 text-sm font-medium">Product created successfully!</span>
						</div>
					{:else}
						<!-- Image Upload -->
						<div class="mb-4">
							<label class="block text-sm font-medium text-gray-700 mb-2">Product Image (Optional)</label>
							{#if !manualImagePreview}
								<div class="flex items-center gap-3">
									<label class="cursor-pointer px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 flex items-center gap-2">
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
										</svg>
										Choose Image
										<input type="file" accept="image/*" class="hidden" onchange={handleManualImageInput} />
									</label>
									<label class="cursor-pointer px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 flex items-center gap-2">
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
										</svg>
										Camera
										<input type="file" accept="image/*" capture="environment" class="hidden" onchange={handleManualImageInput} />
									</label>
									<span class="text-gray-400 text-xs">PNG, JPG up to 5MB</span>
								</div>
							{:else}
								<div class="flex items-start gap-3">
									<div class="relative">
										<img src={manualImagePreview} alt="Preview" class="w-24 h-24 object-cover rounded-lg" />
										<button
											onclick={clearManualImage}
											class="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
										>
											<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									</div>
									<div class="text-sm text-gray-500">
										<p class="font-medium text-gray-700">{manualImageFile?.name}</p>
										<p>{manualImageFile ? (manualImageFile.size / 1024).toFixed(1) + ' KB' : ''}</p>
									</div>
								</div>
							{/if}
						</div>

						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<!-- Left Column -->
							<div class="space-y-4">
								<div>
									<label class="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
									<input
										type="text"
										bind:value={newProduct.name}
										placeholder="e.g., House Special Curry"
										class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
								</div>
								<div class="grid grid-cols-2 gap-3">
									<div>
										<label class="block text-sm font-medium text-gray-700 mb-1">Brand</label>
										<input
											type="text"
											bind:value={newProduct.brand}
											placeholder="e.g., In-house"
											class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
										/>
									</div>
									<div>
										<div class="flex items-center justify-between mb-1">
											<label class="text-sm font-medium text-gray-700">Category</label>
											<button type="button" onclick={openManageProductCategories} class="p-0.5 text-gray-400 hover:text-blue-600 transition-colors" title="Manage categories">
												<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
											</button>
										</div>
										<CustomSelect
											bind:value={newProduct.category}
											options={productCategories.map(c => ({ value: c.value, label: c.label }))}
											placeholder="Select..."
										/>
									</div>
								</div>

								<!-- Dietary Info -->
								<div>
									<label class="block text-sm font-medium text-gray-700 mb-2">Dietary Information</label>
									<div class="grid grid-cols-2 gap-2">
										<label class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
											<input type="checkbox" bind:checked={newProduct.is_vegetarian} class="w-4 h-4 text-green-600 rounded" />
											<span class="text-sm">Vegetarian</span>
										</label>
										<label class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
											<input type="checkbox" bind:checked={newProduct.is_vegan} class="w-4 h-4 text-green-600 rounded" />
											<span class="text-sm">Vegan</span>
										</label>
										<label class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
											<input type="checkbox" bind:checked={newProduct.is_halal} class="w-4 h-4 text-emerald-600 rounded" />
											<span class="text-sm">Halal</span>
										</label>
										<label class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
											<input type="checkbox" bind:checked={newProduct.is_gluten_free} class="w-4 h-4 text-amber-600 rounded" />
											<span class="text-sm">Gluten-Free</span>
										</label>
									</div>
								</div>

								<!-- Allergens Selection -->
								<div>
									<div class="flex items-center justify-between mb-2">
										<label class="text-sm font-medium text-gray-700">Allergens ({allergens.length})</label>
										<button type="button" onclick={openManageAllergens} class="p-0.5 text-gray-400 hover:text-red-600 transition-colors" title="Manage allergens">
											<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
										</button>
									</div>
									<div class="mb-2">
										<input type="text" bind:value={allergenSearch} placeholder="Search allergens..." class="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
									</div>
									<div class="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-lg">
										{#each searchedAllergens as allergen}
											<button
												type="button"
												onclick={() => toggleAllergen(allergen.id)}
												class="px-2.5 py-1 rounded-md text-sm transition-colors {(newProduct.allergen_ids || []).includes(allergen.id) ? 'bg-red-100 text-red-700 ring-2 ring-red-300' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}"
											>
												{allergen.name}
											</button>
										{/each}
										{#if allergens.length === 0}
											<p class="text-gray-400 text-sm">Loading allergens...</p>
										{/if}
									</div>
								</div>
							</div>

							<!-- Right Column -->
							<div class="space-y-4">
								<div>
									<label class="block text-sm font-medium text-gray-700 mb-1">Ingredients</label>
									<textarea
										bind:value={newProduct.ingredients_raw}
										rows="3"
										placeholder="List all ingredients..."
										class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
									></textarea>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700 mb-1">Storage Instructions</label>
									<textarea
										bind:value={newProduct.storage_instructions}
										rows="2"
										placeholder="How to store this product..."
										class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
									></textarea>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700 mb-1">Preparation Instructions</label>
									<textarea
										bind:value={newProduct.preparation_instructions}
										rows="2"
										placeholder="How to prepare/serve..."
										class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
									></textarea>
								</div>
							</div>
						</div>

						{#if createError}
							<p class="text-red-600 text-sm">{createError}</p>
						{/if}

						<div class="flex gap-2 pt-2">
							<button
								onclick={handleCreateProduct}
								disabled={isCreating}
								class="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
							>
								{#if isCreating}
									<svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
									{isUploadingImage ? 'Uploading image...' : 'Creating...'}
								{:else}
									Create Product
								{/if}
							</button>
							<button
								onclick={resetNewProduct}
								class="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50"
							>
								Clear
							</button>
						</div>
					{/if}
				</div>
			{/if}
		</section>
		{/if}

		<!-- Products Section -->
		<section class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 overflow-visible">
			<div class="flex items-center justify-between mb-3">
				<h2 class="text-lg font-semibold text-gray-900">Products ({filteredProducts.length}{selectedProductMenuGroup !== 'all' ? ` / ${products.length}` : ''})</h2>
				<input
					type="text"
					placeholder="Search..."
					bind:value={searchQuery}
					class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
				/>
			</div>

			{#if menuGroups.length > 0}
				<div class="flex flex-wrap gap-1.5 mb-4">
					<button
						onclick={() => selectedProductMenuGroup = 'all'}
						class="px-3 py-1 rounded-full text-xs font-medium transition-colors {selectedProductMenuGroup === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
					>
						All
					</button>
					{#each menuGroups as group}
						<button
							onclick={() => selectedProductMenuGroup = group.id}
							class="px-3 py-1 rounded-full text-xs font-medium transition-colors {selectedProductMenuGroup === group.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
						>
							{group.name}
						</button>
					{/each}
					<button
						onclick={() => selectedProductMenuGroup = 'unlinked'}
						class="px-3 py-1 rounded-full text-xs font-medium transition-colors {selectedProductMenuGroup === 'unlinked' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
					>
						Unlinked
					</button>
				</div>
			{/if}

			{#if isLoading}
				<div class="flex justify-center py-8">
					<svg class="w-6 h-6 text-gray-400 animate-spin" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
				</div>
			{:else if filteredProducts.length > 0}
				<div class="grid grid-cols-1 md:grid-cols-2 gap-3 {expandedProductId ? 'pb-[70vh]' : ''}">
					{#each filteredProducts as product}
						<div class="relative bg-gray-50 rounded-lg overflow-visible border border-gray-200">
							<!-- Product Header (clickable) -->
							<button
								onclick={() => toggleProduct(product.id)}
								class="w-full p-3 flex items-center gap-3 hover:bg-gray-100 transition-colors text-left"
							>
								{#if product.image_url}
									<button onclick={(e) => { e.stopPropagation(); expandedImageUrl = product.image_url; }} class="flex-shrink-0">
										<img src={product.image_url} alt={product.name} class="w-10 h-10 object-cover rounded-lg cursor-zoom-in" />
									</button>
								{:else}
									<div class="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
										<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
										</svg>
									</div>
								{/if}
								<div class="flex-1 min-w-0">
									<p class="font-medium text-gray-900 text-sm truncate">{product.name}</p>
									<div class="flex items-center gap-1 mt-0.5 flex-wrap">
										{#each product.allergens || [] as allergen}
											<span class="px-1.5 py-0 bg-red-100 text-red-700 rounded text-[10px] leading-4">{allergen.name}</span>
										{/each}
										{#if product.is_vegetarian}
											<span class="w-4 h-4 bg-green-100 text-green-700 rounded text-[10px] flex items-center justify-center" title="Vegetarian">V</span>
										{/if}
										{#if product.is_vegan}
											<span class="w-4 h-4 bg-green-100 text-green-700 rounded text-[10px] flex items-center justify-center" title="Vegan">VG</span>
										{/if}
										{#if product.is_halal}
											<span class="w-4 h-4 bg-emerald-100 text-emerald-700 rounded text-[10px] flex items-center justify-center" title="Halal">H</span>
										{/if}
										{#if product.is_gluten_free}
											<span class="w-4 h-4 bg-amber-100 text-amber-700 rounded text-[10px] flex items-center justify-center" title="Gluten-Free">GF</span>
										{/if}
									</div>
								</div>
								<svg class="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform {expandedProductId === product.id ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
								</svg>
							</button>

							<!-- Expanded Details (floating overlay) -->
							{#if expandedProductId === product.id}
							<div class="absolute left-0 right-0 top-full z-20 px-4 pb-4 border border-gray-200 rounded-b-lg bg-white max-h-[70vh] overflow-y-auto">
									<!-- Edit/View Toggle Buttons -->
									<div class="flex justify-end gap-2 pt-3 mb-3">
										{#if editingProductId === product.id}
											<button
												onclick={() => cancelEditing()}
												class="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
											>
												Cancel
											</button>
											<button
												onclick={() => saveProduct(product.id)}
												disabled={isSaving}
												class="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
											>
												{#if isSaving}
													<svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
												{/if}
												Save
											</button>
										{:else}
											{#if isStaff}
											<button
												onclick={() => startEditing(product)}
												class="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 flex items-center gap-1"
											>
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
												</svg>
												Edit
											</button>
											<button
												onclick={() => handleDeleteProduct(product.id)}
												class="px-3 py-1.5 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 flex items-center gap-1"
											>
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
												</svg>
												Delete
											</button>
											{/if}
										{/if}
									</div>

									{#if saveError}
										<p class="text-red-600 text-sm mb-3">{saveError}</p>
									{/if}

									{#if editingProductId === product.id}
										<!-- Edit Mode -->
										<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
											<!-- Left Column -->
											<div class="space-y-4">
												<!-- Basic Info -->
												<div>
													<label class="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
													<input
														type="text"
														bind:value={editForm.name}
														class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
													/>
												</div>
												<div class="grid grid-cols-2 gap-3">
													<div>
														<label class="block text-sm font-medium text-gray-700 mb-1">Brand</label>
														<input
															type="text"
															bind:value={editForm.brand}
															class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
														/>
													</div>
													<div>
														<div class="flex items-center justify-between mb-1">
															<label class="text-sm font-medium text-gray-700">Category</label>
															<button type="button" onclick={openManageProductCategories} class="p-0.5 text-gray-400 hover:text-blue-600 transition-colors" title="Manage categories">
																<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
															</button>
														</div>
														<CustomSelect
															bind:value={editForm.category}
															options={productCategories.map(c => ({ value: c.value, label: c.label }))}
															placeholder="Select..."
														/>
													</div>
												</div>

												<!-- Dietary Info -->
												<div>
													<label class="block text-sm font-medium text-gray-700 mb-2">Dietary Information</label>
													<div class="grid grid-cols-2 gap-2">
														<label class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
															<input type="checkbox" bind:checked={editForm.is_vegetarian} class="w-4 h-4 text-green-600 rounded" />
															<span class="text-sm">Vegetarian</span>
														</label>
														<label class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
															<input type="checkbox" bind:checked={editForm.is_vegan} class="w-4 h-4 text-green-600 rounded" />
															<span class="text-sm">Vegan</span>
														</label>
														<label class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
															<input type="checkbox" bind:checked={editForm.is_halal} class="w-4 h-4 text-emerald-600 rounded" />
															<span class="text-sm">Halal</span>
														</label>
														<label class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
															<input type="checkbox" bind:checked={editForm.is_gluten_free} class="w-4 h-4 text-amber-600 rounded" />
															<span class="text-sm">Gluten-Free</span>
														</label>
													</div>
												</div>

												<!-- Allergens (editable) -->
												<div>
													<div class="flex items-center justify-between mb-2">
														<label class="text-sm font-medium text-gray-700">Allergens ({allergens.length})</label>
														<button type="button" onclick={openManageAllergens} class="p-0.5 text-gray-400 hover:text-red-600 transition-colors" title="Manage allergens">
															<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
														</button>
													</div>
													<div class="mb-2">
														<input type="text" bind:value={editAllergenSearch} placeholder="Search allergens..." class="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
													</div>
													<div class="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-lg max-h-40 overflow-y-auto">
														{#each searchedEditAllergens as allergen}
															<button
																type="button"
																onclick={() => toggleEditAllergen(allergen.id)}
																class="px-2.5 py-1 rounded-md text-sm transition-colors {(editForm.allergen_ids || []).includes(allergen.id) ? 'bg-red-100 text-red-700 ring-2 ring-red-300' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}"
															>
																{allergen.name}
															</button>
														{/each}
														{#if allergens.length === 0}
															<p class="text-gray-400 text-sm">Loading allergens...</p>
														{/if}
													</div>
												</div>
											</div>

											<!-- Right Column -->
											<div class="space-y-4">
												<!-- Ingredients -->
												<div>
													<label class="block text-sm font-medium text-gray-700 mb-1">Ingredients</label>
													<textarea
														bind:value={editForm.ingredients_raw}
														rows="4"
														class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
													></textarea>
												</div>

												<!-- Storage Instructions -->
												<div>
													<label class="block text-sm font-medium text-gray-700 mb-1">Storage Instructions</label>
													<textarea
														bind:value={editForm.storage_instructions}
														rows="2"
														class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
													></textarea>
												</div>

												<!-- Preparation Instructions -->
												<div>
													<label class="block text-sm font-medium text-gray-700 mb-1">Preparation Instructions</label>
													<textarea
														bind:value={editForm.preparation_instructions}
														rows="2"
														class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
													></textarea>
												</div>
											</div>
										</div>
									{:else}
										<!-- View Mode -->
										<div class="space-y-4">
												<!-- Allergens -->
												<div>
													<h4 class="text-sm font-medium text-gray-700 mb-2">Allergens</h4>
													{#if product.allergens && product.allergens.length > 0}
														<div class="flex flex-wrap gap-1.5">
															{#each product.allergens as allergen}
																<span class="px-2.5 py-1 bg-red-100 text-red-700 rounded-md text-sm">{allergen.name}</span>
															{/each}
														</div>
													{:else}
														<p class="text-gray-400 text-sm">No allergens detected</p>
													{/if}
												</div>

												<!-- Dietary Info -->
												<div>
													<h4 class="text-sm font-medium text-gray-700 mb-2">Dietary Information</h4>
													<div class="flex flex-wrap gap-2">
														<span class="px-2.5 py-1 rounded-md text-sm {product.is_vegetarian ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}">
															{product.is_vegetarian ? '✓' : '✗'} Vegetarian
														</span>
														<span class="px-2.5 py-1 rounded-md text-sm {product.is_vegan ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}">
															{product.is_vegan ? '✓' : '✗'} Vegan
														</span>
														<span class="px-2.5 py-1 rounded-md text-sm {product.is_halal ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}">
															{product.is_halal ? '✓' : '✗'} Halal
														</span>
														<span class="px-2.5 py-1 rounded-md text-sm {product.is_gluten_free ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'}">
															{product.is_gluten_free ? '✓' : '✗'} Gluten-Free
														</span>
													</div>
												</div>

												<!-- Nutrition -->
												{#if product.nutrition_per_100g}
													<div>
														<h4 class="text-sm font-medium text-gray-700 mb-2">Nutrition (per 100g)</h4>
														<div class="grid grid-cols-5 gap-2 text-center">
															<div class="bg-gray-50 rounded-lg p-2">
																<p class="font-semibold text-gray-900">{product.nutrition_per_100g.calories || '-'}</p>
																<p class="text-xs text-gray-500">kcal</p>
															</div>
															<div class="bg-gray-50 rounded-lg p-2">
																<p class="font-semibold text-gray-900">{product.nutrition_per_100g.protein || '-'}g</p>
																<p class="text-xs text-gray-500">Protein</p>
															</div>
															<div class="bg-gray-50 rounded-lg p-2">
																<p class="font-semibold text-gray-900">{product.nutrition_per_100g.fat || '-'}g</p>
																<p class="text-xs text-gray-500">Fat</p>
															</div>
															<div class="bg-gray-50 rounded-lg p-2">
																<p class="font-semibold text-gray-900">{product.nutrition_per_100g.carbs || '-'}g</p>
																<p class="text-xs text-gray-500">Carbs</p>
															</div>
															<div class="bg-gray-50 rounded-lg p-2">
																<p class="font-semibold text-gray-900">{product.nutrition_per_100g.sodium || '-'}</p>
																<p class="text-xs text-gray-500">Sodium</p>
															</div>
														</div>
													</div>
												{/if}

												<!-- Ingredients -->
												{#if product.ingredients_raw}
													<div>
														<h4 class="text-sm font-medium text-gray-700 mb-2">Ingredients</h4>
														<p class="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 leading-relaxed">{product.ingredients_raw}</p>
													</div>
												{/if}

												<!-- Storage Instructions -->
												{#if product.storage_instructions}
													<div>
														<h4 class="text-sm font-medium text-gray-700 mb-2">Storage Instructions</h4>
														<p class="text-sm text-gray-600 bg-blue-50 rounded-lg p-3">{product.storage_instructions}</p>
													</div>
												{/if}

												<!-- Preparation Instructions -->
												{#if product.preparation_instructions}
													<div>
														<h4 class="text-sm font-medium text-gray-700 mb-2">Preparation</h4>
														<p class="text-sm text-gray-600 bg-amber-50 rounded-lg p-3">{product.preparation_instructions}</p>
													</div>
												{/if}
										</div>
									{/if}
							</div>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-center text-gray-400 py-8 text-sm">No products found</p>
			{/if}
		</section>
		{:else}
		<!-- Menu Tab Content -->
		<!-- Configure Menu Structure Button -->
		{#if isStaff}
		<div class="flex justify-end mb-3">
			<button
				onclick={() => showMenuTreeConfig = true}
				class="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm"
			>
				<svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
				</svg>
				Configure Menu Structure
			</button>
		</div>
		{/if}

		<!-- Add Menu Item Section -->
		{#if isStaff}
		<section class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
			<h2 class="text-lg font-semibold text-gray-900 mb-4">Add Menu Item</h2>

			{#if createMenuSuccess}
				<div class="flex items-center gap-2 p-4 bg-green-50 rounded-lg">
					<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
					<span class="text-green-700 text-sm font-medium">Menu item created successfully!</span>
				</div>
			{:else}
				<div class="space-y-4">
					<!-- Image Upload -->
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Menu Image (Optional)</label>
						{#if !menuImagePreview}
							<div class="flex items-center gap-3">
								<label class="cursor-pointer px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 flex items-center gap-2">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
									</svg>
									Choose Image
									<input type="file" accept="image/*" class="hidden" onchange={handleMenuImageInput} />
								</label>
								<span class="text-gray-400 text-xs">PNG, JPG up to 5MB</span>
							</div>
						{:else}
							<div class="flex items-start gap-3">
								<div class="relative">
									<img src={menuImagePreview} alt="Preview" class="w-24 h-24 object-cover rounded-lg" />
									<button
										onclick={clearMenuImage}
										class="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
									>
										<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
										</svg>
									</button>
								</div>
								<div class="text-sm text-gray-500">
									<p class="font-medium text-gray-700">{menuImageFile?.name}</p>
									<p>{menuImageFile ? (menuImageFile.size / 1024).toFixed(1) + ' KB' : ''}</p>
								</div>
							</div>
						{/if}
					</div>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<!-- Left Column -->
						<div class="space-y-4">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">Menu Name *</label>
								<input
									type="text"
									bind:value={newMenu.name}
									placeholder="e.g., House Special Curry"
									class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
								<textarea
									bind:value={newMenu.description}
									rows="2"
									placeholder="Describe the menu item..."
									class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
								></textarea>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">Price</label>
								<input
									type="number"
									bind:value={newMenu.price}
									placeholder="e.g., 1500"
									min="0"
									step="1"
									class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">Seasonal Menu</label>
								<div class="flex gap-2">
									<CustomSelect
										bind:value={newMenu.seasonal_menu_id}
										options={seasonalMenus.map(s => ({ value: s.id, label: s.name }))}
										placeholder="Select season..."
										class="flex-1"
									/>
									<button
										type="button"
										onclick={() => showMenuTreeConfig = true}
										class="px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-colors flex items-center gap-1"
										title="Manage seasonal menus"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
										</svg>
									</button>
								</div>
							</div>
							<div class="grid grid-cols-2 gap-3">
								<div>
									<label class="block text-sm font-medium text-gray-700 mb-1">Menu Group</label>
									<div class="flex gap-2">
										<CustomSelect
											bind:value={newMenu.menu_group_id}
											options={filteredMenuGroupsForCreate.map(g => ({ value: g.id, label: g.name }))}
											placeholder="Select group..."
											class="flex-1"
										/>
										<button
											type="button"
											onclick={() => showMenuTreeConfig = true}
											class="px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-colors flex items-center gap-1"
											title="Manage menu groups"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
											</svg>
										</button>
									</div>
								</div>
								<div>
									<label class="block text-sm font-medium text-gray-700 mb-1">Course</label>
									<div class="flex gap-2">
										<CustomSelect
											bind:value={newMenu.category}
											options={filteredCoursesForCreate().map(c => ({ value: c.value, label: c.label }))}
											placeholder="Select course..."
											class="flex-1"
										/>
										<button
											type="button"
											onclick={() => showMenuTreeConfig = true}
											class="px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-colors flex items-center gap-1"
											title="Manage courses"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
											</svg>
										</button>
									</div>
								</div>
							</div>
							<div>
								<label class="flex items-center gap-2 cursor-pointer">
									<input type="checkbox" bind:checked={newMenu.is_available} class="w-4 h-4 text-blue-600 rounded" />
									<span class="text-sm text-gray-700">Available for ordering</span>
								</label>
							</div>
						</div>

						<!-- Right Column - Products Selection -->
						<div class="space-y-4">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">Products/Ingredients ({products.length} available)</label>
								<div class="relative">
									<input
										type="text"
										bind:value={productSearchTerm}
										onfocus={() => productSearchFocused = true}
										onblur={() => setTimeout(() => productSearchFocused = false, 200)}
										placeholder="Click to see products or type to search..."
										class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
									{#if productSearchFocused && availableProductsForMenu.length > 0}
										<div class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
											{#each availableProductsForMenu.slice(0, 10) as product}
												<button
													onclick={() => addProductToMenu(product.id)}
													class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between border-b border-gray-100 last:border-b-0"
												>
													<div class="flex items-center gap-2">
														{#if product.image_url}
															<img src={product.image_url} alt="" class="w-6 h-6 rounded object-cover" />
														{:else}
															<div class="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
																<svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
																</svg>
															</div>
														{/if}
														<span class="truncate">{product.name}</span>
													</div>
													<div class="flex items-center gap-2">
														{#if product.allergens && product.allergens.length > 0}
															<span class="text-xs text-red-500">{product.allergens.length} allergens</span>
														{/if}
														<span class="text-xs text-gray-400">{product.category || 'Uncategorized'}</span>
													</div>
												</button>
											{/each}
											{#if availableProductsForMenu.length > 10}
												<div class="px-3 py-2 text-xs text-gray-400 text-center bg-gray-50">
													+{availableProductsForMenu.length - 10} more products (type to filter)
												</div>
											{/if}
										</div>
									{:else if productSearchFocused && availableProductsForMenu.length === 0}
										<div class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm text-gray-500 text-center">
											{#if products.length === 0}
												No products in database. Add products first.
											{:else}
												All products already selected
											{/if}
										</div>
									{/if}
								</div>
							</div>

							<!-- Selected Products -->
							<div>
								<div class="flex items-center justify-between mb-2">
									<label class="text-sm font-medium text-gray-700">Selected Products ({selectedProductsForMenu.length})</label>
									{#if selectedProductsForMenu.length > 0}
										<div class="flex items-center gap-3 text-xs text-gray-500">
											<span class="flex items-center gap-1">
												<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
												</svg>
												Alternates
											</span>
											<span class="flex items-center gap-1">
												<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
												</svg>
												Remove
											</span>
										</div>
									{/if}
								</div>
								{#if selectedProductsForMenu.length > 0}
									<div class="space-y-1.5 p-2 bg-gray-50 rounded-lg min-h-[60px]">
										{#each selectedProductsForMenu as product}
											<div class="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-white border border-gray-200 rounded-md">
												<span class="text-sm text-gray-800 truncate flex-1">{product.name}</span>
												<div class="flex items-center gap-1">
													<button
														onclick={() => openAlternatesModal(product.id)}
														class="p-1 rounded transition-colors {getAlternatesCount(product.id) > 0 ? 'text-orange-600 hover:bg-orange-50' : 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'}"
														title="Set alternates"
													>
														<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
														</svg>
													</button>
													{#if getAlternatesCount(product.id) > 0}
														<span class="text-xs text-orange-600 font-medium min-w-[1rem] text-center">{getAlternatesCount(product.id)}</span>
													{/if}
													<button onclick={() => removeProductFromMenu(product.id)} class="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Remove product">
														<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
														</svg>
													</button>
												</div>
											</div>
										{/each}
									</div>
								{:else}
									<div class="p-4 bg-gray-50 rounded-lg text-center text-gray-400 text-sm">
										No products selected
									</div>
								{/if}
							</div>

							<!-- Derived Allergens -->
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">Derived Allergens</label>
								{#if derivedMenuAllergens().length > 0}
									<div class="flex flex-wrap gap-1.5">
										{#each derivedMenuAllergens() as allergen}
											<span class="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">{allergen.name}</span>
										{/each}
									</div>
								{:else}
									<p class="text-gray-400 text-sm">No allergens (add products to see allergens)</p>
								{/if}
							</div>
						</div>
					</div>

					{#if createMenuError}
						<p class="text-red-600 text-sm">{createMenuError}</p>
					{/if}

					<div class="flex gap-2 pt-2">
						<button
							onclick={handleCreateMenu}
							disabled={isCreatingMenu}
							class="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
						>
							{#if isCreatingMenu}
								<svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
								{isUploadingMenuImage ? 'Uploading image...' : 'Creating...'}
							{:else}
								Create Menu Item
							{/if}
						</button>
						<button
							onclick={resetNewMenu}
							class="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50"
						>
							Clear
						</button>
					</div>
				</div>
			{/if}
		</section>
		{/if}

		<!-- Allergen Report Table -->
		{#if menus.length > 0}
		<section class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
			<div class="flex items-center justify-between mb-3">
				<div class="flex items-center gap-3">
					<h2 class="text-lg font-semibold text-gray-900">アレルゲン一覧表</h2>
					<span class="text-sm text-gray-500">Allergen Report</span>
				</div>
				<div class="flex items-center gap-2">
					<input
						type="text"
						bind:value={allergenReportSearch}
						placeholder="Search course, product, allergen..."
						class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
					/>
					<button
						onclick={printAllergenReport}
						disabled={isPrinting}
						class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
					>
						<span class="material-symbols-rounded text-base">print</span>
						{isPrinting ? 'Preparing...' : 'Print PDF'}
					</button>
					<button
						onclick={exportAllergenXlsx}
						disabled={isExporting}
						class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
					>
						<span class="material-symbols-rounded text-base">download</span>
						{isExporting ? 'Exporting...' : 'Export .xlsx'}
					</button>
				</div>
			</div>

			{#if allergenTableByCourse.length === 0}
				<p class="text-center text-gray-400 py-6 text-sm">No allergens found in any menu. Link products with allergens to see the report.</p>
			{:else if filteredAllergenTableByCourse.length === 0}
				<p class="text-center text-gray-400 py-6 text-sm">No results for "{allergenReportSearch}"</p>
			{:else}
				<div class="space-y-4">
					{#each filteredAllergenTableByCourse as course}
						<div class="border border-gray-200 rounded-xl overflow-hidden shadow-sm flex">
							<!-- Large course image on the left -->
							<div class="w-40 flex-shrink-0 bg-slate-800 relative">
								{#if course.courseImage}
									<img src={course.courseImage} alt={course.courseName} class="w-full h-full object-cover" />
								{:else}
									<div class="w-full h-full flex items-center justify-center bg-slate-700">
										<svg class="w-12 h-12 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
									</div>
								{/if}
							</div>
							<!-- Right side: course name + product rows -->
							<div class="flex-1 min-w-0">
								<!-- Course name header -->
								<div class="bg-white px-4 py-2.5 flex items-center justify-between border-b border-gray-200">
									<h3 class="text-gray-900 text-lg font-bold tracking-wide">{course.courseName}</h3>
									<span class="text-gray-400 text-xs">{course.menus.reduce((sum, g) => sum + g.products.length, 0)} products</span>
								</div>
								<!-- Product rows -->
								<div class="divide-y divide-gray-100">
									{#each course.menus as group, gi}
										{#each group.products as product, pi}
											<!-- Main product row -->
											<div class="flex items-center gap-3 px-3 py-2 {pi % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'} {pi === 0 && gi > 0 ? 'border-t-2 border-slate-200' : ''}">
												{#if product.image_url}
													<img src={product.image_url} alt={product.name} class="w-9 h-9 rounded object-cover flex-shrink-0" />
												{:else}
													<div class="w-9 h-9 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
														<svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
													</div>
												{/if}
												<span class="text-sm text-gray-800 font-medium w-36 truncate flex-shrink-0" title={product.name}>{product.name}</span>
												<div class="flex flex-wrap gap-1 flex-1 min-w-0">
													{#each product.allergens as allergen}
														<span class="inline-block px-2 py-0.5 text-white text-[10px] font-medium rounded {getAllergenColor(allergen.name)}">{allergen.name}</span>
													{/each}
												</div>
											</div>
											<!-- Alternate product rows -->
											{#each getAlternatesForProduct(product.id) as alt}
												<div class="flex items-center gap-3 px-3 py-1.5 bg-orange-50/40 pl-8">
													<svg class="w-3.5 h-3.5 text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
													</svg>
													{#if alt.image_url}
														<img src={alt.image_url} alt={alt.name} class="w-7 h-7 rounded object-cover flex-shrink-0" />
													{:else}
														<div class="w-7 h-7 rounded bg-orange-100 flex items-center justify-center flex-shrink-0">
															<svg class="w-3 h-3 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
														</div>
													{/if}
													<span class="text-xs text-orange-700 font-medium w-36 truncate flex-shrink-0" title={alt.name}>{alt.name}</span>
													<div class="flex flex-wrap gap-1 flex-1 min-w-0">
														{#each alt.allergens || [] as allergen}
															<span class="inline-block px-1.5 py-0.5 text-white text-[9px] font-medium rounded {getAllergenColor(allergen.name)}">{allergen.name}</span>
														{/each}
													</div>
												</div>
											{/each}
										{/each}
									{/each}
								</div>
							</div>
						</div>
					{/each}
				</div>

				<p class="text-[10px] text-gray-400 mt-3">
					Generated: {new Date().toISOString().split('T')[0]} | {filteredAllergenTableByCourse.length} courses, {allergenTableGrouped.length} menu entries
				</p>
			{/if}
		</section>
		{/if}

		<!-- Menu List Section -->
		<section class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 overflow-visible">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-lg font-semibold text-gray-900">Menu Items ({menus.length})</h2>
				<input
					type="text"
					placeholder="Search menus..."
					bind:value={menuSearchQuery}
					class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
				/>
			</div>

			{#if isLoadingMenus}
				<div class="flex justify-center py-8">
					<svg class="w-6 h-6 text-gray-400 animate-spin" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
				</div>
			{:else if filteredMenus.length > 0}
				<div class="grid grid-cols-1 md:grid-cols-2 gap-3 {expandedMenuId ? 'pb-[70vh]' : ''}">
					{#each filteredMenus as menu}
						<div class="relative bg-gray-50 rounded-lg overflow-visible border border-gray-200">
							<!-- Menu Header (clickable) -->
							<button
								onclick={() => toggleMenu(menu.id)}
								class="w-full p-4 flex items-center justify-between hover:bg-gray-100 transition-colors text-left"
							>
								<div class="flex items-center gap-3 flex-1 min-w-0">
									{#if menu.image_url}
										<img src={menu.image_url} alt={menu.name} class="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
									{:else}
										<div class="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
											<svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
											</svg>
										</div>
									{/if}
									<div class="min-w-0">
										<p class="font-medium text-gray-900 truncate">{menu.name}</p>
										<p class="text-xs text-gray-500">
											{#if menu.seasonal_menu_id}{seasonalMenus.find(s => s.id === menu.seasonal_menu_id)?.name || ''} &rsaquo; {/if}{#if menu.menu_group_id}{menuGroups.find(g => g.id === menu.menu_group_id)?.name || ''} &rsaquo; {/if}{menu.category || 'Uncategorized'}
											{#if menu.price !== null} | ¥{menu.price.toLocaleString()}{/if}
										</p>
									</div>
								</div>
								<div class="flex items-center gap-3 flex-shrink-0">
									<!-- Availability Badge -->
									<span class="px-2 py-0.5 rounded text-xs {menu.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}">
										{menu.is_available ? 'Available' : 'Unavailable'}
									</span>
									<!-- Allergen Tags -->
									<div class="flex gap-1 flex-wrap justify-end">
										{#each menu.allergens || [] as allergen}
											<span class="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">{allergen.name}</span>
										{/each}
									</div>
									<svg class="w-5 h-5 text-gray-400 transition-transform {expandedMenuId === menu.id ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
									</svg>
								</div>
							</button>

							<!-- Expanded Details (floating overlay) -->
							{#if expandedMenuId === menu.id}
								<div class="absolute left-0 right-0 top-full z-20 px-4 pb-4 border border-gray-200 rounded-b-lg bg-white max-h-[70vh] overflow-y-auto">
									<!-- Edit/View Toggle Buttons -->
									<div class="flex justify-end gap-2 pt-3 mb-3">
										{#if editingMenuId === menu.id}
											<button
												onclick={() => cancelEditingMenu()}
												class="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
											>
												Cancel
											</button>
											<button
												onclick={() => saveMenu(menu.id)}
												disabled={isSavingMenu}
												class="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
											>
												{#if isSavingMenu}
													<svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
												{/if}
												Save
											</button>
										{:else}
											{#if isStaff}
											<button
												onclick={() => startEditingMenu(menu)}
												class="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 flex items-center gap-1"
											>
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
												</svg>
												Edit
											</button>
											<button
												onclick={() => openDeleteMenuModal(menu.id)}
												class="px-3 py-1.5 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 flex items-center gap-1"
											>
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
												</svg>
												Delete
											</button>
											{/if}
										{/if}
									</div>

									{#if saveMenuError}
										<p class="text-red-600 text-sm mb-3">{saveMenuError}</p>
									{/if}

									{#if editingMenuId === menu.id}
										<!-- Edit Mode -->
										<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
											<!-- Left Column -->
											<div class="space-y-4">
												<div>
													<label class="block text-sm font-medium text-gray-700 mb-1">Menu Name</label>
													<input
														type="text"
														bind:value={menuEditForm.name}
														class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
													/>
												</div>
												<div>
													<label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
													<textarea
														bind:value={menuEditForm.description}
														rows="2"
														class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
													></textarea>
												</div>
												<div>
													<label class="block text-sm font-medium text-gray-700 mb-1">Price</label>
													<input
														type="number"
														bind:value={menuEditForm.price}
														min="0"
														step="1"
														class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
													/>
												</div>
												<div>
													<label class="block text-sm font-medium text-gray-700 mb-1">Seasonal Menu</label>
													<div class="flex gap-2">
														<CustomSelect
															bind:value={menuEditForm.seasonal_menu_id}
															options={seasonalMenus.map(s => ({ value: s.id, label: s.name }))}
															placeholder="Select season..."
															class="flex-1"
														/>
														<button
															type="button"
															onclick={() => showMenuTreeConfig = true}
															class="px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-colors flex items-center gap-1"
															title="Manage seasonal menus"
														>
															<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
															</svg>
														</button>
													</div>
												</div>
												<div class="grid grid-cols-2 gap-3">
													<div>
														<label class="block text-sm font-medium text-gray-700 mb-1">Menu Group</label>
														<div class="flex gap-2">
															<CustomSelect
																bind:value={menuEditForm.menu_group_id}
																options={filteredMenuGroupsForEdit.map(g => ({ value: g.id, label: g.name }))}
																placeholder="Select group..."
																class="flex-1"
															/>
															<button
																type="button"
																onclick={() => showMenuTreeConfig = true}
																class="px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-colors flex items-center gap-1"
																title="Manage menu groups"
															>
																<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
																</svg>
															</button>
														</div>
													</div>
													<div>
														<label class="block text-sm font-medium text-gray-700 mb-1">Course</label>
														<div class="flex gap-2">
															<CustomSelect
																bind:value={menuEditForm.category}
																options={filteredCoursesForEdit().map(c => ({ value: c.value, label: c.label }))}
																placeholder="Select course..."
																class="flex-1"
															/>
															<button
																type="button"
																onclick={() => showMenuTreeConfig = true}
																class="px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-colors flex items-center gap-1"
																title="Manage courses"
															>
																<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
																</svg>
															</button>
														</div>
													</div>
												</div>
												<div>
													<label class="flex items-center gap-2 cursor-pointer">
														<input type="checkbox" bind:checked={menuEditForm.is_available} class="w-4 h-4 text-blue-600 rounded" />
														<span class="text-sm text-gray-700">Available for ordering</span>
													</label>
												</div>
											</div>

											<!-- Right Column -->
											<div class="space-y-4">
												<!-- Products Selection for Edit -->
												<div>
													<label class="block text-sm font-medium text-gray-700 mb-1">Products/Ingredients ({products.length} available)</label>
													<div class="relative">
														<input
															type="text"
															bind:value={editProductSearchTerm}
															onfocus={() => editProductSearchFocused = true}
															onblur={() => setTimeout(() => editProductSearchFocused = false, 200)}
															placeholder="Click to see products or type to search..."
															class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
														/>
														{#if editProductSearchFocused && availableProductsForEdit.length > 0}
															<div class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
																{#each availableProductsForEdit.slice(0, 10) as product}
																	<button
																		onclick={() => addProductToEdit(product.id)}
																		class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between border-b border-gray-100 last:border-b-0"
																	>
																		<div class="flex items-center gap-2">
																			{#if product.image_url}
																				<img src={product.image_url} alt="" class="w-6 h-6 rounded object-cover" />
																			{:else}
																				<div class="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
																					<svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
																					</svg>
																				</div>
																			{/if}
																			<span class="truncate">{product.name}</span>
																		</div>
																		<div class="flex items-center gap-2">
																			{#if product.allergens && product.allergens.length > 0}
																				<span class="text-xs text-red-500">{product.allergens.length} allergens</span>
																			{/if}
																			<span class="text-xs text-gray-400">{product.category || 'Uncategorized'}</span>
																		</div>
																	</button>
																{/each}
																{#if availableProductsForEdit.length > 10}
																	<div class="px-3 py-2 text-xs text-gray-400 text-center bg-gray-50">
																		+{availableProductsForEdit.length - 10} more products (type to filter)
																	</div>
																{/if}
															</div>
														{:else if editProductSearchFocused && availableProductsForEdit.length === 0}
															<div class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm text-gray-500 text-center">
																{#if products.length === 0}
																	No products in database
																{:else}
																	All products already selected
																{/if}
															</div>
														{/if}
													</div>
												</div>

												<!-- Selected Products for Edit -->
												<div>
													<div class="flex items-center justify-between mb-2">
														<label class="text-sm font-medium text-gray-700">Selected Products ({selectedProductsForEdit.length})</label>
														{#if selectedProductsForEdit.length > 0}
															<div class="flex items-center gap-3 text-xs text-gray-500">
																<span class="flex items-center gap-1">
																	<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
																	</svg>
																	Alternates
																</span>
																<span class="flex items-center gap-1">
																	<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
																	</svg>
																	Remove
																</span>
															</div>
														{/if}
													</div>
													{#if selectedProductsForEdit.length > 0}
														<div class="space-y-1.5 p-2 bg-gray-50 rounded-lg min-h-[60px]">
															{#each selectedProductsForEdit as product}
																<div class="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-white border border-gray-200 rounded-md">
																	<span class="text-sm text-gray-800 truncate flex-1">{product.name}</span>
																	<div class="flex items-center gap-1">
																		<button
																			onclick={() => openAlternatesModal(product.id)}
																			class="p-1 rounded transition-colors {getAlternatesCount(product.id) > 0 ? 'text-orange-600 hover:bg-orange-50' : 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'}"
																			title="Set alternates"
																		>
																			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
																			</svg>
																		</button>
																		{#if getAlternatesCount(product.id) > 0}
																			<span class="text-xs text-orange-600 font-medium min-w-[1rem] text-center">{getAlternatesCount(product.id)}</span>
																		{/if}
																		<button onclick={() => removeProductFromEdit(product.id)} class="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Remove product">
																			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
																			</svg>
																		</button>
																	</div>
																</div>
															{/each}
														</div>
													{:else}
														<div class="p-4 bg-gray-50 rounded-lg text-center text-gray-400 text-sm">
															No products selected
														</div>
													{/if}
												</div>

												<!-- Derived Allergens for Edit -->
												<div>
													<label class="block text-sm font-medium text-gray-700 mb-2">Derived Allergens</label>
													{#if derivedEditAllergens().length > 0}
														<div class="flex flex-wrap gap-1.5">
															{#each derivedEditAllergens() as allergen}
																<span class="px-2.5 py-1 bg-red-100 text-red-700 rounded-md text-sm">{allergen.name}</span>
															{/each}
														</div>
													{:else}
														<p class="text-gray-400 text-sm">No allergens</p>
													{/if}
												</div>
											</div>
										</div>
									{:else}
										<!-- View Mode -->
										<div class="space-y-4">
												<!-- Description -->
												{#if menu.description}
													<div>
														<h4 class="text-sm font-medium text-gray-700 mb-2">Description</h4>
														<p class="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{menu.description}</p>
													</div>
												{/if}

												<!-- Details -->
												<div>
													<h4 class="text-sm font-medium text-gray-700 mb-2">Details</h4>
													<div class="flex flex-wrap gap-2">
														{#if menu.seasonal_menu_id}
															<span class="px-2.5 py-1 bg-green-100 text-green-700 rounded-md text-sm">
																{seasonalMenus.find(s => s.id === menu.seasonal_menu_id)?.name || 'Unknown Season'}
															</span>
														{/if}
														{#if menu.menu_group_id}
															<span class="px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-md text-sm">
																{menuGroups.find(g => g.id === menu.menu_group_id)?.name || 'Unknown Group'}
															</span>
														{/if}
														{#if menu.price !== null}
															<span class="px-2.5 py-1 bg-green-100 text-green-700 rounded-md text-sm">
																¥{menu.price.toLocaleString()}
															</span>
														{/if}
														{#if menu.category}
															<span class="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md text-sm capitalize">
																{menu.category}
															</span>
														{/if}
														<span class="px-2.5 py-1 rounded-md text-sm {menu.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}">
															{menu.is_available ? 'Available' : 'Unavailable'}
														</span>
													</div>
												</div>

												<!-- Products -->
												<div>
													<h4 class="text-sm font-medium text-gray-700 mb-2">Products/Ingredients ({menu.products?.length || 0})</h4>
													{#if menu.products && menu.products.length > 0}
														<div class="space-y-2">
															{#each menu.products as product}
																<div class="flex flex-wrap items-center gap-1.5">
																	<span class="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-md text-sm">{product.name}</span>
																	{#if getAlternatesCount(product.id) > 0}
																		<span class="text-gray-400 text-xs">or</span>
																		{#each getAlternatesForProduct(product.id) as alt}
																			<span class="px-2.5 py-1 bg-orange-100 text-orange-700 rounded-md text-sm flex items-center gap-1">
																				<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
																				</svg>
																				{alt.name}
																			</span>
																		{/each}
																	{/if}
																</div>
															{/each}
														</div>
													{:else}
														<p class="text-gray-400 text-sm">No products linked</p>
													{/if}
												</div>

												<!-- Allergens -->
												<div>
													<h4 class="text-sm font-medium text-gray-700 mb-2">Allergens (Derived from Products)</h4>
													{#if menu.products && menu.products.length > 0}
														{@const allergenProductMap = (() => {
															const map = new Map<string, { name: string; products: string[] }>();
															for (const product of menu.products) {
																for (const allergen of product.allergens || []) {
																	if (!map.has(allergen.id)) {
																		map.set(allergen.id, { name: allergen.name, products: [] });
																	}
																	const entry = map.get(allergen.id)!;
																	if (!entry.products.includes(product.name)) {
																		entry.products.push(product.name);
																	}
																}
															}
															return Array.from(map.values());
														})()}
														{#if allergenProductMap.length > 0}
															<div class="flex flex-wrap gap-1.5">
																{#each allergenProductMap as item}
																	<span class="px-2.5 py-1 bg-red-100 text-red-700 rounded-md text-sm" title={item.products.join(', ')}>
																		{item.name} ({item.products.join(', ')})
																	</span>
																{/each}
															</div>
														{:else}
															<p class="text-gray-400 text-sm">No allergens detected</p>
														{/if}
													{:else}
														<p class="text-gray-400 text-sm">No allergens detected</p>
													{/if}
												</div>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-center text-gray-400 py-8 text-sm">No menu items found</p>
			{/if}
		</section>
		{/if}
		</div>
	</main>
	</div>

	<!-- Delete Menu Confirmation Modal -->
	{#if showDeleteMenuModal}
		<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick={closeDeleteMenuModal}>
			<div
				class="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
				onclick={(e) => e.stopPropagation()}
			>
				<!-- Modal Header -->
				<div class="px-6 py-4 border-b border-gray-200 bg-red-50">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
							<svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
							</svg>
						</div>
						<div>
							<h3 class="text-lg font-semibold text-gray-900">Delete Menu Item</h3>
							<p class="text-sm text-gray-500">This action cannot be undone</p>
						</div>
					</div>
				</div>

				<!-- Modal Body -->
				<div class="px-6 py-4">
					<p class="text-gray-600">
						Are you sure you want to delete this menu item? All associated data will be permanently removed.
					</p>
				</div>

				<!-- Modal Footer -->
				<div class="px-6 py-4 bg-gray-50 flex justify-end gap-3">
					<button
						onclick={closeDeleteMenuModal}
						disabled={isDeletingMenu}
						class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						Cancel
					</button>
					<button
						onclick={confirmDeleteMenu}
						disabled={isDeletingMenu}
						class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
					>
						{#if isDeletingMenu}
							<svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							Deleting...
						{:else}
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
							</svg>
							Delete
						{/if}
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Manage Product Categories Modal -->
	{#if showManageProductCategories}
		<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick={closeManageProductCategories}>
			<div
				class="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
				onclick={(e) => e.stopPropagation()}
			>
				<div class="px-6 py-4 border-b border-gray-200 bg-blue-50">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
							<svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
							</svg>
						</div>
						<div>
							<h3 class="text-lg font-semibold text-gray-900">Manage Product Categories</h3>
							<p class="text-sm text-gray-500">Add or remove product categories</p>
						</div>
					</div>
				</div>
				<div class="px-6 py-4 space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Add New Category</label>
						<div class="flex gap-2">
							<input
								type="text"
								bind:value={newProductCategoryName}
								placeholder="e.g., Dairy, Sauce"
								class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
								onkeydown={(e) => e.key === 'Enter' && !e.isComposing && addProductCategory()}
							/>
							<button
								onclick={addProductCategory}
								disabled={!newProductCategoryName.trim() || isAddingProductCategory}
								class="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								{isAddingProductCategory ? '...' : 'Add'}
							</button>
						</div>
						{#if addProductCategoryError}
							<p class="mt-2 text-sm text-red-600">{addProductCategoryError}</p>
						{/if}
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Categories ({productCategories.length})</label>
						{#if productCategories.length > 0}
							<div class="space-y-2 max-h-48 overflow-y-auto">
								{#each productCategories as category}
									<div class="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
										<span class="text-sm text-gray-700">{category.label}</span>
										<button
											onclick={() => deleteProductCategory(category.id)}
											class="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
											title="Delete category"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									</div>
								{/each}
							</div>
						{:else}
							<p class="text-sm text-gray-500 py-2">No categories. Add one above.</p>
						{/if}
					</div>
				</div>
				<div class="px-6 py-4 bg-gray-50 flex justify-end">
					<button
						onclick={closeManageProductCategories}
						class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
					>
						Done
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Manage Allergens Modal -->
	{#if showManageAllergens}
		<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick={closeManageAllergens}>
			<div
				class="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
				onclick={(e) => e.stopPropagation()}
			>
				<div class="px-6 py-4 border-b border-gray-200 bg-red-50">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
							<svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
							</svg>
						</div>
						<div>
							<h3 class="text-lg font-semibold text-gray-900">Manage Allergens</h3>
							<p class="text-sm text-gray-500">Add or remove allergen items</p>
						</div>
					</div>
				</div>
				<div class="px-6 py-4 space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Add New Allergen</label>
						<div class="flex gap-2">
							<input
								type="text"
								bind:value={newAllergenName}
								placeholder="e.g., Sesame, Celery"
								class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
								onkeydown={(e) => e.key === 'Enter' && !e.isComposing && addAllergenItem()}
							/>
							<CustomSelect
								bind:value={newAllergenCategory}
								options={[
									{ value: 'grain', label: 'Grain' },
									{ value: 'egg', label: 'Egg' },
									{ value: 'dairy', label: 'Dairy' },
									{ value: 'meat', label: 'Meat' },
									{ value: 'fish', label: 'Fish' },
									{ value: 'shellfish', label: 'Shellfish' },
									{ value: 'nut', label: 'Nut' },
									{ value: 'legume', label: 'Legume' },
									{ value: 'other', label: 'Other' },
								]}
							/>
							<button
								onclick={addAllergenItem}
								disabled={!newAllergenName.trim() || isAddingAllergen}
								class="px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								{isAddingAllergen ? '...' : 'Add'}
							</button>
						</div>
						{#if addAllergenError}
							<p class="mt-2 text-sm text-red-600">{addAllergenError}</p>
						{/if}
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Allergens ({allergens.length})</label>
						{#if allergens.length > 0}
							<div class="space-y-2 max-h-48 overflow-y-auto">
								{#each allergens as allergen}
									<div class="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
										<div>
											<span class="text-sm text-gray-700">{allergen.name}</span>
											<span class="text-xs text-gray-400 ml-1">({allergen.category})</span>
										</div>
										<button
											onclick={() => deleteAllergenItem(allergen.id)}
											class="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
											title="Delete allergen"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									</div>
								{/each}
							</div>
						{:else}
							<p class="text-sm text-gray-500 py-2">No allergens. Add one above.</p>
						{/if}
					</div>
				</div>
				<div class="px-6 py-4 bg-gray-50 flex justify-end">
					<button
						onclick={closeManageAllergens}
						class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
					>
						Done
					</button>
				</div>
			</div>
		</div>
	{/if}


	<!-- Alternate Ingredients Modal -->
	{#if showAlternatesModal && alternatesProduct}
		<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick={closeAlternatesModal}>
			<div
				class="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden"
				onclick={(e) => e.stopPropagation()}
			>
				<!-- Modal Header -->
				<div class="px-6 py-4 border-b border-gray-200 bg-orange-50">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
							<svg class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
							</svg>
						</div>
						<div>
							<h3 class="text-lg font-semibold text-gray-900">Alternate Ingredients</h3>
							<p class="text-sm text-gray-500">for <span class="font-medium text-orange-700">{alternatesProduct.name}</span></p>
						</div>
					</div>
				</div>

				<!-- Modal Body -->
				<div class="px-6 py-4 space-y-4">
					<!-- Info Banner -->
					<div class="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
						<svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<p>Add products that can substitute <strong>{alternatesProduct.name}</strong> when a guest has allergies or dietary restrictions.</p>
					</div>

					<!-- Main Product Allergens -->
					{#if alternatesProduct.allergens && alternatesProduct.allergens.length > 0}
						<div class="p-3 bg-red-50 rounded-lg">
							<p class="text-xs font-medium text-red-700 mb-1.5">Current Allergens:</p>
							<div class="flex flex-wrap gap-1">
								{#each alternatesProduct.allergens as allergen}
									<span class="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">{allergen.name}</span>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Search Alternates -->
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Add Alternate Product</label>
						<div class="relative">
							<input
								type="text"
								bind:value={alternateSearchTerm}
								onfocus={() => alternateSearchFocused = true}
								onblur={() => setTimeout(() => alternateSearchFocused = false, 200)}
								placeholder="Search for alternate products..."
								class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
							/>
							{#if alternateSearchFocused && availableAlternates().length > 0}
								<div class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
									{#each availableAlternates().slice(0, 8) as product}
										<button
											onclick={() => addAlternate(product.id)}
											class="w-full px-3 py-2 text-left hover:bg-orange-50 transition-colors flex items-center justify-between gap-2"
										>
											<div class="flex items-center gap-2 min-w-0">
												{#if product.image_url}
													<img src={product.image_url} alt="" class="w-8 h-8 object-cover rounded" />
												{:else}
													<div class="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-gray-400">
														<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
														</svg>
													</div>
												{/if}
												<span class="truncate text-sm">{product.name}</span>
											</div>
											{#if product.allergens && product.allergens.length > 0}
												<div class="flex gap-1 flex-shrink-0">
													{#each product.allergens.slice(0, 2) as allergen}
														<span class="px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-xs">{allergen.name}</span>
													{/each}
													{#if product.allergens.length > 2}
														<span class="text-xs text-gray-400">+{product.allergens.length - 2}</span>
													{/if}
												</div>
											{:else}
												<span class="px-1.5 py-0.5 bg-green-100 text-green-600 rounded text-xs">No allergens</span>
											{/if}
										</button>
									{/each}
								</div>
							{:else if alternateSearchFocused && availableAlternates().length === 0}
								<div class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm text-gray-500 text-center">
									No more products available
								</div>
							{/if}
						</div>
					</div>

					<!-- Selected Alternates -->
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">Selected Alternates ({selectedAlternates().length})</label>
						{#if selectedAlternates().length > 0}
							<div class="space-y-2 max-h-40 overflow-y-auto">
								{#each selectedAlternates() as product}
									<div class="flex items-center justify-between px-3 py-2 bg-green-50 rounded-lg border border-green-200">
										<div class="flex items-center gap-2 min-w-0">
											<span class="text-sm text-gray-700 truncate">{product.name}</span>
											{#if product.allergens && product.allergens.length > 0}
												<div class="flex gap-1 flex-shrink-0">
													{#each product.allergens.slice(0, 2) as allergen}
														<span class="px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-xs">{allergen.name}</span>
													{/each}
													{#if product.allergens.length > 2}
														<span class="text-xs text-gray-400">+{product.allergens.length - 2}</span>
													{/if}
												</div>
											{:else}
												<span class="px-1.5 py-0.5 bg-green-100 text-green-600 rounded text-xs">No allergens</span>
											{/if}
										</div>
										<button
											onclick={() => removeAlternate(product.id)}
											class="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
											title="Remove alternate"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									</div>
								{/each}
							</div>
						{:else}
							<div class="p-3 bg-gray-50 rounded-lg text-center text-gray-400 text-sm">
								No alternates configured. Add products above that can substitute this ingredient.
							</div>
						{/if}
					</div>
				</div>

				<!-- Modal Footer -->
				<div class="px-6 py-4 bg-gray-50 flex justify-end">
					<button
						onclick={closeAlternatesModal}
						class="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
					>
						Done
					</button>
				</div>
			</div>
		</div>
	{/if}

	{#if expandedImageUrl}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
			onclick={() => expandedImageUrl = null}
			role="dialog"
		>
			<button onclick={() => expandedImageUrl = null} class="absolute top-4 right-4 p-2 bg-white/20 text-white rounded-full hover:bg-white/40">
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
			<img src={expandedImageUrl} alt="Expanded" class="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" onclick={(e) => e.stopPropagation()} />
		</div>
	{/if}

	{#if showMenuTreeConfig}
		<MenuTreeConfig
			{seasonalMenus}
			{menuGroups}
			{menuCategories}
			{menus}
			{products}
			{productAlternates}
			onAddAlternate={handleAddAlternate}
			onRemoveAlternate={handleRemoveAlternate}
			onCreateSeason={treeCreateSeason}
			onUpdateSeason={treeUpdateSeason}
			onDeleteSeason={treeDeleteSeason}
			onCreateGroup={treeCreateGroup}
			onUpdateGroup={treeUpdateGroup}
			onDeleteGroup={treeDeleteGroup}
			onCreateCourse={treeCreateCourse}
			onUpdateCourse={treeUpdateCourse}
			onUpdateCourseDetails={treeUpdateCourseDetails}
			onDeleteCourse={treeDeleteCourse}
			onCreateMenu={treeCreateMenu}
			onUpdateMenu={treeUpdateMenu}
			onDeleteMenu={treeDeleteMenu}
			onClose={() => showMenuTreeConfig = false}
		/>
	{/if}
</div>