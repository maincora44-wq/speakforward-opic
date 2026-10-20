const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');
const root=path.resolve(__dirname,'..');
function boot(options={}) {
 const errors=[]; const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',error=>errors.push(error));
 const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{
   url:'https://maincora44-wq.github.io/speakforward-opic/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole
 });
 const w=dom.window;
 if(options.recognition)w.SpeechRecognition=options.recognition;
 if(options.saved)w.localStorage.setItem('speakForward.questionBuilder.v1',options.saved);
 if(options.nextSaved)w.localStorage.setItem('speakForward.next.v1',options.nextSaved);
 if(options.blockStorage)Object.defineProperty(w,'localStorage',{get(){throw new w.DOMException('Blocked','SecurityError');}});
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 for(const file of ['core.js','finance-data.js','lessons.js','legacy.js','app.js'])w.eval(fs.readFileSync(path.join(root,file),'utf8'));
 return {dom,w,$:id=>w.document.getElementById(id),errors};
}
function submit(env,text){env.$('qbAnswer').value=text;env.$('qbForm').dispatchEvent(new env.w.Event('submit',{bubbles:true,cancelable:true}));}
test('another tab changing progress cannot be overwritten by a stale lesson save', () => {
 const env = boot(); try {
  const {$, w} = env; $('lessonCards').children[0].click();
  const external = w.SFCore.freshState(); external.completions.push({day:'2026-10-19',timezone:'Asia/Seoul',sessionId:'other-tab'});
  const raw = JSON.stringify(external); w.localStorage.setItem(w.SFCore.KEY, raw);
  submit(env, w.SFLessons.bank[w.SFLessons.lessons[0].ids[0]].answers[0]);
  assert.equal(w.localStorage.getItem(w.SFCore.KEY), raw);
  assert.match($('storageNotice').textContent, /다른 창/); assert.equal($('qbFeedback').hidden, false);
  assert.deepEqual(env.errors, []);
 } finally { env.dom.window.close(); }
});
test('storage events stop stale XP saves while unrelated legacy keys stay usable', () => {
 const env = boot(); try {
  const {$, w} = env; $('lessonCards').children[0].click();
  w.dispatchEvent(new w.StorageEvent('storage', {key:'sf_intro',newValue:'draft',storageArea:w.localStorage}));
  assert.equal($('storageNotice').hidden, true);
  const external = w.SFCore.Next.fresh(); const day = w.SFCore.localDay();
  external.days[day] = {answers:[w.SFLessons.lessons[0].ids[0]],reviews:[],lessons:[]};
  const raw = JSON.stringify(external); w.localStorage.setItem(w.SFCore.Next.KEY, raw);
  w.dispatchEvent(new w.StorageEvent('storage', {key:w.SFCore.Next.KEY,newValue:raw,storageArea:w.localStorage}));
  finishFirstLesson(env);
  assert.equal(w.localStorage.getItem(w.SFCore.Next.KEY), raw); assert.match($('storageNotice').textContent, /다른 창/);
  assert.match($('rewardNotice').textContent, /현재 화면/); assert.deepEqual(env.errors, []);
 } finally { env.dom.window.close(); }
});
test('finance choice and gap lesson supports pause, retry, full completion and XP', () => {
 const env = boot(); try {
  const {$, w} = env; const lesson = w.SFLessons.lessons.at(-1);
  $('lessonCards').lastElementChild.click();
  assert.equal($('financeContext').hidden, false); assert.match($('financePeriod').textContent, /2025-09-02/);
  assert.match($('financeRates').textContent, /1,394\.76.*1,385\.28/);
  assert.equal($('financeSource').href, 'https://fred.stlouisfed.org/series/DEXKOUS');
  const choose = answer => [...$('answerChoices').children].find(node => node.textContent === answer);
  choose(w.SFLessons.bank[lesson.ids[0]].answers[0]).click();
  assert.equal($('qbFeedback').hidden, true); // Selection must never auto-submit.
  $('pauseQuestion').click(); assert.ok([...$('answerChoices').children].every(node => node.disabled));
  submit(env, 'The USD/KRW rate fell over the period.'); assert.equal($('qbFeedback').hidden, true);
  $('pauseQuestion').click(); submit(env, $('qbAnswer').value); $('nextQuestion').click();
  assert.equal($('gapSentence').hidden, false); assert.match($('gapSentence').textContent, /___.*0\.68/);
  assert.equal($('answerChoices').hidden, true); submit(env,'rose'); $('retryQuestion').click(); submit(env,'fell');
  assert.match($('feedbackAnswer').textContent, /The USD\/KRW rate fell/); $('nextQuestion').click();
  for (const id of lesson.ids.slice(2)) { submit(env,w.SFLessons.bank[id].answers[0]); $('nextQuestion').click(); }
  assert.equal($('summaryScore').textContent, '5 / 6'); $('finishLesson').click();
  assert.equal($('nextXP').textContent, '70 XP');
  assert.equal(JSON.parse(w.localStorage.getItem(w.SFCore.KEY)).review[lesson.ids[1]].stage,0);
  assert.deepEqual(env.errors, []);
 } finally { env.dom.window.close(); }
});
test('finance choices can be typed, survive resume and participate in due review without network', () => {
 const C = require('../core.js'); const {bank, lessons} = require('../lessons.js');
 const lesson = lessons.at(-1); const saved = C.freshState();
 saved.review[lesson.ids[0]] = C.schedule(null,false,[],Date.now()-700000);
 let env = boot({saved:JSON.stringify(saved)}); let raw;
 try {
  env.$('startReview').click(); assert.equal(env.$('answerChoices').hidden, false);
  submit(env,bank[lesson.ids[0]].answers[0]); raw = env.w.localStorage.getItem(C.KEY);
 } finally { env.dom.window.close(); }
 env = boot({saved:raw}); try {
  env.$('resumeLesson').click(); assert.equal(env.$('qbFeedback').hidden,false);
  assert.ok([...env.$('answerChoices').children].every(node => node.disabled));
  env.$('nextQuestion').click(); env.$('finishLesson').click();
  assert.equal(env.$('nextXP').textContent,'25 XP'); // 5 answer + 10 review + 10 completion quest.
  assert.equal(JSON.parse(env.w.localStorage.getItem(C.KEY)).review[lesson.ids[0]].stage,1);
  assert.deepEqual(env.errors, []);
 } finally { env.dom.window.close(); }
});
test('full lesson: blank feedback, incorrect retry, next, six answers and explicit completion',()=>{
 const env=boot();try{
 const {$,w}=env;assert.equal($('lessonCards').children.length,5);
 $('lessonCards').children[0].click();assert.equal($('qbExercise').hidden,false);
 submit(env,' ');assert.match($('answerNotice').textContent,/입력/);assert.equal($('qbFeedback').hidden,true);
 submit(env,'Why did operating expenses increased in March?');assert.equal($('qbFeedback').hidden,false);assert.match($('feedbackTags').textContent,/동사원형/);
 $('retryQuestion').click();submit(env,'Why did operating expenses increase in March?');
 assert.match($('feedbackTitle').textContent,/잘했어요/);
 $('nextQuestion').click();
 for(let index=1;index<6;index++){const id=w.SFLessons.lessons[0].ids[index];submit(env,w.SFLessons.bank[id].answers[0]);$('nextQuestion').click();}
 assert.equal($('qbSummary').hidden,false);assert.equal($('summaryScore').textContent,'5 / 6');
 $('finishLesson').click();$('finishLesson').click();
 const stored=JSON.parse(w.localStorage.getItem(w.SFCore.KEY));
 assert.equal(stored.completions.length,1);assert.equal(stored.review['questions-variance-v1'].stage,0);
 assert.equal(JSON.stringify(stored).includes('operating expenses'),false);
 assert.equal($('completedDays').textContent,'1');assert.deepEqual(env.errors,[]);
 }finally{env.dom.window.close();}
});

function finishFirstLesson(env) {
 const {$, w} = env;
 $('lessonCards').children[0].click();
 if ($('replaceLessonDialog').open) $('confirmNewLesson').click();
 for (const id of w.SFLessons.lessons[0].ids) { submit(env, w.SFLessons.bank[id].answers[0]); $('nextQuestion').click(); }
 $('finishLesson').click();
}
test('Next dashboard updates path and quests only on completion and survives reload', () => {
 let env = boot(); let saved, nextSaved;
 try {
  finishFirstLesson(env);
  assert.equal(env.$('nextXP').textContent, '70 XP');
  assert.match(env.$('rewardNotice').textContent, /\+70 XP/);
  assert.equal(env.$('lessonCards').children[1].getAttribute('aria-current'), 'step');
  assert.match(env.$('dailyQuests').children[0].textContent, /6\/6/);
  saved = env.w.localStorage.getItem(env.w.SFCore.KEY); nextSaved = env.w.localStorage.getItem(env.w.SFCore.Next.KEY);
  assert.deepEqual(env.errors, []);
 } finally { env.dom.window.close(); }
 env = boot({saved, nextSaved});
 try { finishFirstLesson(env); assert.equal(env.$('nextXP').textContent, '70 XP'); assert.match(env.$('rewardNotice').textContent, /이미/); }
 finally { env.dom.window.close(); }
});
test('v2 export/import roundtrip restores both ledgers; v1 import preserves current Next progress', async () => {
 const env = boot();
 try {
  const {$, w} = env; finishFirstLesson(env);
  let exported;
  w.URL.createObjectURL = blob => { exported = blob; return 'blob:backup'; };
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () {};
  $('exportProgress').click();
  const text = await new Promise(resolve => { const reader = new w.FileReader(); reader.onload = () => resolve(reader.result); reader.readAsText(exported); });
  const backup = JSON.parse(text); assert.equal(backup.version, 2);
  assert.equal(backup.builder.version, 1); assert.equal(backup.next.version, 1);
  w.confirm = () => true;
  const load = async data => { const value = JSON.stringify(data); await $('importProgress').onchange({target:{files:[{size:value.length,text:async()=>value}],value:'test'}}); };
  await load({version:2,builder:w.SFCore.freshState(),next:w.SFCore.Next.fresh()});
  assert.equal($('nextXP').textContent, '0 XP');
  await load(backup); assert.equal($('nextXP').textContent, '70 XP');
  assert.deepEqual(JSON.parse(w.localStorage.getItem(w.SFCore.KEY)).review, backup.builder.review);
  await load(w.SFCore.freshState()); assert.equal($('nextXP').textContent, '70 XP');
  const before = w.localStorage.getItem(w.SFCore.KEY);
  await load({version:2,builder:backup.builder,next:{version:9,days:{}}});
  assert.match($('storageNotice').textContent, /실패/); assert.equal(w.localStorage.getItem(w.SFCore.KEY), before);
  w.confirm = () => false; await load({version:2,builder:w.SFCore.freshState(),next:w.SFCore.Next.fresh()});
  assert.equal($('nextXP').textContent, '70 XP'); assert.deepEqual(env.errors, []);
 } finally { env.dom.window.close(); }
});
test('Next write failure reports unsaved rewards and preserves legacy storage', () => {
 const env = boot();
 try {
  const {$, w} = env;
  w.localStorage.setItem('sf_intro', 'keep me');
  const original = w.Storage.prototype.setItem;
  w.Storage.prototype.setItem = function(key, value) { if (key === w.SFCore.Next.KEY) throw new Error('QuotaExceeded'); return original.call(this,key,value); };
  finishFirstLesson(env);
  assert.equal($('nextXP').textContent, '70 XP'); assert.match($('storageNotice').textContent, /저장할 수 없/);
  assert.match($('rewardNotice').textContent, /현재 화면/); assert.equal(w.localStorage.getItem('sf_intro'), 'keep me');
  assert.equal(JSON.parse(w.localStorage.getItem(w.SFCore.KEY)).completions.length, 1);
  assert.deepEqual(env.errors, []);
 } finally { env.dom.window.close(); }
});
test('reload resumes submitted feedback without double scheduling; pause blocks submission',()=>{
 let env=boot();let saved;try{env.$('lessonCards').children[0].click();submit(env,'some response');saved=env.w.localStorage.getItem(env.w.SFCore.KEY);}finally{env.dom.window.close();}
 env=boot({saved});try{env.$('resumeLesson').click();assert.equal(env.$('qbFeedback').hidden,false);assert.equal(env.$('qbAnswer').disabled,true);
 env.$('nextQuestion').click();env.$('pauseQuestion').click();submit(env,'Does this balance include the year-end adjustment?');
 assert.equal(env.$('qbFeedback').hidden,true);env.$('pauseQuestion').click();submit(env,'Does this balance include the year-end adjustment?');assert.equal(env.$('qbFeedback').hidden,false);
 assert.deepEqual(env.errors,[]);
 }finally{env.dom.window.close();}
});
test('no browser storage, TTS or microphone still permits text learning and legacy modules',()=>{
 const env=boot({blockStorage:true});try{const {$,w}=env;
 assert.equal($('storageNotice').hidden,false);$('lessonCards').children[0].click();
 $('qbListen').click();assert.match($('audioNotice').textContent,/지원하지/);
 submit(env,'Why did operating expenses increase in March?');assert.equal($('qbFeedback').hidden,false);
 w.document.querySelector('[data-target="exam"]').click();$('startSTT').click();assert.match($('sttNotice').textContent,/type your response/);
 $('answer').value='Yesterday I managed a demanding project. I felt rewarded.';$('answer').dispatchEvent(new w.Event('input'));assert.notEqual($('wordCount').textContent,'0');
 w.document.querySelector('[data-target="record"]').click();$('startRecord').click();assert.match($('recordNotice').textContent,/unavailable/);
 w.document.querySelector('[data-target="intro"]').click();$('saveIntro').click();assert.match($('introNotice').textContent,/Session only/);
 assert.deepEqual(env.errors,[]);
 }finally{env.dom.window.close();}
});
test('keyboard tabs, token ordering/removal, preserved legacy shadowing and timer',()=>{
 const env=boot();try{const {$,w}=env;
 const builder=w.document.querySelector('[data-target="builder"]');builder.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
 assert.equal(w.document.querySelector('[data-target="shadow"]').getAttribute('aria-selected'),'true');
 assert.equal($('shadow').classList.contains('hidden'),false);const before=$('scriptSentence').textContent;$('nextSentence').click();assert.notEqual($('scriptSentence').textContent,before);
 $('dailyToggle').click();assert.equal($('dailyToggle').textContent,'Pause session');$('dailyToggle').click();
 builder.click();$('lessonCards').children[0].click();const token=$('tokenBank').children[0];token.click();assert.equal($('chosenTokens').children.length,1);assert.ok($('qbAnswer').value);$('chosenTokens').children[0].click();assert.equal($('qbAnswer').value,'');
 assert.deepEqual(env.errors,[]);
 }finally{env.dom.window.close();}
});
test('due-review entry consumes only due exercises and preserves future items',()=>{
 const C=require('../core.js');const {bank}=require('../lessons.js');const state=C.freshState();const ids=Object.keys(bank);
 state.review[ids[0]]=C.schedule(null,false,[],Date.now()-700000);state.review[ids[1]]=C.schedule(null,true,[],Date.now());
 const env=boot({saved:JSON.stringify(state)});try{env.$('startReview').click();assert.match(env.$('qbPosition').textContent,/복습 1 \/ 1/);submit(env,bank[ids[0]].answers[0]);env.$('nextQuestion').click();env.$('finishLesson').click();
 const saved=JSON.parse(env.w.localStorage.getItem(C.KEY));assert.equal(Object.keys(saved.review).length,2);assert.equal(saved.review[ids[0]].stage,1);
 assert.deepEqual(env.errors,[]);
 }finally{env.dom.window.close();}
});
test('microphone permission denial resets recording controls without blocking typed practice',async()=>{
 const env=boot();try{
 env.w.MediaRecorder=class {};
 Object.defineProperty(env.w.navigator,'mediaDevices',{value:{getUserMedia:()=>Promise.reject(new Error('NotAllowedError'))},configurable:true});
 env.w.document.querySelector('[data-target="record"]').click();
 await env.$('startRecord').onclick();
 assert.equal(env.$('startRecord').disabled,false);assert.equal(env.$('stopRecord').disabled,true);
 assert.match(env.$('recordNotice').textContent,/permission was unavailable/);assert.deepEqual(env.errors,[]);
 }finally{env.dom.window.close();}
});

function mockRecognition() {
 const instances=[];
 class Recognition {
  constructor(){this.aborted=false;instances.push(this);}
  start(){this.started=true;}
  abort(){this.aborted=true;}
  emit(text,isFinal=true){const result=[{transcript:text}];result.isFinal=isFinal;this.onresult?.({resultIndex:0,results:[result]});}
 }
 return {Recognition,instances};
}
test('spoken answer stays editable, requires explicit submission and is never saved as a transcript',()=>{
 const mock=mockRecognition();const env=boot({recognition:mock.Recognition});try{const {$,w}=env;
 assert.equal(mock.instances.length,0);$('lessonCards').children[0].click();assert.equal(mock.instances.length,0);
 $('qbSpeak').click();const mic=mock.instances[0];assert.equal(mic.started,true);assert.equal(mic.lang,'en-US');
 mic.emit('Why did operating expenses increase in March',false);
 assert.equal($('qbFeedback').hidden,true);assert.equal($('qbSpeak').getAttribute('aria-pressed'),'true');
 mic.emit('Why did operating expenses increase in March?',true);mic.onend();
 assert.equal($('qbStopMic').disabled,true);assert.equal($('qbFeedback').hidden,true);assert.match($('voiceNotice').textContent,/확인/);
 $('qbForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 assert.match($('feedbackTitle').textContent,/잘했어요/);
 const saved=w.localStorage.getItem(w.SFCore.KEY);assert.equal(saved.includes('operating expenses'),false);assert.equal(saved.includes('transcript'),false);
 assert.deepEqual(env.errors,[]);
 }finally{env.dom.window.close();}
});
test('speech denial, network errors and unavailable recognition keep typed practice usable',()=>{
 const mock=mockRecognition();const env=boot({recognition:mock.Recognition});try{const {$}=env;
 $('lessonCards').children[0].click();
 for(const [error,message] of [['not-allowed',/권한/],['network',/연결/],['no-speech',/들리지/]]){
  $('qbSpeak').click();const mic=mock.instances.at(-1);mic.onerror({error});
  assert.equal(mic.aborted,true);assert.equal($('qbSpeak').disabled,false);assert.equal($('qbStopMic').disabled,true);assert.match($('voiceNotice').textContent,message);
 }
 $('qbTypeAnswer').click();submit(env,'Why did operating expenses increase in March?');assert.match($('feedbackTitle').textContent,/잘했어요/);
 assert.deepEqual(env.errors,[]);
 }finally{env.dom.window.close();}
 const unavailable=boot();try{unavailable.$('lessonCards').children[0].click();unavailable.$('qbSpeak').click();assert.match(unavailable.$('voiceNotice').textContent,/지원하지/);assert.equal(unavailable.$('qbAnswer').disabled,false);}finally{unavailable.dom.window.close();}
});
test('pausing, typing, navigation and backgrounding abort the microphone and discard late callbacks',()=>{
 const mock=mockRecognition();const env=boot({recognition:mock.Recognition});try{const {$,w}=env;
 $('lessonCards').children[0].click();
 function active(){ $('qbSpeak').click();const mic=mock.instances.at(-1);return {mic,late:mic.onresult}; }
 let {mic,late}=active();$('pauseQuestion').click();assert.equal(mic.aborted,true);late({resultIndex:0,results:[Object.assign([{transcript:'stale pause'}],{isFinal:true})]});assert.equal($('qbAnswer').value,'');
 $('pauseQuestion').click();({mic}=active());$('qbAnswer').value='My own words';$('qbAnswer').dispatchEvent(new w.Event('input'));assert.equal(mic.aborted,true);assert.equal($('qbAnswer').value,'My own words');
 ({mic}=active());$('qbTypeAnswer').click();assert.equal(mic.aborted,true);assert.match($('voiceNotice').textContent,/조용히/);
 ({mic,late}=active());w.document.querySelector('[data-target="shadow"]').click();assert.equal(mic.aborted,true);
 w.document.querySelector('[data-target="builder"]').click();$('qbAnswer').value='';late({resultIndex:0,results:[Object.assign([{transcript:'stale tab'}],{isFinal:true})]});assert.equal($('qbAnswer').value,'');
 ({mic}=active());Object.defineProperty(w.document,'hidden',{value:true,configurable:true});w.document.dispatchEvent(new w.Event('visibilitychange'));assert.equal(mic.aborted,true);
 Object.defineProperty(w.document,'hidden',{value:false,configurable:true});({mic}=active());w.dispatchEvent(new w.Event('pagehide'));assert.equal(mic.aborted,true);
 ({mic}=active());$('backToLessons').click();assert.equal(mic.aborted,true);assert.equal($('qbHome').hidden,false);
 assert.deepEqual(env.errors,[]);
 }finally{env.dom.window.close();}
});
test('recognition startup failure resets controls and manual token choice stops active recognition',()=>{
 class Broken {start(){throw new Error('unavailable');}abort(){}}
 const broken=boot({recognition:Broken});try{broken.$('lessonCards').children[0].click();broken.$('qbSpeak').click();assert.equal(broken.$('qbSpeak').disabled,false);assert.match(broken.$('voiceNotice').textContent,/시작할 수/);}finally{broken.dom.window.close();}
 const mock=mockRecognition();const env=boot({recognition:mock.Recognition});try{env.$('lessonCards').children[0].click();env.$('qbSpeak').click();env.$('tokenBank').children[0].click();assert.equal(mock.instances[0].aborted,true);assert.ok(env.$('qbAnswer').value);assert.deepEqual(env.errors,[]);}finally{env.dom.window.close();}
});
