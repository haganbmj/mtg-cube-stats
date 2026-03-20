export interface StickyTableColumn {
    key: string;
    prop?: string;
    label: string;
    visible?: boolean;
    sortable?: boolean;
    sortKey?: string;
    sortMethod?: (a: any, b: any) => number;
    align?: 'left' | 'center' | 'right';
    width?: string;
    minWidth?: string;
    maxWidth?: string;
    tooltip?: string;
    formatter?: (row: any) => string;
    showOverflowTooltip?: boolean;
}
