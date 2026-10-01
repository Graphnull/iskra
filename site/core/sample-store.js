export async function sampleStore(key, blob) {
    const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('piano-samples-v1', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('samples');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    try {
        return await new Promise((resolve, reject) => {
            const transaction = db.transaction('samples', blob === undefined ? 'readonly' : 'readwrite');
            const store = transaction.objectStore('samples');
            const request = blob === undefined ? store.get(key) : store.put(blob, key);
            transaction.oncomplete = () => resolve(request.result);
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error || new Error('Не удалось сохранить семпл'));
        });
    }
    finally {
        db.close();
    }
}
