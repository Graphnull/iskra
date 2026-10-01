import { synthVoice, releaseVoice, updateSynthVoice } from './synth-audio.mjs?v=15';
import { widgetStorageKey } from './widget-storage.mjs?v=8';
import { mountLiveKeyboard } from './live-keyboard.mjs?v=15';
import { createTransport, boundaryAfter, wallTime } from './transport.mjs?v=2';
import { noteLabel } from './scales.mjs?v=4';
import { SYNTH_ROWS, SYNTH_STEPS, synthPosition, restoreSynth, noteAt, putNote, activeSynthNotes } from './synth-sequence.mjs?v=15';

document.title = 'Синтезатор — волны и ноты';
document.body.classList.add('tenorion-mode');
document.querySelector('main').outerHTML = `
<main class="tenorion synth" aria-labelledby="title">
  <header class="heading"><h1 id="title">Синтезатор</h1></header>
  <div class="sequencer-controls">
    <button id="play" type="button" aria-pressed="false">▶ Играть</button>
    <select id="sound" aria-label="Звук"><option value="pad">Мягкий синт</option><option value="bass">808 бас</option><option value="lead">Лид</option></select>
    <label class="tempo"><input id="tempo" type="number" min="40" max="240" value="110" aria-label="Темп в ударах в минуту"></label>
    <button id="clear" type="button" aria-label="Очистить текущую секцию">Сброс</button>
  </div>
  <div class="synth-tools">
    <label>Длина <select id="length" aria-label="Длина ноты в шагах">${[1,2,4,8,16].map(n=>`<option value="${n}"${n===4?' selected':''}>${n}</option>`).join('')}</select></label>
    <label class="wave-control">Волна <select id="waveform" aria-label="Форма волны"><option value="sine">Синус</option><option value="triangle">Треугольник</option><option value="sawtooth">Пила</option><option value="square">Прямоугольник</option></select></label>
    <label>Октава <input id="octave" type="number" min="-2" max="2" value="0" aria-label="Сдвиг октавы"></label>
  </div>
  <div class="section-controls" role="group" aria-label="Четыре секции по 16 шагов"><span>Секции</span>${[1,2,3,4].map(n=>`<button type="button" data-section="${n-1}" aria-label="Секция ${n}">${n}</button>`).join('')}</div>
  <div class="light-grid synth-grid" role="group" aria-label="Ноты синтезатора"></div>
  <p class="sequencer-hint">Нажми — нота · протяни — длина · повторно — удалить</p>
</main>`;
const $ = id => document.getElementById(id);
const grid = document.querySelector('.synth-grid');
const stateKey = widgetStorageKey('synth-sequence-v1');
let state = restoreSynth(null);
for (const storageName of ['sessionStorage','localStorage']) {
  try { const saved = JSON.parse(window[storageName].getItem(stateKey)); if ([1,2].includes(saved?.version)) { state = restoreSynth(saved); break; } } catch {}
}
$('sound').value = state.sound;
$('waveform').value = state.waveform;
$('octave').value = state.octave;
$('length').value = state.length;
function save() {
  for (const name of ['sessionStorage','localStorage']) { try { window[name].setItem(stateKey, JSON.stringify(state)); } catch {} }
}
let context, master, timer, cursor, running = false, starting = false, catchUp = true, playing = null;
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
  const voice=synthVoice(context,master,{...state,sound:$('sound').value},midi,time,duration,live);
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
function pitchOffset() { return state.octave*12 + ($('sound').value==='bass'?-24:0); }
function pitch(row) { return 60+15-row+pitchOffset(); }
for (let row=0; row<SYNTH_ROWS; row++) {
  const label=document.createElement('span'); label.className='row-note'; grid.append(label); labels.push(label);
  for (let column=0; column<16; column++) {
    const cell=document.createElement('button'); cell.type='button'; cell.className='synth-cell'; cell.dataset.row=row; cell.dataset.column=column;
    cell.tabIndex=row===0&&column===0?0:-1; grid.append(cell); cells.push(cell);
    cell.addEventListener('click',event=>{ if (event.detail===0) edit(row,column); });
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
  drag={id:event.pointerId,row:Number(cell.dataset.row),start:Number(cell.dataset.column),end:Number(cell.dataset.column)};
});
grid.addEventListener('pointermove',event=>{
  if(!drag||drag.id!==event.pointerId)return;
  const cell=document.elementFromPoint(event.clientX,event.clientY)?.closest('.synth-cell');
  if(cell&&Number(cell.dataset.row)===drag.row) drag.end=Number(cell.dataset.column);
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
  labels.forEach((label,row)=>{label.textContent=noteLabel(pitch(row));});
  cells.forEach((cell,index)=>{
    const row=Math.floor(index/16),column=index%16,note=noteAt(state.sections[state.selected],row,column);
    cell.classList.toggle('is-on',!!note); cell.classList.toggle('note-start',note?.start===column); cell.classList.toggle('note-end',note?.start+note?.length-1===column);
    cell.classList.toggle('is-step',playing?.section===state.selected&&playing.column===column);
    cell.setAttribute('aria-pressed',String(!!note)); cell.setAttribute('aria-label',`${noteLabel(pitch(row))}, шаг ${column+1}${note?`, нота ${note.length} шагов`:''}`);
  });
}
document.querySelectorAll('[data-section]').forEach(button=>button.addEventListener('click',()=>{drag=null; state.selected=Number(button.dataset.section); save(); render();}));
const controlPanel=document.createElement('section');
controlPanel.className='synth-panel'; controlPanel.setAttribute('aria-label','Пульт синтезатора');
controlPanel.innerHTML=`<div class="envelope-view"><div class="envelope-title"><span>Огибающая · ADSR</span><span id="held-notes">Играй Z–/ или Q–]</span></div><svg id="envelope" viewBox="0 0 320 64" role="img" aria-label="Огибающая громкости"><path class="envelope-axis" d="M8 5V52H312"/><path id="envelope-path"/><g id="envelope-labels"></g></svg></div>`;
function renderEnvelope(){
  const total=state.attack+state.decay+state.release+1;
  const ax=8+state.attack/total*304,dx=ax+state.decay/total*304,sx=dx+304/total,sy=52-state.sustain*44;
  const points=[[8,52]],floor=.0001/(state.sound==='bass'?.42:.18);
  function ramp(x1,x2,from,to){for(let i=1;i<=24;i++){const t=i/24;points.push([x1+(x2-x1)*t,52-44*from*(to/from)**t]);}}
  ramp(8,ax,floor,1);ramp(ax,dx,1,Math.max(floor,state.sustain));points.push([sx,sy]);
  for(let i=1;i<=24;i++){const t=i/24;points.push([sx+(312-sx)*t,52-44*state.sustain*Math.exp(-6.36*t)]);}
  controlPanel.querySelector('#envelope-path').setAttribute('d',points.map(([x,y],i)=>`${i?'L':'M'}${x} ${y}`).join(' '));
  controlPanel.querySelector('#envelope').setAttribute('aria-label',`Огибающая: атака ${Math.round(state.attack*1000)} мс, затухание ${Math.round(state.decay*1000)} мс, сустейн ${Math.round(state.sustain*100)}%, релиз ${Math.round(state.release*1000)} мс`);
  controlPanel.querySelector('#envelope-labels').innerHTML=[['A',(8+ax)/2],['D',(ax+dx)/2],['S',(dx+sx)/2],['R',(sx+312)/2]].map(([label,x])=>`<text x="${x}" y="63" text-anchor="middle">${label}</text>`).join('');
}
const heldNotes=new Map();
const knobs=[['cutoff','Фильтр',200,10000,'Hz'],['resonance','Резонанс',0,12,'Q'],['attack','Атака',0.003,2,'s'],['decay','Затухание',0.02,8,'s'],['sustain','Сустейн',0,1,'%'],['release','Релиз',0.05,4,'s']];
const refreshKnobs=[];
for(const [key,label,min,max,unit] of knobs){
  const item=document.createElement('label');item.className='synth-knob';
  item.innerHTML=`<span>${label}</span><span class="knob-dial"><input type="range" min="0" max="1000" step="1" aria-label="${label}"><span class="knob-pointer"></span></span><output></output>`;
  const input=item.querySelector('input'),output=item.querySelector('output');
  const logarithmic=unit==='s'||key==='cutoff';
  const decode=x=>logarithmic?min*(max/min)**(x/1000):min+(max-min)*x/1000;
  const encode=x=>logarithmic?Math.log(x/min)/Math.log(max/min)*1000:(x-min)/(max-min)*1000;
  function refresh(){input.value=Math.round(encode(state[key]));item.style.setProperty('--angle',`${Number(input.value)*0.27-135}deg`);output.textContent=unit==='s'?`${Math.round(state[key]*1000)} мс`:unit==='%'?`${Math.round(state[key]*100)}%`:unit==='Hz'?`${Math.round(state[key])} Гц`:state[key].toFixed(1);input.setAttribute('aria-valuetext',output.textContent);}
  input.addEventListener('input',()=>{
    state[key]=decode(Number(input.value));refresh();renderEnvelope();save();
    if(context)for(const voice of voices)updateSynthVoice(context,voice,key,state[key]);
  });
  refreshKnobs.push(refresh);refresh();controlPanel.append(item);
}
document.querySelector('.sequencer-hint').textContent='Нажми — нота · протяни — длина · Пульт — настройки звука';
renderEnvelope();
const player=mountLiveKeyboard({controlPanel,onHighlight(key,active){if(active)heldNotes.set(key.code,noteLabel(key.midi+pitchOffset()));else heldNotes.delete(key.code);$('held-notes').textContent=heldNotes.size?[...heldNotes.values()].join(' · '):'Играй Z–/ или Q–]';},async onNoteOn(key){await ensureAudio();return sound(key.midi+pitchOffset(),context.currentTime,null,true);},onNoteOff:voice=>release(voice),labelFor:key=>noteLabel(key.midi+pitchOffset())});
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
$('sound').addEventListener('change',()=>{state.sound=$('sound').value;state.waveform={pad:'triangle',bass:'sine',lead:'square'}[state.sound];$('waveform').value=state.waveform;Object.assign(state,state.sound==='bass'?{attack:.003,decay:4,sustain:.083,release:.35}:{attack:.015,decay:.4,sustain:.7,release:.35});refreshKnobs.forEach(refresh=>refresh());renderEnvelope();save();render();player.refreshLabels();resetSchedule();});
$('waveform').addEventListener('change',()=>{state.waveform=$('waveform').value;save();if(context)for(const voice of voices)updateSynthVoice(context,voice,'waveform',state.waveform);});
$('length').addEventListener('change',()=>{state.length=Number($('length').value);save();});

document.addEventListener('visibilitychange',()=>{if(!document.hidden){transport.refresh();resetSchedule();}});
window.addEventListener('pagehide',()=>{stop();});
render();
