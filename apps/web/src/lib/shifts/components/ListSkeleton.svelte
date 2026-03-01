<script lang="ts">
	// Skeleton loader for list items (staff list, periods list)
	interface Props {
		rows?: number;
		showHeader?: boolean;
		headerText?: string;
	}

	let { rows = 5, showHeader = true, headerText = '' }: Props = $props();
</script>

<div class="animate-pulse">
	{#if showHeader}
		<div class="flex items-center justify-between mb-4">
			<div class="w-24 h-6 bg-gray-200 rounded"></div>
			<div class="w-14 h-8 bg-gray-200 rounded"></div>
		</div>
	{/if}

	<div class="space-y-2">
		{#each Array(rows) as _, i}
			<div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
				<div class="flex-1">
					<div class="w-24 h-4 bg-gray-200 rounded mb-2"></div>
					<div class="w-32 h-3 bg-gray-{150 + (i % 2) * 50} rounded"></div>
				</div>
				<div class="flex items-center gap-2">
					<div class="w-6 h-6 bg-gray-200 rounded"></div>
					<div class="w-6 h-6 bg-gray-200 rounded"></div>
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.animate-pulse {
		animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}
</style>
