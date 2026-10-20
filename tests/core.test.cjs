const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../core.js');
const { bank, lessons } = require('../lessons.js');
const start = Date.UTC(2026, 9, 18, 0, 0);
const minute = 60000;
const day = 86400000;
const question = bank['questions-variance-v1'];
test('original bank: 4 complete lessons, 24 unique versioned exercises', () => {
  const original = lessons.filter(lesson => ['questions','requests','audit','meetings'].includes(lesson.id));
  assert.equal(original.length, 4); assert.equal(original.flatMap(lesson => lesson.ids).length, 24);
  for (const lesson of original) { assert.equal(lesson.ids.length, 6); for (const id of lesson.ids) {
    assert.equal(bank[id].provenance, 'Original SpeakForward content');
    assert.ok(bank[id].answers.length); assert.ok(bank[id].explanation);
  } }
});
test('all authored answers and harmless case/space/punctuation variants pass', () => {
  for (const exercise of Object.values(bank)) {
    assert.equal(C.evaluate(exercise, exercise.answers[0]).correct, true);
    assert.equal(C.evaluate(exercise, '  '+exercise.answers[0].toUpperCase().replace(/ /g,'  ')+'  ').correct, true);
  }
  assert.equal(C.normalize('  WHAT’S  NEXT?!  '), "what's next");
});
test('known word-order and base-verb errors produce distinct explanations', () => {
  assert.deepEqual(C.evaluate(question, 'Why operating expenses did increase in March?').tags, ['question_word_order']);
  assert.deepEqual(C.evaluate(question, 'Why did operating expenses increased in March?').tags, ['base_verb']);
});
test('negation changes and unknown variants never silently pass', () => {
  assert.equal(C.evaluate(question, 'Why did operating expenses not increase in March?').correct, false);
  const result = C.evaluate(question, 'Why were costs higher in March?');
  assert.deepEqual(result.tags, ['needs_review']); assert.match(result.message, /자연스러운/);
});
test('subject questions do not require do-support; polite request criterion is explicit', () => {
  assert.equal(C.evaluate(bank['questions-owner-v1'], 'Who reviews the intercompany reconciliation?').correct, true);
  assert.deepEqual(C.evaluate(bank['requests-schedule-v1'], 'Share the revised audit schedule.').tags, ['politeness']);
});
test('blank answers do not create attempts or schedules', () => {
  const state = C.freshState(); state.session = C.newSession([question.id], 'lesson', start, 's1');
  assert.equal(C.record(state, question, C.evaluate(question, '   '), start), false);
  assert.deepEqual(state.review, {}); assert.deepEqual(state.session.results, {});
});
test('failed attempt followed by same-session correct retry stays due at ten minutes', () => {
  const state = C.freshState(); state.session = C.newSession([question.id], 'lesson', start, 's1');
  C.record(state, question, C.evaluate(question, 'incorrect response'), start);
  assert.equal(C.record(state, question, C.evaluate(question, question.answers[0]), start + minute), false);
  assert.equal(state.review[question.id].stage, 0); assert.equal(state.review[question.id].dueAt, start + 10 * minute);
  assert.equal(Object.keys(state.session.results).length, 1);
});
test('independent review advances 1/3/7 days, saturates and resets on failure', () => {
  let item = C.schedule(null, true, [], start); assert.equal(item.dueAt, start + day); assert.equal(item.stage, 1);
  item = C.schedule(item, true, [], start); assert.equal(item.dueAt, start + 3 * day); assert.equal(item.stage, 2);
  item = C.schedule(item, true, [], start); assert.equal(item.dueAt, start + 7 * day); assert.equal(item.stage, 3);
  item = C.schedule(item, true, [], start); assert.equal(item.dueAt, start + 7 * day); assert.equal(item.stage, 3);
  item = C.schedule(item, false, ['base_verb'], start); assert.equal(item.dueAt, start + 10 * minute); assert.equal(item.stage, 0);
});
test('due review excludes future/removed content and selects oldest six with stable tie-breaks', () => {
  const review = {};
  Object.keys(bank).slice(0, 8).forEach(id => review[id] = C.schedule(null, false, [], start - 11 * minute));
  review[Object.keys(bank)[8]] = C.schedule(null, true, [], start);
  review.removed = { dueAt: start - day };
  const ids = C.dueItems(review, bank, start);
  assert.equal(ids.length, 6); assert.deepEqual(ids, Object.keys(bank).slice(0, 8).sort((a,b)=>a.localeCompare(b)).slice(0,6));
  assert.equal(C.dueItems(review, bank, start, Infinity).length, 8);
});
test('complete only after all selected distinct questions; repeated finish is idempotent', () => {
  const state = C.freshState(); state.session = C.newSession(lessons[0].ids, 'lesson', start, 's1');
  assert.equal(C.complete(state, '2026-10-18', 'Asia/Seoul', start), false);
  for (let index=0;index<6;index++) { state.session.cursor=index; const item=bank[state.session.ids[index]];
    C.record(state, item, C.evaluate(item,item.answers[0]),start); }
  assert.equal(C.complete(state,'2026-10-18','Asia/Seoul',start),true);
  assert.equal(C.complete(state,'2026-10-18','Asia/Seoul',start),false); assert.equal(state.completions.length,1);
});
test('second eligible session on the same date adds zero streak days', () => {
  const state = C.freshState();
  for(let index=0;index<2;index++){state.session=C.newSession([question.id],'review',start,'s'+index);
    C.record(state,question,C.evaluate(question,question.answers[0]),start);C.complete(state,'2026-10-18','Asia/Seoul',start);}
  assert.equal(state.completions.length,1); assert.equal(C.streak(state.completions),1);
});
test('calendar streaks survive DST and reset after a gap', () => {
  assert.equal(C.streak([{day:'2026-03-07'},{day:'2026-03-08'},{day:'2026-03-09'}]),3);
  assert.equal(C.streak([{day:'2026-10-16'},{day:'2026-10-18'}]),1);
  assert.equal(C.streak([]),0); assert.ok(Number.isNaN(C.dayNumber('2026-02-30')));
});
test('local day uses the device calendar rather than UTC midnight', () => {
  const local = new Date(2026,9,18,0,30);
  assert.equal(C.localDay(local),'2026-10-18');
});
test('restore resumes paused and keeps attempt metadata without answer text', () => {
  const state=C.freshState();state.session=C.newSession(lessons[0].ids,'lesson',start,'s1');
  C.record(state,question,C.evaluate(question,question.answers[0]),start);
  const result=C.restore(JSON.stringify(state),bank,start);
  assert.equal(result.state.session.paused,true);assert.equal(Object.keys(result.state.session.results).length,1);
  assert.equal(JSON.stringify(result.state).includes('operating expenses'),false);
  assert.equal(C.record(result.state,question,C.evaluate(question,question.answers[0]),start),false);
});
test('corrupt, unsupported and malformed stored records repair safely', () => {
  assert.equal(C.restore('{bad',bank,start).repaired,true);
  assert.equal(C.restore('{"version":2}',bank,start).repaired,true);
  const state=C.freshState();state.review[question.id]={stage:0,dueAt:'broken',tags:[]};
  state.session={id:'bad',ids:['missing'],cursor:99};
  const result=C.restore(JSON.stringify(state),bank,start);
  assert.equal(result.repaired,true);assert.equal(result.state.review[question.id].dueAt,start);assert.equal(result.state.session,null);
});
test('malformed cursors cannot skip unanswered questions or forge a completion', () => {
  const state=C.freshState();state.session=C.newSession(lessons[0].ids,'lesson',start,'s1');
  state.session.cursor=6;state.session.completedAt=start;
  const restored=C.restore(JSON.stringify(state),bank,start);
  assert.equal(restored.state.session.cursor,0);assert.equal(restored.state.session.completedAt,null);assert.equal(restored.repaired,true);
});
test('unrecognized state fields and answer transcripts are dropped on restore', () => {
  const state=C.freshState();state.session=C.newSession([question.id],'lesson',start,'s1');state.session.answer='private text';
  state.transcript='sensitive';state.review.constructor={stage:0,dueAt:start};
  const restored=C.restore(JSON.stringify(state),bank,start);
  assert.equal(JSON.stringify(restored.state).includes('private text'),false);
  assert.equal(JSON.stringify(restored.state).includes('sensitive'),false);
  assert.equal(Object.hasOwn(restored.state.review,'constructor'),false);
});
