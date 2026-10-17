# REA Duolingo execution runbook — Windows PC + local Codex

**Status:** Commands **not executed** on the user's PC. The GitHub connector alone cannot attach to Chrome, install npm packages, retrieve a user's APK or launch Codex. Run only against an authorized public page or an APK you are permitted to inspect. Follow local law and site terms.

## A. Prerequisites / readiness

1. Install Node.js (with npm), Codex CLI, and Chrome/Chromium on the **same PC**.
2. Read the official project: https://github.com/morluto/rea ; https://github.com/morluto/rea/blob/main/docs/installation.md
3. In Windows PowerShell, preview REA's changes before setup:
```powershell
npx -y rea-agents@latest setup --client codex --dry-run
```
4. If the preview is acceptable, run:
```powershell
npx rea-agents@latest setup --client codex
```
Approve the exact proposed changes; restart **local** Codex. Verify prerequisites:
```powershell
npx -y rea-agents@latest doctor --json
```
If the REA version lacks the expected browser or Android methods, stop and report that version rather than inventing tool results.

## B. REA website observation (recommended first, simpler than Android APK)

Launch a **separate disposable Chrome profile**. Do not reuse a browser with banking or personal accounts signed in. On Windows PowerShell:
```powershell
$chrome = Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'
if (!(Test-Path $chrome)) { throw 'Google Chrome not found at default path; supply its actual executable path.' }
$profile = Join-Path $env:TEMP 'rea-duolingo-observation'
Start-Process -FilePath $chrome -ArgumentList @(
  '--remote-debugging-port=9222',
  "--user-data-dir=`"$profile`"",
  'https://www.duolingo.com/'
)
```
- Use only `127.0.0.1:9222`. Never forward or expose the CDP port beyond localhost.
- Use logged-out pages first. Do not circumvent gated lessons, login, DRM, paywalls or access restrictions.
- A user may interact with the page manually while the passive observer is connected.

Find targets:
```powershell
npx -y rea-agents@latest list-browser-targets http://127.0.0.1:9222 --json
```
Identify the Duolingo tab from returned URL/title. Insert its real target ID:
```powershell
npx -y rea-agents@latest inspect-web-page http://127.0.0.1:9222 TARGET_ID --include-accessibility-text --observation-ms 1000 --json > duolingo-page-evidence.json
```
**Never use literal `TARGET_ID` as a value.** Confirm the returned Evidence ID, target origin, coverage, exclusions and timestamp. Keep raw Evidence **local**, inspect for personal text/cookies/credentials before sharing anything. Source capture is unnecessary for first-pass UX inspection.

Capture an **authorized, bounded** screenshot separately if permitted:
```powershell
npx -y rea-agents@latest capture-web-screenshot http://127.0.0.1:9222 TARGET_ID --json > duolingo-screenshot-evidence.json
```
Optional feature-level testing: use REA's documented `observe-web-session` while *you* operate a public interface. It does not know actions that happened before it attached. Record UI steps, actual text/feedback, outcome and missing coverage. Label gated screens as inaccessible, not absent.

### Requested evidence for each feature

| Question | Evidence to record |
|---|---|
| Home/navigation | public routes, accessible labels, entry points; screenshots if allowed |
| Lesson | start/finish states, question kinds, ordering, non-answer actions |
| Feedback | success/error feedback, retry path, whether lesson may continue |
| Motivation | any visible streak/XP indicator; don't assume same Hearts/Energy for every account |
| Practice | availability and how a review lesson is entered |
| Speaking | browser permission prompts and fallback, no audio recording without explicit consent |
| Constraints | A/B cohorts, language availability, guest vs paid state, incomplete captures |

## C. Android APK route (optional, more setup; not a prerequisite for Phase 0)

REA's official `docs/android-analysis.md` describes `inspect-android-package`. This requires **JDK 17+** and the release-pinned **jadx-headless-mcp** JAR, plus a locally obtained APK that you are permitted to inspect. Verify the JAR SHA-256 exactly as in the official guide. For a legitimate APK artifact on disk:
```powershell
npx -y rea-agents@latest inspect-android-package 'C:\authorized-targets\duolingo-base.apk' --json
```
The pathname is an **example**. Android ADB workflows require locally available platform-tools and an explicitly connected/authorized device, and they are separate from browser/CDP. See https://github.com/morluto/rea/blob/main/docs/adb-device-analysis.md . Do **not** sideload arbitrary APKs from unknown download sites, copy app binaries into a public repository or share decoded protected code.

## D. What to send to Codex after running REA

Use the prompt in `research/duolingo-rea/CODEX_TASK.md`. Copy only a **sanitized evidence summary** into the repo/PR; keep raw website scripts, private account data, and screenshots private unless redistribution is authorized.

## E. Acceptance standard

- REA report contains: exact command, version, target/origin, observation date/time, Evidence ID, screenshot/hash if collected, coverage, limitations, concrete steps/results.
- Every architectural conclusion must be labeled **observed**, **inferred**, or **unknown**.
- Public docs alone do **not** count as successful REA execution.
- Code should be independently written and tested, never a byte-for-byte clone.
