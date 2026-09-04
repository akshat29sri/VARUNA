import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import * as THREE from 'three';

import {
  DepthLevel,
  ObservationPoint,
  OceanAnomaly,
  OceanRegion,
  OceanVariable,
} from '../../types/ocean';

import {
  VARIABLES,
  getTimelineDate,
} from '../../data/oceanData';

import {
  fetchOceanGrid,
  nearestGridValue,
  OceanGrid,
} from '../../services/oceanApi';

import { sampleColormap } from '../../utils/colormaps';

import {
  isWaterBodyNearIndia,
  latLonToVector3,
  vector3ToLatLon,
} from '../../utils/geo';

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

  onSelectObservation: (
    obs: ObservationPoint
  ) => void;

  onSelectAnomaly: (
    anomaly: OceanAnomaly
  ) => void;

  onHoverTelemetry: (
    coords: {
      lat: number;
      lon: number;
    } | null,
    val: {
      value: number;
      unit: string;
    } | null
  ) => void;
}

const GLOBE_RADIUS = 2.0;

const SATELLITE_TEXTURE_URL =
  'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg';

const LAT_LIMITS = {
  min: -5,
  max: 25,
  minLon: 45,
  maxLon: 100,
};

// ============================================================
// CURRENT DIRECTION ON GLOBE
// ============================================================

function currentDirectionOnGlobe(
  lat: number,
  lon: number,
  u: number,
  v: number
): THREE.Vector3 {
  const latRad =
    THREE.MathUtils.degToRad(lat);

  const lonRad =
    THREE.MathUtils.degToRad(lon);

  const east =
    new THREE.Vector3(
      Math.cos(lonRad),
      0,
      -Math.sin(lonRad)
    );

  const north =
    new THREE.Vector3(
      -Math.sin(latRad) *
        Math.sin(lonRad),

      Math.cos(latRad),

      -Math.sin(latRad) *
        Math.cos(lonRad)
    );

  return east
    .multiplyScalar(u)
    .add(
      north.multiplyScalar(v)
    )
    .normalize();
}

// ============================================================
// GRID RANGE
// ============================================================

function getGridRange(
  grid: OceanGrid | null
) {
  if (!grid) {
    return null;
  }

  const values: number[] = [];

  for (
    const row of grid.values
  ) {
    for (
      const value of row
    ) {
      if (
        typeof value === 'number' &&
        Number.isFinite(value)
      ) {
        values.push(value);
      }
    }
  }

  if (values.length < 2) {
    return null;
  }

  values.sort(
    (a, b) => a - b
  );

  const lowIndex =
    Math.floor(
      values.length * 0.02
    );

  const highIndex =
    Math.floor(
      values.length * 0.98
    );

  let min =
    values[lowIndex];

  let max =
    values[highIndex];

  if (
    !Number.isFinite(min) ||
    !Number.isFinite(max) ||
    min === max
  ) {
    min = values[0];
    max =
      values[
        values.length - 1
      ];
  }

  if (min === max) {
    min -= 0.5;
    max += 0.5;
  }

  return {
    min,
    max,
  };
}

// ============================================================
// FIND BRACKETING INDEX
//
// Returns the lower index for interpolation.
// ============================================================

function findLowerIndex(
  values: number[],
  target: number
): number {
  if (values.length < 2) {
    return 0;
  }

  if (target <= values[0]) {
    return 0;
  }

  if (
    target >=
    values[values.length - 1]
  ) {
    return values.length - 2;
  }

  let low = 0;
  let high =
    values.length - 1;

  while (
    low <= high
  ) {
    const mid =
      Math.floor(
        (low + high) / 2
      );

    if (
      values[mid] <=
        target &&
      target <=
        values[mid + 1]
    ) {
      return mid;
    }

    if (
      values[mid] <
      target
    ) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return Math.max(
    0,
    Math.min(
      values.length - 2,
      low
    )
  );
}

// ============================================================
// BILINEAR VELOCITY INTERPOLATION
//
// This is important.
//
// Instead of using one nearest cell, the current direction
// is smoothly interpolated between the surrounding Copernicus
// grid cells.
// ============================================================

function sampleVelocity(
  grid: OceanGrid,
  lat: number,
  lon: number
): {
  u: number;
  v: number;
  speed: number;
} | null {
  if (
    !grid.u ||
    !grid.v ||
    grid.latitudes.length <
      2 ||
    grid.longitudes.length <
      2
  ) {
    return null;
  }

  if (
    lat < LAT_LIMITS.min ||
    lat > LAT_LIMITS.max ||
    lon < LAT_LIMITS.minLon ||
    lon > LAT_LIMITS.maxLon
  ) {
    return null;
  }

  if (
    !isWaterBodyNearIndia(
      lat,
      lon
    )
  ) {
    return null;
  }

  const latIndex =
    findLowerIndex(
      grid.latitudes,
      lat
    );

  const lonIndex =
    findLowerIndex(
      grid.longitudes,
      lon
    );

  const lat0 =
    grid.latitudes[
      latIndex
    ];

  const lat1 =
    grid.latitudes[
      latIndex + 1
    ];

  const lon0 =
    grid.longitudes[
      lonIndex
    ];

  const lon1 =
    grid.longitudes[
      lonIndex + 1
    ];

  const latWeight =
    lat1 !== lat0
      ? (lat - lat0) /
        (lat1 - lat0)
      : 0;

  const lonWeight =
    lon1 !== lon0
      ? (lon - lon0) /
        (lon1 - lon0)
      : 0;

  const u00 =
    grid.u[latIndex]?.[
      lonIndex
    ];

  const u01 =
    grid.u[latIndex]?.[
      lonIndex + 1
    ];

  const u10 =
    grid.u[
      latIndex + 1
    ]?.[
      lonIndex
    ];

  const u11 =
    grid.u[
      latIndex + 1
    ]?.[
      lonIndex + 1
    ];

  const v00 =
    grid.v[latIndex]?.[
      lonIndex
    ];

  const v01 =
    grid.v[latIndex]?.[
      lonIndex + 1
    ];

  const v10 =
    grid.v[
      latIndex + 1
    ]?.[
      lonIndex
    ];

  const v11 =
    grid.v[
      latIndex + 1
    ]?.[
      lonIndex + 1
    ];

  if (
    typeof u00 !== 'number' ||
    typeof u01 !== 'number' ||
    typeof u10 !== 'number' ||
    typeof u11 !== 'number' ||
    typeof v00 !== 'number' ||
    typeof v01 !== 'number' ||
    typeof v10 !== 'number' ||
    typeof v11 !== 'number'
  ) {
    return null;
  }

  if (
    !Number.isFinite(u00) ||
    !Number.isFinite(u01) ||
    !Number.isFinite(u10) ||
    !Number.isFinite(u11) ||
    !Number.isFinite(v00) ||
    !Number.isFinite(v01) ||
    !Number.isFinite(v10) ||
    !Number.isFinite(v11)
  ) {
    return null;
  }

  const uTop =
    u00 +
    (u01 - u00) *
      lonWeight;

  const uBottom =
    u10 +
    (u11 - u10) *
      lonWeight;

  const vTop =
    v00 +
    (v01 - v00) *
      lonWeight;

  const vBottom =
    v10 +
    (v11 - v10) *
      lonWeight;

  const u =
    uTop +
    (uBottom - uTop) *
      latWeight;

  const v =
    vTop +
    (vBottom - vTop) *
      latWeight;

  if (
    !Number.isFinite(u) ||
    !Number.isFinite(v)
  ) {
    return null;
  }

  return {
    u,
    v,
    speed: Math.hypot(u, v),
  };
}

// ============================================================
// VELOCITY STEP
// ============================================================

function velocityStep(
  grid: OceanGrid,
  lat: number,
  lon: number,
  directionSign: number
): {
  lat: number;
  lon: number;
  speed: number;
} | null {
  const velocity =
    sampleVelocity(
      grid,
      lat,
      lon
    );

  if (!velocity) {
    return null;
  }

  const {
    u,
    v,
    speed,
  } = velocity;

  if (
    speed < 0.008
  ) {
    return null;
  }

  /*
   * Visualization step.
   *
   * We deliberately use the direction of the real
   * velocity field while keeping the geographic step
   * visually useful at globe scale.
   */

  const STEP_SCALE = 0.30;

  const cosLat =
    Math.max(
      0.25,
      Math.cos(
        THREE.MathUtils.degToRad(
          lat
        )
      )
    );

  const deltaLon =
    directionSign *
    (u * STEP_SCALE) /
    cosLat;

  const deltaLat =
    directionSign *
    v *
    STEP_SCALE;

  const nextLat =
    lat + deltaLat;

  const nextLon =
    lon + deltaLon;

  if (
    nextLat <
      LAT_LIMITS.min ||
    nextLat >
      LAT_LIMITS.max ||
    nextLon <
      LAT_LIMITS.minLon ||
    nextLon >
      LAT_LIMITS.maxLon
  ) {
    return null;
  }

  if (
    !isWaterBodyNearIndia(
      nextLat,
      nextLon
    )
  ) {
    return null;
  }

  return {
    lat: nextLat,
    lon: nextLon,
    speed,
  };
}

// ============================================================
// BUILD STREAMLINE
// ============================================================

function buildStreamline(
  grid: OceanGrid,
  seedLat: number,
  seedLon: number
): {
  lat: number;
  lon: number;
  speed: number;
}[] {
  const MAX_STEPS = 55;

  const backward: {
    lat: number;
    lon: number;
    speed: number;
  }[] = [];

  const forward: {
    lat: number;
    lon: number;
    speed: number;
  }[] = [];

  // ----------------------------------------------------------
  // BACKWARD INTEGRATION
  // ----------------------------------------------------------

  let lat =
    seedLat;

  let lon =
    seedLon;

  for (
    let i = 0;
    i < MAX_STEPS;
    i++
  ) {
    const step =
      velocityStep(
        grid,
        lat,
        lon,
        -1
      );

    if (!step) {
      break;
    }

    backward.push({
      lat,
      lon,
      speed:
        step.speed,
    });

    lat =
      step.lat;

    lon =
      step.lon;
  }

  // ----------------------------------------------------------
  // FORWARD INTEGRATION
  // ----------------------------------------------------------

  lat =
    seedLat;

  lon =
    seedLon;

  for (
    let i = 0;
    i < MAX_STEPS;
    i++
  ) {
    const step =
      velocityStep(
        grid,
        lat,
        lon,
        1
      );

    if (!step) {
      break;
    }

    forward.push({
      lat,
      lon,
      speed:
        step.speed,
    });

    lat =
      step.lat;

    lon =
      step.lon;
  }

  backward.reverse();

  const seedVelocity =
    sampleVelocity(
      grid,
      seedLat,
      seedLon
    );

  return [
    ...backward,

    {
      lat: seedLat,
      lon: seedLon,
      speed:
        seedVelocity?.speed ??
        0,
    },

    ...forward,
  ];
}

// ============================================================
// STREAMLINE → THREE.JS POINTS
// ============================================================

function streamlineToPoints(
  streamline: {
    lat: number;
    lon: number;
    speed: number;
  }[]
): THREE.Vector3[] {
  return streamline.map(
    (point) =>
      latLonToVector3(
        point.lat,
        point.lon,
        GLOBE_RADIUS *
          1.052
      )
  );
}

// ============================================================
// OCEAN GLOBE
// ============================================================

export const OceanGlobe:
  React.FC<OceanGlobeProps> = ({
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
    const containerRef =
      useRef<HTMLDivElement>(
        null
      );

    const sceneRef =
      useRef<THREE.Scene | null>(
        null
      );

    const cameraRef =
      useRef<THREE.PerspectiveCamera | null>(
        null
      );

    const rendererRef =
      useRef<THREE.WebGLRenderer | null>(
        null
      );

    const globeMeshRef =
      useRef<THREE.Mesh | null>(
        null
      );

    const atmosphereMeshRef =
      useRef<THREE.Mesh | null>(
        null
      );

    const depthRingMeshRef =
      useRef<THREE.Mesh | null>(
        null
      );

    const currentArrowGroupRef =
      useRef<THREE.Group | null>(
        null
      );

    const markersGroupRef =
      useRef<THREE.Group | null>(
        null
      );

    const anomalyGroupRef =
      useRef<THREE.Group | null>(
        null
      );

    const satelliteImageRef =
      useRef<HTMLImageElement | null>(
        null
      );

    const oceanGridRef =
      useRef<OceanGrid | null>(
        null
      );

    const currentGridRef =
      useRef<OceanGrid | null>(
        null
      );

    const [
      ,
      setSatelliteReady,
    ] = useState(false);

    const [
      ,
      setDataError,
    ] = useState<
      string | null
    >(null);

    const [
      gridVersion,
      setGridVersion,
    ] = useState(0);

    const isDraggingRef =
      useRef(false);

    const previousMousePositionRef =
      useRef({
        x: 0,
        y: 0,
      });

    const cameraTargetPosRef =
      useRef<THREE.Vector3>(
        new THREE.Vector3(
          0,
          0,
          5
        )
      );

    const cameraCurrentPosRef =
      useRef<THREE.Vector3>(
        new THREE.Vector3(
          0,
          0,
          5
        )
      );

    // ==========================================================
    // SATELLITE TEXTURE
    // ==========================================================

    useEffect(() => {
      const img =
        new Image();

      img.crossOrigin =
        'anonymous';

      img.onload = () => {
        satelliteImageRef.current =
          img;

        setSatelliteReady(
          true
        );
      };

      img.src =
        SATELLITE_TEXTURE_URL;
    }, []);

    // ==========================================================
    // LOAD REAL OCEAN DATA
    // ==========================================================

    useEffect(() => {
      const date =
        getTimelineDate(
          timeIndex
        );

      let cancelled =
        false;

      fetchOceanGrid(
        currentVariable,
        currentDepth,
        date
      )
        .then((grid) => {
          if (cancelled) {
            return;
          }

          oceanGridRef.current =
            grid;

          setDataError(
            null
          );

          setGridVersion(
            (v) => v + 1
          );
        })
        .catch(
          (
            error: unknown
          ) => {
            if (cancelled) {
              return;
            }

            setDataError(
              error instanceof
                Error
                ? error.message
                : 'Unable to load ocean model data'
            );

            oceanGridRef.current =
              null;

            setGridVersion(
              (v) => v + 1
            );
          }
        );

      return () => {
        cancelled = true;
      };
    }, [
      currentVariable,
      currentDepth,
      timeIndex,
    ]);

    // ==========================================================
    // LOAD REAL CURRENT DATA
    // ==========================================================

    useEffect(() => {
      const date =
        getTimelineDate(
          timeIndex
        );

      let cancelled =
        false;

      fetchOceanGrid(
        'currents',
        currentDepth,
        date
      )
        .then((grid) => {
          if (cancelled) {
            return;
          }

          currentGridRef.current =
            grid;

          setGridVersion(
            (v) => v + 1
          );
        })
        .catch(() => {
          if (!cancelled) {
            currentGridRef.current =
              null;

            setGridVersion(
              (v) => v + 1
            );
          }
        });

      return () => {
        cancelled = true;
      };
    }, [
      currentDepth,
      timeIndex,
    ]);

    // ==========================================================
    // THREE.JS INITIALIZATION
    // ==========================================================

    useEffect(() => {
      if (
        !containerRef.current
      ) {
        return;
      }

      const width =
        containerRef.current
          .clientWidth;

      const height =
        containerRef.current
          .clientHeight;

      const scene =
        new THREE.Scene();

      sceneRef.current =
        scene;

      const camera =
        new THREE.PerspectiveCamera(
          45,
          width / height,
          0.1,
          1000
        );

      camera.position.set(
        0,
        0,
        5.2
      );

      cameraRef.current =
        camera;

      cameraCurrentPosRef.current.copy(
        camera.position
      );

      const renderer =
        new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference:
            'high-performance',
        });

      renderer.setSize(
        width,
        height
      );

      renderer.setPixelRatio(
        Math.min(
          window.devicePixelRatio,
          2
        )
      );

      renderer.toneMapping =
        THREE.ACESFilmicToneMapping;

      renderer.toneMappingExposure =
        1.1;

      containerRef.current.appendChild(
        renderer.domElement
      );

      rendererRef.current =
        renderer;

      // ========================================================
      // LIGHTING
      // ========================================================

      const ambientLight =
        new THREE.AmbientLight(
          0xffffff,
          0.9
        );

      scene.add(
        ambientLight
      );

      const sunLight =
        new THREE.DirectionalLight(
          0xe0f2fe,
          1.4
        );

      sunLight.position.set(
        5,
        3,
        5
      );

      scene.add(
        sunLight
      );

      const backGlow =
        new THREE.DirectionalLight(
          0x0284c7,
          0.6
        );

      backGlow.position.set(
        -5,
        -3,
        -5
      );

      scene.add(
        backGlow
      );

      // ========================================================
      // GLOBE
      // ========================================================

      const globeGeometry =
        new THREE.SphereGeometry(
          GLOBE_RADIUS,
          64,
          64
        );

      const globeMaterial =
        new THREE.MeshStandardMaterial({
          roughness: 0.4,
          metalness: 0.1,
        });

      const globeMesh =
        new THREE.Mesh(
          globeGeometry,
          globeMaterial
        );

      scene.add(
        globeMesh
      );

      globeMeshRef.current =
        globeMesh;

      // ========================================================
      // ATMOSPHERE
      // ========================================================

      const atmosGeometry =
        new THREE.SphereGeometry(
          GLOBE_RADIUS *
            1.03,
          48,
          48
        );

      const atmosMaterial =
        new THREE.ShaderMaterial({
          vertexShader: `
            varying vec3 vNormal;

            void main() {
              vNormal =
                normalize(
                  normalMatrix * normal
                );

              gl_Position =
                projectionMatrix *
                modelViewMatrix *
                vec4(position, 1.0);
            }
          `,

          fragmentShader: `
            varying vec3 vNormal;

            void main() {
              float intensity =
                pow(
                  0.65 -
                  dot(
                    vNormal,
                    vec3(0.0, 0.0, 1.0)
                  ),
                  2.0
                );

              gl_FragColor =
                vec4(
                  0.05,
                  0.55,
                  0.95,
                  1.0
                )
                * intensity
                * 0.85;
            }
          `,

          blending:
            THREE.AdditiveBlending,

          side:
            THREE.BackSide,

          transparent: true,
        });

      const atmosphereMesh =
        new THREE.Mesh(
          atmosGeometry,
          atmosMaterial
        );

      scene.add(
        atmosphereMesh
      );

      atmosphereMeshRef.current =
        atmosphereMesh;

      // ========================================================
      // DEPTH RING
      // ========================================================

      const depthRingGeometry =
        new THREE.RingGeometry(
          GLOBE_RADIUS *
            1.01,
          GLOBE_RADIUS *
            1.03,
          64
        );

      const depthRingMaterial =
        new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.4,
        });

      const depthRingMesh =
        new THREE.Mesh(
          depthRingGeometry,
          depthRingMaterial
        );

      depthRingMesh.rotation.x =
        Math.PI / 2;

      scene.add(
        depthRingMesh
      );

      depthRingMeshRef.current =
        depthRingMesh;

      // ========================================================
      // CURRENT FLOW GROUP
      // ========================================================

      const currentArrowGroup =
        new THREE.Group();

      currentArrowGroup.name =
        'current-arrows';

      currentArrowGroup.renderOrder =
        20;

      scene.add(
        currentArrowGroup
      );

      currentArrowGroupRef.current =
        currentArrowGroup;

      // ========================================================
      // OBSERVATIONS
      // ========================================================

      const markersGroup =
        new THREE.Group();

      scene.add(
        markersGroup
      );

      markersGroupRef.current =
        markersGroup;

      // ========================================================
      // ANOMALIES
      // ========================================================

      const anomalyGroup =
        new THREE.Group();

      scene.add(
        anomalyGroup
      );

      anomalyGroupRef.current =
        anomalyGroup;

      // ========================================================
      // ANIMATION
      // ========================================================

      let animationFrameId: number;

      const clock =
        new THREE.Clock();

      const animate = () => {
        animationFrameId =
          requestAnimationFrame(
            animate
          );

        const elapsedTime =
          clock.getElapsedTime();

        // ------------------------------------------------------
        // CAMERA
        // ------------------------------------------------------

        cameraCurrentPosRef.current.lerp(
          cameraTargetPosRef.current,
          0.05
        );

        camera.position.copy(
          cameraCurrentPosRef.current
        );

        camera.lookAt(
          0,
          0,
          0
        );

        // ------------------------------------------------------
        // MOVING CURRENT PARTICLES
        // ------------------------------------------------------

        if (
          currentArrowGroupRef.current &&
          currentArrowGroupRef.current.visible
        ) {
          currentArrowGroupRef.current.children.forEach(
            (child) => {
              if (
                child.userData
                  ?.particle &&
                child.userData
                  ?.curve
              ) {
                const curve =
                  child.userData
                    .curve as THREE.CatmullRomCurve3;

                const speed =
                  child.userData
                    .particleSpeed ??
                  0.001;

                let progress =
                  child.userData
                    .progress ??
                  0;

                progress +=
                  speed;

                if (
                  progress > 1
                ) {
                  progress -= 1;
                }

                child.userData.progress =
                  progress;

                const point =
                  curve.getPointAt(
                    progress
                  );

                child.position.copy(
                  point
                );
              }
            }
          );
        }

        // ------------------------------------------------------
        // ANOMALIES
        // ------------------------------------------------------

        if (
          anomalyGroupRef.current
        ) {
          anomalyGroupRef.current.children.forEach(
            (child) => {
              const scale =
                1 +
                Math.sin(
                  elapsedTime *
                    3.5
                ) *
                  0.12;

              child.scale.set(
                scale,
                scale,
                scale
              );
            }
          );
        }

        // ------------------------------------------------------
        // OBSERVATION BEACONS
        // ------------------------------------------------------

        if (
          markersGroupRef.current
        ) {
          markersGroupRef.current.children.forEach(
            (child) => {
              if (
                child.name ===
                'beacon'
              ) {
                const scale =
                  1 +
                  Math.sin(
                    elapsedTime *
                      4
                  ) *
                    0.15;

                child.scale.set(
                  scale,
                  scale,
                  scale
                );
              }
            }
          );
        }

        renderer.render(
          scene,
          camera
        );
      };

      animate();

      // ========================================================
      // RESIZE
      // ========================================================

      const handleResize =
        () => {
          if (
            !containerRef.current
          ) {
            return;
          }

          const w =
            containerRef.current
              .clientWidth;

          const h =
            containerRef.current
              .clientHeight;

          camera.aspect =
            w / h;

          camera.updateProjectionMatrix();

          renderer.setSize(
            w,
            h
          );
        };

      window.addEventListener(
        'resize',
        handleResize
      );

      return () => {
        window.removeEventListener(
          'resize',
          handleResize
        );

        cancelAnimationFrame(
          animationFrameId
        );

        if (
          containerRef.current &&
          renderer.domElement
            .parentElement ===
            containerRef.current
        ) {
          containerRef.current.removeChild(
            renderer.domElement
          );
        }

        renderer.dispose();

        globeGeometry.dispose();
        globeMaterial.dispose();

        atmosGeometry.dispose();
        atmosMaterial.dispose();

        depthRingGeometry.dispose();
        depthRingMaterial.dispose();
      };
    }, []);

    // ==========================================================
    // REAL OCEAN DATA TEXTURE
    // ==========================================================

    useEffect(() => {
      if (
        !globeMeshRef.current
      ) {
        return;
      }

      const canvas =
        document.createElement(
          'canvas'
        );

      canvas.width =
        1024;

      canvas.height =
        512;

      const ctx =
        canvas.getContext(
          '2d'
        );

      if (!ctx) {
        return;
      }

      if (
        satelliteImageRef.current
      ) {
        ctx.drawImage(
          satelliteImageRef.current,
          0,
          0,
          1024,
          512
        );
      }

      const satelliteData =
        satelliteImageRef.current
          ? ctx.getImageData(
              0,
              0,
              1024,
              512
            ).data
          : null;

      const imgData =
        ctx.createImageData(
          1024,
          512
        );

      const data =
        imgData.data;

      const varConfig =
        VARIABLES[
          currentVariable
        ];

      const grid =
        oceanGridRef.current;

      const gridRange =
        getGridRange(
          grid
        );

      for (
        let y = 0;
        y < 512;
        y++
      ) {
        const lat =
          90 -
          (y / 512) *
            180;

        for (
          let x = 0;
          x < 1024;
          x++
        ) {
          const lon =
            (x / 1024) *
              360 -
            180;

          const idx =
            (y * 1024 +
              x) *
            4;

          const satR =
            satelliteData?.[
              idx
            ] ?? 18;

          const satG =
            satelliteData?.[
              idx + 1
            ] ?? 26;

          const satB =
            satelliteData?.[
              idx + 2
            ] ?? 38;

          // ----------------------------------------------------
          // LAND MASK
          // ----------------------------------------------------

          const isIndia =
            lat >= 8 &&
            lat <= 35 &&
            lon >= 68 &&
            lon <= 90 &&
            (
              lat > 22 ||
              (
                lon >= 72 &&
                lon <= 86 &&
                lat >=
                  8 +
                    (lon -
                      72) *
                      0.4
              )
            );

          const isAfrica =
            lat >= -35 &&
            lat <= 37 &&
            lon >= -18 &&
            lon <= 52;

          const isArabia =
            lat >= 12 &&
            lat <= 32 &&
            lon >= 38 &&
            lon <= 60;

          const isSEAsia =
            lat >= -10 &&
            lat <= 22 &&
            lon >= 95 &&
            lon <= 130;

          const isAustralia =
            lat >= -40 &&
            lat <= -10 &&
            lon >= 112 &&
            lon <= 154;

          const isEurasia =
            lat >= 35 &&
            lon >= -10 &&
            lon <= 140;

          const isLand =
            isIndia ||
            isAfrica ||
            isArabia ||
            isSEAsia ||
            isAustralia ||
            isEurasia;

          if (isLand) {
            data[idx] =
              Math.round(
                satR * 0.72
              );

            data[idx + 1] =
              Math.round(
                satG * 0.76
              );

            data[idx + 2] =
              Math.round(
                satB * 0.82
              );

            data[idx + 3] =
              255;

            continue;
          }

          // ----------------------------------------------------
          // OUTSIDE INDIAN OCEAN
          // ----------------------------------------------------

          if (
            !isWaterBodyNearIndia(
              lat,
              lon
            )
          ) {
            data[idx] =
              Math.round(
                satR * 0.18 +
                  3
              );

            data[idx + 1] =
              Math.round(
                satG * 0.20 +
                  9
              );

            data[idx + 2] =
              Math.round(
                satB * 0.24 +
                  18
              );

            data[idx + 3] =
              255;

            continue;
          }

          // ----------------------------------------------------
          // REAL MODEL VALUE
          // ----------------------------------------------------

          const val =
            nearestGridValue(
              grid,
              lat,
              lon
            );

          if (
            val === null ||
            !gridRange
          ) {
            data[idx] =
              Math.round(
                satR * 0.25 +
                  3
              );

            data[idx + 1] =
              Math.round(
                satG * 0.28 +
                  9
              );

            data[idx + 2] =
              Math.round(
                satB * 0.32 +
                  18
              );

            data[idx + 3] =
              255;

            continue;
          }

          const rgb =
            sampleColormap(
              val,
              gridRange.min,
              gridRange.max,
              varConfig.colormap
            );

          const depthDarken =
            Math.max(
              0.45,
              1 -
                (currentDepth /
                  5000) *
                  0.45
            );

          data[idx] =
            Math.round(
              satR * 0.10 +
                rgb.r *
                  depthDarken *
                  0.90
            );

          data[idx + 1] =
            Math.round(
              satG * 0.10 +
                rgb.g *
                  depthDarken *
                  0.90
            );

          data[idx + 2] =
            Math.round(
              satB * 0.10 +
                rgb.b *
                  depthDarken *
                  0.90
            );

          data[idx + 3] =
            255;
        }
      }

      ctx.putImageData(
        imgData,
        0,
        0
      );

      // --------------------------------------------------------
      // LAT/LON GRID
      // --------------------------------------------------------

      ctx.strokeStyle =
        'rgba(255,255,255,0.08)';

      ctx.lineWidth = 1;

      for (
        let lat = -60;
        lat <= 60;
        lat += 30
      ) {
        const y =
          ((90 - lat) /
            180) *
          512;

        ctx.beginPath();

        ctx.moveTo(
          0,
          y
        );

        ctx.lineTo(
          1024,
          y
        );

        ctx.stroke();
      }

      for (
        let lon = -180;
        lon <= 180;
        lon += 30
      ) {
        const x =
          ((lon + 180) /
            360) *
          1024;

        ctx.beginPath();

        ctx.moveTo(
          x,
          0
        );

        ctx.lineTo(
          x,
          512
        );

        ctx.stroke();
      }

      const texture =
        new THREE.CanvasTexture(
          canvas
        );

      texture.wrapS =
        THREE.RepeatWrapping;

      texture.wrapT =
        THREE.ClampToEdgeWrapping;

      texture.needsUpdate =
        true;

      const material =
        globeMeshRef.current
          .material as THREE.MeshStandardMaterial;

      if (material.map) {
        material.map.dispose();
      }

      material.map =
        texture;

      material.needsUpdate =
        true;
    }, [
      currentVariable,
      currentDepth,
      timeIndex,
      selectedObservation,
      gridVersion,
    ]);

    // ==========================================================
    // REAL CURRENT STREAMLINES
    // ==========================================================

    useEffect(() => {
      const group =
        currentArrowGroupRef.current;

      if (!group) {
        return;
      }

      // --------------------------------------------------------
      // CLEANUP
      // --------------------------------------------------------

      while (
        group.children.length >
        0
      ) {
        const child =
          group.children[0];

        if (
          child instanceof
          THREE.Line
        ) {
          child.geometry.dispose();

          if (
            Array.isArray(
              child.material
            )
          ) {
            child.material.forEach(
              (material) =>
                material.dispose()
            );
          } else {
            child.material.dispose();
          }
        }

        if (
          child instanceof
          THREE.Points
        ) {
          child.geometry.dispose();

          if (
            Array.isArray(
              child.material
            )
          ) {
            child.material.forEach(
              (material) =>
                material.dispose()
            );
          } else {
            child.material.dispose();
          }
        }

        group.remove(
          child
        );
      }

      group.visible =
        showCurrents;

      if (!showCurrents) {
        return;
      }

      const grid =
        currentGridRef.current;

      if (
        !grid ||
        !grid.u ||
        !grid.v ||
        grid.latitudes.length <
          2 ||
        grid.longitudes.length <
          2
      ) {
        console.warn(
          '[VARUNA] Current vectors unavailable'
        );

        return;
      }

      // --------------------------------------------------------
      // DENSER SEED FIELD
      //
      // 14 × 18 instead of 7 × 10.
      // This prevents the "balding globe" problem.
      // --------------------------------------------------------

      const latSeedStep =
        Math.max(
          1,
          Math.floor(
            grid.latitudes.length /
              14
          )
        );

      const lonSeedStep =
        Math.max(
          1,
          Math.floor(
            grid.longitudes.length /
              18
          )
        );

      // --------------------------------------------------------
      // FIND MAX SPEED
      // --------------------------------------------------------

      let maxSpeed = 0;

      for (
        let latIndex = 0;
        latIndex <
        grid.latitudes.length;
        latIndex += latSeedStep
      ) {
        for (
          let lonIndex = 0;
          lonIndex <
          grid.longitudes.length;
          lonIndex += lonSeedStep
        ) {
          const u =
            grid.u[
              latIndex
            ]?.[
              lonIndex
            ];

          const v =
            grid.v[
              latIndex
            ]?.[
              lonIndex
            ];

          if (
            typeof u !==
              'number' ||
            typeof v !==
              'number' ||
            !Number.isFinite(
              u
            ) ||
            !Number.isFinite(
              v
            )
          ) {
            continue;
          }

          const speed =
            Math.hypot(
              u,
              v
            );

          maxSpeed =
            Math.max(
              maxSpeed,
              speed
            );
        }
      }

      if (
        maxSpeed <= 0 ||
        !Number.isFinite(
          maxSpeed
        )
      ) {
        console.warn(
          '[VARUNA] No valid current speeds found'
        );

        return;
      }

      // --------------------------------------------------------
      // STREAMLINE STORAGE
      // --------------------------------------------------------

      const curves: {
        curve: THREE.CatmullRomCurve3;
        speed: number;
      }[] = [];

      let streamlineCount =
        0;

      // --------------------------------------------------------
      // BUILD STREAMLINES
      // --------------------------------------------------------

      for (
        let latIndex = 0;
        latIndex <
        grid.latitudes.length;
        latIndex += latSeedStep
      ) {
        for (
          let lonIndex = 0;
          lonIndex <
          grid.longitudes.length;
          lonIndex += lonSeedStep
        ) {
          const seedLat =
            grid.latitudes[
              latIndex
            ];

          const seedLon =
            grid.longitudes[
              lonIndex
            ];

          if (
            seedLat <
              LAT_LIMITS.min ||
            seedLat >
              LAT_LIMITS.max ||
            seedLon <
              LAT_LIMITS.minLon ||
            seedLon >
              LAT_LIMITS.maxLon
          ) {
            continue;
          }

          if (
            !isWaterBodyNearIndia(
              seedLat,
              seedLon
            )
          ) {
            continue;
          }

          const seedVelocity =
            sampleVelocity(
              grid,
              seedLat,
              seedLon
            );

          if (
            !seedVelocity
          ) {
            continue;
          }

          // ----------------------------------------------------
          // Ignore almost stagnant water.
          // ----------------------------------------------------

          if (
            seedVelocity.speed <
            Math.max(
              0.012,
              maxSpeed * 0.015
            )
          ) {
            continue;
          }

          const streamline =
            buildStreamline(
              grid,
              seedLat,
              seedLon
            );

          if (
            streamline.length <
            7
          ) {
            continue;
          }

          const points =
            streamlineToPoints(
              streamline
            );

          if (
            points.length <
            7
          ) {
            continue;
          }

          // ----------------------------------------------------
          // Smooth curved path.
          // ----------------------------------------------------

          const curve =
            new THREE.CatmullRomCurve3(
              points,
              false,
              'centripetal',
              0.25
            );

          const normalizedSpeed =
            Math.min(
              1,
              seedVelocity.speed /
                maxSpeed
            );

          curves.push({
            curve,
            speed:
              normalizedSpeed,
          });

          streamlineCount++;
        }
      }

      // ========================================================
      // DRAW EACH STREAMLINE
      // ========================================================

      curves.forEach(
        ({
          curve,
          speed,
        }) => {
          const curvePoints =
            curve.getPoints(
              42
            );

          // ----------------------------------------------------
          // GLOW LAYER
          // ----------------------------------------------------

          const glowGeometry =
            new THREE.BufferGeometry().setFromPoints(
              curvePoints
            );

          const glowMaterial =
            new THREE.LineBasicMaterial({
              color:
                0x22d3ee,

              transparent:
                true,

              opacity:
                0.14 +
                speed *
                  0.20,

              depthTest:
                false,

              depthWrite:
                false,
            });

          const glowLine =
            new THREE.Line(
              glowGeometry,
              glowMaterial
            );

          glowLine.renderOrder =
            39;

          glowLine.scale.set(
            1.002,
            1.002,
            1.002
          );

          group.add(
            glowLine
          );

          // ----------------------------------------------------
          // MAIN CURRENT LINE
          // ----------------------------------------------------

          const geometry =
            new THREE.BufferGeometry().setFromPoints(
              curvePoints
            );

          const material =
            new THREE.LineBasicMaterial({
              color:
                0x67e8f9,

              transparent:
                true,

              opacity:
                0.28 +
                speed *
                  0.55,

              depthTest:
                false,

              depthWrite:
                false,
            });

          const line =
            new THREE.Line(
              geometry,
              material
            );

          line.renderOrder =
            40;

          line.userData = {
            currentStreamline:
              true,
          };

          group.add(
            line
          );
        }
      );

      // ========================================================
      // MOVING FLOW PARTICLES
      // ========================================================

      curves.forEach(
        ({
          curve,
          speed,
        }) => {
          const particleCount =
            speed > 0.65
              ? 7
              : speed > 0.35
              ? 5
              : 3;

          for (
            let i = 0;
            i <
            particleCount;
            i++
          ) {
            const particleGeometry =
              new THREE.BufferGeometry();

            const initialProgress =
              i /
              particleCount;

            const initialPoint =
              curve.getPointAt(
                initialProgress
              );

            particleGeometry.setAttribute(
              'position',
              new THREE.Float32BufferAttribute(
                [
                  initialPoint.x,
                  initialPoint.y,
                  initialPoint.z,
                ],
                3
              )
            );

            const particleMaterial =
              new THREE.PointsMaterial({
                color:
                  0xa5f3fc,

                size:
                  0.032 +
                  speed *
                    0.032,

                transparent:
                  true,

                opacity:
                  0.55 +
                  speed *
                    0.40,

                depthTest:
                  false,

                depthWrite:
                  false,

                sizeAttenuation:
                  true,
              });

            const particle =
              new THREE.Points(
                particleGeometry,
                particleMaterial
              );

            particle.renderOrder =
              60;

            particle.userData = {
              particle:
                true,

              curve,

              progress:
                initialProgress,

              particleSpeed:
                0.00065 +
                speed *
                  0.0018,
            };

            group.add(
              particle
            );
          }
        }
      );

      console.log(
        `[VARUNA] Created ${streamlineCount} dense real current streamlines`
      );
    }, [
      showCurrents,
      currentDepth,
      timeIndex,
      gridVersion,
    ]);

    // ==========================================================
    // REGION CAMERA
    // ==========================================================

    useEffect(() => {
      const targetVec =
        latLonToVector3(
          currentRegion.lat,
          currentRegion.lon,
          currentRegion.zoomDistance *
            GLOBE_RADIUS
        );

      cameraTargetPosRef.current.copy(
        targetVec
      );
    }, [
      currentRegion,
    ]);

    // ==========================================================
    // OBSERVATION MARKERS
    // ==========================================================

    useEffect(() => {
      if (
        !markersGroupRef.current
      ) {
        return;
      }

      while (
        markersGroupRef.current
          .children.length > 0
      ) {
        markersGroupRef.current.remove(
          markersGroupRef.current
            .children[0]
        );
      }

      if (
        !showObservations
      ) {
        return;
      }

      OBSERVATION_POINTS
        .filter((obs) =>
          isWaterBodyNearIndia(
            obs.lat,
            obs.lon
          )
        )
        .forEach((obs) => {
          const pos =
            latLonToVector3(
              obs.lat,
              obs.lon,
              GLOBE_RADIUS *
                1.02
            );

          const isSelected =
            selectedObservation?.id ===
            obs.id;

          const markerGroup =
            new THREE.Group();

          markerGroup.position.copy(
            pos
          );

          markerGroup.userData = {
            observation: obs,
          };

          const coreGeo =
            new THREE.SphereGeometry(
              isSelected
                ? 0.055
                : 0.038,
              16,
              16
            );

          const coreMat =
            new THREE.MeshBasicMaterial({
              color:
                isSelected
                  ? 0xf59e0b
                  : obs.instrument ===
                    'Argo Float'
                  ? 0x06b6d4
                  : 0x10b981,
            });

          markerGroup.add(
            new THREE.Mesh(
              coreGeo,
              coreMat
            )
          );

          const ringGeo =
            new THREE.RingGeometry(
              0.045,
              0.07,
              24
            );

          const ringMat =
            new THREE.MeshBasicMaterial({
              color:
                isSelected
                  ? 0xf59e0b
                  : 0x38bdf8,

              side:
                THREE.DoubleSide,

              transparent:
                true,

              opacity:
                isSelected
                  ? 0.9
                  : 0.5,
            });

          const ringMesh =
            new THREE.Mesh(
              ringGeo,
              ringMat
            );

          ringMesh.name =
            'beacon';

          ringMesh.lookAt(
            pos
              .clone()
              .multiplyScalar(
                2
              )
          );

          markerGroup.add(
            ringMesh
          );

          markersGroupRef.current?.add(
            markerGroup
          );
        });
    }, [
      showObservations,
      selectedObservation,
      timeIndex,
    ]);

    // ==========================================================
    // ANOMALIES
    // ==========================================================

    useEffect(() => {
      if (
        !anomalyGroupRef.current
      ) {
        return;
      }

      while (
        anomalyGroupRef.current
          .children.length > 0
      ) {
        anomalyGroupRef.current.remove(
          anomalyGroupRef.current
            .children[0]
        );
      }

      if (
        !showAnomalies
      ) {
        return;
      }

      OCEAN_ANOMALIES
        .filter((anom) =>
          isWaterBodyNearIndia(
            anom.lat,
            anom.lon
          )
        )
        .forEach((anom) => {
          const pos =
            latLonToVector3(
              anom.lat,
              anom.lon,
              GLOBE_RADIUS *
                1.025
            );

          const isSelected =
            selectedAnomaly?.id ===
            anom.id;

          const anomalyGroup =
            new THREE.Group();

          anomalyGroup.position.copy(
            pos
          );

          anomalyGroup.userData = {
            anomaly: anom,
          };

          const contourGeo =
            new THREE.RingGeometry(
              0.12,
              0.19,
              32
            );

          const contourMat =
            new THREE.MeshBasicMaterial({
              color:
                anom.magnitude >
                0
                  ? 0xf43f5e
                  : 0x06b6d4,

              side:
                THREE.DoubleSide,

              transparent:
                true,

              opacity:
                isSelected
                  ? 0.85
                  : 0.6,
            });

          const contour =
            new THREE.Mesh(
              contourGeo,
              contourMat
            );

          contour.lookAt(
            pos
              .clone()
              .multiplyScalar(
                2
              )
          );

          anomalyGroup.add(
            contour
          );

          anomalyGroupRef.current?.add(
            anomalyGroup
          );
        });
    }, [
      showAnomalies,
      selectedAnomaly,
    ]);

    // ==========================================================
    // CURRENT VISIBILITY
    // ==========================================================

    useEffect(() => {
      if (
        currentArrowGroupRef.current
      ) {
        currentArrowGroupRef.current.visible =
          showCurrents;
      }
    }, [
      showCurrents,
    ]);

    // ==========================================================
    // MOUSE DOWN
    // ==========================================================

    const handleMouseDown = (
      e: React.MouseEvent
    ) => {
      isDraggingRef.current =
        true;

      previousMousePositionRef.current =
        {
          x: e.clientX,
          y: e.clientY,
        };
    };

    // ==========================================================
    // MOUSE MOVE
    // ==========================================================

    const handleMouseMove = (
      e: React.MouseEvent
    ) => {
      if (
        !containerRef.current ||
        !cameraRef.current ||
        !sceneRef.current
      ) {
        return;
      }

      const rect =
        containerRef.current.getBoundingClientRect();

      const mouseX =
        ((e.clientX -
          rect.left) /
          rect.width) *
          2 -
        1;

      const mouseY =
        -(
          ((e.clientY -
            rect.top) /
            rect.height) *
            2 -
          1
        );

      // --------------------------------------------------------
      // GLOBE ROTATION
      // --------------------------------------------------------

      if (
        isDraggingRef.current
      ) {
        const deltaX =
          e.clientX -
          previousMousePositionRef.current
            .x;

        const deltaY =
          e.clientY -
          previousMousePositionRef.current
            .y;

        const camPos =
          cameraCurrentPosRef.current;

        const radius =
          camPos.length();

        let phi =
          Math.acos(
            camPos.y /
              radius
          );

        let theta =
          Math.atan2(
            camPos.x,
            camPos.z
          );

        theta -=
          deltaX * 0.005;

        phi -=
          deltaY * 0.005;

        phi = Math.max(
          0.1,
          Math.min(
            Math.PI -
              0.1,
            phi
          )
        );

        cameraTargetPosRef.current.set(
          radius *
            Math.sin(phi) *
            Math.sin(theta),

          radius *
            Math.cos(phi),

          radius *
            Math.sin(phi) *
            Math.cos(theta)
        );

        previousMousePositionRef.current =
          {
            x: e.clientX,
            y: e.clientY,
          };

        return;
      }

      // --------------------------------------------------------
      // TELEMETRY
      // --------------------------------------------------------

      const raycaster =
        new THREE.Raycaster();

      raycaster.setFromCamera(
        new THREE.Vector2(
          mouseX,
          mouseY
        ),
        cameraRef.current
      );

      if (
        globeMeshRef.current
      ) {
        const intersects =
          raycaster.intersectObject(
            globeMeshRef.current
          );

        if (
          intersects.length >
          0
        ) {
          const point =
            intersects[0].point;

          const coords =
            vector3ToLatLon(
              point,
              GLOBE_RADIUS
            );

          if (
            !isWaterBodyNearIndia(
              coords.lat,
              coords.lon
            )
          ) {
            onHoverTelemetry(
              coords,
              null
            );

            return;
          }

          const val =
            nearestGridValue(
              oceanGridRef.current,
              coords.lat,
              coords.lon
            );

          const unit =
            VARIABLES[
              currentVariable
            ].unit;

          onHoverTelemetry(
            coords,

            val === null
              ? null
              : {
                  value:
                    Number(
                      val.toFixed(
                        2
                      )
                    ),
                  unit,
                }
          );
        } else {
          onHoverTelemetry(
            null,
            null
          );
        }
      }
    };

    // ==========================================================
    // MOUSE UP
    // ==========================================================

    const handleMouseUp =
      () => {
        isDraggingRef.current =
          false;
      };

    // ==========================================================
    // CLICK
    // ==========================================================

    const handleClick = (
      e: React.MouseEvent
    ) => {
      if (
        !containerRef.current ||
        !cameraRef.current ||
        !sceneRef.current
      ) {
        return;
      }

      const rect =
        containerRef.current.getBoundingClientRect();

      const mouseX =
        ((e.clientX -
          rect.left) /
          rect.width) *
          2 -
        1;

      const mouseY =
        -(
          ((e.clientY -
            rect.top) /
            rect.height) *
            2 -
          1
        );

      const raycaster =
        new THREE.Raycaster();

      raycaster.setFromCamera(
        new THREE.Vector2(
          mouseX,
          mouseY
        ),
        cameraRef.current
      );

      // --------------------------------------------------------
      // OBSERVATION CLICK
      // --------------------------------------------------------

      if (
        markersGroupRef.current &&
        showObservations
      ) {
        const intersects =
          raycaster.intersectObjects(
            markersGroupRef.current
              .children,
            true
          );

        if (
          intersects.length >
          0
        ) {
          let parent:
            | THREE.Object3D
            | null =
            intersects[0]
              .object;

          while (
            parent &&
            !parent.userData
              ?.observation
          ) {
            parent =
              parent.parent;
          }

          if (
            parent?.userData
              ?.observation
          ) {
            onSelectObservation(
              parent.userData
                .observation
            );

            return;
          }
        }
      }

      // --------------------------------------------------------
      // ANOMALY CLICK
      // --------------------------------------------------------

      if (
        anomalyGroupRef.current &&
        showAnomalies
      ) {
        const intersects =
          raycaster.intersectObjects(
            anomalyGroupRef.current
              .children,
            true
          );

        if (
          intersects.length >
          0
        ) {
          let parent:
            | THREE.Object3D
            | null =
            intersects[0]
              .object;

          while (
            parent &&
            !parent.userData
              ?.anomaly
          ) {
            parent =
              parent.parent;
          }

          if (
            parent?.userData
              ?.anomaly
          ) {
            onSelectAnomaly(
              parent.userData
                .anomaly
            );
          }
        }
      }
    };

    // ==========================================================
    // ZOOM
    // ==========================================================

    const handleWheel = (
      e: React.WheelEvent
    ) => {
      e.preventDefault();

      const zoomFactor =
        e.deltaY * 0.002;

      const currentDist =
        cameraTargetPosRef.current.length();

      const newDist =
        Math.max(
          2.6,
          Math.min(
            8.0,
            currentDist +
              zoomFactor
          )
        );

      cameraTargetPosRef.current.setLength(
        newDist
      );
    };

    // ==========================================================
    // RENDER
    // ==========================================================

    return (
      <div
        ref={
          containerRef
        }
        className="w-full h-full cursor-grab active:cursor-grabbing relative outline-none"
        onMouseDown={
          handleMouseDown
        }
        onMouseMove={
          handleMouseMove
        }
        onMouseUp={
          handleMouseUp
        }
        onMouseLeave={
          handleMouseUp
        }
        onClick={
          handleClick
        }
        onWheel={
          handleWheel
        }
      />
    );
  };