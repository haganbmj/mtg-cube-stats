import { ref } from 'vue';
import type { Ref } from 'vue';

export type DetailEntry =
    | { type: 'cube'; id: string }
    | { type: 'card'; oracleId: string };

export type DetailEntryWithKey = DetailEntry & { key: string };

let counter = 0;

function makeKey(entry: DetailEntry): string {
    counter++;
    if (entry.type === 'cube') return `cube-${entry.id}-${counter}`;
    return `card-${entry.oracleId}-${counter}`;
}

function isSameEntry(a: DetailEntry, b: DetailEntry): boolean {
    if (a.type !== b.type) return false;
    if (a.type === 'cube' && b.type === 'cube') return a.id === b.id;
    if (a.type === 'card' && b.type === 'card') return a.oracleId === b.oracleId;
    return false;
}

// Tracks whether we initiated history.back() ourselves so we can ignore the
// resulting popstate event and avoid double-popping.
let ignoreNextPop = 0;

const stack = ref<DetailEntryWithKey[]>([]);

function push(entry: DetailEntry): void {
    const top = stack.value[stack.value.length - 1];
    if (top && isSameEntry(top, entry)) return; // duplicate prevention

    stack.value = [...stack.value, { ...entry, key: makeKey(entry) }];
    history.pushState({ detailNav: true }, '');
}

function pop(): void {
    if (stack.value.length === 0) return;
    stack.value = stack.value.slice(0, -1);
    ignoreNextPop++;
    history.back();
}

function closeAll(): void {
    const n = stack.value.length;
    if (n === 0) return;
    stack.value = [];
    ignoreNextPop += n;
    // Go back N entries to consume all pushed history states
    history.go(-n);
}

function onPopState(): void {
    if (ignoreNextPop > 0) {
        ignoreNextPop--;
        return;
    }
    // Browser back pressed by user — pop top entry without triggering history.back()
    if (stack.value.length > 0) {
        stack.value = stack.value.slice(0, -1);
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener('popstate', onPopState);
}

export function useDetailNavigation() {
    return {
        stack: stack as Readonly<Ref<DetailEntryWithKey[]>>,
        push,
        pop,
        closeAll,
    };
}
