import { useState, useEffect, useCallback } from "react";

export function useBiometrics() {
  const [isSupported, setIsSupported] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    if (window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then((available) => setIsSupported(available))
        .catch(() => setIsSupported(false));
    }
    
    const storedId = localStorage.getItem("vault_biometric_id");
    setIsRegistered(!!storedId);
  }, []);

  const register = useCallback(async (): Promise<boolean> => {
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const userId = new Uint8Array(16);
      window.crypto.getRandomValues(userId);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "Vault", id: window.location.hostname },
          user: { id: userId, name: "vault_user", displayName: "Vault User" },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 }, // ES256
            { type: "public-key", alg: -257 } // RS256
          ],
          authenticatorSelection: { 
            authenticatorAttachment: "platform", 
            userVerification: "required" 
          },
          timeout: 60000,
        }
      });

      if (credential) {
        const rawId = Array.from(new Uint8Array((credential as any).rawId));
        localStorage.setItem("vault_biometric_id", JSON.stringify(rawId));
        setIsRegistered(true);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Biometric registration failed:", err);
      return false;
    }
  }, []);

  const authenticate = useCallback(async (): Promise<boolean> => {
    try {
      const storedId = localStorage.getItem("vault_biometric_id");
      if (!storedId) return false;

      const rawIdArray = JSON.parse(storedId);
      const credentialId = new Uint8Array(rawIdArray);
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [{ type: "public-key", id: credentialId, transports: ["internal"] }],
          userVerification: "required",
          timeout: 60000,
        }
      });

      return !!assertion;
    } catch (err) {
      console.error("Biometric verification failed:", err);
      return false;
    }
  }, []);

  const unregister = () => {
    localStorage.removeItem("vault_biometric_id");
    setIsRegistered(false);
  };

  return { isSupported, isRegistered, register, authenticate, unregister };
}
