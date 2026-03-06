// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	interface Window {
		google?: {
			accounts: {
				id: {
					initialize: (config: {
						client_id: string;
						callback: (response: { credential: string }) => void;
						auto_select?: boolean;
						cancel_on_tap_outside?: boolean;
					}) => void;
					prompt: (callback?: (notification: {
						isDismissedMoment?: () => boolean;
						isNotDisplayed?: () => boolean;
					}) => void) => void;
					renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
				};
			};
		};
	}
}

export {};
