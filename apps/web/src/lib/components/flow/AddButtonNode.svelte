<script lang="ts">
	import { Handle, Position, type NodeProps } from '@xyflow/svelte';

	let { data }: NodeProps = $props();
</script>

{#if data.hasTarget}
	<Handle type="target" position={Position.Top} />
{/if}

<button
	class="nodrag rounded-lg border-2 border-dashed border-gray-300 bg-white px-4 py-2 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer min-w-[180px] text-center"
	onclick={() => data.onClick()}
>
	{data.label}
</button>

{#if data.hasSource}
	<Handle type="source" position={Position.Bottom} />
{/if}
