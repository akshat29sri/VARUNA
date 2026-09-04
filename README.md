# OceanMind — 3D Ocean Research Workspace

> **“Explore the ocean. Ask questions. Discover what’s happening beneath the surface.”**  
> *Developed for the Smart India Hackathon (SIH 2026)*

---

## 🌊 Overview

**OceanMind** is a human-centered 3D ocean visualization and scientific exploration platform. Designed for oceanographers, researchers, climate scientists, and students, OceanMind transforms complex oceanographic datasets (temperature, salinity, geostrophic velocity currents, chlorophyll, and dissolved oxygen) into an interactive 3D WebGL globe.

### Core Philosophy: Human First, AI Second
1. **Direct Scientific Manipulation**: Rotate, zoom, pan, slice through depths (0m to 4000m), switch variables, and drag temporal sliders with zero friction.
2. **Contextual AI Research Assistant**: An intelligent colleague that executes structured 3D actions (depth changes, regional navigation, anomaly highlights) and explains results in plain English.
3. **Model vs. Observation Validation**: Quantitative side-by-side comparison of numerical ocean models (INCOIS-OGCM / HYCOM) against in-situ Argo profiling floats with bias, MAE, RMSE, and correlation statistics.

---

## 🚀 Key Features

- **Interactive 3D WebGL Globe**: Procedural bathymetry, dynamic colormap heatmaps (Turbo, Haline, Velocity), atmospheric Rayleigh scattering, and animated 3D current particle flow.
- **Vertical Depth Stratification**: Epipelagic (0–50m), Thermocline (100–250m), Mesopelagic (500m), and Abyssal strata (1000m–4000m) with "Diving..." micro-interactions.
- **In-Situ Observational Array**: Interactive 3D beacons for 30+ simulated Argo floats, gliders, and RAMA moored buoys across the Arabian Sea, Bay of Bengal, and Indian Ocean.
- **Continuous Vertical Profile Analysis**: Recharts-powered vertical curves (Depth vs. Temperature / Salinity / Oxygen) with thermocline annotations.
- **Model vs. Observation Comparative Engine**: Instant metric cards (Observed, Model, Delta, MAE, RMSE) and plain-English "So What?" explanations.
- **Mesoscale Anomaly Detection**: Automatic identification and 3D highlight of thermal eddies, freshwater plumes, and coastal upwelling zones.
- **30-Day Temporal Evolution**: Time scrubber with play/pause animations.
- **Multi-Agent AI Architecture**:
  - *Orchestrator Agent*: Intent parsing & tool planning.
  - *Visualization Agent*: Controls region, depth, variable, and layer rendering.
  - *Analysis Agent*: Computes comparisons, anomalies, and statistics.
  - *Research Assistant*: Humanized scientific synthesis and actionable suggestions.
- **Research Mode**: Full-screen statistical workspace with multi-variable bar charts, float log, and CSV export.
- **10-Step Guided Demo Tour**: One-click interactive tour executing the exact SIH presentation walkthrough.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons
- **3D Visualization**: Three.js, WebGL, Custom Canvas Colormap Shaders
- **Scientific Charting**: Recharts
- **Data Engine**: Modular synthetic oceanographic simulator adhering to INCOIS & Argo data standards

---

## ⚡ Quick Start

```bash
# 1. Clone & navigate to the repository
cd VARUNA

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Open [http://localhost:5173/](http://localhost:5173/) in your browser.

---

## 🧪 10-Step SIH Demo Flow

Click the **"Demo Tour (10 Steps)"** button in the top bar to follow the guided presentation:
1. **Welcome**: Immersive 3D globe overview.
2. **Arabian Sea Focus**: Camera glides smoothly to the Arabian Sea basin.
3. **Depth 500m & Temperature**: Stratification diving to 500m intermediate water.
4. **Show Observations**: 3D Argo float beacons pulse across the region.
5. **Inspect Float**: Opens vertical depth profile (`INCOIS-Argo-2902184`).
6. **Compare Model vs Obs**: Evaluates model (18.8°C) vs observation (18.2°C) with +0.6°C bias.
7. **Detect Anomaly**: Highlights the Arabian Sea Warm Core Eddy (+2.1°C).
8. **30-Day Time Play**: Animates temporal evolution and current pulses.
9. **Research Mode**: Deep dive into statistical matrices and CSV export.
10. **Research Assistant**: Natural language query and plain-English explanation.
