import * as THREE from 'three';

export function makeZoneLabel(text: string, isDark: boolean): THREE.Sprite {
  // 구역명은 보조 정보(범례·바닥색이 주 식별 수단) → 작고 은은하게, 좌측 여백에만.
  const canvas = document.createElement('canvas');
  canvas.width = 420;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = isDark ? 'rgba(130, 160, 190, 0.55)' : 'rgba(90, 80, 64, 0.5)';
  ctx.font = '600 16px system-ui, sans-serif';
  ctx.fillText(text, 8, 40);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true }));
  spr.scale.set(4.4, 0.62, 1);
  return spr;
}

export function makeAssetLabel(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 180;
  canvas.height = 56;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(6, 12, 24, 0.72)';
  ctx.roundRect(10, 8, 160, 40, 8);
  ctx.fill();
  ctx.fillStyle = '#f5e8c8';
  ctx.font = '700 21px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, 29);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true }));
  spr.scale.set(2.1, 0.65, 1);
  return spr;
}

export function makeStockerBadge(label: string, wip: number, queue: number): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 220;
  canvas.height = 92;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(6, 12, 24, 0.76)';
  ctx.roundRect(8, 8, 204, 76, 10);
  ctx.fill();
  ctx.strokeStyle = queue > 80 ? '#ff6655' : queue > 40 ? '#ffaa44' : '#6cc6ff';
  ctx.lineWidth = 2;
  ctx.roundRect(8, 8, 204, 76, 10);
  ctx.stroke();
  ctx.fillStyle = '#f7f0da';
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.fillText(label, 18, 34);
  ctx.fillStyle = '#a9d8ff';
  ctx.font = '600 16px system-ui, sans-serif';
  ctx.fillText(`Bay WIP ${wip.toLocaleString('ko-KR')}`, 18, 58);
  ctx.fillStyle = '#ffd08a';
  ctx.font = '600 14px system-ui, sans-serif';
  ctx.fillText(`담당 Bay 합산`, 18, 76);
  const spr = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthTest: false })
  );
  spr.scale.set(3.0, 1.25, 1);
  spr.renderOrder = 2;
  return spr;
}

export function makeCountBadge(count: number, utilizationRate: number): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 80;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  const col = utilizationRate >= 0.9 ? '#ff4422' : utilizationRate >= 0.85 ? '#ff9922' : '#66aadd';
  ctx.fillStyle = 'rgba(10,16,28,0.72)';
  ctx.roundRect(3, 3, 74, 26, 6);
  ctx.fill();
  ctx.strokeStyle = col;
  ctx.lineWidth = 1.5;
  ctx.roundRect(3, 3, 74, 26, 6);
  ctx.stroke();
  ctx.fillStyle = col;
  ctx.font = 'bold 15px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`x${count}`, 40, 16);
  const spr = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthTest: false })
  );
  spr.scale.set(1.6, 0.64, 1);
  spr.renderOrder = 1;
  return spr;
}

export function makeBayLabel(text: string, maxUtilizationRate: number): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 420;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  // 컬러 바닥 위에서도 읽히도록 반투명 pill 배경 + 큰 글씨.
  ctx.fillStyle = 'rgba(8, 14, 26, 0.64)';
  ctx.roundRect(6, 26, 408, 50, 13);
  ctx.fill();
  ctx.fillStyle = maxUtilizationRate >= 0.9 ? '#ff8a8a' : maxUtilizationRate >= 0.85 ? '#ffc488' : '#c6e2ff';
  ctx.font = '700 33px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 22, 52);
  const spr = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      depthTest: false,
    })
  );
  spr.scale.set(6.6, 1.5, 1);
  spr.renderOrder = 3;
  return spr;
}
