import os
import json
import re
from pathlib import Path
from typing import Dict, Any, List, Optional
from fastapi import HTTPException

# Safe project root configuration
PROJECT_ROOT = Path(__file__).resolve().parent.parent

def is_safe_path(base_dir: Path, target_path: Path) -> bool:
    """Ensure path doesn't escape project root and isn't a symlink out of bounds"""
    try:
        resolved_target = target_path.resolve()
        resolved_base = base_dir.resolve()
        return resolved_target.is_relative_to(resolved_base)
    except Exception:
        return False

def assert_safe_path(target_path: Path):
    if not is_safe_path(PROJECT_ROOT, target_path):
        raise HTTPException(status_code=403, detail="Path traversal forbidden.")

def assert_not_notebook(target_path: Path):
    """Enforce notebook write protection strictly"""
    if target_path.suffix.lower() == ".ipynb" or ".ipynb" in target_path.name:
        raise HTTPException(
            status_code=403,
            detail="Notebook modifications are strictly forbidden by safety policy."
        )

class NotebookService:
    @staticmethod
    def list_notebooks() -> List[Dict[str, Any]]:
        nb_dir = PROJECT_ROOT / "notebooks"
        if not nb_dir.exists():
            return []
        
        results = []
        for nb_path in sorted(nb_dir.glob("*.ipynb")):
            try:
                stat = nb_path.stat()
                with open(nb_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                
                cells = data.get("cells", [])
                code_cells = [c for c in cells if c.get("cell_type") == "code"]
                md_cells = [c for c in cells if c.get("cell_type") == "markdown"]
                outputs_count = sum(len(c.get("outputs", [])) for c in code_cells)
                
                # Check for imports and model artifacts
                source_concat = " ".join("".join(c.get("source", [])) for c in code_cells)
                imports = list(set(re.findall(r"^(?:import|from)\s+([a-zA-Z0-9_]+)", source_concat, re.M)))
                
                # Dependencies & purpose
                purpose = "Marketing Experiment & Causal Analysis"
                if "01_" in nb_path.name:
                    purpose = "Frequentist & Causal Experiment Analysis Engine"
                elif "02_" in nb_path.name:
                    purpose = "Uplift Modeling, Two-Model Estimators & Criteo Analysis"
                elif "03_" in nb_path.name:
                    purpose = "Qwen3 Fine-tuning with LoRA & Numerical Evaluation"
                elif "04_" in nb_path.name:
                    purpose = "RAG Decision Engine, Chroma Vector DB & Hillstrom Evidence"
                elif "05_" in nb_path.name:
                    purpose = "CausalMark Master Benchmark, Quality Audits & Final Evaluation"

                results.append({
                    "id": nb_path.name,
                    "name": nb_path.name,
                    "relative_path": str(nb_path.relative_to(PROJECT_ROOT)),
                    "size_bytes": stat.st_size,
                    "read_only": not os.access(nb_path, os.W_OK),
                    "permissions": oct(stat.st_mode)[-3:],
                    "total_cells": len(cells),
                    "code_cells": len(code_cells),
                    "markdown_cells": len(md_cells),
                    "total_outputs": outputs_count,
                    "imports": imports[:10],
                    "purpose": purpose
                })
            except Exception as e:
                results.append({
                    "id": nb_path.name,
                    "name": nb_path.name,
                    "relative_path": str(nb_path.relative_to(PROJECT_ROOT)),
                    "error": str(e),
                    "read_only": True
                })
        return results

    @staticmethod
    def get_notebook_detail(notebook_id: str) -> Dict[str, Any]:
        nb_path = PROJECT_ROOT / "notebooks" / notebook_id
        assert_safe_path(nb_path)
        
        if not nb_path.exists() or not nb_path.is_file():
            raise HTTPException(status_code=404, detail="Notebook not found.")
            
        with open(nb_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        cells_parsed = []
        cells = data.get("cells", [])
        
        for idx, c in enumerate(cells):
            cell_type = c.get("cell_type", "code")
            source_lines = c.get("source", [])
            source = "".join(source_lines) if isinstance(source_lines, list) else str(source_lines)
            
            outputs_clean = []
            for out in c.get("outputs", []):
                out_type = out.get("output_type", "")
                text = "".join(out.get("text", [])) if "text" in out else ""
                data_dict = out.get("data", {})
                image_base64 = data_dict.get("image/png") or data_dict.get("image/jpeg")
                plain_text = "".join(data_dict.get("text/plain", [])) if "text/plain" in data_dict else ""
                
                outputs_clean.append({
                    "output_type": out_type,
                    "text": text or plain_text,
                    "image": f"data:image/png;base64,{image_base64}" if image_base64 else None
                })
                
            cells_parsed.append({
                "index": idx,
                "cell_type": cell_type,
                "execution_count": c.get("execution_count"),
                "source": source,
                "outputs": outputs_clean
            })
            
        stat = nb_path.stat()
        return {
            "id": nb_path.name,
            "name": nb_path.name,
            "relative_path": str(nb_path.relative_to(PROJECT_ROOT)),
            "read_only": not os.access(nb_path, os.W_OK),
            "permissions": oct(stat.st_mode)[-3:],
            "metadata": data.get("metadata", {}),
            "cells": cells_parsed
        }
