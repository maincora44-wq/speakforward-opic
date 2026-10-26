# Codex instruction — complete REAL Duolingo REA investigation

Paste the following into a **local Codex session with REA installed**. Do not report REA results if it is unavailable.

```text
Work in GitHub repository maincora44-wq/speakforward-opic.
Study research/duolingo-rea/PHASE0_PUBLIC_EVIDENCE.md and REA_RUNBOOK.md first.
Duolingo is a RESEARCH TARGET, not source code licensed for reuse.

GOAL:
Analyze the observable learning experience of publicly accessible Duolingo
web pages using the official REA MCP/CLI tools, and produce an evidence-backed
feature specification for an independently built business-English learning app.

ORDER:
1. Diagnose actual REA availability and version (tools/capabilities/doctor).
   If REA or permitted public browser target is unavailable, stop the REA
   execution section and state the blocker and precise local setup steps.
2. Use only publicly accessible pages and a dedicated browser profile.
   Do not bypass logins, subscription paywalls, bot controls or app safeguards.
   If already signed-in user pages are offered, obtain explicit user approval
   before inspecting user content; redact private data.
3. Use list_browser_targets then inspect_web_page, optionally capture_web_screenshot
   and observe_web_session, only with user-approved target/origins. Log the
   commands, tool version, exact URL, timestamp, Evidence IDs and coverage.
4. Document actual learner-visible entry points, lesson state changes, feedback,
   spaced-review UX, speaking/listening states, streak/XP and accessibility.
   Flag any account/cohort-specific differences (Hearts vs Energy) as unknown
   unless observed.
5. For every finding categorize as OBSERVED (REA capture), DOCUMENTED
   (first-party public source), INFERRED, or UNKNOWN.
6. Draft an original SpeakForward improvement plan emphasizing English question
   word order, polite requests, international accounting/audit meeting English,
   daily 5-minute lessons, error tagging and spaced review.
7. DO NOT copy Duolingo's CSS, code, lessons, characters, graphics, paid content,
   internal endpoints or protected data. DO NOT auto-deploy or alter main.
8. Create a new branch and draft PR containing a sanitized REA evidence report,
   gaps and a small independently designed implementation spec.
   Never commit raw account content, auth tokens, APKs, captured proprietary JS
   or sensitive screenshots.
9. Do not implement app changes until the REA result is reviewed. Report plainly
   what was actually executed and which steps remain proposals.

Deliver:
- REA_EXECUTED_REPORT.md with version/command/Evidence ID or explicit "not executed"
- USER_FLOW.md showing exact observed steps and alternative states
- SPEAKFORWARD_SPEC.md with independently written behavior and test criteria
- Draft PR URL and validation outcome
```

**Reminder:** Codex cloud may not have access to the user's PC, locally running Chrome CDP endpoint or phone. If tool/browser access is absent, do not claim it was analyzed. A local Codex environment configured with REA is the recommended first execution target.
