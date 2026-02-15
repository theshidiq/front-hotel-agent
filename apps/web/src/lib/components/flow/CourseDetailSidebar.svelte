<script lang="ts">
	import type { Menu, Product, UpdateCategoryData, CreateMenuData, Allergen } from '$lib/api';
	import { uploadImage, compressImage } from '$lib/supabase';

	interface Props {
		courseId: string;
		courseName: string;
		courseCategory?: { value: string; label: string; id: string; image_url?: string | null; description?: string | null; price?: number | null } | null;
		menus: Menu[];
		products: Product[];
		groupId: string;
		seasonalMenuId?: string | null;
		onUpdateCourseDetails: (id: string, data: UpdateCategoryData) => Promise<void>;
		onRenameCourse: (id: string, name: string) => void;
		onCreateMenu: (data: CreateMenuData) => Promise<void>;
		onDeleteMenu: (id: string) => void;
		onClose: () => void;
	}

	let { courseId, courseName, courseCategory, menus, products, groupId, seasonalMenuId, onUpdateCourseDetails, onRenameCourse, onCreateMenu, onDeleteMenu, onClose }: Props = $props();

	// Course name
	let courseNameInput = $state(courseName);
	let origName = $state(courseName);

	// Course-level fields
	let courseImage: string | null = $state(null);
	let courseImageFile: File | null = $state(null);
	let courseDescription = $state('');
	let coursePrice = $state('');
	let hasPrice = $state(false);
	let isSubmitting = $state(false);

	// Original values for change detection
	let origImage: string | null = $state(null);
	let origDescription = $state('');
	let origPrice = $state('');
	let origHasPrice = $state(false);

	// Add menu form state
	let showAddForm = $state(false);
	let newMenuName = $state('');
	let selectedProductIds = $state<string[]>([]);
	let isCreatingMenu = $state(false);
	let createError = $state<string | null>(null);
	let productSearchTerm = $state('');
	let productSearchFocused = $state(false);

	// Alternate ingredients
	let productAlternates: Record<string, string[]> = $state({});
	let showAlternatesFor: string | null = $state(null);
	let alternateSearchTerm = $state('');
	let alternateSearchFocused = $state(false);

	$effect(() => {
		courseNameInput = courseName;
		origName = courseName;
	});

	// Initialize from category
	$effect(() => {
		const cat = courseCategory;
		courseImage = cat?.image_url || null;
		origImage = cat?.image_url || null;
		courseDescription = cat?.description || '';
		origDescription = cat?.description || '';
		const priceVal = cat?.price != null ? String(cat.price) : '';
		coursePrice = priceVal;
		origPrice = priceVal;
		hasPrice = cat?.price != null;
		origHasPrice = cat?.price != null;
		courseImageFile = null;
	});

	const hasCourseChanges = $derived(
		courseNameInput.trim() !== origName ||
		courseDescription !== origDescription ||
		coursePrice !== origPrice ||
		hasPrice !== origHasPrice ||
		courseImageFile !== null ||
		(courseImage === null && origImage !== null)
	);

	// All allergens derived across all menus in this course
	const allAllergens = $derived.by(() => {
		const map = new Map<string, { id: string; name: string; category: string }>();
		for (const menu of menus) {
			for (const allergen of menu.allergens || []) {
				if (!map.has(allergen.id)) {
					map.set(allergen.id, allergen);
				}
			}
		}
		return Array.from(map.values());
	});

	// Add menu form derived values
	const availableProducts = $derived(
		products.filter(
			(p) =>
				!selectedProductIds.includes(p.id) &&
				(productSearchTerm === '' ||
					p.name.toLowerCase().includes(productSearchTerm.toLowerCase()))
		)
	);

	const selectedProducts = $derived(products.filter((p) => selectedProductIds.includes(p.id)));

	const derivedAllergens = $derived.by(() => {
		const map = new Map<string, Allergen>();
		for (const product of selectedProducts) {
			for (const allergen of product.allergens || []) {
				if (!map.has(allergen.id)) {
					map.set(allergen.id, allergen);
				}
			}
		}
		return Array.from(map.values());
	});

	const alternatesProduct = $derived(
		showAlternatesFor ? products.find((p) => p.id === showAlternatesFor) : null
	);

	const availableAlternates = $derived(
		showAlternatesFor
			? products.filter(
					(p) =>
						p.id !== showAlternatesFor &&
						!(productAlternates[showAlternatesFor] || []).includes(p.id) &&
						(alternateSearchTerm === '' ||
							p.name.toLowerCase().includes(alternateSearchTerm.toLowerCase()))
				)
			: []
	);

	const selectedAlternates = $derived(
		showAlternatesFor
			? products.filter((p) => (productAlternates[showAlternatesFor!] || []).includes(p.id))
			: []
	);

	function handleImageSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		courseImageFile = file;
		if (courseImage && !courseImage.startsWith('http')) URL.revokeObjectURL(courseImage);
		courseImage = URL.createObjectURL(file);
	}

	function clearImage() {
		if (courseImage && !courseImage.startsWith('http')) URL.revokeObjectURL(courseImage);
		courseImageFile = null;
		courseImage = null;
	}

	function togglePrice() {
		hasPrice = !hasPrice;
		if (!hasPrice) {
			coursePrice = '';
		}
	}

	async function saveCourseDetails() {
		if (isSubmitting) return;
		const trimmedName = courseNameInput.trim();
		if (!trimmedName) return;
		isSubmitting = true;
		try {
			let image_url: string | undefined = undefined;
			if (courseImageFile) {
				const compressed = await compressImage(courseImageFile);
				image_url = await uploadImage(compressed);
			} else if (courseImage === null && origImage !== null) {
				image_url = '';
			}

			if (trimmedName !== origName) {
				onRenameCourse(courseId, trimmedName);
				origName = trimmedName;
			}

			const data: UpdateCategoryData = {};
			if (courseDescription !== origDescription) data.description = courseDescription || null;
			if (hasPrice !== origHasPrice || coursePrice !== origPrice) {
				data.price = hasPrice && coursePrice ? parseFloat(coursePrice) : null;
			}
			if (image_url !== undefined) data.image_url = image_url || null;

			if (Object.keys(data).length > 0) {
				await onUpdateCourseDetails(courseId, data);
			}

			origDescription = courseDescription;
			origPrice = coursePrice;
			origHasPrice = hasPrice;
			origImage = image_url !== undefined ? (image_url || null) : origImage;
			courseImageFile = null;
		} finally {
			isSubmitting = false;
		}
	}

	// Inline delete confirmation
	let confirmingDeleteId: string | null = $state(null);

	// Scroll container ref
	let scrollContainer: HTMLDivElement | undefined = $state(undefined);
	let menuSectionEl: HTMLDivElement | undefined = $state(undefined);

	// Add menu form functions
	function openAddForm() {
		showAddForm = true;
		newMenuName = '';
		selectedProductIds = [];
		productAlternates = {};
		createError = null;
		productSearchTerm = '';
		// Scroll to menu section after DOM updates
		requestAnimationFrame(() => {
			menuSectionEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		});
	}

	function closeAddForm() {
		showAddForm = false;
		newMenuName = '';
		selectedProductIds = [];
		productAlternates = {};
		createError = null;
		productSearchTerm = '';
	}

	function addProduct(productId: string) {
		selectedProductIds = [...selectedProductIds, productId];
		productSearchTerm = '';
	}

	function removeProduct(productId: string) {
		selectedProductIds = selectedProductIds.filter((id) => id !== productId);
		const { [productId]: _, ...rest } = productAlternates;
		productAlternates = rest;
	}

	function openAlternates(productId: string) {
		showAlternatesFor = productId;
		alternateSearchTerm = '';
		alternateSearchFocused = false;
	}

	function closeAlternates() {
		showAlternatesFor = null;
		alternateSearchTerm = '';
	}

	function addAlternate(productId: string) {
		if (!showAlternatesFor) return;
		const current = productAlternates[showAlternatesFor] || [];
		if (!current.includes(productId)) {
			productAlternates[showAlternatesFor] = [...current, productId];
		}
		alternateSearchTerm = '';
	}

	function removeAlternate(productId: string) {
		if (!showAlternatesFor) return;
		productAlternates[showAlternatesFor] = (productAlternates[showAlternatesFor] || []).filter(
			(id) => id !== productId
		);
	}

	function getAlternatesCount(productId: string): number {
		return (productAlternates[productId] || []).length;
	}

	async function handleCreateMenu() {
		if (!newMenuName.trim()) {
			createError = 'Menu name is required';
			return;
		}
		isCreatingMenu = true;
		createError = null;
		try {
			const courseValue = courseCategory?.value || '';
			const data: CreateMenuData = {
				name: newMenuName.trim(),
				category: courseValue,
				menu_group_id: groupId,
				seasonal_menu_id: seasonalMenuId || null,
				is_available: true,
				product_ids: selectedProductIds.length > 0 ? selectedProductIds : undefined,
			};
			await onCreateMenu(data);
			closeAddForm();
		} catch (e: any) {
			createError = e.message || 'Failed to create menu';
		} finally {
			isCreatingMenu = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (showAlternatesFor) {
				closeAlternates();
			} else if (showAddForm) {
				closeAddForm();
			} else {
				onClose();
			}
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<style>
	.custom-scrollbar::-webkit-scrollbar {
		width: 5px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background-color: #e5e7eb;
		border-radius: 20px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background-color: #d1d5db;
	}
	.input-underline {
		position: relative;
	}
	.input-underline::after {
		content: '';
		position: absolute;
		left: 0;
		bottom: 0;
		width: 0;
		height: 2px;
		background-color: #d97706;
		transition: width 0.3s ease;
	}
	.input-underline:focus-within::after {
		width: 100%;
	}

</style>

<!-- Backdrop -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="fixed inset-0 bg-black/20 z-50" onclick={onClose}></div>

<!-- Sidebar -->
<div class="fixed right-0 top-0 h-full w-[450px] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-100">
	<!-- Sticky title bar -->
	<div class="flex-none px-6 pt-6 pb-3 bg-white border-b border-gray-100 z-20">
		<div class="flex justify-between items-center">
			<h2 class="text-xs font-bold text-gray-400 tracking-widest uppercase">Course Editor</h2>
			<button onclick={onClose} class="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-50">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
	</div>

	<!-- Single scrollable body with everything -->
	<div bind:this={scrollContainer} class="flex-1 overflow-y-auto custom-scrollbar">
		<!-- Course details section -->
		<div class="px-6 pt-4 pb-2 bg-white">

			<!-- Image area -->
			<div class="relative w-full h-48 rounded-2xl overflow-hidden bg-gray-100 group cursor-pointer mb-5 border border-gray-100 shadow-inner">
				{#if courseImage}
					<img src={courseImage} alt="Course" class="w-full h-full object-cover" />
					<div class="absolute inset-0 bg-black/5 group-hover:bg-black/20 transition-colors flex items-center justify-center">
						<div class="flex gap-2">
							<label class="bg-white/90 hover:bg-white text-gray-700 text-xs font-semibold px-4 py-2 rounded-full shadow-sm flex items-center gap-2 backdrop-blur-sm transition-transform transform group-hover:scale-105 cursor-pointer">
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
								</svg>
								Change Photo
								<input type="file" accept="image/*" class="hidden" onchange={handleImageSelect} />
							</label>
							<button
								onclick={clearImage}
								class="bg-white/90 hover:bg-white text-red-500 text-xs font-semibold px-3 py-2 rounded-full shadow-sm backdrop-blur-sm transition-transform transform group-hover:scale-105"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
								</svg>
							</button>
						</div>
					</div>
				{:else}
					<div class="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
						<svg class="w-16 h-16 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
						</svg>
					</div>
					<label class="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors flex items-center justify-center cursor-pointer">
						<span class="bg-white/90 hover:bg-white text-gray-700 text-xs font-semibold px-4 py-2 rounded-full shadow-sm flex items-center gap-2 backdrop-blur-sm transition-transform transform group-hover:scale-105">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
							</svg>
							Add Photo
						</span>
						<input type="file" accept="image/*" class="hidden" onchange={handleImageSelect} />
					</label>
				{/if}
			</div>

			<!-- Course Name -->
			<div class="mb-3 input-underline group relative">
				<input
					type="text"
					bind:value={courseNameInput}
					class="w-full py-2 text-2xl font-bold text-gray-800 bg-transparent border-b border-gray-200 hover:border-gray-300 focus:border-transparent p-0 focus:ring-0 placeholder-gray-300 transition-colors"
					placeholder="Enter Course Name"
				/>
			</div>

			<!-- Description -->
			<div class="mb-4 relative group">
				<div class="relative">
					<textarea
						bind:value={courseDescription}
						class="w-full text-sm text-gray-600 bg-gray-50/50 hover:bg-gray-50 focus:bg-white border border-transparent focus:border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-amber-500/10 resize-none h-20 placeholder-gray-400 leading-relaxed transition-all duration-200"
						placeholder="Add a brief description about this course..."
					></textarea>
				</div>
			</div>

			<!-- Enable Pricing toggle -->
			<div class="flex items-center justify-between py-3 border-t border-dashed border-gray-100">
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<span
					class="text-sm font-medium text-gray-600 cursor-pointer hover:text-gray-800 transition-colors"
					onclick={togglePrice}
				>Enable Pricing</span>
				<div class="flex items-center gap-3">
					<div class="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in group">
						<input
							type="checkbox"
							checked={hasPrice}
							onchange={togglePrice}
							class="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer border-gray-200 group-hover:border-gray-300 transition-all duration-300 ease-in-out left-0 top-0 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-amber-500/30"
							style={hasPrice ? 'left: 20px; border-color: #d97706;' : ''}
						/>
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="block overflow-hidden h-5 rounded-full cursor-pointer transition-colors duration-300 {hasPrice ? 'bg-amber-600' : 'bg-gray-200 group-hover:bg-gray-300'}"
							onclick={togglePrice}
						></div>
					</div>
					{#if hasPrice}
						<div class="flex items-center border border-gray-200 rounded-md hover:border-gray-300 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/10 bg-white transition-all duration-200">
							<span class="pl-2.5 text-sm text-gray-400">¥</span>
							<input
								type="number"
								bind:value={coursePrice}
								min="0"
								step="1"
								class="w-20 pr-2.5 py-1.5 text-right text-sm font-semibold text-gray-700 border-0 bg-transparent focus:ring-0 focus:outline-none"
								placeholder="0"
							/>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Menu Items Section — swaps in-place between list and add form -->
		<div bind:this={menuSectionEl} class="px-6 pt-6 pb-6 bg-gray-50/50">
			<div class="flex justify-between items-center mb-4">
				<div class="flex items-center gap-2">
					{#if showAddForm}
						<button
							onclick={closeAddForm}
							class="text-gray-400 hover:text-gray-600 transition-colors p-0.5 rounded hover:bg-gray-100 mr-1"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
							</svg>
						</button>
						<h3 class="text-xs font-bold text-amber-600 uppercase tracking-widest">New Menu Item</h3>
					{:else}
						<h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest">Menu Items</h3>
						<span class="bg-gray-200 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{menus.length}</span>
					{/if}
				</div>
				{#if !showAddForm}
					<button
						onclick={openAddForm}
						class="text-amber-600 hover:text-amber-700 text-xs font-bold uppercase tracking-wide flex items-center gap-1 hover:underline decoration-amber-500/30 underline-offset-4"
					>
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
						Add Item
					</button>
				{/if}
			</div>

			{#if showAddForm}
				<!-- Add form -->
				<div class="space-y-4" style="min-height: 70vh;">
					<!-- Name -->
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Name <span class="text-red-400">*</span></label>
						<input
							type="text"
							bind:value={newMenuName}
							placeholder="e.g., Grilled Salmon"
							class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
							onkeydown={(e) => e.key === 'Enter' && handleCreateMenu()}
						/>
					</div>

					<!-- Product Search -->
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Products/Ingredients</label>
						<div class="relative">
							<input
								type="text"
								bind:value={productSearchTerm}
								onfocus={() => (productSearchFocused = true)}
								onblur={() => setTimeout(() => (productSearchFocused = false), 200)}
								placeholder="Search products..."
								class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
							/>
							{#if productSearchFocused && availableProducts.length > 0}
								<div class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
									{#each availableProducts.slice(0, 15) as product}
										<button
											onclick={() => addProduct(product.id)}
											class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between border-b border-gray-100 last:border-b-0"
										>
											<div class="flex items-center gap-2">
												{#if product.image_url}
													<img src={product.image_url} alt="" class="w-6 h-6 rounded object-cover" />
												{:else}
													<div class="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
														<svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
														</svg>
													</div>
												{/if}
												<span class="truncate">{product.name}</span>
											</div>
											{#if product.allergens && product.allergens.length > 0}
												<span class="text-xs text-red-500 flex-shrink-0">{product.allergens.length} allergens</span>
											{/if}
										</button>
									{/each}
									{#if availableProducts.length > 15}
										<div class="px-3 py-2 text-xs text-gray-400 text-center bg-gray-50">
											+{availableProducts.length - 15} more (type to filter)
										</div>
									{/if}
								</div>
							{/if}
						</div>
					</div>

					<!-- Selected Products -->
					{#if selectedProducts.length > 0}
						<div>
							<div class="flex items-center justify-between mb-1.5">
								<label class="text-sm font-medium text-gray-700">Selected ({selectedProducts.length})</label>
								<div class="flex items-center gap-3 text-xs text-gray-400">
									<span class="flex items-center gap-1">
										<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
										</svg>
										Alternates
									</span>
								</div>
							</div>
							<div class="space-y-1 p-2 bg-gray-50 rounded-lg">
								{#each selectedProducts as product}
									<div class="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-white border border-gray-200 rounded-md">
										<span class="text-sm text-gray-800 truncate flex-1">{product.name}</span>
										<div class="flex items-center gap-1 flex-shrink-0">
											<button
												onclick={() => openAlternates(product.id)}
												class="p-1 rounded transition-colors {getAlternatesCount(product.id) > 0 ? 'text-orange-600 hover:bg-orange-50' : 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'}"
												title="Set alternates"
											>
												<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
												</svg>
											</button>
											{#if getAlternatesCount(product.id) > 0}
												<span class="text-xs text-orange-600 font-medium">{getAlternatesCount(product.id)}</span>
											{/if}
											<button
												onclick={() => removeProduct(product.id)}
												class="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
												title="Remove"
											>
												<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
												</svg>
											</button>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Derived Allergens -->
					{#if derivedAllergens.length > 0}
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">Derived Allergens</label>
							<div class="flex flex-wrap gap-1.5">
								{#each derivedAllergens as allergen}
									<span class="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">{allergen.name}</span>
								{/each}
							</div>
						</div>
					{/if}

					{#if createError}
						<p class="text-red-600 text-sm">{createError}</p>
					{/if}

					<!-- Submit button inside the form area -->
					<div class="pt-2">
						<button
							onclick={handleCreateMenu}
							disabled={isCreatingMenu || !newMenuName.trim()}
							class="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:shadow-lg hover:shadow-amber-200 text-white text-sm font-bold py-3 px-4 rounded-xl flex justify-center items-center gap-2 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:shadow-none disabled:hover:translate-y-0"
						>
							{#if isCreatingMenu}
								<svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
								</svg>
								Creating...
							{:else}
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
								</svg>
								Add Menu Item
							{/if}
						</button>
					</div>
				</div>
			{:else}
				<!-- Menu items list -->
				{#if menus.length === 0}
					<div class="flex flex-col items-center justify-center py-10 text-gray-400">
						<svg class="w-10 h-10 mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
						</svg>
						<p class="text-sm">No menu items yet</p>
						<button onclick={openAddForm} class="mt-2 text-amber-600 hover:text-amber-700 text-sm font-medium">Add your first item</button>
					</div>
				{:else if menus.length > 0}
					<div class="space-y-4">
						{#each menus as menu (menu.id)}
							<div class="rounded-xl overflow-hidden transition-all duration-200 {confirmingDeleteId === menu.id ? 'ring-2 ring-red-300' : ''}">
								{#if confirmingDeleteId === menu.id}
									<!-- Inline delete confirmation -->
									<div class="bg-red-50 p-4 border border-red-200 rounded-xl">
										<div class="flex items-center gap-2 mb-3">
											<div class="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
												<svg class="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
												</svg>
											</div>
											<div>
												<p class="text-sm font-semibold text-red-700">Delete "{menu.name}"?</p>
												<p class="text-xs text-red-400">This action cannot be undone</p>
											</div>
										</div>
										<div class="flex gap-2">
											<button
												onclick={() => { confirmingDeleteId = null; }}
												class="flex-1 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
											>
												Cancel
											</button>
											<button
												onclick={() => { onDeleteMenu(menu.id); confirmingDeleteId = null; }}
												class="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
											>
												Delete
											</button>
										</div>
									</div>
								{:else}
									<!-- Normal card -->
									<div class="bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] transition-all duration-300 border border-transparent hover:border-gray-100 group rounded-xl">
										<div class="flex justify-between items-start mb-3">
											<div>
												<h4 class="text-base font-bold text-gray-800 leading-tight">{menu.name}</h4>
												{#if menu.products.length > 0}
													<p class="text-xs text-gray-400 mt-1 font-medium">
														{menu.products.map(p => p.name).join(', ')}
													</p>
												{/if}
											</div>
											<button
												onclick={() => { confirmingDeleteId = menu.id; }}
												class="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
											>
												<svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
												</svg>
											</button>
										</div>

										{#if menu.allergens && menu.allergens.length > 0}
											<div class="flex flex-wrap gap-2 mt-3">
												{#each menu.allergens.slice(0, 4) as allergen}
													<span class="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold bg-red-50 text-red-400 tracking-wide uppercase">
														{allergen.name}
													</span>
												{/each}
												{#if menu.allergens.length > 4}
													<span class="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold bg-gray-100 text-gray-400 border border-gray-200">
														+{menu.allergens.length - 4}
													</span>
												{/if}
											</div>
										{/if}

										{#if menu.allergens && menu.allergens.length > 4}
											<div class="mt-3 pt-3 border-t border-gray-50 flex flex-wrap gap-1.5">
												<span class="text-[10px] text-gray-400">Contains:</span>
												<span class="text-[10px] text-gray-500 font-medium">{menu.allergens.map(a => a.name).join(', ')}</span>
											</div>
										{/if}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			{/if}
		</div>

			<!-- Total Allergens summary -->
		{#if !showAddForm && allAllergens.length > 0}
			<div class="px-6 pt-4 pb-6">
				<div class="pt-4 border-t border-gray-200">
					<h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Total Allergens</h3>
					<div class="flex gap-2 flex-wrap">
						{#each allAllergens as allergen}
							<span class="px-3 py-1 bg-red-50 text-red-500 text-[11px] rounded-full font-semibold border border-red-100/50">{allergen.name}</span>
						{/each}
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Footer -->
	<div class="flex-none p-6 bg-white border-t border-gray-100 flex flex-col gap-3 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] relative z-20">
		{#if hasCourseChanges}
			<button
				onclick={saveCourseDetails}
				disabled={isSubmitting}
				class="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:shadow-lg hover:shadow-amber-200 text-white text-sm font-bold py-3 px-4 rounded-xl flex justify-center items-center gap-2 transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
			>
				{#if isSubmitting}
					<svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
					</svg>
					Saving Changes...
				{:else}
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
					Save Changes
				{/if}
			</button>
		{/if}
		{#if !showAddForm}
			<button
				onclick={openAddForm}
				class="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:shadow-lg hover:shadow-amber-200 text-white text-sm font-bold py-3 px-4 rounded-xl flex justify-center items-center gap-2 transition-all transform hover:-translate-y-0.5"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				Add Menu Item
			</button>
		{/if}
		<button
			onclick={onClose}
			class="w-full text-gray-400 hover:text-gray-800 text-sm font-medium py-2 px-4 rounded transition-colors text-center"
		>
			Close Editor
		</button>
	</div>
</div>

<!-- Alternates Modal -->
{#if showAlternatesFor && alternatesProduct}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onclick={closeAlternates}>
		<div
			class="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden"
			onclick={(e) => e.stopPropagation()}
		>
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

			<div class="px-6 py-4 space-y-4">
				<div class="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
					<svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<p>Add products that can substitute <strong>{alternatesProduct.name}</strong> when a guest has allergies or dietary restrictions.</p>
				</div>

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

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Add Alternate Product</label>
					<div class="relative">
						<input
							type="text"
							bind:value={alternateSearchTerm}
							onfocus={() => (alternateSearchFocused = true)}
							onblur={() => setTimeout(() => (alternateSearchFocused = false), 200)}
							placeholder="Search for alternate products..."
							class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
						/>
						{#if alternateSearchFocused && availableAlternates.length > 0}
							<div class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
								{#each availableAlternates.slice(0, 8) as product}
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
						{/if}
					</div>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Selected Alternates ({selectedAlternates.length})</label>
					{#if selectedAlternates.length > 0}
						<div class="space-y-2 max-h-40 overflow-y-auto">
							{#each selectedAlternates as product}
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

			<div class="px-6 py-4 bg-gray-50 flex justify-end">
				<button
					onclick={closeAlternates}
					class="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
				>
					Done
				</button>
			</div>
		</div>
	</div>
{/if}
