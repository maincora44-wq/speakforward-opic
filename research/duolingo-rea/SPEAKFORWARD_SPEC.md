# SpeakForward Question Builder: independent implementation proposal

Status: **proposal only; no app changes implemented**.
Dependency gate: review actual sanitized REA results before authorizing implementation.
The current investigation is blocked; this document does not substitute for that review.

## Evidence and design rationale

- DOCUMENTED P01: Duolingo publicly describes lesson progression and review. This supports considering short practice and review as broad interaction patterns; exact guest-web behavior remains UNKNOWN.
- INFERRED original design: business question formation, deterministic feedback, a five-minute target and tagged review below are SpeakForward choices. No Duolingo algorithm, lesson, visual asset, CSS, code or proprietary content is specified.
- Repository source inspection at main bd814ad3acebc93daedb2258955759f1c29d53cc confirms a static index.html with four modules, a 30-minute timer, localStorage, TTS, optional speech recognition and recording. It is not runtime evidence. The visible source contains no dedicated per-question review queue.
- Preserve the existing four modules and their 30-minute session. Add a separate five-minute Question Builder module only after approval. No backend, paid API, API key or new package is required by this proposal.

## Small first release

Six originally authored exercises per lesson, target duration about five minutes; no speed penalty.
Each lesson combines question word order, polite requests and an international accounting/audit meeting context.
Include token ordering and typed questions; optional audio uses the existing browser TTS.
Speaking self-practice is optional and is never a prerequisite to finishing.

Original content seeds (draft, authored for SpeakForward):
1. Context: ask an overseas finance team about a variance.
   Target: "Why did operating expenses increase in March?"
   Tags: question_word_order, auxiliary_verb, tense.
2. Context: politely request a revised audit schedule.
   Target: "Could you share the revised audit schedule?"
   Tags: politeness, question_word_order.
3. Context: clarify responsibility for a reconciliation.
   Target: "Who reviews the intercompany reconciliation?"
   Tags: subject_question, auxiliary_verb.
4. Context: ask when supporting documents will arrive.
   Target: "When will the supporting documents be available?"
   Tags: question_word_order, tense.
5. Context: request evidence before a walkthrough.
   Target: "Would you please send the control evidence before the walkthrough?"
   Tags: politeness, question_word_order.
6. Context: clarify whether a balance includes an adjustment.
   Target: "Does this balance include the year-end adjustment?"
   Tags: auxiliary_verb, base_verb.

The specification assesses English form and communicative intent, not accounting accuracy or professional advice.
Content fields include unique ID, version, context, kind, target tokens, explicit accepted answers, explanation, target skill and license/provenance ("original SpeakForward").
Reviewers should approve wording and answer variants before release.

## Validation and feedback behavior

Use explicit accepted-answer fixtures per exercise; do not claim general grammar understanding.
Normalize Unicode, curly apostrophes, case, repeated whitespace and terminal punctuation. Preserve meaningful words, negation and word order.
Content authors list alternate acceptable forms; an unlisted response shows "Not in this exercise's accepted answers" with the target, never a universal claim that the English is wrong.
A correct form lacking the requested politeness is separately explained by the exercise's explicit criterion.

Known error patterns map to tags. For "Why operating expenses did increase in March?", explain auxiliary-before-subject ordering.
For "Why did operating expenses increased in March?", tag base_verb and explain the base form after did.
For a subject question such as "Who reviews ...?", do not enforce do-support.
Unmatched errors use needs_review rather than inventing a diagnosis.
Empty or whitespace-only submission is not a scored attempt.
Feedback gives a plain text result, one short explanation and a chance to retry; no color-only status.

## Local state and deterministic review (original policy)

Use a new versioned storage key, speakForward.questionBuilder.v1. Do not migrate or overwrite existing keys.
Separate a pure answer evaluator and scheduler from DOM rendering and persistence inside the existing static stack.
A future implementation may extract a small plain-JavaScript module if needed; no framework rewrite.

Store only exercise IDs/versions, outcomes, tags, stage, dueAt, session cursor and completion dates.
Do not persist typed answers, transcripts or recordings for this module.
Attempt record: attempt ID, exercise ID/version, session ID, timestamp, outcome and tags.
Review item: exercise ID/version, tags, stage, dueAt, lastReviewedAt.
One review item per exercise/version; merge tags instead of duplicates.

Proposed intervals: incorrect → stage 0, due in 10 minutes; independent correct → stages 1/2/3 at 1/3/7 days.
At stage 3, a later independent correct keeps stage 3 and schedules another 7 days.
An incorrect review resets stage 0. A same-session retry after explanation never advances the stage.
Select only due items, oldest due first with stable exercise-ID tie breaking. Show at most six per review session; leave the rest queued.
Invalid timestamps reset that item to due now with a visible repair notice. Removed content is excluded from selection and marked unavailable.
These are original product rules, not inferred Duolingo intervals or a validated retention model.

## Session, completion and date rules

Persist a session ID and exercise cursor after each answer. Refresh resumes without duplicating attempts.
Five minutes is a goal: offer "Finish for today" at the threshold and allow continuing.
A completion is eligible only after all six distinct exercises received a substantive submitted answer and the learner explicitly finishes.
No mastery claim follows merely from finishing or revealing answers.
Use browser local calendar date at completion (not UTC ISO date); also store the IANA timezone when available.
One eligible session per local date advances the Question Builder streak. Consecutive dates add one; a gap starts at one; repeat completion on the same date adds zero.
Do not modify the existing 30-minute streak; label this new indicator clearly to avoid conflating them.
Compute date adjacency by calendar dates, not elapsed 24-hour milliseconds, so DST does not change the result.
Clock changes and cross-device streak reconciliation are unsupported; progress is device-local.
Storage blocked/full/corrupt → visible session-only mode with no false "saved" confirmation.

## Audio, speaking and accessibility

Playback begins only on user action. Show playing, stopped, unavailable and error text; support stop/replay.
If synthesis or an English voice is unavailable, show the full text and let the learner continue.
Do not present speech recognition text as a pronunciation score or overall grammar evaluation.
If optional recognition is added later, disclose that the browser may use its provider's network; unsupported, denied, no-speech and error states retain typed input. No auto-start mic or background recording.
Token ordering must support keyboard selection/removal and a typed alternative, without drag-only interaction.
Use labels, visible focus, semantic buttons, status announcements and focus on the next prompt after Continue.
Ensure 200% zoom/reflow, adequate contrast and reduced-motion behavior; no timed input loss.

## Future acceptance criteria (not executed tests)

| ID | Given / when | Expected result |
|---|---|---|
| A01 | Normalize target with mixed case, curly apostrophe and terminal punctuation | Explicit accepted variant passes; reordered words and changed negation fail. |
| A02 | Submit the two error examples above | Correct tag/explanation; unrelated input gets needs_review. |
| A03 | Submit "Who reviews the intercompany reconciliation?" | Accepted without forced do-support. |
| A04 | Submit blank, then double-click Submit and Finish | Blank creates no attempt; one attempt/transition and one eligible completion are recorded. |
| A05 | Fail an exercise, then retry correctly in the same session | One review item, stage 0, due +10 minutes; retry does not advance. |
| A06 | Review independently with a fixed clock | Correct progresses +1/+3/+7 days; another correct stays at +7; failure resets +10 minutes. |
| A07 | Have eight due items and two future items | Six oldest due items selected deterministically; others retained. |
| A08 | Finish twice today, next local date, after a gap, and across DST | Streak +0/+1/reset as specified; UTC midnight alone does not define a new day. |
| A09 | Refresh during an exercise or after feedback | Cursor and stage resume; attempts are not duplicated. |
| A10 | Deny storage or load corrupt/old data | Visible session-only/repair state; existing app keys survive unchanged. |
| A11 | Disable TTS or deny optional microphone permission | Text/typed lesson remains fully completable, with a clear explanation. |
| A12 | Complete with keyboard and screen reader at 200% zoom | All controls reachable, feedback announced once, focus predictable, no clipped essential controls. |
| A13 | Inspect browser storage after lesson | Only declared progress metadata; no responses, audio, transcripts, account data or secrets. |
| A14 | Run all four existing modules after adding the future module | Existing behavior retained; timer and key namespaces do not collide. |

## Review and release gate

Before implementation: resolve the REA browser blocker, fill exact observed steps or explicit public access gaps, and obtain review of the sanitized findings.
Then approve original content and criteria, implement the bounded module, and run deterministic evaluator/scheduler tests plus browser smoke/accessibility checks.
No automatic deployment, main update, merge or site publication is authorized by this document.
