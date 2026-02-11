<script lang="ts">
	import { Handle, Position, type NodeProps } from '@xyflow/svelte';

	let { data }: NodeProps = $props();

	let editing = $state(false);
	let editName = $state('');

	function startEdit() {
		if (!data.onRename) return;
		editName = data.courseName;
		editing = true;
	}

	function cancelEdit() {
		editing = false;
	}

	function submitEdit() {
		const trimmed = editName.trim();
		if (trimmed && trimmed !== data.courseName && data.onRename) {
			data.onRename(data.courseId, trimmed);
		}
		editing = false;
	}
</script>

<Handle type="target" position={Position.Top} />

<div class="rounded-lg px-3 py-2 min-w-[160px] border-2 shadow-sm {data.isRestricted ? 'bg-blue-50 border-blue-500' : 'bg-blue-50/50 border-blue-300'}">
	<div class="flex items-center gap-2">
		<svg class="w-3.5 h-3.5 flex-shrink-0 {data.isRestricted ? 'text-blue-600' : 'text-blue-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
		</svg>
		{#if editing}
			<input
				type="text"
				bind:value={editName}
				class="nodrag text-sm bg-white border border-blue-300 rounded px-1.5 py-0.5 w-full focus:ring-2 focus:ring-blue-400 focus:outline-none"
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
				class="text-sm cursor-pointer hover:underline {data.isRestricted ? 'text-gray-900' : 'text-gray-700'}"
				ondblclick={startEdit}
				title={data.onRename ? 'Double-click to rename' : ''}
			>{data.courseName}</span>
		{/if}
		<span class="text-xs px-1.5 py-0.5 rounded flex-shrink-0 {data.menuCount > 0 ? 'text-blue-600 bg-blue-100' : 'text-gray-400 bg-gray-100'}">
			{data.menuCount} items
		</span>
	</div>
</div>
