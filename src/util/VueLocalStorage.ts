import { ref, watch, type Ref } from 'vue';

/**
 * Bind a reactive Vue ref to localStorage with automatic serialization/deserialization
 * @param key LocalStorage key
 * @param initFunc Function to call on the retrieved LocalStorage value at init
 * @returns Vue reactive ref
 */
export function bindStorage<T>(key: string, initFunc: (value: any) => T): Ref<T> {
    const initialValue = initFunc(safeJsonParse(localStorage.getItem(key)));
    const r = ref<T>(initialValue);

    watch(r, (newValue) => {
        localStorage.setItem(key, JSON.stringify(newValue));
    }, { deep: true });

    return r;
}

function safeJsonParse(jsonString: string | null): any {
    try {
        return jsonString ? JSON.parse(jsonString) : null;
    } catch {
        return null;
    }
}
