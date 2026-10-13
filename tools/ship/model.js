/* Procedural ship in a dry dock, built from three.js primitives and exported to
   assets/models/ship.glb by make-model.mjs.

   Axes: +x is the bow, +y is up, +z is the dock's water side. The ship is 12 units
   long. Node names are the contract with the page (js/ship.js):

     hl_<name>   a group the page can glow (emissive) when its service is active
     ov_<name>   a thin overlay patch on the hull the page fades in as a highlight

   Replace assets/models/ship.glb with any other model that keeps these node
   names and the page keeps working. */
import * as THREE from "three";

const L = 12, HALF = L / 2;
const BEAM = 1.35;          // half-breadth
const YD = 0.55;            // deck height
const NU = 56;              // sections along the hull
const sm = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.08, ...o });
const M = {
  red: mat("#b0422d", { roughness: 0.7 }),
  blue: mat("#1f4fa6", { roughness: 0.55 }),
  deck: mat("#5b6a66", { roughness: 0.85 }),
  white: mat("#eef1f3", { roughness: 0.5 }),
  glass: mat("#16222b", { roughness: 0.2, metalness: 0.4 }),
  funnel: mat("#b0422d"),
  black: mat("#15191c", { roughness: 0.6 }),
  yellow: mat("#e1b02a", { roughness: 0.45, metalness: 0.2 }),
  pipeGrey: mat("#9ba7aa", { roughness: 0.4, metalness: 0.5 }),
  steel: mat("#7c878b", { roughness: 0.45, metalness: 0.6 }),
  hatch: mat("#37464f", { roughness: 0.8 }),
  orange: mat("#d9822b", { roughness: 0.5 }),
  bronze: mat("#c8963a", { roughness: 0.32, metalness: 0.85 }),
  concrete: mat("#8d999b", { roughness: 0.95 }),
  concreteDark: mat("#6f7b7d", { roughness: 0.95 }),
  block: mat("#b9a47a", { roughness: 0.9 }),
  water: mat("#1d6f86", { roughness: 0.25, metalness: 0.3, transparent: true, opacity: 0.92 }),
  barge: mat("#c2582d", { roughness: 0.7 }),
  bargeDeck: mat("#4a5256", { roughness: 0.9 }),
  boatWhite: mat("#e9eef0"),
  boatBlue: mat("#1f4fa6"),
  ovl: () => mat("#00d4a4", { roughness: 0.4, transparent: true, opacity: 0, emissive: "#00d4a4", emissiveIntensity: 0.9, depthWrite: false, side: THREE.DoubleSide }),
};

/* ------------------------------------------------------------------ hull -- */
function half(u) {                // half-breadth at u (0 stern .. 1 bow)
  if (u < 0.1) return BEAM * (0.55 + 0.45 * sm(u / 0.1));
  if (u > 0.7) { const t = (u - 0.7) / 0.3; return BEAM * Math.pow(Math.max(0, 1 - t * t), 0.9); }
  return BEAM;
}
function keelY(u) {
  let y = -1.0;
  if (u < 0.08) y += 0.28 * Math.pow(1 - u / 0.08, 2);
  if (u > 0.82) y += 0.95 * Math.pow((u - 0.82) / 0.18, 2);
  return y;
}
function deckY(u) { return u > 0.85 ? YD + 0.28 * Math.pow((u - 0.85) / 0.15, 2) : YD; }

/* one cross-section, port side, from the keel centre to the deck edge */
const SIDE_STEPS = [0, 0.2, 0.4, 0.6, 0.8, 1];

function section(u) {
  const B = Math.max(half(u), 0.001), yk = keelY(u), yd = deckY(u);
  const R = Math.min(0.45, (yd - yk) * 0.3);
  const pts = [[0, yk], [0.55 * B, yk]];
  for (let a = 1; a <= 4; a++) {   // bilge
    const th = (Math.PI / 2) * (a / 4);
    pts.push([0.55 * B + 0.45 * B * Math.sin(th), yk + R * (1 - Math.cos(th))]);
  }
  const bow = Math.max(0, (u - 0.7) / 0.3);
  SIDE_STEPS.forEach((tt, i) => {
    if (i === 0) return;
    const y = yk + R + (yd - yk - R) * tt;
    pts.push([B * (1 + 0.06 * tt * tt * (1 + 3 * bow)), y]);
  });
  return pts;                       // 2 + 4 + 5 = 11 points; index 6 is the bilge end, index 6+2 = 8 is tt 0.4
}
const PAINT_LINE = 7;               // red below, blue above (side-height step 0.4)

/* loft a band of the hull: points i0..i1 of each section, u in [u0,u1], both sides */
function loft(i0, i1, u0 = 0, u1 = 1, grow = 0, nu = NU) {
  const pos = [], idx = [];
  const rows = nu + 1, cols = i1 - i0 + 1;
  for (const side of [1, -1]) {
    const base = pos.length / 3;
    for (let r = 0; r < rows; r++) {
      const u = u0 + (u1 - u0) * (r / nu);
      const pts = section(u);
      for (let c = 0; c < cols; c++) {
        const [z, y] = pts[i0 + c];
        pos.push(-HALF + u * L, y, side * (z + grow * (z > 0 ? 1 : 0)));
      }
    }
    for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) {
      const a = base + r * cols + c, b = a + 1, d = a + cols, e = d + 1;
      if (side === 1) idx.push(a, d, b, b, d, e); else idx.push(a, b, d, b, e, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function buildHull() {
  const hull = new THREE.Group(); hull.name = "hull";
  const lower = new THREE.Mesh(loft(0, PAINT_LINE), M.red); lower.name = "hull_lower";
  const upper = new THREE.Mesh(loft(PAINT_LINE, 10), M.blue); upper.name = "hull_upper";
  [lower, upper].forEach((m) => { m.material.side = THREE.DoubleSide; });
  hull.add(lower, upper);

  // deck: three points across (slight camber)
  const pos = [], idx = [];
  for (let r = 0; r <= NU; r++) {
    const u = r / NU, B = half(u), y = deckY(u), x = -HALF + u * L;
    const zEdge = section(u)[10][0];
    pos.push(x, y, -zEdge, x, y + 0.035, 0, x, y, zEdge);
  }
  for (let r = 0; r < NU; r++) for (let c = 0; c < 2; c++) {
    const a = r * 3 + c, b = a + 1, d = a + 3, e = d + 1;
    idx.push(a, b, d, b, e, d);
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); dg.setIndex(idx); dg.computeVertexNormals();
  const deck = new THREE.Mesh(dg, M.deck); deck.name = "deck"; deck.material.side = THREE.DoubleSide;
  hull.add(deck);

  // transom plate
  const tw = half(0), ty0 = keelY(0), ty1 = YD;
  const transom = new THREE.Mesh(new THREE.PlaneGeometry(tw * 2, ty1 - ty0), M.red);
  transom.position.set(-HALF - 0.001, (ty0 + ty1) / 2, 0); transom.rotation.y = -Math.PI / 2; transom.material.side = THREE.DoubleSide;
  hull.add(transom);
  return hull;
}

/* highlight overlays on the hull skin */
function buildOverlays() {
  const g = new THREE.Group(); g.name = "overlays";
  const make = (name, geo) => { const m = new THREE.Mesh(geo, M.ovl()); m.name = "ov_" + name; return m; };
  g.add(make("waterline", loft(PAINT_LINE - 2, PAINT_LINE + 2, 0.03, 0.97, 0.022)));
  g.add(make("hullside", loft(PAINT_LINE, 10, 0.28, 0.64, 0.025)));
  g.add(make("bow", loft(3, 10, 0.8, 1.0, 0.025)));
  return g;
}

/* ------------------------------------------------------------- superstructure */
const box = (w, h, d, m, x, y, z, name) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); if (name) o.name = name; return o; };
const cyl = (r, h, m, x, y, z, rot, seg = 24) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), m); o.position.set(x, y, z); if (rot) o.rotation.set(...rot); return o; };

function buildEngine() {
  const g = new THREE.Group(); g.name = "hl_engine";
  g.add(box(1.7, 0.55, 2.15, M.white, -4.15, YD + 0.275, 0));
  g.add(box(1.35, 0.5, 1.85, M.white, -4.15, YD + 0.8, 0));
  g.add(box(0.95, 0.46, 2.05, M.white, -4.0, YD + 1.28, 0));            // bridge with wings
  g.add(box(0.2, 0.2, 2.1, M.glass, -3.55, YD + 1.3, 0));               // bridge windows
  g.add(box(1.35, 0.06, 1.85, M.steel, -4.15, YD + 1.07, 0));
  g.add(cyl(0.3, 0.9, M.funnel, -4.7, YD + 1.5, 0));                    // funnel
  g.add(cyl(0.31, 0.2, M.black, -4.7, YD + 1.98, 0));
  g.add(cyl(0.025, 0.9, M.steel, -3.95, YD + 2.0, 0));                  // mast
  g.add(box(0.05, 0.05, 0.7, M.steel, -3.95, YD + 2.2, 0));
  g.add(box(0.5, 0.4, 0.5, M.white, -3.2, YD + 0.2, 0.8));              // engine casing vents
  return g;
}

function buildPipes() {
  const g = new THREE.Group(); g.name = "hl_pipes";
  const y = YD + 0.17;
  [[0.38, M.yellow], [-0.38, M.pipeGrey]].forEach(([z, m]) => {
    g.add(cyl(0.085, 5.8, m, 0.6, y, z, [0, 0, Math.PI / 2], 16));
    for (let x = -2.1; x <= 3.3; x += 0.9) g.add(box(0.1, 0.14, 0.2, M.steel, x, YD + 0.07, z));          // supports
    for (let x = -1.8; x <= 3.0; x += 1.2) g.add(cyl(0.12, 0.05, M.steel, x, y, z, [0, 0, Math.PI / 2], 16)); // flanges
  });
  g.add(cyl(0.085, 0.76, M.yellow, 0.7, y, 0, [Math.PI / 2, 0, 0], 16));      // cross connectors
  g.add(cyl(0.085, 0.76, M.yellow, 2.5, y, 0, [Math.PI / 2, 0, 0], 16));
  g.add(cyl(0.085, 0.76, M.pipeGrey, -1.1, y, 0, [Math.PI / 2, 0, 0], 16));
  g.add(box(0.5, 0.26, 0.5, M.steel, -1.6, YD + 0.13, 0));                    // manifold
  g.add(cyl(0.08, 0.5, M.yellow, -1.6, YD + 0.5, 0.0, null, 16));            // riser
  g.add(box(0.5, 0.26, 0.5, M.steel, 3.5, YD + 0.13, 0));
  [-1, 1].forEach((s) => g.add(box(1.3, 0.2, 0.62, M.hatch, 1.5, YD + 0.1, s * 0.95)));  // hatches sit beside, not highlighted weight
  return g;
}

function buildCrane() {
  const g = new THREE.Group(); g.name = "hl_crane";
  const px = 4.1, pz = 0.55;
  g.add(cyl(0.24, 0.55, M.steel, px, YD + 0.275, pz));
  g.add(box(0.62, 0.46, 0.55, M.orange, px, YD + 0.78, pz));
  const boom = box(3.4, 0.14, 0.18, M.orange, 0, 0, 0);
  const pivot = new THREE.Group(); pivot.position.set(px, YD + 0.95, pz); pivot.rotation.z = 0.62;
  boom.position.x = 1.7; pivot.add(boom); g.add(pivot);
  // hydraulic ram: cab to boom
  const a = new THREE.Vector3(px + 0.1, YD + 0.62, pz + 0.22), b = new THREE.Vector3(px + 1.15, YD + 1.5, pz + 0.22);
  const len = a.distanceTo(b); const ram = cyl(0.045, len, M.pipeGrey, 0, 0, 0, null, 12);
  ram.position.copy(a).add(b).multiplyScalar(0.5);
  ram.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  g.add(ram);
  const rod = cyl(0.028, len * 0.55, M.steel, 0, 0, 0, null, 10);
  rod.position.copy(a).add(b).multiplyScalar(0.5).lerp(b, 0.28); rod.quaternion.copy(ram.quaternion); g.add(rod);
  g.add(cyl(0.012, 1.1, M.black, px + 3.0, YD + 2.0 - 0.15, pz, null, 6));    // hoist line
  g.add(box(0.14, 0.12, 0.14, M.steel, px + 3.0, YD + 1.35, pz));            // hook block
  // deck winch with hydraulic hoses
  g.add(box(0.5, 0.3, 0.7, M.orange, 4.9, YD + 0.15, -0.55));
  g.add(cyl(0.14, 0.7, M.steel, 4.9, YD + 0.42, -0.55, [Math.PI / 2, 0, 0]));
  g.add(cyl(0.03, 0.9, M.black, 4.5, YD + 0.1, -0.1, [0, 0, Math.PI / 2], 8));
  return g;
}

function buildProp() {
  const g = new THREE.Group(); g.name = "hl_prop";
  const px = -5.78, py = -0.62;
  g.add(cyl(0.07, 0.5, M.steel, px + 0.3, py, 0, [0, 0, Math.PI / 2], 12));         // shaft
  g.add(cyl(0.17, 0.4, M.bronze, px, py, 0, [0, 0, Math.PI / 2], 18));             // hub
  for (let i = 0; i < 4; i++) {
    const bl = new THREE.Group(); bl.rotation.x = (i * Math.PI) / 2;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 0.36), M.bronze);
    blade.position.y = 0.5; blade.rotation.y = 0.55; bl.add(blade);
    bl.position.set(px, py, 0); g.add(bl);
  }
  g.add(box(0.08, 1.25, 0.5, M.steel, px - 0.6, py + 0.05, 0));                      // rudder
  g.add(box(0.5, 0.2, 0.3, M.red, px + 0.45, py + 0.28, 0));                          // skeg stub
  return g;
}

function buildDock() {
  const g = new THREE.Group(); g.name = "dock";
  const keel = new THREE.Group(); keel.name = "hl_dock";
  const floorY = -1.55;
  for (let x = -4.6; x <= 4.9; x += 0.85) keel.add(box(0.5, 0.52, 0.85, M.block, x, -1.0 - 0.26 + 0.0, 0));
  // shoring struts either side
  for (let x = -3.6; x <= 3.7; x += 1.45) [-1, 1].forEach((s) => {
    const a = new THREE.Vector3(x, floorY + 0.2, s * 2.3), b = new THREE.Vector3(x, -0.2, s * (BEAM + 0.02));
    const st = cyl(0.06, a.distanceTo(b), M.steel, 0, 0, 0, null, 10);
    st.position.copy(a).add(b).multiplyScalar(0.5); st.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    keel.add(st, box(0.35, 0.16, 0.35, M.concreteDark, x, floorY + 0.28, s * 2.3));
  });
  g.add(keel);
  // floor, walls, joints
  g.add(box(26, 0.4, 7.6, M.concrete, 0, floorY - 0.2, 0, "dock_floor"));
  for (let x = -12; x <= 12; x += 2) g.add(box(0.04, 0.02, 7.6, M.concreteDark, x, floorY + 0.01, 0));
  g.add(box(26, 1.6, 0.7, M.concreteDark, 0, floorY + 0.4 - 0.2, -3.95));                // far wall
  g.add(box(26, 0.35, 0.5, M.concreteDark, 0, floorY + 0.17, 3.95));                      // quay edge
  [-9, -3, 3, 9].forEach((x) => g.add(cyl(0.13, 0.35, M.black, x, floorY + 0.35, 3.7)));  // bollards
  // water beyond the quay
  const w = new THREE.Mesh(new THREE.PlaneGeometry(40, 14), M.water); w.rotation.x = -Math.PI / 2; w.position.set(0, floorY + 0.2, 11); w.name = "water"; g.add(w);
  g.add(box(40, 1.4, 0.5, M.concreteDark, 0, floorY - 0.5, 4.2));
  return g;
}

function buildBarge() {
  const g = new THREE.Group(); g.name = "hl_barge";
  const y = -1.28, cx = -1.5, cz = 6.6;
  g.add(box(6.2, 0.55, 2.3, M.barge, cx, y, cz));
  g.add(box(6.2, 0.08, 2.3, M.bargeDeck, cx, y + 0.31, cz));
  [-1, 1].forEach((s) => g.add(box(6.2, 0.18, 0.08, M.barge, cx, y + 0.42, cz + s * 1.1)));
  g.add(box(0.08, 0.18, 2.3, M.barge, cx - 3.1, y + 0.42, cz)); g.add(box(0.08, 0.18, 2.3, M.barge, cx + 3.1, y + 0.42, cz));
  g.add(box(1.0, 0.7, 1.0, M.white, cx - 2.2, y + 0.75, cz));
  [[0.2, 0.9, M.yellow], [1.2, 0.9, M.orange], [2.2, 0.9, M.steel]].forEach(([dx, w, m]) => g.add(box(w, 0.45, 1.3, m, cx + dx, y + 0.57, cz)));
  // supply boat, nosed in beside the barge
  const shape = new THREE.Shape();
  shape.moveTo(-1.6, -0.5); shape.lineTo(0.9, -0.5); shape.quadraticCurveTo(1.9, -0.2, 2.1, 0); shape.quadraticCurveTo(1.9, 0.2, 0.9, 0.5); shape.lineTo(-1.6, 0.5); shape.lineTo(-1.6, -0.5);
  const hullGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: false });
  const boat = new THREE.Mesh(hullGeo, M.boatBlue); boat.rotation.x = -Math.PI / 2; boat.position.set(1.0, -1.55, 9.0);
  g.add(boat);
  g.add(box(1.4, 0.26, 0.9, M.boatWhite, 0.25, -0.88, 9.0));
  g.add(box(0.9, 0.36, 0.8, M.boatWhite, 0.4, -0.62, 9.0));
  g.add(box(0.1, 0.1, 0.8, M.glass, 0.88, -0.63, 9.0));
  g.add(cyl(0.05, 0.5, M.black, -0.2, -0.45, 9.0, null, 8));
  return g;
}

/* ----------------------------------------------------------------- scene -- */
export function buildShip() {
  const root = new THREE.Group(); root.name = "wisdom_marine_ship";
  root.add(buildHull(), buildOverlays(), buildEngine(), buildPipes(), buildCrane(), buildProp(), buildDock(), buildBarge());
  // a few deck fittings that are not highlighted
  const fit = new THREE.Group(); fit.name = "fittings";
  [-1, 1].forEach((s) => {
    for (let x = -2.4; x <= 5.0; x += 0.6) fit.add(box(0.025, 0.18, 0.025, M.steel, x, YD + 0.09, s * (section((x + HALF) / L)[10][0] - 0.03)));
  });
  fit.add(cyl(0.16, 0.14, M.steel, 5.5, YD + 0.14, 0));                       // anchor windlass
  fit.add(cyl(0.025, 0.7, M.steel, 5.7, YD + 0.5, 0));
  root.add(fit);
  return root;
}
