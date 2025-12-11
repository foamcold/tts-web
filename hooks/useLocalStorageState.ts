// hooks/useLocalStorageState.ts
import { useState, useEffect } from 'react';
import { clientLogger } from '@/lib/client-logger';

function useLocalStorageState<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return defaultValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      clientLogger.error(`localStorage 读取失败: ${key}`, error);
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      clientLogger.error(`localStorage 写入失败: ${key}`, error);
    }
  }, [key, state]);

  return [state, setState];
}

export default useLocalStorageState;