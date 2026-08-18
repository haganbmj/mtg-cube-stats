/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

interface ImportMetaEnv {
  /** Set to any truthy value to log LOAD PROFILE traces during preset loading. */
  readonly VITE_LOAD_PROFILE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
