(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SFCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const KEY = 'speakForward.questionBuilder.v1';
  const MINUTE = 60000;
  function normalize(text) {
    return String(text).normalize('NFKC').replace(/[‘’]/g, "'").toLowerCase()
      .trim().replace(/[.!?]+$/g, '').trim().replace(/\s+/g, ' ');
  }
  function evaluate(exercise, answer) {
    const value = normalize(answer);
    if (!value) return { empty: true, correct: false, tags: [], message: '먼저 질문을 입력해 주세요.' };
    if (exercise.answers.some(item => normalize(item) === value)) {
      return { empty: false, correct: true, tags: [], message: exercise.explanation };
    }
    const known = (exercise.errors || []).find(item => normalize(item.answer) === value);
    return { empty: false, correct: false, tags: known ? known.tags : ['needs_review'],
      message: known ? known.message : '이 연습에 등록된 답안과 다릅니다. 다른 자연스러운 표현일 수도 있어요. 예시와 비교해 보세요.' };
  }
  function localDay(date = new Date()) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  }
  function dayNumber(day) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '')) return NaN;
    const [y, m, d] = day.split('-').map(Number);
    const value = new Date(Date.UTC(y, m - 1, d));
    return value.toISOString().slice(0, 10) === day ? value.getTime() / 86400000 : NaN;
  }
  function freshState() {
    return { version: 1, review: {}, completions: [], session: null };
  }
  function schedule(previous, correct, tags, now) {
    const stage = correct ? Math.min(3, (previous?.stage || 0) + 1) : 0;
    const delay = correct ? [0, 1, 3, 7][stage] * 86400000 : 10 * MINUTE;
    return { stage, dueAt: now + delay, lastReviewedAt: now,
      tags: [...new Set([...(previous?.tags || []), ...tags])] };
  }
  function dueItems(review, bank, now, limit = 6) {
    return Object.keys(review).filter(id => bank[id] && review[id].dueAt <= now)
      .sort((a, b) => review[a].dueAt - review[b].dueAt || a.localeCompare(b)).slice(0, limit);
  }
  function streak(completions) {
    const days = [...new Set(completions.map(item => item.day))].sort();
    let count = 0;
    for (let i = 0; i < days.length; i++) {
      count = i && dayNumber(days[i]) - dayNumber(days[i - 1]) === 1 ? count + 1 : 1;
    }
    return count;
  }
  function complete(state, day, timezone, now) {
    const session = state.session;
    if (!Number.isFinite(dayNumber(day)) || !session || !session.ids.length || session.ids.some(id => !session.results[id])) return false;
    if (session.completedAt) return false;
    session.completedAt = now;
    if (!state.completions.some(item => item.day === day)) {
      state.completions.push({ day, timezone, sessionId: session.id });
    }
    return true;
  }
  function newSession(ids, mode, now, id) {
    return { id, mode, ids: [...new Set(ids)], cursor: 0, results: {}, elapsedMs: 0,
      createdAt: now, completedAt: null, paused: false };
  }
  function record(state, exercise, evaluation, now) {
    const session = state.session;
    if (!session || session.completedAt || evaluation.empty || session.ids[session.cursor] !== exercise.id) return false;
    if (session.results[exercise.id]) return false; // Same-session retries teach without advancing the schedule.
    session.results[exercise.id] = { correct: evaluation.correct, tags: evaluation.tags, at: now };
    state.review[exercise.id] = schedule(state.review[exercise.id], evaluation.correct, evaluation.tags, now);
    return true;
  }
  function restore(raw, bank, now) {
    if (!raw) return { state: freshState(), repaired: false };
    let value;
    try { value = JSON.parse(raw); } catch { return { state: freshState(), repaired: true }; }
    if (!value || value.version !== 1 || !value.review || typeof value.review !== 'object') {
      return { state: freshState(), repaired: true };
    }
    const state = freshState();
    let repaired = false;
    for (const [id, item] of Object.entries(value.review)) {
      if (!Object.hasOwn(bank, id) || !item || typeof item !== 'object') { repaired = true; continue; }
      const validDue = Number.isFinite(item.dueAt) && item.dueAt >= 0;
      if (!validDue) repaired = true;
      state.review[id] = { stage: Number.isInteger(item.stage) && item.stage >= 0 && item.stage <= 3 ? item.stage : 0,
        dueAt: validDue ? item.dueAt : now, lastReviewedAt: Number.isFinite(item.lastReviewedAt) ? item.lastReviewedAt : now,
        tags: Array.isArray(item.tags) ? item.tags.filter(t => typeof t === 'string').slice(0, 10) : [] };
    }
    state.completions = Array.isArray(value.completions) ? value.completions.filter(item =>
      item && Number.isFinite(dayNumber(item.day)) && typeof item.sessionId === 'string').map(item => ({
        day: item.day, sessionId: item.sessionId, timezone: typeof item.timezone === 'string' ? item.timezone : 'unknown'
      })) : [];
    const session = value.session;
    if (session && Array.isArray(session.ids) && session.ids.length > 0 && session.ids.length <= 6 &&
        session.ids.every(id => Object.hasOwn(bank, id)) && new Set(session.ids).size === session.ids.length &&
        Number.isInteger(session.cursor) && session.cursor >= 0 && session.cursor <= session.ids.length &&
        typeof session.id === 'string' && ['lesson', 'review'].includes(session.mode)) {
      state.session = newSession(session.ids, session.mode, Number.isFinite(session.createdAt) ? session.createdAt : now, session.id);
      Object.assign(state.session, { cursor: session.cursor, elapsedMs: Number.isFinite(session.elapsedMs) ? Math.max(0, session.elapsedMs) : 0,
        completedAt: Number.isFinite(session.completedAt) && session.completedAt > 0 ? session.completedAt : null,
        paused: true });
      for (const id of session.ids) {
        const result = session.results?.[id];
        if (result && typeof result.correct === 'boolean' && Number.isFinite(result.at)) {
          state.session.results[id] = { correct: result.correct, at: result.at,
            tags: Array.isArray(result.tags) ? result.tags.filter(t => typeof t === 'string').slice(0, 10) : [] };
        }
      }
      // Never resume beyond unanswered items in malformed local data.
      const missing = session.ids.findIndex(id => !state.session.results[id]);
      if (missing >= 0 && missing < state.session.cursor) { state.session.cursor = missing; repaired = true; }
      if (state.session.completedAt && missing >= 0) { state.session.completedAt = null; repaired = true; }
    } else if (session) repaired = true;
    return { state, repaired };
  }
  // Next progress is independent of the v1 review schedule. XP is derived from
  // unique daily facts rather than a mutable counter, including after import.
  const NEXT_KEY = 'speakForward.next.v1';
  function nextFresh() { return { version: 1, days: {} }; }
  function nextRestore(raw, bank, lessons) {
    if (!raw) return { state: nextFresh(), repaired: false };
    try {
      const value = JSON.parse(raw);
      if (value?.version !== 1 || !value.days || typeof value.days !== 'object' || Array.isArray(value.days)) throw new Error();
      const state = nextFresh();
      const lessonIds = new Set(lessons.map(item => item.id));
      for (const [day, item] of Object.entries(value.days)) {
        if (!Number.isFinite(dayNumber(day)) || !item || typeof item !== 'object') continue;
        const pick = (key, valid) => [...new Set(Array.isArray(item[key]) ? item[key].filter(id => typeof id === 'string' && valid(id)) : [])];
        const answers = pick('answers', id => Object.hasOwn(bank, id));
        state.days[day] = { answers, reviews: pick('reviews', id => answers.includes(id)),
          lessons: pick('lessons', id => lessonIds.has(id) && lessons.find(l => l.id === id).ids.every(q => answers.includes(q))) };
      }
      return { state, repaired: JSON.stringify(state) !== JSON.stringify(value) };
    } catch { return { state: nextFresh(), repaired: true }; }
  }
  function dailyProgress(next, day) {
    const item = next.days[day] || { answers: [], reviews: [], lessons: [] };
    const quests = [
      { title: '질문 6개 마무리', value: item.answers.length, goal: 6 },
      { title: '수업 또는 복습 완료', value: item.lessons.length + Number(item.reviews.length > 0), goal: 1 },
      { title: '기한이 된 질문 3개 복습', value: item.reviews.length, goal: 3 }
    ];
    const xp = item.answers.length * 5 + item.lessons.length * 20 + (item.reviews.length ? 10 : 0) + quests.filter(q => q.value >= q.goal).length * 10;
    return { quests, xp };
  }
  function nextAward(next, session, day, bank, lessons) {
    if (!Number.isFinite(dayNumber(day)) || !session?.completedAt || !session.ids?.length ||
        session.ids.some(id => !Object.hasOwn(bank, id) || !session.results?.[id])) return 0;
    const lesson = lessons.find(item => item.ids.length === session.ids.length && item.ids.every(id => session.ids.includes(id)));
    if (session.mode !== 'review' && !(session.mode === 'lesson' && lesson)) return 0;
    const before = dailyProgress(next, day).xp;
    const item = next.days[day] ||= { answers: [], reviews: [], lessons: [] };
    item.answers = [...new Set([...item.answers, ...session.ids])];
    if (session.mode === 'review') item.reviews = [...new Set([...item.reviews, ...session.ids])];
    else item.lessons = [...new Set([...item.lessons, lesson.id])];
    return dailyProgress(next, day).xp - before;
  }
  function nextOverview(next, day, lessons) {
    const xp = Object.keys(next.days).reduce((sum, key) => sum + dailyProgress(next, key).xp, 0);
    const completed = new Set(Object.values(next.days).flatMap(item => item.lessons));
    return { xp, level: Math.floor(xp / 100) + 1, levelXP: xp % 100,
      today: dailyProgress(next, day), path: lessons.map(lesson => ({ id: lesson.id, complete: completed.has(lesson.id) })),
      recommended: lessons.find(lesson => !completed.has(lesson.id))?.id || lessons[0]?.id };
  }
  return { KEY, normalize, evaluate, localDay, dayNumber, freshState, schedule, dueItems, streak,
    complete, newSession, record, restore,
    Next: { KEY: NEXT_KEY, fresh: nextFresh, restore: nextRestore, award: nextAward, overview: nextOverview } };
});
