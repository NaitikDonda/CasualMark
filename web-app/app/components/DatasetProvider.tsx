"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { fetchApi } from "../lib/api";

export interface ActiveDatasetState {
  active_id: string;
  is_benchmark: boolean;
  dataset_name: string;
  filename: string;
  evaluated_users: number;
  treatment_label: string;
  control_label: string;
  outcome_column: string;
  treatment_column?: string;
  analysis?: any;
  metrics: Record<string, any>;
  causal_effect_verified: boolean;
  causal_status_label: string;
  has_model_deciles: boolean;
  methodology_warning: string;
}

interface DatasetContextType {
  activeDataset: ActiveDatasetState | null;
  loading: boolean;
  userDatasets: any[];
  switchDataset: (id: string) => Promise<void>;
  refreshDatasetState: () => Promise<void>;
}

const DatasetContext = createContext<DatasetContextType>({
  activeDataset: null,
  loading: true,
  userDatasets: [],
  switchDataset: async () => {},
  refreshDatasetState: async () => {}
});

export function DatasetProvider({ children }: { children: React.ReactNode }) {
  const [activeDataset, setActiveDataset] = useState<ActiveDatasetState | null>(null);
  const [userDatasets, setUserDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshDatasetState = async () => {
    try {
      const [activeRes, listRes] = await Promise.all([
        fetchApi<ActiveDatasetState>("/api/active-dataset"),
        fetchApi<any[]>("/api/user-datasets")
      ]);
      setActiveDataset(activeRes);
      setUserDatasets(listRes);
    } catch (err) {
      console.error("Failed to load active dataset state", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshDatasetState();
  }, []);

  const switchDataset = async (datasetId: string) => {
    setLoading(true);
    try {
      await fetchApi<any>("/api/active-dataset/select", {
        method: "POST",
        body: JSON.stringify({ dataset_id: datasetId })
      });
      await refreshDatasetState();
    } catch (err) {
      console.error("Failed to switch dataset", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DatasetContext.Provider
      value={{
        activeDataset,
        loading,
        userDatasets,
        switchDataset,
        refreshDatasetState
      }}
    >
      {children}
    </DatasetContext.Provider>
  );
}

export const useDataset = () => useContext(DatasetContext);
