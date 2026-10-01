import { useEffect, useState, useSyncExternalStore } from "react";
import type { createObservable } from "../core/observable.js";
interface Controller extends ReturnType<typeof createObservable> {
  connect(): () => void;
}
export function useController<T extends Controller>(factory: () => T): T {
  const [controller] = useState(factory);
  useSyncExternalStore(controller.subscribe, controller.snapshot);
  useEffect(() => controller.connect(), [controller]);
  return controller;
}
