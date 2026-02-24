import { getContext, setContext } from 'svelte';

const KEY = 'charLinkBase';

export function setCharLinkBase(base: string) {
	setContext(KEY, base);
}

export function getCharLinkBase(): string {
	return getContext<string>(KEY) ?? '/dictionary';
}
