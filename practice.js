(() => {
  'use strict';
  const C = window.SFCore, P = window.SFPracticeCore, content = window.SFPracticeContent;
  const $ = id => document.getElementById(id);
  const names = { base_verb: '동사원형', question_word_order: '질문 어순', auxiliary_verb: '조동사', subject_question: '주어 의문문', tense: '시제', politeness: '정중한 요청', needs_review: '예시 비교' };
  let state = P.fresh(), snapshot = null, persistent = true;
  let builder = C.freshState(), feedback = false, pendingScenario = null, earned = null;
  let answers = {}, queue = [], phraseIndex = 0, revealed = false;
  let recognition = null, generation = 0, utterance = null;
  let memoryRowsSignature = null;
  function notice(text) { $('practiceStorageNotice').textContent = text; $('practiceStorageNotice').hidden = !text; }
  try {
    snapshot = localStorage.getItem(P.KEY);
    const restored = P.restore(snapshot, content, Date.now()); state = restored.state;
    if (restored.repaired) notice('대화·표현 기록의 유효하지 않은 항목을 복구했습니다. 질문 수업 기록은 유지됩니다.');
  } catch { persistent = false; notice('대화·표현 기록은 현재 화면에서만 유지돼요. 학습 기록을 내보내 보관하세요.'); }
  function conflict() { persistent = false; notice('다른 창에서 대화·표현 기록이 바뀌어 자동 저장을 멈췄어요. 현재 진행을 내보낸 뒤 다른 창을 닫고 새로고침하세요.'); }
  function save() {
    if (persistent) try {
      if (localStorage.getItem(P.KEY) !== snapshot) conflict();
      else { const raw = JSON.stringify(state); localStorage.setItem(P.KEY, raw); snapshot = raw; }
    } catch { persistent = false; notice('대화·표현 기록을 저장할 수 없어요. 학습 기록 내보내기로 현재 진행을 보관하세요.'); }
    refreshStats(); window.dispatchEvent(new Event('sf-practice-change'));
  }
  window.addEventListener('storage', event => {
    if (event.key === null || (event.key === P.KEY && event.newValue !== snapshot)) conflict();
  });
  function button(text, action, className = 'secondary') {
    const node = document.createElement('button'); node.type = 'button'; node.textContent = text; node.className = className;
    node.addEventListener('click', action); return node;
  }
  function paragraph(text, className = '') { const node = document.createElement('p'); node.textContent = text; node.className = className; return node; }
  function openPanel(target) { document.querySelector('.tab[data-target="' + target + '"]').click(); }
  function stopMedia(message) {
    generation++; const old = recognition; recognition = null;
    if (old) { old.onstart = old.onresult = old.onerror = old.onend = null; try { old.abort ? old.abort() : old.stop(); } catch { /* Ended already. */ } }
    if (utterance) { utterance.onend = utterance.onerror = null; utterance = null; if ('speechSynthesis' in window) speechSynthesis.cancel(); }
    if (message) $('rpVoiceNotice').textContent = message;
    $('practiceAudioBar').hidden = true;
    controls();
  }
  document.addEventListener('sf-stop-media', () => stopMedia());
  function listen(text) {
    document.dispatchEvent(new Event('sf-stop-media'));
    $('practiceAudioBar').hidden = false;
    if (!('speechSynthesis' in window)) { $('practiceAudioNotice').textContent = '이 브라우저는 음성 재생을 지원하지 않아요. 문장을 읽으며 계속 연습할 수 있어요.'; return; }
    utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'en-US'; utterance.rate = 0.85;
    const active = utterance;
    utterance.onend = () => { if (utterance === active) { $('practiceAudioNotice').textContent = '재생을 마쳤어요.'; utterance = null; } };
    utterance.onerror = () => { if (utterance === active) { $('practiceAudioNotice').textContent = '음성을 재생하지 못했어요. 텍스트로 계속 연습하세요.'; utterance = null; } };
    $('practiceAudioNotice').textContent = '영어 예시 재생 중…'; speechSynthesis.speak(utterance);
  }
  const currentScenario = () => content.scenarios.find(item => item.id === state.session?.scenarioId);
  const currentStep = () => currentScenario()?.steps[state.session.cursor];
  function setView(name) { for (const id of ['rpHome','rpExercise','rpSummary']) $(id).hidden = id !== name; }
  function start(scenario) {
    stopMedia(); answers = {}; earned = null;
    state.session = P.newSession(scenario.id, crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random());
    feedback = false; save(); renderStep();
  }
  function requestStart(scenario) {
    if (state.session && !state.session.completedAt) { pendingScenario = scenario; $('replaceDialogueDialog').showModal(); }
    else start(scenario);
  }
  $('cancelDialogue').onclick = () => $('replaceDialogueDialog').close();
  $('confirmDialogue').onclick = () => { $('replaceDialogueDialog').close(); if (pendingScenario) start(pendingScenario); pendingScenario = null; };
  function renderStep() {
    stopMedia(); const scenario = currentScenario();
    if (!scenario) { setView('rpHome'); return; }
    if (state.session.cursor >= scenario.steps.length) { renderSummary(); return; }
    setView('rpExercise'); const step = currentStep();
    $('rpScenarioTitle').textContent = scenario.title;
    $('rpPosition').textContent = (state.session.cursor + 1) + ' / ' + scenario.steps.length;
    $('rpProgress').max = scenario.steps.length; $('rpProgress').value = state.session.cursor;
    $('rpGoals').replaceChildren();
    scenario.steps.forEach((item,index) => { const li = document.createElement('li'); li.textContent = (index < state.session.cursor ? '✓ 연습 완료 · ' : index === state.session.cursor ? '지금 연습 · ' : '다음 · ') + item.goal; $('rpGoals').append(li); });
    $('rpConversation').replaceChildren();
    scenario.steps.slice(0,state.session.cursor + 1).forEach((item,index) => {
      const tutor = paragraph(item.tutor,'tutor-bubble'); tutor.lang = 'en'; $('rpConversation').append(tutor);
      if (state.session.results[item.id]) {
        const reply = paragraph(answers[item.id] || '이전 답변 문장은 저장하지 않아 표시하지 않습니다.','learner-bubble');
        if (answers[item.id]) reply.lang = 'en'; $('rpConversation').append(reply);
      }
    });
    $('rpPrompt').textContent = step.goal; $('rpAnswer').value = '';
    $('rpExamples').replaceChildren();
    for (const example of step.examples) {
      const node = button(example, () => { stopMedia('직접 입력으로 전환했어요. 예시를 확인하고 답안 비교를 눌러 주세요.'); $('rpAnswer').value = example; $('rpAnswer').focus(); });
      node.lang = 'en'; $('rpExamples').append(node);
    }
    $('rpVoiceNotice').textContent = '말하기 또는 직접 입력으로 연습해요. 인식된 문장은 확인 후 직접 제출하세요.';
    $('rpAnswerNotice').textContent = ''; $('rpFeedback').hidden = true;
    feedback = false;
    const previous = state.session.results[step.id];
    if (previous) showFeedback({ status: previous.status, message: '첫 제출의 예시 비교 기록을 불러왔어요. ' + step.note });
    controls(); updateBookmark(); $('rpPrompt').focus();
  }
  function controls() {
    const blocked = !currentStep() || state.session.paused || feedback;
    $('rpAnswer').disabled = blocked; $('rpSubmit').disabled = blocked;
    $('rpSpeak').disabled = blocked || Boolean(recognition); $('rpSpeak').setAttribute('aria-pressed', String(Boolean(recognition)));
    $('rpStopMic').disabled = !recognition; $('rpType').disabled = blocked;
    $('rpPause').textContent = state.session?.paused ? '이어서 대화' : '잠시 멈춤';
    $('rpPauseNotice').hidden = !state.session?.paused;
    $('rpNext').disabled = Boolean(state.session?.paused); $('rpRetry').disabled = Boolean(state.session?.paused);
    $('rpSubmit').hidden = feedback; $('rpNext').hidden = !feedback; $('rpRetry').hidden = !feedback;
    $('rpListenTutor').disabled = !currentStep() || Boolean(state.session?.paused);
    for (const node of $('rpExamples').children) node.disabled = blocked;
  }
  function showFeedback(result) {
    feedback = true; const step = currentStep();
    $('rpFeedback').hidden = false;
    $('rpFeedbackTitle').textContent = result.status === 'example' ? '예시 표현과 일치해요' : result.status === 'guided' ? '이 표현을 함께 살펴봐요' : '예시와 비교하며 연습해요';
    $('rpFeedbackMessage').textContent = result.message;
    $('rpFeedbackExample').textContent = step.examples[0];
    $('rpNext').textContent = state.session.cursor === currentScenario().steps.length - 1 ? '대화 결과 보기' : '확인했어요 · 다음 대화';
    controls();
  }
  $('rpForm').addEventListener('submit', event => {
    event.preventDefault(); if (feedback || !currentStep() || state.session.paused) return;
    stopMedia(); const answer = $('rpAnswer').value.trim();
    if (answer.length > 1000) { $('rpAnswerNotice').textContent = '답변은 1,000자 이내로 입력해 주세요.'; return; }
    const result = P.evaluate(currentStep(), answer);
    if (result.empty) { $('rpAnswerNotice').textContent = result.message; return; }
    const id = currentStep().id; answers[id] = answer;
    P.record(state,currentScenario(),result,Date.now()); save(); renderStep(); showFeedback(result);
  });
  $('rpAnswer').addEventListener('input', () => { stopMedia('직접 입력하는 중이에요. 확인 후 답안 비교를 눌러 주세요.'); $('rpAnswerNotice').textContent = ''; });
  $('rpNext').onclick = () => { if (!feedback || state.session.paused) return; stopMedia(); state.session.cursor++; feedback = false; save(); renderStep(); };
  $('rpRetry').onclick = () => { if (state.session.paused) return; stopMedia(); feedback = false; $('rpFeedback').hidden = true; $('rpAnswer').value = ''; controls(); $('rpAnswer').focus(); };
  $('rpPause').onclick = () => { if (!state.session) return; stopMedia(); state.session.paused = !state.session.paused; save(); controls(); };
  function home() { stopMedia(); if (state.session) state.session.paused = true; save(); setView('rpHome'); $('roleplayTitle').focus(); }
  $('rpHomeButton').onclick = home; $('rpSummaryHome').onclick = home;
  $('rpResume').onclick = () => { if (!state.session || state.session.completedAt) return; state.session.paused = false; save(); renderStep(); };
  function renderSummary() {
    setView('rpSummary'); const scenario = currentScenario();
    $('rpSummaryText').textContent = scenario.title + ' · ' + scenario.steps.length + '개 목표를 예시와 비교하며 연습했어요. 공식 점수나 발음 평가가 아닙니다.';
    $('rpFinish').hidden = Boolean(state.session.completedAt);
    $('rpReward').textContent = state.session.completedAt ? (earned === null ? '완료 기록을 불러왔어요.' : '+' + earned + ' XP · 같은 날 같은 대화의 보상은 한 번만 반영돼요.') : '완료를 누르면 대화 연습과 XP를 기록해요.';
    if (!persistent) $('rpReward').textContent += ' 현재 화면에서만 유지되므로 학습 기록을 내보내 주세요.';
    $('rpSummaryTitle').focus();
  }
  $('rpFinish').onclick = () => {
    const reward = P.complete(state,currentScenario(),C.localDay(),Date.now()); if (reward !== null) earned = reward;
    save(); renderSummary();
  };
  $('rpListenTutor').onclick = () => { if (currentStep() && !state.session.paused) listen(currentStep().tutor); };
  $('practiceStopAudio').onclick = () => { stopMedia(); $('practiceAudioNotice').textContent = '재생을 멈췄어요.'; };
  function updateBookmark() {
    const saved = currentStep() && state.bookmarks.includes(currentStep().id);
    $('rpBookmark').textContent = saved ? '저장한 표현 해제' : '예시 표현 저장'; $('rpBookmark').setAttribute('aria-pressed', String(Boolean(saved)));
  }
  function toggleBookmark(id) {
    if (!Object.hasOwn(content.phrases,id)) return;
    const added = P.bookmark(state,id,Date.now()); save(); updateBookmark(); renderCollections();
    if (!added && queue.includes(id)) { queue = []; $('phraseReview').hidden = true; }
    $('phraseActionNotice').textContent = added ? '예시 표현을 저장했어요. 저장한 표현 연습에서 복습할 수 있어요.' : '저장과 복습 일정에서 해제했어요.';
  }
  $('rpBookmark').onclick = () => { if (currentStep()) toggleBookmark(currentStep().id); };
  function renderCollections() {
    $('phraseList').replaceChildren();
    const savedOnly = $('phraseSavedOnly').checked;
    for (const phrase of Object.values(content.phrases)) {
      if (savedOnly && !state.bookmarks.includes(phrase.id)) continue;
      const card = document.createElement('li'); card.className = 'phrase-card';
      const text = paragraph(phrase.examples[0],'phrase-english'); text.lang = 'en';
      const actions = document.createElement('div'); actions.className = 'button-row';
      const saveButton = button(state.bookmarks.includes(phrase.id) ? '저장 해제' : '표현 저장', () => toggleBookmark(phrase.id));
      saveButton.setAttribute('aria-pressed',String(state.bookmarks.includes(phrase.id)));
      actions.append(button('▷ 듣기', () => listen(phrase.examples[0])),saveButton);
      card.append(paragraph(phrase.title,'eyebrow'),text,paragraph(phrase.ko),actions); $('phraseList').append(card);
    }
    $('phraseEmpty').hidden = Boolean($('phraseList').children.length);
  }
  $('phraseSavedOnly').onchange = renderCollections;
  function startPhraseReview() {
    stopMedia(); queue = [...state.bookmarks].sort((a,b) => state.review[a].dueAt - state.review[b].dueAt || a.localeCompare(b)).slice(0,6);
    phraseIndex = 0; revealed = false; renderPhrase();
  }
  function renderPhrase() {
    if (!queue.length) { $('phraseReview').hidden = true; return; }
    $('phraseReview').hidden = false;
    const id = queue[phraseIndex], phrase = content.phrases[id];
    if (!phrase || !state.bookmarks.includes(id)) { phraseIndex++; if (phraseIndex < queue.length) return renderPhrase(); }
    const finished = phraseIndex >= queue.length;
    $('phraseReviewPosition').textContent = finished ? '저장한 표현 연습 완료' : '표현 ' + (phraseIndex + 1) + ' / ' + queue.length;
    $('phraseReviewPrompt').textContent = finished ? '수고했어요. 다음 복습 일정과 XP를 반영했어요.' : phrase.ko;
    $('phraseReveal').hidden = finished || revealed;
    $('phraseRecallButtons').hidden = finished || !revealed;
    $('phraseReviewEnglish').hidden = finished || !revealed;
    $('phraseReviewEnglish').textContent = finished ? '' : phrase.examples[0];
    $('phraseReviewPrompt').focus();
  }
  $('startPhraseReview').onclick = startPhraseReview;
  $('phraseReveal').onclick = () => { revealed = true; renderPhrase(); };
  function gradePhrase(remembered) {
    if (!revealed || phraseIndex >= queue.length) return;
    stopMedia(); const xp = P.reviewPhrase(state,queue[phraseIndex],remembered,C.localDay(),Date.now());
    $('phraseReviewNotice').textContent = (xp ? '+' + xp + ' XP · ' : '') + (remembered ? '복습 일정에 반영했어요. 기한 전 연습은 단계를 올리지 않아요.' : '10분 뒤에 다시 만나도록 예약했어요.');
    phraseIndex++; revealed = false; save(); renderPhrase();
  }
  $('phraseRemembered').onclick = () => gradePhrase(true); $('phraseAgain').onclick = () => gradePhrase(false);
  $('closePhraseReview').onclick = () => { stopMedia(); queue = []; $('phraseReview').hidden = true; };
  function refreshStats() {
    const stats = P.stats(state,C.localDay(),Date.now());
    $('phraseSavedCount').textContent = stats.saved; $('phraseDueCount').textContent = stats.due.length;
    $('startPhraseReview').disabled = !stats.saved;
    $('rpResume').hidden = !state.session || Boolean(state.session.completedAt);
    $('memoryPracticeXP').textContent = stats.xp + ' XP';
    $('memoryPracticeToday').textContent = stats.today.turns + '개 대화 목표 · ' + stats.today.phrases + '개 표현';
    const completed = new Set(Object.values(state.days).flatMap(day => day.scenarios));
    [...$('scenarioCards').children].forEach((card,index) => { card.querySelector('small').textContent = completed.has(content.scenarios[index].id) ? '연습 완료 · 다시 연습하기' : '4개 목표 · 대화 시작하기'; });
    renderMemory();
  }
  function renderMemory() {
    const rows = P.memory(builder,state,window.SFLessons.bank);
    const signature = JSON.stringify(rows);
    if (signature !== memoryRowsSignature) {
      memoryRowsSignature = signature; $('memoryPatterns').replaceChildren();
      for (const row of rows) {
      const item = document.createElement('li'); item.append(paragraph((names[row.tag] || row.tag) + ' · 질문 복습 ' + row.questions + '개 / 대화 규칙 힌트 누적 ' + row.dialogueAttempts + '회'));
      if (row.lessonId) item.append(button('관련 수업 연습', () => window.dispatchEvent(new CustomEvent('sf-open-lesson',{detail:row.lessonId}))));
      $('memoryPatterns').append(item);
      }
    }
    $('memoryEmpty').hidden = Boolean(rows.length);
    const due = C.dueItems(builder.review,window.SFLessons.bank,Date.now(),Infinity);
    const phrases = P.stats(state,C.localDay(),Date.now()).due;
    $('memoryDue').textContent = due.length + '개 질문 · ' + phrases.length + '개 저장 표현';
    $('memoryReviewQuestions').disabled = !due.length;
    $('memoryReviewPhrases').disabled = !state.bookmarks.length;
    $('memoryRecommendation').textContent = phrases.length ? '지금 복습할 저장 표현부터 다시 말해 보세요.' : due.length ? '기한이 된 질문 복습을 먼저 마무리해 보세요.' : rows.length ? '아래 기록에서 자주 비교한 표현의 관련 수업을 연습해 보세요.' : '상황 대화를 하나 시작해 보세요. 연습 후 여기에서 다음 단계를 추천해요.';
  }
  $('memoryReviewQuestions').onclick = () => window.dispatchEvent(new Event('sf-open-review'));
  $('memoryReviewPhrases').onclick = () => { openPanel('phrases'); startPhraseReview(); };
  $('memoryStartDialogue').onclick = () => openPanel('roleplay');
  $('practiceExport').onclick = () => window.dispatchEvent(new Event('sf-export-progress'));
  $('practiceImport').onclick = () => window.dispatchEvent(new Event('sf-import-progress'));
  window.addEventListener('sf-builder-state', event => { builder = event.detail; renderMemory(); });
  document.querySelectorAll('.practice-open').forEach(node => node.addEventListener('click', () => openPanel(node.dataset.panel)));
  for (const scenario of content.scenarios) {
    const card = button('', () => requestStart(scenario),'lesson-card');
    const title = document.createElement('strong'); title.textContent = scenario.title;
    const subtitle = document.createElement('span'); subtitle.textContent = scenario.subtitle;
    const meta = document.createElement('small'); card.append(title,subtitle,meta); $('scenarioCards').append(card);
  }
  $('rpSpeak').onclick = () => {
    if (!currentStep() || state.session.paused || feedback || $('roleplay').classList.contains('hidden')) return;
    document.dispatchEvent(new Event('sf-stop-media'));
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!R) { $('rpVoiceNotice').textContent = '이 브라우저는 음성 인식을 지원하지 않아요. 직접 입력으로 계속하세요.'; return; }
    const token = generation, sessionId = state.session.id, cursor = state.session.cursor;
    const prefix = $('rpAnswer').value.trim(); let final = '', heard = false;
    const active = () => recognition && generation === token && state.session?.id === sessionId && state.session.cursor === cursor && !state.session.paused && !feedback && !document.hidden && !$('roleplay').classList.contains('hidden');
    try {
      recognition = new R(); recognition.lang = 'en-US'; recognition.continuous = false; recognition.interimResults = true;
      recognition.onstart = () => { if (active()) $('rpVoiceNotice').textContent = '듣고 있어요… 영어로 답변하세요. 인식 문장은 자동 제출하지 않아요.'; };
      recognition.onresult = event => {
        if (!active()) return; let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]; if (result.isFinal) final += result[0].transcript + ' '; else interim += result[0].transcript;
        }
        heard = Boolean((final+interim).trim()); $('rpAnswer').value = [prefix,(final+interim).trim()].filter(Boolean).join(' ').slice(0,1000);
      };
      recognition.onerror = event => {
        if (!active()) return;
        const messages = { 'not-allowed':'마이크 권한이 거부됐어요. 사이트 설정을 확인하거나 직접 입력하세요.', network:'음성 인식에 연결하지 못했어요. 직접 입력으로 계속하세요.', 'no-speech':'음성이 들리지 않았어요. 다시 말하거나 직접 입력하세요.' };
        stopMedia(messages[event.error] || '음성 인식을 사용할 수 없어요. 직접 입력으로 계속하세요.');
      };
      recognition.onend = () => { if (active()) stopMedia(heard ? '인식된 문장을 확인·수정한 뒤 답안 비교를 눌러 주세요.' : '인식된 말이 없어요. 다시 말하거나 직접 입력하세요.'); };
      controls(); $('rpVoiceNotice').textContent = '마이크 연결 중… 권한 요청이 나타나면 선택해 주세요.'; recognition.start();
    } catch { stopMedia('음성 인식을 시작할 수 없어요. 직접 입력으로 계속하세요.'); }
  };
  $('rpStopMic').onclick = () => stopMedia('마이크를 멈췄어요. 인식 문장을 확인하고 답안 비교를 눌러 주세요.');
  $('rpType').onclick = () => { stopMedia('조용히 직접 입력으로 연습해요.'); $('rpAnswer').focus(); };
  document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
    stopMedia(); if (tab.dataset.target !== 'roleplay' && state.session && !state.session.completedAt) { state.session.paused = true; controls(); save(); }
    if (tab.dataset.target === 'phrases') renderCollections(); if (tab.dataset.target === 'memory') renderMemory();
  }));
  document.addEventListener('visibilitychange', () => { if (document.hidden) { stopMedia(); if (state.session && !state.session.completedAt) state.session.paused = true; controls(); save(); } });
  window.addEventListener('pagehide', () => { stopMedia(); save(); });
  setInterval(() => { refreshStats(); window.dispatchEvent(new Event('sf-practice-change')); },30000);
  window.SFPractice = {
    stats: () => P.stats(state,C.localDay(),Date.now()), persistent: () => persistent,
    exportState: () => JSON.parse(JSON.stringify(state)),
    importState: value => { stopMedia(); const restored = P.restore(JSON.stringify(value),content,Date.now()); state = restored.state; answers = {}; queue = []; earned = null; save(); setView('rpHome'); $('phraseReview').hidden = true; renderCollections(); return restored.repaired; },
    stopMedia, flush: save
  };
  setView('rpHome'); renderCollections(); refreshStats(); controls();
})();
