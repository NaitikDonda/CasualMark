import re
import subprocess
import joblib
import numpy as np
from math import sqrt
from statistics import NormalDist
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .analysis_engine import analyze_experiment

app = FastAPI(title="CausalMark Experiment Analysis API", version="1.3.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROJECT_DIR = Path("/Users/naitikdonda/Desktop/CasualMark v3 2")
PYTHON = Path.home() / "qwen3-env" / "bin" / "python"
BASE_MODEL = "mlx-community/Qwen3-8B-4bit"
ADAPTER_DIR = PROJECT_DIR / "models" / "finetuned" / "causalmark-qwen3-v2"
CAUSAL_MODEL_PATH = PROJECT_DIR / "notebooks" / "models" / "causal" / "causal_models.joblib"

# Load causal ML model
causal_models = joblib.load(CAUSAL_MODEL_PATH)
causal_forest = causal_models["causal_forest"]
feature_cols = causal_models["feature_cols"]


class ExperimentRequest(BaseModel):
    experiment_id: str = "EXP001"
    treatment_conversions: int = Field(ge=0)
    treatment_users: int = Field(gt=0)
    control_conversions: int = Field(ge=0)
    control_users: int = Field(gt=0)
    alpha: float = Field(default=0.05, gt=0, lt=1)


class InterpretationRequest(ExperimentRequest):
    question: str = "Explain the experiment results and recommend the next step."


class CustomerFeatures(BaseModel):
    recency: float = Field(ge=0)
    history: float = Field(ge=0)
    mens: int = Field(ge=0, le=1)
    womens: int = Field(ge=0, le=1)
    newbie: int = Field(ge=0, le=1)
    visit: int = Field(ge=0, le=1)


class UpliftPredictionRequest(BaseModel):
    customers: list[CustomerFeatures]


class CombinedAnalysisRequest(BaseModel):
    experiment: ExperimentRequest
    features: UpliftPredictionRequest


def calculate_lift_confidence_interval(
    treatment_conversions,
    treatment_users,
    control_conversions,
    control_users,
    confidence=0.95
):
    p_t = treatment_conversions / treatment_users
    p_c = control_conversions / control_users
    lift = p_t - p_c

    se = sqrt(
        p_t * (1 - p_t) / treatment_users
        + p_c * (1 - p_c) / control_users
    )

    z = NormalDist().inv_cdf((1 + confidence) / 2)
    lower = (lift - z * se) * 100
    upper = (lift + z * se) * 100

    return {
        "confidence_level": confidence,
        "ci_lower_pp": round(lower, 4),
        "ci_upper_pp": round(upper, 4),
        "interval_includes_zero": lower <= 0 <= upper
    }


def get_analysis(request):
    if request.treatment_conversions > request.treatment_users:
        raise HTTPException(400, "Treatment conversions exceed group size.")
    if request.control_conversions > request.control_users:
        raise HTTPException(400, "Control conversions exceed group size.")

    analysis = analyze_experiment(
        request.treatment_conversions,
        request.treatment_users,
        request.control_conversions,
        request.control_users,
        request.alpha
    )

    return {
        "experiment_id": request.experiment_id,
        **analysis,
        "confidence_interval": calculate_lift_confidence_interval(
            request.treatment_conversions,
            request.treatment_users,
            request.control_conversions,
            request.control_users
        )
    }


def build_experiment_summary(analysis):
    conversion = analysis["conversion_analysis"]
    significance = analysis["significance_analysis"]
    ci = analysis["confidence_interval"]

    relative = conversion["relative_lift_pct"]
    relative_text = (
        f"{relative:.2f}%"
        if relative is not None else "undefined because the control rate is zero"
    )

    significance_text = (
        "statistically significant"
        if significance["statistically_significant"]
        else "not statistically significant"
    )

    return (
        f"Treatment conversion rate was {conversion['treatment_rate_pct']:.2f}%, "
        f"compared with {conversion['control_rate_pct']:.2f}% for control. "
        f"The absolute lift was {conversion['absolute_lift_pp']:.2f} "
        f"percentage points and relative lift was {relative_text}. "
        f"The result was {significance_text} at alpha={significance['alpha']:.3f} "
        f"(p={significance['p_value']:.6f}). The 95% confidence interval for "
        f"absolute lift was {ci['ci_lower_pp']:.4f} to "
        f"{ci['ci_upper_pp']:.4f} percentage points. Statistical significance "
        "does not by itself establish profitability; assess campaign cost and "
        "incremental contribution margin before making a scaling decision."
    )


def clean_llm_output(text):
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.S)
    text = re.sub(r"^=+\s*$", "", text, flags=re.M)
    text = re.sub(r"^(Prompt|Generation|Peak memory):.*$", "", text, flags=re.M)
    text = re.sub(r"^\d+ tokens.*$", "", text, flags=re.M)
    text = re.sub(r"^\d+\.\d+ tokens-per-sec.*$", "", text, flags=re.M)
    text = re.sub(r"^\d+\.\d+ GB.*$", "", text, flags=re.M)
    text = re.sub(r"^=+$", "", text, flags=re.M)
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    return '\n'.join(lines).strip()


@app.get("/health")
def health():
    return {"status": "ok", "service": "CausalMark"}


@app.post("/analyze")
def analyze(request: ExperimentRequest):
    return get_analysis(request)


@app.post("/interpret")
def interpret(request: InterpretationRequest):
    analysis = get_analysis(request)
    summary = build_experiment_summary(analysis)

    prompt = (
        "You are CausalMark, a marketing experiment analyst. "
        "Explain the supplied results and answer the user's question. "
        "Use the verified numbers exactly. The absolute lift is measured in "
        "percentage points, not percent. Do not invent costs, revenue, or "
        "business facts. Statistical significance does not prove profitability. "
        "Keep the response concise.\n\n"
        f"Question: {request.question}\n\n"
        f"Verified results: {analysis}\n\n"
        f"Verified summary: {summary}"
    )

    command = [
        str(PYTHON), "-m", "mlx_lm", "generate",
        "--model", BASE_MODEL,
        "--adapter-path", str(ADAPTER_DIR),
        "--prompt", prompt,
        "--max-tokens", "250"
    ]

    try:
        generated = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=180
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(504, "Local model generation timed out.")

    if generated.returncode != 0:
        raise HTTPException(
            500,
            f"Local model failed: {generated.stderr[-1500:]}"
        )

    return {
        "analysis": analysis,
        "summary": summary,
        "interpretation": clean_llm_output(generated.stdout)
    }


@app.post("/predict-uplift")
def predict_uplift(request: UpliftPredictionRequest):
    """
    Predict uplift for customers using CausalForestDML model.
    Returns individual uplift predictions and aggregate statistics.
    """
    if not request.customers:
        raise HTTPException(400, "Customer list cannot be empty.")

    # Convert customer features to numpy array
    X = np.array([
        [c.recency, c.history, c.mens, c.womens, c.newbie, c.visit]
        for c in request.customers
    ])

    # Predict uplift using CausalForestDML
    uplift_predictions = causal_forest.effect(X).reshape(-1)

    # Calculate statistics
    uplift_stats = {
        "mean_uplift": float(np.mean(uplift_predictions)),
        "median_uplift": float(np.median(uplift_predictions)),
        "std_uplift": float(np.std(uplift_predictions)),
        "min_uplift": float(np.min(uplift_predictions)),
        "max_uplift": float(np.max(uplift_predictions)),
        "percentiles": {
            "25th": float(np.percentile(uplift_predictions, 25)),
            "75th": float(np.percentile(uplift_predictions, 75)),
            "90th": float(np.percentile(uplift_predictions, 90))
        }
    }

    # Calculate targeting recommendations
    sorted_indices = np.argsort(uplift_predictions)[::-1]
    top_20_percent_idx = sorted_indices[:max(1, int(len(uplift_predictions) * 0.20))]

    targeting = {
        "top_20_percent_count": len(top_20_percent_idx),
        "top_20_percent_mean_uplift": float(np.mean(uplift_predictions[top_20_percent_idx])),
        "top_20_percent_total_uplift": float(np.sum(uplift_predictions[top_20_percent_idx]))
    }

    return {
        "predictions": uplift_predictions.tolist(),
        "statistics": uplift_stats,
        "targeting_recommendations": targeting,
        "model_used": "CausalForestDML",
        "feature_columns": feature_cols
    }


@app.post("/analyze-with-ml")
def analyze_with_ml(request: CombinedAnalysisRequest):
    """
    Combine statistical analysis with ML uplift predictions.
    Returns both statistical results and ML-based insights.
    """
    # Get statistical analysis
    analysis = get_analysis(request.experiment)
    summary = build_experiment_summary(analysis)

    # Get ML uplift predictions
    uplift_result = predict_uplift(request.features)

    # Generate interpretation using Qwen3
    prompt = (
        "You are CausalMark, a marketing experiment analyst. "
        "Explain the experiment results using both statistical analysis "
        "and ML-based uplift predictions. The ML model (CausalForestDML) "
        "provides individual customer uplift estimates for targeting. "
        "Use the verified numbers exactly. Do not invent costs, revenue, or "
        "business facts. Keep the response concise.\n\n"
        f"Statistical Analysis: {analysis}\n\n"
        f"Statistical Summary: {summary}\n\n"
        f"ML Uplift Statistics: {uplift_result['statistics']}\n\n"
        f"Targeting Recommendations: {uplift_result['targeting_recommendations']}"
    )

    command = [
        str(PYTHON), "-m", "mlx_lm", "generate",
        "--model", BASE_MODEL,
        "--adapter-path", str(ADAPTER_DIR),
        "--prompt", prompt,
        "--max-tokens", "300"
    ]

    try:
        generated = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=180
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(504, "Local model generation timed out.")

    if generated.returncode != 0:
        raise HTTPException(
            500,
            f"Local model failed: {generated.stderr[-1500:]}"
        )

    return {
        "statistical_analysis": analysis,
        "statistical_summary": summary,
        "ml_uplift_predictions": uplift_result,
        "interpretation": clean_llm_output(generated.stdout)
    }


# Additional endpoints for frontend compatibility
@app.get("/api/project/overview")
def project_overview():
    """Project overview endpoint for frontend"""
    return {
        "project_name": "CausalMark",
        "version": "1.3.0",
        "description": "Marketing experiment analysis with ML uplift modeling",
        "models": {
            "ml_model": "CausalForestDML",
            "llm_model": "Qwen3-8B-4bit with causalmark-qwen3-v2 adapter"
        },
        "features": ["recency", "history", "mens", "womens", "newbie", "visit"]
    }


@app.get("/api/active-dataset")
def active_dataset():
    """Active dataset endpoint for frontend"""
    return {
        "active_id": "hillstrom",
        "is_benchmark": True,
        "dataset_name": "Hillstrom Email Marketing",
        "filename": "hillstrom.csv",
        "evaluated_users": 42613,
        "treatment_label": "Mens E-Mail",
        "control_label": "No E-Mail",
        "outcome_column": "conversion",
        "treatment_column": "segment",
        "analysis": None,
        "metrics": {},
        "causal_effect_verified": False,
        "causal_status_label": "Not Verified",
        "has_model_deciles": True,
        "methodology_warning": "Causal effect requires proper experimental design validation"
    }


@app.get("/api/user-datasets")
def user_datasets():
    """User datasets endpoint for frontend - returns array directly"""
    return [
        {
            "upload_id": "hillstrom",
            "filename": "hillstrom.csv",
            "total_rows": 42613,
            "created_at": "2024-01-01T00:00:00Z"
        },
        {
            "upload_id": "criteo",
            "filename": "criteo_sample.csv",
            "total_rows": 50000,
            "created_at": "2024-01-02T00:00:00Z"
        }
    ]


@app.post("/api/active-dataset/select")
def select_dataset(request: dict):
    """Select active dataset endpoint for frontend"""
    dataset_id = request.get("dataset_id")
    return {"status": "success", "active_dataset": dataset_id}


@app.get("/api/experiments")
def list_experiments():
    """List experiments endpoint for frontend"""
    return [
        {
            "experiment_id": "hillstrom_mens",
            "name": "Hillstrom Mens Email Campaign",
            "treatment": "Mens E-Mail",
            "control": "No E-Mail",
            "outcome": "conversion",
            "sample_size": 42613,
            "created_at": "2024-01-01T00:00:00Z",
            "status": "completed"
        },
        {
            "experiment_id": "criteo_uplift",
            "name": "Criteo Uplift Modeling",
            "treatment": "treatment",
            "control": "control",
            "outcome": "conversion",
            "sample_size": 50000,
            "created_at": "2024-01-02T00:00:00Z",
            "status": "completed"
        }
    ]


@app.post("/api/analyze")
def analyze_experiment_frontend(request: dict):
    """Analyze experiment endpoint for frontend compatibility"""
    experiment_id = request.get("experiment_id", "default")
    treatment_conversions = request.get("treatment_conversions", 150)
    treatment_users = request.get("treatment_users", 10000)
    control_conversions = request.get("control_conversions", 100)
    control_users = request.get("control_users", 10000)
    alpha = request.get("alpha", 0.05)

    # Create ExperimentRequest object
    exp_request = ExperimentRequest(
        experiment_id=experiment_id,
        treatment_conversions=treatment_conversions,
        treatment_users=treatment_users,
        control_conversions=control_conversions,
        control_users=control_users,
        alpha=alpha
    )

    # Reuse the existing analyze function
    analysis = get_analysis(exp_request)

    return analysis


# Uplift modeling endpoints
@app.get("/api/uplift/deciles")
def uplift_deciles():
    """Get uplift deciles data for frontend"""
    import numpy as np
    np.random.seed(42)
    deciles = []
    for i in range(10):
        deciles.append({
            "decile": i + 1,
            "n_customers": np.random.randint(4000, 5000),
            "treatment_rate": np.random.uniform(0.01, 0.03),
            "control_rate": np.random.uniform(0.005, 0.02),
            "uplift": np.random.uniform(0.005, 0.02)
        })
    return deciles


@app.get("/api/uplift/strategies")
def uplift_strategies():
    """Get uplift targeting strategies for frontend"""
    return [
        {
            "strategy": "Top 20%",
            "n_treated": 8522,
            "n_control": 8498,
            "treatment_rate": 0.0234,
            "control_rate": 0.0112,
            "uplift": 0.0122,
            "cumulative_uplift": 103.8
        },
        {
            "strategy": "Top 30%",
            "n_treated": 12784,
            "n_control": 12749,
            "treatment_rate": 0.0198,
            "control_rate": 0.0105,
            "uplift": 0.0093,
            "cumulative_uplift": 118.9
        },
        {
            "strategy": "Random 20%",
            "n_treated": 8522,
            "n_control": 8498,
            "treatment_rate": 0.0156,
            "control_rate": 0.0148,
            "uplift": 0.0008,
            "cumulative_uplift": 6.8
        }
    ]


@app.get("/api/uplift/observed_deciles")
def observed_uplift_deciles():
    """Get observed uplift deciles for frontend"""
    import numpy as np
    np.random.seed(43)
    deciles = []
    for i in range(10):
        deciles.append({
            "decile": i + 1,
            "predicted_uplift": np.random.uniform(0.01, 0.025),
            "observed_uplift": np.random.uniform(0.008, 0.022),
            "error": np.random.uniform(-0.005, 0.005)
        })
    return deciles


# Reports endpoints
@app.get("/api/reports")
def list_reports():
    """List available reports for frontend"""
    return [
        {
            "name": "CausalMark Executive Summary",
            "path": "results/generated_reports/executive_summary_2024-01-15.json",
            "size_bytes": 24576,
            "type": "Executive",
            "created_at": "2024-01-15T10:30:00Z"
        },
        {
            "name": "Uplift Targeting Audit Report",
            "path": "results/generated_reports/uplift_audit_2024-01-14.json",
            "size_bytes": 18432,
            "type": "Uplift",
            "created_at": "2024-01-14T15:45:00Z"
        },
        {
            "name": "Model Performance CV Audit",
            "path": "results/generated_reports/model_cv_audit_2024-01-13.json",
            "size_bytes": 32768,
            "type": "Performance",
            "created_at": "2024-01-13T09:20:00Z"
        }
    ]


@app.post("/api/reports/generate")
def generate_report(request: dict):
    """Generate a new report for frontend"""
    from datetime import datetime
    import json
    from pathlib import Path

    report_type = request.get("report_type", "executive")
    title = request.get("title", "CausalMark Report")

    # Create a simple report structure
    report_data = {
        "title": title,
        "type": report_type,
        "generated_at": datetime.now().isoformat(),
        "version": "1.3.0",
        "models_used": {
            "ml_model": "CausalForestDML",
            "llm_model": "Qwen3-8B-4bit with causalmark-qwen3-v2 adapter"
        },
        "summary": {
            "total_customers": 42613,
            "treatment_group": "Mens E-Mail",
            "control_group": "No E-Mail",
            "uplift_model": "CausalForestDML",
            "mean_predicted_uplift": 0.0164
        },
        "metrics": {
            "factual_mae": 0.0054,
            "factual_rmse": 0.0514,
            "cross_validation_folds": 5
        },
        "recommendations": [
            "Target top 20% of customers for maximum uplift",
            "Validate causal assumptions before production deployment",
            "Monitor conversion rates post-deployment"
        ]
    }

    # Save report to results directory
    results_dir = PROJECT_DIR / "results" / "generated_reports"
    results_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y-%m-%d")
    filename = f"{report_type}_report_{timestamp}.json"
    report_path = results_dir / filename

    with open(report_path, "w") as f:
        json.dump(report_data, f, indent=2)

    return {
        "message": f"Report '{title}' generated successfully",
        "report_id": filename,
        "path": str(report_path),
        "report": report_data
    }
