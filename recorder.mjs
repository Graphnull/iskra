import { createMicrophone, microphoneError } from './microphone.mjs?v=11';
document.title='Запись семпла';
document.querySelector('main').outerHTML='<main class="piano recorder-panel"><p class="eyebrow">СВОЙ ЗВУК</p><h1>Записать семпл</h1><p>Запиши голос или любой звук — до 10 секунд.</p><button id="record" class="record-large" type="button">● Начать запись</button><p id="status" role="status">Запись вернётся в синтезатор.</p></main>';
const session=new URLSearchParams(location.search).get('session');
const button=document.getElementById('record'),status=document.getElementById('status');
const mic=createMicrophone({
  onState(state,seconds){button.disabled=state==='requesting'||state==='processing';button.textContent=state==='recording'?`■ Остановить · ${seconds} с`:state==='requesting'?'Разреши микрофон…':state==='processing'?'Обработка…':'● Начать запись';button.classList.toggle('is-recording',state==='recording');},
  async onBlob(blob){if(!window.opener||!session)throw new Error('Открой запись из синтезатора.');window.opener.postMessage({type:'synth-sample',session,blob},location.origin);status.textContent='Запись отправлена в синтезатор…';},
  onError(error){status.textContent=microphoneError(error);},
});
button.addEventListener('click',()=>{if(mic.recording)mic.stop();else mic.start();});
window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==window.opener||event.data?.session!==session)return;
  if(event.data.type==='sample-received')status.textContent='Семпл готов. Можно вернуться в синтезатор.';
  if(event.data.type==='sample-failed')status.textContent=event.data.error;
});
window.addEventListener('pagehide',()=>mic.dispose());
