const { test } = require('node:test');
const assert = require('node:assert/strict');
const data = require('../finance-data.js');
const C = require('../core.js');
const { bank, lessons } = require('../lessons.js');

test('historical FX teaching snapshot retains verified dates, units and source provenance', () => {
  assert.equal(data.reader, 'FinanceDataReader'); assert.equal(data.readerVersion, '0.9.202');
  assert.equal(data.sourceUrl, 'https://fred.stlouisfed.org/series/DEXKOUS');
  assert.equal(data.unit, 'KRW per 1 USD'); assert.match(data.sourceSHA256, /^[0-9a-f]{64}$/);
  assert.ok(Number.isFinite(Date.parse(data.retrievedAt)));
  assert.deepEqual(data.observations, [
    {day:'2025-09-02',value:1394.76}, {day:'2025-09-03',value:1389.21},
    {day:'2025-09-04',value:1394.8}, {day:'2025-09-05',value:1385.28}
  ]); // Changed data needs new exercise versions, not new answers for saved IDs.
});
test('six new exercises teach the actual period direction and quote convention', () => {
  const lesson = lessons.find(lesson => lesson.id === 'finance-fx-202509-v1');
  assert.equal(lessons.length, 5); assert.equal(Object.keys(bank).length, 30); assert.equal(lesson.ids.length, 6);
  const exercises = lesson.ids.map(id => bank[id]);
  assert.deepEqual(exercises.map(e => e.kind), ['choice','gap','choice','gap','type','order']);
  assert.equal(exercises[0].answers[0], 'The USD/KRW rate fell over the period.');
  assert.match(exercises[1].example, /fell by about 0\.68 percent/);
  assert.match(exercises[2].answers[0], /won strengthened/);
  for (const exercise of exercises) {
    if (exercise.choices) {
      assert.equal(new Set(exercise.choices).size, 3);
      assert.equal(exercise.choices.filter(answer => C.evaluate(exercise, answer).correct).length, 1);
    }
    for (const answer of exercise.answers) assert.equal(C.evaluate(exercise, answer).correct, true);
  }
  assert.equal(C.evaluate(exercises[1], 'rose').correct, false);
  assert.equal(C.evaluate(exercises[3], 'does').correct, false);
});
