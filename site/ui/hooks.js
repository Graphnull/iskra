import { useEffect, useState, useSyncExternalStore } from "react";
export function useController(factory) {
    const [controller] = useState(factory);
    useSyncExternalStore(controller.subscribe, controller.snapshot);
    useEffect(() => controller.connect(), [controller]);
    return controller;
}
