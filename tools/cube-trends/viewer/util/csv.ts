export interface CsvColumn<T> {
    key: string;
    label: string;
    value: (row: T) => unknown;
}

const INJECTION_PREFIX = /^[=+\-@\t\r]/;
const NEEDS_QUOTING = /[",\r\n]/;

function escapeCell(raw: unknown): string {
    if (raw === null || raw === undefined) {
        return '';
    }
    if (typeof raw === 'number') {
        return String(raw);
    }

    let text = String(raw);
    if (INJECTION_PREFIX.test(text)) {
        text = `'${text}`;
    }
    if (NEEDS_QUOTING.test(text)) {
        text = `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
    const header = columns.map((column) => escapeCell(column.label)).join(',');
    const lines = rows.map((row) => columns.map((column) => escapeCell(column.value(row))).join(','));
    return [header, ...lines].join('\r\n');
}

export function downloadText(filename: string, text: string, mime: string): void {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}
