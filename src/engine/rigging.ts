import {
  BoneDefinition,
  CharacterEyeRig,
  DeformBoneId,
  EyeLandmark,
  JointId,
  PoseState,
  PosedSkeleton,
  RestJoints,
  Vec2,
} from './types';

export const BONE_ORDER: DeformBoneId[] = [
  'pelvis',
  'spine',
  'neck',
  'head',
  'leftUpperArm',
  'leftLowerArm',
  'leftHandBone',
  'rightUpperArm',
  'rightLowerArm',
  'rightHandBone',
  'leftThigh',
  'leftShin',
  'leftFootBone',
  'rightThigh',
  'rightShin',
  'rightFootBone',
];

export const BONE_DEFINITIONS: Record<DeformBoneId, BoneDefinition> = {
  pelvis: {
    id: 'pelvis',
    label: 'Pelvis / Root',
    startJoint: 'leftHip',
    endJoint: 'rightHip',
    parentBone: null,
  },
  spine: {
    id: 'spine',
    label: 'Torso / Spine',
    startJoint: 'hip',
    endJoint: 'chest',
    parentBone: 'pelvis',
  },
  neck: {
    id: 'neck',
    label: 'Neck',
    startJoint: 'chest',
    endJoint: 'neck',
    parentBone: 'spine',
  },
  head: {
    id: 'head',
    label: 'Head',
    startJoint: 'neck',
    endJoint: 'headTop',
    parentBone: 'neck',
  },
  leftUpperArm: {
    id: 'leftUpperArm',
    label: 'Left Upper Arm',
    startJoint: 'leftShoulder',
    endJoint: 'leftElbow',
    parentBone: 'spine',
  },
  leftLowerArm: {
    id: 'leftLowerArm',
    label: 'Left Forearm',
    startJoint: 'leftElbow',
    endJoint: 'leftWrist',
    parentBone: 'leftUpperArm',
  },
  leftHandBone: {
    id: 'leftHandBone',
    label: 'Left Wrist & Hand',
    startJoint: 'leftWrist',
    endJoint: 'leftHand',
    parentBone: 'leftLowerArm',
  },
  rightUpperArm: {
    id: 'rightUpperArm',
    label: 'Right Upper Arm',
    startJoint: 'rightShoulder',
    endJoint: 'rightElbow',
    parentBone: 'spine',
  },
  rightLowerArm: {
    id: 'rightLowerArm',
    label: 'Right Forearm',
    startJoint: 'rightElbow',
    endJoint: 'rightWrist',
    parentBone: 'rightUpperArm',
  },
  rightHandBone: {
    id: 'rightHandBone',
    label: 'Right Wrist & Hand',
    startJoint: 'rightWrist',
    endJoint: 'rightHand',
    parentBone: 'rightLowerArm',
  },
  leftThigh: {
    id: 'leftThigh',
    label: 'Left Thigh',
    startJoint: 'leftHip',
    endJoint: 'leftKnee',
    parentBone: 'pelvis',
  },
  leftShin: {
    id: 'leftShin',
    label: 'Left Shin',
    startJoint: 'leftKnee',
    endJoint: 'leftAnkle',
    parentBone: 'leftThigh',
  },
  leftFootBone: {
    id: 'leftFootBone',
    label: 'Left Ankle & Foot',
    startJoint: 'leftAnkle',
    endJoint: 'leftFoot',
    parentBone: 'leftShin',
  },
  rightThigh: {
    id: 'rightThigh',
    label: 'Right Thigh',
    startJoint: 'rightHip',
    endJoint: 'rightKnee',
    parentBone: 'pelvis',
  },
  rightShin: {
    id: 'rightShin',
    label: 'Right Shin',
    startJoint: 'rightKnee',
    endJoint: 'rightAnkle',
    parentBone: 'rightThigh',
  },
  rightFootBone: {
    id: 'rightFootBone',
    label: 'Right Ankle & Foot',
    startJoint: 'rightAnkle',
    endJoint: 'rightFoot',
    parentBone: 'rightShin',
  },
};

export function createRestPose(): PoseState {
  return {
    rootOffset: { x: 0, y: 0 },
    rootRotation: 0,
    boneAngles: {
      pelvis: 0,
      spine: 0,
      neck: 0,
      head: 0,
      leftUpperArm: 0,
      leftLowerArm: 0,
      leftHandBone: 0,
      rightUpperArm: 0,
      rightLowerArm: 0,
      rightHandBone: 0,
      leftThigh: 0,
      leftShin: 0,
      leftFootBone: 0,
      rightThigh: 0,
      rightShin: 0,
      rightFootBone: 0,
    },
    headTurnX: 0,
    headTurnY: 0,
    blink: 0,
    leftShoulderOffset: { x: 0, y: 0 },
    rightShoulderOffset: { x: 0, y: 0 },
    torsoTwist: 0,
    torsoSquash: 0,
    leftElbowBend: -1,
    rightElbowBend: 1,
    leftKneeBend: 1,
    rightKneeBend: -1,
  };
}

export function clonePose(pose: PoseState): PoseState {
  return {
    rootOffset: { x: pose.rootOffset.x, y: pose.rootOffset.y },
    rootRotation: pose.rootRotation,
    boneAngles: {
      pelvis: pose.boneAngles.pelvis || 0,
      spine: pose.boneAngles.spine || 0,
      neck: pose.boneAngles.neck || 0,
      head: pose.boneAngles.head || 0,
      leftUpperArm: pose.boneAngles.leftUpperArm || 0,
      leftLowerArm: pose.boneAngles.leftLowerArm || 0,
      leftHandBone: pose.boneAngles.leftHandBone || 0,
      rightUpperArm: pose.boneAngles.rightUpperArm || 0,
      rightLowerArm: pose.boneAngles.rightLowerArm || 0,
      rightHandBone: pose.boneAngles.rightHandBone || 0,
      leftThigh: pose.boneAngles.leftThigh || 0,
      leftShin: pose.boneAngles.leftShin || 0,
      leftFootBone: pose.boneAngles.leftFootBone || 0,
      rightThigh: pose.boneAngles.rightThigh || 0,
      rightShin: pose.boneAngles.rightShin || 0,
      rightFootBone: pose.boneAngles.rightFootBone || 0,
    },
    headTurnX: pose.headTurnX ?? 0,
    headTurnY: pose.headTurnY ?? 0,
    blink: pose.blink ?? 0,
    leftShoulderOffset: pose.leftShoulderOffset
      ? { x: pose.leftShoulderOffset.x, y: pose.leftShoulderOffset.y }
      : { x: 0, y: 0 },
    rightShoulderOffset: pose.rightShoulderOffset
      ? { x: pose.rightShoulderOffset.x, y: pose.rightShoulderOffset.y }
      : { x: 0, y: 0 },
    torsoTwist: pose.torsoTwist ?? 0,
    torsoSquash: pose.torsoSquash ?? 0,
    leftElbowBend: pose.leftElbowBend ?? -1,
    rightElbowBend: pose.rightElbowBend ?? 1,
    leftKneeBend: pose.leftKneeBend ?? 1,
    rightKneeBend: pose.rightKneeBend ?? -1,
  };
}

function rotateVec(v: Vec2, angle: number): Vec2 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return {
    x: v.x * c - v.y * s,
    y: v.x * s + v.y * c,
  };
}

function subVec(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function addVec(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

/**
 * Evaluates Forward Kinematics from RestJoints + PoseState.
 * Guaranteed exact identity when PoseState is all zeros.
 */
export function evaluateForwardKinematics(
  rest: RestJoints,
  pose: PoseState
): PosedSkeleton {
  const joints = {} as Record<JointId, Vec2>;

  const headTurnX = Math.max(-1, Math.min(1, pose.headTurnX ?? 0));
  const headTurnY = Math.max(-1, Math.min(1, pose.headTurnY ?? 0));
  const blink = Math.max(0, Math.min(1, pose.blink ?? 0));
  const torsoTwist = Math.max(-1, Math.min(1, pose.torsoTwist ?? 0));
  const torsoSquash = Math.max(-0.35, Math.min(0.35, pose.torsoSquash ?? 0));
  const lShoulderOff = pose.leftShoulderOffset ?? { x: 0, y: 0 };
  const rShoulderOff = pose.rightShoulderOffset ?? { x: 0, y: 0 };

  const pelvisDelta = pose.rootRotation + (pose.boneAngles.pelvis || 0);
  joints.hip = addVec(rest.hip, pose.rootOffset);

  // Pelvis rigid offsets from hip
  joints.leftHip = addVec(joints.hip, rotateVec(subVec(rest.leftHip, rest.hip), pelvisDelta));
  joints.rightHip = addVec(joints.hip, rotateVec(subVec(rest.rightHip, rest.hip), pelvisDelta));

  // Spine -> Chest (supports torsoSquash vertical stretch/compression & subtle torsoTwist shift)
  const spineDelta = pelvisDelta + (pose.boneAngles.spine || 0);
  const rawSpineVec = subVec(rest.chest, rest.hip);
  const squashedSpineVec: Vec2 =
    torsoSquash === 0 && torsoTwist === 0
      ? rawSpineVec
      : {
          x: rawSpineVec.x + torsoTwist * 6,
          y: rawSpineVec.y * (1 - torsoSquash * 0.45),
        };
  joints.chest = addVec(joints.hip, rotateVec(squashedSpineVec, spineDelta));

  // Neck & Head
  const neckDelta = spineDelta + (pose.boneAngles.neck || 0);
  const rawNeckVec = subVec(rest.neck, rest.chest);
  const squashedNeckVec: Vec2 =
    torsoSquash === 0
      ? rawNeckVec
      : {
          x: rawNeckVec.x,
          y: rawNeckVec.y * (1 - torsoSquash * 0.25),
        };
  joints.neck = addVec(joints.chest, rotateVec(squashedNeckVec, neckDelta));

  const headDelta = neckDelta + (pose.boneAngles.head || 0);
  const rawHeadVec = subVec(rest.headTop, rest.neck);
  const headLen = Math.hypot(rawHeadVec.x, rawHeadVec.y);
  const turnedHeadVec: Vec2 =
    headTurnX === 0 && headTurnY === 0
      ? rawHeadVec
      : {
          x: rawHeadVec.x + headTurnX * headLen * 0.16,
          y: rawHeadVec.y + headTurnY * headLen * 0.14,
        };
  joints.headTop = addVec(joints.neck, rotateVec(turnedHeadVec, headDelta));

  // Shoulders attach to chest with spineDelta + independent shoulder shrug/offset + 2.5D torsoTwist
  const shoulderSpan = Math.hypot(
    rest.rightShoulder.x - rest.leftShoulder.x,
    rest.rightShoulder.y - rest.leftShoulder.y
  );
  const twistCompress = Math.abs(torsoTwist) * 0.14;
  const twistShiftX = torsoTwist * shoulderSpan * 0.12;
  const squashExpandX = torsoSquash !== 0 ? 1 / (1 - torsoSquash * 0.35) - 1 : 0;

  const baseLeftShoulder = subVec(rest.leftShoulder, rest.chest);
  const effectiveLeftShoulderLocal: Vec2 =
    lShoulderOff.x === 0 && lShoulderOff.y === 0 && torsoTwist === 0 && torsoSquash === 0
      ? baseLeftShoulder
      : {
          x:
            baseLeftShoulder.x * (1 - twistCompress + squashExpandX) +
            twistShiftX +
            lShoulderOff.x,
          y: baseLeftShoulder.y + lShoulderOff.y,
        };

  const baseRightShoulder = subVec(rest.rightShoulder, rest.chest);
  const effectiveRightShoulderLocal: Vec2 =
    rShoulderOff.x === 0 && rShoulderOff.y === 0 && torsoTwist === 0 && torsoSquash === 0
      ? baseRightShoulder
      : {
          x:
            baseRightShoulder.x * (1 - twistCompress + squashExpandX) +
            twistShiftX +
            rShoulderOff.x,
          y: baseRightShoulder.y + rShoulderOff.y,
        };

  joints.leftShoulder = addVec(
    joints.chest,
    rotateVec(effectiveLeftShoulderLocal, spineDelta)
  );
  joints.rightShoulder = addVec(
    joints.chest,
    rotateVec(effectiveRightShoulderLocal, spineDelta)
  );

  // Left Arm + Wrist + Hand
  const lUpperDelta = spineDelta + (pose.boneAngles.leftUpperArm || 0);
  joints.leftElbow = addVec(
    joints.leftShoulder,
    rotateVec(subVec(rest.leftElbow, rest.leftShoulder), lUpperDelta)
  );
  const lLowerDelta = lUpperDelta + (pose.boneAngles.leftLowerArm || 0);
  joints.leftWrist = addVec(
    joints.leftElbow,
    rotateVec(subVec(rest.leftWrist, rest.leftElbow), lLowerDelta)
  );
  const lHandDelta = lLowerDelta + (pose.boneAngles.leftHandBone || 0);
  joints.leftHand = addVec(
    joints.leftWrist,
    rotateVec(subVec(rest.leftHand, rest.leftWrist), lHandDelta)
  );

  // Right Arm + Wrist + Hand
  const rUpperDelta = spineDelta + (pose.boneAngles.rightUpperArm || 0);
  joints.rightElbow = addVec(
    joints.rightShoulder,
    rotateVec(subVec(rest.rightElbow, rest.rightShoulder), rUpperDelta)
  );
  const rLowerDelta = rUpperDelta + (pose.boneAngles.rightLowerArm || 0);
  joints.rightWrist = addVec(
    joints.rightElbow,
    rotateVec(subVec(rest.rightWrist, rest.rightElbow), rLowerDelta)
  );
  const rHandDelta = rLowerDelta + (pose.boneAngles.rightHandBone || 0);
  joints.rightHand = addVec(
    joints.rightWrist,
    rotateVec(subVec(rest.rightHand, rest.rightWrist), rHandDelta)
  );

  // Left Leg + Ankle + Foot
  const lThighDelta = pelvisDelta + (pose.boneAngles.leftThigh || 0);
  joints.leftKnee = addVec(
    joints.leftHip,
    rotateVec(subVec(rest.leftKnee, rest.leftHip), lThighDelta)
  );
  const lShinDelta = lThighDelta + (pose.boneAngles.leftShin || 0);
  joints.leftAnkle = addVec(
    joints.leftKnee,
    rotateVec(subVec(rest.leftAnkle, rest.leftKnee), lShinDelta)
  );
  const lFootDelta = lShinDelta + (pose.boneAngles.leftFootBone || 0);
  joints.leftFoot = addVec(
    joints.leftAnkle,
    rotateVec(subVec(rest.leftFoot, rest.leftAnkle), lFootDelta)
  );

  // Right Leg + Ankle + Foot
  const rThighDelta = pelvisDelta + (pose.boneAngles.rightThigh || 0);
  joints.rightKnee = addVec(
    joints.rightHip,
    rotateVec(subVec(rest.rightKnee, rest.rightHip), rThighDelta)
  );
  const rShinDelta = rThighDelta + (pose.boneAngles.rightShin || 0);
  joints.rightAnkle = addVec(
    joints.rightKnee,
    rotateVec(subVec(rest.rightAnkle, rest.rightKnee), rShinDelta)
  );
  const rFootDelta = rShinDelta + (pose.boneAngles.rightFootBone || 0);
  joints.rightFoot = addVec(
    joints.rightAnkle,
    rotateVec(subVec(rest.rightFoot, rest.rightAnkle), rFootDelta)
  );

  const deltaMap: Record<DeformBoneId, number> = {
    pelvis: pelvisDelta,
    spine: spineDelta,
    neck: neckDelta,
    head: headDelta,
    leftUpperArm: lUpperDelta,
    leftLowerArm: lLowerDelta,
    leftHandBone: lHandDelta,
    rightUpperArm: rUpperDelta,
    rightLowerArm: rLowerDelta,
    rightHandBone: rHandDelta,
    leftThigh: lThighDelta,
    leftShin: lShinDelta,
    leftFootBone: lFootDelta,
    rightThigh: rThighDelta,
    rightShin: rShinDelta,
    rightFootBone: rFootDelta,
  };

  const boneTransforms = {} as PosedSkeleton['boneTransforms'];
  for (const id of BONE_ORDER) {
    const def = BONE_DEFINITIONS[id];
    boneTransforms[id] = {
      restStart: rest[def.startJoint],
      restEnd: rest[def.endJoint],
      posedStart: joints[def.startJoint],
      posedEnd: joints[def.endJoint],
      deltaAngle: deltaMap[id],
    };
  }

  return {
    joints,
    boneTransforms,
    poseParams: {
      headTurnX,
      headTurnY,
      blink,
      torsoTwist,
      torsoSquash,
    },
  };
}

/**
 * Detects if a PNG has a solid opaque background (corners opaque & uniform)
 * and removes it via flood-fill from image borders when requested.
 */
export function hasOpaqueBackground(
  rgba: Uint8ClampedArray,
  width: number,
  height: number
): boolean {
  const sampleCoords = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
    [Math.floor(width / 2), 0],
  ];
  let opaqueCorners = 0;
  for (const [x, y] of sampleCoords) {
    const idx = (y * width + x) * 4;
    if (rgba[idx + 3] > 240) opaqueCorners++;
  }
  return opaqueCorners >= 4;
}

export function removeSolidBackgroundFromBorders(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  tolerance = 42
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba);
  // Sample top-left & top-right average background color
  const c1 = 0;
  const c2 = (width - 1) * 4;
  const bgR = Math.round((rgba[c1] + rgba[c2]) * 0.5);
  const bgG = Math.round((rgba[c1 + 1] + rgba[c2 + 1]) * 0.5);
  const bgB = Math.round((rgba[c1 + 2] + rgba[c2 + 2]) * 0.5);

  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const colorDist = (idx: number) => {
    const dr = out[idx] - bgR;
    const dg = out[idx + 1] - bgG;
    const db = out[idx + 2] - bgB;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  };

  const tryEnqueue = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const p = y * width + x;
    if (visited[p]) return;
    visited[p] = 1;
    const idx = p * 4;
    const dist = colorDist(idx);
    if (dist <= tolerance) {
      out[idx + 3] = 0;
      queue[tail++] = p;
    } else if (dist <= tolerance * 1.45) {
      // Soft anti-aliased feather edge
      const ratio = (dist - tolerance) / (tolerance * 0.45);
      out[idx + 3] = Math.round(out[idx + 3] * Math.max(0, Math.min(1, ratio)));
    }
  };

  for (let x = 0; x < width; x++) {
    tryEnqueue(x, 0);
    tryEnqueue(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    tryEnqueue(0, y);
    tryEnqueue(width - 1, y);
  }

  while (head < tail) {
    const p = queue[head++];
    const x = p % width;
    const y = (p - x) / width;
    tryEnqueue(x + 1, y);
    tryEnqueue(x - 1, y);
    tryEnqueue(x, y + 1);
    tryEnqueue(x, y - 1);
  }

  return out;
}

interface HorizontalRun {
  start: number;
  end: number;
  center: number;
  width: number;
}

function getOpaqueRunsAtRow(
  rgba: Uint8ClampedArray,
  width: number,
  y: number,
  alphaThreshold = 25
): HorizontalRun[] {
  const runs: HorizontalRun[] = [];
  let inRun = false;
  let runStart = 0;
  const rowOffset = y * width * 4;

  for (let x = 0; x < width; x++) {
    const opaque = rgba[rowOffset + x * 4 + 3] > alphaThreshold;
    if (opaque && !inRun) {
      inRun = true;
      runStart = x;
    } else if (!opaque && inRun) {
      inRun = false;
      const end = x - 1;
      if (end - runStart >= 2) {
        runs.push({
          start: runStart,
          end,
          center: (runStart + end) * 0.5,
          width: end - runStart + 1,
        });
      }
    }
  }
  if (inRun && width - 1 - runStart >= 2) {
    runs.push({
      start: runStart,
      end: width - 1,
      center: (runStart + width - 1) * 0.5,
      width: width - runStart,
    });
  }
  return runs;
}

function snapInsideSilhouette(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  pt: Vec2,
  alphaThreshold = 25
): Vec2 {
  const cx = Math.max(0, Math.min(width - 1, Math.round(pt.x)));
  const cy = Math.max(0, Math.min(height - 1, Math.round(pt.y)));
  if (rgba[(cy * width + cx) * 4 + 3] > alphaThreshold) {
    return { x: cx, y: cy };
  }
  // Spiral search up to 36px radius to keep joint inside character pixels
  for (let r = 2; r <= 36; r += 2) {
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const sx = Math.round(cx + Math.cos(a) * r);
      const sy = Math.round(cy + Math.sin(a) * r);
      if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
        if (rgba[(sy * width + sx) * 4 + 3] > alphaThreshold) {
          return { x: sx, y: sy };
        }
      }
    }
  }
  return { x: cx, y: cy };
}

/**
 * Automatically analyzes a PNG's alpha silhouette to place a 16-joint humanoid rig.
 * Works across T-pose, A-pose, relaxed standing characters, chibi mascots, and creatures.
 */
export function autoDetectJointsFromAlpha(
  rgba: Uint8ClampedArray,
  width: number,
  height: number
): RestJoints {
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;
  let opaqueCount = 0;
  let sumX = 0;

  for (let y = 0; y < height; y++) {
    const rowOff = y * width * 4;
    for (let x = 0; x < width; x++) {
      if (rgba[rowOff + x * 4 + 3] > 25) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        sumX += x;
        opaqueCount++;
      }
    }
  }

  // Fallback if image is nearly empty
  if (opaqueCount < 20 || maxX <= minX || maxY <= minY) {
    minX = width * 0.25;
    maxX = width * 0.75;
    minY = height * 0.1;
    maxY = height * 0.9;
    sumX = (width * 0.5) * 100;
    opaqueCount = 100;
  }

  const charW = maxX - minX;
  const charH = maxY - minY;
  const centroidX = sumX / opaqueCount;

  const rowCenterNear = (yNorm: number, fallbackX: number): { center: number; span: number; runs: HorizontalRun[] } => {
    const y = Math.max(0, Math.min(height - 1, Math.round(minY + charH * yNorm)));
    const runs = getOpaqueRunsAtRow(rgba, width, y);
    if (runs.length === 0) {
      return { center: fallbackX, span: charW * 0.35, runs: [] };
    }
    // Central mass run closest to fallbackX
    let best = runs[0];
    let bestScore = Math.abs(best.center - fallbackX) - best.width * 0.35;
    for (const r of runs) {
      const score = Math.abs(r.center - fallbackX) - r.width * 0.35;
      if (score < bestScore) {
        best = r;
        bestScore = score;
      }
    }
    return { center: best.center, span: best.width, runs };
  };

  // 1. Find Neck pinch between 16% and 31% of character height
  let neckYNorm = 0.23;
  let minNeckSpan = Infinity;
  for (let yn = 0.16; yn <= 0.31; yn += 0.015) {
    const info = rowCenterNear(yn, centroidX);
    if (info.span > charW * 0.05 && info.span < minNeckSpan) {
      minNeckSpan = info.span;
      neckYNorm = yn;
    }
  }

  const neckInfo = rowCenterNear(neckYNorm, centroidX);
  const headMidInfo = rowCenterNear(neckYNorm * 0.55, neckInfo.center);
  const chestYNorm = Math.min(0.38, neckYNorm + 0.11);
  const chestInfo = rowCenterNear(chestYNorm, neckInfo.center);
  const hipYNorm = 0.54;
  const hipInfo = rowCenterNear(hipYNorm, centroidX);

  // Scan upward along central head column so two-eared/horned silhouettes stay centered
  const headCenterX = Math.max(0, Math.min(width - 1, Math.round(headMidInfo.center)));
  let skullTopY = Math.round(minY + charH * 0.08);
  for (let y = Math.round(minY); y <= Math.round(minY + charH * neckYNorm); y++) {
    if (rgba[(y * width + headCenterX) * 4 + 3] > 25) {
      skullTopY = Math.min(Math.round(minY + charH * (neckYNorm - 0.05)), y + 8);
      break;
    }
  }

  const headTop: Vec2 = snapInsideSilhouette(rgba, width, height, {
    x: headCenterX,
    y: skullTopY,
  });
  const neck: Vec2 = snapInsideSilhouette(rgba, width, height, {
    x: neckInfo.center,
    y: minY + charH * neckYNorm,
  });
  const chest: Vec2 = snapInsideSilhouette(rgba, width, height, {
    x: chestInfo.center,
    y: minY + charH * chestYNorm,
  });
  const hip: Vec2 = snapInsideSilhouette(rgba, width, height, {
    x: hipInfo.center,
    y: minY + charH * hipYNorm,
  });

  // 2. Detect Left & Right Hand extremities in upper/mid band [18% .. 62%]
  let leftExtremity: Vec2 = { x: chest.x - charW * 0.38, y: minY + charH * 0.46 };
  let rightExtremity: Vec2 = { x: chest.x + charW * 0.38, y: minY + charH * 0.46 };
  let minLeftX = Infinity;
  let maxRightX = -Infinity;

  const armBandStart = Math.max(0, Math.round(minY + charH * 0.18));
  const armBandEnd = Math.min(height - 1, Math.round(minY + charH * 0.62));
  for (let y = armBandStart; y <= armBandEnd; y += 2) {
    const runs = getOpaqueRunsAtRow(rgba, width, y);
    if (runs.length === 0) continue;
    const first = runs[0];
    const last = runs[runs.length - 1];
    if (first.start < minLeftX) {
      minLeftX = first.start;
      leftExtremity = { x: first.start + Math.min(10, first.width * 0.25), y };
    }
    if (last.end > maxRightX) {
      maxRightX = last.end;
      rightExtremity = { x: last.end - Math.min(10, last.width * 0.25), y };
    }
  }

  const torsoHalfW = Math.max(charW * 0.11, Math.min(chestInfo.span * 0.36, charW * 0.22));
  const shoulderY = minY + charH * (neckYNorm + 0.065);

  const leftShoulder = snapInsideSilhouette(rgba, width, height, {
    x: chest.x - torsoHalfW,
    y: shoulderY,
  });
  const rightShoulder = snapInsideSilhouette(rgba, width, height, {
    x: chest.x + torsoHalfW,
    y: shoulderY,
  });

  const leftHand = snapInsideSilhouette(rgba, width, height, leftExtremity);
  const rightHand = snapInsideSilhouette(rgba, width, height, rightExtremity);

  // Place wrists at ~72% along the arm span (right at the sleeve cuff / wrist joint before the hand)
  const leftWrist = snapInsideSilhouette(rgba, width, height, {
    x: leftShoulder.x + (leftHand.x - leftShoulder.x) * 0.72,
    y: leftShoulder.y + (leftHand.y - leftShoulder.y) * 0.72,
  });
  const rightWrist = snapInsideSilhouette(rgba, width, height, {
    x: rightShoulder.x + (rightHand.x - rightShoulder.x) * 0.72,
    y: rightShoulder.y + (rightHand.y - rightShoulder.y) * 0.72,
  });

  // Place elbows midway between shoulder and wrist with slight anatomical downward curve
  const leftElbow = snapInsideSilhouette(rgba, width, height, {
    x: (leftShoulder.x + leftWrist.x) * 0.5,
    y: (leftShoulder.y + leftWrist.y) * 0.5 + charH * 0.015,
  });
  const rightElbow = snapInsideSilhouette(rgba, width, height, {
    x: (rightShoulder.x + rightWrist.x) * 0.5,
    y: (rightShoulder.y + rightWrist.y) * 0.5 + charH * 0.015,
  });

  // 3. Detect Legs (Hips, Knees, Ankles, Feet)
  const pelvisHalfW = Math.max(charW * 0.08, Math.min(hipInfo.span * 0.28, charW * 0.16));
  const hipJointY = minY + charH * 0.56;
  const leftHip = snapInsideSilhouette(rgba, width, height, {
    x: hip.x - pelvisHalfW,
    y: hipJointY,
  });
  const rightHip = snapInsideSilhouette(rgba, width, height, {
    x: hip.x + pelvisHalfW,
    y: hipJointY,
  });

  // Check lower silhouette runs for separated legs at knee (~72%), ankle (~87.5%), and foot/toe (~95.5%)
  const kneeY = Math.round(minY + charH * 0.72);
  const ankleY = Math.round(minY + charH * 0.875);
  const footY = Math.round(minY + charH * 0.955);

  const kneeRuns = getOpaqueRunsAtRow(rgba, width, Math.min(height - 1, kneeY)).filter(
    (r) => r.width >= Math.max(4, charW * 0.04)
  );
  const ankleRuns = getOpaqueRunsAtRow(rgba, width, Math.min(height - 1, ankleY)).filter(
    (r) => r.width >= Math.max(4, charW * 0.04)
  );
  const footRuns = getOpaqueRunsAtRow(rgba, width, Math.min(height - 1, footY)).filter(
    (r) => r.width >= Math.max(4, charW * 0.04)
  );

  let leftKneeRaw: Vec2;
  let rightKneeRaw: Vec2;
  if (kneeRuns.length >= 2) {
    leftKneeRaw = { x: kneeRuns[0].center, y: kneeY };
    rightKneeRaw = { x: kneeRuns[kneeRuns.length - 1].center, y: kneeY };
  } else if (kneeRuns.length === 1) {
    const r = kneeRuns[0];
    leftKneeRaw = { x: r.start + r.width * 0.3, y: kneeY };
    rightKneeRaw = { x: r.start + r.width * 0.7, y: kneeY };
  } else {
    leftKneeRaw = { x: leftHip.x, y: kneeY };
    rightKneeRaw = { x: rightHip.x, y: kneeY };
  }

  let leftAnkleRaw: Vec2;
  let rightAnkleRaw: Vec2;
  if (ankleRuns.length >= 2) {
    leftAnkleRaw = { x: ankleRuns[0].center, y: ankleY };
    rightAnkleRaw = { x: ankleRuns[ankleRuns.length - 1].center, y: ankleY };
  } else if (ankleRuns.length === 1) {
    const r = ankleRuns[0];
    leftAnkleRaw = { x: r.start + r.width * 0.3, y: ankleY };
    rightAnkleRaw = { x: r.start + r.width * 0.7, y: ankleY };
  } else {
    leftAnkleRaw = { x: leftKneeRaw.x, y: ankleY };
    rightAnkleRaw = { x: rightKneeRaw.x, y: ankleY };
  }

  const toeOutShift = Math.max(6, charW * 0.025);
  let leftFootRaw: Vec2;
  let rightFootRaw: Vec2;
  if (footRuns.length >= 2) {
    leftFootRaw = { x: footRuns[0].center - toeOutShift, y: footY };
    rightFootRaw = { x: footRuns[footRuns.length - 1].center + toeOutShift, y: footY };
  } else if (footRuns.length === 1) {
    const r = footRuns[0];
    leftFootRaw = { x: r.start + r.width * 0.26, y: footY };
    rightFootRaw = { x: r.start + r.width * 0.74, y: footY };
  } else {
    leftFootRaw = { x: leftAnkleRaw.x - toeOutShift, y: footY };
    rightFootRaw = { x: rightAnkleRaw.x + toeOutShift, y: footY };
  }

  const leftKnee = snapInsideSilhouette(rgba, width, height, leftKneeRaw);
  const rightKnee = snapInsideSilhouette(rgba, width, height, rightKneeRaw);
  const leftAnkle = snapInsideSilhouette(rgba, width, height, leftAnkleRaw);
  const rightAnkle = snapInsideSilhouette(rgba, width, height, rightAnkleRaw);
  const leftFoot = snapInsideSilhouette(rgba, width, height, leftFootRaw);
  const rightFoot = snapInsideSilhouette(rgba, width, height, rightFootRaw);

  return {
    hip,
    chest,
    neck,
    headTop,
    leftShoulder,
    leftElbow,
    leftWrist,
    leftHand,
    rightShoulder,
    rightElbow,
    rightWrist,
    rightHand,
    leftHip,
    leftKnee,
    leftAnkle,
    leftFoot,
    rightHip,
    rightKnee,
    rightAnkle,
    rightFoot,
  };
}

/**
 * Automatically locates left and right eye landmarks and samples the surrounding eyelid/face palette
 * from the head silhouette between neck and headTop.
 */
export function detectEyesFromHeadAlpha(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  restJoints: RestJoints
): CharacterEyeRig {
  const { neck, headTop } = restJoints;
  const headCenterX = (neck.x + headTop.x) * 0.5;
  const headSpanY = Math.max(24, Math.abs(neck.y - headTop.y));

  // Scan the head between headTop and neck to find the widest horizontal silhouette row
  // (ignores narrow top antennas/ears and locks onto the main cranium/face equator)
  const scanStartY = Math.max(0, Math.round(Math.min(headTop.y, neck.y) + headSpanY * 0.22));
  const scanEndY = Math.min(height - 1, Math.round(Math.max(headTop.y, neck.y) - headSpanY * 0.14));

  let widestY = Math.max(0, Math.min(height - 1, Math.round(neck.y - headSpanY * 0.42)));
  let headWidth = headSpanY * 1.1;
  let rowCenter = headCenterX;
  let maxFoundWidth = 0;

  for (let y = scanStartY; y <= scanEndY; y += 2) {
    const runs = getOpaqueRunsAtRow(rgba, width, y);
    for (const r of runs) {
      if (Math.abs(r.center - headCenterX) <= headSpanY * 0.65 && r.width > maxFoundWidth) {
        maxFoundWidth = r.width;
        widestY = y;
        headWidth = Math.max(28, r.width);
        rowCenter = r.center;
      }
    }
  }

  // Eyes sit just above the widest horizontal equator of the head
  const eyeRowY = Math.max(0, Math.min(height - 1, Math.round(widestY - headSpanY * 0.03)));

  const eyeOffsetX = Math.max(8, Math.min(headWidth * 0.185, 24));
  const leftCenter: Vec2 = { x: Math.round(rowCenter - eyeOffsetX), y: eyeRowY };
  const rightCenter: Vec2 = { x: Math.round(rowCenter + eyeOffsetX), y: eyeRowY };
  const radiusX = Math.max(7.5, Math.min(13, headWidth * 0.115));
  const radiusY = Math.max(8.5, Math.min(13, headSpanY * 0.15));

  const sampleDominantFaceColorNear = (pt: Vec2): { lidColor: string; lineColor: string } => {
    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let count = 0;

    // Sample above the eye and at the upper bridge of the face so cheek/pupil colors never muddy the eyelid
    const samplePoints: [number, number][] = [
      [Math.round(rowCenter), Math.round(eyeRowY - radiusY * 0.65)],
      [Math.round(rowCenter), Math.round(eyeRowY - radiusY * 1.15)],
      [Math.round(pt.x), Math.round(pt.y - radiusY * 1.25)],
      [Math.round((pt.x + rowCenter) * 0.5), Math.round(pt.y - radiusY * 0.9)],
    ];

    for (const [rawX, rawY] of samplePoints) {
      const sx = Math.max(0, Math.min(width - 1, rawX));
      const sy = Math.max(0, Math.min(height - 1, rawY));
      const idx = (sy * width + sx) * 4;
      if (rgba[idx + 3] > 140) {
        rSum += rgba[idx];
        gSum += rgba[idx + 1];
        bSum += rgba[idx + 2];
        count++;
      }
    }

    if (count === 0) {
      return { lidColor: '#e2e8f0', lineColor: '#0f172a' };
    }

    const r = Math.round(rSum / count);
    const g = Math.round(gSum / count);
    const b = Math.round(bSum / count);
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;

    // If inside a dark visor (e.g. Nova or Rook), use dark visor lid + glowing cyan lash arc
    if (luma < 52) {
      return {
        lidColor: `rgb(${r}, ${g}, ${b})`,
        lineColor: '#38bdf8',
      };
    }

    return {
      lidColor: `rgb(${r}, ${g}, ${b})`,
      lineColor: '#0f172a',
    };
  };

  const leftColors = sampleDominantFaceColorNear(leftCenter);
  const rightColors = sampleDominantFaceColorNear(rightCenter);

  const leftEye: EyeLandmark = {
    center: leftCenter,
    radiusX,
    radiusY,
    lidColor: leftColors.lidColor,
    lineColor: leftColors.lineColor,
  };
  const rightEye: EyeLandmark = {
    center: rightCenter,
    radiusX,
    radiusY,
    lidColor: rightColors.lidColor,
    lineColor: rightColors.lineColor,
  };

  return { leftEye, rightEye };
}

