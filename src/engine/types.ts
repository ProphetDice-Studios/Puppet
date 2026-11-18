export type JointId =
  | 'hip'
  | 'chest'
  | 'neck'
  | 'headTop'
  | 'leftShoulder'
  | 'leftElbow'
  | 'leftWrist'
  | 'leftHand'
  | 'rightShoulder'
  | 'rightElbow'
  | 'rightWrist'
  | 'rightHand'
  | 'leftHip'
  | 'leftKnee'
  | 'leftAnkle'
  | 'leftFoot'
  | 'rightHip'
  | 'rightKnee'
  | 'rightAnkle'
  | 'rightFoot';

export type DeformBoneId =
  | 'spine'
  | 'neck'
  | 'head'
  | 'leftUpperArm'
  | 'leftLowerArm'
  | 'leftHandBone'
  | 'rightUpperArm'
  | 'rightLowerArm'
  | 'rightHandBone'
  | 'leftThigh'
  | 'leftShin'
  | 'leftFootBone'
  | 'rightThigh'
  | 'rightShin'
  | 'rightFootBone'
  | 'pelvis';

export interface Vec2 {
  x: number;
  y: number;
}

export type RestJoints = Record<JointId, Vec2>;

export interface BoneDefinition {
  id: DeformBoneId;
  label: string;
  startJoint: JointId;
  endJoint: JointId;
  parentBone: DeformBoneId | null;
}

export interface PoseState {
  /** Root translation in character pixel space */
  rootOffset: Vec2;
  /** Root overall rotation in radians */
  rootRotation: number;
  /** Local rotation offsets (radians) per bone */
  boneAngles: Record<DeformBoneId, number>;
  /** 2.5D Horizontal head turn (-1 = full left, 0 = center, +1 = full right) */
  headTurnX?: number;
  /** 2.5D Vertical head pitch (-1 = look up, 0 = center, +1 = look down) */
  headTurnY?: number;
  /** Eyelid closure (0 = open, 1 = fully closed blink) */
  blink?: number;
  /** Independent left shoulder offset in character pixel space (shrug / protract) */
  leftShoulderOffset?: Vec2;
  /** Independent right shoulder offset in character pixel space (shrug / protract) */
  rightShoulderOffset?: Vec2;
  /** 2.5D Torso twist (-1 = twist left, 0 = center, +1 = twist right) */
  torsoTwist?: number;
  /** Torso vertical squash/stretch (-0.35 = squash, 0 = neutral, +0.35 = stretch) */
  torsoSquash?: number;
  /** Preferred IK elbow bend direction for left arm (-1 = natural outward, 1 = inverted) */
  leftElbowBend?: 1 | -1;
  /** Preferred IK elbow bend direction for right arm (1 = natural outward, -1 = inverted) */
  rightElbowBend?: 1 | -1;
  /** Preferred IK knee bend direction for left leg (1 = natural outward, -1 = inverted) */
  leftKneeBend?: 1 | -1;
  /** Preferred IK knee bend direction for right leg (-1 = natural outward, 1 = inverted) */
  rightKneeBend?: 1 | -1;
}

export interface PosedSkeleton {
  joints: Record<JointId, Vec2>;
  boneTransforms: Record<
    DeformBoneId,
    {
      restStart: Vec2;
      restEnd: Vec2;
      posedStart: Vec2;
      posedEnd: Vec2;
      deltaAngle: number;
    }
  >;
  /** Carried pose parameters for 2.5D head turn, torso squash/twist, and blink rendering */
  poseParams?: {
    headTurnX: number;
    headTurnY: number;
    blink: number;
    torsoTwist: number;
    torsoSquash: number;
  };
}

export interface VertexWeight {
  boneIndex: number;
  weight: number;
}

export interface SkinnedMesh {
  width: number;
  height: number;
  /** Rest positions in image pixel space [x0, y0, x1, y1, ...] */
  restVertices: Float32Array;
  /** UV coordinates in image pixel space (identical to restVertices) */
  uvs: Float32Array;
  /** Triangle vertex indices [i0, i1, i2, ...] */
  indices: Uint16Array;
  /** Up to 4 bone weights per vertex */
  weights: VertexWeight[][];
  /** Order of DeformBoneId matching boneIndex */
  boneOrder: DeformBoneId[];
}

export type EasingType = 'smooth' | 'bouncy' | 'linear' | 'step';

export interface Keyframe {
  id: string;
  /** Time in seconds */
  time: number;
  label?: string;
  pose: PoseState;
  easing: EasingType;
}

export interface PosePreset {
  id: string;
  name: string;
  summary: string;
  pose: PoseState;
}

export interface EyeLandmark {
  /** Rest position in character pixel space */
  center: Vec2;
  /** Horizontal half-width of the eye */
  radiusX: number;
  /** Vertical half-height of the eye */
  radiusY: number;
  /** Sampled eyelid fill color matching the character's head/visor */
  lidColor: string;
  /** Sampled lash/crease stroke color */
  lineColor: string;
}

export interface CharacterEyeRig {
  leftEye: EyeLandmark;
  rightEye: EyeLandmark;
}

export interface CharacterRigData {
  id: string;
  name: string;
  imageUrl: string;
  width: number;
  height: number;
  restJoints: RestJoints;
  mesh: SkinnedMesh;
  removeBgApplied: boolean;
  eyes?: CharacterEyeRig;
}
