interface ImportMetaEnv {
  readonly VITE_API_HOST: string;
  // 他のVITE_*変数をここに追加
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
