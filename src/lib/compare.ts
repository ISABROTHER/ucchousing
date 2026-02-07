const MAX_COMPARE = 3;
const STORAGE_KEY = 'hostel_compare_ids';

export function getCompareList(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_COMPARE) : [];
  } catch {
    return [];
  }
}

export function addToCompare(hostelId: string): string[] {
  const list = getCompareList();
  if (list.includes(hostelId)) return list;
  if (list.length >= MAX_COMPARE) return list;
  const updated = [...list, hostelId];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function removeFromCompare(hostelId: string): string[] {
  const list = getCompareList().filter((id) => id !== hostelId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return list;
}

export function clearCompare(): string[] {
  localStorage.removeItem(STORAGE_KEY);
  return [];
}

export function isInCompare(hostelId: string): boolean {
  return getCompareList().includes(hostelId);
}
