import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

/** Ruta pública (sin grupo `(auth)`) para que coincida con Redirect URLs en Supabase. */
export const PASSWORD_RECOVERY_PATH = '/reset-password';

/**
 * URL absoluta que se envía a Supabase como `redirectTo` en el correo de recuperación.
 * Debe estar listada en Supabase → Authentication → URL configuration → Redirect URLs
 * (exactamente la misma cadena, sin espacios).
 *
 * Prioridad:
 * 1. `EXPO_PUBLIC_AUTH_RECOVERY_REDIRECT_URL` (recomendado en prod y si abres el mail en otro dispositivo)
 * 2. Web: `origin` actual + `/reset-password`
 * 3. Nativo: deep link `scheme:///reset-password`
 */
export function getPasswordRecoveryRedirectUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_AUTH_RECOVERY_REDIRECT_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}${PASSWORD_RECOVERY_PATH}`;
  }
  return Linking.createURL(PASSWORD_RECOVERY_PATH);
}
