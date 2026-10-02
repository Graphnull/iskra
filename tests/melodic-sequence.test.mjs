import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createMelodicPlayer } from '../site/core/melodic-player.js';
import { restoreMelodic, putNote } from '../site/core/melodic-sequence.js';
const dom=new JSDOM('',{url:'https://example.org/iskra/'});
for(const name of ['window','document','localStorage','sessionStorage']) globalThis[name]=dom.window[name];
test('piano and guitar keep four separate sections and octave after reload',()=>{
  localStorage.clear();sessionStorage.clear();
  const piano=createMelodicPlayer('piano'),guitar=createMelodicPlayer('guitar');
  piano.select(2);piano.edit(4,3,8);piano.setOctave(1);
  guitar.select(1);guitar.edit(8,15,5);
  const restored=createMelodicPlayer('piano');assert.deepEqual(restored.state.sections[2],[{row:4,start:3,length:8}]);assert.equal(restored.pitch(4),83);
  restored.select(0);restored.edit(1,0);restored.clear();assert.equal(restored.state.sections[2].length,1);
  assert.deepEqual(createMelodicPlayer('guitar').state.sections[1],[{row:8,start:15,length:1}]);
  restored.select(2);restored.edit(4,5);assert.equal(restored.state.sections[2].length,0);
  restored.edit(-1,0);restored.edit(1,16);restored.edit(0,0,-1);assert.equal(restored.state.sections[2].length,0);
});
test('restoring rejects invalid notes and editing replaces only overlapping notes of the same pitch',()=>{
  const base={version:1,selected:0,octave:0,sections:[[],[],[],[]]};
  assert.ok(restoreMelodic(base));
  for (const note of [{row:16,start:0,length:1},{row:0,start:15,length:2},{row:0,start:0,length:0}])assert.equal(restoreMelodic({...base,sections:[[note],[],[],[]]}),null);
  assert.equal(restoreMelodic({...base,sections:[[]]}),null);
  const notes=[{row:1,start:1,length:4},{row:2,start:1,length:4},{row:1,start:9,length:2}];
  assert.deepEqual(putNote(notes,1,3,4),[notes[1],notes[2],{row:1,start:3,length:4}]);
});
test('both sequencers schedule polyphonic notes with their lengths and mute stops scheduled voices',async()=>{
  const scheduled=[];
  const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
  const node=()=>({gain:param(),threshold:param(),ratio:param(),connect(){return this;},disconnect(){}});
  class Audio {
    currentTime=2;sampleRate=1000;state='running';destination={};
    async resume(){}async close(){this.state='closed';}
    createGain(){return node();}createDynamicsCompressor(){return node();}
    createBuffer(_,length,rate){const data=new Float32Array(length);return {duration:length/rate,getChannelData:()=>data};}
    source(){const source={...node(),frequency:param(),onended:null,start(time){this.startTime=time;scheduled.push(this);},stop(time){this.stopTime=time;}};return source;}
    createOscillator(){return this.source();}createBufferSource(){return this.source();}
  }
  const originalNow=Date.now;Date.now=()=>1760000000000;window.AudioContext=Audio;
  try {
    for(const instrument of ['piano','guitar']) {
      localStorage.clear();sessionStorage.clear();scheduled.length=0;
      const model=createMelodicPlayer(instrument);
      for(let section=0;section<4;section++){model.select(section);model.edit(0,0,16);model.edit(1,0,16);}
      const cleanup=model.connect();
      try{
        assert.equal(model.engine.running,false);await model.engine.toggle();assert.equal(model.engine.running,true);
        assert.ok(scheduled.length >= (instrument === 'piano' ? 4 : 2));
        for (const source of scheduled) assert.ok(source.stopTime > source.startTime);
        model.engine.stop();assert.ok(scheduled.every(source=>source.stopTime === undefined));
      } finally {cleanup();}
    }
  } finally {Date.now=originalNow;delete window.AudioContext;}
});
