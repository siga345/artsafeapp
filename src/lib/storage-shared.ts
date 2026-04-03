export function getStorageDisplayFilename(storageKey: string) {
  const tail = decodeURIComponent(storageKey.split("/").pop() ?? storageKey);
  return tail.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, "");
}
