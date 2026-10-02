export async function sampleStore(
  key: string,
  blob?: Blob | null,
): Promise<unknown> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("piano-samples-v1", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("samples");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    return await new Promise<unknown>((resolve, reject) => {
      const transaction = db.transaction(
        "samples",
        blob === undefined ? "readonly" : "readwrite",
      );
      const store = transaction.objectStore("samples");
      const request: { readonly result: unknown } =
        blob === undefined
          ? store.get(key)
          : blob === null
            ? store.delete(key)
            : store.put(blob, key);
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () =>
        reject(transaction.error || new Error("Не удалось сохранить семпл"));
    });
  } finally {
    db.close();
  }
}
