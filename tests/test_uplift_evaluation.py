import unittest
import numpy as np
from src.causalmark.uplift.metrics import compute_cumulative_gain_curve, evaluate_uplift_metrics

class TestUpliftEvaluation(unittest.TestCase):
    def setUp(self):
        np.random.seed(42)
        n = 1000
        self.t = np.random.binomial(1, 0.5, n)
        # Synthetic causal effect: treatment adds +0.2 probability of conversion for high-score users
        score = np.random.uniform(0, 1, n)
        p = 0.05 + 0.20 * self.t * (score > 0.5)
        self.y = (np.random.uniform(0, 1, n) < p).astype(int)
        self.score = score

    def test_finite_auuc_and_qini(self):
        metrics = evaluate_uplift_metrics(self.y, self.t, self.score)
        self.assertTrue(metrics["is_finite"], "AUUC or Qini evaluated to NaN or Inf")
        self.assertFalse(np.isnan(metrics["auuc"]), "AUUC is NaN")
        self.assertFalse(np.isnan(metrics["qini_score"]), "Qini score is NaN")
        self.assertGreater(metrics["auuc"], 0, "Perfect synthetic ranking should have positive AUUC")

    def test_ranking_discrimination(self):
        # Good model vs. reversed model
        metrics_good = evaluate_uplift_metrics(self.y, self.t, self.score)
        metrics_reversed = evaluate_uplift_metrics(self.y, self.t, -self.score)
        self.assertGreater(
            metrics_good["qini_score"],
            metrics_reversed["qini_score"],
            "Correct uplift model should significantly outperform reversed model"
        )
        self.assertGreater(metrics_good["qini_score"], 0)
        self.assertLess(metrics_reversed["qini_score"], 0)

    def test_tied_scores_finite(self):
        tied_scores = np.ones_like(self.score) * 0.5
        metrics = evaluate_uplift_metrics(self.y, self.t, tied_scores)
        self.assertTrue(metrics["is_finite"])
        self.assertFalse(np.isnan(metrics["auuc"]))

    def test_single_treatment_group_raises(self):
        all_ones = np.ones_like(self.t)
        with self.assertRaises(ValueError):
            evaluate_uplift_metrics(self.y, all_ones, self.score)

    def test_no_nans_in_curve(self):
        curve = compute_cumulative_gain_curve(self.y, self.t, self.score)
        self.assertEqual(curve.isna().sum().sum(), 0, "Curve dataframe contains NaNs")
        self.assertEqual(curve.iloc[0]["target_fraction"], 0.0)
        self.assertEqual(curve.iloc[0]["uplift_gain"], 0.0)

if __name__ == "__main__":
    unittest.main()
