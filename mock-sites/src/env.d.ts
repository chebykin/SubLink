/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SITE_NAME: string;
  readonly VITE_PLAN_ID: string;
  readonly VITE_API_KEY: string;
  readonly VITE_THEME_COLOR: string;
  readonly VITE_THEME_MIX: string;
  readonly VITE_SUBLINK_API_URL: string;
  readonly VITE_SUBSCRIBE_URL: string;
  readonly VITE_REOWN_PROJECT_ID: string;
  readonly VITE_UNLINK_API_KEY: string;
  readonly VITE_UNLINK_API_ENDPOINT: string;
  readonly VITE_DEPOSIT_PERIODS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
