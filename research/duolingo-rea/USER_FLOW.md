# Duolingo learner flow: evidence boundary and capture plan

Status on 2026-10-18 KST: **not executed**.
REA captures: 0. REA Evidence IDs: none. Actual observed learner steps: **none**.
See [REA_EXECUTED_REPORT.md](REA_EXECUTED_REPORT.md) for D01-D09, tool version and blockers.

## Exact actual sequence

1. Read repository prerequisites from research/duolingo-rea-20261018.
2. Executed REA 6.5.0 CLI version, doctor, help and capabilities.
3. Attempted dedicated Chrome launch; host approval policy rejected it before execution.
4. Called list-browser-targets once with an invalid array literal; corrected the origin argument.
5. Corrected REA discovery returned endpoint_unreachable for http://127.0.0.1:9222.
6. Stopped. No target selected, webpage inspected, navigation performed, lesson started or answer submitted.

These are investigator steps, not a captured learner journey.

## Capture matrix for the next approved session (all steps proposed)

The only approved starting origin is https://www.duolingo.com .
Record the exact current URL, actual control label, locale, viewport, guest state and Evidence ID for each row.
Do not invent a click target from this checklist. A public feature may be unavailable.

| Coverage | Proposed action only if public control exists | Alternative state to record | Current status |
|---|---|---|---|
| Entry | Inspect the fresh logged-out home page; human selects the actual learning entry point | Redirect, locale selection, login, paywall or bot gate: record boundary and stop | UNKNOWN |
| Onboarding | Human follows visible public choices | Skip/back/unavailable option; origin change requires approval | UNKNOWN |
| Lesson input | Human starts a public lesson and submits one answer | Empty answer, disabled submit, cancel, correct, incorrect | UNKNOWN |
| Feedback | Capture before and after human submit and continue | Retry, explanation, no retry, blocking gate | UNKNOWN |
| Finish | Human completes an available public lesson | Early exit, resume, duplicate finish | UNKNOWN |
| Review | Inspect an actual public review entry | Login or subscription wall: record inaccessible, not absent | UNKNOWN |
| Listening | Human operates visible playback without mic | Replay, transcript, no voice/audio failure, mute | UNKNOWN |
| Speaking | Inspect public labels without recording | Permission, denial, unsupported, skip; actual mic capture requires separate approval | UNKNOWN |
| Motivation | Inspect visible progress after eligible completion | Streak/XP missing, guest-only state; Hearts/Energy remains account-specific | UNKNOWN |
| Accessibility | Capture labels; human tests keyboard and focus sequence | Focus loss, non-color feedback, live announcement, zoom/reflow | UNKNOWN |

For every transition, keep a row containing:
`sequence | exact URL | action actor | exact visible control | before Evidence ID | after Evidence ID | timestamp | outcome | limits`.
Only successful REA capture references can justify OBSERVED.
No placeholders in this file are actual Evidence IDs.

## What public documentation supports

DOCUMENTED (P01): Duolingo describes new path lessons and reviewing a previously completed node; some targeted practice is subscription-related.
This is not an exact web click sequence and does not prove anonymous access.
DOCUMENTED (P02): an Energy experiment is described. The active system of any account is UNKNOWN.
The sources and retrieval limits are in the execution report.

## Original SpeakForward flow, proposed for review

INFERRED design recommendation, not a Duolingo reconstruction:

Choose Question Builder or Due Review → show short business context → type or arrange an original question → submit → show deterministic feedback and a named error tag → revise → continue → summarize attempts and next review date.

Alternative states:
- Empty response stays on the exercise with a text prompt; no attempt is recorded.
- Incorrect response adds a tagged review item; retry does not duplicate the item.
- Audio unavailable leaves text and keyboard input available.
- Speaking is optional; microphone denial leaves a typing path.
- Pause/resume preserves progress; elapsed five minutes offers completion without forced dismissal.
- Corrupt/unavailable storage gives a visible in-memory mode; do not claim persistence.
- Session completion updates one local-day record once; repeated finish does not add another streak day.

All proposed behavior and future test criteria are specified in [SPEAKFORWARD_SPEC.md](SPEAKFORWARD_SPEC.md).
Implementation is pending review of actual REA results; the missing runtime evidence is not waived by this proposal.
