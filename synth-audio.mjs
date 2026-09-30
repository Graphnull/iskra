export function releaseVoice(context, voice, at = context.currentTime) {
  if (!voice || voice.released) return;
  voice.released = true;
  voice.gain.gain.cancelScheduledValues(at);
  voice.gain.gain.setTargetAtTime(0.0001, at, 0.055);
  voice.source.stop(at + 0.35);
}
export function synthVoice(context, master, settings, midi, time, duration = null, live = false) {
  const useSample = settings.sound === 'sample';
  if (useSample && !settings.sample) return null;
  const source = useSample ? context.createBufferSource() : context.createOscillator();
  if (useSample) {
    source.buffer = settings.sample;
    source.playbackRate.value = 2 ** ((midi - settings.root) / 12);
    source.loop = settings.loop;
  } else {
    source.type = {pad:'triangle',bass:'sawtooth',lead:'square'}[settings.sound];
    source.frequency.value = 440 * 2 ** ((midi - 69) / 12);
  }
  const gain = context.createGain(), filter = context.createBiquadFilter();
  filter.type = 'lowpass'; filter.frequency.value = settings.cutoff; filter.Q.value = 0.7;
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(useSample ? 0.45 : 0.18, time + 0.015);
  source.connect(filter).connect(gain).connect(master);
  source.start(time);
  const voice = {source,gain,filter,time,live,released:false};
  if (duration !== null) releaseVoice(context, voice, time + Math.max(0.025,duration));
  return voice;
}
