<script lang="ts">
	// Skeleton loader for schedule table
	// Shows animated placeholders while data is loading

	interface Props {
		rows?: number;
		columns?: number;
	}

	let { rows = 10, columns = 15 }: Props = $props();
</script>

<div class="animate-pulse">
	<!-- Toolbar Skeleton -->
	<div class="bg-white rounded-lg shadow p-4 mb-4 flex flex-wrap items-center gap-4">
		<!-- Period Picker Skeleton -->
		<div class="flex items-center gap-1">
			<div class="w-10 h-10 bg-gray-200 rounded-lg"></div>
			<div class="w-44 h-10 bg-gray-200 rounded-lg"></div>
			<div class="w-10 h-10 bg-gray-200 rounded-lg"></div>
		</div>

		<div class="flex-1"></div>

		<!-- Action Buttons Skeleton -->
		<div class="flex items-center gap-2">
			<div class="w-32 h-10 bg-gray-200 rounded-lg"></div>
			<div class="w-28 h-10 bg-gray-200 rounded-lg"></div>
		</div>
	</div>

	<!-- Table Skeleton -->
	<div class="bg-white rounded-lg shadow overflow-hidden">
		<!-- Header Row -->
		<div class="flex border-b border-gray-200 bg-gray-50">
			<div class="w-24 h-12 px-2 py-3 border-r border-gray-200 flex-shrink-0">
				<div class="w-full h-5 bg-gray-200 rounded"></div>
			</div>
			{#each Array(columns) as _, i}
				<div class="w-16 h-12 px-1 py-3 border-r border-gray-200 flex-shrink-0 text-center">
					<div class="w-10 h-4 bg-gray-200 rounded mx-auto mb-1"></div>
					<div class="w-6 h-3 bg-gray-200 rounded mx-auto"></div>
				</div>
			{/each}
		</div>

		<!-- Data Rows -->
		{#each Array(rows) as _, rowIndex}
			<div class="flex border-b border-gray-100 {rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}">
				<!-- Staff Name Column -->
				<div class="w-24 h-10 px-2 py-2 border-r border-gray-200 flex-shrink-0 flex items-center gap-2">
					<div class="w-full h-4 bg-gray-200 rounded"></div>
				</div>

				<!-- Shift Cells -->
				{#each Array(columns) as _, colIndex}
					<div class="w-16 h-10 px-1 py-2 border-r border-gray-100 flex-shrink-0 flex items-center justify-center">
						<div class="w-8 h-6 bg-gray-{150 + (rowIndex + colIndex) % 3 * 50} rounded"></div>
					</div>
				{/each}
			</div>
		{/each}
	</div>

	<!-- Legend Skeleton -->
	<div class="mt-4 bg-white rounded-lg shadow p-4">
		<div class="w-12 h-4 bg-gray-200 rounded mb-3"></div>
		<div class="flex flex-wrap gap-4">
			{#each Array(6) as _}
				<div class="flex items-center gap-2">
					<div class="w-8 h-8 bg-gray-200 rounded"></div>
					<div class="w-12 h-4 bg-gray-200 rounded"></div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Shortcuts Skeleton -->
	<div class="mt-2">
		<div class="w-3/4 h-3 bg-gray-200 rounded"></div>
	</div>
</div>

<style>
	/* Custom animation for smoother skeleton loading */
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
