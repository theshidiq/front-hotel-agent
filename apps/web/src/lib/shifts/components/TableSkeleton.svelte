<script lang="ts">
	// Skeleton loader overlay for schedule table when switching periods
	interface Props {
		rows?: number;
		columns?: number;
	}

	let { rows = 10, columns = 15 }: Props = $props();
</script>

<div class="animate-pulse overflow-hidden rounded-lg">
	<!-- Header Row -->
	<div class="flex border-b border-gray-200 bg-gray-50">
		<div class="w-24 h-12 px-2 py-3 border-r border-gray-200 flex-shrink-0">
			<div class="w-full h-5 bg-gray-300 rounded"></div>
		</div>
		{#each Array(columns) as _, i}
			<div class="w-16 h-12 px-1 py-3 border-r border-gray-200 flex-shrink-0 text-center">
				<div class="w-10 h-4 bg-gray-300 rounded mx-auto mb-1"></div>
				<div class="w-6 h-3 bg-gray-200 rounded mx-auto"></div>
			</div>
		{/each}
	</div>

	<!-- Data Rows -->
	{#each Array(rows) as _, rowIndex}
		<div class="flex border-b border-gray-100 {rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}">
			<!-- Staff Name Column -->
			<div class="w-24 h-10 px-2 py-2 border-r border-gray-200 flex-shrink-0 flex items-center">
				<div class="w-full h-4 bg-gray-{200 + (rowIndex % 2) * 50} rounded"></div>
			</div>

			<!-- Shift Cells -->
			{#each Array(columns) as _, colIndex}
				<div class="w-16 h-10 px-1 py-2 border-r border-gray-100 flex-shrink-0 flex items-center justify-center">
					<div class="w-8 h-6 bg-gray-{150 + ((rowIndex + colIndex) % 3) * 50} rounded"></div>
				</div>
			{/each}
		</div>
	{/each}
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
