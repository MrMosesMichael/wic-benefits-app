/**
 * Camera permission utilities
 */
import { Camera } from 'react-native-vision-camera';
import { Alert, Linking } from 'react-native';

export async function requestCameraPermission(): Promise<boolean> {
  try {
    const permission = await Camera.requestCameraPermission();

    if (permission === 'denied') {
      Alert.alert(
        'Camera Permission Required',
        'This app needs camera access to scan product barcodes. Please grant camera permission in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    }

    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting camera permission:', error);
    return false;
  }
}

export async function checkCameraPermission(): Promise<boolean> {
  const permission = await Camera.getCameraPermissionStatus();
  return permission === 'granted';
}
