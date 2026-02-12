<script lang="ts">
	import type { Product, CreateMenuData, Allergen } from '$lib/api';
	import { uploadImage, compressImage } from '$lib/supabase';

	interface SidebarContext {
		groupId: string;
		courseValue: string;
		courseName: string;
		seasonalMenuId?: string | null;
	}

	interface Props {
		context: SidebarContext;
		products: Product[];
		onSubmit: (data: CreateMenuData) => Promise<void>;
		onClose: () => void;
	}

	let { context, products, onSubmit, onClose }: Props = $props();

	// Form state
	let name = $state('');
	let description = $state('');
	let price = $state<string>('');
	let selectedProductIds = $state<string[]>([]);
	let imageFile: File | null = $state(null);
	let imagePreview: string | null = $state(null);
	let isUploadingImage = $state(false);
	let isSubmitting = $state(false);
	let error = $state<string | null>(null);

	// Product search
	let productSearchTerm = $state('');
	let productSearchFocused = $state(false);

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

	function addProduct(productId: string) {
		selectedProductIds = [...selectedProductIds, productId];
		productSearchTerm = '';
	}

	function removeProduct(productId: string) {
		selectedProductIds = selectedProductIds.filter((id) => id !== productId);
	}

	function handleImageSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		imageFile = file;
		if (imagePreview) URL.revokeObjectURL(imagePreview);
		imagePreview = URL.createObjectURL(file);
	}

	function clearImage() {
		if (imagePreview) URL.revokeObjectURL(imagePreview);
		imageFile = null;
		imagePreview = null;
	}

	async function handleSubmit() {
		if (!name.trim()) {
			error = 'Menu name is required';
			return;
		}
		isSubmitting = true;
		error = null;
		try {
			let image_url: string | null = null;
			if (imageFile) {
				isUploadingImage = true;
				const compressed = await compressImage(imageFile);
				image_url = await uploadImage(compressed);
				isUploadingImage = false;
			}

			const data: CreateMenuData = {
				name: name.trim(),
				description: description.trim() || null,
				price: price ? parseFloat(price) : null,
				category: context.courseValue,
				menu_group_id: context.groupId,
				seasonal_menu_id: context.seasonalMenuId || null,
				image_url,
				is_available: true,
				product_ids: selectedProductIds.length > 0 ? selectedProductIds : undefined,
			};
			await onSubmit(data);
		} catch (e: any) {
			error = e.message || 'Failed to create menu';
		} finally {
			isSubmitting = false;
			isUploadingImage = false;
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
	<div class="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-amber-50">
		<div>
			<h3 class="text-base font-bold text-gray-900">Add Menu Item</h3>
			<p class="text-xs text-amber-700 mt-0.5">Course: {context.courseName}</p>
		</div>
		<button onclick={onClose} class="p-1.5 rounded-lg hover:bg-amber-100 text-gray-500 transition-colors">
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	</div>

	<!-- Form (scrollable) -->
	<div class="flex-1 overflow-y-auto p-5 space-y-4">
		<!-- Name -->
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-1">Name <span class="text-red-500">*</span></label>
			<input
				type="text"
				bind:value={name}
				placeholder="e.g., Grilled Salmon"
				class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
				onkeydown={(e) => e.key === 'Enter' && handleSubmit()}
			/>
		</div>

		<!-- Description -->
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
			<textarea
				bind:value={description}
				placeholder="Brief description..."
				rows={2}
				class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:outline-none resize-none"
			></textarea>
		</div>

		<!-- Price -->
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-1">Price (¥)</label>
			<input
				type="number"
				bind:value={price}
				placeholder="0"
				min="0"
				step="1"
				class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
			/>
		</div>

		<!-- Image -->
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-1">Image</label>
			{#if imagePreview}
				<div class="relative">
					<img src={imagePreview} alt="Preview" class="w-full rounded-lg object-cover max-h-36" />
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
				<label class="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-amber-400 hover:bg-amber-50/30 transition-colors">
					<svg class="w-6 h-6 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
					</svg>
					<span class="text-xs text-gray-500">Click to upload image</span>
					<input type="file" accept="image/*" class="hidden" onchange={handleImageSelect} />
				</label>
			{/if}
		</div>

		<!-- Product Selection -->
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-1">Products/Ingredients</label>
			<div class="relative">
				<input
					type="text"
					bind:value={productSearchTerm}
					onfocus={() => (productSearchFocused = true)}
					onblur={() => setTimeout(() => (productSearchFocused = false), 200)}
					placeholder="Search products..."
					class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
				/>
				{#if productSearchFocused && availableProducts.length > 0}
					<div class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
						{#each availableProducts.slice(0, 10) as product}
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
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
						{#if availableProducts.length > 10}
							<div class="px-3 py-2 text-xs text-gray-400 text-center bg-gray-50">
								+{availableProducts.length - 10} more (type to filter)
							</div>
						{/if}
					</div>
				{:else if productSearchFocused && availableProducts.length === 0}
					<div class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm text-gray-500 text-center">
						{products.length === 0 ? 'No products available' : 'All products selected'}
					</div>
				{/if}
			</div>
		</div>

		<!-- Selected Products -->
		{#if selectedProducts.length > 0}
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1">Selected ({selectedProducts.length})</label>
				<div class="space-y-1 p-2 bg-gray-50 rounded-lg">
					{#each selectedProducts as product}
						<div class="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-white border border-gray-200 rounded-md">
							<span class="text-sm text-gray-800 truncate flex-1">{product.name}</span>
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

		<!-- Error -->
		{#if error}
			<p class="text-red-600 text-sm">{error}</p>
		{/if}
	</div>

	<!-- Footer -->
	<div class="px-5 py-4 border-t border-gray-200 bg-gray-50 flex gap-2">
		<button
			onclick={handleSubmit}
			disabled={isSubmitting || !name.trim()}
			class="flex-1 bg-amber-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
		>
			{#if isSubmitting}
				<svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
				</svg>
				{isUploadingImage ? 'Uploading image...' : 'Creating...'}
			{:else}
				Add Menu Item
			{/if}
		</button>
		<button
			onclick={onClose}
			class="px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
		>
			Cancel
		</button>
	</div>
</div>
