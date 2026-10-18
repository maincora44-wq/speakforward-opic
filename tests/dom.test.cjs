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
 if(options.saved)w.localStorage.setItem('speakForward.questionBuilder.v1',options.saved);
 if(options.blockStorage)Object.defineProperty(w,'localStorage',{get(){throw new w.DOMException('Blocked','SecurityError');}});
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 for(const file of ['core.js','lessons.js','legacy.js','app.js'])w.eval(fs.readFileSync(path.join(root,file),'utf8'));
 return {dom,w,$:id=>w.document.getElementById(id),errors};
}
function submit(env,text){env.$('qbAnswer').value=text;env.$('qbForm').dispatchEvent(new env.w.Event('submit',{bubbles:true,cancelable:true}));}
test('full lesson: blank feedback, incorrect retry, next, six answers and explicit completion',()=>{
 const env=boot();try{
 const {$,w}=env;assert.equal($('lessonCards').children.length,4);
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
