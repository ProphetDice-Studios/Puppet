import { BONE_ORDER, clonePose, createRestPose } from './rigging';
import { EasingType, Keyframe, PosePreset, PoseState } from './types';

export function applyEasing(t: number, easing: EasingType): number {
  const clamped = Math.max(0, Math.min(1, t));
  switch (easing) {
    case 'linear':
      return clamped;
    case 'step':
      return clamped < 0.999 ? 0 : 1;
    case 'bouncy': {
      // Smooth ease-out back with gentle cartoon overshoot
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(clamped - 1, 3) + c1 * Math.pow(clamped - 1, 2);
    }
    case 'smooth':
    default:
      // Cubic ease-in-out
      return clamped < 0.5
        ? 4 * clamped * clamped * clamped
        : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
  }
}

export function lerpAngleShortest(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

export function interpolatePose(a: PoseState, b: PoseState, rawT: number, easing: EasingType): PoseState {
  const t = applyEasing(rawT, easing);
  const boneAngles = {} as PoseState['boneAngles'];
  for (const id of BONE_ORDER) {
    boneAngles[id] = lerpAngleShortest(a.boneAngles[id] || 0, b.boneAngles[id] || 0, t);
  }
  const aLOff = a.leftShoulderOffset ?? { x: 0, y: 0 };
  const bLOff = b.leftShoulderOffset ?? { x: 0, y: 0 };
  const aROff = a.rightShoulderOffset ?? { x: 0, y: 0 };
  const bROff = b.rightShoulderOffset ?? { x: 0, y: 0 };

  return {
    rootOffset: {
      x: a.rootOffset.x + (b.rootOffset.x - a.rootOffset.x) * t,
      y: a.rootOffset.y + (b.rootOffset.y - a.rootOffset.y) * t,
    },
    rootRotation: lerpAngleShortest(a.rootRotation, b.rootRotation, t),
    boneAngles,
    headTurnX: (a.headTurnX ?? 0) + ((b.headTurnX ?? 0) - (a.headTurnX ?? 0)) * t,
    headTurnY: (a.headTurnY ?? 0) + ((b.headTurnY ?? 0) - (a.headTurnY ?? 0)) * t,
    blink: Math.max(0, Math.min(1, (a.blink ?? 0) + ((b.blink ?? 0) - (a.blink ?? 0)) * t)),
    leftShoulderOffset: {
      x: aLOff.x + (bLOff.x - aLOff.x) * t,
      y: aLOff.y + (bLOff.y - aLOff.y) * t,
    },
    rightShoulderOffset: {
      x: aROff.x + (bROff.x - aROff.x) * t,
      y: aROff.y + (bROff.y - aROff.y) * t,
    },
    torsoTwist: (a.torsoTwist ?? 0) + ((b.torsoTwist ?? 0) - (a.torsoTwist ?? 0)) * t,
    torsoSquash: (a.torsoSquash ?? 0) + ((b.torsoSquash ?? 0) - (a.torsoSquash ?? 0)) * t,
    leftElbowBend: t < 0.5 ? (a.leftElbowBend ?? -1) : (b.leftElbowBend ?? -1),
    rightElbowBend: t < 0.5 ? (a.rightElbowBend ?? 1) : (b.rightElbowBend ?? 1),
    leftKneeBend: t < 0.5 ? (a.leftKneeBend ?? 1) : (b.leftKneeBend ?? 1),
    rightKneeBend: t < 0.5 ? (a.rightKneeBend ?? -1) : (b.rightKneeBend ?? -1),
  };
}

/**
 * Computes a natural periodic blink envelope [0..1] at a given timestamp when Auto-Blink is enabled.
 */
export function evaluateAutoBlinkAtTime(time: number, enabled: boolean): number {
  if (!enabled) return 0;
  // Trigger a crisp 160ms blink around t = 0.75s, 2.15s, 3.55s...
  const period = 1.4;
  const phase = ((time + 0.65) % period + period) % period;
  const blinkWindow = 0.16;
  if (phase > blinkWindow) return 0;
  const normalized = phase / blinkWindow; // 0 -> 1
  return Math.sin(normalized * Math.PI);
}

/**
 * Inserts a 3-keyframe natural eye blink (open -> closed -> open) around `time`.
 */
export function insertQuickBlinkKeyframes(
  keyframes: Keyframe[],
  time: number,
  duration: number,
  currentPose: PoseState
): { keyframes: Keyframe[]; activeId: string } {
  const centerT = Math.max(0.05, Math.min(duration - 0.05, Math.round(time * 20) / 20));
  const preT = Math.max(0, Math.round((centerT - 0.1) * 20) / 20);
  const postT = Math.min(duration, Math.round((centerT + 0.1) * 20) / 20);

  const openPose = clonePose(currentPose);
  openPose.blink = 0;

  const closedPose = clonePose(currentPose);
  closedPose.blink = 1;

  let res = upsertKeyframeAtTime(keyframes, preT, openPose, { easing: 'smooth' });
  res = upsertKeyframeAtTime(res.keyframes, postT, openPose, { easing: 'smooth' });
  res = upsertKeyframeAtTime(res.keyframes, centerT, closedPose, {
    label: 'Blink',
    easing: 'smooth',
  });
  return res;
}

export function sortKeyframes(keyframes: Keyframe[]): Keyframe[] {
  return [...keyframes].sort((a, b) => a.time - b.time);
}

/**
 * Evaluates the timeline pose at any timestamp (seconds).
 * Supports seamless looping when loop=true and duration > last keyframe.
 */
export function sampleTimelineAtTime(
  keyframes: Keyframe[],
  time: number,
  duration: number,
  loop = true
): PoseState {
  if (keyframes.length === 0) return createRestPose();
  const sorted = sortKeyframes(keyframes);
  if (sorted.length === 1) return clonePose(sorted[0].pose);

  const clampedTime = Math.max(0, Math.min(duration, time));

  if (clampedTime <= sorted[0].time) {
    return clonePose(sorted[0].pose);
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const k0 = sorted[i];
    const k1 = sorted[i + 1];
    if (clampedTime >= k0.time && clampedTime <= k1.time) {
      const span = k1.time - k0.time;
      if (span <= 1e-5) return clonePose(k1.pose);
      const localT = (clampedTime - k0.time) / span;
      return interpolatePose(k0.pose, k1.pose, localT, k0.easing);
    }
  }

  const last = sorted[sorted.length - 1];
  if (loop && duration > last.time + 0.02 && sorted[0].time === 0) {
    const span = duration - last.time;
    const localT = (clampedTime - last.time) / span;
    return interpolatePose(last.pose, sorted[0].pose, localT, last.easing);
  }

  return clonePose(last.pose);
}

/**
 * Inserts or updates a keyframe at `time` (snapped to 0.05s).
 */
export function upsertKeyframeAtTime(
  keyframes: Keyframe[],
  time: number,
  pose: PoseState,
  options?: { label?: string; easing?: EasingType; snapTolerance?: number }
): { keyframes: Keyframe[]; activeId: string } {
  const snappedTime = Math.round(Math.max(0, time) * 20) / 20;
  const tol = options?.snapTolerance ?? 0.035;

  const existingIdx = keyframes.findIndex((k) => Math.abs(k.time - snappedTime) <= tol);
  if (existingIdx !== -1) {
    const existing = keyframes[existingIdx];
    const updated: Keyframe = {
      ...existing,
      pose: clonePose(pose),
      label: options?.label ?? existing.label,
      easing: options?.easing ?? existing.easing,
    };
    const next = [...keyframes];
    next[existingIdx] = updated;
    return { keyframes: sortKeyframes(next), activeId: updated.id };
  }

  const newKf: Keyframe = {
    id: `kf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    time: snappedTime,
    label: options?.label,
    pose: clonePose(pose),
    easing: options?.easing ?? 'smooth',
  };
  return {
    keyframes: sortKeyframes([...keyframes, newKf]),
    activeId: newKf.id,
  };
}

/**
 * Moves a keyframe to a new timestamp (drag-and-drop on timeline), avoiding exact collisions.
 */
export function moveKeyframeTime(
  keyframes: Keyframe[],
  id: string,
  newTime: number,
  duration: number
): Keyframe[] {
  let targetTime = Math.round(Math.max(0, Math.min(duration, newTime)) * 20) / 20;
  const others = keyframes.filter((k) => k.id !== id);
  while (others.some((k) => Math.abs(k.time - targetTime) < 0.024)) {
    targetTime = Math.min(duration, Math.round((targetTime + 0.05) * 20) / 20);
    if (targetTime >= duration && others.some((k) => Math.abs(k.time - targetTime) < 0.024)) {
      targetTime = Math.max(0, Math.round((newTime - 0.05) * 20) / 20);
      break;
    }
  }

  return sortKeyframes(
    keyframes.map((k) => (k.id === id ? { ...k, time: targetTime } : k))
  );
}

/**
 * Beginner-friendly Pose Stamps that can be clicked OR dragged directly onto the Timeline!
 */
export const POSE_PRESETS: PosePreset[] = [
  {
    id: 'rest',
    name: 'Rest Pose',
    summary: 'Neutral bind stance',
    pose: createRestPose(),
  },
  {
    id: 'wave_hi',
    name: 'Wave High',
    summary: 'Right arm & wrist waving out',
    pose: {
      ...createRestPose(),
      rootOffset: { x: 0, y: -4 },
      rootRotation: 0,
      headTurnX: 0.28,
      headTurnY: -0.1,
      rightShoulderOffset: { x: 0, y: 0 },
      boneAngles: {
        ...createRestPose().boneAngles,
        spine: -0.08,
        head: -0.1,
        rightUpperArm: -1.65,
        rightLowerArm: -0.65,
        rightHandBone: -0.45,
        leftUpperArm: 0.2,
        leftLowerArm: 0.15,
        leftHandBone: 0.12,
      },
    },
  },
  {
    id: 'wave_back',
    name: 'Wave In',
    summary: 'Wrist & forearm wave + blink',
    pose: {
      ...createRestPose(),
      rootOffset: { x: 0, y: 0 },
      rootRotation: 0,
      headTurnX: -0.18,
      blink: 1,
      rightShoulderOffset: { x: 0, y: 0 },
      boneAngles: {
        ...createRestPose().boneAngles,
        spine: 0.05,
        head: 0.08,
        rightUpperArm: -1.45,
        rightLowerArm: 0.45,
        rightHandBone: 0.52,
        leftUpperArm: 0.28,
        leftLowerArm: 0.2,
        leftHandBone: -0.15,
      },
    },
  },
  {
    id: 'head_turn_blink',
    name: 'Look & Wink/Blink',
    summary: '2.5D head turn + closed eyes',
    pose: {
      ...createRestPose(),
      headTurnX: 0.72,
      headTurnY: -0.15,
      blink: 1,
      torsoTwist: 0.25,
      leftShoulderOffset: { x: 4, y: -8 },
      rightShoulderOffset: { x: -4, y: -8 },
      boneAngles: {
        ...createRestPose().boneAngles,
        spine: 0.06,
        neck: 0.12,
        head: 0.18,
        leftUpperArm: 0.35,
        leftLowerArm: -0.45,
        leftHandBone: -0.35,
        rightUpperArm: -0.35,
        rightLowerArm: 0.45,
        rightHandBone: 0.35,
      },
    },
  },
  {
    id: 'shrug_pose',
    name: 'Curious Shrug',
    summary: 'Palms up + raised shoulders',
    pose: {
      ...createRestPose(),
      headTurnX: -0.55,
      headTurnY: -0.22,
      blink: 0,
      torsoSquash: -0.12,
      leftShoulderOffset: { x: 3, y: -15 },
      rightShoulderOffset: { x: -3, y: -15 },
      boneAngles: {
        ...createRestPose().boneAngles,
        spine: -0.05,
        neck: -0.12,
        head: -0.24,
        leftUpperArm: 0.55,
        leftLowerArm: 1.15,
        leftHandBone: 0.55,
        rightUpperArm: -0.55,
        rightLowerArm: -1.15,
        rightHandBone: -0.55,
      },
    },
  },
  {
    id: 'jump_up',
    name: 'Star Jump',
    summary: 'Airborne leap + pointed toes',
    pose: {
      ...createRestPose(),
      rootOffset: { x: 0, y: -42 },
      rootRotation: 0,
      headTurnY: -0.25,
      torsoSquash: -0.14,
      leftShoulderOffset: { x: 0, y: -10 },
      rightShoulderOffset: { x: 0, y: -10 },
      boneAngles: {
        ...createRestPose().boneAngles,
        spine: -0.04,
        head: -0.12,
        leftUpperArm: 1.35,
        leftLowerArm: 0.35,
        leftHandBone: 0.3,
        rightUpperArm: -1.35,
        rightLowerArm: -0.35,
        rightHandBone: -0.3,
        leftThigh: 0.38,
        leftShin: -0.55,
        leftFootBone: 0.48,
        rightThigh: -0.38,
        rightShin: 0.55,
        rightFootBone: -0.48,
      },
    },
  },
  {
    id: 'crouch',
    name: 'Squash Crouch',
    summary: 'Knees & ankles flexed to spring',
    pose: {
      ...createRestPose(),
      rootOffset: { x: 0, y: 24 },
      rootRotation: 0,
      torsoSquash: 0.18,
      headTurnY: 0.2,
      boneAngles: {
        ...createRestPose().boneAngles,
        spine: 0.12,
        head: -0.1,
        leftUpperArm: -0.45,
        leftLowerArm: -0.4,
        leftHandBone: -0.35,
        rightUpperArm: 0.45,
        rightLowerArm: 0.4,
        rightHandBone: 0.35,
        leftThigh: 0.52,
        leftShin: -0.92,
        leftFootBone: 0.42,
        rightThigh: -0.52,
        rightShin: 0.92,
        rightFootBone: -0.42,
      },
    },
  },
  {
    id: 'stride',
    name: 'Walk Stride',
    summary: 'Dynamic step + ankle push-off',
    pose: {
      ...createRestPose(),
      rootOffset: { x: 6, y: -8 },
      rootRotation: 0.04,
      torsoTwist: 0.35,
      headTurnX: 0.3,
      boneAngles: {
        ...createRestPose().boneAngles,
        spine: 0.08,
        leftUpperArm: -0.55,
        leftLowerArm: -0.35,
        leftHandBone: -0.25,
        rightUpperArm: 0.55,
        rightLowerArm: 0.25,
        rightHandBone: 0.25,
        leftThigh: 0.48,
        leftShin: -0.25,
        leftFootBone: -0.35,
        rightThigh: -0.45,
        rightShin: 0.52,
        rightFootBone: 0.42,
      },
    },
  },
];

export function createStarterWaveAnimation(): Keyframe[] {
  return [
    {
      id: 'kf_init_0',
      time: 0.0,
      label: 'Rest',
      pose: clonePose(POSE_PRESETS[0].pose),
      easing: 'smooth',
    },
    {
      id: 'kf_init_1',
      time: 0.5,
      label: 'Wave High',
      pose: clonePose(POSE_PRESETS[1].pose),
      easing: 'smooth',
    },
    {
      id: 'kf_init_2',
      time: 1.0,
      label: 'Wave In',
      pose: clonePose(POSE_PRESETS[2].pose),
      easing: 'smooth',
    },
    {
      id: 'kf_init_3',
      time: 1.5,
      label: 'Wave High',
      pose: clonePose(POSE_PRESETS[1].pose),
      easing: 'smooth',
    },
  ];
}
