import re
import subprocess
from math import sqrt
from statistics import NormalDist
from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from causalmark.analysis_engine import analyze_experiment

app = FastAPI(title="CausalMark Experiment Analysis API", version="1.2.0")

PROJECT_DIR = Path("/Users/naitikdonda/Desktop/CasualMark v3")
PYTHON = Path.home() / "qwen3-env" / "bin" / "python"
BASE_MODEL = "mlx-community/Qwen3-8B-4bit"
ADAPTER_DIR = PROJECT_DIR / "models" / "finetuned" / "causalmark-qwen3-v2"


class ExperimentRequest(BaseModel):
    experiment_id: str = "EXP001"
    treatment_conversions: int = Field(ge=0)
    treatment_users: int = Field(gt=0)
    control_conversions: int = Field(ge=0)
    control_users: int = Field(gt=0)
    alpha: float = Field(default=0.05, gt=0, lt=1)


class InterpretationRequest(ExperimentRequest):
    question: str = "Explain the experiment results and recommend the next step."


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
    return re.sub(r"\n{3,}", "\n\n", text).strip()


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
