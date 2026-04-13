// Type augmentation to fix auto-generated provider list mismatch
declare module "@lovable.dev/cloud-auth-js" {
  export type OAuthProvider = "google" | "apple" | "microsoft";
  export function createLovableAuth(): {
    signInWithOAuth(
      provider: OAuthProvider,
      opts?: {
        redirect_uri?: string;
        extraParams?: Record<string, string>;
      }
    ): Promise<{
      redirected?: boolean;
      error?: Error;
      tokens?: { access_token: string; refresh_token: string };
    }>;
  };
}
