import type { SynthSound, SynthParameters, Waveform } from './synth-sequence.js';
import { DEFAULT_WAVE } from './synth-sequence.js';

interface OscillatorSettings extends Partial<SynthParameters> { sound: SynthSound; waveform?: Waveform; cutoff: number }
interface SampleSettings extends Partial<SynthParameters> { sound: 'sample'; sample?: AudioBuffer; root: number; loop: boolean; cutoff: number }
type VoiceSettings = OscillatorSettings | SampleSettings;
export interface SynthVoice {
  source: OscillatorNode | AudioBufferSourceNode;
  gain: GainNode; filter: BiquadFilterNode; time: number; live: boolean;
  peak: number; release: number | undefined; released: boolean;
}
export function releaseVoice(context: AudioContext, voice: SynthVoice | null | undefined, at = context.currentTime): void {
  if (!voice || voice.released) return;
  voice.released = true;
  if (voice.gain.gain.cancelAndHoldAtTime) voice.gain.gain.cancelAndHoldAtTime(at);
  else voice.gain.gain.cancelScheduledValues(at);
  voice.gain.gain.setTargetAtTime(.0001, at, voice.release === undefined ? .055 : voice.release / 6.36);
  voice.source.stop(at + (voice.release ?? .35));
}
export function synthVoice(context: AudioContext, master: AudioNode, settings: VoiceSettings, midi: number, time: number,
  duration: number | null = null, live = false): SynthVoice | null {
  let source: OscillatorNode | AudioBufferSourceNode;
  if (settings.sound === 'sample') {
    if (!settings.sample) return null;
    const bufferSource = context.createBufferSource();
    bufferSource.buffer = settings.sample; bufferSource.playbackRate.value = 2 ** ((midi - settings.root) / 12); bufferSource.loop = settings.loop;
    source = bufferSource;
  } else {
    const oscillator = context.createOscillator();
    oscillator.type = settings.waveform ?? DEFAULT_WAVE[settings.sound];
    const frequency = 440 * 2 ** ((midi - 69) / 12); oscillator.frequency.value = frequency;
    if (settings.sound === 'bass') {
      if (!settings.waveform) oscillator.setPeriodicWave(context.createPeriodicWave(new Float32Array(4), new Float32Array([0,1,.18,.06])));
      oscillator.frequency.setValueAtTime(frequency * 2, time);
      oscillator.frequency.exponentialRampToValueAtTime(frequency, time + .045);
    }
    source = oscillator;
  }
  const gain = context.createGain(), filter = context.createBiquadFilter();
  const peak = settings.sound === 'bass' ? .42 : settings.sound === 'sample' ? .45 : .18;
  filter.type = 'lowpass'; filter.frequency.value = settings.cutoff; filter.Q.value = settings.resonance ?? .7;
  gain.gain.setValueAtTime(.0001, time);
  if (settings.attack !== undefined && Number.isFinite(settings.attack) && settings.decay !== undefined && settings.sustain !== undefined) {
    gain.gain.exponentialRampToValueAtTime(peak, time + settings.attack);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0001, peak * settings.sustain), time + settings.attack + settings.decay);
  } else if (settings.sound === 'bass') {
    gain.gain.exponentialRampToValueAtTime(.42, time + .003); gain.gain.exponentialRampToValueAtTime(.3, time + .12);
    gain.gain.exponentialRampToValueAtTime(.035, time + 4); gain.gain.exponentialRampToValueAtTime(.0001, time + 12);
  } else gain.gain.exponentialRampToValueAtTime(peak, time + .015);
  source.connect(filter).connect(gain).connect(master); source.start(time);
  const voice: SynthVoice = { source, gain, filter, time, live, peak, release: settings.release, released: false };
  if (duration !== null) releaseVoice(context, voice, time + Math.max(.025, duration));
  return voice;
}
export function updateSynthVoice(context: AudioContext, voice: SynthVoice, key: 'waveform', value: Waveform): void;
export function updateSynthVoice(context: AudioContext, voice: SynthVoice, key: keyof SynthParameters, value: number): void;
export function updateSynthVoice(context: AudioContext, voice: SynthVoice, key: keyof SynthParameters | 'waveform', value: number | Waveform): void {
  const at = context.currentTime;
  if (key === 'waveform') { if (typeof value === 'string' && 'type' in voice.source) voice.source.type = value; return; }
  if (typeof value !== 'number') return;
  if (key === 'cutoff') voice.filter.frequency.setTargetAtTime(value, at, .02);
  if (key === 'resonance') voice.filter.Q.setTargetAtTime(value, at, .02);
  if (key === 'release' && !voice.released) voice.release = value;
  if (key === 'sustain' && voice.live && !voice.released) {
    const gain = voice.gain.gain;
    if (gain.cancelAndHoldAtTime) gain.cancelAndHoldAtTime(at); else gain.cancelScheduledValues(at);
    gain.setTargetAtTime(Math.max(.0001, voice.peak * value), at, .03);
  }
}
