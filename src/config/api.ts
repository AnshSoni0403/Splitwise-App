import { Platform } from 'react-native';

// Update this IP to your machine IP when testing on a real device.
// For Android emulator use 10.0.2.2, for iOS simulator localhost usually works.
const DEFAULT_LOCAL_IP = '192.168.0.194';
const PORT = 4000;

export function getApiBase() {
  if (Platform.OS === 'android') {
    // Android emulator mapping
    return `http://10.0.2.2:${PORT}/api`;
  }

  // iOS simulator and web
  return `http://localhost:${PORT}/api`;
}

export function getAuthBase() {
  // If you're testing on a real device, replace DEFAULT_LOCAL_IP with your machine IP
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${PORT}/api/auth`;
  }
  return `http://localhost:${PORT}/api/auth`;
}

export const FALLBACK_HOST = `http://${DEFAULT_LOCAL_IP}:${PORT}/api`;
export const FALLBACK_AUTH = `http://${DEFAULT_LOCAL_IP}:${PORT}/api/auth`;