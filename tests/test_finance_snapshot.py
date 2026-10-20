"""The maintenance validator is tested without installing FinanceDataReader."""
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('finance_snapshot', Path(__file__).resolve().parents[1] / 'scripts/fetch-finance-lesson.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SnapshotQuality(unittest.TestCase):
    def validate(self, values):
        return module.validate_points([{'observation_date': day, 'DEXKOUS': value} for day, value in values], '2025-09-01', '2025-09-05')

    def test_missing_holiday_is_preserved_instead_of_forward_filled(self):
        result = self.validate([('2025-09-01','.'),('2025-09-02','1394.76'),('2025-09-05','1385.28')])
        self.assertIsNone(result[0]['value'])
        self.assertEqual(result[1]['value'],1394.76)

    def test_bad_values_and_insufficient_observations_fail(self):
        for value in ['nan','inf','-1','0','oops']:
            with self.subTest(value=value), self.assertRaises(ValueError):
                self.validate([('2025-09-02',value),('2025-09-05','1385.28')])
        with self.assertRaises(ValueError):
            self.validate([('2025-09-01','.'),('2025-09-02','1394.76')])

    def test_duplicate_unsorted_and_outside_dates_fail(self):
        for days in [('2025-09-02','2025-09-02'),('2025-09-05','2025-09-02'),('2025-09-02','2025-09-06'),('2025-09-02','2025-02-30')]:
            with self.subTest(days=days), self.assertRaises(ValueError):
                self.validate([(days[0],'1394.76'),(days[1],'1385.28')])


if __name__ == '__main__':
    unittest.main()
