<script lang="ts">
	import { Handle, Position, type NodeProps } from '@xyflow/svelte';

	let { data }: NodeProps = $props();

	let editing = $state(false);
	let editName = $state('');

	function startEdit() {
		editName = data.group.name;
		editing = true;
	}

	function cancelEdit() {
		editing = false;
	}

	function submitEdit() {
		const trimmed = editName.trim();
		if (trimmed && trimmed !== data.group.name) {
			data.onRename(data.group.id, trimmed);
		}
		editing = false;
	}
</script>

<Handle type="target" position={Position.Top} />

<div class="rounded-xl bg-indigo-50 border-2 border-indigo-500 shadow-sm px-4 py-3 min-w-[200px]">
	<div class="flex items-center gap-2 mb-1">
		<svg class="w-4 h-4 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
		</svg>
		{#if editing}
			<input
				type="text"
				bind:value={editName}
				class="nodrag font-semibold text-indigo-900 text-sm bg-white border border-indigo-300 rounded px-1.5 py-0.5 w-full focus:ring-2 focus:ring-indigo-400 focus:outline-none"
				onkeydown={(e) => {
					if (e.key === 'Enter') submitEdit();
					if (e.key === 'Escape') cancelEdit();
				}}
				onblur={submitEdit}
				autofocus
			/>
		{:else}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<span
				class="font-semibold text-indigo-900 text-sm cursor-pointer hover:underline"
				ondblclick={startEdit}
				title="Double-click to rename"
			>{data.group.name}</span>
		{/if}
	</div>

	<div class="flex items-center justify-between">
		<span class="text-xs px-2 py-0.5 rounded-full {data.courseCount > 0 ? 'text-indigo-700 bg-indigo-100' : 'text-gray-500 bg-gray-100'}">
			{data.courseCount > 0 ? `${data.courseCount} course${data.courseCount !== 1 ? 's' : ''}` : 'No courses'}
		</span>
		<div class="flex items-center gap-1">
			<button
				class="nodrag p-1 rounded hover:bg-indigo-200 text-indigo-500 transition-colors"
				title="Edit name"
				onclick={startEdit}
			>
				<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
				</svg>
			</button>
			<button
				class="nodrag p-1 rounded hover:bg-blue-100 text-blue-500 transition-colors"
				title="Add course"
				onclick={() => data.onToggleCourses(data.group.id)}
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
			</button>
			<button
				class="nodrag p-1 rounded hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors"
				title="Delete group"
				onclick={() => data.onDelete(data.group.id)}
			>
				<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
	</div>
</div>

<Handle type="source" position={Position.Bottom} />
