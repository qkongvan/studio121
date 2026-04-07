
import { GoogleGenAI } from "@google/genai";
import { decryptKey } from "../utils/crypto";

const TEXT_STORAGE_KEY = 'koc_studio_text_api_keys';
const IMAGE_STORAGE_KEY = 'koc_studio_image_api_keys';
const TEXT_INDEX_KEY = 'koc_studio_current_text_key_index';
const IMAGE_INDEX_KEY = 'koc_studio_current_image_key_index';

export const getStoredKeys = (type: 'text' | 'image' = 'text'): string[] => {
  const storageKey = type === 'text' ? TEXT_STORAGE_KEY : IMAGE_STORAGE_KEY;
  const saved = localStorage.getItem(storageKey);
  if (!saved) return [];
  return saved.split('\n').map(k => k.trim()).filter(k => k.length > 0);
};

export const saveStoredKeys = (keysString: string, type: 'text' | 'image' = 'text') => {
  const storageKey = type === 'text' ? TEXT_STORAGE_KEY : IMAGE_STORAGE_KEY;
  localStorage.setItem(storageKey, keysString);
};

export const callWithRetry = async (fn: () => Promise<any>, retries = 2, delay = 4000) => {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      if (e.message?.includes("429") && i < retries) {
        console.warn(`Quota exceeded, retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw e;
    }
  }
};

export const getAiClient = (type: 'text' | 'image' = 'text'): GoogleGenAI => {
  const keys = getStoredKeys(type);
  const indexKey = type === 'text' ? TEXT_INDEX_KEY : IMAGE_INDEX_KEY;
  
  let apiKey = '';
  
  if (keys.length === 0) {
    // Fallback về process.env.GEMINI_API_KEY nếu không có key thủ công
    // Sử dụng process.env.GEMINI_API_KEY theo spec, fallback về process.env.API_KEY
    apiKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || '').trim();
    
    if (!apiKey) {
      console.error(`[KeyService] No API Key found in storage or environment for ${type.toUpperCase()}`);
      throw new Error("API Key chưa được cấu hình. Vui lòng nhấp vào biểu tượng 'Cấu hình API Key' ở thanh menu (biểu tượng chìa khóa/khóa) để nhập danh sách API Key.");
    }
    
    console.debug(`[KeyService] Using environment API Key for ${type.toUpperCase()}`);
    return new GoogleGenAI({ apiKey });
  }

  // Lấy index hiện tại từ sessionStorage để xoay vòng trong phiên làm việc
  let currentIndex = parseInt(sessionStorage.getItem(indexKey) || '0');
  if (currentIndex >= keys.length) currentIndex = 0;

  // Giải mã key trước khi sử dụng (nếu nó được mã hóa)
  apiKey = decryptKey(keys[currentIndex]);

  // Tăng index cho lần gọi tiếp theo
  sessionStorage.setItem(indexKey, ((currentIndex + 1) % keys.length).toString());

  console.debug(`[KeyService] Using ${type.toUpperCase()} API Key #${currentIndex + 1} of ${keys.length} (Decrypted: ${apiKey.startsWith('AIza')})`);
  
  if (!apiKey) {
    throw new Error("API Key trong danh sách không hợp lệ. Vui lòng kiểm tra lại cấu hình API Key.");
  }

  return new GoogleGenAI({ apiKey });
};
