import type { InjectionKey } from 'vue';

export type OpenCubeDetailDialog = (cubeId: string) => void;
export type OpenCardDetailDialog = (oracleId: string) => void;

export const openCubeDetailDialogKey: InjectionKey<OpenCubeDetailDialog> = Symbol('openCubeDetailDialog');
export const openCardDetailDialogKey: InjectionKey<OpenCardDetailDialog> = Symbol('openCardDetailDialog');
