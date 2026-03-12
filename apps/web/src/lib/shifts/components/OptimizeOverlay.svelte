<script lang="ts">
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { fade } from 'svelte/transition';
	import { Sparkles, Check, Loader2, Timer, X } from 'lucide-svelte';

	interface Props {
		progress: number;
		elapsed: number;
		oncancel?: () => void;
	}

	let { progress, elapsed, oncancel }: Props = $props();

	const display = tweened(0, { duration: 600, easing: cubicOut });
	$effect(() => { display.set(progress); });

	const stages = [
		{ key: 'init',        label: '初期化' },
		{ key: 'constraints', label: '制約チェック' },
		{ key: 'model',       label: 'モデル構築' },
		{ key: 'solver',      label: 'OR-Tools 最適化' },
		{ key: 'extract',     label: '解の抽出' },
		{ key: 'save',        label: '保存' },
	];

	const activeIndex = $derived(
		progress < 10 ? 0
		: progress < 25 ? 1
		: progress < 45 ? 2
		: progress < 80 ? 3
		: progress < 95 ? 4
		: 5
	);
</script>

<div class="overlay" transition:fade={{ duration: 200 }}>
	<div class="glass-card">

		<div class="header">
			<div class="icon-pulse">
				<Sparkles size={16} strokeWidth={2} />
			</div>
			<div class="titles">
				<span class="title">自動最適化 実行中</span>
				<span class="subtitle">OR-Tools CP-SATソルバー</span>
			</div>
			<span class="percentage">{Math.round($display)}%</span>
		</div>

		<div class="bar-track">
			<div class="bar-fill" style="width: {$display}%"></div>
		</div>

		<ul class="stages">
			{#each stages as stage, i}
				<li
					class="stage"
					class:done={i < activeIndex}
					class:active={i === activeIndex}
					class:pending={i > activeIndex}
				>
					<div class="stage-icon">
						{#if i < activeIndex}
							<Check size={13} strokeWidth={2.5} />
						{:else if i === activeIndex}
							<Loader2 size={13} strokeWidth={2.5} class="spin" />
						{:else}
							<div class="dot"></div>
						{/if}
					</div>
					<span class="stage-label">{stage.label}</span>
					{#if i < activeIndex}
						<span class="done-label">完了</span>
					{/if}
				</li>
			{/each}
		</ul>

		<div class="footer">
			<Timer size={13} />
			<span>経過時間: {elapsed}秒</span>
			{#if oncancel}
				<button class="cancel-btn" onclick={oncancel}>
					<X size={12} strokeWidth={2.5} />
					キャンセル
				</button>
			{/if}
		</div>

	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 200;
		display: flex;
		align-items: center;
		justify-content: center;
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
		background: rgba(248, 249, 250, 0.55);
	}

	.glass-card {
		width: 360px;
		background: rgba(255, 255, 255, 0.82);
		backdrop-filter: blur(24px);
		-webkit-backdrop-filter: blur(24px);
		border: 1px solid rgba(255, 255, 255, 0.7);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.95),
			0 8px 32px rgba(0, 0, 0, 0.10),
			0 2px 8px rgba(0, 0, 0, 0.06);
		border-radius: 16px;
		padding: 22px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.header {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.icon-pulse {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: #eef2ff;
		color: #6366f1;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		animation: pulse 2s ease-in-out infinite;
	}

	.titles {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.title {
		font-size: 13px;
		font-weight: 600;
		color: #1f2937;
		line-height: 1.3;
	}

	.subtitle {
		font-size: 11px;
		color: #9ca3af;
	}

	.percentage {
		font-size: 22px;
		font-weight: 700;
		color: #6366f1;
		font-variant-numeric: tabular-nums;
		min-width: 52px;
		text-align: right;
	}

	.bar-track {
		width: 100%;
		height: 5px;
		background: #e0e7ff;
		border-radius: 999px;
		overflow: hidden;
	}

	.bar-fill {
		height: 100%;
		border-radius: 999px;
		background: linear-gradient(90deg, #6366f1, #8b5cf6);
		transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.stages {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 7px;
	}

	.stage {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12.5px;
		transition: opacity 0.3s;
	}

	.stage.pending { opacity: 0.35; }
	.stage.done    { color: #6b7280; }
	.stage.active  { color: #6366f1; font-weight: 600; }

	.stage-icon {
		width: 18px;
		height: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.stage.done .stage-icon  { color: #22c55e; }
	.stage.active .stage-icon { color: #6366f1; }

	.dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: currentColor;
		opacity: 0.4;
	}

	.stage-label { flex: 1; }

	.done-label {
		font-size: 10.5px;
		color: #22c55e;
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
		border-radius: 4px;
		padding: 1px 6px;
	}

	.footer {
		display: flex;
		align-items: center;
		gap: 5px;
		padding-top: 10px;
		border-top: 1px solid rgba(0, 0, 0, 0.06);
		font-size: 11.5px;
		color: #9ca3af;
	}

	.cancel-btn {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 11.5px;
		color: #6b7280;
		background: transparent;
		border: 1px solid #e5e7eb;
		border-radius: 6px;
		padding: 3px 8px;
		cursor: pointer;
		transition: background 0.15s, color 0.15s;
	}
	.cancel-btn:hover {
		background: #fef2f2;
		color: #ef4444;
		border-color: #fca5a5;
	}

	@keyframes pulse {
		0%, 100% { transform: scale(1);    opacity: 1; }
		50%       { transform: scale(1.12); opacity: 0.75; }
	}

	:global(.spin) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to   { transform: rotate(360deg); }
	}
</style>
