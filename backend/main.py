import os
import sys
import json
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Ensure src and project root are always discoverable
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT / "src") not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT / "src"))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from causalmark.analysis_engine import analyze_experiment
from backend.notebook_service import NotebookService, assert_safe_path, assert_not_notebook, PROJECT_ROOT
from backend.data_service import DataService
from backend.uplift_service import UpliftService
from backend.rag_service import RagService

app = FastAPI(
    title="CausalMark Intelligence API",
    description="Backend service for CausalMark Marketing Experiment Intelligence & Uplift Analytics Platform",
    version="2.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ExperimentInput(BaseModel):
    experiment_id: str = "EXP001"
    treatment_conversions: int = Field(ge=0)
    treatment_users: int = Field(gt=0)
    control_conversions: int = Field(ge=0)
    control_users: int = Field(gt=0)
    alpha: float = Field(default=0.05, gt=0, lt=1)

class RagQueryInput(BaseModel):
    query: str

class ReportGenerateInput(BaseModel):
    report_type: str = Field(..., description="e.g. executive, uplift, model, project_readiness")
    title: str = "CausalMark Analytics Report"

@app.get("/")
def root():
    return {
        "service": "CausalMark Intelligence API",
        "status": "online",
        "version": "2.0.0",
        "docs_url": "/docs",
        "health_check": "/api/health",
        "overview": "/api/project/overview"
    }

@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "service": "CausalMark Intelligence Engine",
        "version": "2.0.0",
        "timestamp": datetime.now().isoformat(),
        "notebook_write_protection": "Active (OS chmod 444 + API Deny Policy)"
    }

@app.get("/api/project/overview")
def get_project_overview():
    # Load status & reports
    results_dir = PROJECT_ROOT / "results"
    eval_dir = PROJECT_ROOT / "data" / "evaluation"
    
    project_status_file = results_dir / "project_status.json"
    status_dict = {}
    if project_status_file.exists():
        with open(project_status_file) as f:
            status_dict = json.load(f)

    final_report_file = results_dir / "causalmark_final_report.json"
    final_report = {}
    if final_report_file.exists():
        with open(final_report_file) as f:
            final_report = json.load(f)

    # Notebook counts
    notebooks = NotebookService.list_notebooks()
    datasets = DataService.list_datasets()
    
    # Active dataset single-source-of-truth
    from backend.user_data_service import UserDataService
    active_summary = UserDataService.get_active_dataset_summary()
    uplift = UpliftService.get_uplift_summary()

    return {
        "project_name": "CausalMark",
        "tagline": "AI-Powered Marketing Experiment Intelligence & Uplift Platform",
        "read_only_protection": True,
        "status_checklist": status_dict,
        "final_report": final_report,
        "notebooks_count": len(notebooks),
        "datasets_count": len(datasets),
        "models_available": [
            {"name": "causalmark-qwen3-8b (Fine-Tuned LoRA)", "type": "Fine-tuned LLM", "status": "Ready"},
            {"name": "Two-Model Uplift Estimator (XGBoost)", "type": "Causal Uplift Model", "status": "Evaluated"}
        ],
        "active_dataset": active_summary,
        "latest_metrics": active_summary.get("metrics") if not active_summary["is_benchmark"] else uplift["metrics"],
        "causal_effect_verified": active_summary["causal_effect_verified"],
        "causal_status_label": active_summary["causal_status_label"],
        "is_benchmark": active_summary["is_benchmark"]
    }

# ----------------- Notebooks Endpoints (Strictly Read-Only) -----------------
@app.get("/api/notebooks")
def list_notebooks():
    return NotebookService.list_notebooks()

@app.get("/api/notebooks/{notebook_id}")
def get_notebook(notebook_id: str):
    return NotebookService.get_notebook_detail(notebook_id)

@app.post("/api/notebooks/{notebook_id}")
def disallow_notebook_write(notebook_id: str):
    raise HTTPException(status_code=403, detail="Notebook modification is strictly prohibited.")

# ----------------- Datasets Endpoints -----------------
@app.get("/api/datasets")
def list_datasets():
    return DataService.list_datasets()

@app.get("/api/datasets/preview")
def get_dataset_preview(category: str, filename: str, limit: int = 50, offset: int = 0):
    return DataService.get_dataset_preview(category, filename, limit, offset)

# ----------------- Experiments & Causal Analysis -----------------
@app.get("/api/experiments")
def get_saved_experiments():
    exp_file = PROJECT_ROOT / "data" / "marketing_instructions" / "experiment_data.csv"
    if not exp_file.exists():
        return []
    import pandas as pd
    df = pd.read_csv(exp_file)
    results = []
    for _, row in df.iterrows():
        analysis = analyze_experiment(
            int(row["treatment_conversions"]),
            int(row["treatment_users"]),
            int(row["control_conversions"]),
            int(row["control_users"])
        )
        results.append({
            "experiment_id": str(row["experiment_id"]),
            "treatment_conversions": int(row["treatment_conversions"]),
            "treatment_users": int(row["treatment_users"]),
            "control_conversions": int(row["control_conversions"]),
            "control_users": int(row["control_users"]),
            "analysis": analysis
        })
    return results

@app.post("/api/analyze")
def run_experiment_analysis(input_data: ExperimentInput):
    if input_data.treatment_conversions > input_data.treatment_users:
        raise HTTPException(400, "Treatment conversions exceed group size.")
    if input_data.control_conversions > input_data.control_users:
        raise HTTPException(400, "Control conversions exceed group size.")
        
    analysis = analyze_experiment(
        input_data.treatment_conversions,
        input_data.treatment_users,
        input_data.control_conversions,
        input_data.control_users,
        input_data.alpha
    )
    
    # Calculate Confidence Interval
    from api import calculate_lift_confidence_interval, build_experiment_summary
    ci = calculate_lift_confidence_interval(
        input_data.treatment_conversions,
        input_data.treatment_users,
        input_data.control_conversions,
        input_data.control_users
    )
    
    res = {
        "experiment_id": input_data.experiment_id,
        **analysis,
        "confidence_interval": ci
    }
    res["summary"] = build_experiment_summary(res)
    return res

# ----------------- Uplift Endpoints -----------------
@app.get("/api/uplift/summary")
def get_uplift_summary():
    return UpliftService.get_uplift_summary()

@app.get("/api/uplift/deciles")
def get_uplift_deciles():
    return UpliftService.get_deciles()

@app.get("/api/uplift/strategies")
def get_uplift_strategies():
    return UpliftService.get_strategies()

@app.get("/api/uplift/observed_deciles")
def get_observed_deciles():
    return UpliftService.get_observed_conversion_by_decile()

# ----------------- RAG Intelligence Endpoints -----------------
@app.get("/api/rag/status")
def get_rag_status():
    return RagService.get_status()

@app.get("/api/rag/documents")
def get_rag_documents():
    return RagService.list_documents()

@app.post("/api/rag/query")
def query_rag(payload: RagQueryInput):
    return RagService.query_evidence(payload.query)

# ----------------- Evaluation & Reports Endpoints -----------------
@app.get("/api/evaluation/artifacts")
def get_evaluation_artifacts():
    eval_dir = PROJECT_ROOT / "data" / "evaluation"
    artifacts = []
    if eval_dir.exists():
        for f in sorted(eval_dir.glob("*")):
            if f.is_file():
                artifacts.append({
                    "filename": f.name,
                    "size_bytes": f.stat().st_size,
                    "extension": f.suffix,
                    "modified_at": f.stat().st_mtime
                })
    return artifacts

@app.get("/api/reports")
def list_reports():
    reports_dir = PROJECT_ROOT / "results"
    reports = []
    if reports_dir.exists():
        for r in reports_dir.glob("*.json"):
            reports.append({
                "name": r.name,
                "path": str(r.relative_to(PROJECT_ROOT)),
                "size_bytes": r.stat().st_size,
                "type": "JSON Report"
            })
        for r in reports_dir.glob("*.md"):
            reports.append({
                "name": r.name,
                "path": str(r.relative_to(PROJECT_ROOT)),
                "size_bytes": r.stat().st_size,
                "type": "Markdown Report"
            })
    return reports

@app.post("/api/reports/generate")
def generate_report(req: ReportGenerateInput):
    """Generate safe report into results/reports/ without modifying notebooks"""
    reports_dir = PROJECT_ROOT / "results" / "generated_reports"
    reports_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_filename = f"report_{req.report_type}_{timestamp}.json"
    target_path = reports_dir / report_filename
    
    assert_not_notebook(target_path)
    assert_safe_path(target_path)

    uplift = UpliftService.get_uplift_summary()
    report_payload = {
        "title": req.title,
        "report_type": req.report_type,
        "generated_at": datetime.now().isoformat(),
        "input_artifacts": [
            "data/evaluation/criteo_uplift_final_summary.json",
            "data/evaluation/causalmark_final_model_metrics.csv"
        ],
        "metrics_summary": uplift["metrics"],
        "causal_effect_verified": uplift["causal_effect_verified"],
        "status": "Generated successfully in isolated workspace"
    }

    with open(target_path, "w", encoding="utf-8") as f:
        json.dump(report_payload, f, indent=2)

    return {
        "message": f"Report generated successfully: {report_filename}",
        "filename": report_filename,
        "relative_path": str(target_path.relative_to(PROJECT_ROOT)),
        "data": report_payload
    }

# ----------------- Feature 1: Ask CausalMark AI Endpoints -----------------
from backend.local_ai_service import LocalAiService

class ChatQueryInput(BaseModel):
    query: str
    chat_history: Optional[List[Dict[str, str]]] = None

@app.get("/api/ai/models")
def get_ai_models():
    models = LocalAiService.get_installed_models()
    preferred = LocalAiService.get_preferred_model()
    return {
        "installed_models": models,
        "preferred_model": preferred,
        "ollama_available": len(models) > 0
    }

@app.post("/api/ai/chat")
def chat_ai(payload: ChatQueryInput):
    if not payload.query or not payload.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    return LocalAiService.generate_chat_response(payload.query, payload.chat_history)

# ----------------- Feature 2: User Dataset Upload & Analysis Endpoints -----------------
from fastapi import UploadFile, File, Form
from backend.user_data_service import UserDataService

class UserAnalysisRequest(BaseModel):
    upload_id: str
    treatment_column: str
    outcome_column: str
    customer_id_column: Optional[str] = None
    treatment_val: Optional[str] = None
    control_val: Optional[str] = None
    alpha: float = 0.05

class SelectActiveRequest(BaseModel):
    dataset_id: str

@app.get("/api/active-dataset")
def get_active_dataset():
    return UserDataService.get_active_dataset_summary()

@app.post("/api/active-dataset/select")
def set_active_dataset(payload: SelectActiveRequest):
    return UserDataService.set_active_dataset_id(payload.dataset_id)

@app.get("/api/user-datasets")
def list_user_datasets():
    return UserDataService.get_manifest()

@app.post("/api/user-datasets/upload")
async def upload_user_dataset(file: UploadFile = File(...)):
    return await UserDataService.process_upload(file)

@app.get("/api/user-datasets/{upload_id}")
def get_user_dataset(upload_id: str):
    return UserDataService.get_upload_detail(upload_id)

@app.delete("/api/user-datasets/{upload_id}")
def delete_user_dataset(upload_id: str):
    return UserDataService.delete_upload(upload_id)

@app.post("/api/user-datasets/analyze")
def analyze_user_dataset(req: UserAnalysisRequest):
    return UserDataService.run_user_analysis(
        upload_id=req.upload_id,
        treatment_col=req.treatment_column,
        outcome_col=req.outcome_column,
        customer_id_col=req.customer_id_column,
        treatment_val=req.treatment_val,
        control_val=req.control_val,
        alpha=req.alpha
    )

# ----------------- Production ML Uplift Inference Endpoints -----------------
from backend.ml_uplift_service import (
    MlUpliftService,
    UpliftPredictBatchRequest,
    UpliftPredictionResponse,
    CustomerFeatureRecord
)

@app.get("/api/ml/uplift/metadata")
def get_ml_uplift_metadata():
    """Retrieve metadata, parameters, and training provenance for the production ML uplift model."""
    meta = MlUpliftService.get_metadata()
    comp = MlUpliftService.get_comparison_report()
    return {
        "metadata": meta,
        "comparison_report": comp
    }

@app.get("/api/ml/uplift/sample-payload")
def get_ml_uplift_sample_payload():
    """Returns genuine verified sample customer feature vectors from criteo_sample_50000.csv."""
    samples = MlUpliftService.get_sample_customer_payload()
    return {
        "count": len(samples),
        "customers": samples
    }

@app.post("/api/ml/uplift/predict", response_model=UpliftPredictionResponse)
def predict_ml_uplift(payload: UpliftPredictBatchRequest):
    """
    Genuine ML Uplift Prediction Endpoint:
    Accepts validated customer feature records and runs the trained champion ML model (X-Learner, T-Learner, or S-Learner).
    Returns real control conversion probability, treatment conversion probability, uplift, and targeting decisions.
    """
    try:
        customer_dicts = [c.dict() for c in payload.customers]
        return MlUpliftService.predict(
            customer_records=customer_dicts,
            model_name=payload.model_name or "X-Learner"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failure: {str(e)}")

class HybridQueryInput(BaseModel):
    query: str
    customers: Optional[List[CustomerFeatureRecord]] = None
    model_name: Optional[str] = "X-Learner"

@app.post("/api/ai/hybrid-query")
def hybrid_ai_query(payload: HybridQueryInput):
    """
    Orchestrated Hybrid Workflow:
    1. Evaluates user marketing query.
    2. Determines if ML uplift prediction is needed.
    3. If ML prediction is needed, invokes the genuine ML uplift model on customer features.
    4. Passes real numerical predictions to Qwen 8B for explanation.
    5. Returns both numerical ML results and natural-language explanation separately.
    6. For general questions, routes directly to evidence-grounded Qwen.
    """
    query_lower = payload.query.lower()
    uplift_keywords = [
        "predict", "uplift", "score", "targeting", "treatment effect",
        "persuadable", "sleeping dog", "conversion probability", "cate", "ite"
    ]
    needs_ml = any(k in query_lower for k in uplift_keywords)

    if needs_ml:
        # Obtain customers either from payload or from genuine sample payload
        if payload.customers and len(payload.customers) > 0:
            cust_dicts = [c.dict() for c in payload.customers]
        else:
            cust_dicts = MlUpliftService.get_sample_customer_payload()

        if not cust_dicts:
            raise HTTPException(
                status_code=400,
                detail="Customer features required for ML uplift prediction but no customer data was provided."
            )

        # Step 4: ML model performs numerical prediction
        ml_result = MlUpliftService.predict(
            customer_records=cust_dicts,
            model_name=payload.model_name or "X-Learner"
        )
        ml_dict = ml_result.dict()

        # Step 5: Backend passes real model output to Qwen for explanation
        explanation_res = LocalAiService.explain_ml_prediction(
            prediction_result=ml_dict,
            user_intent=payload.query
        )

        # Step 6: Return numerical results separately from natural-language explanation
        return {
            "query": payload.query,
            "requires_ml": True,
            "ml_prediction": ml_dict,
            "ai_explanation": explanation_res["explanation"],
            "model_used": explanation_res["model_used"],
            "model_name": ml_dict["model_name"]
        }
    else:
        # Step 2 -> General question: preserve standard Qwen workflow
        chat_res = LocalAiService.generate_chat_response(payload.query)
        return {
            "query": payload.query,
            "requires_ml": False,
            "ml_prediction": None,
            "ai_explanation": chat_res["answer"],
            "citations": chat_res["citations"],
            "model_used": chat_res["model"],
            "grounded": chat_res.get("grounded", True)
        }



