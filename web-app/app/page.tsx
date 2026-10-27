"use client";

import React, { useState, useEffect } from "react";
import { ThemeProvider } from "./components/ThemeProvider";
import { DatasetProvider, useDataset } from "./components/DatasetProvider";
import { Sidebar, NavSection } from "./components/Sidebar";
import { Header } from "./components/Header";
import { CommandPalette } from "./components/CommandPalette";
import { UploadDatasetModal } from "./components/UploadDatasetModal";

// Views
import { OverviewView } from "./components/views/OverviewView";
import { UpliftView } from "./components/views/UpliftView";
import { NotebookInspectorView } from "./components/views/NotebookInspectorView";
import { ExperimentExplorerView } from "./components/views/ExperimentExplorerView";
import { AskCausalMarkAiView } from "./components/views/AskCausalMarkAiView";
import { DataExplorerView } from "./components/views/DataExplorerView";
import { ModelPerformanceView } from "./components/views/ModelPerformanceView";
import { EvaluationCenterView } from "./components/views/EvaluationCenterView";
import { AudienceTargetingView } from "./components/views/AudienceTargetingView";
import { ReportsView } from "./components/views/ReportsView";
import { SettingsView } from "./components/views/SettingsView";

export default function Home() {
  const [currentSection, setCurrentSection] = useState<NavSection>("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadRefreshTrigger, setUploadRefreshTrigger] = useState(0);

  // Command palette hotkey
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const renderView = () => {
    switch (currentSection) {
      case "overview":
        return (
          <OverviewView
            onNavigate={setCurrentSection}
            onOpenUpload={() => setUploadModalOpen(true)}
          />
        );
      case "uplift":
        return <UpliftView />;
      case "notebooks":
        return <NotebookInspectorView />;
      case "experiments":
        return <ExperimentExplorerView />;
      case "rag":
        return <AskCausalMarkAiView />;
      case "data":
        return (
          <DataExplorerView
            onOpenUpload={() => setUploadModalOpen(true)}
            uploadRefreshTrigger={uploadRefreshTrigger}
          />
        );
      case "model":
        return <ModelPerformanceView />;
      case "evaluation":
        return <EvaluationCenterView />;
      case "targeting":
        return <AudienceTargetingView />;
      case "reports":
        return <ReportsView />;
      case "settings":
        return <SettingsView />;
      default:
        return <OverviewView onNavigate={setCurrentSection} />;
    }
  };

  return (
    <ThemeProvider>
      <DatasetProvider>
        <div className="min-h-screen transition-colors duration-200">
          {/* Left Sidebar (Desktop fixed + Mobile sliding drawer) */}
          <Sidebar
            currentSection={currentSection}
            onSelectSection={setCurrentSection}
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed(!collapsed)}
            mobileOpen={mobileNavOpen}
            onCloseMobile={() => setMobileNavOpen(false)}
          />

          {/* Top Header with Hamburger and Active Dataset Selector */}
          <Header
            collapsed={collapsed}
            onOpenCommand={() => setCmdOpen(true)}
            title={currentSection.replace("_", " ")}
            onOpenMobileMenu={() => setMobileNavOpen(true)}
          />

          {/* Command Palette */}
          <CommandPalette
            isOpen={cmdOpen}
            onClose={() => setCmdOpen(false)}
            onSelect={setCurrentSection}
          />

          {/* Upload Dataset Modal */}
          <UploadDatasetModal
            isOpen={uploadModalOpen}
            onClose={() => setUploadModalOpen(false)}
            onSuccess={() => {
              setUploadRefreshTrigger((prev) => prev + 1);
            }}
          />

          {/* Main Content Area: Responsive Left Margin */}
          <main
            className={`pt-20 pb-16 px-4 sm:px-6 md:px-8 transition-all duration-300 ml-0 ${
              collapsed ? "lg:ml-20" : "lg:ml-64"
            }`}
          >
            <div className="max-w-7xl mx-auto w-full min-w-0">
              {renderView()}
            </div>
          </main>
        </div>
      </DatasetProvider>
    </ThemeProvider>
  );
}
