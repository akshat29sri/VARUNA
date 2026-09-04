from __future__ import annotations

import csv
import io
import json
import math
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import copernicusmarine
import numpy as np
import pandas as pd
import gsw
import requests
import xarray as xr
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

BASE_DIR = Path(__file__).resolve().parent
CACHE_DIR = BASE_DIR / ".cache"
CACHE_DIR.mkdir(exist_ok=True)
load_dotenv(BASE_DIR / ".env")

CORS_ORIGINS = [x.strip() for x in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if x.strip()]

MODEL_DATASET = "cmems_mod_glo_phy_my_0.083deg_P1D-m"
BGC_CHL_DATASET = "cmems_mod_glo_bgc-pft_anfc_0.25deg_P1D-m"
BGC_O2_DATASET = "cmems_mod_glo_bgc-bio_anfc_0.25deg_P1D-m"
ARGO_ERDDAP = "https://erddap.ifremer.fr/erddap/tabledap/ArgoFloats.csv"

# Prototype viewport: northern Indian Ocean. The UI still renders a full globe,
# but real data are only requested where the problem statement's Indian use case lives.
LON_MIN, LON_MAX = 45.0, 100.0
LAT_MIN, LAT_MAX = -5.0, 25.0

DEPTHS = [0, 50, 100, 250, 500, 1000, 2000, 4000]

app = FastAPI(title="VARUNA Ocean Data API", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def parse_date(value: str) -> datetime:
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="date must be ISO format, e.g. 2026-01-18") from exc
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def copernicus_credentials() -> tuple[str | None, str | None]:
    return (
        os.getenv("COPERNICUSMARINE_SERVICE_USERNAME"),
        os.getenv("COPERNICUSMARINE_SERVICE_PASSWORD"),
    )


def subset_netcdf(
    dataset_id: str,
    variables: list[str],
    date: str,
    minimum_depth: float,
    maximum_depth: float,
    output_name: str,
    minimum_longitude: float = LON_MIN,
    maximum_longitude: float = LON_MAX,
    minimum_latitude: float = LAT_MIN,
    maximum_latitude: float = LAT_MAX,
) -> Path:
    target = CACHE_DIR / output_name
    if target.exists() and target.stat().st_size > 0:
        return target

    username, password = copernicus_credentials()
    if not username or not password:
        raise HTTPException(
            status_code=503,
            detail="Copernicus credentials are missing. Create backend/.env from backend/.env.example and add your Copernicus Marine username/password.",
        )

    start = parse_date(date).strftime("%Y-%m-%dT00:00:00")
    end = (parse_date(date) + timedelta(days=1)).strftime("%Y-%m-%dT00:00:00")

    try:
        copernicusmarine.subset(
            dataset_id=dataset_id,
            variables=variables,
            minimum_longitude=minimum_longitude,
            maximum_longitude=maximum_longitude,
            minimum_latitude=minimum_latitude,
            maximum_latitude=maximum_latitude,
            start_datetime=start,
            end_datetime=end,
            minimum_depth=minimum_depth,
            maximum_depth=maximum_depth,
            coordinates_selection_method="nearest",
            output_directory=str(CACHE_DIR),
            output_filename=output_name,
            file_format="netcdf",
            overwrite=True,
            username=username,
            password=password,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Copernicus subset request failed: {exc}") from exc

    if not target.exists():
        raise HTTPException(status_code=502, detail="Copernicus returned no NetCDF file for the requested subset.")
    return target


def first_dim(ds: xr.Dataset, candidates: list[str]) -> str:
    for candidate in candidates:
        if candidate in ds.dims or candidate in ds.coords:
            return candidate
    raise KeyError(f"Could not find coordinate among {candidates}. Available: {list(ds.coords)}")


def downsample_regular(da: xr.DataArray, max_lat: int = 90, max_lon: int = 130) -> xr.DataArray:
    lat_name = first_dim(da.to_dataset(name="v"), ["latitude", "lat", "y"])
    lon_name = first_dim(da.to_dataset(name="v"), ["longitude", "lon", "x"])
    nlat = da.sizes[lat_name]
    nlon = da.sizes[lon_name]
    lat_step = max(1, math.ceil(nlat / max_lat))
    lon_step = max(1, math.ceil(nlon / max_lon))
    return da.isel({lat_name: slice(None, None, lat_step), lon_name: slice(None, None, lon_step)})


def to_grid_payload(
    ds: xr.Dataset,
    variable: str,
    requested_depth: int,
    actual_depth: float,
    unit: str,
    source: str,
    value_da: xr.DataArray,
    u_da: xr.DataArray | None = None,
    v_da: xr.DataArray | None = None,
) -> dict[str, Any]:
    value_da = downsample_regular(value_da.squeeze())
    lat_name = first_dim(value_da.to_dataset(name="v"), ["latitude", "lat", "y"])
    lon_name = first_dim(value_da.to_dataset(name="v"), ["longitude", "lon", "x"])

    lats = np.asarray(value_da[lat_name].values, dtype=float)
    lons = np.asarray(value_da[lon_name].values, dtype=float)
    values = np.asarray(value_da.values, dtype=float)

    if values.ndim != 2:
        raise ValueError(f"Expected a 2-D horizontal slice, got shape {values.shape}")

    payload: dict[str, Any] = {
        "variable": variable,
        "requestedDepth": requested_depth,
        "actualDepth": float(actual_depth),
        "date": str(ds["time"].values[0])[:10] if "time" in ds.coords and ds["time"].size else "",
        "unit": unit,
        "source": source,
        "latitudes": lats.tolist(),
        "longitudes": lons.tolist(),
        "values": np.where(np.isfinite(values), values, None).tolist(),
    }

    if u_da is not None and v_da is not None:
        u_da = downsample_regular(u_da.squeeze())
        v_da = downsample_regular(v_da.squeeze())
        u = np.asarray(u_da.values, dtype=float)
        v = np.asarray(v_da.values, dtype=float)
        payload["u"] = np.where(np.isfinite(u), u, None).tolist()
        payload["v"] = np.where(np.isfinite(v), v, None).tolist()

    return payload


def load_physical_grid(variable: str, depth: int, date: str) -> dict[str, Any]:
    if variable == "temperature":
        vars_ = ["thetao"]
        unit = "°C"
    elif variable == "salinity":
        vars_ = ["so"]
        unit = "PSU"
    elif variable == "currents":
        vars_ = ["uo", "vo"]
        unit = "m/s"
    else:
        raise ValueError(variable)

    safe_date = date.replace("-", "")
    output = f"phy_{variable}_{safe_date}_{depth}.nc"
    minimum_depth = 0 if depth == 0 else float(depth)
    maximum_depth = 1 if depth == 0 else float(depth)
    path = subset_netcdf(MODEL_DATASET, vars_, date, minimum_depth, maximum_depth, output)

    with xr.open_dataset(path) as ds:
        actual_depth = float(ds["depth"].values[0]) if "depth" in ds.coords else float(depth)
        if variable == "temperature":
            da = ds["thetao"].isel(time=0)
            return to_grid_payload(ds, variable, depth, actual_depth, unit, "Copernicus Marine GLORYS12V1 reanalysis", da)
        if variable == "salinity":
            da = ds["so"].isel(time=0)
            return to_grid_payload(ds, variable, depth, actual_depth, unit, "Copernicus Marine GLORYS12V1 reanalysis", da)

        u = ds["uo"].isel(time=0)
        v = ds["vo"].isel(time=0)
        speed = np.hypot(u, v)
        return to_grid_payload(ds, variable, depth, actual_depth, unit, "Copernicus Marine GLORYS12V1 reanalysis", speed, u, v)


def load_bgc_grid(variable: str, depth: int, date: str) -> dict[str, Any]:
    if variable == "chlorophyll":
        dataset = BGC_CHL_DATASET
        source_var = "chl"
        unit = "mg/m³"
    elif variable == "oxygen":
        dataset = BGC_O2_DATASET
        source_var = "o2"
        unit = "ml/L"
    else:
        raise ValueError(variable)

    safe_date = date.replace("-", "")
    output = f"bgc_{variable}_{safe_date}_{depth}.nc"
    minimum_depth = 0 if depth == 0 else float(depth)
    maximum_depth = 1 if depth == 0 else float(depth)
    path = subset_netcdf(dataset, [source_var], date, minimum_depth, maximum_depth, output)

    with xr.open_dataset(path) as ds:
        actual_depth = float(ds["depth"].values[0]) if "depth" in ds.coords else float(depth)
        da = ds[source_var].isel(time=0)
        if variable == "oxygen":
            # Copernicus BGC o2 is mmol m^-3, equivalent to µmol L^-1.
            # Convert to ml L^-1 at standard conditions.
            da = da * 0.022391
        return to_grid_payload(
            ds,
            variable,
            depth,
            actual_depth,
            unit,
            "Copernicus Marine Global Ocean Biogeochemistry Analysis and Forecast",
            da,
        )


def fetch_argo_rows(date: str) -> pd.DataFrame:
    dt = parse_date(date)
    start = (dt - timedelta(days=2)).strftime("%Y-%m-%dT00:00:00Z")
    end = (dt + timedelta(days=2, hours=23, minutes=59, seconds=59)).strftime("%Y-%m-%dT%H:%M:%SZ")

    variables = [
        "platform_number", "cycle_number", "time", "latitude", "longitude",
        "pres", "temp", "temp_adjusted", "temp_adjusted_qc", "psal", "psal_adjusted", "psal_adjusted_qc",
        "doxy", "chla", "data_mode", "platform_type",
    ]
    query = ",".join(variables)
    constraints = [
        f'time>="{start}"', f'time<="{end}"',
        f"latitude>={LAT_MIN}", f"latitude<={LAT_MAX}",
        f"longitude>={LON_MIN}", f"longitude<={LON_MAX}",
        "pres>=0", "pres<=2000",
    ]
    url = f"{ARGO_ERDDAP}?{query}&" + "&".join(constraints)

    try:
        response = requests.get(url, timeout=90)
        response.raise_for_status()
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Ifremer Argo ERDDAP request failed: {exc}") from exc

    if not response.text.strip():
        return pd.DataFrame(columns=variables)

    return pd.read_csv(io.StringIO(response.text), comment="#")


def clean_float(value: Any) -> float | None:
    try:
        x = float(value)
        return x if math.isfinite(x) else None
    except (TypeError, ValueError):
        return None


def build_observations(date: str) -> list[dict[str, Any]]:
    df = fetch_argo_rows(date)
    if df.empty:
        return []

    for col in ["latitude", "longitude", "pres", "temp", "psal", "doxy", "chla"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.dropna(subset=["platform_number", "cycle_number", "latitude", "longitude", "pres"])
    observations: list[dict[str, Any]] = []

    # Prefer one nearby profile per float cycle, rather than flooding the globe with every sample point.
    for (platform, cycle), group in df.groupby(["platform_number", "cycle_number"]):
        group = group.sort_values("pres")
        if group.empty:
            continue

        lat = clean_float(group["latitude"].iloc[0])
        lon = clean_float(group["longitude"].iloc[0])
        if lat is None or lon is None:
            continue

        profile: list[dict[str, Any]] = []
        for _, row in group.iterrows():
            temp = clean_float(row.get("temp"))
            adjusted_temp = clean_float(row.get("temp_adjusted"))
            adjusted_temp_qc = clean_float(row.get("temp_adjusted_qc"))
            if adjusted_temp is not None and adjusted_temp_qc in (1, 2):
                temp = adjusted_temp

            sal = clean_float(row.get("psal"))
            adjusted_sal = clean_float(row.get("psal_adjusted"))
            adjusted_sal_qc = clean_float(row.get("psal_adjusted_qc"))
            if adjusted_sal is not None and adjusted_sal_qc in (1, 2):
                sal = adjusted_sal

            oxy = clean_float(row.get("doxy"))
            depth = clean_float(row.get("pres"))
            if depth is None:
                continue

            # Argo DOXY is reported in µmol/kg. Convert to ml/L using TEOS-10
            # density when T/S are available; do not apply a unitless shortcut.
            density = 0.0
            oxygen_ml_l = 0.0
            if temp is not None and sal is not None:
                try:
                    density = float(gsw.rho(sal, temp, depth))
                    if oxy is not None and math.isfinite(density):
                        oxygen_ml_l = oxy * density / 1000.0 / 44.6596
                except Exception:
                    density = 0.0
                    oxygen_ml_l = 0.0

            profile.append({
                "depth": round(depth, 2),
                "temperature": temp if temp is not None else 0,
                "salinity": sal if sal is not None else 0,
                "density": round(density, 3),
                "dissolvedOxygen": round(oxygen_ml_l, 4),
            })

        if not profile:
            continue

        timestamp = str(group["time"].iloc[0])
        temp_values = [p["temperature"] for p in profile if p["temperature"] != 0]
        sal_values = [p["salinity"] for p in profile if p["salinity"] != 0]
        deepest = profile[-1]["depth"]
        current_depth = min(500, int(round(deepest)))
        at_depth = min(profile, key=lambda p: abs(p["depth"] - current_depth))

        instrument = "BGC Float" if group["doxy"].notna().any() or group["chla"].notna().any() else "Argo Float"
        mode = str(group["data_mode"].dropna().iloc[0]) if "data_mode" in group.columns and group["data_mode"].notna().any() else "R"
        platform_type = str(group["platform_type"].dropna().iloc[0]) if "platform_type" in group.columns and group["platform_type"].notna().any() else "Argo"

        observations.append({
            "id": f"argo-{int(float(platform))}-{int(float(cycle))}",
            "wmoId": str(int(float(platform))),
            "name": f"Argo {int(float(platform))} • Cycle {int(float(cycle))}",
            "instrument": instrument,
            "lat": lat,
            "lon": lon,
            "surfaceTemp": temp_values[0] if temp_values else 0,
            "surfaceSalinity": sal_values[0] if sal_values else 0,
            "currentDepth": current_depth,
            "tempAtDepth": at_depth["temperature"],
            "salinityAtDepth": at_depth["salinity"],
            "timestamp": timestamp,
            "status": "active",
            "institution": f"Argo GDAC • platform type {platform_type} • data mode {mode}",
            "profile": profile,
        })

    # Keep marker count reasonable for the MVP. The selected area remains geographically representative.
    observations.sort(key=lambda o: (abs(o["lat"] - 12) + abs(o["lon"] - 75)))
    return observations[:80]


@app.get("/api/health")
def health() -> dict[str, Any]:
    username, password = copernicus_credentials()
    return {
        "ok": True,
        "copernicusConfigured": bool(username and password),
        "argoSource": ARGO_ERDDAP,
        "physicalDataset": MODEL_DATASET,
        "chlorophyllDataset": BGC_CHL_DATASET,
        "oxygenDataset": BGC_O2_DATASET,
    }


@app.get("/api/model/grid")
def model_grid(
    variable: str = Query(...),
    depth: int = Query(...),
    date: str = Query(...),
) -> dict[str, Any]:
    if variable not in {"temperature", "salinity", "currents", "chlorophyll", "oxygen"}:
        raise HTTPException(status_code=400, detail="Unsupported ocean variable")
    if depth not in DEPTHS:
        raise HTTPException(status_code=400, detail=f"Unsupported depth. Use one of {DEPTHS}")
    parse_date(date)
    try:
        if variable in {"temperature", "salinity", "currents"}:
            return load_physical_grid(variable, depth, date)
        return load_bgc_grid(variable, depth, date)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Ocean model processing failed: {exc}") from exc


@app.get("/api/model/profile")
def model_profile(
    lat: float = Query(...),
    lon: float = Query(...),
    date: str = Query(...),
    variable: str = Query(...),
) -> dict[str, Any]:
    if variable not in {"temperature", "salinity"}:
        raise HTTPException(status_code=400, detail="Model comparison currently supports temperature and salinity")
    if not (LAT_MIN <= lat <= LAT_MAX and LON_MIN <= lon <= LON_MAX):
        raise HTTPException(status_code=400, detail="Location is outside the Indian Ocean prototype bounds")

    # One NetCDF subset contains the full vertical range for this single point.
    source_var = "thetao" if variable == "temperature" else "so"
    unit = "°C" if variable == "temperature" else "PSU"
    output = f"profile_{variable}_{date.replace('-', '')}_{lat:.3f}_{lon:.3f}.nc".replace(".", "_") + ".nc"
    path = subset_netcdf(
        MODEL_DATASET,
        [source_var],
        date,
        0,
        4000,
        output,
        minimum_longitude=lon,
        maximum_longitude=lon,
        minimum_latitude=lat,
        maximum_latitude=lat,
    )

    with xr.open_dataset(path) as ds:
        lat_name = first_dim(ds, ["latitude", "lat"])
        lon_name = first_dim(ds, ["longitude", "lon"])
        da = ds[source_var]
        # Select nearest spatial point and first time; retain depth.
        da = da.sel({lat_name: lat, lon_name: lon}, method="nearest").isel(time=0).squeeze()
        depth_values = np.asarray(ds["depth"].values, dtype=float)
        values = np.asarray(da.values, dtype=float).reshape(-1)
        profile = [
            {"depth": float(d), "value": float(v)}
            for d, v in zip(depth_values, values)
            if math.isfinite(float(v))
        ]
        return {
            "variable": variable,
            "unit": unit,
            "source": "Copernicus Marine GLORYS12V1 reanalysis",
            "profile": profile,
        }


@app.get("/api/observations")
def observations(date: str = Query(...)) -> dict[str, Any]:
    parse_date(date)
    return {
        "source": "Argo Global Data Assembly Centre via Ifremer ERDDAP",
        "observations": build_observations(date),
    }
