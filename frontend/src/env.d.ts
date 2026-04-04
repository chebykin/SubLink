/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_REOWN_PROJECT_ID?: string;
  readonly VITE_CREATOR_1_URL?: string;
  readonly VITE_CREATOR_2_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<object, object, any>;
  export default component;
}

// Reown AppKit web components
declare namespace JSX {
  interface IntrinsicElements {
    "appkit-button": any;
    "w3m-button": any;
  }
}
