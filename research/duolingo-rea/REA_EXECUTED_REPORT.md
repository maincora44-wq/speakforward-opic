# Duolingo REA execution report

Date: 2026-10-18, Asia/Seoul (UTC+09:00).
Status: **Duolingo runtime investigation not executed. REA CLI diagnostics executed; browser discovery failed.**
REA Evidence IDs: **none**. Successful page captures: **0**. Observed learner transitions: **0**.
This report does not establish Duolingo's current guest, account, course, subscription, or cohort experience.

## Scope and preparation

Repository: maincora44-wq/speakforward-opic.
Approved research URL: https://www.duolingo.com/ ; exact origin: https://www.duolingo.com .
Selected endpoint: http://127.0.0.1:9222 . Selected target ID: none.
Actual captured URL: none. The intended URL was never opened by this investigation.
Only a fresh dedicated logged-out browser profile was intended. No existing signed-in browser was inspected.
No APK, proprietary scripts, assets, internal endpoints, credentials, audio, or screenshots were acquired.

Main was read at commit bd814ad3acebc93daedb2258955759f1c29d53cc.
Its complete tree contains README.md and index.html; no AGENTS.md, package manifest, build configuration, or test configuration was present.
The requested prerequisites returned 404 on main, then were found and read on research/duolingo-rea-20261018 at 410d77ed96518bd70d94563c82a8aed1cd2e487b:
- [PHASE0_PUBLIC_EVIDENCE.md](https://github.com/maincora44-wq/speakforward-opic/blob/410d77ed96518bd70d94563c82a8aed1cd2e487b/research/duolingo-rea/PHASE0_PUBLIC_EVIDENCE.md)
- [REA_RUNBOOK.md](https://github.com/maincora44-wq/speakforward-opic/blob/410d77ed96518bd70d94563c82a8aed1cd2e487b/research/duolingo-rea/REA_RUNBOOK.md)
- CODEX_TASK.md in the same directory was also read.

The earlier phase-0 report remains historical. Its inability to run npm is superseded here by a successful CLI download and diagnostics; its absence of runtime evidence remains true.
This new branch starts from main and adds only the three requested deliverables; it does not merge the earlier research branch.

## Classification

- OBSERVED: learner-visible fact supported by an actual REA capture and its returned Evidence ID. **No findings qualify.**
- DOCUMENTED: first-party public description, with source and limitations.
- INFERRED: reasoned interpretation or original design recommendation, explicitly not observed target behavior.
- UNKNOWN: no sufficient evidence.
Diagnostic log IDs below are local report references, **not REA Evidence IDs**.
Repository source inspection is separately identified and is not classified as REA observation.

## Actual execution ledger

Times are KST. D01-D03 use bounded execution windows because individual start/end timestamps were not retained.
Commands ran in this chat's Windows workspace. No client configuration or unrelated toolchain was changed.
REA was acquired in the workspace npm cache after session network permission was granted.

| Log | Time/window | Actual command/action | Actual result | REA Evidence ID |
|---|---|---|---|---|
| D01 | 09:10-09:12 | Active tool-name inventory; Get-Command rea,node,npm,git,gh; node --version; npm --version; npm list -g --depth=0 | No active REA MCP tools or shell rea/gh; Node 24.21.0, npm 11.19.0. Global npm inventory failed ENOENT for missing global prefix. | none |
| D02 | 09:12-09:14 | npx.cmd -y rea-agents@6.5.0 --version | Exit 0; version 6.5.0. Package and dependencies downloaded into workspace work/npm-cache. | none |
| D03 | 09:13-09:14 | npx.cmd --offline -y rea-agents@6.5.0 doctor --client codex --json | Exit 0; healthy=true for explicit scope, environment_healthy=false; Codex registration aligned, skill 42 aligned; live_server.state=unknown. | none |
| D04 | 09:13-09:14 | npx.cmd --offline -y rea-agents@6.5.0 --help; installed rea.cmd list-browser-targets --help; inspect-web-page --help; capabilities --help | Exit 0; browser CLI commands and actual argument syntax confirmed. | none |
| D05 | server started 09:14:29.379 | installed rea.cmd capabilities --format json | Exit 0; server identity rea 6.5.0, catalog 153 CLI commands / 207 MCP tools / 6 prompts; no active analysis target. Catalog counts do not prove live browser access. | none |
| D06 | 09:14, before D07 | Requested Start-Process of Chrome with a fresh workspace profile, headless mode, loopback CDP port 9222 and approved URL | Entire shell call rejected before execution: approval required by policy, but Granular.sandbox_approval=false. Chrome was not launched. | none |
| D07 | 09:14, before 09:14:33 | installed rea.cmd list-browser-targets http://127.0.0.1:9222 --allowed-origins '["https://www.duolingo.com"]' --format json | Exit 1; invalid_request: array option was supplied in an invalid literal form. No targets returned. | none |
| D08 | completed by 09:14:45.174 | installed rea.cmd list-browser-targets http://127.0.0.1:9222 --allowed-origins https://www.duolingo.com --format json | REA returned provider_unavailable, category unavailable, details.reason=endpoint_unreachable. No targets returned. Shell wrapper subsequently printed Get-Date and exited 0; that does not turn the REA failure into success. | none |
| D09 | after D08 | inspect_web_page, capture_web_screenshot, observe_web_session | **not executed**: no permitted reachable target ID. | none |

For D02-D04, the actual PowerShell environment assignment was:
`$env:npm_config_cache = Join-Path (Get-Location) 'work/npm-cache'`.
"installed rea.cmd" above denotes the downloaded public launcher:
`work/npm-cache/_npx/ad9a3fdbcad992c6/node_modules/.bin/rea.cmd`.
The full D06 requested launch arguments were `--headless=new --remote-debugging-address=127.0.0.1 --remote-debugging-port=9222 --user-data-dir="<workspace>/work/duolingo-public-profile" --no-first-run --no-default-browser-check --disable-sync https://www.duolingo.com/`.
The profile was not created by that rejected command.

Doctor also reported missing native analysis engines and a Windows native self-test "Read final handle path failed (Win32 5): access denied" in the JADX informational check.
That is a separate diagnostic; it does not establish the cause of the browser endpoint failure.
Hopper, Ghidra, IDA and JADX are not prerequisites for this browser UX investigation.
Raw doctor/config/npm logs are not included because they expose machine-specific paths and unrelated client configuration.

## Public documentation recheck (ordinary web reader, not REA)

Retrieved through the web reader on 2026-10-18 around 09:14-09:15 KST.
No browser profile, CDP session, or account interaction was involved in these reads.
Descriptions can concern app experiences and do not prove parity on public desktop web.

| ID / classification | Source | Bounded finding |
|---|---|---|
| P01 DOCUMENTED | https://blog.duolingo.com/ko/types-of-lessons-in-duolingo/ | Describes path lessons, completed-node review, and speaking/listening practice; some review is described for Super, video calls for Max. Availability on guest web remains UNKNOWN. |
| P02 DOCUMENTED | https://blog.duolingo.com/ko/duolingo-system/ | Describes an Energy experiment and historical Hearts. This is a publication's description, not evidence of the current allocation or any selected account's system. |
| P03 UNKNOWN | https://www.duolingo.com/ | Reader returned only an iframe reference; no usable current entry-point text. |
| P04 UNKNOWN | https://www.duolingo.com/help/what-is-a-streak | Reader returned only an iframe reference; the current streak rules were not verified here. |

No screenshot from those articles was downloaded or reproduced.
Phase-0 sources beyond P01-P04 were not revalidated in this run.

## Coverage and gaps

| Learner question | Classification | Evidence / gap |
|---|---|---|
| Actual guest entry button, redirects, onboarding steps | UNKNOWN | No REA page capture; P03 insufficient. |
| Lesson start, answer submission, correct/error/retry/finish states | UNKNOWN | No lesson entered or answer submitted. |
| Review entry and repetition intervals | DOCUMENTED / UNKNOWN | Review is described by P01; actual entry labels, scheduling and public-web availability unknown. |
| Listening controls, transcript, no-audio alternative | UNKNOWN | P01 describes practice generally; no controls or fallback observed. |
| Speaking permission, listening, processing, denied/error states | UNKNOWN | No microphone request, recording, or session. |
| Streak, XP, completion award and duplicate handling | UNKNOWN | No runtime observation; no coefficient or streak rule inferred from phase 0. |
| Hearts versus Energy by account/course/cohort | UNKNOWN | P02 is documentation only; no selected account. |
| Keyboard, focus order, screen-reader feedback, contrast, zoom | UNKNOWN | No accessibility capture or interaction test. |

## Precise local resume procedure (proposed, not executed)

1. Keep the installed 6.5.0 pin. In local PowerShell, run the following diagnostic commands; if npm must download, permit that acquisition explicitly in the execution environment.
   ```powershell
   npx.cmd -y rea-agents@6.5.0 --version
   npx.cmd -y rea-agents@6.5.0 doctor --client codex --json
   npx.cmd -y rea-agents@6.5.0 list-browser-targets --help
   npx.cmd -y rea-agents@6.5.0 inspect-web-page --help
   ```
2. Registration is already aligned. Restart/reconnect local Codex to restore MCP tools if desired. If tools remain absent, inspect the MCP startup error; do not rerun setup or install native engines blindly. CLI use remains possible without MCP reconnection.
3. A human can launch an interactive browser outside this rejected agent launch, using a unique disposable profile. This is an explicit manual setup step, not a claim it was done:
   ```powershell
   $taskChrome = Join-Path $env:ProgramFiles 'Google/Chrome/Application/chrome.exe'
   if (!(Test-Path -LiteralPath $taskChrome)) { throw 'Supply the installed Chrome executable path.' }
   $taskProfile = Join-Path $env:TEMP ('rea-duolingo-public-' + [guid]::NewGuid().ToString('N'))
   & $taskChrome --remote-debugging-address=127.0.0.1 --remote-debugging-port=9222 "--user-data-dir=$taskProfile" --no-first-run --no-default-browser-check --disable-sync 'https://www.duolingo.com/'
   ```
   Check that the port is free first. Never reuse the default profile, sign in, or expose the debugging port beyond localhost. Do not change sandbox controls to force the rejected command through.
4. Run discovery with the **single-origin CLI syntax actually accepted in D08**:
   ```powershell
   npx.cmd -y rea-agents@6.5.0 list-browser-targets http://127.0.0.1:9222 --allowed-origins https://www.duolingo.com --format json
   ```
   A reachable result and an actual returned target ID are required. Stop for login/paywall/bot controls. If another origin is needed, obtain approval before broadening scope. Already signed-in user content needs explicit separate user approval.
5. With a real returned ID, capture only the minimum accessibility text:
   ```powershell
   $taskTargetId = Read-Host 'Paste the actual Duolingo target ID from discovery'
   npx.cmd -y rea-agents@6.5.0 inspect-web-page http://127.0.0.1:9222 $taskTargetId --allowed-origins https://www.duolingo.com --include-accessibility-text --observation-ms 1000 --format json
   ```
   Keep raw output outside the repository, inspect it locally, and sanitize before sharing. Do not enable script-source, console, storage or payload capture. Preserve actual Evidence ID, capture time, exact URL, locale, viewport, truncation and scope limitations.
6. For transitions, first inspect the installed observe-web-session help and capture a bounded window while a human performs approved public actions. Passive REA tools do not click, navigate, or reconstruct earlier events. No microphone recording is authorized by this report. Stop rather than invent inaccessible states.
7. Update this report and USER_FLOW.md only with returned Evidence IDs and exact actual steps. Review the sanitized result before authorizing app implementation.

The old runbook's @latest and --json examples were not assumed valid for 6.5.0. Installed help confirms --format json.
Do not apply setup/configuration repairs unless a new diagnostic requires them and the exact proposed changes are reviewed.

## Deliverable validation

- Three Markdown deliverables only; original app source and README remain untouched.
- Findings separate REA observations, documentation, original proposals and unknowns.
- No REA Evidence IDs invented; no successful capture claimed.
- Resume commands checked against installed 6.5.0 help; browser launch and capture remain unverified.
- Specification acceptance criteria are proposed tests, not passing application tests.
- Runtime research remains blocked pending a reachable approved dedicated browser target.
