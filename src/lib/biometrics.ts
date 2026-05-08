import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CREDENTIALS_KEY = 'biometric_credentials';

export type BiometricType = 'fingerprint' | 'facial' | 'none';

export async function getBiometricStatus(): Promise<{
  available: boolean;
  type: BiometricType;
}> {
  if (Platform.OS === 'web') return { available: false, type: 'none' };

  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return { available: false, type: 'none' };

  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  if (!isEnrolled) return { available: false, type: 'none' };

  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  const type: BiometricType = types.includes(
    LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
  )
    ? 'facial'
    : 'fingerprint';

  return { available: true, type };
}

export async function authenticateWithBiometrics(type: BiometricType): Promise<boolean> {
  const promptMessage =
    type === 'facial' ? 'Usa Face ID para entrar' : 'Usa tu huella para entrar';

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    fallbackLabel: 'Usar contraseña',
    disableDeviceFallback: false,
    cancelLabel: 'Cancelar',
  });

  return result.success;
}

export async function saveBiometricCredentials(email: string, password: string): Promise<void> {
  await SecureStore.setItemAsync(CREDENTIALS_KEY, JSON.stringify({ email, password }));
}

export async function getBiometricCredentials(): Promise<{ email: string; password: string } | null> {
  const raw = await SecureStore.getItemAsync(CREDENTIALS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { email: string; password: string };
  } catch {
    return null;
  }
}

export async function clearBiometricCredentials(): Promise<void> {
  await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
}

export async function hasBiometricCredentials(): Promise<boolean> {
  const raw = await SecureStore.getItemAsync(CREDENTIALS_KEY);
  return raw !== null;
}
