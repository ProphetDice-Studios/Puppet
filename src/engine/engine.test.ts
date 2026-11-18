import test from 'node:test';
import assert from 'node:assert/strict';
import {
  autoDetectJointsFromAlpha,
  createRestPose,
  detectEyesFromHeadAlpha,
  evaluateForwardKinematics,
  hasOpaqueBackground,
  removeSolidBackgroundFromBorders,
} from './rigging';
import { buildSkinnedMesh, deformMeshVertices, transformHeadPoint2D } from './mesh';
import {
  dragJointToTarget,
  flipArmElbowBend,
  flipLegKneeBend,
  hitTestBodyPartJoint,
  solveTwoBoneLimbIK,
} from './ik';
import {
  evaluateAutoBlinkAtTime,
  insertQuickBlinkKeyframes,
  moveKeyframeTime,
  sampleTimelineAtTime,
  upsertKeyframeAtTime,
} from './timeline';

/**
 * Helper to rasterize a synthetic A-pose character into a pure RGBA pixel buffer
 * so unit tests run deterministically in Node without DOM/Canvas.
 */
function createSyntheticHumanoidRGBA(width = 256, height = 320, whiteBackground = false): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(width * height * 4);
  if (whiteBackground) {
    for (let i = 0; i < width * height; i++) {
      rgba[i * 4] = 255;
      rgba[i * 4 + 1] = 255;
      rgba[i * 4 + 2] = 255;
      rgba[i * 4 + 3] = 255;
    }
  }

  const setPixel = (x: number, y: number, r: number, g: number, b: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = (y * width + x) * 4;
    rgba[idx] = r;
    rgba[idx + 1] = g;
    rgba[idx + 2] = b;
    rgba[idx + 3] = 255;
  };

  const fillCircle = (cx: number, cy: number, rad: number, r = 40, g = 110, b = 220) => {
    for (let y = Math.floor(cy - rad); y <= Math.ceil(cy + rad); y++) {
      for (let x = Math.floor(cx - rad); x <= Math.ceil(cx + rad); x++) {
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= rad * rad) {
          setPixel(x, y, r, g, b);
        }
      }
    }
  };

  const fillCapsule = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    rad: number,
    r = 40,
    g = 110,
    b = 220
  ) => {
    const steps = Math.max(10, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      fillCircle(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, rad, r, g, b);
    }
  };

  // Head
  fillCircle(128, 52, 26, 240, 180, 140);
  // Neck
  fillCapsule(128, 74, 128, 92, 9, 240, 180, 140);
  // Torso
  fillCapsule(128, 98, 128, 175, 28, 45, 115, 235);
  // Left Arm (A-pose)
  fillCapsule(100, 104, 46, 152, 11, 45, 115, 235);
  // Right Arm (A-pose)
  fillCapsule(156, 104, 210, 152, 11, 45, 115, 235);
  // Left Leg
  fillCapsule(110, 180, 104, 286, 13, 30, 50, 90);
  // Right Leg
  fillCapsule(146, 180, 152, 286, 13, 30, 50, 90);

  return rgba;
}

test('autoDetectJointsFromAlpha places anatomical skeleton landmarks in proper order', () => {
  const rgba = createSyntheticHumanoidRGBA(256, 320, false);
  const joints = autoDetectJointsFromAlpha(rgba, 256, 320);

  // Vertical hierarchy: headTop < neck < chest < hip < knees < ankles < feet
  assert.ok(joints.headTop.y < joints.neck.y, 'headTop above neck');
  assert.ok(joints.neck.y < joints.chest.y, 'neck above chest');
  assert.ok(joints.chest.y < joints.hip.y, 'chest above hip');
  assert.ok(joints.hip.y < joints.leftKnee.y, 'hip above leftKnee');
  assert.ok(joints.leftKnee.y < joints.leftAnkle.y, 'leftKnee above leftAnkle');
  assert.ok(joints.leftAnkle.y < joints.leftFoot.y, 'leftAnkle above leftFoot');

  // Horizontal symmetry & extremity reach (Shoulder -> Elbow -> Wrist -> Hand)
  assert.ok(joints.leftHand.x < joints.leftWrist.x, 'leftHand left of leftWrist');
  assert.ok(joints.leftWrist.x < joints.leftElbow.x, 'leftWrist left of leftElbow');
  assert.ok(joints.leftElbow.x < joints.leftShoulder.x, 'leftElbow left of leftShoulder');
  assert.ok(joints.leftShoulder.x < joints.rightShoulder.x, 'leftShoulder left of rightShoulder');
  assert.ok(joints.rightShoulder.x < joints.rightElbow.x, 'rightElbow right of rightShoulder');
  assert.ok(joints.rightElbow.x < joints.rightWrist.x, 'rightWrist right of rightElbow');
  assert.ok(joints.rightWrist.x < joints.rightHand.x, 'rightHand right of rightWrist');
  assert.ok(joints.leftFoot.x < joints.rightFoot.x - 20, 'separated left and right feet detected');
});

test('removeSolidBackgroundFromBorders strips white background while keeping character opaque', () => {
  const opaqueRgba = createSyntheticHumanoidRGBA(256, 320, true);
  assert.equal(hasOpaqueBackground(opaqueRgba, 256, 320), true);

  const cleaned = removeSolidBackgroundFromBorders(opaqueRgba, 256, 320, 40);
  // Top-left corner becomes transparent
  assert.equal(cleaned[3], 0);
  // Center of chest (128, 135) stays fully opaque
  const chestIdx = (135 * 256 + 128) * 4 + 3;
  assert.equal(cleaned[chestIdx], 255);
});

test('rest pose FK and LBS mesh skinning preserve exact vertex identity', () => {
  const rgba = createSyntheticHumanoidRGBA(256, 320, false);
  const joints = autoDetectJointsFromAlpha(rgba, 256, 320);
  const mesh = buildSkinnedMesh(rgba, 256, 320, joints, 20, 24);

  assert.ok(mesh.indices.length > 60, 'generates silhouette triangles');

  const restPose = createRestPose();
  const fk = evaluateForwardKinematics(joints, restPose);
  const deformed = deformMeshVertices(mesh, fk);

  for (let i = 0; i < mesh.restVertices.length; i++) {
    assert.ok(
      Math.abs(deformed[i] - mesh.restVertices[i]) < 1e-4,
      `vertex coordinate ${i} matches rest position`
    );
  }
});

test('2-bone analytic IK moves wrist and ankle accurately to reachable targets', () => {
  const rgba = createSyntheticHumanoidRGBA(256, 320, false);
  const joints = autoDetectJointsFromAlpha(rgba, 256, 320);
  const startPose = createRestPose();

  const targetWrist = { x: joints.rightShoulder.x + 28, y: joints.rightShoulder.y - 22 };
  const solved = solveTwoBoneLimbIK(
    joints,
    startPose,
    'rightUpperArm',
    'rightLowerArm',
    'rightShoulder',
    'rightElbow',
    'rightWrist',
    'spine',
    targetWrist
  );

  const fk = evaluateForwardKinematics(joints, solved);
  const err = Math.hypot(fk.joints.rightWrist.x - targetWrist.x, fk.joints.rightWrist.y - targetWrist.y);
  assert.ok(err < 1.5, `IK wrist error (${err.toFixed(3)}px) should be < 1.5px`);
});

test('direct mesh body-part hit-testing maps hand, wrist, foot, ankle, and torso pixels to intuitive joints', () => {
  const rgba = createSyntheticHumanoidRGBA(256, 320, false);
  const joints = autoDetectJointsFromAlpha(rgba, 256, 320);
  const mesh = buildSkinnedMesh(rgba, 256, 320, joints, 24, 28);
  const restPose = createRestPose();
  const fk = evaluateForwardKinematics(joints, restPose);
  const deformed = deformMeshVertices(mesh, fk);

  const hitHand = hitTestBodyPartJoint(joints.rightHand, mesh, deformed);
  assert.equal(hitHand, 'rightHand');

  const hitFoot = hitTestBodyPartJoint(joints.leftFoot, mesh, deformed);
  assert.equal(hitFoot, 'leftFoot');

  // Dragging hip translates rootOffset
  const movedPose = dragJointToTarget(
    joints,
    restPose,
    restPose,
    'hip',
    { x: 150, y: 140 },
    { x: 128, y: 170 }
  );
  assert.equal(movedPose.rootOffset.x, 22);
  assert.equal(movedPose.rootOffset.y, -30);
});

test('timeline keyframe upsert, re-timing, and interpolation behave deterministically', () => {
  const p0 = createRestPose();
  const p1 = createRestPose();
  p1.rootOffset = { x: 40, y: -20 };
  p1.boneAngles.rightUpperArm = -1.2;

  let res = upsertKeyframeAtTime([], 0, p0, { label: 'Start', easing: 'linear' });
  res = upsertKeyframeAtTime(res.keyframes, 1.0, p1, { label: 'End', easing: 'linear' });

  assert.equal(res.keyframes.length, 2);

  const mid = sampleTimelineAtTime(res.keyframes, 0.5, 2.0, false);
  assert.ok(Math.abs(mid.rootOffset.x - 20) < 1e-4);
  assert.ok(Math.abs(mid.rootOffset.y - -10) < 1e-4);
  assert.ok(Math.abs(mid.boneAngles.rightUpperArm - -0.6) < 1e-4);

  // Drag second keyframe to 1.5s
  const moved = moveKeyframeTime(res.keyframes, res.activeId, 1.5, 2.0);
  assert.equal(moved[1].time, 1.5);
});

test('2D Dual-Quaternion skinning with Laplacian smoothing prevents triangle edge spikes on 95-deg bends', () => {
  const rgba = createSyntheticHumanoidRGBA(256, 320, false);
  const joints = autoDetectJointsFromAlpha(rgba, 256, 320);
  const mesh = buildSkinnedMesh(rgba, 256, 320, joints, 18, 22);

  const wavePose = createRestPose();
  wavePose.boneAngles.rightUpperArm = -1.65;
  wavePose.boneAngles.rightLowerArm = -0.65;
  wavePose.boneAngles.rightHandBone = -0.45;
  wavePose.boneAngles.head = 0.45;

  const fk = evaluateForwardKinematics(joints, wavePose);
  const deformed = deformMeshVertices(mesh, fk);

  // Check every triangle edge stretch ratio stays smooth (no stray spike edges > 3.0x rest length)
  let maxStretchRatio = 0;
  for (let t = 0; t < mesh.indices.length; t += 3) {
    const tri = [mesh.indices[t], mesh.indices[t + 1], mesh.indices[t + 2]];
    for (let e = 0; e < 3; e++) {
      const a = tri[e];
      const b = tri[(e + 1) % 3];
      const restLen = Math.hypot(
        mesh.restVertices[a * 2] - mesh.restVertices[b * 2],
        mesh.restVertices[a * 2 + 1] - mesh.restVertices[b * 2 + 1]
      );
      const defLen = Math.hypot(
        deformed[a * 2] - deformed[b * 2],
        deformed[a * 2 + 1] - deformed[b * 2 + 1]
      );
      if (restLen > 1) {
        maxStretchRatio = Math.max(maxStretchRatio, defLen / restLen);
      }
    }
  }
  assert.ok(
    maxStretchRatio < 3.0,
    `Expected smooth bounded triangle edge stretch (<3.0x), got ${maxStretchRatio.toFixed(2)}x`
  );
});

test('2.5D head turning shifts face landmarks and eye positions while blinking interpolates cleanly', () => {
  const rgba = createSyntheticHumanoidRGBA(256, 320, false);
  const joints = autoDetectJointsFromAlpha(rgba, 256, 320);
  const eyes = detectEyesFromHeadAlpha(rgba, 256, 320, joints);

  assert.ok(eyes.leftEye.center.x < eyes.rightEye.center.x, 'left eye is left of right eye');
  assert.ok(eyes.leftEye.center.y < joints.neck.y, 'eyes are above neck');

  const restPose = createRestPose();
  const turnedPose = createRestPose();
  turnedPose.headTurnX = 0.8;
  turnedPose.headTurnY = -0.3;
  turnedPose.blink = 1.0;

  const fkRest = evaluateForwardKinematics(joints, restPose);
  const fkTurned = evaluateForwardKinematics(joints, turnedPose);

  const restLeftEyePt = transformHeadPoint2D(eyes.leftEye.center, fkRest);
  const turnedLeftEyePt = transformHeadPoint2D(eyes.leftEye.center, fkTurned);

  assert.ok(turnedLeftEyePt.x > restLeftEyePt.x + 2, 'turning head right shifts left eye right');
  assert.ok(turnedLeftEyePt.y < restLeftEyePt.y - 1, 'pitching head up shifts left eye upward');

  // Verify quick blink stamp inserts open -> closed -> open sequence
  const blinkStamp = insertQuickBlinkKeyframes([], 0.5, 2.0, restPose);
  assert.equal(blinkStamp.keyframes.length, 3);
  const midBlink = sampleTimelineAtTime(blinkStamp.keyframes, 0.5, 2.0, false);
  assert.equal(midBlink.blink, 1);

  // Verify auto-blink envelope peaks during blink window
  assert.ok(evaluateAutoBlinkAtTime(0.83, true) > 0.7, 'auto-blink triggers during blink window');
  assert.equal(evaluateAutoBlinkAtTime(0.83, false), 0, 'auto-blink is 0 when disabled');
});

test('better torso, arm, wrist, hand, ankle & foot controls', () => {
  const rgba = createSyntheticHumanoidRGBA(256, 320, false);
  const joints = autoDetectJointsFromAlpha(rgba, 256, 320);
  const restPose = createRestPose();

  // 1. Dragging chest with keepHeadLevel counter-balances neck & head
  const leanedPose = dragJointToTarget(
    joints,
    restPose,
    restPose,
    'chest',
    { x: joints.chest.x + 35, y: joints.chest.y },
    joints.chest,
    { keepHeadLevel: true }
  );
  assert.ok(leanedPose.boneAngles.spine > 0.1, 'spine bends right');
  assert.ok(leanedPose.boneAngles.head < -0.05, 'head counter-rotates to stay level');

  // 2. Dragging shoulder shrugs leftShoulderOffset independently
  const shruggedPose = dragJointToTarget(
    joints,
    restPose,
    restPose,
    'leftShoulder',
    { x: joints.leftShoulder.x, y: joints.leftShoulder.y - 14 },
    joints.leftShoulder
  );
  assert.equal(shruggedPose.leftShoulderOffset?.y, -14);

  // 3. Dragging rightHand locally rotates rightHandBone around rightWrist
  const rotatedHandPose = dragJointToTarget(
    joints,
    restPose,
    restPose,
    'rightHand',
    { x: joints.rightWrist.x, y: joints.rightWrist.y - 15 },
    joints.rightHand
  );
  assert.ok(Math.abs(rotatedHandPose.boneAngles.rightHandBone) > 0.25, 'hand bone rotates around wrist');

  // 4. Dragging leftFoot locally flexes leftFootBone around leftAnkle
  const flexedFootPose = dragJointToTarget(
    joints,
    restPose,
    restPose,
    'leftFoot',
    { x: joints.leftAnkle.x - 16, y: joints.leftAnkle.y },
    joints.leftFoot
  );
  assert.ok(Math.abs(flexedFootPose.boneAngles.leftFootBone) > 0.2, 'foot bone flexes around ankle');

  // 5. Flipping right elbow and right knee poles
  const bentArm = solveTwoBoneLimbIK(
    joints,
    restPose,
    'rightUpperArm',
    'rightLowerArm',
    'rightShoulder',
    'rightElbow',
    'rightWrist',
    'spine',
    { x: joints.rightShoulder.x + 24, y: joints.rightShoulder.y - 14 },
    1
  );
  const flippedArm = flipArmElbowBend(joints, bentArm, 'right');
  assert.equal(flippedArm.rightElbowBend, -1);

  const bentLeg = solveTwoBoneLimbIK(
    joints,
    restPose,
    'rightThigh',
    'rightShin',
    'rightHip',
    'rightKnee',
    'rightAnkle',
    'pelvis',
    { x: joints.rightHip.x + 15, y: joints.rightHip.y + 45 },
    -1
  );
  const flippedLeg = flipLegKneeBend(joints, bentLeg, 'right');
  assert.equal(flippedLeg.rightKneeBend, 1);
});



