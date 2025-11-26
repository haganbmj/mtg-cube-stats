import { ref, watch } from 'vue';

/**
 * @param {string} key LocalStorage key.
 * @param {function(string)} initFunc Function call on the retrieved LocalStorage value at init.
 * @returns Vue value ref.
 */
export function bindStorage(key, initFunc) {
    const initialValue = initFunc(safeJsonParse(localStorage.getItem(key)));
    const r = ref(initialValue);
    watch(r, (newValue) => {
        localStorage.setItem(key, JSON.stringify(newValue));
    }, { deep: true });
    return r;
}

function safeJsonParse(jsonString) {
    try {
        return JSON.parse(jsonString);
    } catch {
        return null;
    }
}
