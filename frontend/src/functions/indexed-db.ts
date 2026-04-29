const DB_NAME = 'planet-position-cache-db';
const STORE_NAME = 'planet_positions';
const DB_VERSION = 1;

type CacheRecord<T> = T & {
  key: string;
};

const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getFromIndexedDB = async <T>(key: string): Promise<T | null> => {
  try {
    const db = await openDatabase();
    const record = await new Promise<CacheRecord<T> | null>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => resolve((request.result as CacheRecord<T> | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
    db.close();

    return record;
  } catch {
    return null;
  }
};

export const saveToIndexedDB = async <T>(key: string, data: T): Promise<void> => {
  const record: CacheRecord<T> = {
    key,
    ...data,
  };

  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    db.close();
  } catch {
    // キャッシュ保存失敗時でも処理は続行する
  }
};

export const deleteFromIndexedDB = async (key: string): Promise<void> => {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    db.close();
  } catch {
    // 削除失敗時は何もしない
  }
};
