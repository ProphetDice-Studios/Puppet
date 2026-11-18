import { BONE_ORDER, clonePose, evaluateForwardKinematics } from './rigging';
import { DeformBoneId, JointId, PoseState, RestJoints, SkinnedMesh, Vec2 } from './types';

export function normalizeAngle(rad: number): number {
  let a = rad;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function angleOf(from: Vec2, to: Vec2): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

/**
 * Analytic 2-bone Inverse Kinematics solver.
 * Moves endJoint (e.g. Wrist or Ankle) toward target while naturally bending midJoint (Elbow or Knee).
 */
export function solveTwoBoneLimbIK(
  rest: RestJoints,
  currentPose: PoseState,
  upperBone: DeformBoneId,
  lowerBone: DeformBoneId,
  rootJoint: JointId,
  midJoint: JointId,
  endJoint: JointId,
  parentBone: 'spine' | 'pelvis',
  target: Vec2,
  preferredBendSign?: 1 | -1
): PoseState {
  const nextPose = clonePose(currentPose);
  const fk = evaluateForwardKinematics(rest, nextPose);

  const S = fk.joints[rootJoint];
  const MCurrent = fk.joints[midJoint];
  const ECurrent = fk.joints[endJoint];

  const L1 = Math.hypot(rest[midJoint].x - rest[rootJoint].x, rest[midJoint].y - rest[rootJoint].y);
  const L2 = Math.hypot(rest[endJoint].x - rest[midJoint].x, rest[endJoint].y - rest[midJoint].y);

  if (L1 < 1e-3 || L2 < 1e-3) return nextPose;

  const dx = target.x - S.x;
  const dy = target.y - S.y;
  const rawDist = Math.hypot(dx, dy);
  const minDist = Math.abs(L1 - L2) + 0.5;
  const maxDist = L1 + L2 - 0.5;
  const d = Math.max(minDist, Math.min(maxDist, Math.max(1, rawDist)));

  // Determine natural bend sign from explicit preferredBendSign, stored pose bend preference, or cross product
  let bendSign: 1 | -1 = preferredBendSign ?? 1;
  if (!preferredBendSign) {
    if (upperBone === 'leftUpperArm' && nextPose.leftElbowBend) {
      bendSign = nextPose.leftElbowBend;
    } else if (upperBone === 'rightUpperArm' && nextPose.rightElbowBend) {
      bendSign = nextPose.rightElbowBend;
    } else if (upperBone === 'leftThigh' && nextPose.leftKneeBend) {
      bendSign = nextPose.leftKneeBend;
    } else if (upperBone === 'rightThigh' && nextPose.rightKneeBend) {
      bendSign = nextPose.rightKneeBend;
    } else {
      const cross =
        (MCurrent.x - S.x) * (ECurrent.y - S.y) - (MCurrent.y - S.y) * (ECurrent.x - S.x);
      if (Math.abs(cross) > 2) {
        bendSign = cross >= 0 ? 1 : -1;
      } else {
        if (upperBone === 'leftUpperArm') bendSign = -1;
        else if (upperBone === 'rightUpperArm') bendSign = 1;
        else if (upperBone === 'leftThigh') bendSign = 1;
        else bendSign = -1;
      }
    }
  }

  const cosAlpha = Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)));
  const alpha = Math.acos(cosAlpha);
  const baseAngle = Math.atan2(dy, dx);

  const desiredUpperWorldAngle = baseAngle + bendSign * alpha;
  const desiredMid: Vec2 = {
    x: S.x + Math.cos(desiredUpperWorldAngle) * L1,
    y: S.y + Math.sin(desiredUpperWorldAngle) * L1,
  };
  const desiredLowerWorldAngle = Math.atan2(target.y - desiredMid.y, target.x - desiredMid.x);

  const restUpperAngle = angleOf(rest[rootJoint], rest[midJoint]);
  const restLowerAngle = angleOf(rest[midJoint], rest[endJoint]);

  const parentWorldDelta = fk.boneTransforms[parentBone].deltaAngle;
  const upperDelta = normalizeAngle(desiredUpperWorldAngle - restUpperAngle);
  const lowerDelta = normalizeAngle(desiredLowerWorldAngle - restLowerAngle);

  nextPose.boneAngles[upperBone] = normalizeAngle(upperDelta - parentWorldDelta);
  nextPose.boneAngles[lowerBone] = normalizeAngle(lowerDelta - upperDelta);

  return nextPose;
}

/**
 * Flips the elbow bend direction (pole vector) for the left or right arm while keeping the wrist/hand in place.
 */
export function flipArmElbowBend(
  rest: RestJoints,
  currentPose: PoseState,
  side: 'left' | 'right'
): PoseState {
  const next = clonePose(currentPose);
  const fk = evaluateForwardKinematics(rest, next);

  if (side === 'left') {
    const newBend: 1 | -1 = (next.leftElbowBend ?? -1) === -1 ? 1 : -1;
    next.leftElbowBend = newBend;
    const solved = solveTwoBoneLimbIK(
      rest,
      next,
      'leftUpperArm',
      'leftLowerArm',
      'leftShoulder',
      'leftElbow',
      'leftWrist',
      'spine',
      fk.joints.leftWrist,
      newBend
    );
    solved.leftElbowBend = newBend;
    if (Math.abs(solved.boneAngles.leftLowerArm) < 0.25) {
      solved.boneAngles.leftLowerArm = newBend * -0.55;
      solved.boneAngles.leftUpperArm += newBend * 0.28;
    }
    return solved;
  } else {
    const newBend: 1 | -1 = (next.rightElbowBend ?? 1) === 1 ? -1 : 1;
    next.rightElbowBend = newBend;
    const solved = solveTwoBoneLimbIK(
      rest,
      next,
      'rightUpperArm',
      'rightLowerArm',
      'rightShoulder',
      'rightElbow',
      'rightWrist',
      'spine',
      fk.joints.rightWrist,
      newBend
    );
    solved.rightElbowBend = newBend;
    if (Math.abs(solved.boneAngles.rightLowerArm) < 0.25) {
      solved.boneAngles.rightLowerArm = newBend * -0.55;
      solved.boneAngles.rightUpperArm += newBend * 0.28;
    }
    return solved;
  }
}

/**
 * Flips the knee bend direction (pole vector) for the left or right leg while keeping the ankle/foot in place.
 */
export function flipLegKneeBend(
  rest: RestJoints,
  currentPose: PoseState,
  side: 'left' | 'right'
): PoseState {
  const next = clonePose(currentPose);
  const fk = evaluateForwardKinematics(rest, next);

  if (side === 'left') {
    const newBend: 1 | -1 = (next.leftKneeBend ?? 1) === 1 ? -1 : 1;
    next.leftKneeBend = newBend;
    const solved = solveTwoBoneLimbIK(
      rest,
      next,
      'leftThigh',
      'leftShin',
      'leftHip',
      'leftKnee',
      'leftAnkle',
      'pelvis',
      fk.joints.leftAnkle,
      newBend
    );
    solved.leftKneeBend = newBend;
    if (Math.abs(solved.boneAngles.leftShin) < 0.25) {
      solved.boneAngles.leftShin = newBend * -0.55;
      solved.boneAngles.leftThigh += newBend * 0.28;
    }
    return solved;
  } else {
    const newBend: 1 | -1 = (next.rightKneeBend ?? -1) === -1 ? 1 : -1;
    next.rightKneeBend = newBend;
    const solved = solveTwoBoneLimbIK(
      rest,
      next,
      'rightThigh',
      'rightShin',
      'rightHip',
      'rightKnee',
      'rightAnkle',
      'pelvis',
      fk.joints.rightAnkle,
      newBend
    );
    solved.rightKneeBend = newBend;
    if (Math.abs(solved.boneAngles.rightShin) < 0.25) {
      solved.boneAngles.rightShin = newBend * -0.55;
      solved.boneAngles.rightThigh += newBend * 0.28;
    }
    return solved;
  }
}

export interface DragJointOptions {
  keepHeadLevel?: boolean;
  enableClavicleFollow?: boolean;
}

/**
 * Solves IK and FK when dragging wrists, hands, ankles, feet, elbows, knees, shoulders, head, neck, chest, or hip.
 */
export function dragJointToTarget(
  rest: RestJoints,
  poseAtDragStart: PoseState,
  currentPose: PoseState,
  jointId: JointId,
  target: Vec2,
  dragStartPointer: Vec2,
  options?: DragJointOptions
): PoseState {
  // 1. WRISTS -> 2-Bone Arm IK (Shoulder -> Elbow -> Wrist) + subtle clavicle lift while preserving hand angle
  if (jointId === 'leftWrist') {
    const prePose = clonePose(currentPose);
    if (options?.enableClavicleFollow !== false) {
      const fkPre = evaluateForwardKinematics(rest, prePose);
      const liftY = Math.max(-14, Math.min(8, (target.y - fkPre.joints.chest.y) * 0.08));
      const reachX = Math.max(-10, Math.min(10, (target.x - fkPre.joints.leftShoulder.x) * 0.06));
      prePose.leftShoulderOffset = { x: reachX, y: liftY };
    }
    return solveTwoBoneLimbIK(
      rest,
      prePose,
      'leftUpperArm',
      'leftLowerArm',
      'leftShoulder',
      'leftElbow',
      'leftWrist',
      'spine',
      target,
      prePose.leftElbowBend ?? -1
    );
  }
  if (jointId === 'rightWrist') {
    const prePose = clonePose(currentPose);
    if (options?.enableClavicleFollow !== false) {
      const fkPre = evaluateForwardKinematics(rest, prePose);
      const liftY = Math.max(-14, Math.min(8, (target.y - fkPre.joints.chest.y) * 0.08));
      const reachX = Math.max(-10, Math.min(10, (target.x - fkPre.joints.rightShoulder.x) * 0.06));
      prePose.rightShoulderOffset = { x: reachX, y: liftY };
    }
    return solveTwoBoneLimbIK(
      rest,
      prePose,
      'rightUpperArm',
      'rightLowerArm',
      'rightShoulder',
      'rightElbow',
      'rightWrist',
      'spine',
      target,
      prePose.rightElbowBend ?? 1
    );
  }

  // 2. HANDS -> Rotate hand around wrist locally, OR pull wrist & arm via 2-bone IK if dragged further!
  if (jointId === 'leftHand' || jointId === 'rightHand') {
    const isLeft = jointId === 'leftHand';
    const wristId: JointId = isLeft ? 'leftWrist' : 'rightWrist';
    const handId: JointId = isLeft ? 'leftHand' : 'rightHand';
    const upperBone: DeformBoneId = isLeft ? 'leftUpperArm' : 'rightUpperArm';
    const lowerBone: DeformBoneId = isLeft ? 'leftLowerArm' : 'rightLowerArm';
    const handBone: DeformBoneId = isLeft ? 'leftHandBone' : 'rightHandBone';
    const shoulderId: JointId = isLeft ? 'leftShoulder' : 'rightShoulder';
    const elbowId: JointId = isLeft ? 'leftElbow' : 'rightElbow';

    let workingPose = clonePose(currentPose);
    let fkNow = evaluateForwardKinematics(rest, workingPose);
    const wristPos = fkNow.joints[wristId];
    const restHandLen = Math.max(
      12,
      Math.hypot(rest[handId].x - rest[wristId].x, rest[handId].y - rest[wristId].y)
    );
    const distFromWrist = Math.hypot(target.x - wristPos.x, target.y - wristPos.y);

    // If dragged beyond local wrist-rotation radius, pull the wrist along via 2-bone Arm IK
    if (distFromWrist > restHandLen * 1.45) {
      const dirX = (target.x - wristPos.x) / (distFromWrist || 1);
      const dirY = (target.y - wristPos.y) / (distFromWrist || 1);
      const wristTarget: Vec2 = {
        x: target.x - dirX * restHandLen,
        y: target.y - dirY * restHandLen,
      };
      if (options?.enableClavicleFollow !== false) {
        const liftY = Math.max(-14, Math.min(8, (wristTarget.y - fkNow.joints.chest.y) * 0.08));
        const reachX = Math.max(-10, Math.min(10, (wristTarget.x - fkNow.joints[shoulderId].x) * 0.06));
        if (isLeft) workingPose.leftShoulderOffset = { x: reachX, y: liftY };
        else workingPose.rightShoulderOffset = { x: reachX, y: liftY };
      }
      workingPose = solveTwoBoneLimbIK(
        rest,
        workingPose,
        upperBone,
        lowerBone,
        shoulderId,
        elbowId,
        wristId,
        'spine',
        wristTarget,
        isLeft ? (workingPose.leftElbowBend ?? -1) : (workingPose.rightElbowBend ?? 1)
      );
      fkNow = evaluateForwardKinematics(rest, workingPose);
    }

    // Aim the hand bone around the wrist toward the target
    const newWristPos = fkNow.joints[wristId];
    if (Math.hypot(target.x - newWristPos.x, target.y - newWristPos.y) > 2) {
      const restHandAngle = angleOf(rest[wristId], rest[handId]);
      const desiredHandWorldAngle = angleOf(newWristPos, target);
      const lowerArmWorldDelta = fkNow.boneTransforms[lowerBone].deltaAngle;
      const handLocal = normalizeAngle(desiredHandWorldAngle - restHandAngle - lowerArmWorldDelta);
      workingPose.boneAngles[handBone] = Math.max(-2.35, Math.min(2.35, handLocal));
    }

    return workingPose;
  }

  // 3. ANKLES -> 2-Bone Leg IK (Hip -> Knee -> Ankle) while preserving foot angle
  if (jointId === 'leftAnkle') {
    return solveTwoBoneLimbIK(
      rest,
      currentPose,
      'leftThigh',
      'leftShin',
      'leftHip',
      'leftKnee',
      'leftAnkle',
      'pelvis',
      target,
      currentPose.leftKneeBend ?? 1
    );
  }
  if (jointId === 'rightAnkle') {
    return solveTwoBoneLimbIK(
      rest,
      currentPose,
      'rightThigh',
      'rightShin',
      'rightHip',
      'rightKnee',
      'rightAnkle',
      'pelvis',
      target,
      currentPose.rightKneeBend ?? -1
    );
  }

  // 4. FEET -> Flex/pivot foot around ankle locally, OR pull ankle & leg via 2-bone IK if dragged further!
  if (jointId === 'leftFoot' || jointId === 'rightFoot') {
    const isLeft = jointId === 'leftFoot';
    const ankleId: JointId = isLeft ? 'leftAnkle' : 'rightAnkle';
    const footId: JointId = isLeft ? 'leftFoot' : 'rightFoot';
    const thighBone: DeformBoneId = isLeft ? 'leftThigh' : 'rightThigh';
    const shinBone: DeformBoneId = isLeft ? 'leftShin' : 'rightShin';
    const footBone: DeformBoneId = isLeft ? 'leftFootBone' : 'rightFootBone';
    const hipId: JointId = isLeft ? 'leftHip' : 'rightHip';
    const kneeId: JointId = isLeft ? 'leftKnee' : 'rightKnee';

    let workingPose = clonePose(currentPose);
    let fkNow = evaluateForwardKinematics(rest, workingPose);
    const anklePos = fkNow.joints[ankleId];
    const restFootLen = Math.max(
      14,
      Math.hypot(rest[footId].x - rest[ankleId].x, rest[footId].y - rest[ankleId].y)
    );
    const distFromAnkle = Math.hypot(target.x - anklePos.x, target.y - anklePos.y);

    // If dragged beyond local ankle-flex radius, pull the ankle along via 2-bone Leg IK
    if (distFromAnkle > restFootLen * 1.45) {
      const dirX = (target.x - anklePos.x) / (distFromAnkle || 1);
      const dirY = (target.y - anklePos.y) / (distFromAnkle || 1);
      const ankleTarget: Vec2 = {
        x: target.x - dirX * restFootLen,
        y: target.y - dirY * restFootLen,
      };
      workingPose = solveTwoBoneLimbIK(
        rest,
        workingPose,
        thighBone,
        shinBone,
        hipId,
        kneeId,
        ankleId,
        'pelvis',
        ankleTarget,
        isLeft ? (workingPose.leftKneeBend ?? 1) : (workingPose.rightKneeBend ?? -1)
      );
      fkNow = evaluateForwardKinematics(rest, workingPose);
    }

    // Aim the foot bone around the ankle toward the target
    const newAnklePos = fkNow.joints[ankleId];
    if (Math.hypot(target.x - newAnklePos.x, target.y - newAnklePos.y) > 2) {
      const restFootAngle = angleOf(rest[ankleId], rest[footId]);
      const desiredFootWorldAngle = angleOf(newAnklePos, target);
      const shinWorldDelta = fkNow.boneTransforms[shinBone].deltaAngle;
      const footLocal = normalizeAngle(desiredFootWorldAngle - restFootAngle - shinWorldDelta);
      workingPose.boneAngles[footBone] = Math.max(-2.1, Math.min(2.1, footLocal));
    }

    return workingPose;
  }

  const next = clonePose(currentPose);
  const fk = evaluateForwardKinematics(rest, next);

  // Root hip -> translates whole character
  if (jointId === 'hip') {
    next.rootOffset = {
      x: poseAtDragStart.rootOffset.x + (target.x - dragStartPointer.x),
      y: poseAtDragStart.rootOffset.y + (target.y - dragStartPointer.y),
    };
    return next;
  }

  // Pelvis side joints -> tilt whole character / pelvis
  if (jointId === 'leftHip' || jointId === 'rightHip') {
    const restAng = angleOf(rest.hip, rest[jointId]);
    const curAng = angleOf(fk.joints.hip, target);
    next.boneAngles.pelvis = normalizeAngle(curAng - restAng - next.rootRotation);
    return next;
  }

  // Independent Shoulder Shrug / Protraction when dragging leftShoulder or rightShoulder directly
  if (jointId === 'leftShoulder' || jointId === 'rightShoulder') {
    const spineDelta = fk.boneTransforms.spine.deltaAngle;
    const rawDx = target.x - dragStartPointer.x;
    const rawDy = target.y - dragStartPointer.y;
    const cosS = Math.cos(-spineDelta);
    const sinS = Math.sin(-spineDelta);
    const localDx = rawDx * cosS - rawDy * sinS;
    const localDy = rawDx * sinS + rawDy * cosS;

    if (jointId === 'leftShoulder') {
      const startOff = poseAtDragStart.leftShoulderOffset ?? { x: 0, y: 0 };
      next.leftShoulderOffset = {
        x: Math.max(-24, Math.min(24, startOff.x + localDx)),
        y: Math.max(-26, Math.min(22, startOff.y + localDy)),
      };
    } else {
      const startOff = poseAtDragStart.rightShoulderOffset ?? { x: 0, y: 0 };
      next.rightShoulderOffset = {
        x: Math.max(-24, Math.min(24, startOff.x + localDx)),
        y: Math.max(-26, Math.min(22, startOff.y + localDy)),
      };
    }
    return next;
  }

  // Chest -> rotate spine + optional head counter-balance so head stays level
  if (jointId === 'chest') {
    const restAng = angleOf(rest.hip, rest.chest);
    const curAng = angleOf(fk.joints.hip, target);
    const pelvisDelta = next.rootRotation + next.boneAngles.pelvis;
    const prevSpine = next.boneAngles.spine;
    const newSpine = Math.max(
      -1.15,
      Math.min(1.15, normalizeAngle(curAng - restAng - pelvisDelta))
    );
    next.boneAngles.spine = newSpine;

    if (options?.keepHeadLevel) {
      const spineDiff = newSpine - prevSpine;
      next.boneAngles.neck = Math.max(-0.85, Math.min(0.85, next.boneAngles.neck - spineDiff * 0.45));
      next.boneAngles.head = Math.max(-0.95, Math.min(0.95, next.boneAngles.head - spineDiff * 0.55));
    }
    return next;
  }

  // Neck -> rotate neck
  if (jointId === 'neck') {
    const restAng = angleOf(rest.chest, rest.neck);
    const curAng = angleOf(fk.joints.chest, target);
    next.boneAngles.neck = Math.max(
      -0.8,
      Math.min(0.8, normalizeAngle(curAng - restAng - fk.boneTransforms.spine.deltaAngle))
    );
    return next;
  }

  // HeadTop -> split smooth rotation across neck (35%) and head (65%) + 2.5D headTurnX/Y
  if (jointId === 'headTop') {
    const restAng = angleOf(rest.chest, rest.headTop);
    const curAng = angleOf(fk.joints.chest, target);
    const total = Math.max(
      -1.05,
      Math.min(1.05, normalizeAngle(curAng - restAng - fk.boneTransforms.spine.deltaAngle))
    );
    next.boneAngles.neck = total * 0.35;
    next.boneAngles.head = total * 0.65;

    // Also drive 2.5D headTurnX and headTurnY from pointer displacement relative to head length
    const headLen = Math.max(28, Math.hypot(rest.headTop.x - rest.neck.x, rest.headTop.y - rest.neck.y));
    const dx = target.x - dragStartPointer.x;
    const dy = target.y - dragStartPointer.y;
    next.headTurnX = Math.max(
      -1,
      Math.min(1, (poseAtDragStart.headTurnX ?? 0) + dx / (headLen * 0.85))
    );
    next.headTurnY = Math.max(
      -1,
      Math.min(1, (poseAtDragStart.headTurnY ?? 0) + dy / (headLen * 0.85))
    );
    return next;
  }

  // Mid-limb joints (elbows / knees) -> aim upper bone directly & update pole bend preference
  const singleBoneMap: Partial<
    Record<
      JointId,
      { bone: DeformBoneId; origin: JointId; parent: DeformBoneId }
    >
  > = {
    leftElbow: { bone: 'leftUpperArm', origin: 'leftShoulder', parent: 'spine' },
    rightElbow: { bone: 'rightUpperArm', origin: 'rightShoulder', parent: 'spine' },
    leftKnee: { bone: 'leftThigh', origin: 'leftHip', parent: 'pelvis' },
    rightKnee: { bone: 'rightThigh', origin: 'rightHip', parent: 'pelvis' },
  };

  const single = singleBoneMap[jointId];
  if (single) {
    const restAng = angleOf(rest[single.origin], rest[jointId]);
    const curAng = angleOf(fk.joints[single.origin], target);
    next.boneAngles[single.bone] = normalizeAngle(
      curAng - restAng - fk.boneTransforms[single.parent].deltaAngle
    );

    if (jointId === 'leftElbow') {
      const S = fk.joints.leftShoulder;
      const E = fk.joints.leftWrist;
      const cross = (target.x - S.x) * (E.y - S.y) - (target.y - S.y) * (E.x - S.x);
      if (Math.abs(cross) > 4) {
        next.leftElbowBend = cross >= 0 ? 1 : -1;
      }
    } else if (jointId === 'rightElbow') {
      const S = fk.joints.rightShoulder;
      const E = fk.joints.rightWrist;
      const cross = (target.x - S.x) * (E.y - S.y) - (target.y - S.y) * (E.x - S.x);
      if (Math.abs(cross) > 4) {
        next.rightElbowBend = cross >= 0 ? 1 : -1;
      }
    } else if (jointId === 'leftKnee') {
      const S = fk.joints.leftHip;
      const E = fk.joints.leftAnkle;
      const cross = (target.x - S.x) * (E.y - S.y) - (target.y - S.y) * (E.x - S.x);
      if (Math.abs(cross) > 4) {
        next.leftKneeBend = cross >= 0 ? 1 : -1;
      }
    } else if (jointId === 'rightKnee') {
      const S = fk.joints.rightHip;
      const E = fk.joints.rightAnkle;
      const cross = (target.x - S.x) * (E.y - S.y) - (target.y - S.y) * (E.x - S.x);
      if (Math.abs(cross) > 4) {
        next.rightKneeBend = cross >= 0 ? 1 : -1;
      }
    }
  }

  return next;
}

function pointInTriangle(
  px: number,
  py: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): boolean {
  const d1 = (px - x1) * (y0 - y1) - (x0 - x1) * (py - y1);
  const d2 = (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
  const d3 = (px - x0) * (y2 - y0) - (x2 - x0) * (py - y0);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

/**
 * Hit-tests any point on the deformed character mesh and maps the touched body part
 * to the most intuitive draggable JointId (Hands, Wrists, Feet, Ankles, Elbows, Knees, Head, Chest, Hip).
 */
export function hitTestBodyPartJoint(
  point: Vec2,
  mesh: SkinnedMesh,
  deformedVerts: Float32Array
): JointId | null {
  const { indices, weights } = mesh;
  for (let t = 0; t < indices.length; t += 3) {
    const v0 = indices[t];
    const v1 = indices[t + 1];
    const v2 = indices[t + 2];

    const x0 = deformedVerts[v0 * 2], y0 = deformedVerts[v0 * 2 + 1];
    const x1 = deformedVerts[v1 * 2], y1 = deformedVerts[v1 * 2 + 1];
    const x2 = deformedVerts[v2 * 2], y2 = deformedVerts[v2 * 2 + 1];

    if (pointInTriangle(point.x, point.y, x0, y0, x1, y1, x2, y2)) {
      const domBoneIdx = weights[v0][0]?.boneIndex ?? 0;
      const boneId = BONE_ORDER[domBoneIdx];
      switch (boneId) {
        case 'leftHandBone':
          return 'leftHand';
        case 'leftLowerArm':
          return 'leftWrist';
        case 'leftUpperArm':
          return 'leftElbow';
        case 'rightHandBone':
          return 'rightHand';
        case 'rightLowerArm':
          return 'rightWrist';
        case 'rightUpperArm':
          return 'rightElbow';
        case 'leftFootBone':
          return 'leftFoot';
        case 'leftShin':
          return 'leftAnkle';
        case 'leftThigh':
          return 'leftKnee';
        case 'rightFootBone':
          return 'rightFoot';
        case 'rightShin':
          return 'rightAnkle';
        case 'rightThigh':
          return 'rightKnee';
        case 'head':
        case 'neck':
          return 'headTop';
        case 'spine':
          return 'chest';
        case 'pelvis':
        default:
          return 'hip';
      }
    }
  }
  return null;
}
