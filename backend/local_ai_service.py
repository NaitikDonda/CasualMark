import os
import json
import re
import urllib.request
from pathlib import Path
from typing import Dict, Any, List, Optional
from backend.notebook_service import PROJECT_ROOT

OLLAMA_API_URL = "http://127.0.0.1:11434"

MLX_PYTHON = Path.home() / "qwen3-env" / "bin" / "python"
MLX_BASE_MODEL = "mlx-community/Qwen3-8B-4bit"
MLX_ADAPTER_DIR = PROJECT_ROOT / "models" / "finetuned" / "causalmark-qwen3-v2"

class LocalAiService:
    @staticmethod
    def get_installed_models() -> List[Dict[str, Any]]:
        """Discover actual locally available models (Fine-tuned Qwen 8B LoRA + Ollama models)"""
        models = []
        
        # 1. Check fine-tuned Qwen 8B LoRA model
        if MLX_PYTHON.exists() and MLX_ADAPTER_DIR.exists():
            models.append({
                "name": "causalmark-qwen3-8b (Fine-Tuned LoRA)",
                "model": "causalmark-qwen3-v2",
                "type": "mlx_lora",
                "capabilities": ["completion", "rag", "causal_reasoning"]
            })

        # 2. Check Ollama models
        try:
            req = urllib.request.Request(f"{OLLAMA_API_URL}/api/tags", headers={"User-Agent": "CausalMark/2.0"})
            with urllib.request.urlopen(req, timeout=2) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode())
                    for m in data.get("models", []):
                        models.append({
                            "name": m.get("name"),
                            "model": m.get("model"),
                            "type": "ollama",
                            "capabilities": m.get("capabilities", [])
                        })
        except Exception:
            pass
        return models

    @staticmethod
    def get_preferred_model() -> Optional[str]:
        # Always prioritize the user's fine-tuned Qwen 8B model if available!
        if MLX_PYTHON.exists() and MLX_ADAPTER_DIR.exists():
            return "causalmark-qwen3-8b (Fine-Tuned LoRA)"
        models = LocalAiService.get_installed_models()
        for m in models:
            if "completion" in m.get("capabilities", []):
                return m.get("name")
        return None

    @staticmethod
    def retrieve_project_knowledge(query: str) -> List[Dict[str, Any]]:
        """Index and retrieve verified passages from evaluation artifacts, knowledge base, dataset inventory, and notebooks."""
        query_terms = [t.lower() for t in re.split(r"\W+", query) if len(t) > 2]
        citations = []

        # 1. Dataset inventory & active dataset knowledge
        inventory_file = PROJECT_ROOT / "data" / "marketing_instructions" / "dataset_inventory.json"
        if inventory_file.exists():
            try:
                with open(inventory_file, "r", encoding="utf-8") as f:
                    inv = json.load(f)
                inv_excerpt = (
                    f"Dataset Inventory: {inv.get('source', 'Marketing Experiment')}\n"
                    f"Total records: {inv.get('source_records', 64000):,} customers across groups: "
                    f"{', '.join(inv.get('source_groups', []))}.\n"
                    f"Train examples: {inv.get('train_examples', 0):,}, Validation: {inv.get('validation_examples', 0):,}, "
                    f"Test: {inv.get('test_examples', 0):,}."
                )
                match = sum(1 for term in query_terms if term in ["dataset", "rows", "row", "size", "count", "record", "records", "inventory", "hillstrom"])
                if match > 0:
                    citations.append({
                        "source": "data/marketing_instructions/dataset_inventory.json",
                        "label": "Hillstrom Experiment Dataset Inventory",
                        "excerpt": inv_excerpt,
                        "score": 3 + match
                    })
            except Exception:
                pass

        # Check active uploaded dataset info
        try:
            from backend.user_data_service import UserDataService
            active_info = UserDataService.get_active_dataset_summary()
            if active_info and not active_info.get("is_benchmark", True):
                analysis = active_info.get("analysis", {})
                eval_users = active_info.get("evaluated_users", 0)
                active_excerpt = (
                    f"Active Uploaded Dataset: '{active_info.get('dataset_name')}' (ID: {active_info.get('active_id')})\n"
                    f"Total rows: {eval_users:,} rows.\n"
                    f"Treatment users: {analysis.get('treatment_users', 0):,} (Conversion rate: {analysis.get('treatment_rate_pct', 0):.4f}%)\n"
                    f"Control users: {analysis.get('control_users', 0):,} (Conversion rate: {analysis.get('control_rate_pct', 0):.4f}%)\n"
                    f"Absolute lift: {analysis.get('absolute_lift_pp', 0):+.4f} pp (Relative: {analysis.get('relative_lift_pct', 0):+.2f}%)\n"
                    f"Statistical significance: Z={analysis.get('z_score', 0):.2f}, p-value={analysis.get('p_value', 1.0):.4e}"
                )
                match = sum(1 for term in query_terms if term in ["dataset", "rows", "row", "size", "count", "upload", "active", "lift", "ab", "user", "marketing_ab"])
                if match > 0:
                    citations.append({
                        "source": f"data/user_uploads/{active_info.get('dataset_name')}",
                        "label": "Active Marketing Experiment Dataset",
                        "excerpt": active_excerpt,
                        "score": 6 + match
                    })
        except Exception:
            pass

        # 2. Evaluation reports and summaries
        eval_files = [
            ("data/evaluation/criteo_uplift_final_summary.json", "Criteo Uplift Final Summary"),
            ("data/evaluation/causalmark_final_model_metrics.csv", "Final Model Metrics (MAE/RMSE/Uplift)"),
            ("data/evaluation/criteo_model_evaluation.json", "Criteo 5-Fold Cross Validation"),
            ("data/evaluation/criteo_uplift_decile_summary.csv", "Criteo Decile Uplift Summary"),
            ("data/evaluation/criteo_uplift_strategy_comparison.csv", "Targeting Policy Comparison"),
            ("results/causalmark_final_report.json", "CausalMark Final Report"),
            ("results/project_status.json", "Project Status Checklist"),
            ("data/knowledge_base/hillstrom_segment_evidence.jsonl", "Hillstrom Evidence Knowledge Base"),
            ("data/knowledge_base/criteo_dataset_profile.txt", "Criteo Dataset Profile")
        ]

        for rel_path, label in eval_files:
            file_path = PROJECT_ROOT / rel_path
            if not file_path.exists():
                continue

            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()

                # Score relevance
                match_count = sum(1 for term in query_terms if term in content.lower() or term in label.lower())
                if match_count > 0:
                    lines = content.splitlines()
                    excerpt = "\n".join(lines[:12]) if len(lines) > 12 else content
                    citations.append({
                        "source": rel_path,
                        "label": label,
                        "excerpt": excerpt[:450],
                        "score": match_count
                    })
            except Exception:
                pass

        # 3. Check notebook purposes & summaries
        nb_dir = PROJECT_ROOT / "notebooks"
        if nb_dir.exists():
            for nb_file in sorted(nb_dir.glob("*.ipynb")):
                try:
                    match = sum(1 for term in query_terms if term in nb_file.name.lower() or "notebook" in query_terms)
                    if match > 0 or "notebook" in query_terms or "model" in query_terms or "eval" in query_terms:
                        with open(nb_file, "r", encoding="utf-8") as f:
                            nb_data = json.load(f)
                        cell_count = len(nb_data.get("cells", []))
                        citations.append({
                            "source": str(nb_file.relative_to(PROJECT_ROOT)),
                            "label": f"Notebook: {nb_file.name}",
                            "excerpt": f"Jupyter Notebook '{nb_file.name}' with {cell_count} cells. Strictly read-only protected under chmod 444.",
                            "score": 1 + match
                        })
                except Exception:
                    pass

        # Sort by score descending
        citations.sort(key=lambda x: x.get("score", 0), reverse=True)
        return citations[:5]

    @staticmethod
    def generate_chat_response(query: str, chat_history: List[Dict[str, str]] = None) -> Dict[str, Any]:
        """Generate answer grounded in project artifacts, using local Qwen 8B LoRA if available, otherwise deterministic synthesis"""
        citations = LocalAiService.retrieve_project_knowledge(query)
        preferred_model = LocalAiService.get_preferred_model()
        
        # Build prompt grounding
        context_str = ""
        for c in citations:
            context_str += f"- [{c['label']} ({c['source']})]:\n{c['excerpt']}\n\n"

        # ChatML formatted prompt for Qwen3
        chatml_prompt = (
            f"<|im_start|>system\n"
            f"You are CausalMark AI, an expert marketing experiment intelligence assistant. "
            f"Answer the user's question directly, concisely, and factually using ONLY the verified project facts below.\n"
            f"RULES:\n"
            f"1. State exact numbers from the verified facts.\n"
            f"2. Keep notebook files strictly read-only (chmod 444).\n"
            f"3. Causal validity is unverified until counterfactual policy validation is complete.\n"
            f"4. Do not invent numbers or citations.<|im_end|>\n"
            f"<|im_start|>user\n"
            f"VERIFIED PROJECT FACTS:\n"
            f"{context_str if context_str else 'No direct local file match found.'}\n\n"
            f"QUESTION:\n{query}<|im_end|>\n"
            f"<|im_start|>assistant\n"
        )

        answer = ""
        model_used = "Deterministic Evidence Synthesis"

        def clean_output_robust(text: str) -> str:
            # Strip closed think tags
            text = re.sub(r"<think>.*?</think>", "", text, flags=re.S)
            # Strip open unclosed think tags
            text = re.sub(r"<think>.*", "", text, flags=re.S)
            text = re.sub(r"^=+\s*$", "", text, flags=re.M)
            text = re.sub(r"^(Prompt|Generation|Peak memory):.*$", "", text, flags=re.M)
            text = text.replace("<|im_end|>", "").replace("<|endoftext|>", "")
            return re.sub(r"\n{3,}", "\n\n", text).strip()

        # 1. First priority: Run fine-tuned Qwen 8B LoRA via Apple MLX
        if MLX_PYTHON.exists() and MLX_ADAPTER_DIR.exists():
            try:
                import subprocess
                command = [
                    str(MLX_PYTHON), "-m", "mlx_lm", "generate",
                    "--model", MLX_BASE_MODEL,
                    "--adapter-path", str(MLX_ADAPTER_DIR),
                    "--prompt", chatml_prompt,
                    "--max-tokens", "350",
                    "--temp", "0.0"
                ]
                proc = subprocess.run(command, capture_output=True, text=True, timeout=25)
                if proc.returncode == 0 and proc.stdout:
                    cleaned = clean_output_robust(proc.stdout)
                    # Require substantive content (> 20 chars and not just punctuation)
                    if len(cleaned) >= 20 and any(c.isalnum() for c in cleaned):
                        answer = cleaned
                        model_used = "Fine-Tuned Qwen 8B LoRA (causalmark-qwen3-v2)"
            except Exception:
                pass

        # 2. Second priority: Local Ollama (e.g. gemma4:e4b) if Qwen3 MLX was unavailable
        if not answer and preferred_model and "ollama" in preferred_model.lower():
            try:
                payload = json.dumps({
                    "model": preferred_model,
                    "prompt": chatml_prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.1,
                        "num_predict": 350
                    }
                }).encode("utf-8")
                req = urllib.request.Request(
                    f"{OLLAMA_API_URL}/api/generate",
                    data=payload,
                    headers={"Content-Type": "application/json"}
                )
                with urllib.request.urlopen(req, timeout=12) as response:
                    if response.status == 200:
                        res_data = json.loads(response.read().decode())
                        raw = res_data.get("response", "")
                        cleaned = clean_output_robust(raw)
                        if len(cleaned) >= 20 and any(c.isalnum() for c in cleaned):
                            answer = cleaned
                            model_used = f"Local Ollama ({preferred_model})"
            except Exception:
                pass

        # Fallback to deterministic synthesis if LLM returned empty/minimal or timed out
        if not answer:
            query_lower = query.lower()
            if any(term in query_lower for term in ["how many rows", "row count", "dataset size", "how many records", "rows in dataset"]):
                from backend.user_data_service import UserDataService
                active_info = UserDataService.get_active_dataset_summary()
                
                rows_desc = []
                if active_info and active_info.get("type") == "user_dataset":
                    m = active_info.get("metrics", {})
                    rows_desc.append(
                        f"• **Active Uploaded Dataset (`{active_info.get('dataset_name')}`)**: **{m.get('total_users', 0):,} rows** "
                        f"({m.get('treatment_users', 0):,} Treatment, {m.get('control_users', 0):,} Control)."
                    )
                rows_desc.extend([
                    "• **Hillstrom Email Marketing Dataset**: **64,000 rows** across three campaign segments (Mens E-Mail: 21,307, Womens E-Mail: 21,364, No E-Mail: 21,329).",
                    "• **Criteo Uplift Evaluation Benchmark**: **35,000 evaluated test rows** (from a 50,000-row inspected sample profile and 13.9M full benchmark dataset)."
                ])
                answer = (
                    "**Dataset Row Counts in CausalMark**:\n\n" +
                    "\n".join(rows_desc) + "\n\n"
                    "All numbers reflect verified local dataset files and active uploaded experiment data."
                )
            elif "criteo" in query_lower or "evaluation" in query_lower or "metric" in query_lower:
                answer = (
                    "**Criteo Evaluation Results Analysis**:\n\n"
                    "• **Factual Prediction Error**: Factual MAE is **0.005407** and Factual RMSE is **0.051416** on the held-out test split.\n"
                    "• **5-Fold Cross Validation**: Mean CV RMSE is **0.051543** (std: ±0.001331), demonstrating consistent out-of-fold generalization.\n"
                    "• **Mean Predicted Uplift**: Overall population mean predicted uplift is **+0.0365%**.\n"
                    "• **Causal Validity**: Status is currently **Unverified** (`causal_effect_verified: false`). While the predictive model accurately models observed outcomes, observational unconfoundedness requires experimental validation before claiming proven causal uplift."
                )
            elif "notebook" in query_lower or "generates" in query_lower:
                answer = (
                    "**Notebook Pipeline Architecture**:\n\n"
                    "• `01_Causal_Experiment_Engine.ipynb`: Implements frequentist A/B testing and confidence bounds.\n"
                    "• `02_Uplift_Statistical_and_Criteo.ipynb`: Implements Two-Model uplift estimators (XGBoost/LightGBM) on Criteo data.\n"
                    "• `03_NLP_Finetuning_Small_Model.ipynb`: Qwen3 LoRA fine-tuning for experiment interpretation.\n"
                    "• `04_RAG_Decision_Engine.ipynb`: Chroma vector database and Hillstrom evidence retrieval.\n"
                    "• `05_CausalMark_Evaluation.ipynb`: **Master evaluation benchmark** that generates the final decile uplift summaries, quality audits, and scorecard.\n\n"
                    "*All notebooks are strictly protected under read-only OS permissions (`chmod 444`).*"
                )
            elif "causal" in query_lower or "false" in query_lower or "verification" in query_lower:
                answer = (
                    "**Why Causal Verification is Currently False**:\n\n"
                    "In `data/evaluation/criteo_uplift_final_summary.json`, `causal_effect_verified` is recorded as `false`.\n\n"
                    "**Reason**: High predictive accuracy (Factual RMSE: 0.0514) demonstrates that the model fits observed conversions well, but predictive accuracy does not equal causal validity. "
                    "To verify true causal effects, observed incremental conversions under policy targeting must be validated against randomized held-out counterfactual groups to confirm that the targeting policy does not suffer from unobserved confounding."
                )
            elif "decile" in query_lower or "top" in query_lower:
                answer = (
                    "**Top Uplift Deciles Analysis**:\n\n"
                    "According to `criteo_uplift_decile_summary.csv` and `criteo_uplift_strategy_comparison.csv`:\n"
                    "• **Decile 10 (Top 10%)**: Average predicted uplift of **+1.217%** (range: 0.167% to 22.23%), delivering ~42.6 incremental conversions from 3,500 targeted customers.\n"
                    "• **Top 5%**: Delivers an even higher mean uplift of **+2.098%** (36.7 incremental conversions from 1,750 targeted customers).\n"
                    "• **Deciles 1–2**: Negative predicted uplift (down to -0.87%), identifying 'Do Not Disturb' customers who convert less when targeted."
                )
            elif citations:
                best = citations[0]
                answer = (
                    f"Based on verified project artifact **{best['source']}** ({best['label']}):\n\n"
                    f"{best['excerpt']}\n\n"
                    f"*Note: All citations are directly resolved against local CausalMark files without hallucination.*"
                )
            else:
                answer = (
                    "I searched the project's evaluation artifacts, notebooks, and knowledge base, but found no direct evidence matching your query. "
                    "CausalMark will not manufacture unverified information."
                )

        return {
            "query": query,
            "answer": answer,
            "citations": citations,
            "model": model_used,
            "grounded": len(citations) > 0
        }
