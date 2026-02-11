<script lang="ts">
	import { Handle, Position, type NodeProps } from '@xyflow/svelte';

	let { data }: NodeProps = $props();

	const availableCourses = $derived(
		data.allCourses.filter((c: { id: string }) => !data.selectedCourseIds.includes(c.id))
	);
</script>

<Handle type="target" position={Position.Top} />

<div class="rounded-xl bg-white border-2 border-indigo-400 shadow-md px-4 py-3 min-w-[260px] max-w-[300px]">
	<div class="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200">
		<svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
		</svg>
		<span class="text-sm font-medium text-indigo-900">Add Course</span>
		<span class="text-xs text-gray-400 ml-auto">
			{availableCourses.length} available
		</span>
	</div>

	<div class="nodrag nowheel space-y-1 max-h-[200px] overflow-y-auto">
		{#each availableCourses as course}
			<button
				class="nodrag flex items-center gap-2 w-full p-1.5 rounded hover:bg-indigo-50 cursor-pointer transition-colors text-left"
				onclick={() => data.onToggle(data.groupId, course.id)}
			>
				<svg class="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				<span class="text-sm text-gray-700">{course.label}</span>
			</button>
		{/each}
		{#if availableCourses.length === 0}
			<p class="text-xs text-gray-400 py-2 text-center">All courses assigned</p>
		{/if}
	</div>
</div>
