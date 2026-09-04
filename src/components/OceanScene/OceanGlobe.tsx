import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { DepthLevel, ObservationPoint, OceanAnomaly, OceanRegion, OceanVariable } from '../../types/ocean';
import { VARIABLES, getTimelineDate } from '../../data/oceanData';
import { fetchOceanGrid, nearestCurrentVector, nearestGridValue, OceanGrid } from '../../services/oceanApi';
import { sampleColormap } from '../../utils/colormaps';
import { isWaterBodyNearIndia, latLonToVector3, vector3ToLatLon } from '../../utils/geo';
import { OBSERVATION_POINTS } from '../../data/observations';
import { OCEAN_ANOMALIES } from '../../data/anomalies';

interface OceanGlobeProps {
  currentVariable: OceanVariable;
  currentDepth: DepthLevel;
  currentRegion: OceanRegion;
  timeIndex: number;
  showObservations: boolean;
  showCurrents: boolean;
  showAnomalies: boolean;
  selectedObservation: ObservationPoint | null;
  selectedAnomaly: OceanAnomaly | null;
  onSelectObservation: (obs: ObservationPoint) => void;
  onSelectAnomaly: (anomaly: OceanAnomaly) => void;
  onHoverTelemetry: (coords: { lat: number; lon: number } | null, val: { value: number; unit: string } | null) => void;
}

const GLOBE_RADIUS = 2.0;
const SATELLITE_TEXTURE_URL = 'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg';

const randomIndiaWaterPoint = () => {
  for (let i = 0; i < 30; i++) {
    const lat = -2 + Math.random() * 27.5;
    const lon = 55 + Math.random() * 43;
    if (isWaterBodyNearIndia(lat, lon)) return { lat, lon };
  }
  return { lat: 12 + Math.random() * 8, lon: 68 + Math.random() * 18 };
};

export const OceanGlobe: React.FC<OceanGlobeProps> = ({
  currentVariable,
  currentDepth,
  currentRegion,
  timeIndex,
  showObservations,
  showCurrents,
  showAnomalies,
  selectedObservation,
  selectedAnomaly,
  onSelectObservation,
  onSelectAnomaly,
  onHoverTelemetry,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const globeMeshRef = useRef<THREE.Mesh | null>(null);
  const atmosphereMeshRef = useRef<THREE.Mesh | null>(null);
  const depthRingMeshRef = useRef<THREE.Mesh | null>(null);
  const currentParticlesRef = useRef<THREE.Points | null>(null);
  const markersGroupRef = useRef<THREE.Group | null>(null);
  const anomalyGroupRef = useRef<THREE.Group | null>(null);
  const satelliteImageRef = useRef<HTMLImageElement | null>(null);
  const oceanGridRef = useRef<OceanGrid | null>(null);
  const currentGridRef = useRef<OceanGrid | null>(null);
  const [satelliteReady, setSatelliteReady] = useState(false);
  const [, setDataError] = useState<string | null>(null);

  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const cameraTargetPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 5));
  const cameraCurrentPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 5));

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      satelliteImageRef.current = img;
      setSatelliteReady(true);
    };
    img.src = SATELLITE_TEXTURE_URL;
  }, []);

  // Fetch the real model field whenever variable/depth/time changes.
  useEffect(() => {
    const date = getTimelineDate(timeIndex);
    let cancelled = false;

    fetchOceanGrid(currentVariable, currentDepth, date)
      .then((grid) => {
        if (cancelled) return;
        oceanGridRef.current = grid;
        setDataError(null);
        // Force the texture effect to run through the separate state below.
        setGridVersion((v) => v + 1);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setDataError(error instanceof Error ? error.message : 'Unable to load ocean model data');
        oceanGridRef.current = null;
        setGridVersion((v) => v + 1);
      });

    return () => {
      cancelled = true;
    };
  }, [currentVariable, currentDepth, timeIndex]);

  // Current vectors are fetched independently so the particle layer remains real even when another variable is selected.
  useEffect(() => {
    const date = getTimelineDate(timeIndex);
    let cancelled = false;

    fetchOceanGrid('currents', currentDepth, date)
      .then((grid) => {
        if (!cancelled) currentGridRef.current = grid;
      })
      .catch(() => {
        if (!cancelled) currentGridRef.current = null;
      });

    return () => {
      cancelled = true;
    };
  }, [currentDepth, timeIndex]);

  const [gridVersion, setGridVersion] = useState(0);

  // Initialize Three.js Scene
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 5.2);
    cameraRef.current = camera;
    cameraCurrentPosRef.current.copy(camera.position);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xe0f2fe, 1.4);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);

    const backGlow = new THREE.DirectionalLight(0x0284c7, 0.6);
    backGlow.position.set(-5, -3, -5);
    scene.add(backGlow);

    const globeGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
    const globeMaterial = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.1 });
    const globeMesh = new THREE.Mesh(globeGeometry, globeMaterial);
    scene.add(globeMesh);
    globeMeshRef.current = globeMesh;

    const atmosGeometry = new THREE.SphereGeometry(GLOBE_RADIUS * 1.03, 48, 48);
    const atmosMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(0.05, 0.55, 0.95, 1.0) * intensity * 0.85;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    const atmosphereMesh = new THREE.Mesh(atmosGeometry, atmosMaterial);
    scene.add(atmosphereMesh);
    atmosphereMeshRef.current = atmosphereMesh;

    const depthRingGeometry = new THREE.RingGeometry(GLOBE_RADIUS * 1.01, GLOBE_RADIUS * 1.03, 64);
    const depthRingMaterial = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
    const depthRingMesh = new THREE.Mesh(depthRingGeometry, depthRingMaterial);
    depthRingMesh.rotation.x = Math.PI / 2;
    scene.add(depthRingMesh);
    depthRingMeshRef.current = depthRingMesh;

    const particleCount = 1200;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const { lat, lon } = randomIndiaWaterPoint();
      const pos = latLonToVector3(lat, lon, GLOBE_RADIUS * 1.015);
      particlePositions[i * 3] = pos.x;
      particlePositions[i * 3 + 1] = pos.y;
      particlePositions[i * 3 + 2] = pos.z;
      particleColors[i * 3] = 0.2;
      particleColors[i * 3 + 1] = 0.8;
      particleColors[i * 3 + 2] = 1.0;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.045,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const currentParticles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(currentParticles);
    currentParticlesRef.current = currentParticles;

    const markersGroup = new THREE.Group();
    scene.add(markersGroup);
    markersGroupRef.current = markersGroup;

    const anomalyGroup = new THREE.Group();
    scene.add(anomalyGroup);
    anomalyGroupRef.current = anomalyGroup;

    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      if (cameraRef.current) {
        cameraCurrentPosRef.current.lerp(cameraTargetPosRef.current, 0.05);
        cameraRef.current.position.copy(cameraCurrentPosRef.current);
        cameraRef.current.lookAt(0, 0, 0);
      }

      if (currentParticlesRef.current && currentParticlesRef.current.visible) {
        const positions = currentParticlesRef.current.geometry.attributes.position.array as Float32Array;
        const grid = currentGridRef.current;

        for (let i = 0; i < particleCount; i++) {
          const v = new THREE.Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
          const coords = vector3ToLatLon(v, GLOBE_RADIUS * 1.015);
          const flow = nearestCurrentVector(grid, coords.lat, coords.lon);

          let newLat = coords.lat;
          let newLon = coords.lon;
          if (flow) {
            const magnitude = Math.min(1.5, Math.hypot(flow.u, flow.v));
            newLon += flow.u * 0.012 * Math.max(0.25, magnitude);
            newLat += flow.v * 0.012 * Math.max(0.25, magnitude);
          }

          if (!isWaterBodyNearIndia(newLat, newLon) || newLat < LAT_LIMITS.min || newLat > LAT_LIMITS.max || newLon < LAT_LIMITS.minLon || newLon > LAT_LIMITS.maxLon) {
            const reset = randomIndiaWaterPoint();
            newLat = reset.lat;
            newLon = reset.lon;
          }

          const newPos = latLonToVector3(newLat, newLon, GLOBE_RADIUS * 1.015);
          positions[i * 3] = newPos.x;
          positions[i * 3 + 1] = newPos.y;
          positions[i * 3 + 2] = newPos.z;
        }
        currentParticlesRef.current.geometry.attributes.position.needsUpdate = true;
      }

      if (anomalyGroupRef.current) {
        anomalyGroupRef.current.children.forEach((child) => {
          const scale = 1.0 + Math.sin(elapsedTime * 3.5) * 0.12;
          child.scale.set(scale, scale, scale);
        });
      }

      if (markersGroupRef.current) {
        markersGroupRef.current.children.forEach((child) => {
          if (child.name === 'beacon') {
            const scale = 1.0 + Math.sin(elapsedTime * 4.0) * 0.15;
            child.scale.set(scale, scale, scale);
          }
        });
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (containerRef.current && renderer.domElement.parentElement === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      globeGeometry.dispose();
      globeMaterial.dispose();
      atmosGeometry.dispose();
      atmosMaterial.dispose();
      depthRingGeometry.dispose();
      depthRingMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
    };
  }, []);

  // Rebuild the texture from the real model grid. No synthetic ocean values are used here.
  useEffect(() => {
    if (!globeMeshRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (satelliteImageRef.current) {
      ctx.drawImage(satelliteImageRef.current, 0, 0, 1024, 512);
    }

    const imgData = ctx.createImageData(1024, 512);
    const data = imgData.data;
    const satelliteData = satelliteImageRef.current ? ctx.getImageData(0, 0, 1024, 512).data : null;
    const varConfig = VARIABLES[currentVariable];
    const grid = oceanGridRef.current;

    for (let y = 0; y < 512; y++) {
      const lat = 90 - (y / 512) * 180;
      for (let x = 0; x < 1024; x++) {
        const lon = (x / 1024) * 360 - 180;
        const idx = (y * 1024 + x) * 4;
        const satR = satelliteData?.[idx] ?? 18;
        const satG = satelliteData?.[idx + 1] ?? 26;
        const satB = satelliteData?.[idx + 2] ?? 38;

        const isIndia = (lat >= 8 && lat <= 35 && lon >= 68 && lon <= 90) && (lat > 22 || (lon >= 72 && lon <= 86 && lat >= (8 + (lon - 72) * 0.4)));
        const isAfrica = lat >= -35 && lat <= 37 && lon >= -18 && lon <= 52;
        const isArabia = lat >= 12 && lat <= 32 && lon >= 38 && lon <= 60;
        const isSEAsia = lat >= -10 && lat <= 22 && lon >= 95 && lon <= 130;
        const isAustralia = lat >= -40 && lat <= -10 && lon >= 112 && lon <= 154;
        const isEurasia = lat >= 35 && lon >= -10 && lon <= 140;
        const isLand = isIndia || isAfrica || isArabia || isSEAsia || isAustralia || isEurasia;

        if (isLand) {
          data[idx] = Math.round(satR * 0.72);
          data[idx + 1] = Math.round(satG * 0.76);
          data[idx + 2] = Math.round(satB * 0.82);
          data[idx + 3] = 255;
          continue;
        }

        if (!isWaterBodyNearIndia(lat, lon)) {
          data[idx] = Math.round(satR * 0.18 + 3);
          data[idx + 1] = Math.round(satG * 0.2 + 9);
          data[idx + 2] = Math.round(satB * 0.24 + 18);
          data[idx + 3] = 255;
          continue;
        }

        const val = nearestGridValue(grid, lat, lon);
        if (val === null) {
          data[idx] = Math.round(satR * 0.25 + 3);
          data[idx + 1] = Math.round(satG * 0.28 + 9);
          data[idx + 2] = Math.round(satB * 0.32 + 18);
          data[idx + 3] = 255;
          continue;
        }

        const rgb = sampleColormap(val, varConfig.min, varConfig.max, varConfig.colormap);
        const depthDarken = Math.max(0.35, 1.0 - (currentDepth / 5000) * 0.65);
        data[idx] = Math.round(satR * 0.35 + rgb.r * depthDarken * 0.65);
        data[idx + 1] = Math.round(satG * 0.35 + rgb.g * depthDarken * 0.65);
        data[idx + 2] = Math.round(satB * 0.35 + rgb.b * depthDarken * 0.65);
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let lat = -60; lat <= 60; lat += 30) {
      const y = ((90 - lat) / 180) * 512;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke();
    }
    for (let lon = -180; lon <= 180; lon += 30) {
      const x = ((lon + 180) / 360) * 1024;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    const material = globeMeshRef.current.material as THREE.MeshStandardMaterial;
    if (material.map) material.map.dispose();
    material.map = texture;
    material.needsUpdate = true;
  }, [currentVariable, currentDepth, satelliteReady, timeIndex, selectedObservation, gridVersion]);

  useEffect(() => {
    const targetVec = latLonToVector3(currentRegion.lat, currentRegion.lon, currentRegion.zoomDistance * GLOBE_RADIUS);
    cameraTargetPosRef.current.copy(targetVec);
  }, [currentRegion]);

  useEffect(() => {
    if (!markersGroupRef.current) return;
    while (markersGroupRef.current.children.length > 0) markersGroupRef.current.remove(markersGroupRef.current.children[0]);
    if (!showObservations) return;

    OBSERVATION_POINTS.filter((obs) => isWaterBodyNearIndia(obs.lat, obs.lon)).forEach((obs) => {
      const pos = latLonToVector3(obs.lat, obs.lon, GLOBE_RADIUS * 1.02);
      const isSelected = selectedObservation?.id === obs.id;
      const markerGroup = new THREE.Group();
      markerGroup.position.copy(pos);
      markerGroup.userData = { observation: obs };

      const coreGeo = new THREE.SphereGeometry(isSelected ? 0.055 : 0.038, 16, 16);
      const coreMat = new THREE.MeshBasicMaterial({ color: isSelected ? 0xf59e0b : obs.instrument === 'Argo Float' ? 0x06b6d4 : 0x10b981 });
      markerGroup.add(new THREE.Mesh(coreGeo, coreMat));

      const ringGeo = new THREE.RingGeometry(0.045, 0.07, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: isSelected ? 0xf59e0b : 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: isSelected ? 0.9 : 0.5 });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.name = 'beacon';
      ringMesh.lookAt(pos.clone().multiplyScalar(2));
      markerGroup.add(ringMesh);
      markersGroupRef.current?.add(markerGroup);
    });
  }, [showObservations, selectedObservation, timeIndex]);

  useEffect(() => {
    if (!anomalyGroupRef.current) return;
    while (anomalyGroupRef.current.children.length > 0) anomalyGroupRef.current.remove(anomalyGroupRef.current.children[0]);
    if (!showAnomalies) return;

    OCEAN_ANOMALIES.filter((anom) => isWaterBodyNearIndia(anom.lat, anom.lon)).forEach((anom) => {
      const pos = latLonToVector3(anom.lat, anom.lon, GLOBE_RADIUS * 1.025);
      const isSelected = selectedAnomaly?.id === anom.id;
      const anomMesh = new THREE.Group();
      anomMesh.position.copy(pos);
      anomMesh.userData = { anomaly: anom };
      const contourGeo = new THREE.RingGeometry(0.12, 0.19, 32);
      const contourMat = new THREE.MeshBasicMaterial({ color: anom.magnitude > 0 ? 0xf43f5e : 0x06b6d4, side: THREE.DoubleSide, transparent: true, opacity: isSelected ? 0.85 : 0.6 });
      const contour = new THREE.Mesh(contourGeo, contourMat);
      contour.lookAt(pos.clone().multiplyScalar(2));
      anomMesh.add(contour);
      anomalyGroupRef.current?.add(anomMesh);
    });
  }, [showAnomalies, selectedAnomaly]);

  useEffect(() => {
    if (currentParticlesRef.current) currentParticlesRef.current.visible = showCurrents;
  }, [showCurrents]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || !cameraRef.current || !sceneRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (isDraggingRef.current) {
      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;
      const camPos = cameraCurrentPosRef.current;
      const radius = camPos.length();
      let phi = Math.acos(camPos.y / radius);
      let theta = Math.atan2(camPos.x, camPos.z);
      theta -= deltaX * 0.005;
      phi -= deltaY * 0.005;
      phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi));
      cameraTargetPosRef.current.set(radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.cos(theta));
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current);
    if (globeMeshRef.current) {
      const intersects = raycaster.intersectObject(globeMeshRef.current);
      if (intersects.length > 0) {
        const point = intersects[0].point;
        const coords = vector3ToLatLon(point, GLOBE_RADIUS);
        if (!isWaterBodyNearIndia(coords.lat, coords.lon)) {
          onHoverTelemetry(coords, null);
          return;
        }
        const val = nearestGridValue(oceanGridRef.current, coords.lat, coords.lon);
        const unit = VARIABLES[currentVariable].unit;
        onHoverTelemetry(coords, val === null ? null : { value: Number(val.toFixed(2)), unit });
      } else {
        onHoverTelemetry(null, null);
      }
    }
  };

  const handleMouseUp = () => { isDraggingRef.current = false; };

  const handleClick = (e: React.MouseEvent) => {
    if (!containerRef.current || !cameraRef.current || !sceneRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current);

    if (markersGroupRef.current && showObservations) {
      const intersects = raycaster.intersectObjects(markersGroupRef.current.children, true);
      if (intersects.length > 0) {
        let parent: THREE.Object3D | null = intersects[0].object;
        while (parent && !parent.userData?.observation) parent = parent.parent;
        if (parent?.userData?.observation) {
          onSelectObservation(parent.userData.observation);
          return;
        }
      }
    }

    if (anomalyGroupRef.current && showAnomalies) {
      const intersects = raycaster.intersectObjects(anomalyGroupRef.current.children, true);
      if (intersects.length > 0) {
        let parent: THREE.Object3D | null = intersects[0].object;
        while (parent && !parent.userData?.anomaly) parent = parent.parent;
        if (parent?.userData?.anomaly) {
          onSelectAnomaly(parent.userData.anomaly);
        }
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY * 0.002;
    const currentDist = cameraTargetPosRef.current.length();
    const newDist = Math.max(2.6, Math.min(8.0, currentDist + zoomFactor));
    cameraTargetPosRef.current.setLength(newDist);
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full cursor-grab active:cursor-grabbing relative outline-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
      onWheel={handleWheel}
    />
  );
};

const LAT_LIMITS = { min: -5, max: 25, minLon: 45, maxLon: 100 };
