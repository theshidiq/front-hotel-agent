import { writable } from 'svelte/store';
import { browser } from '$app/environment';

type Lang = 'en' | 'ja';

const stored = (browser && (localStorage.getItem('docs_lang') as Lang)) || 'en';

export const lang = writable<Lang>(stored);

if (browser) {
    lang.subscribe((v) => localStorage.setItem('docs_lang', v));
}
