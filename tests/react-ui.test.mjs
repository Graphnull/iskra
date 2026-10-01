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
  await act(async()=>root.unmount());
});
