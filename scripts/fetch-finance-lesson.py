"""Print a reviewed historical FX snapshot as JSON; never overwrite app content.

Optional maintenance command, not an app runtime dependency. Fetch the exact same
FRED series directly to check observation dates: FinanceDataReader may forward-fill
missing values, which must not be presented as observed daily exchange rates.
"""
import argparse
import contextlib
import csv
from datetime import date, datetime, timezone
import hashlib
from importlib.metadata import version
import io
import json
import math
import multiprocessing
import sys
from urllib.request import urlopen


def validate_points(rows, start, end):
    points = []
    previous = None
    for row in rows:
        day = row['observation_date']
        date.fromisoformat(day)
        if not start <= day <= end or (previous and day <= previous):
            raise ValueError('Unexpected, duplicate or unsorted observation date')
        previous = day
        raw = row['DEXKOUS']
        value = None if raw in ('', '.') else float(raw)
        if value is not None and (not math.isfinite(value) or value <= 0):
            raise ValueError('Invalid positive exchange-rate observation')
        points.append({'day': day, 'value': value})
    if len([p for p in points if p['value'] is not None]) < 2:
        raise ValueError('Need at least two observed rates; no synthetic fallback')
    return points


def fetch_snapshot(start, end):
    import FinanceDataReader as fdr
    source_url = f'https://fred.stlouisfed.org/graph/fredgraph.csv?id=DEXKOUS&cosd={start}&coed={end}'
    with contextlib.redirect_stdout(sys.stderr):
        frame = fdr.DataReader('FRED:DEXKOUS', start, end)
    if frame is None or frame.empty or 'DEXKOUS' not in frame.columns:
        raise ValueError('FinanceDataReader returned no series')
    with urlopen(source_url, timeout=15) as response:
        raw = response.read(1_000_001)
    if len(raw) > 1_000_000:
        raise ValueError('Unexpectedly large source response')
    points = validate_points(list(csv.DictReader(io.StringIO(raw.decode('utf-8-sig')))), start, end)
    for point in points:
        if point['value'] is None:
            continue  # Keep original missingness, even if FDR has filled it.
        observed = float(frame.loc[point['day'], 'DEXKOUS'])
        if not math.isfinite(observed) or abs(observed - point['value']) > 0.000001:
            raise ValueError('FinanceDataReader disagrees with raw FRED observation')
    return {'version': 1, 'purpose': 'historical English teaching material',
            'series': 'DEXKOUS', 'pair': 'USD/KRW', 'unit': 'KRW per 1 USD',
            'source': 'Board of Governors of the Federal Reserve System (US), via FRED',
            'sourceUrl': 'https://fred.stlouisfed.org/series/DEXKOUS',
            'downloadUrl': source_url, 'reader': 'FinanceDataReader',
            'readerVersion': version('finance-datareader'),
            'retrievedAt': datetime.now(timezone.utc).isoformat(),
            'period': {'start': start, 'end': end},
            'sourceSHA256': hashlib.sha256(raw).hexdigest(), 'observations': points}


def worker(start, end, output):
    try:
        output.put({'snapshot': fetch_snapshot(start, end)})
    except Exception as error:
        output.put({'error': f'{type(error).__name__}: {error}'})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--start', default='2025-09-02')
    parser.add_argument('--end', default='2025-09-05')
    args = parser.parse_args()
    start, end = date.fromisoformat(args.start), date.fromisoformat(args.end)
    if not 0 < (end - start).days <= 31 or end >= date.today():
        parser.error('Choose a completed historical window of 1–31 days')
    # Bound the third-party reader too; its internal requests have no timeout.
    context = multiprocessing.get_context('spawn')
    output = context.Queue()
    process = context.Process(target=worker, args=(args.start, args.end, output))
    process.start()
    try:
        result = output.get(timeout=50)
        if 'error' in result:
            raise RuntimeError(result['error'])
        print(json.dumps(result['snapshot'], ensure_ascii=False, indent=2, allow_nan=False))
    finally:
        if process.is_alive():
            process.terminate()
        process.join()


if __name__ == '__main__':
    main()
