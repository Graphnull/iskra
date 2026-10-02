import { DEFAULT_WAVE } from "./synth-sequence.js?v=86d6e3e520cc";
function filterLevels(voice) {
    const base = Math.max(20, Math.min(voice.filterMax, voice.cutoff));
    const peak = Math.min(voice.filterMax, base * 2 ** (voice.filterAmount * 5));
    return {
        base,
        peak,
        sustain: base * (peak / base) ** voice.filterEnvelope.sustain,
    };
}
function filterValue(voice, at) {
    const { base, peak, sustain } = filterLevels(voice);
    const age = Math.max(0, at - voice.time), { attack, decay } = voice.filterEnvelope;
    if (age < attack)
        return base * (peak / base) ** (age / attack);
    if (age < attack + decay)
        return peak * (sustain / peak) ** ((age - attack) / decay);
    return sustain;
}
function scheduleFilter(voice, at, initial = false) {
    const param = voice.filter.frequency;
    const { base, peak, sustain } = filterLevels(voice);
    const { attack, decay } = voice.filterEnvelope;
    if (initial)
        param.setValueAtTime(base, at);
    if (!voice.filterAmount) {
        if (!initial)
            param.setTargetAtTime(base, at, 0.02);
        return;
    }
    if (voice.time + attack > at)
        param.exponentialRampToValueAtTime(peak, voice.time + attack);
    if (voice.time + attack + decay > at)
        param.exponentialRampToValueAtTime(sustain, voice.time + attack + decay);
    else
        param.setTargetAtTime(sustain, at, 0.02);
}
export function releaseVoice(context, voice, at = context.currentTime) {
    if (!voice || voice.released)
        return;
    voice.released = true;
    if (voice.gain.gain.cancelAndHoldAtTime)
        voice.gain.gain.cancelAndHoldAtTime(at);
    else
        voice.gain.gain.cancelScheduledValues(at);
    voice.gain.gain.setTargetAtTime(0.0001, at, voice.release === undefined ? 0.055 : voice.release / 6.36);
    if (voice.filterAmount) {
        const frequency = voice.filter.frequency;
        if (frequency.cancelAndHoldAtTime)
            frequency.cancelAndHoldAtTime(at);
        else {
            frequency.cancelScheduledValues(at);
            frequency.setValueAtTime(filterValue(voice, at), at);
        }
        frequency.setTargetAtTime(filterLevels(voice).base, at, voice.filterEnvelope.release / 6.36);
    }
    voice.source.stop(at +
        Math.max(voice.release ?? 0.35, voice.filterAmount ? voice.filterEnvelope.release : 0));
}
export function synthVoice(context, master, settings, midi, time, duration = null, live = false) {
    let source;
    if (settings.sound === "sample") {
        if (!settings.sample)
            return null;
        const bufferSource = context.createBufferSource();
        bufferSource.buffer = settings.sample;
        bufferSource.playbackRate.value = 2 ** ((midi - settings.root) / 12);
        bufferSource.loop = settings.loop;
        source = bufferSource;
    }
    else {
        const oscillator = context.createOscillator();
        oscillator.type = settings.waveform ?? DEFAULT_WAVE[settings.sound];
        const frequency = 440 * 2 ** ((midi - 69) / 12);
        oscillator.frequency.value = frequency;
        if (settings.sound === "bass") {
            if (!settings.waveform)
                oscillator.setPeriodicWave(context.createPeriodicWave(new Float32Array(4), new Float32Array([0, 1, 0.18, 0.06])));
            oscillator.frequency.setValueAtTime(frequency * 2, time);
            oscillator.frequency.exponentialRampToValueAtTime(frequency, time + 0.045);
        }
        source = oscillator;
    }
    const gain = context.createGain(), filter = context.createBiquadFilter();
    const peak = settings.sound === "bass"
        ? 0.42
        : settings.sound === "sample"
            ? 0.45
            : 0.18;
    filter.type = settings.filterType ?? "lowpass";
    filter.frequency.value = settings.cutoff;
    filter.Q.value =
        filter.type === "bandpass" || filter.type === "notch"
            ? Math.max(0.1, settings.resonance ?? 0.7)
            : (settings.resonance ?? 0.7);
    gain.gain.setValueAtTime(0.0001, time);
    if (settings.attack !== undefined &&
        Number.isFinite(settings.attack) &&
        settings.decay !== undefined &&
        settings.sustain !== undefined) {
        gain.gain.exponentialRampToValueAtTime(peak, time + settings.attack);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * settings.sustain), time + settings.attack + settings.decay);
    }
    else if (settings.sound === "bass") {
        gain.gain.exponentialRampToValueAtTime(0.42, time + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.3, time + 0.12);
        gain.gain.exponentialRampToValueAtTime(0.035, time + 4);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 12);
    }
    else
        gain.gain.exponentialRampToValueAtTime(peak, time + 0.015);
    source.connect(filter).connect(gain).connect(master);
    source.start(time);
    const voice = {
        source,
        gain,
        filter,
        time,
        live,
        peak,
        release: settings.release,
        released: false,
        cutoff: settings.cutoff,
        filterAmount: settings.filterControl === "manual" ? 0 : (settings.filterAmount ?? 0),
        filterDepth: settings.filterAmount ?? 0,
        filterControl: settings.filterControl ??
            ((settings.filterAmount ?? 0) > 0 ? "adsr" : "manual"),
        filterEnvelope: {
            attack: settings.filterAttack ?? 0.015,
            decay: settings.filterDecay ?? 0.4,
            sustain: settings.filterSustain ?? 0.7,
            release: settings.filterRelease ?? 0.35,
        },
        filterMax: Math.min(20000, (context.sampleRate || 44100) * 0.475),
    };
    scheduleFilter(voice, time, true);
    if (duration !== null)
        releaseVoice(context, voice, time + Math.max(0.025, duration));
    return voice;
}
export function updateVoiceFilter(context, voice, type, control, depth) {
    voice.filter.type = type;
    if (type === "bandpass" || type === "notch")
        voice.filter.Q.value = Math.max(0.1, voice.filter.Q.value);
    if (voice.released)
        return;
    const at = context.currentTime, param = voice.filter.frequency;
    if (param.cancelAndHoldAtTime)
        param.cancelAndHoldAtTime(at);
    else {
        param.cancelScheduledValues(at);
        param.setValueAtTime(filterValue(voice, at), at);
    }
    voice.filterControl = control;
    voice.filterDepth = depth;
    voice.filterAmount = control === "adsr" ? depth : 0;
    scheduleFilter(voice, at);
}
export function updateSynthVoice(context, voice, key, value) {
    const at = context.currentTime;
    if (key === "waveform") {
        if (typeof value === "string" && "type" in voice.source)
            voice.source.type = value;
        return;
    }
    if (typeof value !== "number")
        return;
    const filterKeys = {
        filterAttack: "attack",
        filterDecay: "decay",
        filterSustain: "sustain",
        filterRelease: "release",
    };
    if (key === "cutoff" || key === "filterAmount" || key in filterKeys) {
        if (voice.released)
            return;
        const frequency = voice.filter.frequency;
        if (frequency.cancelAndHoldAtTime)
            frequency.cancelAndHoldAtTime(at);
        else {
            frequency.cancelScheduledValues(at);
            frequency.setValueAtTime(filterValue(voice, at), at);
        }
        if (key === "cutoff")
            voice.cutoff = value;
        else if (key === "filterAmount") {
            voice.filterDepth = value;
            voice.filterAmount = voice.filterControl === "adsr" ? value : 0;
        }
        else if (key in filterKeys)
            voice.filterEnvelope[filterKeys[key]] = value;
        scheduleFilter(voice, at);
    }
    if (key === "resonance")
        voice.filter.Q.setTargetAtTime(voice.filter.type === "bandpass" || voice.filter.type === "notch"
            ? Math.max(0.1, value)
            : value, at, 0.02);
    if (key === "release" && !voice.released)
        voice.release = value;
    if (key === "sustain" && voice.live && !voice.released) {
        const gain = voice.gain.gain;
        if (gain.cancelAndHoldAtTime)
            gain.cancelAndHoldAtTime(at);
        else
            gain.cancelScheduledValues(at);
        gain.setTargetAtTime(Math.max(0.0001, voice.peak * value), at, 0.03);
    }
}
