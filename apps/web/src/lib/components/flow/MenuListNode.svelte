<script lang="ts">
	import { Handle, Position, type NodeProps } from '@xyflow/svelte';

	let { data }: NodeProps = $props();
</script>

<Handle type="target" position={Position.Top} />

<div class="rounded-xl bg-amber-50 border-2 border-amber-500 shadow-sm px-3 py-2 min-w-[200px] max-w-[240px]">
	<div class="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-amber-200">
		<svg class="w-3.5 h-3.5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
		</svg>
		<span class="text-xs font-semibold text-amber-800">Menu Items</span>
		<span class="text-xs text-amber-500 ml-auto">{data.menus.length}</span>
	</div>

	<div class="nodrag nowheel space-y-1 max-h-[120px] overflow-y-auto">
		{#each data.menus as menu}
			<div class="flex items-center justify-between gap-1 p-1 rounded hover:bg-amber-100/60 group">
				<div class="flex items-center gap-1.5 min-w-0">
					<span class="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"></span>
					<span class="text-xs text-gray-800 truncate">{menu.name}</span>
				</div>
				<div class="flex items-center gap-1 flex-shrink-0">
					{#if menu.price != null}
						<span class="text-[10px] text-amber-600">¥{menu.price}</span>
					{/if}
					<button
						class="nodrag p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 text-red-400 hover:text-red-600 transition-all"
						title="Delete menu"
						onclick={() => data.onDelete(menu.id)}
					>
						<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>
		{/each}
		{#if data.menus.length === 0}
			<p class="text-[10px] text-amber-400 text-center py-1">No items</p>
		{/if}
	</div>
</div>
