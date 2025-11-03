// Type declarations for @react-oauth/google
// This file ensures TypeScript recognizes the module

declare module '@react-oauth/google' {
  import { ReactNode } from 'react';

  export interface CredentialResponse {
    credential?: string;
    select_by?: 'auto' | 'user' | 'user_1tap' | 'user_2tap' | 'btn' | 'btn_confirm' | 'btn_add_session' | 'btn_confirm_add_session';
    clientId?: string;
  }

  export interface GoogleOAuthProviderProps {
    clientId: string;
    children: ReactNode;
    nonce?: string;
    onScriptLoadSuccess?: () => void;
    onScriptLoadError?: () => void;
  }

  export interface GoogleLoginProps {
    onSuccess: (credentialResponse: CredentialResponse) => void;
    onError?: () => void;
    text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
    size?: 'large' | 'medium' | 'small';
    width?: string | number;
    logo_alignment?: 'left' | 'center';
    shape?: 'rectangular' | 'pill' | 'circle' | 'square';
    theme?: 'outline' | 'filled_blue' | 'filled_black';
    type?: 'standard' | 'icon';
    locale?: string;
  }

  export function GoogleOAuthProvider(props: GoogleOAuthProviderProps): JSX.Element;
  
  export function GoogleLogin(props: GoogleLoginProps): JSX.Element;
}

