import * as MediaLibrary from 'expo-media-library';

/**
 * Copia o ficheiro local para a galeria / biblioteca de média do dispositivo.
 */
export async function saveCaptureToDeviceGallery(localUri: string): Promise<void> {
  const existing = await MediaLibrary.getPermissionsAsync();
  if (!existing.granted) {
    const req = await MediaLibrary.requestPermissionsAsync();
    if (!req.granted) return;
  }
  await MediaLibrary.saveToLibraryAsync(localUri);
}
