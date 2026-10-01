export function isRecord(value) {
    return typeof value === "object" && value !== null;
}
export function isNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
}
export function isInteger(value) {
    return typeof value === "number" && Number.isInteger(value);
}
export function at(values, index) {
    const value = values[index];
    if (value === undefined)
        throw new RangeError(`Missing item at ${index}`);
    return value;
}
export function required(value, description) {
    if (value === undefined || value === null)
        throw new Error(`Missing ${description}`);
    return value;
}
