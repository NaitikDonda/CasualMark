import os
import json
import pandas as pd
from pathlib import Path
from typing import Dict, Any, List, Optional
from fastapi import HTTPException
from backend.notebook_service import PROJECT_ROOT, assert_safe_path

class DataService:
    @staticmethod
    def list_datasets() -> List[Dict[str, Any]]:
        search_dirs = [
            PROJECT_ROOT / "data" / "marketing_instructions",
            PROJECT_ROOT / "data" / "evaluation",
            PROJECT_ROOT / "data" / "knowledge_base",
            PROJECT_ROOT / "results"
        ]
        
        datasets = []
        for d in search_dirs:
            if not d.exists():
                continue
            for p in sorted(d.glob("*")):
                if p.is_file() and p.suffix in [".csv", ".json", ".jsonl", ".txt"]:
                    try:
                        stat = p.stat()
                        category = p.parent.name
                        datasets.append({
                            "id": f"{category}:{p.name}",
                            "name": p.name,
                            "category": category,
                            "relative_path": str(p.relative_to(PROJECT_ROOT)),
                            "size_bytes": stat.st_size,
                            "extension": p.suffix,
                            "modified_at": stat.st_mtime
                        })
                    except Exception:
                        pass
        return datasets

    @staticmethod
    def get_dataset_preview(category: str, filename: str, limit: int = 50, offset: int = 0) -> Dict[str, Any]:
        target_path = PROJECT_ROOT / (
            "results" if category == "results" else f"data/{category}"
        ) / filename
        
        assert_safe_path(target_path)
        if not target_path.exists():
            raise HTTPException(status_code=404, detail=f"File {filename} not found.")

        ext = target_path.suffix.lower()
        
        if ext == ".csv":
            try:
                df = pd.read_csv(target_path)
                total_rows = len(df)
                total_cols = len(df.columns)
                slice_df = df.iloc[offset:offset+limit]
                return {
                    "filename": filename,
                    "category": category,
                    "total_rows": total_rows,
                    "total_columns": total_cols,
                    "columns": list(df.columns),
                    "dtypes": {k: str(v) for k, v in df.dtypes.items()},
                    "missing_counts": df.isnull().sum().to_dict(),
                    "preview": slice_df.fillna("").to_dict(orient="records")
                }
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Error reading CSV: {str(e)}")

        elif ext == ".json":
            try:
                with open(target_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                return {
                    "filename": filename,
                    "category": category,
                    "data": data,
                    "is_json": True
                }
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Error reading JSON: {str(e)}")

        elif ext == ".jsonl":
            try:
                lines = []
                with open(target_path, "r", encoding="utf-8") as f:
                    for i, line in enumerate(f):
                        if i >= offset and len(lines) < limit:
                            try:
                                lines.append(json.loads(line.strip()))
                            except Exception:
                                lines.append({"raw": line.strip()})
                        if len(lines) >= limit:
                            break
                return {
                    "filename": filename,
                    "category": category,
                    "preview": lines,
                    "is_jsonl": True
                }
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Error reading JSONL: {str(e)}")

        elif ext == ".txt":
            try:
                with open(target_path, "r", encoding="utf-8") as f:
                    content = f.read(10000)
                return {
                    "filename": filename,
                    "category": category,
                    "content": content,
                    "is_text": True
                }
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Error reading text: {str(e)}")

        raise HTTPException(status_code=400, detail="Unsupported file format.")
