'use strict';

const byId = (id) => document.getElementById(id);
const storageKey = 'speaking-studio-for-grok:v1';
const duration = 60;
const select = byId('session-select');
const answer = byId('answer');
const promptPreview = byId('session-prompt');
const timerButton = byId('timer-toggle');
const recordButton = byId('record');
const player = byId('recording');
const status = byId('status');
let completed = readProgress() ?? new Set();
let current = sessions.findIndex((_, index) => !completed.has(index));
if (current === -1) current = 0;
let deadline = 0;
let interval;
let statusTimeout;
let recording;
let recordingRevision = 0;
let recordingUrl;

function announce(message) {
  status.textContent = message;
  clearTimeout(statusTimeout);
  statusTimeout = setTimeout(() => { status.textContent = ''; }, 5500);
}

function readProgress() {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    if (Array.isArray(value)) {
      return new Set(value.filter((index) => Number.isInteger(index) && index >= 0 && index < sessions.length));
    }
  } catch {
    return null;
  }
  return new Set();
}

function renderProgress() {
  byId('completed-count').textContent = completed.size;
  byId('overall-progress').value = completed.size;
  const complete = byId('complete');
  const isComplete = completed.has(current);
  complete.textContent = isComplete ? 'Undo completion' : 'Mark complete';
  complete.setAttribute('aria-pressed', String(isComplete));
  const weekList = byId('week-list');
  const weeks = [];
  for (let start = 0; start < sessions.length; start += 7) {
    const days = sessions.slice(start, start + 7);
    const count = days.filter((_, offset) => completed.has(start + offset)).length;
    const week = document.createElement('article');
    week.className = 'week';
    const label = document.createElement('p');
    label.textContent = `Week ${Math.floor(start / 7) + 1} · ${count} / ${days.length}`;
    const progress = document.createElement('progress');
    progress.max = days.length;
    progress.value = count;
    progress.setAttribute('aria-label', label.textContent);
    week.append(label, progress);
    weeks.push(week);
  }
  weekList.replaceChildren(...weeks);
}

function toggleCompletion() {
  completed = readProgress() ?? completed;
  const isComplete = completed.has(current);
  if (isComplete) completed.delete(current);
  else completed.add(current);
  renderProgress();
  try {
    localStorage.setItem(storageKey, JSON.stringify([...completed]));
    announce(isComplete ? 'Completion removed.' : 'Session marked complete.');
  } catch {
    announce('Progress is available for this visit. This browser could not save it.');
  }
}

function updatePrompt() {
  const [track, topic, question, followUp, phrase] = sessions[current];
  const mode = track === 'Workplace' ? 'Business English' : track === 'OPIc' ? 'OPIc' : 'Speaking Studio';
  const transcript = answer.value.trim();
  const instructions = transcript
    ? 'Start with feedback on my answer. Give one strength, up to two corrections, a natural rewrite that keeps my meaning, and one expression to reuse.'
    : 'Ask the practice question and wait for my 45–60 second answer. Then give one strength, up to two corrections, a natural rewrite, and one expression to reuse.';
  promptPreview.value = [
    `You are my English speaking coach. Mode: ${mode}. Day ${current + 1}: ${topic}.`,
    `Practice question: ${question}`,
    `Suggested expression: ${phrase}`,
    instructions,
    `Then ask this follow-up and wait: ${followUp}`,
    'Use English, with a brief Korean explanation if I ask. Treat text as a transcript for language feedback only. Give practice feedback without assigning an official test score.',
    transcript && `My answer:\n${transcript}`,
  ].filter(Boolean).join('\n\n');
  promptPreview.scrollTop = 0;
}

function setQuestionHidden(hidden) {
  byId('question-text').hidden = hidden;
  byId('question-hidden').hidden = !hidden;
  byId('phrase').hidden = hidden;
  byId('follow-up').parentElement.hidden = hidden;
  const button = byId('hide-question');
  button.textContent = hidden ? 'Show question' : 'Hide question';
  button.setAttribute('aria-pressed', String(hidden));
}

function stopTimer(seconds = duration) {
  clearInterval(interval);
  deadline = 0;
  byId('timer').textContent = seconds === duration ? '01:00' : '00:00';
  timerButton.textContent = seconds === duration ? 'Start timer' : 'Start again';
}

function toggleTimer() {
  if (deadline) {
    stopTimer();
    return;
  }
  deadline = Date.now() + duration * 1000;
  timerButton.textContent = 'Reset timer';
  interval = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    if (remaining === 0) {
      stopTimer(0);
      announce('Time is up.');
    } else {
      const minutes = String(Math.floor(remaining / 60)).padStart(2, '0');
      const seconds = String(remaining % 60).padStart(2, '0');
      byId('timer').textContent = `${minutes}:${seconds}`;
    }
  }, 200);
}

function releaseAudio() {
  if (recordingUrl) URL.revokeObjectURL(recordingUrl);
  recordingUrl = undefined;
  player.removeAttribute('src');
  player.load();
  player.hidden = true;
}

function resetRecordButton() {
  recordButton.disabled = false;
  recordButton.textContent = 'Record answer';
  recordButton.setAttribute('aria-pressed', 'false');
}

function stopRecording() {
  if (!recording) return;
  const { recorder, stream, timeout } = recording;
  clearTimeout(timeout);
  if (recorder.state === 'recording') recorder.stop();
  stream.getTracks().forEach((track) => track.stop());
  recording = undefined;
  resetRecordButton();
}

async function toggleRecording() {
  if (recording) {
    stopRecording();
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    announce('Recording is unavailable in this browser. You can still answer aloud or type a transcript.');
    return;
  }
  const revision = ++recordingRevision;
  recordButton.disabled = true;
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (revision !== recordingRevision) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    const recorder = new MediaRecorder(stream);
    const chunks = [];
    recorder.ondataavailable = ({ data }) => { if (data.size) chunks.push(data); };
    recorder.onstop = () => {
      if (recording?.recorder === recorder) stopRecording();
      if (recordingRevision !== revision || !chunks.length) return;
      releaseAudio();
      recordingUrl = URL.createObjectURL(new Blob(chunks, { type: chunks[0].type || recorder.mimeType }));
      player.src = recordingUrl;
      player.hidden = false;
      announce('Recording ready to replay.');
    };
    recorder.onerror = () => {
      if (recordingRevision !== revision) return;
      recordingRevision += 1;
      stopRecording();
      announce('Recording stopped because the microphone became unavailable.');
    };
    recorder.start();
    recording = { recorder, stream, timeout: setTimeout(stopRecording, 120_000) };
    resetRecordButton();
    recordButton.textContent = 'Stop recording';
    recordButton.setAttribute('aria-pressed', 'true');
  } catch {
    stream?.getTracks().forEach((track) => track.stop());
    if (recordingRevision !== revision) return;
    resetRecordButton();
    announce('Could not start recording. Check your microphone permission or type a transcript.');
  }
}

function showSession(index) {
  if (!Number.isInteger(index) || !sessions[index]) return;
  current = index;
  recordingRevision += 1;
  stopRecording();
  resetRecordButton();
  releaseAudio();
  stopTimer();
  window.speechSynthesis?.cancel();
  answer.value = '';
  select.value = String(index);
  const [track, topic, question, followUp, phrase] = sessions[index];
  byId('session-label').textContent = `Day ${index + 1}`;
  byId('practice-title').textContent = topic;
  byId('session-track').textContent = track;
  byId('question-text').textContent = question;
  byId('follow-up').textContent = followUp;
  byId('follow-up').parentElement.open = false;
  byId('phrase').textContent = `Try this phrase: “${phrase}”`;
  byId('previous').disabled = index === 0;
  byId('next').disabled = index === sessions.length - 1;
  setQuestionHidden(false);
  renderProgress();
  updatePrompt();
}

function listen() {
  if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
    announce('This browser does not support speech playback.');
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(sessions[current][2]);
  utterance.lang = 'en-US';
  utterance.rate = 0.94;
  utterance.onerror = ({ error }) => {
    if (!['canceled', 'interrupted'].includes(error)) announce('Speech playback is unavailable. You can show the question to read it.');
  };
  window.speechSynthesis.speak(utterance);
}

sessions.forEach(([track, topic], index) => {
  select.add(new Option(`Day ${index + 1} · ${topic} (${track})`, String(index)));
});
select.addEventListener('change', () => showSession(Number(select.value)));
byId('previous').addEventListener('click', () => showSession(current - 1));
byId('next').addEventListener('click', () => showSession(current + 1));
byId('hide-question').addEventListener('click', () => setQuestionHidden(!byId('question-text').hidden));
byId('listen').addEventListener('click', listen);
timerButton.addEventListener('click', toggleTimer);
recordButton.addEventListener('click', toggleRecording);
byId('complete').addEventListener('click', toggleCompletion);
answer.addEventListener('input', updatePrompt);
byId('copy-session').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(promptPreview.value);
    announce('Session prompt copied.');
  } catch {
    promptPreview.focus();
    promptPreview.select();
    announce('Select and copy the highlighted prompt.');
  }
});
const botText = fetch('bot-instructions.txt').then((response) => {
  if (!response.ok) throw new Error('Instructions are unavailable');
  return response.text();
}).catch(() => '');
byId('copy-bot').addEventListener('click', async () => {
  try {
    const instructions = await botText;
    if (!instructions) throw new Error('Instructions are unavailable');
    await navigator.clipboard.writeText(instructions);
    announce('Bot instructions copied.');
  } catch {
    announce('Use Download instructions to copy them from the text file.');
  }
});
window.addEventListener('storage', ({ key }) => {
  if (key === storageKey || key === null) {
    completed = readProgress() ?? completed;
    renderProgress();
  }
});
window.addEventListener('pagehide', () => {
  recordingRevision += 1;
  stopRecording();
  resetRecordButton();
  releaseAudio();
  stopTimer();
  window.speechSynthesis?.cancel();
});
showSession(current);
