# FinanceDataReader로 만드는 금융 영어 교재

## 실제 적용

FinanceDataReader **0.9.202**를 별도 가상환경에 설치해 `DataReader('FRED:DEXKOUS', '2025-09-02', '2025-09-05')`를 실제 실행했습니다.
브라우저는 검토한 정적 [스냅샷](finance-data.js)만 로드하므로 Python, API 키, 실시간 시세 서버 없이도 수업이 동작합니다.

데이터는 Board of Governors of the Federal Reserve System (US)가 제공하고 FRED가 배포하는 DEXKOUS입니다. 단위는 **1 USD당 KRW**, 뉴욕 정오의 매입 환율입니다. 일반적인 은행 송금·환전 적용 환율과 구분합니다.

| 관측일 | KRW per 1 USD |
| --- | ---: |
| 2025-09-02 | 1,394.76 |
| 2025-09-03 | 1,389.21 |
| 2025-09-04 | 1,394.80 |
| 2025-09-05 | 1,385.28 |

기간 양끝 변화율 `(1385.28 / 1394.76 - 1) × 100 = 약 -0.68%`를 영어로 설명합니다. 매일 하락했다는 의미는 아닙니다.
USD/KRW 하락은 같은 1 USD에 필요한 KRW가 감소했다는 뜻이므로 두 관측 시점 사이 원화는 달러 대비 강해졌다고 설명합니다.

자료 조회: `2026-10-20T08:18:48Z`. 원문 CSV SHA-256: `6953d5f11a1ad251f6b2b30c5efbfd629e6547b31b0bdb21ae8cad47b570adc1`.
시계열은 사후 수정될 수 있으며 이 교재는 조회 당시의 검토된 과거 스냅샷입니다.

## 검증한 수집 경로

[수집 스크립트](scripts/fetch-finance-lesson.py)는 JSON을 표준 출력으로 반환하며 기존 교재 파일을 변경하지 않습니다.

1. FinanceDataReader에서 FRED 시계열 조회.
2. 같은 기간 FRED 원본 CSV를 별도로 받아 값 대조. FinanceDataReader 내부의 전일 값 채우기로 공휴일이 실제 관측일처럼 표시되지 않도록 원본의 빈 값은 `null`로 유지.
3. 날짜 중복·정렬·범위, 유효한 양수·유한 수, 관측값 2개 이상 검사. 실패 시 오류를 반환하며 가상의 시세로 대체하지 않음.
4. 관측값과 단위, 출처 URL, 조회 시각, FinanceDataReader 버전, 원문 해시 보관.

선택적 개발용 실행:

```sh
python3 -m venv .venv-finance
.venv-finance/bin/pip install -r scripts/finance-requirements.txt
.venv-finance/bin/python scripts/fetch-finance-lesson.py
```

Windows에서는 `.venv-finance\Scripts\python.exe`와 `pip.exe`를 사용합니다.
수집을 50초로 제한합니다. 조회에 실패하면 이미 앱에 포함된 교재가 계속 동작합니다.
교재 갱신 시에는 출력 JSON을 검토하고 **새 문항 ID/버전**을 만드세요. 기존 `finance-fx-202509-*-v1`의 문제와 정답을 바꾸면 저장된 복습의 의미가 달라집니다.

## 자료

- [FinanceDataReader 공식 저장소와 FRED 사용법](https://github.com/FinanceData/FinanceDataReader)
- [FRED DEXKOUS 정의·단위·출처·인용 안내](https://fred.stlouisfed.org/series/DEXKOUS)
- [실제로 대조한 CSV](https://fred.stlouisfed.org/graph/fredgraph.csv?id=DEXKOUS&cosd=2025-09-02&coed=2025-09-05)
