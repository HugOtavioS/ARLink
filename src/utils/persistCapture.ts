import * as FileSystem from 'expo-file-system';

const PHOTOS_DIR = `${FileSystem.documentDirectory}captured_photos`;
const VIDEOS_DIR = `${FileSystem.documentDirectory}captured_videos`;

function toFileUri(uri: string): string {
  if (uri.startsWith('file://')) return uri;
  return `file://${uri}`;
}

function extensionFromUri(uri: string): string {
  const clean = uri.split('?')[0] ?? uri;
  const m = /\.([a-z0-9]+)$/i.exec(clean);
  return m ? m[1].toLowerCase() : 'png';
}

function videoExtensionFromUri(uri: string): string {
  const ext = extensionFromUri(uri);
  if (ext === 'mov' || ext === 'mp4' || ext === 'm4v' || ext === 'webm') return ext;
  return 'mp4';
}

/**
 * Copia a imagem (ex.: cache do expo-camera) para o diretório de documentos da app.
 */
export async function persistCapturedPhoto(sourceUri: string): Promise<string> {
  const from = toFileUri(sourceUri);
  const info = await FileSystem.getInfoAsync(PHOTOS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
  }
  const ext = extensionFromUri(from);
  const filename = `photo_${Date.now()}.${ext}`;
  const to = `${PHOTOS_DIR}/${filename}`;
  await FileSystem.copyAsync({ from, to });
  return to;
}

/**
 * Copia o vídeo gravado (ex.: cache do expo-camera) para o diretório de documentos da app.
 */
export async function persistCapturedVideo(sourceUri: string): Promise<string> {
  const from = toFileUri(sourceUri);
  const info = await FileSystem.getInfoAsync(VIDEOS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(VIDEOS_DIR, { intermediates: true });
  }
  const ext = videoExtensionFromUri(from);
  const filename = `video_${Date.now()}.${ext}`;
  const to = `${VIDEOS_DIR}/${filename}`;
  await FileSystem.copyAsync({ from, to });
  return to;
}
