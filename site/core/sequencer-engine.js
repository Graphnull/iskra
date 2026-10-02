import { createScheduler } from "./scheduler.js?v=a3d1f500d2df";
import { createTransport, DEFAULT_TRANSPORT, beatAt, wallTime, } from "./transport.js?v=a3d1f500d2df";
// Audio timing and pending starts remain independent of component renders.
export function createSequencerEngine(options) {
    let transport;
    let running = false, starting = false, failed = false, disposed = false, generation = 0;
    const scheduler = createScheduler({
        context: () => running ? options.context() : { currentTime: performance.now() / 1000 },
        transport: () => transport?.state ?? DEFAULT_TRANSPORT,
        onStep: (step) => {
            if (running)
                options.onStep(step);
        },
        onVisual: options.onVisual,
        onError() {
            stop();
            failed = true;
            options.onChange();
        },
    });
    function stop() {
        generation++;
        starting = false;
        running = false;
        scheduler.stop();
        options.onStop();
        if (!disposed && transport) {
            options.onVisual(Math.floor(beatAt(transport.state, wallTime())));
            scheduler.start();
        }
        options.onChange();
    }
    function reset() {
        if (scheduler.running) {
            scheduler.reset();
            if (running)
                options.onReset();
        }
    }
    function visibility() {
        if (!document.hidden) {
            transport?.refresh();
            if (!scheduler.running && !disposed)
                scheduler.start();
            reset();
        }
    }
    function pagehide() {
        stop();
        scheduler.stop();
    }
    function dispose() {
        disposed = true;
        stop();
        transport?.close();
        transport = undefined;
        document.removeEventListener("visibilitychange", visibility);
        window.removeEventListener("pagehide", pagehide);
    }
    return {
        get bpm() {
            return transport?.state.bpm ?? DEFAULT_TRANSPORT.bpm;
        },
        get running() {
            return running;
        },
        get starting() {
            return starting;
        },
        get failed() {
            return failed;
        },
        connect() {
            disposed = false;
            transport = createTransport(() => {
                reset();
                options.onChange();
            });
            document.addEventListener("visibilitychange", visibility);
            window.addEventListener("pagehide", pagehide);
            options.onVisual(Math.floor(beatAt(transport.state, wallTime())));
            scheduler.start();
            options.onChange();
            return dispose;
        },
        async toggle() {
            if (disposed || starting)
                return;
            if (running) {
                stop();
                return;
            }
            const request = ++generation;
            starting = true;
            failed = false;
            options.onChange();
            try {
                await options.prepare();
                if (disposed || request !== generation)
                    return;
                transport?.refresh();
                running = true;
                scheduler.stop();
                scheduler.start();
            }
            catch {
                if (disposed || request !== generation)
                    return;
                stop();
                failed = true;
            }
            finally {
                if (request === generation)
                    starting = false;
                options.onChange();
            }
        },
        setTempo(bpm) {
            void transport?.setTempo(Math.min(240, Math.max(40, bpm || 110)));
        },
        stop,
        reset,
        dispose,
    };
}
