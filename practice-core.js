(function (root, factory) {
  const core = typeof module === 'object' && module.exports ? require('./core.js') : root.SFCore;
  const api = factory(core);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SFPracticeCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (C) {
  'use strict';
  const KEY = 'speakForward.practice.v1';
  const statuses = ['example', 'compare', 'guided'];
  const tags = ['base_verb', 'question_word_order', 'politeness', 'tense'];
  const fresh = () => ({ version: 1, bookmarks: [], review: {}, session: null, days: {}, errors: {} });
  const validTime = value => Number.isFinite(value) && value >= 0 && value <= 8640000000000000;
  const shape = value => value?.version === 1 && Array.isArray(value.bookmarks) && value.review &&
    typeof value.review === 'object' && !Array.isArray(value.review) && value.days && typeof value.days === 'object' && !Array.isArray(value.days);
  function evaluate(step, answer) {
    const normalized = C.normalize(answer);
    if (!normalized) return { empty: true, status: 'compare', tags: [], message: '먼저 답변을 말하거나 입력해 주세요.' };
    if (step.examples.some(item => C.normalize(item) === normalized)) return {
      status: 'example', tags: [], message: '등록된 예시 표현과 일치해요. ' + step.note };
    const known = step.errors.find(item => C.normalize(item[0]) === normalized);
    return known ? { status: 'guided', tags: [known[1]], message: known[2] } : {
      status: 'compare', tags: [], message: '예시와 비교해 보세요. 다른 자연스러운 답변일 수도 있어요. 이 연습은 새로운 문장의 의미를 자동 채점하지 않습니다.' };
  }
  function restore(raw, content, now) {
    if (!raw) return { state: fresh(), repaired: false };
    try {
      const value = JSON.parse(raw);
      if (!shape(value)) throw new Error('Unsupported practice data');
      const state = fresh();
      const validId = id => typeof id === 'string' && Object.hasOwn(content.phrases, id);
      const unique = list => [...new Set(Array.isArray(list) ? list.filter(validId) : [])];
      state.bookmarks = unique(value.bookmarks);
      for (const id of state.bookmarks) {
        const previous = value.review[id];
        state.review[id] = { stage: Number.isInteger(previous?.stage) && previous.stage >= 0 && previous.stage <= 3 ? previous.stage : 0,
          dueAt: validTime(previous?.dueAt) ? previous.dueAt : now, lastReviewedAt: validTime(previous?.lastReviewedAt) ? previous.lastReviewedAt : null };
      }
      for (const [day, item] of Object.entries(value.days)) {
        if (!Number.isFinite(C.dayNumber(day)) || !item || typeof item !== 'object') continue;
        const turns = unique(item.turns);
        state.days[day] = { turns, scenarios: [...new Set(Array.isArray(item.scenarios) ? item.scenarios.filter(id =>
          content.scenarios.some(s => s.id === id && s.steps.every(step => turns.includes(step.id)))) : [])], phrases: unique(item.phrases) };
      }
      for (const tag of tags) {
        const item = value.errors?.[tag];
        if (item && Number.isSafeInteger(item.count) && item.count > 0 && validTime(item.at)) state.errors[tag] = { count: Math.min(item.count, 1000000), at: item.at };
      }
      const old = value.session;
      const scenario = content.scenarios.find(item => item.id === old?.scenarioId);
      if (scenario && typeof old.id === 'string' && old.id.length <= 150 && Number.isInteger(old.cursor) && old.cursor >= 0 && old.cursor <= scenario.steps.length) {
        state.session = newSession(scenario.id, old.id);
        for (const step of scenario.steps) {
          const result = old.results?.[step.id];
          if (result && statuses.includes(result.status) && validTime(result.at)) state.session.results[step.id] = {
            status: result.status, tags: Array.isArray(result.tags) ? result.tags.filter(tag => tags.includes(tag)) : [], at: result.at };
        }
        const missing = scenario.steps.findIndex(step => !state.session.results[step.id]);
        state.session.cursor = missing < 0 ? old.cursor : Math.min(old.cursor, missing);
        state.session.paused = true;
        state.session.completedAt = missing < 0 && validTime(old.completedAt) && old.completedAt > 0 ? old.completedAt : null;
      }
      // Pausing on restore is intentional and must not be reported as corruption.
      const compare = JSON.parse(JSON.stringify(value)); if (compare.session) compare.session.paused = true;
      return { state, repaired: JSON.stringify(state) !== JSON.stringify(compare) };
    } catch { return { state: fresh(), repaired: true }; }
  }
  function newSession(scenarioId, id) { return { scenarioId, id, cursor: 0, results: {}, paused: false, completedAt: null }; }
  function record(state, scenario, result, now) {
    const session = state.session;
    const step = scenario.steps[session?.cursor];
    if (!step || session.scenarioId !== scenario.id || session.paused || session.completedAt || result.empty || !statuses.includes(result.status) || session.results[step.id]) return false;
    const safeTags = result.tags.filter(tag => tags.includes(tag));
    session.results[step.id] = { status: result.status, tags: safeTags, at: now };
    for (const tag of safeTags) state.errors[tag] = { count: (state.errors[tag]?.count || 0) + 1, at: now };
    return true;
  }
  function daily(state, day) {
    const facts = state.days[day] || { turns: [], scenarios: [], phrases: [] };
    return { xp: facts.turns.length * 5 + facts.scenarios.length * 20 + facts.phrases.length * 5,
      turns: facts.turns.length, scenarios: facts.scenarios.length, phrases: facts.phrases.length };
  }
  function complete(state, scenario, day, now) {
    const session = state.session;
    if (!Number.isFinite(C.dayNumber(day)) || !session || session.scenarioId !== scenario.id || session.completedAt ||
        session.cursor !== scenario.steps.length || scenario.steps.some(step => !session.results[step.id])) return null;
    const before = daily(state, day).xp;
    session.completedAt = now;
    const facts = state.days[day] ||= { turns: [], scenarios: [], phrases: [] };
    facts.turns = [...new Set([...facts.turns, ...scenario.steps.map(step => step.id)])];
    facts.scenarios = [...new Set([...facts.scenarios, scenario.id])];
    return daily(state, day).xp - before;
  }
  function bookmark(state, id, now) {
    if (state.bookmarks.includes(id)) { state.bookmarks = state.bookmarks.filter(value => value !== id); delete state.review[id]; return false; }
    state.bookmarks.push(id); state.review[id] = { stage: 0, dueAt: now, lastReviewedAt: null }; return true;
  }
  function reviewPhrase(state, id, remembered, day, now) {
    if (!Number.isFinite(C.dayNumber(day)) || !state.bookmarks.includes(id) || typeof remembered !== 'boolean') return null;
    const previous = state.review[id];
    // Early recall is practice; a second click must not accelerate a future review.
    if (!remembered || previous.dueAt <= now) {
      const item = C.schedule(previous, remembered, [], now);
      state.review[id] = { stage: item.stage, dueAt: item.dueAt, lastReviewedAt: now };
    }
    const facts = state.days[day] ||= { turns: [], scenarios: [], phrases: [] };
    const xp = facts.phrases.includes(id) ? 0 : 5;
    facts.phrases = [...new Set([...facts.phrases, id])];
    return xp;
  }
  function stats(state, day, now) {
    return { xp: Object.keys(state.days).reduce((sum, date) => sum + daily(state, date).xp, 0), today: daily(state, day),
      due: state.bookmarks.filter(id => state.review[id].dueAt <= now).sort((a,b) => state.review[a].dueAt - state.review[b].dueAt || a.localeCompare(b)),
      saved: state.bookmarks.length };
  }
  function memory(builder, practice, bank) {
    const counts = {};
    for (const [id, item] of Object.entries(builder.review)) if (bank[id] && item.stage < 3) {
      for (const tag of item.tags) counts[tag] = (counts[tag] || 0) + 1;
    }
    const lessonFor = { base_verb: 'questions', question_word_order: 'questions', auxiliary_verb: 'questions', subject_question: 'questions', tense: 'questions', politeness: 'requests' };
    const rows = [...new Set([...Object.keys(counts), ...Object.keys(practice.errors)])].map(tag => ({ tag, questions: counts[tag] || 0,
      dialogueAttempts: practice.errors[tag]?.count || 0, lessonId: lessonFor[tag] || null }));
    return rows.sort((a,b) => b.questions + b.dialogueAttempts - a.questions - a.dialogueAttempts || a.tag.localeCompare(b.tag));
  }
  return { KEY, fresh, shape, evaluate, restore, newSession, record, complete, bookmark, reviewPhrase, stats, memory };
});
