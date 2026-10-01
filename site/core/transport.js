import { isRecord, isNumber, isInteger } from "./guards.js?v=77f7a8b0c2bf";
// Every device derives musical phase from Unix time and the selected BPM.
export const DEFAULT_TRANSPORT = { bpm: 110, revision: 0, sender: "" };
export const wallTime = () => Date.now();
export function beatAt(state, time) {
    return (time * state.bpm) / 15000;
}
export function boundaryAfter(state, time) {
    const step = Math.ceil(beatAt(state, time));
    return { step, time: (step * 15000) / state.bpm };
}
export function changeTempo(state, bpm, sender) {
    return { bpm, revision: state.revision + 1, sender };
}
const valid = (value) => isRecord(value) &&
    isNumber(value.bpm) &&
    value.bpm >= 40 &&
    value.bpm <= 240 &&
    isInteger(value.revision) &&
    value.revision >= 0 &&
    typeof value.sender === "string";
export function createTransport(onChange = () => { }, onAvailability = () => { }) {
    const key = "piano-shared-transport-v1";
    const sender = crypto.randomUUID();
    let state = { ...DEFAULT_TRANSPORT }, closed = false;
    let channel;
    function read() {
        try {
            const stored = JSON.parse(localStorage.getItem(key) ?? "null");
            return valid(stored) ? stored : null;
        }
        catch {
            return null;
        }
    }
    function accept(candidate) {
        if (closed || !valid(candidate))
            return;
        if (candidate.revision < state.revision ||
            (candidate.revision === state.revision &&
                candidate.sender <= state.sender))
            return;
        state = {
            bpm: candidate.bpm,
            revision: candidate.revision,
            sender: candidate.sender,
        };
        onChange(state);
    }
    accept(read());
    try {
        channel = new BroadcastChannel(key);
        const activeChannel = channel;
        channel.onmessage = (event) => {
            const data = event.data;
            if (!isRecord(data))
                return;
            if (data.type === "hello")
                activeChannel.postMessage({ type: "state", state });
            else if (data.type === "state")
                accept(data.state);
        };
        channel.postMessage({ type: "hello" });
        onAvailability(true);
    }
    catch {
        onAvailability(false);
    }
    const onStorage = (event) => {
        if (event.key === key)
            accept(read());
    };
    window.addEventListener("storage", onStorage);
    return {
        get state() {
            return state;
        },
        async setTempo(bpm) {
            if (closed || !Number.isFinite(bpm) || bpm < 40 || bpm > 240)
                return;
            const update = () => {
                if (closed)
                    return;
                accept(read());
                if (bpm === state.bpm)
                    return;
                const next = changeTempo(state, bpm, sender);
                accept(next);
                try {
                    localStorage.setItem(key, JSON.stringify(next));
                }
                catch {
                    /* BroadcastChannel still works without persistence. */
                }
                channel?.postMessage({ type: "state", state: next });
            };
            if (navigator.locks) {
                try {
                    await navigator.locks.request(key, update);
                }
                catch {
                    update();
                }
            }
            else
                update();
        },
        refresh() {
            if (closed)
                return;
            accept(read());
            channel?.postMessage({ type: "hello" });
        },
        close() {
            closed = true;
            channel?.close();
            window.removeEventListener("storage", onStorage);
        },
    };
}
