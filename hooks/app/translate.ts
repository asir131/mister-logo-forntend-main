import api from '@/api/axiosInstance';
import { useQuery } from '@tanstack/react-query';

type TranslateResponse = {
  targetLang: string;
  translations: string[];
};

type TranslateOptions = {
  texts: string[];
  targetLang?: string | null;
  sourceLang?: string | null;
  enabled?: boolean;
};

export const useTranslateTexts = ({
  texts,
  targetLang,
  sourceLang,
  enabled = true,
}: TranslateOptions) => {
  const normalizedTexts = texts.map(t => String(t ?? ''));
  return useQuery({
    queryKey: ['translate', targetLang, sourceLang, normalizedTexts],
    queryFn: async () => {
      const res = await api.post('/api/translate', {
        texts: normalizedTexts,
        targetLang,
        sourceLang,
      });
      return res as TranslateResponse;
    },
    enabled: enabled && !!targetLang && normalizedTexts.length > 0,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: false,
  });
};
