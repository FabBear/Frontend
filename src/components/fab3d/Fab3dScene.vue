<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { useTheme } from '@/composables/useTheme';

import type { Fab3dArea, Fab3dToolGroup, Fab3dVirtualAsset } from '@/types/fab3d';

import { mkGroundAmr, mkOhtCarrier, mkStocker } from '@/components/fab3d/fab3dAssets';
import { FP, HT, equipType, mkEquipment, setTowerSeverity } from '@/components/fab3d/fab3dEquipmentFactory';
import {
  makeAssetLabel,
  makeBayLabel,
  makeCountBadge,
  makeStockerBadge,
  makeZoneLabel,
} from '@/components/fab3d/fab3dLabels';
import {
  AREA_TO_BAY,
  BAYS,
  BAY_RAIL_RUNS,
  BAY_TO_STOCKER,
  FLOOR_D,
  FLOOR_SERVICE_RUNS,
  FLOOR_W,
  type Fab3dPoint,
  MAIN_SPINE_RUNS,
  OHT_CONNECTORS,
  OHT_Y,
  SERVICE_CHASE_RUNS,
  STOCKER_AREA_CODES,
  STOCKER_NODES,
  ZONE_BANDS,
} from '@/components/fab3d/fab3dLayoutConfig';
import { pointOnPolyline } from '@/components/fab3d/fab3dPaths';

import { formatRatioPercent } from '@/utils/format';

const { isDark } = useTheme();

const props = defineProps<{ areas: Fab3dArea[] }>();
const emit = defineEmits<{ selectTg: [tg: Fab3dToolGroup]; selectAsset: [asset: Fab3dVirtualAsset] }>();

const containerRef = ref<HTMLElement | null>(null);

let renderer: THREE.WebGLRenderer;
let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let controls: OrbitControls;
let animId = 0;
let ro: ResizeObserver;

// ── Theme-sensitive scene objects ─────────────────────────────────────
let _floor: THREE.Mesh | null = null;
let _border: THREE.Line | null = null;
let _cornerLights: THREE.PointLight[] = [];
let _amhsTracks: THREE.Mesh[] = [];
const _bayFloors: { mesh: THREE.Mesh; areaCode: string }[] = [];
const _zoneFloors: { mesh: THREE.Mesh; type: string }[] = [];
const _zoneDividers: THREE.Line[] = [];
const _utilityChases: THREE.Mesh[] = [];
const _floorServiceLanes: THREE.Mesh[] = [];

function sceneTheme() {
  const d = isDark.value;
  return {
    bg: d ? 0x0e1a2e : 0xa4a8a2,
    bgHex: d ? '#0e1a2e' : '#a4a8a2',
    floor: d ? 0x0e1a2c : 0xd8ceb2,
    grid1: d ? 0x2a4870 : 0xbdc5d0,
    grid2: d ? 0x1a3050 : 0xcbd2da,
    border: d ? 0x00ccff : 0x5f6b61,
    borderGlow: d ? 3.0 : 1.2,
    amhs: d ? 0x1e3a6a : 0x9d927c,
  };
}

function bayColor(areaCode: string): number {
  if (!isDark.value) {
    switch (areaCode) {
      case 'LITHO':
      case 'LITHO_MET':
        return 0x8fa7bd;
      case 'DRY_ETCH':
        return 0x9ba2ad;
      case 'DIFFUSION':
        return 0xa8ad8d;
      case 'IMPLANT':
        return 0xa59bb3;
      case 'DEF_MET':
        return 0xa4a098;
      case 'DIELECTRIC':
        return 0x9cb3b3;
      case 'PLANAR':
        return 0xaa9f8c;
      case 'WET_ETCH':
        return 0xb7a17d;
      default:
        return 0xa69c8a;
    }
  }
  switch (areaCode) {
    case 'LITHO':
    case 'LITHO_MET':
      return 0x18224a;
    case 'DRY_ETCH':
      return 0x1c2e48;
    case 'DIFFUSION':
      return 0x182c38;
    case 'IMPLANT':
      return 0x1e2838;
    case 'DEF_MET':
      return 0x1a2c40;
    case 'DIELECTRIC':
      return 0x1a2840;
    case 'PLANAR':
      return 0x1c2844;
    case 'WET_ETCH':
      return 0x182838;
    default:
      return 0x1a2840;
  }
}

const hitMeshes = new Map<THREE.Mesh, Fab3dToolGroup>();
const hitToBayFloor = new Map<THREE.Mesh, { mesh: THREE.Mesh; areaCode: string }>();
const tgHitMeshes = new Map<string, THREE.Mesh>();
const assetHitMeshes = new Map<THREE.Mesh, Fab3dVirtualAsset>();
const alertSpheres: THREE.Mesh[] = [];
// 실시간 상태 갱신용 — tgId → 신호탑 세그먼트 / 알람 구체 (지오메트리 재생성 없이 토글)
const tgTower = new Map<string, THREE.Mesh[]>();
const tgAlert = new Map<string, THREE.Mesh>();
const amrs: { mesh: THREE.Group; from: THREE.Vector3; to: THREE.Vector3; t: number; spd: number }[] = [];
const ohtVehicles: { mesh: THREE.Group; path: THREE.Vector3[]; t: number; spd: number }[] = [];
const keysHeld = new Set<string>();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// ── 선택 / 줌 상태 ──────────────────────────────────────────────────────
let _selectionRing: THREE.Mesh | null = null;
let _selectedBayMeshes: THREE.Mesh[] = [];
let _flowHighlights: THREE.Mesh[] = [];
const _neighborRings: THREE.Mesh[] = [];
let _selectedTgAreaCode: string | null = null;
let _selectedTgHitMesh: THREE.Mesh | null = null;
let _flowPrevId: string | null = null;
let _flowNextId: string | null = null;
interface ZoomAnim {
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
  t: number;
}
let zoomAnim: ZoomAnim | null = null;

const hoveredTg = ref<Fab3dToolGroup | null>(null);
const hoveredAsset = ref<Fab3dVirtualAsset | null>(null);
const tipX = ref(0);
const tipY = ref(0);

function uHex(u: number) {
  if (u >= 0.9) return 'var(--color-risk-critical)';
  if (u >= 0.85) return 'var(--color-risk-high)';
  if (u >= 0.7) return 'var(--color-risk-medium)';
  return 'var(--color-risk-low)';
}
function uLabel(u: number) {
  if (u >= 0.9) return 'Critical';
  if (u >= 0.85) return 'High';
  if (u >= 0.7) return 'Medium';
  return 'Low';
}

function cs(m: THREE.Mesh) {
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function v3(point: Fab3dPoint) {
  return new THREE.Vector3(point.x, point.y, point.z);
}

// ── Bay layout: Spine & Bay 구조 ──────────────────────────────────────
// aisleZ: 각 bay 내부 aisle의 Z 좌표
// aisleW: aisle 중심에서 각 row까지의 거리 (작을수록 bay가 compact)
// Row A: aisleZ + aisleW  (rotY = π, faces -z toward aisle)
// Row B: aisleZ - aisleW  (rotY = 0, faces +z toward aisle)
// 두 row가 서로를 마주봄
//
// Row 간 간격 검증 (aisleW=5, margin=3):
//  bayD = aisleW*2 + fpD*sc + 3  →  북1열 max ≈ -20+7.5=-12.5  북2열 min ≈ -42-7.5=-49.5
//  실제 gap ≈ 6~8 units ─ 겹침 없음
// ──────────────────────────────────────────────────────────────────────
// ── Lifecycle ──────────────────────────────────────────────────────────
onMounted(async () => {
  if (!containerRef.value) return;
  await nextTick();
  let sceneReady = false;
  try {
    initScene();
    buildFab();
    buildAMRs();
    buildOHTVehicles();
    sceneReady = true;
  } catch (e) {
    console.error('[Fab3D] build error:', e);
  }
  if (!sceneReady) return;
  startLoop();
  ro = new ResizeObserver(handleResize);
  ro.observe(containerRef.value);
  handleResize();
});
onBeforeUnmount(() => {
  ro?.disconnect();
  cancelAnimationFrame(animId);
  controls?.dispose();
  scene?.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.LineSegments) {
      obj.geometry.dispose();
      const mat = obj.material;
      if (Array.isArray(mat)) mat.forEach((m) => (m as THREE.Material).dispose());
      else (mat as THREE.Material).dispose();
    }
  });
  renderer?.dispose();
  containerRef.value?.removeEventListener('mousemove', onMouseMove);
  containerRef.value?.removeEventListener('click', onClick);
  containerRef.value?.removeEventListener('mouseleave', onMouseLeave);
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
});

// ── Scene setup ────────────────────────────────────────────────────────
function initScene() {
  const el = containerRef.value!;
  const W = el.clientWidth || el.offsetWidth || 1200;
  const H = el.clientHeight || el.offsetHeight || 700;
  const t = sceneTheme();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(t.bg);
  scene.fog = new THREE.FogExp2(t.bgHex, 0.003);

  camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 600);
  camera.position.set(0, 52, 90);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.LinearToneMapping;
  renderer.toneMappingExposure = 1.0;
  el.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 2.4));
  scene.add(new THREE.HemisphereLight(0xaaccff, 0x223344, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 3.0);
  key.position.set(55, 130, 45);
  key.castShadow = true;
  key.shadow.mapSize.width = key.shadow.mapSize.height = 4096;
  Object.assign(key.shadow.camera, { left: -110, right: 110, top: 70, bottom: -70, far: 500 });
  scene.add(key);
  const fill1 = new THREE.DirectionalLight(0xccddff, 1.8);
  fill1.position.set(-60, 80, -40);
  scene.add(fill1);
  const fill2 = new THREE.DirectionalLight(0xffffff, 1.4);
  fill2.position.set(0, 50, -100);
  scene.add(fill2);

  // Fab 바닥 — 실제 장비 범위 x ±83, z ±53 에 맞춰 여유 포함
  _floor = cs(
    new THREE.Mesh(new THREE.PlaneGeometry(FLOOR_W, FLOOR_D), new THREE.MeshLambertMaterial({ color: t.floor }))
  );
  _floor.rotation.x = -Math.PI / 2;
  _floor.position.y = -0.02;
  scene.add(_floor);

  // Fab 경계선 (x: ±90, z: ±57)
  const bp = [
    new THREE.Vector3(-90, 0.25, -57),
    new THREE.Vector3(90, 0.25, -57),
    new THREE.Vector3(90, 0.25, 57),
    new THREE.Vector3(-90, 0.25, 57),
    new THREE.Vector3(-90, 0.25, -57),
  ];
  _border = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(bp),
    new THREE.LineBasicMaterial({ color: t.border })
  );
  scene.add(_border);
  _cornerLights = [];
  [
    [-90, -57],
    [90, -57],
    [90, 57],
    [-90, 57],
  ].forEach(([x, z]) => {
    const pl = new THREE.PointLight(t.border, t.borderGlow, 35);
    pl.position.set(x as number, 1, z as number);
    scene.add(pl);
    _cornerLights.push(pl);
  });

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.minPolarAngle = Math.PI / 12;
  controls.maxPolarAngle = Math.PI / 2.05;
  controls.minDistance = 12;
  controls.maxDistance = 200;
  controls.target.set(0, 0, 0);

  // 트랙패드 수평 스와이프가 브라우저 뒤로/앞으로가기로 처리되는 것을 방지
  renderer.domElement.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
    },
    { passive: false }
  );

  el.addEventListener('mousemove', onMouseMove);
  el.addEventListener('click', onClick);
  el.addEventListener('mouseleave', onMouseLeave);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
}

// ── Keyboard navigation ────────────────────────────────────────────────
function onKeyDown(e: KeyboardEvent) {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
    e.preventDefault();
    keysHeld.add(e.key);
  }
}
function onKeyUp(e: KeyboardEvent) {
  keysHeld.delete(e.key);
}

function applyKeyNav() {
  if (!keysHeld.size || zoomAnim) return;
  const distance = camera.position.distanceTo(controls.target);
  const speed = Math.max(0.18, Math.min(1.4, distance * 0.018));
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();

  const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
  const delta = new THREE.Vector3();
  if (keysHeld.has('ArrowLeft')) delta.addScaledVector(right, -speed);
  if (keysHeld.has('ArrowRight')) delta.addScaledVector(right, speed);
  if (keysHeld.has('ArrowUp')) delta.addScaledVector(forward, speed);
  if (keysHeld.has('ArrowDown')) delta.addScaledVector(forward, -speed);

  camera.position.add(delta);
  controls.target.add(delta);
}

// ── Zone floor colours ─────────────────────────────────────────────────
// Each zone type gets a subtle tint so the process row is visible at a glance.
// light mode: clearly distinct from white equipment; dark mode: distinct from base.
function zoneFloorColor(type: string): number {
  // 공정 band는 ZONE_BANDS 단일 출처에서 — 범례 스와치와 항상 일치.
  const band = ZONE_BANDS.find((b) => b.type === type);
  if (band) return isDark.value ? band.dark : band.light;
  // 인프라 band(spine/chase)는 자체 톤 유지.
  if (isDark.value) {
    switch (type) {
      case 'spine':
        return 0x1a2e46;
      case 'chase':
        return 0x223344;
      default:
        return 0x101c34;
    }
  }
  switch (type) {
    case 'spine':
      return 0xcfc4a8;
    case 'chase':
      return 0xc4c0ae;
    default:
      return 0xd8ceb2;
  }
}

// ── Zone floor strips (공정 구역 바닥) ─────────────────────────────────
// Zones share exact boundaries so there are no gaps or z-fighting overlaps.
// Max bay platform depth = aisleW×2 + fpD(etch)×sc_max + 3 = 10+5.4+3 = 18.4
// depth 22 gives 1.8-unit margin on each side for all bay types.
//
//  north-2: z −53 ↔ −31   (aisleZ −42, depth 22)
//  north-1: z −31 ↔  −9   (aisleZ −20, depth 22)
//  spine:   z  −9 ↔  +9   (aisleZ   0, depth 18)
//  south-1: z  +9 ↔ +31   (aisleZ +20, depth 22)
//  south-2: z +31 ↔ +53   (aisleZ +42, depth 22)
function buildZoneFloors() {
  const zones: { type: string; label: string; z: number; depth: number }[] = [
    { type: 'chase', label: 'NORTH SERVICE CHASE', z: -54, depth: 6 },
    { type: 'photo', label: 'BAY 1 / LITHO & METROLOGY', z: -43, depth: 15 },
    { type: 'spine', label: 'MAIN INTERBAY SPINE / OHT MAIN RAIL', z: -28, depth: 9 },
    { type: 'process', label: 'BAY 2 / PROCESS TOOLS', z: -13, depth: 15 },
    { type: 'chase', label: 'CENTER SERVICE CHASE', z: 0, depth: 6 },
    { type: 'thermal', label: 'BAY 3 / THERMAL & IMPLANT', z: 13, depth: 15 },
    { type: 'spine', label: 'SECONDARY INTERBAY SPINE / OHT RAIL', z: 28, depth: 9 },
    { type: 'chemical', label: 'BAY 4 / CHEMICAL & CMP', z: 43, depth: 15 },
    { type: 'chase', label: 'SOUTH SERVICE CHASE', z: 54, depth: 6 },
  ];
  zones.forEach(({ type, label, z, depth }) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(FLOOR_W, depth),
      new THREE.MeshLambertMaterial({ color: zoneFloorColor(type) })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(0, 0.005, z);
    scene.add(mesh);
    _zoneFloors.push({ mesh, type });

    const zoneLabel = makeZoneLabel(label, isDark.value);
    zoneLabel.position.set(-86, 0.45, z - depth / 2 + 2.4);
    scene.add(zoneLabel);
  });

  // Band boundaries. Keep them subtle; the structure should read as lanes, not rooms.
  const divCol = isDark.value ? 0x2a4070 : 0x6e796f;
  for (const z of [-57, -50, -35.5, -32.5, -23.5, -20.5, -5.5, 5.5, 20.5, 23.5, 32.5, 35.5, 50, 57]) {
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-92, 0.15, z), new THREE.Vector3(92, 0.15, z)]),
      new THREE.LineBasicMaterial({ color: divCol })
    );
    scene.add(line);
    _zoneDividers.push(line);
  }
}

function utilityChaseColor(): number {
  return isDark.value ? 0x28405a : 0x8f897d;
}

function buildUtilityChases() {
  const mat = new THREE.MeshLambertMaterial({
    color: utilityChaseColor(),
    transparent: true,
    opacity: isDark.value ? 0.72 : 0.82,
  });
  SERVICE_CHASE_RUNS.forEach(({ z }) => {
    const chase = new THREE.Mesh(new THREE.BoxGeometry(FLOOR_W - 10, 0.08, 1.2), mat.clone());
    chase.position.set(0, 0.2, z);
    scene.add(chase);
    _utilityChases.push(chase);
  });
}

function floorServiceLaneColor(): number {
  return isDark.value ? 0x2fd8a0 : 0x8f897d;
}

function buildFloorServiceLanes() {
  const mat = new THREE.MeshBasicMaterial({
    color: floorServiceLaneColor(),
    transparent: true,
    opacity: isDark.value ? 0.62 : 0.55,
  });
  FLOOR_SERVICE_RUNS.forEach(({ path }) => {
    const a = v3(path[0]);
    const b = v3(path[1]);
    const dx = Math.abs(a.x - b.x);
    const dz = Math.abs(a.z - b.z);
    const lane = new THREE.Mesh(new THREE.BoxGeometry(Math.max(dx, 0.55), 0.045, Math.max(dz, 0.55)), mat.clone());
    lane.position.set((a.x + b.x) / 2, 0.17, (a.z + b.z) / 2);
    scene.add(lane);
    _floorServiceLanes.push(lane);
  });
}

function getStockerStats(label: string): { wip: number; queue: number } {
  const areaCodes = STOCKER_AREA_CODES[label] ?? [];
  const toolGroups = props.areas.filter((area) => areaCodes.includes(area.areaCode)).flatMap((area) => area.toolGroups);
  return {
    wip: toolGroups.reduce((sum, tg) => sum + tg.wipCount, 0),
    queue: toolGroups.reduce((sum, tg) => sum + tg.waitingLots, 0),
  };
}

function registerAssetHitbox(
  asset: Fab3dVirtualAsset,
  parent: THREE.Group,
  size: [number, number, number],
  center: THREE.Vector3
) {
  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  hit.position.copy(center);
  assetHitMeshes.set(hit, asset);
  parent.add(hit);
}

function buildStockers() {
  STOCKER_NODES.forEach(({ label, x, z, location, route }) => {
    const stats = getStockerStats(label);
    const asset: Fab3dVirtualAsset = {
      assetId: label.toLowerCase(),
      assetName: label,
      assetType: 'STOCKER',
      status: 'FOUP 임시 보관 중',
      location,
      route,
      load: `담당 Bay WIP ${stats.wip.toLocaleString('ko-KR')} · 대기 ${stats.queue.toLocaleString('ko-KR')}`,
      eta: '-',
      description:
        'Bay와 Spine 사이에서 FOUP를 임시 보관하고 OHT 반송을 중계하는 물류 노드입니다. 표시된 WIP·대기는 이 Stocker가 담당하는 Bay들의 TG 합산값으로, Stocker 자체 적재량이 아닙니다.',
    };
    const stocker = mkStocker(label, isDark.value);
    stocker.position.set(x, 0.28, z);
    const badge = makeStockerBadge(label, stats.wip, stats.queue);
    badge.position.set(0, 6.25, 1.55);
    stocker.add(badge);
    registerAssetHitbox(asset, stocker, [6.2, 5.6, 3.2], new THREE.Vector3(0, 2.6, 0));
    scene.add(stocker);
  });
}

function buildOhtRails() {
  const amhsColor = sceneTheme().amhs;
  _amhsTracks = [];

  const makeRail = (geo: THREE.BoxGeometry, x: number, z: number) => {
    const rail = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: amhsColor }));
    rail.position.set(x, OHT_Y, z);
    scene.add(rail);
    _amhsTracks.push(rail);
  };

  MAIN_SPINE_RUNS.forEach(({ z, xLen, cx }) => makeRail(new THREE.BoxGeometry(xLen, 0.2, 0.72), cx, z));
  BAY_RAIL_RUNS.forEach(({ z, xLen, cx }) => makeRail(new THREE.BoxGeometry(xLen, 0.16, 0.52), cx, z));
  OHT_CONNECTORS.forEach(({ x, z1, z2 }) => {
    makeRail(new THREE.BoxGeometry(0.52, 0.16, Math.abs(z2 - z1)), x, (z1 + z2) / 2);
  });

  // 지지 기둥: 고정 격자 대신 실제 레일 run에서 파생 → 레일 전 구간(양 끝 포함)을 받친다.
  const supportMat = new THREE.MeshBasicMaterial({ color: isDark.value ? 0x405068 : 0xaeb8c3 });
  const POST_INTERVAL = 26;
  const addPostsAlong = (z: number, cx: number, xLen: number) => {
    const start = cx - xLen / 2;
    const end = cx + xLen / 2;
    const count = Math.max(2, Math.round(xLen / POST_INTERVAL) + 1);
    for (let i = 0; i < count; i++) {
      const x = start + (end - start) * (i / (count - 1));
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, OHT_Y, 0.12), supportMat);
      post.position.set(x, OHT_Y / 2, z);
      scene.add(post);
    }
  };
  [...MAIN_SPINE_RUNS, ...BAY_RAIL_RUNS].forEach(({ z, cx, xLen }) => addPostsAlong(z, cx, xLen));
}

// ── Build fab ──────────────────────────────────────────────────────────
function buildFab() {
  buildZoneFloors();
  buildUtilityChases();
  buildFloorServiceLanes();
  buildOhtRails();
  buildStockers();

  const areaMap = new Map(props.areas.map((a) => [a.areaCode, a]));

  // ── 장비 배치 ───────────────────────────────────────────────────────
  BAYS.forEach((bay) => {
    const area = areaMap.get(bay.areaCode);
    if (!area) return;

    const allTgs = bay.tgFilter ? area.toolGroups.filter((tg) => bay.tgFilter!(tg.tgName)) : area.toolGroups;
    const tgs = allTgs.slice(bay.slice[0], bay.slice[1]);
    if (!tgs.length) return;
    if (bay.areaCode === 'OTHER') {
      buildDelayBufferBay(bay, tgs[0]);
      return;
    }

    // Row A: aisleZ + aisleW (aisle 기준 +z 측, faces -z)
    // Row B: aisleZ - aisleW (aisle 기준 -z 측, faces +z)
    const rowAz = bay.aisleZ + bay.aisleW;
    const rowBz = bay.aisleZ - bay.aisleW;
    const rowATgs = tgs.slice(0, bay.cols);
    const rowBTgs = tgs.slice(bay.cols);

    // Bay 플랫폼 크기
    // bayD = aisleW*2 + fpD*sc + 3  →  행 간 gap 보장
    const firstType = equipType(tgs[0].tgName);
    const [fpW, fpD] = FP[firstType] ?? [3.5, 3.5];
    const maxCount = Math.max(rowATgs.length, rowBTgs.length);
    const bayW = (maxCount - 1) * bay.colSp + fpW * bay.sc + 3.0;
    const bayD = bay.aisleW * 2 + fpD * bay.sc + 3.0;

    const maxU = Math.max(...tgs.map((t) => t.utilizationRate));
    const edgeCol = maxU >= 0.9 ? 0x993333 : maxU >= 0.85 ? 0x886622 : 0x2248aa;

    const plat = cs(
      new THREE.Mesh(
        new THREE.BoxGeometry(bayW, 0.28, bayD),
        new THREE.MeshLambertMaterial({ color: bayColor(bay.areaCode) })
      )
    );
    plat.position.set(bay.cx, 0.14, bay.aisleZ);
    scene.add(plat);
    _bayFloors.push({ mesh: plat, areaCode: bay.areaCode });

    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(bayW, 0.28, bayD)),
      new THREE.LineBasicMaterial({ color: edgeCol })
    );
    edge.position.copy(plat.position);
    scene.add(edge);

    if (bay.label) {
      const lbl = makeBayLabel(bay.label, maxU);
      lbl.position.set(bay.cx, 1.7, bay.aisleZ - bayD / 2 - 1.2);
      scene.add(lbl);
    }

    // Row 배치 함수 — 두 row가 aisle을 사이에 두고 서로 마주봄
    const placeRow = (rowTgs: Fab3dToolGroup[], rowZ: number) => {
      if (!rowTgs.length) return;
      // rowZ > aisleZ → aisle 남쪽 → 북쪽(−z) 방향으로 마주보기 → rotY = π
      // rowZ < aisleZ → aisle 북쪽 → 남쪽(+z) 방향으로 마주보기 → rotY = 0
      const rotY = rowZ > bay.aisleZ ? Math.PI : 0;
      const cnt = rowTgs.length;
      rowTgs.forEach((tg, i) => {
        const tx = bay.cx - ((cnt - 1) * bay.colSp) / 2 + i * bay.colSp;
        const type = equipType(tg.tgName);
        const eqH = (HT[type] ?? 2.0) * bay.sc;

        // 신호탑 신호는 권위 있는 상태값 tg.risk로 (CRITICAL=빨강 / WARNING=노랑 / NORMAL=초록)
        const sev = tg.risk === 'CRITICAL' ? 2 : tg.risk === 'WARNING' ? 1 : 0;
        const eq = mkEquipment(type, tg.utilizationRate, sev);
        eq.scale.setScalar(bay.sc);
        eq.position.set(tx, 0.28, rowZ);
        eq.rotation.y = rotY;
        eq.traverse((c) => {
          if (c instanceof THREE.Mesh) {
            c.castShadow = true;
            c.receiveShadow = true;
          }
        });
        scene.add(eq);
        if (Array.isArray(eq.userData.towerSegs)) tgTower.set(tg.tgId, eq.userData.towerSegs);

        if (tg.toolCount > 1 && !tg.tgName.startsWith('Delay_')) {
          const badge = makeCountBadge(tg.toolCount, tg.utilizationRate);
          badge.position.set(tx, 0.28 + eqH + 0.72, rowZ);
          scene.add(badge);
        }

        // 알람 구체: 항상 생성하고 가동률≥0.9일 때만 표시 → 실시간 갱신 시 visible만 토글.
        const alert = new THREE.Mesh(
          new THREE.SphereGeometry(0.85, 16, 12),
          new THREE.MeshBasicMaterial({ color: 0xc00000, transparent: true, opacity: 0.82 })
        );
        alert.position.set(tx, 0.28 + eqH + 1.9, rowZ);
        alert.visible = tg.utilizationRate >= 0.9;
        scene.add(alert);
        alertSpheres.push(alert);
        tgAlert.set(tg.tgId, alert);

        const [hitW, hitD] = FP[type] ?? [3.5, 3.5];
        const hasCluster = tg.toolCount > 1;
        const hit = new THREE.Mesh(
          new THREE.BoxGeometry(
            hitW * bay.sc * (hasCluster ? 1.85 : 1.1),
            eqH + 2.2,
            hitD * bay.sc * (hasCluster ? 2.35 : 1.1)
          ),
          new THREE.MeshBasicMaterial({ visible: false })
        );
        hit.position.set(tx, (eqH + 2.2) / 2, rowZ);
        hitMeshes.set(hit, tg);
        tgHitMeshes.set(tg.tgId, hit);
        hitToBayFloor.set(hit, { mesh: plat, areaCode: bay.areaCode });
        scene.add(hit);
      });
    };

    placeRow(rowATgs, rowAz);
    placeRow(rowBTgs, rowBz);
  });
}

function buildDelayBufferBay(bay: (typeof BAYS)[number], tg: Fab3dToolGroup) {
  const padW = 8.4;
  const padD = 5.8;
  const pad = cs(
    new THREE.Mesh(
      new THREE.BoxGeometry(padW, 0.18, padD),
      new THREE.MeshLambertMaterial({ color: isDark.value ? 0x25334a : 0xd6ccae })
    )
  );
  pad.position.set(bay.cx, 0.12, bay.aisleZ);
  scene.add(pad);
  _bayFloors.push({ mesh: pad, areaCode: bay.areaCode });

  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(padW, 0.18, padD)),
    new THREE.LineBasicMaterial({ color: isDark.value ? 0x4a6f9a : 0x8f7b55 })
  );
  edge.position.copy(pad.position);
  scene.add(edge);

  const rackMat = new THREE.MeshPhongMaterial({ color: isDark.value ? 0x4c6178 : 0xb7bec5, shininess: 70 });
  const activeMat = new THREE.MeshBasicMaterial({ color: 0x5fb95a, transparent: true, opacity: 0.9 });
  const idleMat = new THREE.MeshBasicMaterial({
    color: isDark.value ? 0x516070 : 0x9aa3af,
    transparent: true,
    opacity: 0.75,
  });
  for (let i = 0; i < 8; i += 1) {
    const x = -2.8 + i * 0.8;
    const rack = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.68, 2.2), rackMat);
    rack.position.set(bay.cx + x, 0.58, bay.aisleZ);
    scene.add(rack);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.08, 1.78), i < 2 ? activeMat : idleMat);
    slot.position.set(bay.cx + x, 0.96, bay.aisleZ);
    scene.add(slot);
  }

  const lbl = makeBayLabel('Delay Buffer', tg.utilizationRate);
  lbl.position.set(bay.cx, 1.7, bay.aisleZ - padD / 2 - 1.2);
  scene.add(lbl);

  const hit = new THREE.Mesh(new THREE.BoxGeometry(padW, 2.0, padD), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(bay.cx, 1.0, bay.aisleZ);
  hitMeshes.set(hit, tg);
  tgHitMeshes.set(tg.tgId, hit);
  hitToBayFloor.set(hit, { mesh: pad, areaCode: bay.areaCode });
  scene.add(hit);
}

function buildAMRs() {
  FLOOR_SERVICE_RUNS.forEach(({ name, route, path }, i) => {
    const statuses = ['정비 부품 운반 중', 'Service Chase 점검 중', '충전 스테이션 복귀'];
    const asset: Fab3dVirtualAsset = {
      assetId: name.toLowerCase(),
      assetName: name,
      assetType: 'AMR',
      status: statuses[i % statuses.length],
      location: route,
      route,
      load: i % 2 === 0 ? '정비 Kit 적재' : '공차',
      eta: `${70 + i * 11}s`,
      description:
        '바닥 AMR은 주요 Lot 반송이 아니라 Service Chase와 외곽 통로에서 정비, 점검, 보조 운반을 담당합니다.',
    };
    const m = mkGroundAmr();
    const t = i / FLOOR_SERVICE_RUNS.length;
    const from = v3(path[0]);
    const to = v3(path[1]);
    m.position.lerpVectors(from, to, t);
    m.scale.setScalar(0.82);
    m.rotation.y = Math.abs(from.x - to.x) > Math.abs(from.z - to.z) ? Math.PI / 2 : 0;
    const label = makeAssetLabel(name);
    label.position.set(0, 3.25, 0);
    m.add(label);
    registerAssetHitbox(asset, m, [2.3, 3.2, 2.0], new THREE.Vector3(0, 1.35, 0));
    scene.add(m);
    amrs.push({ mesh: m, from, to, t, spd: 0.00012 + Math.random() * 0.00018 });
  });
}

function buildOHTVehicles() {
  const y = OHT_Y;
  const paths: THREE.Vector3[][] = [
    // Litho -> Main Spine -> Process interbay loop.
    [
      new THREE.Vector3(-70, y, -43),
      new THREE.Vector3(0, y, -43),
      new THREE.Vector3(0, y, -28),
      new THREE.Vector3(58, y, -28),
      new THREE.Vector3(58, y, -13),
      new THREE.Vector3(70, y, -13),
      new THREE.Vector3(58, y, -13),
      new THREE.Vector3(58, y, -28),
      new THREE.Vector3(0, y, -28),
      new THREE.Vector3(0, y, -43),
    ],
    // Process stocker shuttle along the main spine.
    [
      new THREE.Vector3(-86, y, -28),
      new THREE.Vector3(0, y, -28),
      new THREE.Vector3(86, y, -28),
      new THREE.Vector3(0, y, -28),
    ],
    // Thermal -> Secondary Spine -> Chemical loop.
    [
      new THREE.Vector3(-62, y, 13),
      new THREE.Vector3(0, y, 13),
      new THREE.Vector3(0, y, 28),
      new THREE.Vector3(58, y, 28),
      new THREE.Vector3(58, y, 43),
      new THREE.Vector3(72, y, 43),
      new THREE.Vector3(58, y, 43),
      new THREE.Vector3(58, y, 28),
      new THREE.Vector3(0, y, 28),
      new THREE.Vector3(0, y, 13),
    ],
    // Secondary spine shuttle.
    [
      new THREE.Vector3(-86, y, 28),
      new THREE.Vector3(0, y, 28),
      new THREE.Vector3(86, y, 28),
      new THREE.Vector3(0, y, 28),
    ],
    // Litho bay local loop.
    [
      new THREE.Vector3(-78, y, -43),
      new THREE.Vector3(-58, y, -43),
      new THREE.Vector3(-58, y, -28),
      new THREE.Vector3(0, y, -28),
      new THREE.Vector3(0, y, -43),
      new THREE.Vector3(55, y, -43),
    ],
  ];

  paths.forEach((path, i) => {
    const name = `OHT-${String(i + 1).padStart(2, '0')}`;
    const locations = [
      'Litho Bay ↔ Process Bay 반송 루프',
      'Main Spine 장거리 반송 레일',
      'Thermal Bay ↔ Wet/CMP Bay 반송 루프',
      'Secondary Spine 장거리 반송 레일',
      'Litho Bay 내부 반송 루프',
    ];
    const asset: Fab3dVirtualAsset = {
      assetId: name.toLowerCase(),
      assetName: name,
      assetType: 'OHT',
      status: i % 2 === 0 ? 'FOUP 반송 중' : 'Stocker 배차 대기',
      location: locations[i] ?? 'OHT Rail',
      route: `${path.length}개 waypoint 기반 OHT 경로`,
      load: i % 2 === 0 ? 'FOUP 적재' : '빈 Carrier',
      eta: `${45 + i * 18}s`,
      description: '천장 OHT는 Main Spine, Bay Loop, Stocker를 오가며 TG 간 FOUP/Lot 반송을 담당합니다.',
    };
    const carrier = mkOhtCarrier();
    const t = (i * 0.17) % 1;
    const pose = pointOnPolyline(path, t);
    carrier.position.copy(pose.position);
    carrier.rotation.y = pose.heading;
    const label = makeAssetLabel(name);
    label.position.set(0, -3.05, 0);
    carrier.add(label);
    registerAssetHitbox(asset, carrier, [2.7, 3.4, 2.0], new THREE.Vector3(0, -1.35, 0));
    scene.add(carrier);
    ohtVehicles.push({ mesh: carrier, path, t, spd: 0.00014 + Math.random() * 0.00016 });
  });
}

// ── Selection & zoom helpers ───────────────────────────────────────────
function clearSelection() {
  _selectedTgAreaCode = null;
  _selectedTgHitMesh = null;
  _flowPrevId = null;
  _flowNextId = null;
  if (_selectionRing) {
    scene.remove(_selectionRing);
    _selectionRing.geometry.dispose();
    _selectionRing = null;
  }
  _flowHighlights.forEach((mesh) => {
    scene.remove(mesh);
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
  });
  _flowHighlights = [];
  _selectedBayMeshes.forEach((mesh) => {
    const entry = _bayFloors.find((b) => b.mesh === mesh);
    if (entry) (mesh.material as THREE.MeshLambertMaterial).color.set(bayColor(entry.areaCode));
  });
  _selectedBayMeshes = [];
  _neighborRings.forEach((r) => {
    scene.remove(r);
    r.geometry.dispose();
    (r.material as THREE.Material).dispose();
  });
  _neighborRings.length = 0;
}

function flowMat(opacity: number) {
  return new THREE.MeshBasicMaterial({
    color: isDark.value ? 0x00e5ff : 0xd08a00,
    transparent: true,
    opacity,
    depthWrite: false,
  });
}

function addFlowSegment(x1: number, z1: number, x2: number, z2: number) {
  const dx = Math.abs(x2 - x1);
  const dz = Math.abs(z2 - z1);
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(Math.max(dx, 1.1), 0.18, Math.max(dz, 1.1)),
    flowMat(isDark.value ? 0.82 : 0.78)
  );
  mesh.position.set((x1 + x2) / 2, OHT_Y, (z1 + z2) / 2);
  scene.add(mesh);
  _flowHighlights.push(mesh);
}

function addFlowNode(x: number, z: number, radius = 1.0) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 0.22, 28),
    flowMat(isDark.value ? 0.92 : 0.88)
  );
  mesh.position.set(x, OHT_Y, z);
  scene.add(mesh);
  _flowHighlights.push(mesh);
}

function addLiftPost(x: number, z: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, OHT_Y - 0.3, 0.22), flowMat(isDark.value ? 0.42 : 0.32));
  mesh.position.set(x, (OHT_Y - 0.3) / 2 + 0.3, z);
  scene.add(mesh);
  _flowHighlights.push(mesh);
}

function highlightTgFlow(
  areaCode: string,
  toolPos: THREE.Vector3,
  nextTg: { pos: THREE.Vector3; areaCode: string } | null = null
) {
  const bayId = AREA_TO_BAY[areaCode];
  const stocker = STOCKER_NODES.find((node) => node.label === BAY_TO_STOCKER[bayId]);
  if (!stocker) return;
  const bay = BAYS.filter((candidate) => candidate.areaCode === areaCode).sort(
    (a, b) => Math.abs(a.aisleZ - toolPos.z) - Math.abs(b.aisleZ - toolPos.z)
  )[0];
  const aisleZ = bay?.aisleZ ?? toolPos.z;
  const spineZ = stocker.z < 0 ? -28 : 28;

  addLiftPost(toolPos.x, toolPos.z);
  addFlowSegment(toolPos.x, toolPos.z, toolPos.x, aisleZ);
  addFlowSegment(toolPos.x, aisleZ, stocker.x, aisleZ);
  addFlowSegment(stocker.x, aisleZ, stocker.x, stocker.z);
  addFlowSegment(stocker.x, stocker.z, stocker.x, spineZ);
  addFlowNode(toolPos.x, toolPos.z, 0.82);
  addFlowNode(toolPos.x, aisleZ, 0.72);
  addFlowNode(stocker.x, aisleZ, 0.72);
  addFlowNode(stocker.x, stocker.z, 0.92);
  addFlowNode(stocker.x, spineZ, 0.72);

  if (nextTg) {
    const nextBayId = AREA_TO_BAY[nextTg.areaCode];
    const nextStocker = STOCKER_NODES.find((n) => n.label === BAY_TO_STOCKER[nextBayId]);
    if (nextStocker) {
      const nextBay = BAYS.filter((c) => c.areaCode === nextTg.areaCode).sort(
        (a, b) => Math.abs(a.aisleZ - nextTg.pos.z) - Math.abs(b.aisleZ - nextTg.pos.z)
      )[0];
      const nextAisleZ = nextBay?.aisleZ ?? nextTg.pos.z;
      const nextSpineZ = nextStocker.z < 0 ? -28 : 28;
      addFlowSegment(stocker.x, spineZ, nextStocker.x, nextSpineZ);
      addFlowSegment(nextStocker.x, nextSpineZ, nextStocker.x, nextStocker.z);
      addFlowSegment(nextStocker.x, nextStocker.z, nextStocker.x, nextAisleZ);
      addFlowSegment(nextStocker.x, nextAisleZ, nextTg.pos.x, nextAisleZ);
      addFlowSegment(nextTg.pos.x, nextAisleZ, nextTg.pos.x, nextTg.pos.z);
      addLiftPost(nextTg.pos.x, nextTg.pos.z);
      addFlowNode(nextStocker.x, nextSpineZ, 0.72);
      addFlowNode(nextStocker.x, nextStocker.z, 0.92);
      addFlowNode(nextStocker.x, nextAisleZ, 0.72);
      addFlowNode(nextTg.pos.x, nextTg.pos.z, 0.82);
    } else {
      addFlowSegment(stocker.x, spineZ, stocker.x + (toolPos.x >= 0 ? 32 : -32), spineZ);
    }
  } else {
    addFlowSegment(stocker.x, spineZ, stocker.x + (toolPos.x >= 0 ? 32 : -32), spineZ);
  }
}

function updateHighlightToNextTg(nextTgId: string | null, nextAreaCode: string | null) {
  if (!_selectedTgAreaCode || !_selectedTgHitMesh) return;
  _flowHighlights.forEach((mesh) => {
    scene.remove(mesh);
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
  });
  _flowHighlights = [];
  let nextTg: { pos: THREE.Vector3; areaCode: string } | null = null;
  if (nextTgId && nextAreaCode) {
    const nextHit = tgHitMeshes.get(nextTgId);
    if (nextHit) nextTg = { pos: nextHit.position.clone(), areaCode: nextAreaCode };
  }
  highlightTgFlow(_selectedTgAreaCode, _selectedTgHitMesh.position, nextTg);
}

function selectAndHighlight(tg: Fab3dToolGroup, hitMesh: THREE.Mesh) {
  clearSelection();

  const bayFloor = hitToBayFloor.get(hitMesh);
  if (bayFloor) {
    _selectedTgAreaCode = bayFloor.areaCode;
    _selectedTgHitMesh = hitMesh;
    _selectedBayMeshes.push(bayFloor.mesh);
    (bayFloor.mesh.material as THREE.MeshLambertMaterial).color.set(isDark.value ? 0x1a4488 : 0x7aa8d8);
    highlightTgFlow(bayFloor.areaCode, hitMesh.position);
  }

  const type = equipType(tg.tgName);
  const [fpW, fpD] = FP[type] ?? [3.5, 3.5];
  const r = Math.max(fpW, fpD) * 0.65;
  _selectionRing = new THREE.Mesh(
    new THREE.RingGeometry(r, r + 0.28, 40),
    new THREE.MeshBasicMaterial({ color: 0x00e5ff, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
  );
  _selectionRing.rotation.x = -Math.PI / 2;
  _selectionRing.position.set(hitMesh.position.x, 0.36, hitMesh.position.z);
  scene.add(_selectionRing);
}

function selectAndHighlightAsset(hitMesh: THREE.Mesh) {
  clearSelection();
  const worldPos = new THREE.Vector3();
  hitMesh.getWorldPosition(worldPos);
  _selectionRing = new THREE.Mesh(
    new THREE.RingGeometry(1.25, 1.55, 40),
    new THREE.MeshBasicMaterial({ color: 0x00e5ff, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
  );
  _selectionRing.rotation.x = -Math.PI / 2;
  _selectionRing.position.set(worldPos.x, 0.36, worldPos.z);
  scene.add(_selectionRing);
}

function focusToolGroup(tg: Fab3dToolGroup, options: { zoom?: boolean } = {}) {
  const hitMesh =
    tgHitMeshes.get(tg.tgId) ??
    Array.from(hitMeshes.entries()).find(([, candidate]) => candidate.tgName === tg.tgName)?.[0];
  if (!hitMesh) return;
  selectAndHighlight(tg, hitMesh);
  if (options.zoom) zoomToTool(hitMesh.position);
}

function zoomToTool(toolPos: THREE.Vector3) {
  zoomAnim = {
    fromPos: camera.position.clone(),
    fromTarget: controls.target.clone(),
    toPos: toolPos.clone().add(new THREE.Vector3(0, 18, 22)),
    toTarget: new THREE.Vector3(toolPos.x, 0, toolPos.z),
    t: 0,
  };
}

// 현재 TG + 이전/다음 위치를 한 화면에 담도록 카메라를 줌아웃(높이·거리 ↑). 선택은 그대로.
function frameProcessFlow() {
  if (!camera || !controls) return;
  const pts: THREE.Vector3[] = [];
  if (_selectedTgHitMesh) pts.push(_selectedTgHitMesh.position);
  [_flowPrevId, _flowNextId].forEach((id) => {
    if (!id) return;
    const m = tgHitMeshes.get(id);
    if (m) pts.push(m.position);
  });
  if (!pts.length) return;

  const xs = pts.map((p) => p.x);
  const zs = pts.map((p) => p.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const target = new THREE.Vector3((minX + maxX) / 2, 0, (minZ + maxZ) / 2);
  const span = Math.max(maxX - minX, maxZ - minZ, 36);

  zoomAnim = {
    fromPos: camera.position.clone(),
    fromTarget: controls.target.clone(),
    toPos: target.clone().add(new THREE.Vector3(0, Math.max(46, span * 0.95), Math.max(50, span * 1.15))),
    toTarget: target,
    t: 0,
  };
}

function highlightNeighborTgs(prevTgId: string | null, nextTgId: string | null) {
  _flowPrevId = prevTgId;
  _flowNextId = nextTgId;
  _neighborRings.forEach((r) => {
    scene.remove(r);
    r.geometry.dispose();
    (r.material as THREE.Material).dispose();
  });
  _neighborRings.length = 0;

  const addRing = (tgId: string, color: number) => {
    const hitMesh = tgHitMeshes.get(tgId);
    if (!hitMesh) return;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.6, 2.0, 36),
      new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(hitMesh.position.x, 0.42, hitMesh.position.z);
    scene.add(ring);
    _neighborRings.push(ring);
  };

  if (prevTgId) addRing(prevTgId, 0x4488ff);
  if (nextTgId) addRing(nextTgId, 0xff8800);
}

function zoomToArea(areaCode: string) {
  if (!camera || !controls) return;
  const bayConfigs = BAYS.filter((bay) => bay.areaCode === areaCode);
  if (!bayConfigs.length) return;

  // 한 area가 떨어진 Z-band에 나뉘어 있으면(예: DIELECTRIC=Thin Film z-13 + Dielectric z43)
  // 중심을 평균내면 빈 바닥을 비추게 된다. → bay 수가 가장 많은 band(밀집 cluster)만 프레이밍.
  const byBand = new Map<number, typeof bayConfigs>();
  for (const bay of bayConfigs) {
    const arr = byBand.get(bay.aisleZ) ?? [];
    arr.push(bay);
    byBand.set(bay.aisleZ, arr);
  }
  const focus = [...byBand.values()].sort((a, b) => b.length - a.length)[0];

  // 실제 장비가 차지하는 x 범위(cx ± 폭/2)와 z 범위로 bounding box 계산 → 빈 곳 회피.
  const xMins: number[] = [];
  const xMaxs: number[] = [];
  focus.forEach((b) => {
    const halfW = (b.cols * b.colSp + b.aisleW * 2) / 2;
    xMins.push(b.cx - halfW);
    xMaxs.push(b.cx + halfW);
  });
  const minX = Math.min(...xMins);
  const maxX = Math.max(...xMaxs);
  const centerX = (minX + maxX) / 2;
  const centerZ = focus[0].aisleZ;
  const span = Math.max(maxX - minX, 24);
  const target = new THREE.Vector3(centerX, 0, centerZ);

  clearSelection();
  zoomAnim = {
    fromPos: camera.position.clone(),
    fromTarget: controls.target.clone(),
    toPos: target.clone().add(new THREE.Vector3(0, Math.max(22, span * 0.42), Math.max(26, span * 0.62))),
    toTarget: target,
    t: 0,
  };
}

function startLoop() {
  function animate() {
    animId = requestAnimationFrame(animate);
    if (!renderer || !scene || !camera || !controls) return;
    const now = Date.now();

    applyKeyNav();

    // Zoom animation (ease-out cubic)
    if (zoomAnim) {
      zoomAnim.t = Math.min(1, zoomAnim.t + 0.04);
      const e = 1 - Math.pow(1 - zoomAnim.t, 3);
      camera.position.lerpVectors(zoomAnim.fromPos, zoomAnim.toPos, e);
      controls.target.lerpVectors(zoomAnim.fromTarget, zoomAnim.toTarget, e);
      if (zoomAnim.t >= 1) zoomAnim = null;
    }

    controls.update();

    // Selection ring pulse
    if (_selectionRing) {
      const p = 0.65 + 0.35 * Math.sin(now * 0.004);
      (_selectionRing.material as THREE.MeshBasicMaterial).opacity = p;
      _selectionRing.scale.setScalar(0.88 + 0.14 * Math.sin(now * 0.004));
    }

    alertSpheres.forEach((s, i) => {
      const p = Math.sin(now * 0.0038 + i * 1.4);
      s.scale.setScalar(0.8 + 0.55 * (p * 0.5 + 0.5));
      (s.material as THREE.MeshBasicMaterial).opacity = 0.45 + 0.38 * (p * 0.5 + 0.5);
    });
    amrs.forEach((a) => {
      a.t = (a.t + a.spd) % 1;
      a.mesh.position.lerpVectors(a.from, a.to, a.t);
      a.mesh.position.y = a.from.y;
      a.mesh.rotation.y = Math.atan2(a.to.x - a.from.x, a.to.z - a.from.z);
    });
    ohtVehicles.forEach((o) => {
      o.t = (o.t + o.spd) % 1;
      const pose = pointOnPolyline(o.path, o.t);
      o.mesh.position.copy(pose.position);
      o.mesh.position.y += 0.04 * Math.sin(now * 0.005 + o.t * 20);
      o.mesh.rotation.y = pose.heading;
    });
    renderer.render(scene, camera);
  }
  animate();
}

function raycast(e: MouseEvent): { mesh: THREE.Mesh; kind: 'tg' | 'asset' } | null {
  const el = containerRef.value!;
  const r = el.getBoundingClientRect();
  mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const assetHits = raycaster.intersectObjects([...assetHitMeshes.keys()]);
  if (assetHits.length) return { mesh: assetHits[0].object as THREE.Mesh, kind: 'asset' };
  const tgHits = raycaster.intersectObjects([...hitMeshes.keys()]);
  if (tgHits.length) return { mesh: tgHits[0].object as THREE.Mesh, kind: 'tg' };
  return null;
}
function onMouseMove(e: MouseEvent) {
  const hit = raycast(e);
  if (hit) {
    hoveredTg.value = hit.kind === 'tg' ? (hitMeshes.get(hit.mesh) ?? null) : null;
    hoveredAsset.value = hit.kind === 'asset' ? (assetHitMeshes.get(hit.mesh) ?? null) : null;
    const r = containerRef.value!.getBoundingClientRect();
    tipX.value = e.clientX - r.left + 14;
    tipY.value = e.clientY - r.top - 10;
    containerRef.value!.style.cursor = 'pointer';
  } else {
    hoveredTg.value = null;
    hoveredAsset.value = null;
    containerRef.value!.style.cursor = 'default';
  }
}
function onClick(e: MouseEvent) {
  const hit = raycast(e);
  if (!hit) return;
  if (hit.kind === 'asset') {
    const asset = assetHitMeshes.get(hit.mesh);
    if (!asset) return;
    emit('selectAsset', asset);
    selectAndHighlightAsset(hit.mesh);
    const worldPos = new THREE.Vector3();
    hit.mesh.getWorldPosition(worldPos);
    zoomToTool(worldPos);
    return;
  }
  const tg = hitMeshes.get(hit.mesh);
  if (!tg) return;
  emit('selectTg', tg);
  selectAndHighlight(tg, hit.mesh);
  zoomToTool(hit.mesh.position);
}
function onMouseLeave() {
  hoveredTg.value = null;
  hoveredAsset.value = null;
}
function handleResize() {
  const el = containerRef.value;
  if (!el || !camera || !renderer) return;
  const w = el.clientWidth || el.offsetWidth;
  const h = el.clientHeight || el.offsetHeight;
  if (!w || !h) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
function resetCamera() {
  clearSelection();
  zoomAnim = {
    fromPos: camera.position.clone(),
    fromTarget: controls.target.clone(),
    toPos: new THREE.Vector3(0, 52, 90),
    toTarget: new THREE.Vector3(0, 0, 0),
    t: 0,
  };
}

function updateSceneTheme() {
  if (!scene) return;
  const t = sceneTheme();
  (scene.background as THREE.Color).set(t.bg);
  (scene.fog as THREE.FogExp2).color.set(t.bg);
  if (_floor) (_floor.material as THREE.MeshLambertMaterial).color.set(t.floor);
  _zoneFloors.forEach(({ mesh, type }) => {
    (mesh.material as THREE.MeshLambertMaterial).color.set(zoneFloorColor(type));
  });
  _zoneDividers.forEach((line) => {
    (line.material as THREE.LineBasicMaterial).color.set(isDark.value ? 0x2a4070 : 0x6e796f);
  });
  _utilityChases.forEach((m) => {
    (m.material as THREE.MeshLambertMaterial).color.set(utilityChaseColor());
    (m.material as THREE.MeshLambertMaterial).opacity = isDark.value ? 0.72 : 0.82;
  });
  _floorServiceLanes.forEach((m) => {
    (m.material as THREE.MeshBasicMaterial).color.set(floorServiceLaneColor());
    (m.material as THREE.MeshBasicMaterial).opacity = isDark.value ? 0.62 : 0.55;
  });
  if (_border) (_border.material as THREE.LineBasicMaterial).color.set(t.border);
  _cornerLights.forEach((pl) => {
    pl.color.set(t.border);
    pl.intensity = t.borderGlow;
  });
  _amhsTracks.forEach((m) => {
    (m.material as THREE.MeshBasicMaterial).color.set(t.amhs);
  });
  const selHighlight = isDark.value ? 0x1a4488 : 0x7aa8d8;
  _bayFloors.forEach(({ mesh, areaCode }) => {
    (mesh.material as THREE.MeshLambertMaterial).color.set(
      _selectedBayMeshes.includes(mesh) ? selHighlight : bayColor(areaCode)
    );
  });
  const flowColor = isDark.value ? 0x00e5ff : 0xd08a00;
  const flowOpacity = isDark.value ? 0.88 : 0.84;
  _flowHighlights.forEach((mesh) => {
    const mat = mesh.material as THREE.MeshBasicMaterial;
    mat.color.set(flowColor);
    mat.opacity = flowOpacity;
  });
}

watch(isDark, updateSceneTheme);

/**
 * 실시간 상태 갱신 — 지오메트리/씬 재마운트 없이 신호탑 점등 + 알람 표시만 토글.
 * TG 개수가 바뀌면(토폴로지 변경) sceneKey가 달라져 컴포넌트가 재마운트되며 전체 리빌드된다.
 */
function applyStatus() {
  if (!scene) return;
  for (const area of props.areas) {
    for (const tg of area.toolGroups) {
      const segs = tgTower.get(tg.tgId);
      if (segs) {
        const sev = tg.risk === 'CRITICAL' ? 2 : tg.risk === 'WARNING' ? 1 : 0;
        setTowerSeverity(segs, sev);
      }
      const alert = tgAlert.get(tg.tgId);
      if (alert) alert.visible = tg.utilizationRate >= 0.9;
    }
  }
}
// props.areas가 새 스냅샷으로 바뀔 때마다(폴링) 상태만 갱신.
watch(() => props.areas, applyStatus);

defineExpose({
  resetCamera,
  clearSelection,
  zoomToArea,
  focusToolGroup,
  highlightNeighborTgs,
  updateHighlightToNextTg,
  frameProcessFlow,
});
</script>

<template>
  <div ref="containerRef" class="fab3d-scene">
    <div v-if="hoveredTg" class="fab3d-tooltip" :style="{ left: tipX + 'px', top: tipY + 'px' }">
      <strong class="fab3d-tooltip__name">{{ hoveredTg.tgName }}</strong>
      <div class="fab3d-tooltip__risk" :style="{ color: uHex(hoveredTg.utilizationRate) }">
        ● {{ uLabel(hoveredTg.utilizationRate) }}
      </div>
      <div class="fab3d-tooltip__row">가동률 {{ formatRatioPercent(hoveredTg.utilizationRate) }}</div>
      <div class="fab3d-tooltip__row">대기 Lot {{ hoveredTg.waitingLots }}개</div>
      <div class="fab3d-tooltip__row">병목 확률 {{ (hoveredTg.bottleneckProb * 100).toFixed(1) }}%</div>
    </div>
    <div v-else-if="hoveredAsset" class="fab3d-tooltip" :style="{ left: tipX + 'px', top: tipY + 'px' }">
      <strong class="fab3d-tooltip__name">{{ hoveredAsset.assetName }}</strong>
      <div class="fab3d-tooltip__risk">● {{ hoveredAsset.assetType }}</div>
      <div class="fab3d-tooltip__row">{{ hoveredAsset.status }}</div>
      <div class="fab3d-tooltip__row">{{ hoveredAsset.route }}</div>
      <div class="fab3d-tooltip__row">ETA {{ hoveredAsset.eta }}</div>
    </div>
  </div>
</template>

<style scoped>
.fab3d-scene {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 500px;
  overflow: hidden;
  background: #0e1a2e;
}
.fab3d-scene :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
.fab3d-tooltip {
  position: absolute;
  z-index: 20;
  pointer-events: none;
  padding: 8px 12px;
  background: rgba(4, 10, 24, 0.96);
  border: 1px solid rgba(0, 180, 255, 0.3);
  border-radius: 6px;
  color: #b8cce0;
  font-size: 11px;
  line-height: 1.7;
  max-width: 195px;
}
.fab3d-tooltip__name {
  display: block;
  color: #e6edf3;
  font-size: 12px;
  margin-bottom: 2px;
}
.fab3d-tooltip__risk {
  font-weight: 700;
  margin-bottom: 3px;
}
.fab3d-tooltip__row {
  color: #7a9ab8;
}
</style>
