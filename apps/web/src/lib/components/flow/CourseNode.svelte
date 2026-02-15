<script lang="ts">
	import { Handle, Position, type NodeProps } from '@xyflow/svelte';

	let { data }: NodeProps = $props();
</script>

<Handle type="target" position={Position.Top} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="group rounded-lg px-3 py-2 min-w-[160px] border-2 shadow-sm cursor-pointer hover:shadow-md transition-shadow {data.isRestricted ? 'bg-blue-50 border-blue-500' : 'bg-blue-50/50 border-blue-300'}"
	onclick={() => data.onViewDetail?.(data.courseId, data.groupId, data.courseValue, data.courseName)}
>
	<div class="flex items-center gap-2">
		<svg class="w-3.5 h-3.5 flex-shrink-0 {data.isRestricted ? 'text-blue-600' : 'text-blue-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
		</svg>
		<span
			class="text-sm {data.isRestricted ? 'text-gray-900' : 'text-gray-700'}"
			title="Click to view details"
		>{data.courseName}</span>
		<span class="text-xs px-1.5 py-0.5 rounded flex-shrink-0 {data.menuCount > 0 ? 'text-blue-600 bg-blue-100' : 'text-gray-400 bg-gray-100'}">
			{data.menuCount} items
		</span>
		<svg class="w-3.5 h-3.5 flex-shrink-0 text-gray-300 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
		</svg>
	</div>
</div>

<Handle type="source" position={Position.Bottom} />
