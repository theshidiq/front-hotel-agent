import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	envDir: '../../',
	ssr: {
		noExternal: ['@xyflow/svelte', '@xyflow/system']
	}
});
