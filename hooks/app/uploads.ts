import api from '@/api/axiosInstance';
import { useMutation } from '@tanstack/react-query';

export type SignatureResponse = {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
  resourceType: string;
  publicId: string | null;
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
type VideoUploadPayload = {
  signature: SignatureResponse;
  uri: string;
  fileName?: string | null;
  onProgress?: (percent: number) => void;
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
      };
    },
  });
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



