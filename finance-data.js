// Reviewed historical teaching snapshot. Refresh with scripts/fetch-finance-lesson.py.
(function (root, factory) {
  const snapshot = factory();
  if (typeof module === 'object' && module.exports) module.exports = snapshot;
  else root.SFFinanceData = snapshot;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  return {
  "version": 1,
  "purpose": "historical English teaching material",
  "series": "DEXKOUS",
  "pair": "USD/KRW",
  "unit": "KRW per 1 USD",
  "source": "Board of Governors of the Federal Reserve System (US), via FRED",
  "sourceUrl": "https://fred.stlouisfed.org/series/DEXKOUS",
  "downloadUrl": "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DEXKOUS&cosd=2025-09-02&coed=2025-09-05",
  "reader": "FinanceDataReader",
  "readerVersion": "0.9.202",
  "retrievedAt": "2026-10-20T08:18:48.793331+00:00",
  "period": {
    "start": "2025-09-02",
    "end": "2025-09-05"
  },
  "sourceSHA256": "6953d5f11a1ad251f6b2b30c5efbfd629e6547b31b0bdb21ae8cad47b570adc1",
  "observations": [
    {
      "day": "2025-09-02",
      "value": 1394.76
    },
    {
      "day": "2025-09-03",
      "value": 1389.21
    },
    {
      "day": "2025-09-04",
      "value": 1394.8
    },
    {
      "day": "2025-09-05",
      "value": 1385.28
    }
  ]
};
});
