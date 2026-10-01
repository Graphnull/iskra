export function microphoneError(error) {
  if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') return 'Нет доступа к микрофону. Разреши его или запиши в отдельном окне.';
  if (error?.name === 'NotFoundError') return 'Микрофон не найден.';
  if (error?.name === 'NotReadableError') return 'Микрофон занят или недоступен.';
  return error?.message || 'Не удалось записать звук.';
}
export function createMicrophone({ onState, onBlob, onError, mediaDevices = navigator.mediaDevices, Recorder = globalThis.MediaRecorder }) {
  let recorder, stream, limit, ticker, pending = false, abandoned = false;
  function release() {
    clearTimeout(limit); clearInterval(ticker);
    stream?.getTracks().forEach(track => track.stop());
    stream = null;
  }
  function stop() { if (recorder?.state === 'recording') recorder.stop(); }
  async function start() {
    if (pending || recorder?.state === 'recording') return;
    if (!mediaDevices?.getUserMedia || !Recorder) { onError(new Error('В этом браузере запись недоступна.')); return; }
    pending = true; abandoned = false; onState('requesting');
    try {
      stream = await mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      if (abandoned) { release(); return; }
      const chunks = [];
      recorder = new Recorder(stream);
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = event => { abandoned = true; release(); onState('idle'); onError(event.error); };
      recorder.onstop = async () => {
        release();
        if (abandoned) return;
        onState('processing');
        try {
          const blob = new Blob(chunks, { type: recorder.mimeType });
          if (!blob.size) throw new Error('Запись пустая. Попробуй ещё раз.');
          await onBlob(blob);
        } catch (error) { onError(error); }
        finally { onState('idle'); }
      };
      recorder.start();
      const started = Date.now();
      onState('recording', 0);
      ticker = setInterval(() => onState('recording', Math.floor((Date.now() - started) / 1000)), 250);
      limit = setTimeout(stop, 10000);
    } catch (error) { release(); onState('idle'); onError(error); }
    finally { pending = false; }
  }
  return {
    start, stop,
    get recording() { return recorder?.state === 'recording'; },
    dispose() { abandoned = true; stop(); release(); },
  };
}
export function sampleBounds(channels, rate) {
  let first = channels[0].length, last = -1;
  for (const channel of channels) for (let i = 0; i < channel.length; i++) {
    if (Math.abs(channel[i]) >= 0.008) { first = Math.min(first, i); last = Math.max(last, i); }
  }
  if (last < first) throw new Error('Не слышно звука. Запиши чуть громче.');
  return { start: Math.max(0, first - Math.round(rate * 0.01)), end: Math.min(channels[0].length, last + Math.round(rate * 0.04) + 1) };
}
