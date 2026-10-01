import { createScheduler } from "./scheduler.js?v=c53522026b7d";
import { createTransport, DEFAULT_TRANSPORT } from "./transport.js?v=c53522026b7d";
// Audio timing and pending starts remain independent of component renders.
export function createSequencerEngine(options) {
    let transport;
    let running = false, starting = false, failed = false, disposed = false, generation = 0;
    const scheduler = createScheduler({
        context: options.context,
        transport: () => transport?.state ?? DEFAULT_TRANSPORT,
        onStep: options.onStep,
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
        options.onChange();
    }
    function reset() {
        if (running) {
            scheduler.reset();
            options.onReset();
        }
    }
    function visibility() {
        if (!document.hidden) {
            transport?.refresh();
            reset();
        }
    }
    function pagehide() {
        stop();
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
