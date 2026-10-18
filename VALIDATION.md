# SpeakForward Android PWA validation

Date: 2026-10-18 KST.

## Speak follow-up validation — 2026-10-18 UTC / 2026-10-19 KST

The user requested completing the existing site work with Speak as the REA target. REA 6.5.0 actually completed a static analysis of two publicly served Speak entry scripts. See [the execution report](research/speak-rea/REA_EXECUTED_REPORT.md) for its returned Evidence ID, acquisition hashes and explicit scope. No signed-in Speak lesson or Android app was observed.

The Question Builder now accepts optional browser speech recognition, always requires explicit answer submission, and keeps manual typing/token selection available. Recognition is aborted on pause, lesson/module navigation, typing, token selection, backgrounding and page exit. Generation checks reject late callbacks. Transcript text is not added to persisted progress.

Validation executed in the Linux workspace: clean `npm ci --ignore-scripts`; **29/29 tests passed**; `node --check app.js`; `node --check sw.js`; `git diff --check`. Four added DOM cases cover spoken-answer editing and explicit submission, transcript minimization, denial/network/no-speech/unsupported fallbacks, cancellation and stale callbacks, startup failure and token input. Recognition in these tests is mocked.

No connected browser-control tool is available in this session. No rendered browser, live microphone, external speech service, physical Android device, installed-app lifecycle or airplane-mode reload was tested. The installed Chromium executable alone does not establish a permitted connected browser session. HTTPS delivery and GitHub Actions deployment are checked separately after publication. Service-worker cache is bumped to `speakforward-shell-v2` so existing installations can update.

The sections below retain the original release's scope and verification history.

## Scope

Independent SpeakForward implementation authorized by the user's follow-up request. Public PWA deployment explicitly authorized in the subsequent answer. The Duolingo REA runtime investigation remains blocked and is not treated as successful research.

## Automated checks

Run `npm ci --ignore-scripts` and `npm test` with the Node version in package.json.

- Core tests: all authored answers; normalization; known word-order/base-verb/politeness errors; no false universal grammar claim; subject questions; blank answers; same-session idempotency; original 10-minute / 1 / 3 / 7-day review; due selection; completion; local dates and DST; resume and malformed state recovery; progress data minimization.
- DOM interaction tests: complete six-question lesson with an error and retry; reload and resume; pause; due review; keyboard tabs and token selection; existing four practice modules; storage/audio/mic unavailable fallbacks; denied microphone cleanup.
- Package tests: valid scoped manifest, PNG 192/512 dimensions, every precached file exists, no external CDN or tracking dependency, preserved module IDs and no duplicate HTML IDs.
- JavaScript syntax: core.js, lessons.js, legacy.js, app.js, sw.js and development server.
- npm reported zero known vulnerabilities at initial development-dependency install. This is a point-in-time npm audit result, not a security guarantee.

## Verification boundaries

The local preview server started, but this Windows sandbox's loopback requests timed out from both the shell and in-app browser. Local browser QA did not succeed. No sandbox or network isolation was bypassed.

jsdom checks DOM and application behavior; it does not validate rendered mobile layout, actual service-worker lifecycle, browser install prompts, speech output, native microphone permissions or a physical Android device. Deployment and live-browser checks are reported separately in the PR/chat after they execute.

## Manual Android checklist

1. Open the HTTPS deployment URL in Android Chrome (not an in-app messaging browser).
2. Complete a lesson, intentionally submit a known error, retry, and finish explicitly. Confirm the daily record increments once.
3. Close/reopen or refresh mid-lesson, then use Continue. Confirm previous submissions are not duplicated.
4. Confirm the offline-ready message, install from Chrome's menu, enable airplane mode, close/reopen, and complete a text lesson.
5. Reconnect before testing speech services. Try TTS; if unavailable, confirm text remains usable. Start optional speech recognition/recording only after approving the microphone. Deny permission once and confirm typing remains available.
6. Check 360px portrait width, landscape, larger text, keyboard navigation if available, focus and status announcements with TalkBack.
7. Export Question Builder progress before clearing browser data or changing devices. Import only your own backup; it replaces Question Builder progress after confirmation.

Record the actual device, Android/Chrome version and outcomes; do not mark this checklist passed without performing it.
