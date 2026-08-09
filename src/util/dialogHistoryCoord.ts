// Coordinates history-back handling between useBackDismiss and useDetailNavigation
// so that popstate events for nested useBackDismiss dialogs (e.g. the filter
// help modal opened from inside CubeDetailDialog) don't also close the outer
// detail dialog.

let nestedDismissDepth = 0;
let pendingExternalPops = 0;

export function notifyNestedDismissOpen(): void {
    nestedDismissDepth++;
}

export function notifyNestedDismissClosed(): void {
    if (nestedDismissDepth > 0) nestedDismissDepth--;
}

export function hasNestedDismissDialog(): boolean {
    return nestedDismissDepth > 0;
}

// Called before useBackDismiss triggers a programmatic history.back() so
// other popstate consumers know to ignore the resulting event.
export function signalExternalHistoryBack(): void {
    pendingExternalPops++;
}

export function consumeSignaledHistoryBack(): boolean {
    if (pendingExternalPops > 0) {
        pendingExternalPops--;
        return true;
    }
    return false;
}
