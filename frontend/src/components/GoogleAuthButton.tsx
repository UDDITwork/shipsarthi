import React, { useState } from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';

interface GoogleAuthButtonProps {
  onSuccess: (credential: string) => void;
  onError: (error: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  className?: string;
  mode?: 'signin' | 'signup';
}

const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({ 
  onSuccess, 
  onError,
  text = 'continue_with',
  className = '',
  mode = 'signup'
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    if (credentialResponse.credential) {
      setIsLoading(true);
      try {
        await onSuccess(credentialResponse.credential);
      } catch (error: any) {
        onError(error.message || 'Google authentication failed');
      } finally {
        setIsLoading(false);
      }
    } else {
      onError('No credential received from Google');
    }
  };

  const handleError = () => {
    onError('Google authentication was cancelled or failed');
  };

  return (
    <div className={`google-auth-container ${className}`}>
      {isLoading ? (
        <div className="google-auth-loading">
          <div className="spinner"></div>
          <span>Authenticating with Google...</span>
        </div>
      ) : (
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
          text={text}
          size="large"
          width="100%"
          logo_alignment="left"
        />
      )}
    </div>
  );
};

export default GoogleAuthButton;

