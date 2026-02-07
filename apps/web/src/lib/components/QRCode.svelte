<script lang="ts">
	import QRCode from 'qrcode';
	import { onMount } from 'svelte';

	interface Props {
		value: string;
		size?: number;
	}

	let { value, size = 200 }: Props = $props();

	let canvas: HTMLCanvasElement;

	async function generateQR() {
		if (!canvas || !value) return;

		try {
			await QRCode.toCanvas(canvas, value, {
				width: size,
				margin: 2,
				color: {
					dark: '#1e293b',
					light: '#ffffff',
				},
			});
		} catch (err) {
			console.error('QR code generation failed:', err);
		}
	}

	onMount(() => {
		generateQR();
	});

	$effect(() => {
		// Regenerate when value changes
		value;
		generateQR();
	});
</script>

<canvas bind:this={canvas} width={size} height={size}></canvas>
