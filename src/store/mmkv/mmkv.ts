import { MMKV } from "react-native-mmkv";

export const storage = new MMKV({
  id: "app-storage", // optional custom id
  // encryptionKey: 'your-secure-key', // optional
});

export type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

function getString(key: string) {
  return storage.getString(key) ?? null;
}
function getNumber(key: string) {
  const v = storage.getNumber(key);
  return typeof v === "number" ? v : null;
}
function getBoolean(key: string) {
  const v = storage.getBoolean(key);
  return typeof v === "boolean" ? v : null;
}
function getJson<T extends JsonValue>(key: string): T | null {
  const raw = storage.getString(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function setString(key: string, value: string | null) {
  if (value === null) storage.delete(key);
  else storage.set(key, value);
}
function setNumber(key: string, value: number | null) {
  if (value === null) storage.delete(key);
  else storage.set(key, value);
}
function setBoolean(key: string, value: boolean | null) {
  if (value === null) storage.delete(key);
  else storage.set(key, value);
}
function setJson<T extends JsonValue>(key: string, value: T | null) {
  if (value === null) storage.delete(key);
  else storage.set(key, JSON.stringify(value));
}

export const kv = {
  getString,
  getNumber,
  getBoolean,
  getJson,
  setString,
  setNumber,
  setBoolean,
  setJson,
  delete: (key: string) => storage.delete(key),
  contains: (key: string) => storage.contains(key),
};
