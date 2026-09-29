declare module '@env' {
  export const SUPABASE_URL: string;
  export const SUPABASE_ANON_KEY: string;
  /** Credencial «Web» de Google Cloud; vacía = sin botón de Google */
  export const GOOGLE_WEB_CLIENT_ID: string | undefined;
}
