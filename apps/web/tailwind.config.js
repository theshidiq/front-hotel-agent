/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				// Brand navy accent (replaces the old blue-600 accent)
				navy: {
					DEFAULT: '#162C4E',
					50: '#eef2f8',
					100: '#d6e0ee',
					600: '#1f3d6b',
					700: '#1a3459',
					800: '#162C4E',
					900: '#101f37'
				}
			}
		}
	},
	plugins: [require('@tailwindcss/typography')]
};
