export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
export function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
export function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}
export function at<T>(values: ArrayLike<T>, index: number): T {
  const value = values[index];
  if (value === undefined) throw new RangeError(`Missing item at ${index}`);
  return value;
}
export function required<T>(
  value: T | null | undefined,
  description: string,
): T {
  if (value === undefined || value === null)
    throw new Error(`Missing ${description}`);
  return value;
}
