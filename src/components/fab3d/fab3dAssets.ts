import * as THREE from 'three';

import { makeZoneLabel } from '@/components/fab3d/fab3dLabels';

function cs(m: THREE.Mesh) {
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function mkStocker(label: string, isDark: boolean): THREE.Group {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshPhongMaterial({
    color: isDark ? 0xcfd8e8 : 0xd6d5cf,
    specular: 0x9a9890,
    shininess: 82,
  });
  const darkMat = new THREE.MeshPhongMaterial({ color: 0x2e3d4d, shininess: 60 });
  const body = cs(new THREE.Mesh(new THREE.BoxGeometry(5.4, 4.8, 2.4), bodyMat));
  body.position.y = 2.4;
  g.add(body);

  for (const x of [-1.8, 0, 1.8]) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.8, 0.08), darkMat);
    door.position.set(x, 2.5, -1.24);
    g.add(door);
  }

  const portMat = new THREE.MeshBasicMaterial({ color: 0xd6b86f });
  for (const x of [-1.8, 0, 1.8]) {
    const port = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.18, 0.1), portMat);
    port.position.set(x, 3.95, -1.3);
    g.add(port);
  }

  const lbl = makeZoneLabel(label, isDark);
  lbl.position.set(-2.9, 5.4, -1.35);
  lbl.scale.set(2.5, 0.38, 1);
  g.add(lbl);
  return g;
}

export function mkOhtCarrier(): THREE.Group {
  const g = new THREE.Group();
  const white = new THREE.MeshPhongMaterial({ color: 0xd6d6d1, specular: 0x9a9d99, shininess: 94 });
  const metal = new THREE.MeshPhongMaterial({ color: 0x708090, specular: 0xb8c4d0, shininess: 120 });
  const dark = new THREE.MeshPhongMaterial({ color: 0x25313d, shininess: 65 });
  const glass = new THREE.MeshPhongMaterial({
    color: 0x1a3650,
    emissive: new THREE.Color(0x092030),
    specular: 0x88ccff,
    shininess: 160,
    transparent: true,
    opacity: 0.86,
  });
  const foupMat = new THREE.MeshPhongMaterial({
    color: 0xffefb0,
    specular: 0x998844,
    shininess: 65,
    transparent: true,
    opacity: 0.92,
  });

  // Origin is the rail center. Positive Y is above rail, negative Y hangs into the fab.
  const trolley = cs(new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.32, 0.62), dark));
  trolley.position.y = -0.08;
  g.add(trolley);

  for (const x of [-0.68, 0.68]) {
    for (const z of [-0.24, 0.24]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.16, 16), metal);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.12, z);
      g.add(wheel);
    }
  }

  const yoke = cs(new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.72, 0.28), metal));
  yoke.position.y = -0.62;
  g.add(yoke);

  const hoist = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.95, 10), metal);
  hoist.position.y = -1.22;
  g.add(hoist);

  const carrier = cs(new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.92, 1.12), white));
  carrier.position.y = -1.86;
  g.add(carrier);

  const face = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.54, 0.06), glass);
  face.position.set(0, -1.84, -0.59);
  g.add(face);

  const foup = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.58, 0.82), foupMat);
  foup.position.y = -2.48;
  g.add(foup);

  const gripper = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.12, 0.96), dark);
  gripper.position.y = -2.16;
  g.add(gripper);

  for (const x of [-0.54, 0.54]) {
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xd8b46a }));
    led.position.set(x, -1.38, -0.58);
    g.add(led);
  }

  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.36, 3), new THREE.MeshBasicMaterial({ color: 0x8f7448 }));
  arrow.rotation.x = Math.PI / 2;
  arrow.position.set(0, -1.34, -0.72);
  g.add(arrow);
  return g;
}

export function mkGroundAmr(): THREE.Group {
  const g = new THREE.Group();
  const white = new THREE.MeshPhongMaterial({ color: 0xd8d7d0, specular: 0x9a9b95, shininess: 96 });
  const side = new THREE.MeshPhongMaterial({ color: 0xc3c2bb, specular: 0x878781, shininess: 72 });
  const dark = new THREE.MeshPhongMaterial({ color: 0x22303c, shininess: 45 });
  const black = new THREE.MeshBasicMaterial({ color: 0x05080c });
  const glow = new THREE.MeshBasicMaterial({ color: 0xd8b46a });

  const body = cs(new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.9, 1.35), white));
  body.position.y = 1.05;
  g.add(body);

  const top = cs(new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.28, 1.08), side));
  top.position.y = 2.14;
  g.add(top);

  const base = cs(new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.32, 1.55), dark));
  base.position.y = 0.22;
  g.add(base);

  const face = new THREE.Mesh(new THREE.BoxGeometry(1.36, 1.12, 0.06), white);
  face.position.set(0, 1.08, -0.705);
  g.add(face);

  for (const x of [-0.38, 0.38]) {
    const eyeWhite = new THREE.Mesh(
      new THREE.SphereGeometry(0.19, 16, 10),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    eyeWhite.scale.set(1.1, 0.78, 0.28);
    eyeWhite.position.set(x, 1.3, -0.755);
    g.add(eyeWhite);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), black);
    pupil.scale.set(1, 1, 0.35);
    pupil.position.set(x + 0.04, 1.28, -0.82);
    g.add(pupil);
  }

  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.035), dark);
  mouth.position.set(0, 0.78, -0.755);
  g.add(mouth);

  for (const x of [-0.52, 0.52]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.13, 0.05), glow);
    lamp.position.set(x, 1.78, -0.755);
    g.add(lamp);
  }

  const foup = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.58, 0.86),
    new THREE.MeshPhongMaterial({ color: 0xfff0b8, specular: 0x998844, shininess: 55, transparent: true, opacity: 0.9 })
  );
  foup.position.set(0, 2.62, 0.02);
  g.add(foup);

  for (const x of [-0.78, 0.78]) {
    for (const z of [-0.48, 0.48]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.18, 16), black);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.23, z);
      g.add(wheel);
    }
  }

  const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.18, 0.12), dark);
  bumper.position.set(0, 0.36, -0.84);
  g.add(bumper);

  const badge = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.22, 0.035),
    new THREE.MeshBasicMaterial({ color: 0x8f7448 })
  );
  badge.position.set(0, 1.95, -0.765);
  g.add(badge);

  return g;
}
