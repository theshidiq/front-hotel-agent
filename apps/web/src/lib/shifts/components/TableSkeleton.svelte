<script lang="ts">
	interface Props {
		rows?: number;
		columns?: number;
	}

	let { rows = 10, columns = 15 }: Props = $props();
</script>

<!--
	Mirrors ScheduleTable exactly:
	- table-layout: fixed; w-full — columns auto-distribute to fill container
	- min-width formula matches: 40 + columns * 40
	- Header height: 50px (h-[50px])
	- Row height: 50px
	- First column sticky, dark header bg-gray-700
-->
<div class="overflow-x-auto">
	<table
		class="w-full text-sm border-collapse skeleton"
		style="table-layout: fixed; min-width: {40 + columns * 40}px;"
	>
		<thead>
			<tr>
				<!-- Corner cell: same as real "日付" th -->
				<th
					class="bg-gray-700 p-0"
					style="min-width: 40px; width: 40px; max-width: 40px; height: 50px;"
				>
					<div class="w-5 h-3 bg-gray-500 rounded mx-auto"></div>
				</th>
				<!-- Staff column headers -->
				{#each Array(columns) as _, i}
					<th
						class="bg-gray-700 p-0"
						style="min-width: 40px; width: 40px; max-width: 40px; height: 50px;"
					>
						<div class="w-8 h-3.5 bg-gray-500 rounded mx-auto"></div>
					</th>
				{/each}
			</tr>
		</thead>

		<tbody>
			{#each Array(rows) as _, rowIndex}
				<tr class="{rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
					<!-- Date cell -->
					<td
						class="border-r border-gray-200 p-0"
						style="min-width: 40px; width: 40px; max-width: 40px; height: 50px;"
					>
						<div class="flex flex-col items-center justify-center gap-1">
							<div class="w-7 h-3 bg-gray-300 rounded"></div>
							<div class="w-4 h-2.5 bg-gray-200 rounded"></div>
						</div>
					</td>
					<!-- Shift cells -->
					{#each Array(columns) as _, colIndex}
						<td
							class="border-r border-gray-100 p-0 text-center"
							style="min-width: 40px; width: 40px; max-width: 40px; height: 50px;"
						>
							{#if (rowIndex + colIndex) % 3 !== 0}
								<div class="w-5 h-5 bg-gray-{150 + ((rowIndex + colIndex) % 3) * 50} rounded mx-auto"></div>
							{/if}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.skeleton {
		animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50%       { opacity: 0.5; }
	}
</style>
