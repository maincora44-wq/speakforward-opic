const {test} = require('node:test');
const assert = require('node:assert/strict');
const C = require('../core.js'), P = require('../practice-core.js');
const content = require('../practice-content.js'), {bank} = require('../lessons.js');
const now = Date.UTC(2026,9,20,9), day = '2026-10-20', scenario = content.scenarios[0];
function finish(state, date=day) {
  state.session = P.newSession(scenario.id,'session-'+date);
  for (const step of scenario.steps) { P.record(state,scenario,P.evaluate(step,step.examples[0]),now); state.session.cursor++; }
  return P.complete(state,scenario,date,now);
}
test('original guided content has 3 scenarios, 12 stable phrases and accepts authored variants', () => {
  assert.equal(content.scenarios.length,3); assert.equal(Object.keys(content.phrases).length,12);
  assert.equal(new Set(content.scenarios.flatMap(item=>item.steps.map(step=>step.id))).size,12);
  for (const item of content.scenarios) for (const step of item.steps) {
    assert.ok(step.goal && step.ko && step.note && step.tutor);
    for (const answer of step.examples) assert.equal(P.evaluate(step,answer.toUpperCase()+' ').status,'example');
  }
});
test('guided comparisons distinguish blank, known errors and unknown natural answers without pretending to judge meaning', () => {
  const step = scenario.steps[0];
  assert.equal(P.evaluate(step,' ').empty,true);
  assert.deepEqual(P.evaluate(step,step.errors[0][0]).tags,['base_verb']);
  const unknown = P.evaluate(step,'Would Friday afternoon be a better time for everyone?');
  assert.equal(unknown.status,'compare'); assert.deepEqual(unknown.tags,[]); assert.match(unknown.message,/자연스러운/);
});
test('first attempt hints count once; paused and empty answers do not record', () => {
  const state=P.fresh(); state.session=P.newSession(scenario.id,'one');
  state.session.paused=true; assert.equal(P.record(state,scenario,P.evaluate(scenario.steps[0],scenario.steps[0].examples[0]),now),false);
  state.session.paused=false; assert.equal(P.record(state,scenario,P.evaluate(scenario.steps[0],''),now),false);
  const bad=P.evaluate(scenario.steps[0],scenario.steps[0].errors[0][0]);
  assert.equal(P.record(state,scenario,bad,now),true); assert.equal(P.record(state,scenario,bad,now),false);
  assert.equal(state.errors.base_verb.count,1); assert.equal(P.complete(state,scenario,day,now),null);
});
test('completion requires every acknowledged step, pays 40 XP and cannot duplicate same-day rewards', () => {
  const state=P.fresh(); assert.equal(finish(state),40); assert.equal(P.complete(state,scenario,day,now),null);
  assert.equal(finish(state),0); assert.equal(finish(state,'2026-10-21'),40);
  assert.equal(P.stats(state,day,now).xp,80); assert.equal(P.stats(state,day,now).today.turns,4);
  assert.equal(P.stats(state,'2026-10-22',now).today.xp,0);
});
test('phrase review follows due recall, avoids early stage advancement and gives unique daily XP', () => {
  const state=P.fresh(), id=scenario.steps[0].id; P.bookmark(state,id,now);
  assert.equal(P.reviewPhrase(state,id,true,day,now),5); assert.equal(state.review[id].stage,1);
  const firstDue=now+86400000; assert.equal(state.review[id].dueAt,firstDue);
  assert.equal(P.reviewPhrase(state,id,true,day,now+100),0); assert.equal(state.review[id].stage,1);
  P.reviewPhrase(state,id,true,'2026-10-21',firstDue); assert.equal(state.review[id].stage,2);
  P.reviewPhrase(state,id,true,'2026-10-24',firstDue+3*86400000); assert.equal(state.review[id].stage,3);
  P.reviewPhrase(state,id,false,'2026-10-24',firstDue+3*86400000+1000);
  assert.equal(state.review[id].stage,0); assert.equal(state.review[id].dueAt,firstDue+3*86400000+601000);
  assert.equal(P.bookmark(state,id,now),false); assert.equal(Object.hasOwn(state.review,id),false);
  assert.equal(P.reviewPhrase(state,id,true,day,now),null);
});
test('restore drops transcripts and foreign identifiers, repairs cursors and resumes paused', () => {
  const state=P.fresh(); state.session=P.newSession(scenario.id,'saved');
  P.record(state,scenario,P.evaluate(scenario.steps[0],scenario.steps[0].examples[0]),now);
  state.session.cursor=4; state.session.completedAt=now; state.session.answer='private answer'; state.transcript='private transcript';
  state.bookmarks=['constructor','not-a-phrase',scenario.steps[0].id];
  const restored=P.restore(JSON.stringify(state),content,now);
  assert.equal(restored.repaired,true); assert.equal(restored.state.session.cursor,1); assert.equal(restored.state.session.completedAt,null);
  assert.equal(restored.state.session.paused,true); assert.deepEqual(restored.state.bookmarks,[scenario.steps[0].id]);
  assert.equal(JSON.stringify(restored.state).includes('private'),false);
  assert.equal(P.restore('{broken',content,now).repaired,true); assert.equal(P.restore('{"version":9}',content,now).repaired,true);
});
test('completed practice state and saved schedules roundtrip without XP drift', () => {
  const state=P.fresh(); finish(state); P.bookmark(state,scenario.steps[0].id,now);
  const restored=P.restore(JSON.stringify(state),content,now);
  assert.equal(restored.repaired,false); assert.equal(P.stats(restored.state,day,now).xp,40);
  assert.equal(restored.state.session.paused,true); assert.equal(restored.state.review[scenario.steps[0].id].dueAt,now);
});
test('personal memory combines active review tags and observed dialogue hints with related lessons', () => {
  const builder=C.freshState(), practice=P.fresh(), id=Object.keys(bank)[0];
  builder.review[id]={stage:0,tags:['base_verb'],dueAt:now}; practice.errors.base_verb={count:2,at:now};
  let rows=P.memory(builder,practice,bank); assert.equal(rows[0].questions,1); assert.equal(rows[0].dialogueAttempts,2); assert.equal(rows[0].lessonId,'questions');
  builder.review[id].stage=3; rows=P.memory(builder,practice,bank); assert.equal(rows[0].questions,0); assert.equal(rows[0].dialogueAttempts,2);
});
