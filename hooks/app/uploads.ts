import api from '@/api/axiosInstance';
import * as FileSystem from 'expo-file-system/legacy';
import { useMutation } from '@tanstack/react-query';

export type SignatureResponse = {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
  resourceType: string;
  publicId: string | null;
  provider?: 'cloudinary' | 'gcs';
  uploadUrl?: string;
  publicUrl?: string;
};

export type CloudinaryUploadResponse = {
  secure_url?: string;
  url?: string;
  playback_url?: string;
  public_id?: string;
  resource_type?: string;
  duration?: number;
  bytes?: number;
};

type SignaturePayload = { folder: string; resourceType: string };
type ResumablePayload = {
  folder?: string;
  fileName?: string | null;
  contentType?: string | null;
};
type VideoUploadPayload = {
  signature: SignatureResponse;
  uri: string;
  fileName?: string | null;
  onProgress?: (percent: number) => void;
};

export type ResumableSessionResponse = {
  provider: 'gcs';
  uploadUrl: string;
  publicUrl: string;
  objectName: string;
  bucket: string;
  contentType: string;
};

export const useUploadSignature = () => {
  return useMutation<SignatureResponse, Error, SignaturePayload>({
    mutationFn: async (payload) => {
      const res: any = await api.post('/api/uploads/signature', payload);
      const data = res?.data || res;
      return {
        timestamp: Number(data?.timestamp),
        signature: String(data?.signature || ''),
        apiKey: String(data?.apiKey || ''),
        cloudName: String(data?.cloudName || ''),
        folder: String(data?.folder || ''),
        resourceType: String(data?.resourceType || ''),
        publicId: data?.publicId ? String(data.publicId) : null,
        provider: data?.provider,
        uploadUrl: data?.uploadUrl,
        publicUrl: data?.publicUrl,
      };
    },
  });
};

export const useCreateResumableUpload = () => {
  return useMutation<ResumableSessionResponse, Error, ResumablePayload>({
    mutationFn: async (payload) => {
      const res: any = await api.post('/api/uploads/resumable', payload);
      const data = res?.data || res;
      return {
        provider: 'gcs',
        uploadUrl: String(data?.uploadUrl || ''),
        publicUrl: String(data?.publicUrl || ''),
        objectName: String(data?.objectName || ''),
        bucket: String(data?.bucket || ''),
        contentType: String(data?.contentType || payload.contentType || 'application/octet-stream'),
      };
    },
  });
};

export const uploadFileToResumableSession = async ({
  uploadUrl,
  fileUri,
  contentType,
  contentLength,
  onProgress,
}: {
  uploadUrl: string;
  fileUri: string;
  contentType?: string;
  contentLength?: number | null;
  onProgress?: (percent: number) => void;
}) => {
  const headers: Record<string, string> = {
    'Content-Type': contentType || 'application/octet-stream',
  };
  if (contentLength && contentLength > 0) {
    headers['Content-Length'] = String(contentLength);
    headers['Content-Range'] = `bytes 0-${contentLength - 1}/${contentLength}`;
  }

  try {
    const uploadTask = FileSystem.createUploadTask(
      uploadUrl,
      fileUri,
      {
        httpMethod: 'PUT',
        headers,
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      },
      ({ totalBytesSent, totalBytesExpectedToSend }) => {
        if (!onProgress || !totalBytesExpectedToSend) return;
        const raw = Math.round((totalBytesSent / totalBytesExpectedToSend) * 100);
        onProgress(Math.max(0, Math.min(100, raw)));
      }
    );
    const result = await uploadTask.uploadAsync();
    if (result.status < 200 || result.status >= 300) {
      throw new Error(`Resumable upload failed (${result.status})`);
    }
    return result;
  } catch (err) {
    // Fallback to simpler upload if task API fails
    const result = await FileSystem.uploadAsync(uploadUrl, fileUri, {
      httpMethod: 'PUT',
      headers,
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    });
    if (result.status < 200 || result.status >= 300) {
      throw new Error(`Resumable upload failed (${result.status})`);
    }
    if (onProgress) onProgress(100);
    return result;
  }
};

export const useUploadVideoToCloudinary = () => {
  return useMutation<CloudinaryUploadResponse, Error, VideoUploadPayload>({
    mutationFn: async (payload) => {
      const { signature, uri, fileName, onProgress } = payload;
      const form = new FormData();
      form.append('file', {
        uri,
        name: fileName || `video-${Date.now()}.mp4`,
        type: 'video/mp4',
      } as any);
      form.append('api_key', signature.apiKey);
      form.append('timestamp', signature.timestamp.toString());
      form.append('signature', signature.signature);
      form.append('folder', signature.folder || 'mister/posts');

      const uploadUrl = `https://api.cloudinary.com/v1_1/${signature.cloudName}/video/upload`;

      return new Promise<CloudinaryUploadResponse>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', uploadUrl);
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const parsed = JSON.parse(xhr.responseText);
              resolve(parsed as CloudinaryUploadResponse);
            } catch {
              reject(new Error('Cloud upload response parse failed'));
            }
            return;
          }
          reject(new Error(xhr.responseText || 'Cloud upload failed'));
        };
        xhr.onerror = () => reject(new Error('Cloud upload failed'));
        if (xhr.upload && onProgress) {
          xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable) return;
            const rawPercent = Math.round((event.loaded / event.total) * 100);
            const percent = Math.max(0, Math.min(100, rawPercent));
            onProgress(percent);
          };
        }
        xhr.send(form as any);
      });
    },
  });
};



