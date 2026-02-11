<script lang="ts">
	import { Handle, Position, type NodeProps } from '@xyflow/svelte';

	let { data }: NodeProps = $props();

	let editing = $state(false);
	let editName = $state('');
	let editStartDate = $state('');
	let editEndDate = $state('');

	function startEdit() {
		editName = data.season.name;
		editStartDate = data.season.start_date ?? '';
		editEndDate = data.season.end_date ?? '';
		editing = true;
	}

	function cancelEdit() {
		editing = false;
	}

	function submitEdit() {
		const trimmedName = editName.trim();
		if (!trimmedName) {
			editing = false;
			return;
		}

		const nameChanged = trimmedName !== data.season.name;
		const startChanged = editStartDate !== (data.season.start_date ?? '');
		const endChanged = editEndDate !== (data.season.end_date ?? '');

		if (nameChanged || startChanged || endChanged) {
			data.onUpdate(data.season.id, {
				name: trimmedName,
				start_date: editStartDate || undefined,
				end_date: editEndDate || undefined,
			});
		}
		editing = false;
	}
</script>

<div class="rounded-xl bg-green-50 border-2 border-green-500 shadow-sm px-4 py-3 min-w-[220px]">
	{#if editing}
		<div class="space-y-2">
			<div class="flex items-center gap-2">
				<svg class="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
				</svg>
				<input
					type="text"
					bind:value={editName}
					placeholder="Season name"
					class="nodrag font-semibold text-green-900 text-sm bg-white border border-green-300 rounded px-1.5 py-0.5 w-full focus:ring-2 focus:ring-green-400 focus:outline-none"
					onkeydown={(e) => {
						if (e.key === 'Enter') submitEdit();
						if (e.key === 'Escape') cancelEdit();
					}}
					autofocus
				/>
			</div>
			<div class="flex gap-1.5">
				<input
					type="date"
					bind:value={editStartDate}
					class="nodrag flex-1 text-xs bg-white border border-green-300 rounded px-1.5 py-1 focus:ring-2 focus:ring-green-400 focus:outline-none"
				/>
				<span class="text-xs text-green-500 self-center">~</span>
				<input
					type="date"
					bind:value={editEndDate}
					class="nodrag flex-1 text-xs bg-white border border-green-300 rounded px-1.5 py-1 focus:ring-2 focus:ring-green-400 focus:outline-none"
				/>
			</div>
			<div class="flex gap-1.5">
				<button
					class="nodrag flex-1 text-xs bg-green-600 text-white rounded px-2 py-1 hover:bg-green-700 transition-colors font-medium"
					onclick={submitEdit}
				>Save</button>
				<button
					class="nodrag text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
					onclick={cancelEdit}
				>Cancel</button>
			</div>
		</div>
	{:else}
		<div class="flex items-center gap-2 mb-1">
			<svg class="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
			</svg>
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<span
				class="font-semibold text-green-900 text-sm cursor-pointer hover:underline"
				ondblclick={startEdit}
				title="Double-click to edit"
			>{data.season.name}</span>
		</div>

		{#if data.season.start_date || data.season.end_date}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<p
				class="text-xs text-green-600 mb-2 cursor-pointer hover:underline"
				ondblclick={startEdit}
				title="Double-click to edit dates"
			>
				{data.season.start_date ?? '?'} ~ {data.season.end_date ?? '?'}
			</p>
		{:else}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<p
				class="text-xs text-green-400 mb-2 cursor-pointer hover:underline italic"
				ondblclick={startEdit}
				title="Double-click to set dates"
			>
				No dates set
			</p>
		{/if}

		<div class="flex items-center justify-between">
			<span class="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
				{data.groupCount} group{data.groupCount !== 1 ? 's' : ''}
			</span>
			<div class="flex items-center gap-1">
				<button
					class="nodrag p-1 rounded hover:bg-green-200 text-green-600 transition-colors"
					title="Edit"
					onclick={startEdit}
				>
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
					</svg>
				</button>
				<button
					class="nodrag p-1 rounded hover:bg-green-200 text-green-600 transition-colors"
					title="Add group"
					onclick={() => data.onAddGroup(data.season.id)}
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
				</button>
				<button
					class="nodrag p-1 rounded hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors"
					title="Delete season"
					onclick={() => data.onDelete(data.season.id, data.groupCount)}
				>
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
		</div>
	{/if}
</div>

<Handle type="source" position={Position.Bottom} />
