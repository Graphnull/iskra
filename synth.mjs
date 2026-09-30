import { synthVoice, releaseVoice } from './synth-audio.mjs?v=11';
import { widgetStorageKey } from './widget-storage.mjs?v=8';
import { mountLiveKeyboard } from './live-keyboard.mjs?v=6';
import { createTransport, boundaryAfter, wallTime } from './transport.mjs?v=2';
import { noteLabel } from './scales.mjs?v=4';
import { SYNTH_ROWS, SYNTH_STEPS, synthPosition, restoreSynth, noteAt, putNote, activeSynthNotes } from './synth-sequence.mjs?v=11';
import { createMicrophone, microphoneError, sampleBounds } from './microphone.mjs?v=11';
import { sampleStore } from './sample-store.mjs?v=11';

document.title = 'Синтезатор — ноты и семплы';
document.body.classList.add('tenorion-mode');
document.querySelector('main').outerHTML = `
<main class="tenorion synth" aria-labelledby="title">
  <header class="heading"><h1 id="title">Синтезатор</h1></header>
  <div class="sequencer-controls">
    <button id="play" type="button" aria-pressed="false">▶ Играть</button>
    <select id="sound" aria-label="Звук"><option value="pad">Мягкий синт</option><option value="bass">Бас</option><option value="lead">Лид</option><option value="sample" disabled>Мой семпл</option></select>
    <label class="tempo"><input id="tempo" type="number" min="40" max="240" value="110" aria-label="Темп в ударах в минуту"></label>
    <button id="clear" type="button" aria-label="Очистить текущую секцию">Сброс</button>
  </div>
  <div class="synth-tools">
    <label>Длина <select id="length" aria-label="Длина ноты в шагах">${[1,2,4,8,16,32,64].map(n=>`<option value="${n}"${n===4?' selected':''}>${n}</option>`).join('')}</select></label>
    <label>Октава <input id="octave" type="number" min="-2" max="2" value="0" aria-label="Сдвиг октавы"></label>
    <label class="filter-control">Фильтр <input id="filter" type="range" min="200" max="10000" value="4500" aria-label="Фильтр звука"></label>
  </div>
  <div class="sample-controls">
    <button id="record" type="button">● Микрофон</button>
    <button id="record-window" type="button" hidden>Записать в окне ↗</button>
    <label>Нота <select id="root" aria-label="Исходная нота семпла">${Array.from({length:25},(_,i)=>48+i).map(m=>`<option value="${m}">${noteLabel(m)}</option>`).join('')}</select></label>
    <label><input id="loop" type="checkbox" checked> Цикл</label>
  </div>
  <p id="sample-status" class="sample-status" role="status">Запиши до 10 секунд звука · семпл остаётся в браузере</p>
  <div class="section-controls" role="group" aria-label="Четыре секции по 64 шага"><span>Секции</span>${[1,2,3,4].map(n=>`<button type="button" data-section="${n-1}" aria-label="Секция ${n}">${n}</button>`).join('')}</div>
  <div class="section-controls page-controls" role="group" aria-label="Шаги секции"><span>Шаги</span>${[0,1,2,3].map(n=>`<button type="button" data-page="${n}" aria-label="Шаги ${n*16+1}–${n*16+16}">${n*16+1}–${n*16+16}</button>`).join('')}</div>
  <div class="light-grid synth-grid" role="group" aria-label="Ноты синтезатора"></div>
  <p class="sequencer-hint">Нажми — нота · протяни — длина · повторно — удалить</p>
</main>`;
const $ = id => document.getElementById(id);
const grid = document.querySelector('.synth-grid');
const stateKey = widgetStorageKey('synth-sequence-v1');
const sampleKey = widgetStorageKey('synth-sample-v1');
let state = restoreSynth(null);
for (const storageName of ['sessionStorage','localStorage']) {
  try { const saved = JSON.parse(window[storageName].getItem(stateKey)); if (saved?.version === 1) { state = restoreSynth(saved); break; } } catch {}
}
$('sound').value = state.sound === 'sample' ? 'pad' : state.sound;
$('octave').value = state.octave; $('root').value = state.root; $('loop').checked = state.loop;
$('length').value = state.length; $('filter').value = state.cutoff;
function save() {
  for (const name of ['sessionStorage','localStorage']) { try { window[name].setItem(stateKey, JSON.stringify(state)); } catch {} }
}
let context, master, sample, timer, cursor, running = false, starting = false, catchUp = true, playing = null;
const voices = new Set(), visuals = new Set(), cells = [], labels = [];
function audioContext() {
  if (!context) {
    context = new (window.AudioContext || window.webkitAudioContext)();
    const compressor = context.createDynamicsCompressor(); compressor.threshold.value = -16; compressor.ratio.value = 6;
    master = context.createGain(); master.gain.value = 0.4; master.connect(compressor).connect(context.destination);
  }
  return context;
}
async function ensureAudio() { await audioContext().resume(); }
function release(voice) { if(context) releaseVoice(context,voice); }
function sound(midi,time,duration=null,live=false) {
  const voice=synthVoice(context,master,{sound:$('sound').value,sample,root:state.root,loop:state.loop,cutoff:Number($('filter').value)},midi,time,duration,live);
  if(!voice)return null;
  voices.add(voice);
  voice.source.onended=()=>{voices.delete(voice);voice.source.disconnect();voice.gain.disconnect();voice.filter.disconnect();};
  return voice;
}
function resetSchedule() {
  if (!running) return;
  for (const visual of visuals) clearTimeout(visual); visuals.clear();
  for (const voice of voices) if (!voice.live) { voice.source.stop(context.currentTime); }
  catchUp = true; cursor = wallTime()+35;
}
const transport = createTransport(next=>{ $('tempo').value=next.bpm; resetSchedule(); },()=>{});
$('tempo').value=transport.state.bpm;
function pitch(row) { return 60+15-row+state.octave*12; }
for (let row=0; row<SYNTH_ROWS; row++) {
  const label=document.createElement('span'); label.className='row-note'; grid.append(label); labels.push(label);
  for (let column=0; column<16; column++) {
    const cell=document.createElement('button'); cell.type='button'; cell.className='synth-cell'; cell.dataset.row=row; cell.dataset.column=column;
    cell.tabIndex=row===0&&column===0?0:-1; grid.append(cell); cells.push(cell);
    cell.addEventListener('click',event=>{ if (event.detail===0) edit(row,state.page*16+column); });
    cell.addEventListener('keydown',event=>{
      const offset={ArrowLeft:[0,-1],ArrowRight:[0,1],ArrowUp:[-1,0],ArrowDown:[1,0]}[event.key]; if(!offset)return;
      event.preventDefault(); const next=cells[((row+offset[0]+16)%16)*16+(column+offset[1]+16)%16]; cell.tabIndex=-1; next.tabIndex=0; next.focus();
    });
  }
}
function edit(row, column, length = null) {
  const notes=state.sections[state.selected], existing=noteAt(notes,row,column);
  if (length===null && existing) state.sections[state.selected]=notes.filter(note=>note!==existing);
  else state.sections[state.selected]=putNote(notes,row,column,length??Number($('length').value));
  save(); render(); resetSchedule();
}
let drag;
grid.addEventListener('pointerdown',event=>{
  const cell=event.target.closest('.synth-cell'); if(!cell||event.button!==0)return;
  event.preventDefault(); cell.focus(); grid.setPointerCapture(event.pointerId);
  drag={id:event.pointerId,row:Number(cell.dataset.row),start:state.page*16+Number(cell.dataset.column),end:state.page*16+Number(cell.dataset.column)};
});
grid.addEventListener('pointermove',event=>{
  if(!drag||drag.id!==event.pointerId)return;
  const cell=document.elementFromPoint(event.clientX,event.clientY)?.closest('.synth-cell');
  if(cell&&Number(cell.dataset.row)===drag.row) drag.end=state.page*16+Number(cell.dataset.column);
});
grid.addEventListener('pointerup',event=>{
  if(!drag||drag.id!==event.pointerId)return;
  const gesture=drag; drag=null;
  if(gesture.end===gesture.start)edit(gesture.row,gesture.start);
  else edit(gesture.row,Math.min(gesture.start,gesture.end),Math.abs(gesture.end-gesture.start)+1);
});
for(const type of ['pointercancel','lostpointercapture'])grid.addEventListener(type,()=>{drag=null;});
function render() {
  document.querySelectorAll('[data-section]').forEach(button=>{
    const section=Number(button.dataset.section); button.setAttribute('aria-pressed',String(state.selected===section)); button.classList.toggle('is-playing',playing?.section===section);
  });
  document.querySelectorAll('[data-page]').forEach(button=>{
    const page=Number(button.dataset.page); button.setAttribute('aria-pressed',String(state.page===page)); button.classList.toggle('is-playing',playing?.section===state.selected&&Math.floor(playing.column/16)===page);
  });
  labels.forEach((label,row)=>{label.textContent=noteLabel(pitch(row));});
  cells.forEach((cell,index)=>{
    const row=Math.floor(index/16),column=state.page*16+index%16,note=noteAt(state.sections[state.selected],row,column);
    cell.classList.toggle('is-on',!!note); cell.classList.toggle('note-start',note?.start===column); cell.classList.toggle('note-end',note?.start+note?.length-1===column);
    cell.classList.toggle('is-step',playing?.section===state.selected&&playing.column===column);
    cell.setAttribute('aria-pressed',String(!!note)); cell.setAttribute('aria-label',`${noteLabel(pitch(row))}, шаг ${column+1}${note?`, нота ${note.length} шагов`:''}`);
  });
}
document.querySelectorAll('[data-section]').forEach(button=>button.addEventListener('click',()=>{drag=null; state.selected=Number(button.dataset.section); save(); render();}));
document.querySelectorAll('[data-page]').forEach(button=>button.addEventListener('click',()=>{drag=null;state.page=Number(button.dataset.page);save();render();}));
const player=mountLiveKeyboard({async onNoteOn(key){await ensureAudio();return sound(key.midi+state.octave*12,context.currentTime,null,true);},onNoteOff:voice=>release(voice),labelFor:key=>noteLabel(key.midi+state.octave*12)});
function schedule(){
  const now=wallTime(); cursor=Math.max(cursor,now+10);
  while(true){
    const boundary=boundaryAfter(transport.state,cursor); if(boundary.time>now+200)break;
    const position=synthPosition(boundary.step), time=context.currentTime+(boundary.time-now)/1000;
    const notes=catchUp?activeSynthNotes(state,boundary.step):state.sections[position.section].filter(note=>note.start===position.column).map(note=>({...note,remaining:note.length}));
    for(const note of notes)sound(pitch(note.row),time,note.remaining*15/transport.state.bpm);
    catchUp=false;
    const visual=setTimeout(()=>{visuals.delete(visual);playing=position;render();},Math.max(0,boundary.time-now)); visuals.add(visual); cursor=boundary.time+1;
  }
}
function stop(){
  running=false;clearInterval(timer);for(const visual of visuals)clearTimeout(visual);visuals.clear();
  if(context)for(const voice of voices)if(!voice.live)voice.source.stop(context.currentTime);
  playing=null;render();$('play').textContent='▶ Играть';$('play').setAttribute('aria-pressed','false');
}
$('play').addEventListener('click',async()=>{
  if(starting)return;if(running)return stop();starting=true;$('play').disabled=true;
  try{await ensureAudio();transport.refresh();running=true;catchUp=true;cursor=wallTime()+35;$('play').textContent='■ Стоп';$('play').setAttribute('aria-pressed','true');schedule();timer=setInterval(schedule,25);}
  catch{stop();$('play').textContent='Повторить';}finally{starting=false;$('play').disabled=false;}
});
$('tempo').addEventListener('change',()=>{const bpm=Math.min(240,Math.max(40,Number($('tempo').value)||110));$('tempo').value=bpm;transport.setTempo(bpm);});
$('clear').addEventListener('click',()=>{state.sections[state.selected]=[];save();render();resetSchedule();});
$('octave').addEventListener('change',()=>{state.octave=Math.min(2,Math.max(-2,Math.round(Number($('octave').value)||0)));$('octave').value=state.octave;save();render();player.refreshLabels();resetSchedule();});
$('sound').addEventListener('change',()=>{state.sound=$('sound').value;save();resetSchedule();});
$('root').addEventListener('change',()=>{state.root=Number($('root').value);save();resetSchedule();});
$('loop').addEventListener('change',()=>{state.loop=$('loop').checked;save();resetSchedule();});
$('length').addEventListener('change',()=>{state.length=Number($('length').value);save();});
$('filter').addEventListener('input',()=>{state.cutoff=Number($('filter').value);save();if(context)for(const voice of voices)voice.filter.frequency.setTargetAtTime(state.cutoff,context.currentTime,0.02);});
async function loadSample(blob, persist=true){
  const ctx=audioContext(),decoded=await ctx.decodeAudioData(await blob.arrayBuffer());
  if(decoded.duration>12)throw new Error('Семпл длиннее 10 секунд. Запиши короче.');
  const channels=Array.from({length:decoded.numberOfChannels},(_,i)=>decoded.getChannelData(i));
  const bounds=sampleBounds(channels,decoded.sampleRate),buffer=ctx.createBuffer(decoded.numberOfChannels,bounds.end-bounds.start,decoded.sampleRate);
  channels.forEach((channel,i)=>buffer.copyToChannel(channel.subarray(bounds.start,bounds.end),i));
  sample=buffer;$('sound').querySelector('[value="sample"]').disabled=false;
  if(persist||state.sound==='sample'){$('sound').value='sample';state.sound='sample';}
  if(persist)save();resetSchedule();
  $('sample-status').textContent=`Мой семпл · ${sample.duration.toFixed(1)} с · готов к игре`;
  if(persist)try{await sampleStore(sampleKey,blob);}catch{$('sample-status').textContent='Семпл готов · браузер не смог сохранить запись';}
}
const mic=createMicrophone({
  onState(status,seconds){$('record').disabled=status==='requesting'||status==='processing';$('record').classList.toggle('is-recording',status==='recording');$('record').textContent=status==='recording'?`■ Стоп ${seconds} с`:status==='requesting'?'Разреши микрофон…':status==='processing'?'Обработка…':'● Микрофон';},
  onBlob:loadSample,
  onError(error){$('sample-status').textContent=microphoneError(error);$('record-window').hidden=false;},
});
let popup, token;
function openRecorder(){
  stop();
  token=crypto.randomUUID();const url=new URL(location.href);url.searchParams.set('mode','recorder');url.searchParams.set('session',token);
  popup=window.open(url.href,'_blank','popup,width=376,height=376');
  if(!popup)$('sample-status').textContent='Разреши всплывающее окно для записи.';
}
$('record').addEventListener('click',()=>{
  if(mic.recording)return mic.stop();
  const policy=document.permissionsPolicy||document.featurePolicy;
  if(policy?.allowsFeature&&!policy.allowsFeature('microphone'))return openRecorder();
  stop();mic.start();
});
$('record-window').addEventListener('click',openRecorder);
window.addEventListener('message',async event=>{
  if(event.origin!==location.origin||event.source!==popup||event.data?.type!=='synth-sample'||event.data.session!==token||!(event.data.blob instanceof Blob))return;
  try{await loadSample(event.data.blob);popup.postMessage({type:'sample-received',session:token},location.origin);}catch(error){$('sample-status').textContent=microphoneError(error);popup.postMessage({type:'sample-failed',session:token,error:microphoneError(error)},location.origin);}
});
sampleStore(sampleKey).then(async blob=>{if(blob instanceof Blob)await loadSample(blob,false);}).catch(()=>{});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){transport.refresh();resetSchedule();}});
window.addEventListener('pagehide',()=>{stop();mic.dispose();});
render();
