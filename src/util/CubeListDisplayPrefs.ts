// Shared, module-scoped display prefs so every consumer (CubeListView, Tokens tab, …)
// reactively sees the same value. LocalStorage keys match the legacy per-component ones
// so user preferences persist across the change.
import { bindStorage } from './VueLocalStorage';

export type FilterMode = 'dim' | 'hide';

export const filterMode = bindStorage<FilterMode>('cube-list-filter-mode', (v) => {
    return v === 'dim' ? 'dim' : 'hide';
});

export const visualColumnCount = bindStorage<number>('cube-list-visual-column-count', (v) => {
    return typeof v === 'number' ? Math.min(20, Math.max(1, Math.round(v))) : 6;
});
