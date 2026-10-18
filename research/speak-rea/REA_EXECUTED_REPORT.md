# 스픽 REA 실행 보고서

실행일: 2026-10-18 UTC / 2026-10-19 KST. 대상 저장소: `maincora44-wq/speakforward-opic`.

사용자의 후속 요청에 따라 기존 듀오링고 조사 대신 **스픽(Speak)의 공개 웹 진입 코드**를 REA로 분석했다. **정적 분석은 실제 성공했다. 로그인 후 학습 화면의 실행 관찰은 수행하지 않았다.** 이전 듀오링고 Draft PR #1·#2는 당시의 차단 기록으로 남긴다.

## 실행 결과

| 항목 | 실제 결과 |
|---|---|
| 도구 | `rea-agents@6.5.0`, CLI 버전 확인 성공 |
| 실행 환경 | Linux, Node 24.19.0, npm 11.9.0 |
| 공개 진입 URL | https://app.speak.com/ |
| 수집 방식 | 로그인·쿠키 없이 공개 HTML과 그 HTML이 직접 참조하는 공개 코드 두 파일 GET |
| 수집 시각 | 2026-10-18T23:46:01.091563+00:00 |
| 분석 방식 | `analyze-javascript-application`; 파일을 실행하지 않는 정적 분석 |
| 반환 Evidence ID | `ev_2e667cda60f169861df48222c9443e2fc33880492ca44a4b01cf52841aa4c80c` |
| 분석 대상 | `region-page.js`, `public-layout.js` 두 파일, 합계 20,529 bytes |
| 파싱 결과 | JavaScript 파일 2개, AST 노드 6,305개, findings 108개, modules 44개, parse failures 0개 |
| authority / confidence | `shipped-artifact` / `derived` |
| 실행 중 브라우저 캡처 / 수업 전환 관찰 | **0 / 0** |

REA가 반환한 `statistics.modules=44`는 수집된 두 청크 안의 모듈 수다. 외부 참조까지 포함한 graph의 노드 수와 다르며, 스픽 전체 앱의 모듈 수가 아니다.

## 실제 명령과 진단

```sh
npx -y rea-agents@6.5.0 --version
npx --offline -y rea-agents@6.5.0 --help
npx --offline -y rea-agents@6.5.0 analyze-javascript-application --help
npx --offline -y rea-agents@6.5.0 doctor --json
npx --offline -y rea-agents@6.5.0 analyze-javascript-application \
  /workspace/scratch/speak-public \
  --source-path region-page.js --source-path public-layout.js \
  --analysis-timeout-ms 60000 --format json
```

버전과 help 명령은 exit 0이었다. `doctor`는 audit-wide 검사에서 native 분석 엔진 및 클라이언트 등록 누락으로 `healthy=false`, exit 1을 반환했다. 최초 doctor와 연결한 분석 명령은 doctor의 비정상 종료 때문에 실행되지 않았다. 이후 정적 분석 명령을 독립 실행했고 exit 0 및 위 Evidence가 반환됐다. 이 분석에는 native 엔진이나 MCP 등록이 필요하지 않으므로 agent 설정을 변경하거나 엔진을 설치하지 않았다.

공개 HTML의 script URL 22개 중 진입 페이지와 layout 두 파일만 선택했다. 각 원본 URL, HTTP 상태, 바이트 수, SHA-256은 [evidence-summary.json](evidence-summary.json)의 `acquisition`에 기록했다. HTML과 수집 메타데이터도 인벤토리에 들어가지만 source-path 분석에서 제외됐다. 다른 청크·소스맵·로그인 API·계정 데이터는 수집하지 않았다.

## 정적 근거와 해석 한계

| 분류 | 반환 결과 및 의미 |
|---|---|
| STATIC | 두 파일에서 webpack 청크와 모듈 선언을 파싱했다. `region-page.js` 28개, `public-layout.js` 16개 모듈을 기록했다. 선언 존재를 보여주며 실행이나 화면 전환을 증명하지 않는다. |
| STATIC | layout에 localStorage의 읽기·쓰기·삭제 호출 구문이 있다. 저장 내용·실제 호출 여부·사용자 진행 정보는 확인하지 않았다. |
| INFERRED | 그래프에 경로 및 네트워크 후보가 있다. `returnUrl`도 후보로 분류되므로 실제 요청 endpoint라고 해석하지 않는다. |
| DOCUMENTED | 스픽 공식 도움말이 음성·타이핑 전환, 피드백 후 재시도, 표현 보관 기능을 설명한다. 아래 공식 출처를 읽었으며 런타임 관찰과 구분한다. |
| UNKNOWN | 로그인 후 실제 레슨, Android 앱, 발음 평가 모델, 대화 서버, 복습 간격, 계정별 화면 및 유료 기능. |

반환 limitations는 전체 관계 그래프의 불완전성, 미선택 파일, 동적 표현식과 외부 참조의 미해결, 정적 관계가 실행을 증명하지 않는다는 점을 명시한다. 2개 파일의 parse failure가 0이라는 결과는 전체 서비스 분석의 완결성을 뜻하지 않는다.

## 공식 문서로 별도 확인한 기능

이 표는 공식 설명을 요약한 **DOCUMENTED** 근거이며 스픽 계정이나 앱을 직접 조작한 결과가 아니다.

| 출처 | 확인한 설명 | 독립 구현에 반영한 범위 |
|---|---|---|
| [핸즈프리와 말할 수 없어요 모드](https://help.speak.com/ko/articles/7969186) | 수업 종류에 따라 음성 대신 타이핑하거나 말하기 없이 학습할 수 있다. | 질문 수업에 선택적 음성 인식과 직접 입력 전환. 자동 진행·자동 제출은 추가하지 않았다. |
| [프리톡 비주얼 모드](https://help.speak.com/ko/articles/13182402) | 음성 중심 대화, 텍스트 변환, 교정과 재시도를 설명한다. | 받아쓰기 결과를 직접 확인·수정·제출하는 흐름. AI 자유 대화·실시간 발음 평가를 구현했다고 표시하지 않는다. |
| [문장과 단어 보관](https://help.speak.com/ko/articles/7969167) | 수업·프리톡 등에서 표현을 보관하는 방법을 설명한다. | 기존 문항 ID 중심 복습을 유지한다. 대화나 받아쓴 문장을 새로 저장하지 않는다. |

## 보관과 재검증

- 공개 저장소에는 이 요약과 [근거 요약 JSON](evidence-summary.json)을 남긴다. 제3자 코드와 전체 Evidence는 앱에 포함하거나 GitHub에 게시하지 않는다.
- 전체 반환 파일은 현재 작업 공간의 `/workspace/scratch/speak-rea-evidence.json`에 있다. SHA-256: `de3b1fa67f82b3a5e659d25f77274d7ebf23cabb6e1da0082cd6d1b9114d0d6a`.
- 요약 JSON은 전체 REA Evidence가 아니며 `evidence-import`에 사용할 수 없다. 위 ID는 실제 반환 원본의 ID다. 코드·인벤토리 내용이 달라지면 새 분석의 ID도 달라질 수 있다.
- 같은 URL이라도 배포가 바뀔 수 있으므로 원본 코드의 SHA-256부터 비교해야 한다. 부분 분석의 수치나 정적 후보를 실행 관찰로 바꾸어 기록하면 안 된다.

현재 세션에는 연결된 브라우저 제어 도구가 없어 실제 수업 전환과 렌더링은 확인하지 못했다. 브라우저 실행 파일이 설치돼 있다는 사실만으로 연결된 브라우저 세션이 있다고 간주하지 않았다. 이 보고서는 **공개 진입 코드의 REA 정적 분석 완료**와 **공식 기능 설명 확인**까지를 완료 범위로 삼는다.
