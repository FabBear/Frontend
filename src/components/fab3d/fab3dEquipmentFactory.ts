import * as THREE from 'three';

// ── Materials — 병목 위험 등급(sev) 기준 ────────────────────────────────
// sev: 3=CRITICAL(빨강) 2=HIGH(주황) 1=MEDIUM(노랑) 0=LOW(정상 베이지)
function mBody(sev: number) {
  if (sev >= 3)
    return new THREE.MeshPhongMaterial({
      color: 0xc00000,
      specular: 0x880000,
      shininess: 95,
      emissive: new THREE.Color(0x3a0000),
    });
  if (sev >= 2)
    return new THREE.MeshPhongMaterial({
      color: 0xed7d31,
      specular: 0x994400,
      shininess: 90,
      emissive: new THREE.Color(0x220c00),
    });
  if (sev >= 1)
    return new THREE.MeshPhongMaterial({
      color: 0xc8a020,
      specular: 0x806800,
      shininess: 80,
      emissive: new THREE.Color(0x100c00),
    });
  // 정상: 실제 fab 장비의 따뜻한 off-white SEMI 패널 톤(매트하게)
  return new THREE.MeshPhongMaterial({
    color: 0xdedacd,
    specular: 0x8a8c86,
    shininess: 64,
    emissive: new THREE.Color(0x0a0a08),
  });
}
function mPanel(sev: number) {
  if (sev >= 3) return new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.95 });
  if (sev >= 2) return new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.92 });
  if (sev >= 1) return new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.92 });
  return new THREE.MeshBasicMaterial({ color: 0x8f8060, transparent: true, opacity: 0.92 });
}
const mDark = () => new THREE.MeshPhongMaterial({ color: 0x8f918b, specular: 0x7b7d78, shininess: 70 });
const mChamber = () => new THREE.MeshPhongMaterial({ color: 0xb3b2aa, specular: 0x8c8b84, shininess: 105 });
const mBlueGlass = () =>
  new THREE.MeshPhongMaterial({
    color: 0x7d827b,
    emissive: new THREE.Color(0x171712),
    specular: 0xc8c0a8,
    shininess: 150,
    transparent: true,
    opacity: 0.82,
  });

function cs(m: THREE.Mesh) {
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// ── Footprint (W×D) and height table ──────────────────────────────────
export const FP: Record<string, [number, number]> = {
  etch: [4.5, 4.5],
  litho: [4.2, 2.4],
  lithoTrack: [5.2, 2.0],
  furnace: [4.0, 1.8],
  epi: [3.8, 3.8],
  implant: [5.0, 1.8],
  cmp: [5.2, 2.2],
  cvd: [4.2, 4.2],
  pvd: [4.0, 4.0],
  wet: [5.0, 2.2],
  sem: [2.6, 1.8],
};
export const HT: Record<string, number> = {
  etch: 2.0,
  litho: 3.5,
  lithoTrack: 2.4,
  furnace: 4.2,
  epi: 4.6,
  implant: 2.8,
  cmp: 1.6,
  cvd: 1.8,
  pvd: 1.8,
  wet: 1.6,
  sem: 3.2,
};

// ── Equipment type from TG name prefix ────────────────────────────────
export function equipType(tgName: string): string {
  if (tgName.startsWith('LithoTrack_')) return 'lithoTrack';
  if (tgName.startsWith('Litho_REG_') || tgName.startsWith('LithoMet_') || tgName.startsWith('TF_Met')) return 'sem';
  if (tgName.startsWith('Litho_')) return 'litho';
  if (tgName.startsWith('EPI_')) return 'epi';
  if (tgName.startsWith('Diffusion_')) return 'furnace';
  if (tgName.startsWith('Implant_')) return 'implant';
  if (tgName.startsWith('DE_')) return 'etch';
  if (tgName.startsWith('Planar_')) return 'cmp';
  if (tgName.startsWith('Dielectric_') || tgName.startsWith('TF_')) return 'cvd';
  if (tgName.startsWith('DefMet_') || tgName.startsWith('DefMEt_')) return 'pvd';
  if (tgName.startsWith('WE_')) return 'wet';
  return 'cvd';
}

// ── Additional detail helpers ──────────────────────────────────────────
const mGlass = () =>
  new THREE.MeshPhongMaterial({
    color: 0x0a1824,
    emissive: new THREE.Color(0x000c18),
    specular: 0x88ccff,
    shininess: 220,
    transparent: true,
    opacity: 0.78,
  });
const mFoot = () => new THREE.MeshPhongMaterial({ color: 0x888888, specular: 0xd0d0d0, shininess: 120 });
const mVent = () => new THREE.MeshPhongMaterial({ color: 0x0e0e0e, shininess: 20 });
const mLed = (c: number) => new THREE.MeshBasicMaterial({ color: c });
const mSeam = () => new THREE.MeshPhongMaterial({ color: 0x050810 });

function ledColor(sev: number): number {
  return sev >= 3 ? 0xff1100 : sev >= 2 ? 0xff8800 : sev >= 1 ? 0xffd700 : 0xd8b46a;
}

function addFeet(g: THREE.Group, xs: number[], zs: number[]) {
  const mat = mFoot();
  for (const x of xs)
    for (const z of zs) {
      const f = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.2, 8), mat);
      f.position.set(x, 0.1, z);
      g.add(f);
    }
}

function addVents(g: THREE.Group, xC: number, topY: number, zC: number, w: number, d = 0.5, n = 8) {
  const mat = mVent();
  const step = w / n;
  for (let i = 0; i < n; i++) {
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, d), mat);
    v.position.set(xC - w / 2 + (i + 0.5) * step, topY + 0.05, zC);
    g.add(v);
  }
}

function addLEDs(g: THREE.Group, x0: number, y: number, z: number, n: number, sp: number, sev: number) {
  const c = ledColor(sev);
  for (let i = 0; i < n; i++) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), mLed(c));
    l.position.set(x0 + i * sp, y, z);
    g.add(l);
  }
}


/**
 * 신호탑(andon stack light) — 실제 모든 fab 장비 상단의 상징적 3색 타워.
 * 빨강(상)·노랑(중)·초록(하). 현재 상태 세그먼트만 점등(나머지는 흐리게).
 * sev: 0=정상(초록) 1=경고(노랑) 2=위험(빨강) — tg.risk 기반.
 * ⚠ PointLight를 쓰지 않는다(장비 수만큼 광원이 생겨 프레임 급락). 자체발광 재질로 표현.
 */
// 4색: idx0=red(CRITICAL) 1=orange(HIGH) 2=yellow(MEDIUM) 3=green(LOW)
const TOWER_SEG_COLORS = [0xff2a1a, 0xff7700, 0xffd700, 0x22dd55];

/** sev(0=LOW/1=MEDIUM/2=HIGH/3=CRITICAL)에 따라 신호탑 점등 세그먼트 토글. */
export function setTowerSeverity(segs: THREE.Mesh[], sev: number) {
  const active = sev >= 3 ? 0 : sev === 2 ? 1 : sev === 1 ? 2 : 3;
  segs.forEach((s, idx) => {
    (s.material as THREE.MeshBasicMaterial).opacity = idx === active ? 1 : 0.14;
  });
}

function addSignalTower(g: THREE.Group, x: number, y: number, z: number, sev: number) {
  const SEG_H = 0.2;
  const N = TOWER_SEG_COLORS.length; // 4
  const poleH = 0.5 + N * SEG_H;

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.07, poleH, 8),
    new THREE.MeshPhongMaterial({ color: 0x2a3440, shininess: 60 })
  );
  pole.position.set(x, y + poleH / 2, z);
  g.add(pole);

  const baseY = y + 0.5;
  // 4색 세그먼트 (idx0=red 최상단). 점등은 불투명도로만 토글.
  const segs: THREE.Mesh[] = [];
  TOWER_SEG_COLORS.forEach((color, idx) => {
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.155, 0.155, SEG_H, 16),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.14 })
    );
    seg.position.set(x, baseY + SEG_H / 2 + (N - 1 - idx) * SEG_H, z);
    g.add(seg);
    segs.push(seg);
  });
  setTowerSeverity(segs, sev);
  g.userData.towerSegs = segs;

  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.155, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshPhongMaterial({ color: 0x1a2430, shininess: 70 })
  );
  cap.position.set(x, baseY + N * SEG_H + 0.06, z);
  g.add(cap);
}

/**
 * EFEM FOUP 로드포트 — 도크 + FOUP 포드 + 표시등 2개(상태/통신).
 * facing: 포드가 바라보는 방향(-z 앞면이 기본). 기존 ad-hoc foup를 대체해 외형을 통일.
 */
function addFoupPort(g: THREE.Group, x: number, z: number, sev: number, facing: -1 | 1 = -1) {
  // 도크 플레이트
  const dock = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.12, 0.44),
    new THREE.MeshPhongMaterial({ color: 0x2a3440, shininess: 70 })
  );
  dock.position.set(x, 0.9, z);
  g.add(dock);
  // FOUP 포드 (반투명 베이지)
  const foup = cs(
    new THREE.Mesh(
      new THREE.BoxGeometry(0.76, 0.6, 0.64),
      new THREE.MeshPhongMaterial({
        color: 0xf0e6b8,
        specular: 0x9a8a55,
        shininess: 60,
        transparent: true,
        opacity: 0.9,
      })
    )
  );
  foup.position.set(x, 1.28, z);
  g.add(foup);
  // 상단 핸들(ridged)
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.1, 0.3),
    new THREE.MeshPhongMaterial({ color: 0xd8ca90, shininess: 40 })
  );
  handle.position.set(x, 1.62, z);
  g.add(handle);
  // 도어(전면 글래스)
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.42, 0.05), mGlass());
  door.position.set(x, 1.24, z + facing * 0.33);
  g.add(door);
  // 표시등 2개 (상태등=가동률색, 통신등=청색)
  const statusC = sev >= 3 ? 0xff2a1a : sev >= 2 ? 0xffb020 : 0x22dd55;
  [statusC, 0x00aaff].forEach((c, i) => {
    const ind = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.03, 8), mLed(c));
    ind.rotation.x = Math.PI / 2;
    ind.position.set(x - 0.1 + i * 0.2, 1.66, z + facing * 0.32);
    g.add(ind);
  });
}

// ── Equipment factory functions ────────────────────────────────────────

/** Dry Etch — 4-chamber cluster tool with transfer module */
function mkEtch(sev: number): THREE.Group {
  const g = new THREE.Group();

  // Transfer module (octagonal handler)
  const handler = cs(new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 0.72, 8), mDark()));
  handler.position.y = 0.36;
  g.add(handler);
  const lid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 0.06, 8),
    new THREE.MeshPhongMaterial({ color: 0x3a4858, shininess: 100 })
  );
  lid.position.y = 0.75;
  g.add(lid);

  // 4 process chambers
  const cPos = [
    [-1.1, -1.1],
    [1.1, -1.1],
    [1.1, 1.1],
    [-1.1, 1.1],
  ] as const;
  cPos.forEach(([px, pz], i) => {
    const ch = cs(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 1.38, 14), mChamber()));
    ch.position.set(px, 0.69, pz);
    g.add(ch);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshPhongMaterial({ color: 0x608098, shininess: 170, transparent: true, opacity: 0.88 })
    );
    dome.position.set(px, 1.38, pz);
    g.add(dome);
    // Viewport observation ring on dome
    const vring = new THREE.Mesh(
      new THREE.TorusGeometry(0.13, 0.022, 6, 12),
      new THREE.MeshPhongMaterial({ color: 0x2a3848, shininess: 80 })
    );
    vring.rotation.x = Math.PI / 2;
    vring.position.set(px, 1.72, pz);
    g.add(vring);
    // Gate valve stub (facing transfer module center)
    const ang = Math.atan2(pz, px);
    const gv = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.28, 8),
      new THREE.MeshPhongMaterial({ color: 0x2a3848 })
    );
    gv.rotation.z = Math.PI / 2;
    gv.rotation.y = ang;
    gv.position.set(px - Math.cos(ang) * 0.6, 0.46, pz - Math.sin(ang) * 0.6);
    g.add(gv);
    // Per-chamber status LED
    const lc = sev >= 3 ? 0xff1100 : sev >= 2 ? 0xff8800 : i % 2 === 0 ? 0x00ee44 : 0x00aaff;
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), mLed(lc));
    led.position.set(px * 1.14, 1.65, pz * 1.14);
    g.add(led);
  });

  // Front FOUP load port
  const lp = cs(new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.1, 0.38), mBody(sev)));
  lp.position.set(0, 0.55, -2.1);
  g.add(lp);
  const foupGlass = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.78, 0.06), mGlass());
  foupGlass.position.set(0, 0.55, -2.28);
  g.add(foupGlass);
  for (const [sx, sy] of [
    [-0.29, -0.26],
    [-0.29, 0.26],
    [0.29, -0.26],
    [0.29, 0.26],
  ] as const) {
    const sc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.027, 0.027, 0.05, 6),
      new THREE.MeshPhongMaterial({ color: 0x4a5a6a })
    );
    sc.rotation.x = Math.PI / 2;
    sc.position.set(sx, 0.55 + sy, -2.31);
    g.add(sc);
  }
  const sp = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.28, 0.05), mPanel(sev));
  sp.position.set(0, 1.47, -2.12);
  g.add(sp);
  addLEDs(g, -0.24, 1.39, -2.13, 5, 0.12, sev);

  // Side electronics cabinet
  const cab = cs(new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.78, 1.3), mBody(sev)));
  cab.position.set(2.08, 0.89, 0);
  g.add(cab);
  const cabSeam = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.8, 0.04), mSeam());
  cabSeam.position.set(2.08, 0.89, 0.3);
  g.add(cabSeam);
  addVents(g, 2.08, 1.79, 0, 0.56, 0.8, 6);
  const exh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.36, 8),
    new THREE.MeshPhongMaterial({ color: 0x1e2c3a })
  );
  exh.rotation.z = Math.PI / 2;
  exh.position.set(2.5, 1.5, 0);
  g.add(exh);

  addFeet(g, [-1.85, 2.08], [-1.85, 1.55]);
  return g;
}

/** Lithography — ASML-style scanner */
function mkLitho(sev: number): THREE.Group {
  const g = new THREE.Group();
  const bodyCol = sev >= 3 ? 0xc00000 : 0x2a3848;

  // Main scanner body
  const body = cs(
    new THREE.Mesh(
      new THREE.BoxGeometry(2.7, 2.6, 2.1),
      new THREE.MeshPhongMaterial({ color: bodyCol, specular: 0x334455, shininess: 70 })
    )
  );
  body.position.y = 1.3;
  g.add(body);
  // Vertical panel seams
  for (const sx of [-0.68, 0.68]) {
    const sv = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.62, 0.04), mSeam());
    sv.position.set(sx, 1.3, -1.07);
    g.add(sv);
  }
  // Horizontal seam at mid-height
  const sh = new THREE.Mesh(new THREE.BoxGeometry(2.72, 0.04, 0.04), mSeam());
  sh.position.set(0, 1.48, -1.07);
  g.add(sh);
  // Front process viewports (2 cols × 3 rows)
  for (const [vx, vy] of [
    [-0.28, 0.78],
    [-0.28, 1.48],
    [-0.28, 2.08],
    [0.28, 0.78],
    [0.28, 1.48],
    [0.28, 2.08],
  ] as const) {
    const vp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.05), mGlass());
    vp.position.set(vx, vy, -1.08);
    g.add(vp);
  }

  // Lens column assembly
  const col = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.85, 0.7), mBlueGlass());
  col.position.set(0, 3.05, 0);
  g.add(col);
  const colStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.3, 0.6, 10),
    new THREE.MeshPhongMaterial({ color: 0x1a2838, shininess: 80 })
  );
  colStem.position.set(0, 2.9, 0);
  g.add(colStem);
  // Column section rings
  for (const y of [2.65, 2.9, 3.15]) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.02, 6, 16),
      new THREE.MeshPhongMaterial({ color: 0x0a1218 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, y, 0);
    g.add(ring);
  }

  // Laser source module
  const laser = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.38, 0.6),
    new THREE.MeshPhongMaterial({ color: 0x1c2c3a, shininess: 60 })
  );
  laser.position.set(0, 3.45, -0.7);
  g.add(laser);
  addVents(g, 0, 3.64, -0.7, 1.2, 0.35, 7);

  // Electronics cabinet
  const cab = cs(new THREE.Mesh(new THREE.BoxGeometry(0.85, 2.6, 2.1), mBody(sev)));
  cab.position.set(1.78, 1.3, 0);
  g.add(cab);
  for (const y of [0.88, 1.76]) {
    const sH = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 2.12), mSeam());
    sH.position.set(1.78, y, 0);
    g.add(sH);
  }
  const sc = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.36, 0.06), mPanel(sev));
  sc.position.set(1.78, 2.25, -0.65);
  sc.rotation.y = Math.PI / 2;
  g.add(sc);
  addLEDs(g, 1.765, 1.6, -0.58, 4, 0.1, sev);

  // Wafer stage (vibration isolated)
  const stage = cs(
    new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.38, 0.9),
      new THREE.MeshPhongMaterial({ color: 0x384858, shininess: 65 })
    )
  );
  stage.position.set(-0.1, 0.19, -1.5);
  g.add(stage);
  // Stage fiducial target
  const tgt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.06, 16),
    new THREE.MeshPhongMaterial({ color: 0x2a3858, shininess: 130 })
  );
  tgt.position.set(-0.1, 0.38, -1.5);
  g.add(tgt);

  // Cable management channel at base rear
  const cable = new THREE.Mesh(
    new THREE.BoxGeometry(2.7, 0.12, 0.16),
    new THREE.MeshPhongMaterial({ color: 0x1a2030 })
  );
  cable.position.set(0, 0.06, 0.95);
  g.add(cable);

  addFeet(g, [-1.1, 1.2], [-0.9, 0.9]);
  return g;
}

/** LithoTrack — TEL ACT coater/developer track */
function mkLithoTrack(sev: number): THREE.Group {
  const g = new THREE.Group();
  const col = sev >= 3 ? 0xc00000 : 0x1a2838;

  // Main body — 4 modules in-line
  const body = cs(
    new THREE.Mesh(
      new THREE.BoxGeometry(5.0, 2.1, 1.7),
      new THREE.MeshPhongMaterial({ color: col, specular: 0x334455, shininess: 70 })
    )
  );
  body.position.y = 1.05;
  g.add(body);
  // Vertical module seams
  for (const sx of [-1.5, -0.25, 1.0]) {
    const sv = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.12, 1.72), mSeam());
    sv.position.set(sx, 1.05, 0);
    g.add(sv);
  }
  // Horizontal seam
  const sh = new THREE.Mesh(new THREE.BoxGeometry(5.02, 0.04, 0.04), mSeam());
  sh.position.set(0, 1.3, -0.87);
  g.add(sh);

  // Front windows — one per module section
  for (const vx of [-1.88, -0.63, 0.62, 1.87]) {
    const vp = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.05), mGlass());
    vp.position.set(vx, 1.1, -0.87);
    g.add(vp);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.59, 0.04), mSeam());
    fr.position.set(vx, 1.1, -0.86);
    g.add(fr);
  }

  // Spin cup modules on top
  for (const sx of [-1.875, -0.625, 0.625, 1.875]) {
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.16, 14),
      new THREE.MeshPhongMaterial({ color: 0x3a5570, shininess: 90 })
    );
    cup.position.set(sx, 2.23, 0.1);
    g.add(cup);
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.3, 0.025, 6, 14),
      new THREE.MeshPhongMaterial({ color: 0x2a3848 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.set(sx, 2.32, 0.1);
    g.add(rim);
    // Status LED per cup
    const lc = sev >= 3 ? 0xff1100 : sev >= 2 ? 0xff8800 : 0x00ee44;
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), mLed(lc));
    led.position.set(sx + 0.22, 2.1, -0.6);
    g.add(led);
  }

  // Exhaust duct (top rear)
  const duct = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.2, 0.42), new THREE.MeshPhongMaterial({ color: 0x2a3848 }));
  duct.position.set(0, 2.3, 0.7);
  g.add(duct);
  addVents(g, 0, 2.3, 0.7, 3.8, 0.25, 12);

  // EFEM FOUP 로드포트 (front left, 표준화)
  addFoupPort(g, -1.8, -1.02, sev, -1);

  // Status panel
  const sp = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.28, 0.05), mPanel(sev));
  sp.position.set(0, 1.8, -0.88);
  g.add(sp);
  addLEDs(g, -0.3, 1.72, -0.89, 6, 0.12, sev);

  addFeet(g, [-2.3, 2.3], [-0.75, 0.75]);
  return g;
}

/** Diffusion Furnace — vertical tube furnace 3-tube stack */
function mkFurnace(sev: number): THREE.Group {
  const g = new THREE.Group();
  const tubeCol = sev >= 3 ? 0xc00000 : 0x607888;

  for (let i = -1; i <= 1; i++) {
    const tube = cs(
      new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.48, 4.0, 14),
        new THREE.MeshPhongMaterial({ color: tubeCol, specular: 0x446688, shininess: 90 })
      )
    );
    tube.position.set(i * 1.05, 2.0, 0);
    g.add(tube);
    // Tube section rings
    for (const y of [0.5, 1.5, 2.5, 3.5]) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.44, 0.025, 6, 14),
        new THREE.MeshPhongMaterial({ color: 0x2a3848 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(i * 1.05, y, 0);
      g.add(ring);
    }
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.44, 0.2, 14),
      new THREE.MeshPhongMaterial({ color: 0x384858, shininess: 70 })
    );
    cap.position.set(i * 1.05, 4.1, 0);
    g.add(cap);
    // Gas inlet stub at top
    const inlet = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8),
      new THREE.MeshPhongMaterial({ color: 0x2a3848 })
    );
    inlet.position.set(i * 1.05 + 0.28, 4.25, 0);
    g.add(inlet);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.5, 0.1), new THREE.MeshPhongMaterial({ color: 0x2a3848 }));
    rail.position.set(i * 1.05 + 0.5, 1.75, 0.48);
    g.add(rail);
    // Per-tube status LED
    const lc = sev >= 3 ? 0xff1100 : sev >= 2 ? 0xff8800 : 0x00ee44;
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), mLed(lc));
    led.position.set(i * 1.05, 4.45, 0);
    g.add(led);
  }

  const base = cs(new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.38, 1.7), mBody(sev)));
  base.position.set(0, 0.19, 0);
  g.add(base);
  const bSeam = new THREE.Mesh(new THREE.BoxGeometry(3.72, 0.04, 0.04), mSeam());
  bSeam.position.set(0, 0.38, -0.8);
  g.add(bSeam);

  // Gas / control cabinet (rear)
  const cab = cs(new THREE.Mesh(new THREE.BoxGeometry(3.7, 2.8, 0.6), mBody(sev)));
  cab.position.set(0, 1.4, 0.9);
  g.add(cab);
  for (const cx of [-0.95, 0.95]) {
    const sv = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.82, 0.04), mSeam());
    sv.position.set(cx, 1.4, 0.92);
    g.add(sv);
  }
  addVents(g, 0, 2.8, 0.9, 3.2, 0.4, 10);

  const sc = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.34, 0.06), mPanel(sev));
  sc.position.set(-1.2, 2.5, 1.22);
  g.add(sc);
  addLEDs(g, -1.42, 2.22, 1.24, 3, 0.14, sev);

  // E-stop button
  const estop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 0.06, 10),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
  );
  estop.rotation.x = Math.PI / 2;
  estop.position.set(-1.55, 1.45, -0.85);
  g.add(estop);

  addFeet(g, [-1.7, 1.7], [-0.75, 0.75]);
  return g;
}

/** EPI epitaxial reactor — barrel dome chamber */
function mkEpi(sev: number): THREE.Group {
  const g = new THREE.Group();
  const col = sev >= 3 ? 0xc00000 : 0x3a5060;

  // Reactor barrel
  const barrel = cs(
    new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.2, 3.0, 16),
      new THREE.MeshPhongMaterial({ color: col, specular: 0x446688, shininess: 90 })
    )
  );
  barrel.position.y = 1.5;
  g.add(barrel);
  // Barrel section rings
  for (const y of [0.8, 1.5, 2.2, 3.0]) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.12, 0.03, 6, 16),
      new THREE.MeshPhongMaterial({ color: 0x1e2c3a })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    g.add(ring);
  }

  // Quartz dome (reactor top)
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshPhongMaterial({ color: 0x5a8090, shininess: 150, transparent: true, opacity: 0.88 })
  );
  dome.position.y = 3.0;
  g.add(dome);
  // Dome observation port
  const domeRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.2, 0.035, 6, 12),
    new THREE.MeshPhongMaterial({ color: 0x2a3848, shininess: 100 })
  );
  domeRing.position.set(0.5, 3.55, 0);
  g.add(domeRing);
  const dvp = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 12), mGlass());
  dvp.position.set(0.5, 3.55, 0);
  g.add(dvp);

  // Gas manifold (right side)
  const manifold = cs(new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.3, 0.5), mBody(sev)));
  manifold.position.set(1.45, 1.4, 0);
  g.add(manifold);
  const mSeamM = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.32, 0.04), mSeam());
  mSeamM.position.set(1.45, 1.4, 0.15);
  g.add(mSeamM);
  // Gas lines with valve knobs
  for (const y of [0.7, 1.3, 1.9]) {
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.55, 8),
      new THREE.MeshPhongMaterial({ color: 0x8899aa })
    );
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(1.05, y, 0);
    g.add(pipe);
    const valve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.1, 8),
      new THREE.MeshPhongMaterial({ color: 0x4a6070 })
    );
    valve.rotation.z = Math.PI / 2;
    valve.position.set(1.32, y, 0.12);
    g.add(valve);
  }
  addLEDs(g, 1.42, 2.08, 0.27, 2, 0.14, sev);

  // Control cabinet (left)
  const cab = cs(new THREE.Mesh(new THREE.BoxGeometry(0.78, 2.8, 1.6), mBody(sev)));
  cab.position.set(-1.7, 1.4, 0);
  g.add(cab);
  for (const y of [0.95, 1.9]) {
    const sH = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 1.62), mSeam());
    sH.position.set(-1.7, y, 0);
    g.add(sH);
  }
  const sc = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.34, 0.06), mPanel(sev));
  sc.position.set(-1.7, 2.48, -0.62);
  sc.rotation.y = Math.PI / 2;
  g.add(sc);
  addVents(g, -1.7, 2.8, 0, 0.58, 1.0, 6);
  addLEDs(g, -1.72, 1.88, -0.58, 3, 0.12, sev);

  addFeet(g, [-1.7, 1.7], [-1.65, 1.65]);
  return g;
}

/** Implant — L-shaped beamline ion implanter */
function mkImplant(sev: number): THREE.Group {
  const g = new THREE.Group();

  // Ion source terminal (large box)
  const terminal = cs(
    new THREE.Mesh(
      new THREE.BoxGeometry(1.85, 2.9, 1.6),
      new THREE.MeshPhongMaterial({ color: sev >= 3 ? 0xc00000 : 0x28384a, specular: 0x223344, shininess: 75 })
    )
  );
  terminal.position.set(-1.8, 1.45, 0);
  g.add(terminal);
  // Terminal panel seams
  for (const y of [0.88, 1.76]) {
    const sH = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1.62), mSeam());
    sH.position.set(-1.8, y, 0);
    g.add(sH);
  }
  // Terminal front viewport
  const tvp = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.42, 0.06), mGlass());
  tvp.position.set(-1.8, 2.12, -0.82);
  g.add(tvp);
  const svRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.028, 6, 12),
    new THREE.MeshPhongMaterial({ color: 0x2a3848 })
  );
  svRing.position.set(-1.8, 2.12, -0.6);
  g.add(svRing);
  addVents(g, -1.8, 2.9, 0, 1.5, 0.8, 7);

  // Beam tube (horizontal)
  const beam = cs(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 3.6, 10),
      new THREE.MeshPhongMaterial({ color: 0x4a6070, shininess: 80 })
    )
  );
  beam.rotation.z = Math.PI / 2;
  beam.position.set(0.5, 1.85, 0);
  g.add(beam);
  // Beam tube flanges
  for (const bx of [-0.7, 0.5, 1.7]) {
    const flange = new THREE.Mesh(
      new THREE.TorusGeometry(0.26, 0.03, 6, 10),
      new THREE.MeshPhongMaterial({ color: 0x2a3848 })
    );
    flange.rotation.y = Math.PI / 2;
    flange.position.set(bx, 1.85, 0);
    g.add(flange);
  }

  // Magnet analyzer
  const magnet = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.9, 0.9),
    new THREE.MeshPhongMaterial({ color: 0x1c2c3a, shininess: 55 })
  );
  magnet.position.set(0.3, 1.85, 0);
  g.add(magnet);

  // Process end-station
  const end = cs(new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.1, 1.6), mBody(sev)));
  end.position.set(1.85, 1.05, 0);
  g.add(end);
  // End-station viewport
  const evp = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.38, 0.06), mGlass());
  evp.position.set(1.85, 1.58, -0.82);
  g.add(evp);
  const cup = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 0.6, 10),
    new THREE.MeshPhongMaterial({ color: 0x223344, shininess: 100 })
  );
  cup.position.set(1.85, 2.45, 0);
  g.add(cup);

  const sc = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.34, 0.06), mPanel(sev));
  sc.position.set(-1.8, 2.65, -0.82);
  g.add(sc);
  addLEDs(g, -1.88, 2.42, -0.82, 3, 0.12, sev);

  // E-stop button
  const estop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 0.06, 10),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
  );
  estop.rotation.x = Math.PI / 2;
  estop.position.set(-1.45, 1.28, -0.82);
  g.add(estop);

  addFeet(g, [-2.55, 2.55], [-0.72, 0.72]);
  return g;
}

/** CMP Polisher — wide body with 3 platens */
function mkCMP(sev: number): THREE.Group {
  const g = new THREE.Group();

  // Main polisher body
  const body = cs(
    new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 1.25, 2.1),
      new THREE.MeshPhongMaterial({ color: sev >= 3 ? 0xc00000 : 0x3a5060, shininess: 70 })
    )
  );
  body.position.set(0, 0.63, 0);
  g.add(body);
  for (const bx of [-1.32, 0, 1.32]) {
    const sv = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.27, 0.04), mSeam());
    sv.position.set(bx, 0.63, -1.07);
    g.add(sv);
  }

  // 3 polishing platens
  for (let i = -1; i <= 1; i++) {
    const platen = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.62, 0.14, 24),
      new THREE.MeshPhongMaterial({ color: 0x2a4055, specular: 0x3366aa, shininess: 140 })
    );
    platen.position.set(i * 1.42, 1.32, 0.2);
    g.add(platen);
    // Retaining ring
    const pring = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.03, 6, 24),
      new THREE.MeshPhongMaterial({ color: 0x1a2c3a })
    );
    pring.rotation.x = Math.PI / 2;
    pring.position.set(i * 1.42, 1.4, 0.2);
    g.add(pring);
    // Slurry dispense arm + nozzle
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.1, 0.85),
      new THREE.MeshPhongMaterial({ color: 0x1e2c3a })
    );
    arm.position.set(i * 1.42 + 0.42, 1.44, 0.08);
    g.add(arm);
    const noz = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.1, 6),
      new THREE.MeshPhongMaterial({ color: 0x607080 })
    );
    noz.position.set(i * 1.42 + 0.42, 1.44, 0.08 - 0.38);
    g.add(noz);
    // Platen LED
    const plc = sev >= 3 ? 0xff1100 : sev >= 2 ? 0xff8800 : 0x00ee44;
    const pled = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), mLed(plc));
    pled.position.set(i * 1.42, 1.5, -0.5);
    g.add(pled);
  }

  // Carousel (wafer transfer robot)
  const carousel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.38, 0.22, 12),
    new THREE.MeshPhongMaterial({ color: 0x2a4055, shininess: 100 })
  );
  carousel.position.set(0, 1.47, 0.2);
  g.add(carousel);

  // FOUP load port + cabinet
  const cab = cs(new THREE.Mesh(new THREE.BoxGeometry(0.72, 2.4, 2.1), mBody(sev)));
  cab.position.set(2.55, 1.2, 0);
  g.add(cab);
  const foupGlass = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 1.0), mGlass());
  foupGlass.position.set(2.59, 0.9, 0);
  g.add(foupGlass);
  addVents(g, 2.55, 2.4, 0, 0.52, 1.0, 5);

  const sc = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.34, 0.06), mPanel(sev));
  sc.position.set(2.55, 2.2, -0.72);
  sc.rotation.y = Math.PI / 2;
  g.add(sc);
  addLEDs(g, 2.56, 1.92, -0.6, 4, 0.1, sev);

  // Drain base panel
  const drain = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.28, 1.6), new THREE.MeshPhongMaterial({ color: 0x2a3848 }));
  drain.position.set(0, 0.14, 0);
  g.add(drain);

  addFeet(g, [-2.0, 2.0], [-0.9, 0.9]);
  return g;
}

/** CVD/ALD cluster — octagonal handler + 4 process modules */
function mkCVD(sev: number): THREE.Group {
  const g = new THREE.Group();

  // Central handler (octagonal)
  const handler = cs(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.95, 0.82, 8),
      new THREE.MeshPhongMaterial({ color: sev >= 3 ? 0xc00000 : 0x4a6070, shininess: 80 })
    )
  );
  handler.position.y = 0.41;
  g.add(handler);
  const hlid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.97, 0.97, 0.06, 8),
    new THREE.MeshPhongMaterial({ color: 0x3a4858, shininess: 110 })
  );
  hlid.position.y = 0.85;
  g.add(hlid);

  // 4 process modules at 45° angles
  [Math.PI / 4, (Math.PI * 3) / 4, (Math.PI * 5) / 4, (Math.PI * 7) / 4].forEach((a, i) => {
    const mod = cs(new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.3, 0.88), mBody(sev)));
    mod.position.set(Math.cos(a) * 1.65, 0.65, Math.sin(a) * 1.65);
    mod.rotation.y = -a;
    g.add(mod);
    // Module viewport
    const vp = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.3, 0.06), mGlass());
    vp.position.set(Math.cos(a) * 2.12, 0.88, Math.sin(a) * 2.12);
    vp.rotation.y = -a;
    g.add(vp);
    // Module status panel
    const sc = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.05), mPanel(sev));
    sc.position.set(Math.cos(a) * 2.14, 1.22, Math.sin(a) * 2.14);
    sc.rotation.y = -a;
    g.add(sc);
    // Gate valve stub
    const gv = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.28, 8),
      new THREE.MeshPhongMaterial({ color: 0x2a3848 })
    );
    gv.rotation.z = Math.PI / 2;
    gv.rotation.y = a;
    gv.position.set(Math.cos(a) * 1.12, 0.36, Math.sin(a) * 1.12);
    g.add(gv);
    // LED per module
    const lc = sev >= 3 ? 0xff1100 : sev >= 2 ? 0xff8800 : i % 2 === 0 ? 0x00ee44 : 0x00aaff;
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), mLed(lc));
    led.position.set(Math.cos(a) * 2.18, 1.38, Math.sin(a) * 2.18);
    g.add(led);
  });

  // EFEM FOUP 로드포트 (front, 표준화)
  addFoupPort(g, 0, -2.1, sev, -1);

  // Gas supply cabinet (rear)
  const gasCab = cs(new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.8, 0.7), mBody(sev)));
  gasCab.position.set(0, 0.9, 2.2);
  g.add(gasCab);
  addVents(g, 0, 1.8, 2.2, 0.45, 0.5, 5);

  addFeet(g, [-1.8, 1.8], [-1.8, 1.8]);
  return g;
}

/** PVD Endura — octagonal handler + 4 cylindrical chambers */
function mkPVD(sev: number): THREE.Group {
  const g = new THREE.Group();

  // Handler (octagonal)
  const handler = cs(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.88, 0.88, 0.88, 8),
      new THREE.MeshPhongMaterial({ color: sev >= 3 ? 0xc00000 : 0x3a5060, shininess: 80 })
    )
  );
  handler.position.y = 0.44;
  g.add(handler);

  // 4 PVD process chambers
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const ch = cs(new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 1.32, 12), mChamber()));
    ch.position.set(Math.cos(a) * 1.5, 0.66, Math.sin(a) * 1.5);
    g.add(ch);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.48, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshPhongMaterial({ color: 0x4a6880, shininess: 130 })
    );
    dome.position.set(Math.cos(a) * 1.5, 1.32, Math.sin(a) * 1.5);
    g.add(dome);
    // Target power supply connector
    const pwr = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.2, 0.18),
      new THREE.MeshPhongMaterial({ color: 0x1e2c3a })
    );
    pwr.position.set(Math.cos(a) * 1.9, 1.1, Math.sin(a) * 1.9);
    g.add(pwr);
    // Chamber status LED
    const lc = sev >= 3 ? 0xff1100 : sev >= 2 ? 0xff8800 : 0x00ee44;
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), mLed(lc));
    led.position.set(Math.cos(a) * 2.02, 1.42, Math.sin(a) * 2.02);
    g.add(led);
  }

  // Electronics cabinet (left)
  const cab = cs(new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.0, 1.8), mBody(sev)));
  cab.position.set(-2.05, 1.0, 0);
  g.add(cab);
  for (const y of [0.7, 1.4]) {
    const sH = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 1.82), mSeam());
    sH.position.set(-2.05, y, 0);
    g.add(sH);
  }
  addVents(g, -2.05, 2.0, 0, 0.5, 1.2, 6);
  const sc = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.32, 0.06), mPanel(sev));
  sc.position.set(-2.05, 1.88, -0.68);
  sc.rotation.y = Math.PI / 2;
  g.add(sc);
  addLEDs(g, -2.06, 1.6, -0.55, 3, 0.11, sev);

  // Gas panel (right)
  const gasPnl = cs(new THREE.Mesh(new THREE.BoxGeometry(0.52, 1.4, 1.0), mBody(sev)));
  gasPnl.position.set(2.05, 0.7, 0);
  g.add(gasPnl);
  for (const [gy, gz] of [
    [0.4, -0.3],
    [0.4, 0.3],
    [0.9, -0.3],
    [0.9, 0.3],
  ] as const) {
    const fit = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.12, 6),
      new THREE.MeshPhongMaterial({ color: 0x607080 })
    );
    fit.rotation.z = Math.PI / 2;
    fit.position.set(2.35, gy, gz);
    g.add(fit);
  }

  addFeet(g, [-1.8, 1.8], [-1.6, 1.6]);
  return g;
}

/** Wet Bench — batch wet station */
function mkWet(sev: number): THREE.Group {
  const g = new THREE.Group();

  // Main bench body
  const body = cs(
    new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 1.42, 2.0),
      new THREE.MeshPhongMaterial({ color: sev >= 3 ? 0xc00000 : 0x3a5060, shininess: 75 })
    )
  );
  body.position.set(0, 0.71, 0);
  g.add(body);
  for (const bx of [-1.2, 0, 1.2]) {
    const sv = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.44, 0.04), mSeam());
    sv.position.set(bx, 0.71, -1.02);
    g.add(sv);
  }

  // Tank dividers and front viewports
  for (let i = -2; i <= 2; i++) {
    const div = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.92, 1.88),
      new THREE.MeshPhongMaterial({ color: 0x1e2c3a, shininess: 50 })
    );
    div.position.set(i * 0.78, 0.96, 0);
    g.add(div);
    // Tank viewport window
    const tvp = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.55, 0.05), mGlass());
    tvp.position.set(i * 0.78, 0.68, -1.03);
    g.add(tvp);
    // Tank status LED
    const lc = sev >= 3 ? 0xff1100 : sev >= 2 ? 0xff8800 : 0x00aaff;
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), mLed(lc));
    led.position.set(i * 0.78, 1.28, -1.03);
    g.add(led);
  }

  // Exhaust duct (rear top)
  const duct = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 0.28, 0.5),
    new THREE.MeshPhongMaterial({ color: 0x2a3848, shininess: 55 })
  );
  duct.position.set(0, 1.56, -0.75);
  g.add(duct);
  addVents(g, 0, 1.56, -0.75, 3.8, 0.3, 12);

  // IPA dryer (right, cylindrical)
  const dryer = cs(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 1.4, 14),
      new THREE.MeshPhongMaterial({ color: 0x4a6070, shininess: 90 })
    )
  );
  dryer.position.set(2.6, 0.7, 0);
  g.add(dryer);
  const dvp = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.06), mGlass());
  dvp.position.set(2.32, 0.82, 0);
  g.add(dvp);
  const dcap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.4, 0.1, 14),
    new THREE.MeshPhongMaterial({ color: 0x384858 })
  );
  dcap.position.set(2.6, 1.45, 0);
  g.add(dcap);

  // Chemical / controls cabinet (left)
  const cab = cs(new THREE.Mesh(new THREE.BoxGeometry(0.68, 2.2, 2.0), mBody(sev)));
  cab.position.set(-2.9, 1.1, 0);
  g.add(cab);
  for (const y of [0.75, 1.5]) {
    const sH = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 2.02), mSeam());
    sH.position.set(-2.9, y, 0);
    g.add(sH);
  }
  addVents(g, -2.9, 2.2, 0, 0.5, 1.2, 6);
  const sc = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.32, 0.06), mPanel(sev));
  sc.position.set(-2.9, 2.05, -0.72);
  sc.rotation.y = Math.PI / 2;
  g.add(sc);
  addLEDs(g, -2.91, 1.8, -0.6, 3, 0.12, sev);

  addFeet(g, [-2.7, 2.4], [-0.85, 0.85]);
  return g;
}

/** SEM / Metrology — CD-SEM, overlay measurement tool */
function mkSEM(sev: number): THREE.Group {
  const g = new THREE.Group();
  const col = sev >= 3 ? 0xc00000 : 0x2a3c50;

  // Main body (compact enclosure)
  const body = cs(
    new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.8, 1.6),
      new THREE.MeshPhongMaterial({ color: col, specular: 0x334455, shininess: 80 })
    )
  );
  body.position.y = 0.9;
  g.add(body);
  const sv = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.82, 0.04), mSeam());
  sv.position.set(0, 0.9, -0.82);
  g.add(sv);
  const sh = new THREE.Mesh(new THREE.BoxGeometry(2.22, 0.04, 0.04), mSeam());
  sh.position.set(0, 1.15, -0.82);
  g.add(sh);
  // Front viewports
  for (const [vx, vy] of [
    [-0.3, 0.72],
    [0.3, 0.72],
    [-0.3, 1.42],
    [0.3, 1.42],
  ] as const) {
    const vp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 0.05), mGlass());
    vp.position.set(vx, vy, -0.82);
    g.add(vp);
  }

  // Electron beam column (detailed, 3 sections)
  const colBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.32, 0.38, 12),
    new THREE.MeshPhongMaterial({ color: 0x1a2838, shininess: 80 })
  );
  colBase.position.set(0, 2.08, 0);
  g.add(colBase);
  const colMid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.3, 0.48, 12),
    new THREE.MeshPhongMaterial({ color: 0x1e2c3a, shininess: 80 })
  );
  colMid.position.set(0, 2.62, 0);
  g.add(colMid);
  const colTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.24, 0.38, 12),
    new THREE.MeshPhongMaterial({ color: 0x243444, shininess: 90 })
  );
  colTop.position.set(0, 3.07, 0);
  g.add(colTop);
  // Column section rings
  for (const y of [1.98, 2.34, 2.76, 3.18]) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.025, 6, 12),
      new THREE.MeshPhongMaterial({ color: 0x0a1218 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, y, 0);
    g.add(ring);
  }
  // Vacuum pump connector
  const pump = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 0.3, 8),
    new THREE.MeshPhongMaterial({ color: 0x2a3848 })
  );
  pump.rotation.z = Math.PI / 2;
  pump.position.set(0.38, 2.62, 0);
  g.add(pump);

  // Wafer stage with guide rails
  const stage = cs(
    new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.22, 0.8), new THREE.MeshPhongMaterial({ color: 0x384858 }))
  );
  stage.position.set(0, 0.11, -0.68);
  g.add(stage);
  for (const gz of [-0.32, 0.32]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(1.42, 0.06, 0.06),
      new THREE.MeshPhongMaterial({ color: 0x4a5868, shininess: 120 })
    );
    rail.position.set(0, 0.24, gz);
    g.add(rail);
  }
  const sled = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), mLed(ledColor(sev)));
  sled.position.set(0.52, 0.26, -0.68);
  g.add(sled);

  // Electronics cabinet (right)
  const cab = cs(new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.8, 1.6), mBody(sev)));
  cab.position.set(1.4, 0.9, 0);
  g.add(cab);
  for (const y of [0.62, 1.24]) {
    const sH = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 1.62), mSeam());
    sH.position.set(1.4, y, 0);
    g.add(sH);
  }
  addVents(g, 1.4, 1.8, 0, 0.45, 1.0, 5);
  const sc = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.32, 0.06), mPanel(sev));
  sc.position.set(1.4, 1.62, -0.62);
  sc.rotation.y = Math.PI / 2;
  g.add(sc);
  addLEDs(g, 1.39, 1.42, -0.55, 3, 0.11, sev);

  addFeet(g, [-0.9, 1.4], [-0.7, 0.7]);
  return g;
}

// 장비별 신호탑 위치(가장 높은 캐비닛/구조물 상단). 단일 출처로 관리.
const TOWER_POS: Record<string, [number, number, number]> = {
  etch: [2.08, 1.78, 0],
  litho: [1.78, 2.6, 0],
  lithoTrack: [2.0, 2.1, 0],
  furnace: [1.2, 2.8, 0.9],
  epi: [-1.7, 2.8, 0],
  implant: [-1.8, 2.9, 0],
  cmp: [2.55, 2.4, 0],
  cvd: [0, 1.8, 2.2],
  pvd: [-2.05, 2.0, 0],
  wet: [-2.9, 2.2, 0],
  sem: [1.4, 1.8, 0],
};

function buildBody(type: string, sev: number): THREE.Group {
  switch (type) {
    case 'etch':      return mkEtch(sev);
    case 'litho':     return mkLitho(sev);
    case 'lithoTrack': return mkLithoTrack(sev);
    case 'furnace':   return mkFurnace(sev);
    case 'epi':       return mkEpi(sev);
    case 'implant':   return mkImplant(sev);
    case 'cmp':       return mkCMP(sev);
    case 'cvd':       return mkCVD(sev);
    case 'pvd':       return mkPVD(sev);
    case 'wet':       return mkWet(sev);
    case 'sem':       return mkSEM(sev);
    default:          return mkCVD(sev);
  }
}

export function mkEquipment(type: string, sev: number): THREE.Group {
  const g = buildBody(type, sev);
  const [tx, ty, tz] = TOWER_POS[type] ?? TOWER_POS.cvd;
  addSignalTower(g, tx, ty, tz, sev);
  return g;
}
