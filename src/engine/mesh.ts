import { BONE_DEFINITIONS, BONE_ORDER } from './rigging';
import {
  CharacterEyeRig,
  DeformBoneId,
  EyeLandmark,
  PosedSkeleton,
  RestJoints,
  SkinnedMesh,
  Vec2,
  VertexWeight,
} from './types';

function distToSegment(p: Vec2, a: Vec2, b: Vec2): { dist: number; closest: Vec2 } {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const lenSq = vx * vx + vy * vy;
  if (lenSq < 1e-6) {
    return { dist: Math.hypot(p.x - a.x, p.y - a.y), closest: a };
  }
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / lenSq));
  const cx = a.x + t * vx;
  const cy = a.y + t * vy;
  return { dist: Math.hypot(p.x - cx, p.y - cy), closest: { x: cx, y: cy } };
}

function isPixelOpaque(rgba: Uint8ClampedArray, width: number, height: number, x: number, y: number, thresh = 10): boolean {
  const ix = Math.max(0, Math.min(width - 1, Math.round(x)));
  const iy = Math.max(0, Math.min(height - 1, Math.round(y)));
  return rgba[(iy * width + ix) * 4 + 3] >= thresh;
}

function segmentCrossesTransparentGap(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  p: Vec2,
  q: Vec2
): number {
  const steps = 10;
  let empty = 0;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (!isPixelOpaque(rgba, width, height, p.x + (q.x - p.x) * t, p.y + (q.y - p.y) * t, 10)) {
      empty++;
    }
  }
  return empty / (steps - 1);
}

function edgeBridgesOpaqueIslands(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  p: Vec2,
  q: Vec2
): boolean {
  const steps = 14;
  let state = 0; // 0: start, 1: seen first opaque, 2: entered transparent gap after opaque
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const op = isPixelOpaque(
      rgba,
      width,
      height,
      p.x + (q.x - p.x) * t,
      p.y + (q.y - p.y) * t,
      10
    );
    if (state === 0 && op) {
      state = 1;
    } else if (state === 1 && !op) {
      state = 2;
    } else if (state === 2 && op) {
      return true;
    }
  }
  return false;
}

function snapPointToNearestOpaqueInTri(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  a: Vec2,
  b: Vec2,
  c: Vec2
): Vec2 | null {
  const candidates: Vec2[] = [
    { x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3 },
    a,
    b,
    c,
    { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 },
    { x: (b.x + c.x) * 0.5, y: (b.y + c.y) * 0.5 },
    { x: (c.x + a.x) * 0.5, y: (c.y + a.y) * 0.5 },
    { x: a.x * 0.6 + b.x * 0.2 + c.x * 0.2, y: a.y * 0.6 + b.y * 0.2 + c.y * 0.2 },
    { x: a.x * 0.2 + b.x * 0.6 + c.x * 0.2, y: a.y * 0.2 + b.y * 0.6 + c.y * 0.2 },
    { x: a.x * 0.2 + b.x * 0.2 + c.x * 0.6, y: a.y * 0.2 + b.y * 0.2 + c.y * 0.6 },
  ];
  for (const pt of candidates) {
    if (isPixelOpaque(rgba, width, height, pt.x, pt.y, 8)) {
      return pt;
    }
  }
  return null;
}

/**
 * Generates a silhouette-Fitted, Seam-Split triangle mesh:
 * 1. Discards empty webbing triangles in armpit / leg gaps.
 * 2. Splits shared transparent-margin vertices when two neighboring triangles hug
 *    different body parts across an empty gap (so lifting an arm never pulls the ribs/head!).
 * 3. Smooths weights inside connected opaque islands and deforms with 2D Dual-Quaternion skinning.
 */
export function buildSkinnedMesh(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  restJoints: RestJoints,
  gridCols = 18,
  gridRows = 22
): SkinnedMesh {
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;
  let anyOpaque = false;

  for (let y = 0; y < height; y++) {
    const rowOff = y * width * 4;
    for (let x = 0; x < width; x++) {
      if (rgba[rowOff + x * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        anyOpaque = true;
      }
    }
  }

  if (!anyOpaque) {
    minX = 0;
    maxX = width - 1;
    minY = 0;
    maxY = height - 1;
  }

  const pad = Math.max(5, Math.round(Math.max(width, height) * 0.015));
  minX = Math.max(0, minX - pad);
  maxX = Math.min(width, maxX + pad);
  minY = Math.max(0, minY - pad);
  maxY = Math.min(height, maxY + pad);

  const cellW = (maxX - minX) / gridCols;
  const cellH = (maxY - minY) / gridRows;

  const stride = gridCols + 1;
  const baseVerts: Vec2[] = new Array((gridRows + 1) * stride);
  for (let r = 0; r <= gridRows; r++) {
    for (let c = 0; c <= gridCols; c++) {
      baseVerts[r * stride + c] = { x: minX + c * cellW, y: minY + r * cellH };
    }
  }

  interface RawTri {
    v: [number, number, number];
    anchor: Vec2;
  }

  const rawTris: RawTri[] = [];

  const considerTri = (i0: number, i1: number, i2: number) => {
    const a = baseVerts[i0];
    const b = baseVerts[i1];
    const c = baseVerts[i2];

    // Check if any pixel inside this triangle's bounding box (with 2px anti-alias pad) is opaque
    const bx0 = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x) - 2));
    const bx1 = Math.min(width - 1, Math.ceil(Math.max(a.x, b.x, c.x) + 2));
    const by0 = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y) - 2));
    const by1 = Math.min(height - 1, Math.ceil(Math.max(a.y, b.y, c.y) + 2));

    let anchor = snapPointToNearestOpaqueInTri(rgba, width, height, a, b, c);
    if (!anchor) {
      // Fine scan inside triangle bounding box for thin limbs
      const cx = (a.x + b.x + c.x) / 3;
      const cy = (a.y + b.y + c.y) / 3;
      let bestDist = Infinity;
      for (let y = by0; y <= by1; y += 2) {
        const rowOff = y * width * 4;
        for (let x = bx0; x <= bx1; x += 2) {
          if (rgba[rowOff + x * 4 + 3] >= 8) {
            const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
            if (d < bestDist) {
              bestDist = d;
              anchor = { x, y };
            }
          }
        }
      }
    }

    if (!anchor) return;

    // Cull armpit/crotch "webbing" triangles: if any edge bridges two opaque regions across a transparent gap, skip it!
    if (
      edgeBridgesOpaqueIslands(rgba, width, height, a, b) ||
      edgeBridgesOpaqueIslands(rgba, width, height, b, c) ||
      edgeBridgesOpaqueIslands(rgba, width, height, c, a)
    ) {
      return;
    }

    const centroid = { x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3 };
    if (!isPixelOpaque(rgba, width, height, centroid.x, centroid.y, 6)) {
      const opA = isPixelOpaque(rgba, width, height, a.x, a.y, 8);
      const opB = isPixelOpaque(rgba, width, height, b.x, b.y, 8);
      const opC = isPixelOpaque(rgba, width, height, c.x, c.y, 8);
      if (opA && opB && segmentCrossesTransparentGap(rgba, width, height, a, b) > 0.2) return;
      if (opB && opC && segmentCrossesTransparentGap(rgba, width, height, b, c) > 0.2) return;
      if (opC && opA && segmentCrossesTransparentGap(rgba, width, height, c, a) > 0.2) return;
    }

    rawTris.push({ v: [i0, i1, i2], anchor });
  };

  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      const v00 = r * stride + c;
      const v10 = r * stride + (c + 1);
      const v01 = (r + 1) * stride + c;
      const v11 = (r + 1) * stride + (c + 1);

      if ((r + c) % 2 === 0) {
        considerTri(v00, v10, v11);
        considerTri(v00, v11, v01);
      } else {
        considerTri(v00, v10, v01);
        considerTri(v10, v11, v01);
      }
    }
  }

  // Seam-split transparent border vertices if incident triangles anchor onto separated body parts!
  const incidentTris = new Map<number, number[]>();
  for (let tIdx = 0; tIdx < rawTris.length; tIdx++) {
    for (const baseV of rawTris[tIdx].v) {
      let list = incidentTris.get(baseV);
      if (!list) {
        list = [];
        incidentTris.set(baseV, list);
      }
      list.push(tIdx);
    }
  }

  const vertCoords: number[] = [];
  // Also store an "opaque sample position" per emitted vertex so transparent padding corners
  // inherit the exact bone weight of the character edge they hug!
  const sampleCoords: Vec2[] = [];
  const triCornerVertIdx = new Int32Array(rawTris.length * 3);

  for (const [baseV, tList] of incidentTris.entries()) {
    const pt = baseVerts[baseV];
    const opaqueHere = isPixelOpaque(rgba, width, height, pt.x, pt.y, 10);

    if (opaqueHere || tList.length === 1) {
      const outIdx = vertCoords.length / 2;
      vertCoords.push(pt.x, pt.y);
      sampleCoords.push(opaqueHere ? pt : rawTris[tList[0]].anchor);
      for (const tIdx of tList) {
        const corner = rawTris[tIdx].v.indexOf(baseV);
        triCornerVertIdx[tIdx * 3 + corner] = outIdx;
      }
    } else {
      // Group incident triangles whose opaque anchors can see each other without crossing empty space
      const groups: number[][] = [];
      for (const tIdx of tList) {
        const anc = rawTris[tIdx].anchor;
        let placed = false;
        for (const g of groups) {
          const refAnc = rawTris[g[0]].anchor;
          if (
            segmentCrossesTransparentGap(rgba, width, height, anc, refAnc) <= 0.12 &&
            !edgeBridgesOpaqueIslands(rgba, width, height, anc, refAnc)
          ) {
            g.push(tIdx);
            placed = true;
            break;
          }
        }
        if (!placed) {
          groups.push([tIdx]);
        }
      }

      for (const g of groups) {
        const outIdx = vertCoords.length / 2;
        vertCoords.push(pt.x, pt.y);
        // Average opaque anchor for this seam side
        let ax = 0;
        let ay = 0;
        for (const tIdx of g) {
          ax += rawTris[tIdx].anchor.x;
          ay += rawTris[tIdx].anchor.y;
          const corner = rawTris[tIdx].v.indexOf(baseV);
          triCornerVertIdx[tIdx * 3 + corner] = outIdx;
        }
        sampleCoords.push({ x: ax / g.length, y: ay / g.length });
      }
    }
  }

  const restVertices = new Float32Array(vertCoords);
  const uvs = new Float32Array(vertCoords);
  const indices = new Uint16Array(triCornerVertIdx);

  const weights = computeVertexWeights(
    rgba,
    width,
    height,
    restVertices,
    restJoints,
    indices,
    sampleCoords
  );

  return {
    width,
    height,
    restVertices,
    uvs,
    indices,
    weights,
    boneOrder: BONE_ORDER,
  };
}

/**
 * Computes anatomical capsule-aware weights + Laplacian neighbor diffusion
 * across seam-respecting connected components.
 */
export function computeVertexWeights(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  restVertices: Float32Array,
  restJoints: RestJoints,
  indices?: Uint16Array,
  sampleCoords?: Vec2[]
): VertexWeight[][] {
  const numVerts = restVertices.length / 2;
  const numBones = BONE_ORDER.length;
  const charScale = Math.max(40, Math.hypot(width, height));
  const eps = charScale * 0.025;

  const shoulderSpan = Math.max(
    24,
    Math.hypot(
      restJoints.rightShoulder.x - restJoints.leftShoulder.x,
      restJoints.rightShoulder.y - restJoints.leftShoulder.y
    )
  );
  const headLen = Math.max(
    20,
    Math.hypot(restJoints.neck.x - restJoints.headTop.x, restJoints.neck.y - restJoints.headTop.y)
  );

  const capsuleRadius: Record<DeformBoneId, number> = {
    head: headLen * 0.62,
    neck: shoulderSpan * 0.16,
    spine: shoulderSpan * 0.34,
    pelvis: shoulderSpan * 0.28,
    leftUpperArm: shoulderSpan * 0.12,
    leftLowerArm: shoulderSpan * 0.12,
    leftHandBone: shoulderSpan * 0.13,
    rightUpperArm: shoulderSpan * 0.12,
    rightLowerArm: shoulderSpan * 0.12,
    rightHandBone: shoulderSpan * 0.13,
    leftThigh: shoulderSpan * 0.14,
    leftShin: shoulderSpan * 0.14,
    leftFootBone: shoulderSpan * 0.15,
    rightThigh: shoulderSpan * 0.14,
    rightShin: shoulderSpan * 0.14,
    rightFootBone: shoulderSpan * 0.15,
  };

  const boneSegments = BONE_ORDER.map((id) => {
    const def = BONE_DEFINITIONS[id];
    return {
      id,
      a: restJoints[def.startJoint],
      b: restJoints[def.endJoint],
      radius: capsuleRadius[id],
    };
  });

  let dense = new Float32Array(numVerts * numBones);

  for (let i = 0; i < numVerts; i++) {
    const p: Vec2 = sampleCoords?.[i] ?? {
      x: restVertices[i * 2],
      y: restVertices[i * 2 + 1],
    };
    let rowSum = 0;

    // Smooth continuous head protection above neck (0 below neck, smoothly ramps to 1 above neck)
    const aboveNeckT = Math.max(
      0,
      Math.min(1, (restJoints.neck.y - p.y) / Math.max(12, headLen * 0.35))
    );
    const headHorizT = Math.max(
      0,
      Math.min(1, 1.35 - Math.abs(p.x - restJoints.neck.x) / Math.max(16, headLen))
    );
    const headZoneFactor = aboveNeckT * headHorizT;

    for (let bIdx = 0; bIdx < numBones; bIdx++) {
      const seg = boneSegments[bIdx];
      const { dist, closest } = distToSegment(p, seg.a, seg.b);
      const surfDist = Math.max(0, dist - seg.radius);
      const emptyFrac = segmentCrossesTransparentGap(rgba, width, height, p, closest);
      const effectiveDist = surfDist + emptyFrac * charScale * 0.32;
      let w = 1 / Math.pow(effectiveDist + eps, 2.7);

      if (
        headZoneFactor > 0 &&
        seg.id !== 'head' &&
        seg.id !== 'neck' &&
        seg.id !== 'spine'
      ) {
        w *= 1 - headZoneFactor * 0.96;
      }

      dense[i * numBones + bIdx] = w;
      rowSum += w;
    }

    const inv = rowSum > 0 ? 1 / rowSum : 1;
    for (let bIdx = 0; bIdx < numBones; bIdx++) {
      dense[i * numBones + bIdx] *= inv;
    }
  }

  // 5-pass Laplacian neighbor smoothing across ALL kept triangle edges (seam-splitting already isolated gaps!)
  if (indices && indices.length >= 3) {
    const neighbors: number[][] = Array.from({ length: numVerts }, () => []);
    const addEdge = (u: number, v: number) => {
      if (!neighbors[u].includes(v)) neighbors[u].push(v);
      if (!neighbors[v].includes(u)) neighbors[v].push(u);
    };
    for (let t = 0; t < indices.length; t += 3) {
      const i0 = indices[t];
      const i1 = indices[t + 1];
      const i2 = indices[t + 2];
      addEdge(i0, i1);
      addEdge(i1, i2);
      addEdge(i2, i0);
    }

    for (let pass = 0; pass < 7; pass++) {
      const nextDense = new Float32Array(dense.length);
      for (let i = 0; i < numVerts; i++) {
        const nbrs = neighbors[i];
        if (nbrs.length === 0) {
          for (let b = 0; b < numBones; b++) {
            nextDense[i * numBones + b] = dense[i * numBones + b];
          }
          continue;
        }
        let sum = 0;
        for (let b = 0; b < numBones; b++) {
          let nbrAvg = 0;
          for (let k = 0; k < nbrs.length; k++) {
            nbrAvg += dense[nbrs[k] * numBones + b];
          }
          nbrAvg /= nbrs.length;
          const blended = dense[i * numBones + b] * 0.5 + nbrAvg * 0.5;
          nextDense[i * numBones + b] = blended;
          sum += blended;
        }
        const inv = sum > 0 ? 1 / sum : 1;
        for (let b = 0; b < numBones; b++) {
          nextDense[i * numBones + b] *= inv;
        }
      }
      dense = nextDense;
    }
  }

  const weights: VertexWeight[][] = new Array(numVerts);
  for (let i = 0; i < numVerts; i++) {
    const raw: VertexWeight[] = [];
    for (let b = 0; b < numBones; b++) {
      const w = dense[i * numBones + b];
      if (w > 1e-4) raw.push({ boneIndex: b, weight: w });
    }
    raw.sort((x, y) => y.weight - x.weight);
    const top = raw.slice(0, 4);
    const sum = top.reduce((acc, item) => acc + item.weight, 0) || 1;
    weights[i] = top.map((item) => ({
      boneIndex: item.boneIndex,
      weight: item.weight / sum,
    }));
  }

  return weights;
}

/**
 * Applies 2D Dual-Quaternion Volume-Preserving Skinning (DQS) + 2.5D Head Turning & Torso Twist/Squash.
 */
export function deformMeshVertices(
  mesh: SkinnedMesh,
  posedSkeleton: PosedSkeleton,
  outVertices?: Float32Array
): Float32Array {
  const numVerts = mesh.restVertices.length / 2;
  const out =
    outVertices && outVertices.length === mesh.restVertices.length
      ? outVertices
      : new Float32Array(mesh.restVertices.length);

  const numBones = mesh.boneOrder.length;
  const qwArr = new Float32Array(numBones);
  const qzArr = new Float32Array(numBones);
  const dxArr = new Float32Array(numBones);
  const dyArr = new Float32Array(numBones);

  const headBoneIdx = mesh.boneOrder.indexOf('head');
  const neckBoneIdx = mesh.boneOrder.indexOf('neck');
  const spineBoneIdx = mesh.boneOrder.indexOf('spine');

  const headTurnX = posedSkeleton.poseParams?.headTurnX ?? 0;
  const headTurnY = posedSkeleton.poseParams?.headTurnY ?? 0;
  const torsoTwist = posedSkeleton.poseParams?.torsoTwist ?? 0;
  const torsoSquash = posedSkeleton.poseParams?.torsoSquash ?? 0;
  const has25DHead = Math.abs(headTurnX) > 1e-4 || Math.abs(headTurnY) > 1e-4;
  const has25DTorso = Math.abs(torsoTwist) > 1e-4 || Math.abs(torsoSquash) > 1e-4;

  const headBt = posedSkeleton.boneTransforms.head;
  const restHeadCenter: Vec2 = {
    x: (headBt.restStart.x + headBt.restEnd.x) * 0.5,
    y: (headBt.restStart.y + headBt.restEnd.y) * 0.52,
  };
  const headRadius = Math.max(
    20,
    Math.hypot(headBt.restEnd.x - headBt.restStart.x, headBt.restEnd.y - headBt.restStart.y) * 0.85
  );

  const spineBt = posedSkeleton.boneTransforms.spine;
  const restSpineCenter: Vec2 = {
    x: (spineBt.restStart.x + spineBt.restEnd.x) * 0.5,
    y: (spineBt.restStart.y + spineBt.restEnd.y) * 0.5,
  };
  const spineRadius = Math.max(
    24,
    Math.hypot(spineBt.restEnd.x - spineBt.restStart.x, spineBt.restEnd.y - spineBt.restStart.y) * 0.75
  );

  for (let b = 0; b < numBones; b++) {
    const id = mesh.boneOrder[b];
    const bt = posedSkeleton.boneTransforms[id];
    const theta = bt.deltaAngle;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    const tx = bt.posedStart.x - (cosT * bt.restStart.x - sinT * bt.restStart.y);
    const ty = bt.posedStart.y - (sinT * bt.restStart.x + cosT * bt.restStart.y);

    const half = theta * 0.5;
    const w = Math.cos(half);
    const z = Math.sin(half);

    qwArr[b] = w;
    qzArr[b] = z;
    dxArr[b] = 0.5 * (tx * w + ty * z);
    dyArr[b] = 0.5 * (ty * w - tx * z);
  }

  for (let i = 0; i < numVerts; i++) {
    let vx = mesh.restVertices[i * 2];
    let vy = mesh.restVertices[i * 2 + 1];
    const vw = mesh.weights[i];

    if (has25DHead || has25DTorso) {
      let headW = 0;
      let spineW = 0;
      for (let k = 0; k < vw.length; k++) {
        const bi = vw[k].boneIndex;
        if (bi === headBoneIdx) headW += vw[k].weight;
        else if (bi === neckBoneIdx) headW += vw[k].weight * 0.35;
        else if (bi === spineBoneIdx) spineW += vw[k].weight;
      }

      if (has25DHead && headW > 0.02) {
        const lx = vx - restHeadCenter.x;
        const ly = vy - restHeadCenter.y;
        const rNorm = Math.min(1.35, Math.hypot(lx, ly) / headRadius);
        // Inner face pixels shift more than outer silhouette rim (2.5D spherical parallax)
        const parallax = Math.max(0.28, 1.15 - rNorm * 0.62);
        const foreshortenX =
          1 - Math.abs(headTurnX) * 0.14 - (lx * headTurnX > 0 ? Math.abs(headTurnX) * 0.12 : 0);
        const foreshortenY = 1 - Math.abs(headTurnY) * 0.1;

        const targetVx =
          restHeadCenter.x + lx * foreshortenX + headTurnX * headRadius * 0.25 * parallax;
        const targetVy =
          restHeadCenter.y + ly * foreshortenY + headTurnY * headRadius * 0.18 * parallax;

        vx += (targetVx - vx) * Math.min(1, headW);
        vy += (targetVy - vy) * Math.min(1, headW);
      }

      if (has25DTorso && spineW > 0.02) {
        const tx = vx - restSpineCenter.x;
        const ty = vy - restSpineCenter.y;
        const rNorm = Math.min(1.35, Math.hypot(tx, ty) / spineRadius);
        const parallax = Math.max(0.25, 1.1 - rNorm * 0.55);
        const squashScaleX = 1 / (1 - torsoSquash * 0.35);
        const squashScaleY = 1 - torsoSquash * 0.35;
        const twistScaleX = 1 - Math.abs(torsoTwist) * 0.12;

        const targetVx =
          restSpineCenter.x +
          tx * squashScaleX * twistScaleX +
          torsoTwist * spineRadius * 0.22 * parallax;
        const targetVy = restSpineCenter.y + ty * squashScaleY;

        vx += (targetVx - vx) * Math.min(1, spineW);
        vy += (targetVy - vy) * Math.min(1, spineW);
      }
    }

    let bw = 0;
    let bz = 0;
    let bdx = 0;
    let bdy = 0;

    const refBone = vw[0]?.boneIndex ?? 0;
    const refW = qwArr[refBone];
    const refZ = qzArr[refBone];

    for (let k = 0; k < vw.length; k++) {
      const b = vw[k].boneIndex;
      let weight = vw[k].weight;
      if (qwArr[b] * refW + qzArr[b] * refZ < 0) {
        weight = -weight;
      }
      bw += weight * qwArr[b];
      bz += weight * qzArr[b];
      bdx += weight * dxArr[b];
      bdy += weight * dyArr[b];
    }

    const invNorm = 1 / (Math.hypot(bw, bz) || 1);
    const nw = bw * invNorm;
    const nz = bz * invNorm;
    const ndx = bdx * invNorm;
    const ndy = bdy * invNorm;

    const rotCos = nw * nw - nz * nz;
    const rotSin = 2 * nw * nz;
    const transX = 2 * (ndx * nw - ndy * nz);
    const transY = 2 * (ndy * nw + ndx * nz);

    out[i * 2] = rotCos * vx - rotSin * vy + transX;
    out[i * 2 + 1] = rotSin * vx + rotCos * vy + transY;
  }

  return out;
}

/**
 * Transforms a rest-space head point (such as an eye landmark) through the 2.5D head turn
 * and head bone rotation so eyelids and gaze widgets lock accurately onto the deformed face.
 */
export function transformHeadPoint2D(
  pt: Vec2,
  posedSkeleton: PosedSkeleton
): Vec2 {
  const headBt = posedSkeleton.boneTransforms.head;
  const headTurnX = posedSkeleton.poseParams?.headTurnX ?? 0;
  const headTurnY = posedSkeleton.poseParams?.headTurnY ?? 0;

  const restHeadCenter: Vec2 = {
    x: (headBt.restStart.x + headBt.restEnd.x) * 0.5,
    y: (headBt.restStart.y + headBt.restEnd.y) * 0.52,
  };
  const headRadius = Math.max(
    20,
    Math.hypot(headBt.restEnd.x - headBt.restStart.x, headBt.restEnd.y - headBt.restStart.y) * 0.85
  );

  const lx = pt.x - restHeadCenter.x;
  const ly = pt.y - restHeadCenter.y;
  const rNorm = Math.min(1.35, Math.hypot(lx, ly) / headRadius);
  const parallax = Math.max(0.28, 1.15 - rNorm * 0.62);
  const foreshortenX =
    1 - Math.abs(headTurnX) * 0.14 - (lx * headTurnX > 0 ? Math.abs(headTurnX) * 0.12 : 0);
  const foreshortenY = 1 - Math.abs(headTurnY) * 0.1;

  const warpedX = restHeadCenter.x + lx * foreshortenX + headTurnX * headRadius * 0.25 * parallax;
  const warpedY = restHeadCenter.y + ly * foreshortenY + headTurnY * headRadius * 0.18 * parallax;

  const theta = headBt.deltaAngle;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);

  return {
    x: headBt.posedStart.x + cosT * (warpedX - headBt.restStart.x) - sinT * (warpedY - headBt.restStart.y),
    y: headBt.posedStart.y + sinT * (warpedX - headBt.restStart.x) + cosT * (warpedY - headBt.restStart.y),
  };
}

/**
 * Renders animated blinking eyelids over the deformed character head when blink > 0.01.
 * Follows 2.5D head turn foreshortening, head tilt, and character color palette.
 */
export function renderCharacterBlink2D(
  ctx: CanvasRenderingContext2D,
  eyes: CharacterEyeRig | undefined,
  posedSkeleton: PosedSkeleton,
  extraBlink = 0,
  opacity = 1
): void {
  if (!eyes) return;
  const poseBlink = posedSkeleton.poseParams?.blink ?? 0;
  const blinkAmount = Math.max(0, Math.min(1, Math.max(poseBlink, extraBlink)));
  if (blinkAmount <= 0.01) return;

  const headAngle = posedSkeleton.boneTransforms.head.deltaAngle;
  const headTurnX = posedSkeleton.poseParams?.headTurnX ?? 0;

  const drawSingleEyeBlink = (eye: EyeLandmark, side: -1 | 1) => {
    const pos = transformHeadPoint2D(eye.center, posedSkeleton);
    // Perspective foreshortening on the eye closer to the turned edge
    const sideScaleX = Math.max(
      0.45,
      1 - Math.abs(headTurnX) * 0.16 - (side * headTurnX > 0 ? Math.abs(headTurnX) * 0.22 : -Math.abs(headTurnX) * 0.06)
    );
    const rx = eye.radiusX * sideScaleX * 1.15;
    const ry = eye.radiusY * 1.18;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(pos.x, pos.y);
    ctx.rotate(headAngle);

    // Clip to rounded eye socket ellipse
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.clip();

    // Upper eyelid descends from -ry to +ry*0.35 as blink goes 0 -> 1
    const upperCoverH = ry * 2.05 * blinkAmount;
    ctx.fillStyle = eye.lidColor;
    ctx.fillRect(-rx - 2, -ry - 2, rx * 2 + 4, upperCoverH);

    // Lower eyelid rises slightly for a natural cushioned blink
    const lowerCoverH = ry * 0.55 * blinkAmount;
    ctx.fillRect(-rx - 2, ry + 2 - lowerCoverH, rx * 2 + 4, lowerCoverH + 2);

    ctx.restore();

    // Draw expressive curved eyelash / closed eyelid crease line
    ctx.save();
    ctx.globalAlpha = opacity * Math.min(1, blinkAmount * 1.25);
    ctx.translate(pos.x, pos.y);
    ctx.rotate(headAngle);
    ctx.strokeStyle = eye.lineColor;
    ctx.lineWidth = Math.max(2.2, ry * 0.28);
    ctx.lineCap = 'round';

    const lidY = -ry * 0.65 + ry * 0.85 * blinkAmount;
    const curveDip = (blinkAmount - 0.35) * ry * 0.55;

    ctx.beginPath();
    ctx.moveTo(-rx * 0.92, lidY - curveDip * 0.25);
    ctx.quadraticCurveTo(0, lidY + curveDip, rx * 0.92, lidY - curveDip * 0.25);
    ctx.stroke();
    ctx.restore();
  };

  drawSingleEyeBlink(eyes.leftEye, -1);
  drawSingleEyeBlink(eyes.rightEye, 1);
}

export function renderDeformedMesh2D(
  ctx: CanvasRenderingContext2D,
  imageSource: CanvasImageSource,
  mesh: SkinnedMesh,
  deformedVerts: Float32Array,
  opacity = 1
): void {
  const { uvs, indices } = mesh;

  if (opacity < 0.995 && typeof document !== 'undefined') {
    const scratch = document.createElement('canvas');
    scratch.width = mesh.width + 160;
    scratch.height = mesh.height + 160;
    const sCtx = scratch.getContext('2d');
    if (sCtx) {
      const padOffset = 80;
      sCtx.translate(padOffset, padOffset);
      renderDeformedMesh2D(sCtx, imageSource, mesh, deformedVerts, 1);
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.drawImage(scratch, -padOffset, -padOffset);
      ctx.restore();
      return;
    }
  }

  ctx.save();
  ctx.globalAlpha = opacity;

  for (let t = 0; t < indices.length; t += 3) {
    const i0 = indices[t] * 2;
    const i1 = indices[t + 1] * 2;
    const i2 = indices[t + 2] * 2;

    const u0 = uvs[i0], v0 = uvs[i0 + 1];
    const u1 = uvs[i1], v1 = uvs[i1 + 1];
    const u2 = uvs[i2], v2 = uvs[i2 + 1];

    const x0 = deformedVerts[i0], y0 = deformedVerts[i0 + 1];
    const x1 = deformedVerts[i1], y1 = deformedVerts[i1 + 1];
    const x2 = deformedVerts[i2], y2 = deformedVerts[i2 + 1];

    const det = (u1 - u0) * (v2 - v0) - (u2 - u0) * (v1 - v0);
    if (Math.abs(det) < 1e-5) continue;

    const cx = (x0 + x1 + x2) / 3;
    const cy = (y0 + y1 + y2) / 3;
    const expand = (px: number, py: number) => {
      const dx = px - cx;
      const dy = py - cy;
      const len = Math.hypot(dx, dy) || 1;
      return [px + (dx / len) * 0.45, py + (dy / len) * 0.45];
    };
    const [ex0, ey0] = expand(x0, y0);
    const [ex1, ey1] = expand(x1, y1);
    const [ex2, ey2] = expand(x2, y2);

    const invDet = 1 / det;
    const a = ((x1 - x0) * (v2 - v0) - (x2 - x0) * (v1 - v0)) * invDet;
    const b = ((y1 - y0) * (v2 - v0) - (y2 - y0) * (v1 - v0)) * invDet;
    const c = ((u1 - u0) * (x2 - x0) - (u2 - u0) * (x1 - x0)) * invDet;
    const d = ((u1 - u0) * (y2 - y0) - (u2 - u0) * (y1 - y0)) * invDet;
    const e = x0 - a * u0 - c * v0;
    const f = y0 - b * u0 - d * v0;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(ex0, ey0);
    ctx.lineTo(ex1, ey1);
    ctx.lineTo(ex2, ey2);
    ctx.closePath();
    ctx.clip();
    ctx.transform(a, b, c, d, e, f);
    ctx.drawImage(imageSource, 0, 0);
    ctx.restore();
  }

  ctx.restore();
}
