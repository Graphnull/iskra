import { element, byId } from '../../core/dom.js';
import { isRecord } from '../../core/guards.js';
import { createMicrophone, microphoneError } from '../../core/microphone.js';
document.title='Запись семпла';
element('main', HTMLElement).outerHTML='<main class="piano recorder-panel"><p class="eyebrow">СВОЙ ЗВУК</p><h1>Записать семпл</h1><p>Запиши голос или любой звук — до 10 секунд.</p><button id="record" class="record-large" type="button">● Начать запись</button><p id="status" role="status">Запись вернётся в инструмент.</p></main>';
const parameters=new URLSearchParams(location.search);
const session=parameters.get('session');
const kind=parameters.get('target')==='drums'?'drum-sample':'synth-sample';
const button=byId('record', HTMLButtonElement),status=byId('status', HTMLParagraphElement);
const mic=createMicrophone({
  onState(state,seconds){button.disabled=state==='requesting'||state==='processing';button.textContent=state==='recording'?`■ Остановить · ${seconds} с`:state==='requesting'?'Разреши микрофон…':state==='processing'?'Обработка…':'● Начать запись';button.classList.toggle('is-recording',state==='recording');},
  async onBlob(blob){if(!window.opener||!session)throw new Error('Открой запись из инструмента.');window.opener.postMessage({type:kind,session,blob},location.origin);status.textContent='Запись отправлена в инструмент…';},
  onError(error){status.textContent=microphoneError(error);},
});
button.addEventListener('click',()=>{if(mic.recording)mic.stop();else mic.start();});
window.addEventListener('message',(event: MessageEvent<unknown>)=>{
  if (!isRecord(event.data)) return;
  if(event.origin!==location.origin||event.source!==window.opener||event.data?.session!==session)return;
  if(event.data.type==='sample-received')status.textContent='Семпл готов. Можно вернуться в инструмент.';
  if(event.data.type==='sample-failed' && typeof event.data.error === 'string')status.textContent=event.data.error;
});
window.addEventListener('pagehide',()=>mic.dispose());
