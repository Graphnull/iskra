import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement, StrictMode, act } from 'react';
const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://example.org/iskra/'});
for(const name of ['window','document','Element','HTMLElement','HTMLInputElement','KeyboardEvent','Event','MouseEvent'])globalThis[name]=dom.window[name];
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
dom.window.HTMLElement.prototype.setPointerCapture=function(){};
const { createRoot }=await import('react-dom/client');
const { useKeyboard, Keyboard }=await import('../site/ui/keyboard.js');
const { SynthPanel }=await import('../site/instruments/synth/synth-panel.js');
const { restoreSynth }=await import('../site/instruments/synth/synth-sequence.js');
const { SectionSelector, NumberControl }=await import('../site/ui/controls.js');
const { NoteGrid }=await import('../site/ui/grid.js');
const rootElement=document.getElementById('root');
function key(type,code='KeyZ',target=document){target.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true,cancelable:true}));}

test('React rerenders preserve held notes, range focus and keyboard listeners are removed on unmount',async()=>{
  let starts=0;const released=[],state=restoreSynth(null);
  function View({label}){
    const binding=useKeyboard({onNoteOn:()=>++starts,onNoteOff:voice=>released.push(voice)});
    return createElement('div',null,createElement(Keyboard,{binding,labelFor:()=>label}),createElement(SynthPanel,{state,held:[...binding.active],hidden:false,onChange(){}}));
  }
  let root=createRoot(rootElement);
  await act(async()=>root.render(createElement(StrictMode,null,createElement(View,{label:'C4'}))));
  const originalKey=document.querySelector('[data-code="KeyZ"]');
  await act(async()=>key('keydown'));
  assert.equal(starts,1);assert(originalKey.classList.contains('is-active'));
  await act(async()=>root.render(createElement(StrictMode,null,createElement(View,{label:'C5'}))));
  assert.equal(document.querySelector('[data-code="KeyZ"]'),originalKey);
  assert.deepEqual(released,[]);assert(originalKey.classList.contains('is-active'));
  const range=document.querySelector('input[type="range"]');range.focus();
  await act(async()=>key('keyup','KeyZ',range));assert.deepEqual(released,[1]);
  await act(async()=>key('keydown','KeyZ',range));assert.equal(starts,2);
  await act(async()=>root.unmount());assert.deepEqual(released,[1,2]);
  await act(async()=>key('keydown'));assert.equal(starts,2);
  root=createRoot(rootElement);
  await act(async()=>root.render(createElement(View,{label:'C4'})));
  await act(async()=>key('keydown'));assert.equal(starts,3);
  await act(async()=>key('keyup'));assert.deepEqual(released,[1,2,3]);
  await act(async()=>root.unmount());
});

test('section updates preserve focused grid cells and drag edits retain their length',async()=>{
  const root=createRoot(rootElement),edits=[],selects=[];
  function View({section,playing}){return createElement('div',null,
    createElement(SectionSelector,{selected:section,playing,onSelect:value=>selects.push(value)}),
    createElement(NoteGrid,{kind:'synth',labels:['C4','D4'],selected:section,playing,note:()=>({enabled:false}),onEdit:(...values)=>edits.push(values)}));}
  await act(async()=>root.render(createElement(View,{section:0,playing:null})));
  const first=document.querySelector('.synth-cell'),last=document.querySelector('.synth-cell[data-column="3"]');
  first.focus();await act(async()=>root.render(createElement(View,{section:0,playing:{section:1,column:2}})));
  assert.equal(document.activeElement,first);assert.equal(document.querySelector('.synth-cell'),first);
  await act(async()=>document.querySelector('[data-section="2"]').click());assert.deepEqual(selects,[2]);
  const pointer=(type,target,properties={})=>target.dispatchEvent(Object.assign(new Event(type,{bubbles:true,cancelable:true}),{pointerId:1,button:0,...properties}));
  await act(async()=>pointer('pointerdown',first));
  document.elementFromPoint=()=>last;
  await act(async()=>pointer('pointermove',first,{clientX:1,clientY:1}));
  await act(async()=>pointer('pointerup',first));assert.deepEqual(edits,[[0,0,4]]);
  await act(async()=>pointer('pointerdown',first));
  await act(async()=>root.render(createElement(View,{section:1,playing:null})));
  await act(async()=>pointer('pointerup',first));assert.equal(edits.length,1);
  await act(async()=>root.unmount());
});

test('numeric controls accept zero and synchronize tempo from another widget',async()=>{
  const root=createRoot(rootElement),changes=[];
  await act(async()=>root.render(createElement(NumberControl,{value:1,min:-2,max:2,label:'Октава',onChange:value=>changes.push(value)})));
  const input=document.querySelector('input');
  await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'0');input.dispatchEvent(new Event('input',{bubbles:true}));});
  await act(async()=>{input.focus();input.blur();});assert.deepEqual(changes,[0]);
  await act(async()=>root.render(createElement(NumberControl,{value:2,min:-2,max:2,label:'Октава',onChange:value=>changes.push(value)})));assert.equal(input.value,'2');
  await act(async()=>{input.focus();input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true,cancelable:true}));});assert.deepEqual(changes,[0,2]);
  await act(async()=>root.unmount());
});

test('ADSR dragging preserves handles and held notes, cancels gestures and isolates filter changes',async()=>{
  const root=createRoot(rootElement),state=restoreSynth(null),changes=[],released=[];
  function View(){
    const binding=useKeyboard({onNoteOn:()=>1,onNoteOff:v=>released.push(v)});
    return createElement(SynthPanel,{state,held:[...binding.active],hidden:false,onChange(key,value){state[key]=value;changes.push(key);root.render(createElement(View));}});
  }
  await act(async()=>root.render(createElement(View)));
  const editor=document.querySelector('.adsr-editor');editor.getBoundingClientRect=()=>({width:320,height:100});
  const attack=editor.querySelector('[aria-label="Громкость: Атака"]');
  const pointer=(type,props={})=>attack.dispatchEvent(Object.assign(new Event(type,{bubbles:true,cancelable:true}),{pointerId:2,button:0,clientX:0,clientY:0,...props}));
  await act(async()=>key('keydown'));
  await act(async()=>pointer('pointerdown'));
  await act(async()=>pointer('pointermove',{clientX:32}));
  assert.ok(state.attack>.015);assert.equal(editor.querySelector('.adsr-attack'),attack);assert.deepEqual(released,[]);
  await act(async()=>pointer('pointercancel'));
  const previous=state.attack;
  await act(async()=>pointer('pointermove',{clientX:64}));assert.equal(state.attack,previous);
  await act(async()=>key('keyup','KeyZ',attack));assert.deepEqual(released,[1]);
  await act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Фильтр').click());
  const filter=document.querySelector('[aria-label="Фильтр: Сустейн"]');
  await act(async()=>filter.dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true,cancelable:true})));
  assert.equal(state.filterSustain,1);assert.equal(state.sustain,.7);assert.equal(changes.at(-1),'filterSustain');
  assert.equal(document.querySelectorAll('.adsr-editor:not([hidden])').length,1);
  await act(async()=>root.unmount());
});

test('sample waveform editing updates its marker, clamps at edges and cancels pointer gestures',async()=>{
  const {SampleEditor}=await import('../site/ui/sample-editor.js');
  const root=createRoot(rootElement),settings={gain:1,start:0};let previews=0,closed=0;
  const buffer={duration:2,numberOfChannels:1,getChannelData:()=>new Float32Array([0,.2,-.4,.1])};
  const render=()=>root.render(createElement(SampleEditor,{buffer,settings,slot:1,busy:false,onChange:patch=>{Object.assign(settings,patch);render();},onPreview:()=>previews++,onClose:()=>closed++}));
  await act(async()=>render());
  const wave=document.querySelector('svg');wave.getBoundingClientRect=()=>({left:10,width:320});wave.setPointerCapture=()=>{};
  const pointer=(type,x)=>wave.dispatchEvent(Object.assign(new Event(type,{bubbles:true,cancelable:true}),{pointerId:1,button:0,clientX:x}));
  await act(async()=>pointer('pointerdown',170));assert.equal(settings.start,1);
  assert.equal(document.querySelector('.sample-wave-start').getAttribute('d'),'M160 0V68');
  await act(async()=>pointer('pointermove',900));assert.equal(settings.start,1.99);
  await act(async()=>pointer('pointercancel',900));
  await act(async()=>pointer('pointermove',10));assert.equal(settings.start,1.99);
  await act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='▶ Прослушать').click());assert.equal(previews,1);
  await act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Готово').click());assert.equal(closed,1);
  await act(async()=>root.unmount());
});

test('recorder edits in its window and closes only after save confirmation',async()=>{
  const {Recorder}=await import('../site/instruments/recorder/recorder-view.js');
  dom.reconfigure({url:'https://example.org/iskra/?mode=recorder&target=drums&session=test&slot=2'});
  globalThis.location=window.location;
  const previousNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator'),previousRecorder=globalThis.MediaRecorder;
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:window.navigator});
  let recorder,tracksStopped=0,closed=0,windowClosed=0;const sent=[];
  const previousClose=window.close;window.close=()=>windowClosed++;
  class Audio{
    state='running';destination={};currentTime=0;
    async decodeAudioData(){return {duration:1,numberOfChannels:1,sampleRate:100,getChannelData:()=>new Float32Array(100).fill(.2)};}
    createBuffer(channels,length,rate){const data=new Float32Array(length);return {numberOfChannels:channels,duration:length/rate,getChannelData:()=>data,copyToChannel:values=>data.set(values)};}
    async close(){closed++;this.state='closed';}
  }
  class MicRecorder{state='inactive';mimeType='audio/webm';constructor(){recorder=this;}start(){this.state='recording';}stop(){this.state='inactive';this.ondataavailable({data:new Blob(['audio'])});this.done=this.onstop();}}
  window.AudioContext=Audio;globalThis.MediaRecorder=MicRecorder;
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{async getUserMedia(){return {getTracks:()=>[{stop(){tracksStopped++;}}]};}}});
  const opener={postMessage:(...args)=>sent.push(args)};window.opener=opener;
  const root=createRoot(rootElement);
  try{
    await act(async()=>root.render(createElement(Recorder)));
    await act(async()=>document.querySelector('.record-large').click());
    await act(async()=>{document.querySelector('.record-large').click();await recorder.done;});
    assert.equal(tracksStopped,1);assert(document.querySelector('.sample-wave'));assert.equal(sent.length,0);
    const gain=document.querySelector('[aria-label="Громкость семпла"]');
    await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(gain,'2');gain.dispatchEvent(new Event('input',{bubbles:true}));});
    await act(async()=>document.querySelector('.sample-save').click());
    assert.equal(sent.length,1);assert.equal(sent[0][0].type,'drum-sample');assert.equal(sent[0][0].session,'test');assert.equal(sent[0][0].settings.gain,2);assert.equal(sent[0][1],location.origin);
    await act(async()=>window.dispatchEvent(new window.MessageEvent('message',{source:opener,origin:location.origin,data:{type:'sample-received',session:'test'}})));
    assert.equal(windowClosed,1);assert.match(document.querySelector('[role=status]').textContent,/Сохранено/);
  }finally{
    await act(async()=>root.unmount());assert.equal(closed,1);
    window.close=previousClose;delete window.AudioContext;delete window.opener;delete navigator.mediaDevices;globalThis.MediaRecorder=previousRecorder;delete globalThis.location;
    if(previousNavigator)Object.defineProperty(globalThis,'navigator',previousNavigator);else delete globalThis.navigator;
    dom.reconfigure({url:'https://example.org/iskra/'});
  }
});

test('empty sample name opens the recording window for its own track',async()=>{
  const {Drums}=await import('../site/instruments/drums/drums-view.js');
  const previousOpen=window.open;let opened;
  globalThis.location=window.location;window.open=url=>{opened=new URL(url);return {closed:false};};
  const root=createRoot(rootElement);
  try{
    await act(async()=>root.render(createElement(Drums)));
    const button=document.querySelector('[aria-label="Открыть запись семпла 3"]');
    assert.equal(button.disabled,false);
    await act(async()=>button.click());
    assert.equal(opened.searchParams.get('mode'),'recorder');assert.equal(opened.searchParams.get('slot'),'2');
  }finally{await act(async()=>root.unmount());window.open=previousOpen;delete globalThis.location;}
});
