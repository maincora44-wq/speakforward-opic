(() => {
  'use strict';
  const C = window.SFCore;
  const { bank, lessons } = window.SFLessons;
  const $ = id => document.getElementById(id);
  const tagNames = { question_word_order: '질문 어순', auxiliary_verb: '조동사', base_verb: '동사원형',
    subject_question: '주어 의문문', tense: '시제', politeness: '정중한 요청', needs_review: '예시 비교' };
  let memory = null;
  let persistent = true;
  let state;
  let feedback = false;
  let selected = [];
  let tick = performance.now();
  let lastSaved = tick;
  let currentModule = 'builder';
  let recognition = null;
  let voiceGeneration = 0;
  function notice(text) { $('storageNotice').textContent = text; $('storageNotice').hidden = !text; }
  try {
    const raw = localStorage.getItem(C.KEY);
    const restored = C.restore(raw, bank, Date.now());
    state = restored.state;
    if (restored.repaired) notice('일부 학습 기록을 복구했습니다. 유효하지 않은 복습 일정은 지금으로 조정했습니다.');
    localStorage.setItem(C.KEY, JSON.stringify(state));
  } catch {
    state = state || C.freshState(); persistent = false;
    notice('이 브라우저에 저장할 수 없습니다. 현재 화면에서 학습할 수 있지만 닫으면 새 기록이 사라집니다.');
  }
  function save() {
    memory = JSON.stringify(state);
    if (persistent) try { localStorage.setItem(C.KEY, memory); }
    catch { persistent = false; notice('저장 공간을 사용할 수 없어 세션 전용 모드로 전환했습니다. 기록 내보내기로 보관해 주세요.'); }
  }
  function button(text, action, className = 'secondary') {
    const node = document.createElement('button'); node.type = 'button';
    node.className = className; node.textContent = text; node.addEventListener('click', action); return node;
  }
  function refreshHome() {
    const due = C.dueItems(state.review, bank, Date.now(), Infinity);
    $('reviewCount').textContent = due.length;
    $('startReview').disabled = !due.length;
    $('reviewHint').textContent = due.length ? '기한이 된 문항부터 최대 6개를 연습해요.' : '아직 복습할 문항이 없어요. 수업을 시작해 보세요.';
    const last = [...state.completions].sort((a, b) => a.day.localeCompare(b.day)).at(-1)?.day;
    const gap = C.dayNumber(C.localDay()) - C.dayNumber(last);
    $('qbStreak').textContent = (gap >= 0 && gap <= 1 ? C.streak(state.completions) : 0) + '일';
    $('completedDays').textContent = new Set(state.completions.map(x => x.day)).size;
    $('reviewList').replaceChildren();
    const upcoming = Object.keys(state.review).filter(id => bank[id])
      .sort((a, b) => state.review[a].dueAt - state.review[b].dueAt).slice(0, 6);
    for (const id of upcoming) {
      const item = document.createElement('li');
      const dueAt = state.review[id].dueAt;
      item.textContent = bank[id].skill + ' · ' + (dueAt <= Date.now() ? '지금 복습' :
        new Date(dueAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
      $('reviewList').append(item);
    }
    $('resumeBox').hidden = !state.session || Boolean(state.session.completedAt);
    if (state.session && !state.session.completedAt) $('resumeText').textContent =
      Math.min(state.session.cursor + 1, state.session.ids.length) + ' / ' + state.session.ids.length + '번 문항 · 답안 문장은 저장하지 않습니다.';
  }
  function setView(name) {
    for (const id of ['qbHome', 'qbExercise', 'qbSummary']) $(id).hidden = id !== name;
  }
  function accountTime() {
    const now = performance.now();
    if (state.session && !state.session.paused && !state.session.completedAt &&
        state.session.cursor < state.session.ids.length && currentModule === 'builder' && !document.hidden && !$('qbExercise').hidden) {
      state.session.elapsedMs += Math.max(0, now - tick);
    }
    tick = now;
  }
  function renderTime() {
    const elapsed = Math.floor((state.session?.elapsedMs || 0) / 1000);
    $('qbTime').textContent = String(Math.floor(elapsed / 60)).padStart(2, '0') + ':' + String(elapsed % 60).padStart(2, '0');
    $('timeGoal').textContent = elapsed >= 300 ? '5분 목표를 달성했어요. 남은 문항을 편하게 마무리하세요.' : '목표 5분 · 시간 제한은 없어요';
  }
  function start(ids, mode) {
    if (!ids.length) return;
    stopRecognition(); stopSpeech();
    state.session = C.newSession(ids, mode, Date.now(), crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random());
    tick = performance.now(); save(); renderExercise();
  }
  function renderTokens(exercise) {
    selected = []; $('tokenBank').replaceChildren(); $('chosenTokens').replaceChildren();
    $('orderHelp').hidden = exercise.kind !== 'order';
    if (exercise.kind !== 'order') return;
    const tokens = exercise.answers[0].replace(/\?$/, '').split(' ').map((text, i) => ({ text, id: i }));
    // Scrambling is a presentation aid only; accepted-answer evaluation stays deterministic.
    for (let i = tokens.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [tokens[i], tokens[j]] = [tokens[j], tokens[i]]; }
    for (const token of tokens) {
      const node = button(token.text, () => { selected.push(token); updateChosen(); }, 'token');
      node.dataset.tokenId = token.id; $('tokenBank').append(node);
    }
  }
  function updateChosen() {
    stopRecognition();
    $('qbAnswer').value = selected.map(token => token.text).join(' ');
    $('chosenTokens').replaceChildren();
    selected.forEach((token, index) => $('chosenTokens').append(button(token.text + ' ×', () => {
      selected.splice(index, 1); updateChosen();
    }, 'token chosen')));
    for (const node of $('tokenBank').children) node.disabled = selected.some(token => token.id === Number(node.dataset.tokenId));
  }
  function clearAnswer() {
    selected = []; updateChosen(); $('qbAnswer').focus();
  }
  function renderExercise() {
    stopRecognition(); stopSpeech();
    if (!state.session) { setView('qbHome'); return; }
    if (state.session.cursor >= state.session.ids.length) { renderSummary(); return; }
    setView('qbExercise');
    const session = state.session;
    const exercise = bank[session.ids[session.cursor]];
    $('qbPosition').textContent = (session.mode === 'review' ? '복습' : '수업') + ' ' + (session.cursor + 1) + ' / ' + session.ids.length;
    $('qbProgress').value = session.cursor;
    $('qbProgress').max = session.ids.length;
    $('qbSkill').textContent = exercise.skill;
    $('qbPrompt').textContent = exercise.prompt;
    $('qbAnswer').value = '';
    $('answerNotice').textContent = ''; $('audioNotice').textContent = '';
    $('voiceNotice').textContent = '말하기는 선택 사항이에요. 직접 입력이나 단어 선택으로도 수업을 마칠 수 있어요.';
    renderTokens(exercise);
    feedback = false;
    $('qbFeedback').hidden = true; $('nextQuestion').hidden = true; $('retryQuestion').hidden = true;
    $('checkQuestion').hidden = false;
    if (session.results[exercise.id]) showFeedback(exercise, { correct: session.results[exercise.id].correct,
      tags: session.results[exercise.id].tags, message: '이 문항은 이미 제출했습니다. 복습 일정이 중복 변경되지는 않아요. ' + exercise.explanation });
    renderPause(); renderTime();
    $('qbPrompt').focus();
  }
  function renderPause() {
    const paused = Boolean(state.session?.paused);
    $('pauseQuestion').textContent = paused ? '이어서 학습' : '잠시 멈춤';
    $('pauseNotice').hidden = !paused;
    $('qbAnswer').disabled = paused || feedback;
    $('checkQuestion').disabled = paused;
    $('qbListen').disabled = paused;
    $('clearQuestion').disabled = paused || feedback;
    $('nextQuestion').disabled = paused;
    $('retryQuestion').disabled = paused;
    for (const node of $('tokenBank').children) node.disabled = paused || feedback || selected.some(token => token.id === Number(node.dataset.tokenId));
    for (const node of $('chosenTokens').children) node.disabled = paused || feedback;
    renderVoiceControls();
  }
  function showFeedback(exercise, result) {
    feedback = true;
    $('qbFeedback').hidden = false;
    $('qbFeedback').className = 'feedback ' + (result.correct ? 'success' : 'compare');
    $('feedbackTitle').textContent = result.correct ? '잘했어요. 다음 질문으로!' : '예시와 비교하며 한 번 더';
    $('feedbackMessage').textContent = result.message;
    $('feedbackAnswer').textContent = exercise.answers[0];
    $('feedbackTags').textContent = result.tags.map(tag => tagNames[tag] || tag).join(' · ');
    $('checkQuestion').hidden = true; $('nextQuestion').hidden = false;
    $('retryQuestion').hidden = result.correct;
    $('nextQuestion').textContent = state.session.cursor === state.session.ids.length - 1 ? '학습 결과 보기' : '다음 질문';
    renderPause();
  }
  $('qbForm').addEventListener('submit', event => {
    event.preventDefault();
    if (feedback || !state.session || state.session.paused) return;
    stopRecognition();
    const exercise = bank[state.session.ids[state.session.cursor]];
    const result = C.evaluate(exercise, $('qbAnswer').value);
    if (result.empty) { $('answerNotice').textContent = result.message; $('qbAnswer').focus(); return; }
    $('answerNotice').textContent = '';
    C.record(state, exercise, result, Date.now()); save(); showFeedback(exercise, result);
  });
  $('qbAnswer').addEventListener('input', () => {
    stopRecognition('직접 입력으로 전환했어요. 문장을 확인한 뒤 답안 확인을 눌러 주세요.');
    answerChanged();
  });
  function answerChanged() {
    selected = []; $('chosenTokens').replaceChildren();
    for (const node of $('tokenBank').children) node.disabled = false;
    $('answerNotice').textContent = '';
  }
  $('nextQuestion').onclick = () => {
    if (!feedback || state.session.paused) return;
    accountTime(); state.session.cursor++; save(); renderExercise();
  };
  $('retryQuestion').onclick = () => {
    if (state.session.paused) return;
    feedback = false; $('qbFeedback').hidden = true; $('nextQuestion').hidden = true;
    $('retryQuestion').hidden = true; $('checkQuestion').hidden = false;
    clearAnswer(); renderPause(); $('qbAnswer').focus();
  };
  $('clearQuestion').onclick = clearAnswer;
  $('pauseQuestion').onclick = () => {
    stopRecognition(); stopSpeech();
    accountTime(); state.session.paused = !state.session.paused; save(); renderPause();
  };
  function home() {
    accountTime();
    if (state.session) state.session.paused = true;
    save(); stopRecognition(); stopSpeech(); setView('qbHome'); refreshHome(); $('builderTitle').focus();
  }
  $('backToLessons').onclick = home;
  $('summaryHome').onclick = home;
  $('resumeLesson').onclick = () => { state.session.paused = false; tick = performance.now(); save(); renderExercise(); };
  $('startReview').onclick = () => {
    const ids = C.dueItems(state.review, bank, Date.now());
    if (state.session && !state.session.completedAt) {
      $('replaceLessonDialog').showModal(); $('confirmNewLesson').onclick = () => {
        $('replaceLessonDialog').close(); start(ids, 'review');
      };
    } else start(ids, 'review');
  };
  function renderSummary() {
    setView('qbSummary');
    const results = Object.values(state.session.results);
    $('summaryScore').textContent = results.filter(item => item.correct).length + ' / ' + state.session.ids.length;
    $('summaryText').textContent = '첫 시도 기준 정답 수예요. 틀린 문항은 10분 뒤, 맞힌 문항은 단계에 따라 1·3·7일 뒤 복습합니다.';
    $('finishLesson').hidden = Boolean(state.session.completedAt);
    $('completionNotice').textContent = state.session.completedAt ? '학습 완료가 저장되었습니다. 오늘도 한 걸음 앞으로!' : '완료를 눌러 오늘의 학습일을 기록하세요.';
    if (!persistent && state.session.completedAt) $('completionNotice').textContent = '학습을 완료했어요. 세션 전용 모드이므로 기록 내보내기로 보관해 주세요.';
    $('summaryTitle').focus();
  }
  $('finishLesson').onclick = () => {
    let timezone = 'unknown'; try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { /* Optional metadata. */ }
    C.complete(state, C.localDay(), timezone, Date.now()); save(); renderSummary(); refreshHome();
  };
  for (const lesson of lessons) {
    const card = button('', () => {
      if (state.session && !state.session.completedAt) {
        $('replaceLessonDialog').showModal(); $('confirmNewLesson').onclick = () => {
          $('replaceLessonDialog').close(); start(lesson.ids, 'lesson');
        };
      } else start(lesson.ids, 'lesson');
    }, 'lesson-card');
    const number = document.createElement('span'); number.className = 'lesson-number'; number.textContent = lesson.icon;
    const title = document.createElement('strong'); title.textContent = lesson.title;
    const subtitle = document.createElement('span'); subtitle.textContent = lesson.subtitle;
    const meta = document.createElement('small'); meta.textContent = '6문항 · 약 5분  →';
    card.append(number, title, subtitle, meta); $('lessonCards').append(card);
  }
  $('cancelNewLesson').onclick = () => $('replaceLessonDialog').close();
  $('exportProgress').onclick = () => {
    accountTime(); save();
    const url = URL.createObjectURL(new Blob([memory || JSON.stringify(state)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'speakforward-progress-' + C.localDay() + '.json';
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  $('importProgress').onchange = async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
      if (file.size > 1000000) throw new Error('기록 파일은 1MB 이하여야 합니다.');
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (parsed.version !== 1 || !parsed.review || !Array.isArray(parsed.completions)) throw new Error('SpeakForward 기록 파일인지 확인해 주세요.');
      const restored = C.restore(text, bank, Date.now());
      if (!window.confirm('선택한 기록으로 Question Builder 기록을 교체할까요? 먼저 내보내기로 현재 기록을 보관할 수 있습니다.')) return;
      stopRecognition(); stopSpeech();
      state = restored.state; save(); setView('qbHome'); refreshHome();
      notice(restored.repaired ? '기록을 가져왔고 일부 유효하지 않은 항목을 복구했습니다.' : 'Question Builder 기록을 가져왔습니다.');
    } catch (error) { notice('가져오기 실패: ' + error.message); }
    event.target.value = '';
  };
  let utterance = null;
  function stopSpeech() { if ('speechSynthesis' in window) speechSynthesis.cancel(); utterance = null; }
  function renderVoiceControls() {
    const blocked = !state.session || state.session.paused || feedback;
    $('qbSpeak').disabled = blocked || Boolean(recognition);
    $('qbSpeak').setAttribute('aria-pressed', String(Boolean(recognition)));
    $('qbStopMic').disabled = !recognition;
    $('qbTypeAnswer').disabled = blocked;
  }
  function stopRecognition(message) {
    const active = recognition;
    recognition = null; voiceGeneration++;
    if (active) {
      active.onstart = active.onresult = active.onerror = active.onend = null;
      try { if (active.abort) active.abort(); else active.stop(); } catch { /* Already ended. */ }
      $('voiceNotice').textContent = message || '마이크를 멈췄어요. 인식된 문장을 확인하거나 직접 입력하세요.';
    }
    renderVoiceControls();
  }
  $('qbSpeak').onclick = () => {
    if (!state.session || state.session.paused || feedback || currentModule !== 'builder') return;
    stopSpeech(); stopRecognition();
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!R) {
      $('voiceNotice').textContent = '이 브라우저는 음성 인식을 지원하지 않습니다. 직접 입력이나 단어 선택으로 계속하세요.';
      $('qbAnswer').focus(); return;
    }
    const generation = voiceGeneration;
    const sessionId = state.session.id;
    const cursor = state.session.cursor;
    let heard = false;
    let finalText = '';
    const prefix = $('qbAnswer').value.trim();
    const current = () => generation === voiceGeneration && recognition && state.session?.id === sessionId &&
      state.session.cursor === cursor && !state.session.paused && !feedback && currentModule === 'builder' && !document.hidden;
    try {
      recognition = new R();
      recognition.lang = 'en-US'; recognition.continuous = false; recognition.interimResults = true;
      recognition.onstart = () => {
        if (current()) $('voiceNotice').textContent = '듣고 있어요… 영어로 질문을 말해 주세요. 마이크 멈춤으로 언제든 끝낼 수 있어요.';
      };
      recognition.onresult = event => {
        if (!current()) return;
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) finalText += result[0].transcript + ' ';
          else interim += result[0].transcript;
        }
        heard = Boolean((finalText + interim).trim());
        $('qbAnswer').value = [prefix, (finalText + interim).trim()].filter(Boolean).join(' ');
        answerChanged();
        $('voiceNotice').textContent = '듣고 있어요… 인식된 문장은 아래에 표시됩니다. 자동으로 제출하지 않아요.';
      };
      recognition.onerror = event => {
        if (!current()) return;
        const messages = {
          'not-allowed': '마이크 권한이 허용되지 않았어요. Chrome의 사이트 설정에서 허용하거나 직접 입력하세요.',
          'service-not-allowed': '브라우저에서 음성 인식 서비스를 사용할 수 없어요. 직접 입력으로 계속하세요.',
          'audio-capture': '사용할 수 있는 마이크가 없어요. 마이크 연결을 확인하거나 직접 입력하세요.',
          'no-speech': '음성이 들리지 않았어요. 다시 말하거나 직접 입력하세요.',
          network: '음성 인식에 연결하지 못했어요. 인터넷 연결을 확인하거나 직접 입력하세요.'
        };
        stopRecognition(messages[event.error] || '음성 인식을 마쳤어요. 인식된 문장을 확인하거나 직접 입력하세요.');
      };
      recognition.onend = () => {
        if (!current()) return;
        stopRecognition(heard ? '인식된 문장을 확인·수정한 뒤 답안 확인을 눌러 주세요.' : '인식된 말이 없어요. 다시 말하거나 직접 입력하세요.');
      };
      renderVoiceControls();
      $('voiceNotice').textContent = '마이크 연결 중… 권한 요청이 나타나면 선택해 주세요. 영어로 질문을 말해 보세요.';
      recognition.start();
    } catch {
      stopRecognition();
      $('voiceNotice').textContent = '음성 인식을 시작할 수 없어요. 직접 입력으로 계속하세요.';
    }
  };
  $('qbStopMic').onclick = () => stopRecognition();
  $('qbTypeAnswer').onclick = () => {
    stopRecognition(); stopSpeech();
    $('voiceNotice').textContent = '조용히 직접 입력하는 중이에요. 마이크 없이 수업을 마칠 수 있어요.';
    $('qbAnswer').focus();
  };
  $('qbListen').onclick = () => {
    stopRecognition();
    if (!('speechSynthesis' in window)) { $('audioNotice').textContent = '이 브라우저는 음성 재생을 지원하지 않습니다. 텍스트로 계속 학습할 수 있어요.'; return; }
    stopSpeech();
    const exercise = bank[state.session.ids[state.session.cursor]];
    utterance = new SpeechSynthesisUtterance(exercise.answers[0]); utterance.lang = 'en-US'; utterance.rate = 0.85;
    const voice = speechSynthesis.getVoices().find(item => /^en[-_]/i.test(item.lang));
    if (voice) utterance.voice = voice;
    utterance.onend = () => { $('audioNotice').textContent = '재생을 마쳤습니다.'; };
    utterance.onerror = () => { $('audioNotice').textContent = '음성을 재생할 수 없습니다. 아래 답안 입력으로 계속하세요.'; };
    $('audioNotice').textContent = '예시 질문 재생 중… 먼저 듣고 따라 만들어도 좋아요.';
    speechSynthesis.speak(utterance);
  };
  $('qbStopAudio').onclick = () => { stopSpeech(); $('audioNotice').textContent = '재생을 멈췄습니다.'; };
  document.querySelectorAll('.tab').forEach(node => node.addEventListener('click', () => {
    accountTime(); currentModule = node.dataset.target; stopRecognition(); stopSpeech();
    document.querySelectorAll('.tab').forEach(tab => {
      tab.setAttribute('aria-selected', String(tab === node)); tab.classList.toggle('active-tab', tab === node);
      tab.tabIndex = tab === node ? 0 : -1;
    });
    document.querySelectorAll('.panel').forEach(panel => panel.classList.toggle('hidden', panel.id !== currentModule));
    if (currentModule === 'builder') refreshHome();
  }));
  const tabs = [...document.querySelectorAll('.tab')];
  tabs.forEach((tab, index) => {
    tab.tabIndex = index === 0 ? 0 : -1;
    tab.addEventListener('keydown', event => {
      const offsets = { ArrowRight: 1, ArrowLeft: -1 };
      let next;
      if (event.key in offsets) next = (index + offsets[event.key] + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); tabs[next].click(); tabs[next].focus(); }
    });
  });
  document.addEventListener('visibilitychange', () => { accountTime(); if (document.hidden) { stopRecognition(); stopSpeech(); save(); } });
  window.addEventListener('pagehide', () => { accountTime(); save(); stopRecognition(); stopSpeech(); });
  setInterval(() => { accountTime(); renderTime(); if (performance.now() - lastSaved >= 5000) { save(); lastSaved = performance.now(); }
    if (!$('qbHome').hidden) refreshHome(); }, 1000);
  let deferredInstall;
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredInstall = event; $('installApp').hidden = false; });
  $('installApp').onclick = async () => {
    if (!deferredInstall) return;
    await deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; $('installApp').hidden = true;
  };
  window.addEventListener('appinstalled', () => { $('installApp').hidden = true; $('installHelp').textContent = '홈 화면 설치 완료 · 앱 아이콘으로 실행하세요.'; });
  function connection() { $('connectionState').textContent = navigator.onLine ? '기기 안에 학습 기록 저장' : '오프라인 · 텍스트 학습 가능'; }
  window.addEventListener('online', connection); window.addEventListener('offline', connection); connection();
  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('./sw.js').then(async registration => {
      const ready = await navigator.serviceWorker.ready;
      if (ready.active) $('offlineStatus').textContent = '오프라인 텍스트 학습 준비 완료';
      function updateAvailable() { $('updateApp').hidden = false; }
      if (registration.waiting) updateAvailable();
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) updateAvailable(); });
      });
      $('updateApp').onclick = () => {
        accountTime(); save(); registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
      };
      let refreshed = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshed && navigator.serviceWorker.controller && registration.active) { refreshed = true; location.reload(); }
      });
    }).catch(() => { $('offlineStatus').textContent = '오프라인 준비 실패 · 인터넷 연결 상태에서 학습하세요.'; });
  } else $('offlineStatus').textContent = '설치·오프라인 기능은 HTTPS 또는 localhost에서 제공됩니다.';
  refreshHome(); setView('qbHome');
})();
