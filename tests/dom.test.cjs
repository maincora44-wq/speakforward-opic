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
 if(options.practiceSaved)w.localStorage.setItem('speakForward.practice.v1',options.practiceSaved);
 if(options.blockStorage)Object.defineProperty(w,'localStorage',{get(){throw new w.DOMException('Blocked','SecurityError');}});
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 for(const file of ['core.js','finance-data.js','lessons.js','practice-content.js','practice-core.js','legacy.js','practice.js','app.js'])w.eval(fs.readFileSync(path.join(root,file),'utf8'));
 return {dom,w,$:id=>w.document.getElementById(id),errors};
}
function submit(env,text){env.$('qbAnswer').value=text;env.$('qbForm').dispatchEvent(new env.w.Event('submit',{bubbles:true,cancelable:true}));}
function submitDialogue(env,text){env.$('rpAnswer').value=text;env.$('rpForm').dispatchEvent(new env.w.Event('submit',{bubbles:true,cancelable:true}));}
function openDialogue(env,index=0){
 env.w.document.querySelector('[data-target="roleplay"]').click();
 if(!env.$('rpExercise').hidden)env.$('rpHomeButton').click();
 if(!env.$('rpSummary').hidden)env.$('rpSummaryHome').click();
 env.$('scenarioCards').children[index].click();
 if(env.$('replaceDialogueDialog').open)env.$('confirmDialogue').click();
}
function finishDialogue(env,index=0){
 openDialogue(env,index);
 for(const step of env.w.SFPracticeContent.scenarios[index].steps){submitDialogue(env,step.examples[0]);env.$('rpNext').click();}
 env.$('rpFinish').click();
}
test('guided dialogue completes explicit goals, preserves first hint and never persists learner text',()=>{
 const env=boot();try{const {$,w}=env;openDialogue(env);
 const scenario=w.SFPracticeContent.scenarios[0];
 submitDialogue(env,' ');assert.equal($('rpFeedback').hidden,true);assert.match($('rpAnswerNotice').textContent,/입력/);
 submitDialogue(env,scenario.steps[0].errors[0][0]);assert.match($('rpFeedbackTitle').textContent,/살펴/);
 $('rpRetry').click();submitDialogue(env,scenario.steps[0].examples[0]);assert.match($('rpFeedbackTitle').textContent,/일치/);$('rpNext').click();
 const privateText='<img src=x onerror=private> I would like the documentation in advance.';
 submitDialogue(env,privateText);assert.match($('rpFeedbackMessage').textContent,/자연스러운/);assert.equal($('rpConversation').querySelector('img'),null);$('rpNext').click();
 for(const step of scenario.steps.slice(2)){submitDialogue(env,step.examples[0]);$('rpNext').click();}
 assert.equal($('nextXP').textContent,'0 XP');$('rpFinish').click();$('rpFinish').click();
 assert.equal($('nextXP').textContent,'40 XP');assert.match($('rpReward').textContent,/40 XP/);
 const raw=w.localStorage.getItem(w.SFPracticeCore.KEY);assert.equal(raw.includes(privateText),false);assert.equal(raw.includes(scenario.steps[0].examples[0]),false);
 assert.equal(JSON.parse(raw).errors.base_verb.count,1);
 w.document.querySelector('[data-target="memory"]').click();assert.match($('memoryPatterns').textContent,/동사원형/);
 $('memoryPatterns').querySelector('button').click();assert.equal($('qbExercise').hidden,false);assert.match($('qbPrompt').textContent,/비용/);
 assert.deepEqual(env.errors,[]);
 }finally{env.dom.window.close();}
});
test('dialogue XP combines with question XP and repeats do not inflate totals',()=>{
 const env=boot();try{finishFirstLesson(env);finishDialogue(env);assert.equal(env.$('nextXP').textContent,'110 XP');assert.equal(env.$('nextLevel').textContent,'레벨 2');
 finishDialogue(env);assert.equal(env.$('nextXP').textContent,'110 XP');assert.match(env.$('rpReward').textContent,/\+0 XP/);assert.deepEqual(env.errors,[]);
 }finally{env.dom.window.close();}
});
test('all three scenario routes complete, save their own goals and share one level total',()=>{
 const env=boot();try{for(let index=0;index<3;index++)finishDialogue(env,index);
 assert.equal(env.$('nextXP').textContent,'120 XP');assert.equal(env.$('nextLevel').textContent,'레벨 2');
 const state=env.w.SFPractice.exportState();const day=env.w.SFCore.localDay();assert.equal(state.days[day].scenarios.length,3);assert.equal(state.days[day].turns.length,12);assert.deepEqual(env.errors,[]);
 }finally{env.dom.window.close();}
});
test('dialogue TTS is stopped by microphone, navigation and pause without stale status callbacks',()=>{
 const mock=mockRecognition(),env=boot({recognition:mock.Recognition});try{const {$,w}=env;const spoken=[];let cancelled=0;
 w.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};w.speechSynthesis={speak:value=>spoken.push(value),cancel:()=>cancelled++};
 openDialogue(env);$('rpListenTutor').click();assert.equal(spoken.length,1);const ended=spoken[0].onend;assert.equal($('practiceAudioBar').hidden,false);
 $('rpSpeak').click();assert.ok(cancelled>0);assert.equal($('practiceAudioBar').hidden,true);ended();assert.match($('rpVoiceNotice').textContent,/마이크 연결/);
 $('rpListenTutor').click();assert.equal(mock.instances.at(-1).aborted,true);$('rpPause').click();assert.equal($('practiceAudioBar').hidden,true);
 assert.deepEqual(env.errors,[]);
 }finally{env.dom.window.close();}
});
test('legacy speech cannot append a late transcript after navigation to guided practice',()=>{
 const mock=mockRecognition(),env=boot({recognition:mock.Recognition});try{const {$,w}=env;
 w.document.querySelector('[data-target="exam"]').click();$('startSTT').click();const mic=mock.instances.at(-1);mic.emit('Yesterday I completed the report.',true);
 const before=$('answer').value,late=mic.onresult;w.document.querySelector('[data-target="roleplay"]').click();
 late({resultIndex:0,results:[Object.assign([{transcript:'stale private sentence'}],{isFinal:true})]});assert.equal($('answer').value,before);assert.equal(mic.aborted,true);assert.deepEqual(env.errors,[]);
 }finally{env.dom.window.close();}
});
test('dialogue reload resumes paused feedback without learner text or duplicate attempts',()=>{
 let env=boot();let practiceSaved;try{openDialogue(env);submitDialogue(env,'My private work details');practiceSaved=env.w.localStorage.getItem(env.w.SFPracticeCore.KEY);}finally{env.dom.window.close();}
 env=boot({practiceSaved});try{env.w.document.querySelector('[data-target="roleplay"]').click();env.$('rpResume').click();
 assert.equal(env.$('rpFeedback').hidden,false);assert.match(env.$('rpConversation').textContent,/저장하지 않아/);assert.equal(env.$('rpConversation').textContent.includes('My private'),false);
 env.$('rpNext').click();assert.equal(env.$('rpPosition').textContent,'2 / 4');assert.deepEqual(env.errors,[]);
 }finally{env.dom.window.close();}
});
test('saved expressions support recall, schedule persistence, filtering and removal',()=>{
 const env=boot();try{const {$,w}=env;w.document.querySelector('[data-target="phrases"]').click();assert.equal($('phraseList').children.length,12);
 $('phraseList').firstElementChild.querySelectorAll('button')[1].click();assert.equal($('phraseSavedCount').textContent,'1');
 $('phraseSavedOnly').checked=true;$('phraseSavedOnly').dispatchEvent(new w.Event('change'));assert.equal($('phraseList').children.length,1);
 $('startPhraseReview').click();assert.equal($('phraseReviewEnglish').hidden,true);$('phraseRemembered').click();assert.equal($('nextXP').textContent,'0 XP');
 $('phraseReveal').click();assert.equal($('phraseReviewEnglish').hidden,false);$('phraseRemembered').click();$('phraseRemembered').click();assert.equal($('nextXP').textContent,'5 XP');
 const saved=JSON.parse(w.localStorage.getItem(w.SFPracticeCore.KEY)),id=saved.bookmarks[0];assert.equal(saved.review[id].stage,1);assert.ok(saved.review[id].dueAt>Date.now());
 $('startPhraseReview').click();$('phraseReveal').click();$('phraseRemembered').click();assert.equal(JSON.parse(w.localStorage.getItem(w.SFPracticeCore.KEY)).review[id].stage,1);
 $('phraseList').firstElementChild.querySelectorAll('button')[1].click();assert.equal($('phraseSavedCount').textContent,'0');assert.equal($('phraseEmpty').hidden,false);assert.deepEqual(env.errors,[]);
 }finally{env.dom.window.close();}
});
test('v3 backup roundtrip covers dialogue and bookmarks; v2 import preserves them',async()=>{
 const env=boot();try{const {$,w}=env;finishDialogue(env);w.document.querySelector('[data-target="phrases"]').click();$('phraseList').firstElementChild.querySelectorAll('button')[1].click();
 let blob;w.URL.createObjectURL=value=>{blob=value;return 'blob:backup';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};
 $('practiceExport').click();const text=await new Promise(resolve=>{const reader=new w.FileReader();reader.onload=()=>resolve(reader.result);reader.readAsText(blob);});const backup=JSON.parse(text);
 assert.equal(backup.version,3);assert.equal(backup.practice.bookmarks.length,1);
 w.confirm=()=>true;const load=async value=>{const raw=JSON.stringify(value);await $('importProgress').onchange({target:{files:[{size:raw.length,text:async()=>raw}],value:'backup'}});};
 await load({version:3,builder:w.SFCore.freshState(),next:w.SFCore.Next.fresh(),practice:w.SFPracticeCore.fresh()});assert.equal($('nextXP').textContent,'0 XP');assert.equal($('phraseSavedCount').textContent,'0');
 await load(backup);assert.equal($('nextXP').textContent,'40 XP');assert.equal($('phraseSavedCount').textContent,'1');
 await load({version:2,builder:backup.builder,next:backup.next});assert.equal($('phraseSavedCount').textContent,'1');assert.equal($('nextXP').textContent,'40 XP');
 const before=w.localStorage.getItem(w.SFPracticeCore.KEY);await load({...backup,practice:{version:9}});assert.match($('storageNotice').textContent,/실패/);assert.equal(w.localStorage.getItem(w.SFPracticeCore.KEY),before);
  await load({...backup,practice:{...backup.practice,transcript:'private imported words'}});assert.match($('storageNotice').textContent,/복구/);assert.equal(w.localStorage.getItem(w.SFPracticeCore.KEY).includes('private imported'),false);
 assert.deepEqual(env.errors,[]);
 }finally{env.dom.window.close();}
});
test('dialogue microphone is editable and explicit, cancels on pause, navigation and late callbacks',()=>{
 const mock=mockRecognition(),env=boot({recognition:mock.Recognition});try{const {$,w}=env;openDialogue(env);$('rpSpeak').click();const mic=mock.instances.at(-1);assert.equal(mic.lang,'en-US');
 mic.emit('Could we move the audit meeting to Friday?',true);assert.equal($('rpFeedback').hidden,true);assert.match($('rpAnswer').value,/Friday/);
 const late=mic.onresult;$('rpPause').click();assert.equal(mic.aborted,true);$('rpAnswer').value='manual';late({resultIndex:0,results:[Object.assign([{transcript:'stale'}],{isFinal:true})]});assert.equal($('rpAnswer').value,'manual');
 $('rpPause').click();$('rpSpeak').click();const next=mock.instances.at(-1);$('rpType').click();assert.equal(next.aborted,true);
 $('rpSpeak').click();const last=mock.instances.at(-1);w.document.querySelector('[data-target="builder"]').click();assert.equal(last.aborted,true);
 assert.deepEqual(env.errors,[]);
 }finally{env.dom.window.close();}
});
test('dialogue speech denial and unsupported browser preserve typing; background cancels recognition',()=>{
 const mock=mockRecognition(),env=boot({recognition:mock.Recognition});try{const {$,w}=env;openDialogue(env);
 for(const error of ['not-allowed','network','no-speech']){$('rpSpeak').click();mock.instances.at(-1).onerror({error});assert.equal($('rpSpeak').disabled,false);assert.equal($('rpAnswer').disabled,false);}
 $('rpSpeak').click();const mic=mock.instances.at(-1);Object.defineProperty(w.document,'hidden',{value:true,configurable:true});w.document.dispatchEvent(new w.Event('visibilitychange'));assert.equal(mic.aborted,true);assert.equal($('rpAnswer').disabled,true);
 Object.defineProperty(w.document,'hidden',{value:false,configurable:true});$('rpPause').click();delete w.SpeechRecognition;$('rpSpeak').click();assert.match($('rpVoiceNotice').textContent,/支持|サポート|지원/);
 submitDialogue(env,w.SFPracticeContent.scenarios[0].steps[0].examples[0]);assert.equal($('rpFeedback').hidden,false);assert.deepEqual(env.errors,[]);
 }finally{env.dom.window.close();}
});
test('dialogue persistence failure and other-tab edits are reported without blocking local learning',()=>{
 const env=boot();try{const {$,w}=env;const original=w.Storage.prototype.setItem;w.Storage.prototype.setItem=function(key,value){if(key===w.SFPracticeCore.KEY)throw new Error('QuotaExceeded');return original.call(this,key,value);};
 finishDialogue(env);assert.equal($('nextXP').textContent,'40 XP');assert.match($('practiceStorageNotice').textContent,/저장할 수 없/);assert.match($('rpReward').textContent,/현재 화면/);assert.deepEqual(env.errors,[]);
 }finally{env.dom.window.close();}
 const stale=boot();try{openDialogue(stale);const external=JSON.stringify(stale.w.SFPracticeCore.fresh());stale.w.localStorage.setItem(stale.w.SFPracticeCore.KEY,external);
 submitDialogue(stale,'an answer');assert.equal(stale.w.localStorage.getItem(stale.w.SFPracticeCore.KEY),external);assert.match(stale.$('practiceStorageNotice').textContent,/다른 창/);assert.deepEqual(stale.errors,[]);
 }finally{stale.dom.window.close();}
});
test('changing scenarios asks before replacing progress and cancelling keeps the existing session',()=>{
 const env=boot();try{const {$,w}=env;openDialogue(env);submitDialogue(env,'a response');const before=w.SFPractice.exportState().session.id;$('rpHomeButton').click();$('scenarioCards').children[1].click();assert.equal($('replaceDialogueDialog').open,true);$('cancelDialogue').click();assert.equal(w.SFPractice.exportState().session.id,before);
 $('scenarioCards').children[1].click();$('confirmDialogue').click();assert.equal(w.SFPractice.exportState().session.scenarioId,'fx-talk-v1');assert.deepEqual(env.errors,[]);
 }finally{env.dom.window.close();}
});
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
test('v3 export/import roundtrip restores ledgers; old imports preserve independent progress', async () => {
 const env = boot();
 try {
  const {$, w} = env; finishFirstLesson(env);
  let exported;
  w.URL.createObjectURL = blob => { exported = blob; return 'blob:backup'; };
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () {};
  $('exportProgress').click();
  const text = await new Promise(resolve => { const reader = new w.FileReader(); reader.onload = () => resolve(reader.result); reader.readAsText(exported); });
  const backup = JSON.parse(text); assert.equal(backup.version, 3);
  assert.equal(backup.practice.version, 1);
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
  emitResults(items,resultIndex=0){const results=items.map(([transcript,isFinal])=>Object.assign([{transcript}],{isFinal}));this.onresult?.({resultIndex,results});}
 }
 return {Recognition,instances};
}
for(const surface of ['exam','builder','roleplay'])test(`${surface}: replayed or revised speech slots replace the current snapshot without accumulating words`,()=>{
 const mock=mockRecognition(),env=boot({recognition:mock.Recognition});try{const {$,w}=env;
 let field,start;
 if(surface==='exam'){w.document.querySelector('[data-target="exam"]').click();field=$('answer');start=$('startSTT');}
 else if(surface==='builder'){$('lessonCards').children[0].click();field=$('qbAnswer');start=$('qbSpeak');}
 else{openDialogue(env);field=$('rpAnswer');start=$('rpSpeak');}
 field.value='My draft.';start.click();const mic=mock.instances.at(-1);
 const trace=[
  {parts:[['I went',false]],index:0,text:'I went'},
  {parts:[['I went',true]],index:0,text:'I went'},
  {parts:[['I went',true]],index:0,text:'I went'},
  {parts:[['I went to Busan.',true]],index:0,text:'I went to Busan.'},
  {parts:[['I went to Busan.',true],['It was',false]],index:0,text:'I went to Busan. It was'},
  {parts:[['I went to Busan.',true],['It was a rewarding trip.',false]],index:1,text:'I went to Busan. It was a rewarding trip.'},
  {parts:[['I went to Busan.',true]],index:1,text:'I went to Busan.'},
  {parts:[['I went to Busan.',true],['It was rewarding.',true]],index:0,text:'I went to Busan. It was rewarding.'},
  {parts:[['I went to Busan.',true],['It was rewarding.',true]],index:0,text:'I went to Busan. It was rewarding.'}
 ];
 for(const event of trace){mic.emitResults(event.parts,event.index);assert.equal(field.value.trim(),'My draft. '+event.text);}
 mic.emitResults([['It was very very rewarding.',true],['I agree.',true],['I agree.',true]],0);
 assert.equal(field.value,'My draft. It was very very rewarding. I agree. I agree.');
 assert.deepEqual(env.errors,[]);
 }finally{env.dom.window.close();}
});
test('OPIc editing or clearing during recognition cancels old callbacks; a fresh session uses the edited prefix once',()=>{
 const mock=mockRecognition(),env=boot({recognition:mock.Recognition});try{const {$,w}=env;
 w.document.querySelector('[data-target="exam"]').click();$('answer').value='Original draft.';$('startSTT').click();
 let mic=mock.instances.at(-1);mic.emit('I went to Busan.',true);const late=mic.onresult;
 $('answer').value='My correction.';$('answer').dispatchEvent(new w.Event('input'));assert.equal(mic.aborted,true);
 late({resultIndex:0,results:[Object.assign([{transcript:'stale original'}],{isFinal:true})]});assert.equal($('answer').value,'My correction.');
 $('startSTT').click();mic=mock.instances.at(-1);mic.emit('It was rewarding.',true);mic.emit('It was rewarding.',true);
 assert.equal($('answer').value,'My correction. It was rewarding.');
 const afterClear=mic.onresult;$('clearAnswer').click();assert.equal(mic.aborted,true);assert.equal($('answer').value,'');
 afterClear({resultIndex:0,results:[Object.assign([{transcript:'stale after clear'}],{isFinal:true})]});assert.equal($('answer').value,'');assert.equal($('wordCount').textContent,'0');
 assert.deepEqual(env.errors,[]);
 }finally{env.dom.window.close();}
});
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
