import test from 'node:test';
import assert from 'node:assert/strict';
import {ENVELOPE_RANGES,envelopeRatio,envelopeValue,envelopeDrag,envelopeGeometry} from '../site/core/envelope.js';
test('ADSR logarithmic editing reaches exact limits and sustain follows vertical movement',()=>{
  const value={attack:.015,decay:.4,sustain:.7,release:.35};
  for(const stage of Object.keys(value)){
    assert.ok(Math.abs(envelopeValue(stage,envelopeRatio(stage,value[stage]))-value[stage])<1e-10);
    assert.equal(envelopeValue(stage,-10),ENVELOPE_RANGES[stage][0]);
    assert.ok(Math.abs(envelopeValue(stage,10)-ENVELOPE_RANGES[stage][1])<1e-10);
  }
  assert.ok(envelopeDrag(value,'attack',10,0)>value.attack);
  assert.equal(envelopeDrag(value,'sustain',0,-100),1);
  assert.equal(envelopeDrag(value,'sustain',0,100),0);
  const geometry=envelopeGeometry(value);
  assert.ok(Object.values(geometry.handles).every(p=>p.x>0&&p.x<320&&p.y>=12&&p.y<=68));
  assert.ok(!geometry.path.includes('NaN'));
});
