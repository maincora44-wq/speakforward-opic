const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../core.js');
const { bank, lessons } = require('../lessons.js');
const day = '2026-10-20';
function completed(ids = lessons[0].ids, mode = 'lesson') {
  const state = C.freshState();
  state.session = C.newSession(ids, mode, 1000, 'session');
  ids.forEach((id, cursor) => { state.session.cursor = cursor; C.record(state, bank[id], C.evaluate(bank[id], 'not an example'), 2000); });
  return state;
}
test('only explicit completed sessions earn XP; repeat and reload cannot duplicate daily rewards', () => {
  const state = completed(); const next = C.Next.fresh();
  assert.equal(C.Next.award(next, state.session, day, bank, lessons), 0);
  C.complete(state, day, 'Asia/Seoul', 3000);
  assert.equal(C.Next.award(next, state.session, day, bank, lessons), 70);
  const restored = C.Next.restore(JSON.stringify(next), bank, lessons);
  assert.equal(restored.repaired, false);
  assert.equal(C.Next.award(restored.state, state.session, day, bank, lessons), 0);
  assert.equal(C.Next.overview(restored.state, day, lessons).xp, 70);
  assert.equal(C.Next.overview(next, day, lessons).recommended, lessons[1].id);
  assert.equal(JSON.stringify(next).includes('not an example'), false);
});
test('review overlaps do not duplicate answers; quests and level accumulate across dates', () => {
  const next = C.Next.fresh(); const state = completed(); C.complete(state, day, 'unknown', 3000);
  C.Next.award(next, state.session, day, bank, lessons);
  const review = completed(lessons[0].ids.slice(0, 3), 'review'); C.complete(review, day, 'unknown', 3000);
  assert.equal(C.Next.award(next, review.session, day, bank, lessons), 20);
  let view = C.Next.overview(next, day, lessons);
  assert.equal(view.xp, 90); assert.equal(view.today.quests.filter(q => q.value >= q.goal).length, 3);
  assert.equal(C.Next.overview(next, '2026-10-21', lessons).today.xp, 0);
  C.Next.award(next, state.session, '2026-10-21', bank, lessons);
  view = C.Next.overview(next, '2026-10-21', lessons);
  assert.equal(view.xp, 160); assert.equal(view.level, 2); assert.equal(view.levelXP, 60);
  assert.equal(view.path[0].complete, true);
});
test('corrupt progress repairs independently, drops transcripts and invalid daily facts', () => {
  assert.equal(C.Next.restore('{broken', bank, lessons).repaired, true);
  assert.equal(C.Next.restore('{"version":2}', bank, lessons).repaired, true);
  const raw = { version: 1, days: { '2026-02-30': {}, [day]: {
    answers: [lessons[0].ids[0], lessons[0].ids[0], 'missing'], reviews: ['missing'], lessons: ['questions', 'missing'], transcript: 'private'
  } }, xp: 999999 };
  const restored = C.Next.restore(JSON.stringify(raw), bank, lessons);
  assert.equal(restored.repaired, true); assert.deepEqual(Object.keys(restored.state.days), [day]);
  assert.equal(C.Next.overview(restored.state, day, lessons).xp, 5);
  assert.equal(C.Next.overview(restored.state, day, lessons).path[0].complete, false);
  assert.equal(JSON.stringify(restored.state).includes('private'), false);
});
