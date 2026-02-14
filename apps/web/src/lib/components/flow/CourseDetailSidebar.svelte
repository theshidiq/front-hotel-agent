<script lang="ts">
	import type { Menu, Product, UpdateMenuData } from '$lib/api';
	import { uploadImage, compressImage } from '$lib/supabase';

	interface Props {
		courseName: string;
		menus: Menu[];
		products: Product[];
		onUpdateMenu: (id: string, data: UpdateMenuData) => Promise<void>;
		onDeleteMenu: (id: string) => void;
		onAddMenu: () => void;
		onClose: () => void;
	}

	let { courseName, menus, products, onUpdateMenu, onDeleteMenu, onAddMenu, onClose }: Props = $props();

	// Course-level fields (from the first menu as representative)
	const firstMenu = $derived(menus.length > 0 ? menus[0] : null);

	let courseImage: string | null = $state(null);
	let courseImageFile: File | null = $state(null);
	let courseDescription = $state('');
	let coursePrice = $state('');
	let isSubmitting = $state(false);

	// Original values for change detection
	let origImage: string | null = $state(null);
	let origDescription = $state('');
	let origPrice = $state('');

	// Initialize from first menu when menus change
	$effect(() => {
		if (firstMenu) {
			courseImage = firstMenu.image_url;
			origImage = firstMenu.image_url;
			courseDescription = firstMenu.description || '';
			origDescription = firstMenu.description || '';
			coursePrice = firstMenu.price !== null ? String(firstMenu.price) : '';
			origPrice = firstMenu.price !== null ? String(firstMenu.price) : '';
			courseImageFile = null;
		}
	});

	const hasCourseChanges = $derived(
		courseDescription !== origDescription ||
		coursePrice !== origPrice ||
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

	async function saveCourseDetails() {
		if (!firstMenu || isSubmitting) return;
		isSubmitting = true;
		try {
			let image_url: string | undefined = undefined;
			if (courseImageFile) {
				const compressed = await compressImage(courseImageFile);
				image_url = await uploadImage(compressed);
			} else if (courseImage === null && origImage !== null) {
				image_url = '';
			}

			const data: UpdateMenuData = {};
			if (courseDescription !== origDescription) data.description = courseDescription || null;
			if (coursePrice !== origPrice) data.price = coursePrice ? parseFloat(coursePrice) : null;
			if (image_url !== undefined) data.image_url = image_url || null;

			// Apply course-level changes to all menus in this course
			for (const menu of menus) {
				await onUpdateMenu(menu.id, data);
			}

			origDescription = courseDescription;
			origPrice = coursePrice;
			origImage = image_url !== undefined ? (image_url || null) : origImage;
			courseImageFile = null;
		} finally {
			isSubmitting = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Backdrop -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="fixed inset-0 bg-black/20 z-50" onclick={onClose}></div>

<!-- Sidebar -->
<div class="fixed right-0 top-0 h-full w-[420px] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
	<!-- Header -->
	<div class="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-blue-50">
		<div>
			<h3 class="text-base font-bold text-gray-900">{courseName}</h3>
			<p class="text-xs text-blue-700 mt-0.5">{menus.length} menu item{menus.length !== 1 ? 's' : ''}</p>
		</div>
		<button onclick={onClose} class="p-1.5 rounded-lg hover:bg-blue-100 text-gray-500 transition-colors">
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	</div>

	<!-- Scrollable body -->
	<div class="flex-1 overflow-y-auto p-5 space-y-5">
		<!-- Course Image -->
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-1">Course Image</label>
			{#if courseImage}
				<div class="relative">
					<img src={courseImage} alt="Course" class="w-full rounded-lg object-cover max-h-40" />
					<button
						onclick={clearImage}
						class="absolute top-1.5 right-1.5 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
						title="Remove image"
					>
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			{:else}
				<label class="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
					<svg class="w-6 h-6 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
					</svg>
					<span class="text-xs text-gray-500">Click to upload image</span>
					<input type="file" accept="image/*" class="hidden" onchange={handleImageSelect} />
				</label>
			{/if}
		</div>

		<!-- Course Description -->
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
			<textarea
				bind:value={courseDescription}
				rows={2}
				class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none resize-none"
				placeholder="Course description..."
			></textarea>
		</div>

		<!-- Course Price -->
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-1">Price (¥)</label>
			<input
				type="number"
				bind:value={coursePrice}
				min="0"
				step="1"
				class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none"
				placeholder="0"
			/>
		</div>

		<!-- Save course-level changes -->
		{#if hasCourseChanges}
			<button
				onclick={saveCourseDetails}
				disabled={isSubmitting}
				class="w-full bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
			>
				{#if isSubmitting}
					<svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
					</svg>
					Saving...
				{:else}
					Save Course Details
				{/if}
			</button>
		{/if}

		<!-- Divider -->
		<div class="border-t border-gray-200"></div>

		<!-- Menu Items (product selections) -->
		<div>
			<h4 class="text-sm font-semibold text-gray-900 mb-2">Menu Items</h4>

			{#if menus.length === 0}
				<div class="flex flex-col items-center justify-center py-8 text-gray-400">
					<svg class="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
					</svg>
					<p class="text-sm">No menu items yet</p>
					<p class="text-xs mt-1">Click "Add Menu Item" below</p>
				</div>
			{:else}
				<div class="space-y-2">
					{#each menus as menu (menu.id)}
						<div class="border border-gray-200 rounded-lg bg-white p-3">
							<!-- Menu item name + delete -->
							<div class="flex items-center justify-between mb-2">
								<span class="text-sm font-medium text-gray-900">{menu.name}</span>
								<button
									onclick={() => onDeleteMenu(menu.id)}
									class="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
									title="Delete menu item"
								>
									<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
									</svg>
								</button>
							</div>

							<!-- Products list -->
							{#if menu.products.length > 0}
								<div class="space-y-1">
									{#each menu.products as product}
										<div class="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 border border-gray-100 rounded-md">
											<span class="text-xs text-gray-700 truncate flex-1">{product.name}</span>
											{#if product.allergens && product.allergens.length > 0}
												<div class="flex gap-0.5 flex-shrink-0 flex-wrap justify-end">
													{#each product.allergens.slice(0, 3) as allergen}
														<span class="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px]">{allergen.name}</span>
													{/each}
													{#if product.allergens.length > 3}
														<span class="text-[10px] text-gray-400">+{product.allergens.length - 3}</span>
													{/if}
												</div>
											{/if}
										</div>
									{/each}
								</div>
							{:else}
								<p class="text-xs text-gray-400 italic">No products selected</p>
							{/if}

							<!-- Derived allergens for this menu item -->
							{#if menu.allergens && menu.allergens.length > 0}
								<div class="mt-2 flex flex-wrap gap-1">
									{#each menu.allergens as allergen}
										<span class="px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-[10px]">{allergen.name}</span>
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- All allergens summary -->
		{#if allAllergens.length > 0}
			<div>
				<h4 class="text-sm font-semibold text-gray-900 mb-1">All Course Allergens</h4>
				<div class="flex flex-wrap gap-1">
					{#each allAllergens as allergen}
						<span class="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">{allergen.name}</span>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- Footer -->
	<div class="px-5 py-4 border-t border-gray-200 bg-gray-50 flex gap-2">
		<button
			onclick={onAddMenu}
			class="flex-1 bg-amber-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-amber-700 transition-colors flex items-center justify-center gap-2"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			Add Menu Item
		</button>
		<button
			onclick={onClose}
			class="px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
		>
			Close
		</button>
	</div>
</div>
