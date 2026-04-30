import { watch, onUnmounted } from 'vue';
import type { Ref } from 'vue';

// ─────────────────────────────────────────────────────────────────────────────
// Module-level globals — shared across all useBackDismiss instances so that
// nested dialogs (e.g. CardDetailDialog opened from inside CubeDetailDialog)
// are stacked correctly and each back-press closes only the topmost dialog.
// ─────────────────────────────────────────────────────────────────────────────

const dismissStack: Array<() => void> = [];

// When a dialog is closed programmatically (X button / backdrop) we call
// history.back() to consume the history entry we pushed when it opened.
// That fires a popstate event, which we must ignore so it doesn't also try
// to close the dialog underneath. We use a counter rather than a boolean so
// that rapid open/close sequences don't desynchronise.
let ignoreNextPop = 0;

function onPopState() {
    if (ignoreNextPop > 0) {
        ignoreNextPop--;
        return;
    }
    const close = dismissStack.pop();
    if (close) {
        close();
    }
}

// Register once at module-load time. All instances share this single listener.
if (typeof window !== 'undefined') {
    window.addEventListener('popstate', onPopState);
}

// ─────────────────────────────────────────────────────────────────────────────
// useBackDismiss
//
// isOpen  — a Ref<boolean> (or a writable computed that behaves like one)
//           that controls the dialog's visibility.
// close   — a zero-arg function that sets isOpen to false (or equivalent).
//           Called by the popstate handler when the user presses back.
// ─────────────────────────────────────────────────────────────────────────────

export function useBackDismiss(isOpen: Ref<boolean>, close: () => void) {
    // Track whether this instance has a live history entry so we only push/pop
    // once per open cycle and don't get out of sync on rapid toggles.
    let pushed = false;

    const stop = watch(isOpen, (open) => {
        if (open && !pushed) {
            // Dialog opened: push a history entry and register the close callback.
            history.pushState({ backDismiss: true }, '');
            dismissStack.push(close);
            pushed = true;
        } else if (!open && pushed) {
            // Dialog closed programmatically: remove the callback and consume
            // the history entry so the browser doesn't navigate back a real page.
            const idx = dismissStack.lastIndexOf(close);
            if (idx !== -1) dismissStack.splice(idx, 1);
            ignoreNextPop++;
            history.back();
            pushed = false;
        }
    });

    onUnmounted(() => {
        // Clean up if the component is destroyed while the dialog is open.
        stop();
        if (pushed) {
            const idx = dismissStack.lastIndexOf(close);
            if (idx !== -1) dismissStack.splice(idx, 1);
            ignoreNextPop++;
            history.back();
            pushed = false;
        }
    });
}
