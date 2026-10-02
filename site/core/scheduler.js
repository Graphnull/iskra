import { boundaryAfter, wallTime } from "./transport.js?v=f1d1aaff72ac";
export function createScheduler({ context, transport, onStep, onVisual, onError = () => { }, now = wallTime, timers = globalThis, lookahead = 200, interval = 25, }) {
    let running = false, cursor = 0, first = true, generation = 0;
    let timer;
    const visuals = new Set();
    function clearVisuals() {
        generation++;
        for (const id of visuals)
            timers.clearTimeout(id);
        visuals.clear();
    }
    function tick() {
        if (!running)
            return;
        const timestamp = now();
        // Skip missed steps after sleep/background throttling instead of replaying them.
        if (cursor < timestamp + 10) {
            clearVisuals();
            cursor = timestamp + 10;
            first = true;
        }
        while (running) {
            const boundary = boundaryAfter(transport(), cursor);
            if (boundary.time > timestamp + lookahead)
                break;
            onStep({
                ...boundary,
                time: context().currentTime + (boundary.time - timestamp) / 1000,
                first,
            });
            if (!running)
                return;
            first = false;
            const revision = generation;
            const id = timers.setTimeout(() => {
                visuals.delete(id);
                if (running && revision === generation)
                    onVisual(boundary.step);
            }, Math.max(0, boundary.time - timestamp));
            visuals.add(id);
            cursor = boundary.time + 1;
        }
    }
    function stop() {
        running = false;
        timers.clearInterval(timer);
        clearVisuals();
    }
    return {
        get running() {
            return running;
        },
        start() {
            if (running)
                return;
            running = true;
            cursor = now() + 35;
            first = true;
            try {
                tick();
                timer = timers.setInterval(() => {
                    try {
                        tick();
                    }
                    catch (error) {
                        stop();
                        onError(error);
                    }
                }, interval);
            }
            catch (error) {
                stop();
                throw error;
            }
        },
        stop,
        reset() {
            if (running) {
                clearVisuals();
                cursor = now() + 35;
                first = true;
            }
        },
    };
}
