import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bone,
  Download,
  Eye,
  Grid,
  Layers,
  Redo2,
  RotateCcw,
  Sliders,
  Undo2,
  Wand2,
} from 'lucide-react';
import { dragJointToTarget, hitTestBodyPartJoint } from '../engine/ik';
import { deformMeshVertices, renderCharacterBlink2D, renderDeformedMesh2D } from '../engine/mesh';
import { LoadedCharacterBundle } from '../engine/pngLoader';
import { BONE_DEFINITIONS, BONE_ORDER, clonePose, createRestPose, evaluateForwardKinematics } from '../engine/rigging';
import { evaluateAutoBlinkAtTime } from '../engine/timeline';
import { JointId, Keyframe, PoseState, RestJoints, Vec2 } from '../engine/types';

export type WorkspaceMode = 'animate' | 'rig';

const JOINT_LABELS: Record<JointId, string> = {
  hip: 'Center / Belly (Move Whole Body)',
  chest: 'Chest / Spine (Bend & Lean Torso)',
  neck: 'Neck',
  headTop: 'Head (2.5D Turn, Tilt & Nod)',
  leftShoulder: 'Left Shoulder (Shrug & Clavicle)',
  leftElbow: 'Left Elbow (Bend Pole & Upper Arm)',
  leftWrist: 'Left Wrist (2-Bone Arm IK)',
  leftHand: 'Left Hand (Rotate Wrist / Pull Arm)',
  rightShoulder: 'Right Shoulder (Shrug & Clavicle)',
  rightElbow: 'Right Elbow (Bend Pole & Upper Arm)',
  rightWrist: 'Right Wrist (2-Bone Arm IK)',
  rightHand: 'Right Hand (Rotate Wrist / Pull Arm)',
  leftHip: 'Left Hip (Tilt Pelvis)',
  leftKnee: 'Left Knee (Bend Pole & Thigh)',
  leftAnkle: 'Left Ankle (2-Bone Leg IK)',
  leftFoot: 'Left Foot / Toe (Flex Ankle / Pull Leg)',
  rightHip: 'Right Hip (Tilt Pelvis)',
  rightKnee: 'Right Knee (Bend Pole & Thigh)',
  rightAnkle: 'Right Ankle (2-Bone Leg IK)',
  rightFoot: 'Right Foot / Toe (Flex Ankle / Pull Leg)',
};

const END_EFFECTOR_JOINTS = new Set<JointId>([
  'leftHand',
  'rightHand',
  'leftFoot',
  'rightFoot',
  'headTop',
]);

const WRIST_ANKLE_JOINTS = new Set<JointId>([
  'leftWrist',
  'rightWrist',
  'leftAnkle',
  'rightAnkle',
]);

const PRIMARY_DRAGGABLE_JOINTS: JointId[] = [
  'leftHand',
  'rightHand',
  'leftWrist',
  'rightWrist',
  'leftFoot',
  'rightFoot',
  'leftAnkle',
  'rightAnkle',
  'headTop',
  'leftElbow',
  'rightElbow',
  'leftKnee',
  'rightKnee',
  'chest',
  'hip',
  'neck',
  'leftShoulder',
  'rightShoulder',
  'leftHip',
  'rightHip',
];

interface CharacterStageProps {
  bundle: LoadedCharacterBundle | null;
  mode: WorkspaceMode;
  onChangeMode: (mode: WorkspaceMode) => void;
  currentPose: PoseState;
  onLivePoseChange: (pose: PoseState) => void;
  onCommitPoseChange: (pose: PoseState, jointMoved?: JointId) => void;
  onCommitAdjustedJoints: (joints: RestJoints) => void;
  onAutoRedetectRig: () => void;
  onResetPose: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isPlaying: boolean;
  keyframes: Keyframe[];
  currentTime: number;
  autoBlink: boolean;
  keepHeadLevel: boolean;
  onDropPngFile: (file: File) => void;
  onOpenExport: () => void;
}

export const CharacterStage: React.FC<CharacterStageProps> = ({
  bundle,
  mode,
  onChangeMode,
  currentPose,
  onLivePoseChange,
  onCommitPoseChange,
  onCommitAdjustedJoints,
  onAutoRedetectRig,
  onResetPose,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isPlaying,
  keyframes,
  currentTime,
  autoBlink,
  keepHeadLevel,
  onDropPngFile,
  onOpenExport,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showOnionSkin, setShowOnionSkin] = useState(true);
  const [showMesh, setShowMesh] = useState(false);
  const [hoveredJoint, setHoveredJoint] = useState<JointId | null>(null);
  const [activeJoint, setActiveJoint] = useState<JointId | null>(null);
  const [isFileDraggingOver, setIsFileDraggingOver] = useState(false);
  const [stageSize, setStageSize] = useState({ width: 820, height: 520 });

  // Draft rest joints while dragging in "Adjust Rig" mode
  const [draftRestJoints, setDraftRestJoints] = useState<RestJoints | null>(null);

  const dragRef = useRef<{
    jointId: JointId;
    startPointerCharSpace: Vec2;
    startPose: PoseState;
    latestPose: PoseState;
    latestRestJoints: RestJoints | null;
  } | null>(null);

  // Measure responsive stage viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 40 && rect.height > 40) {
        setStageSize({
          width: Math.floor(rect.width),
          height: Math.floor(rect.height),
        });
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Reset draft joints when switching characters or modes
  useEffect(() => {
    setDraftRestJoints(null);
  }, [bundle?.rig.id, mode]);

  const getStageTransform = useCallback(() => {
    if (!bundle) return { scale: 1, offsetX: 0, offsetY: 0 };
    const pad = 36;
    const availW = Math.max(120, stageSize.width - pad * 2);
    const availH = Math.max(120, stageSize.height - pad * 2);
    const scale = Math.min(1.25, availW / bundle.rig.width, availH / bundle.rig.height);
    const offsetX = (stageSize.width - bundle.rig.width * scale) * 0.5;
    const offsetY = (stageSize.height - bundle.rig.height * scale) * 0.5;
    return { scale, offsetX, offsetY };
  }, [bundle, stageSize]);

  const clientToCharSpace = useCallback(
    (clientX: number, clientY: number): Vec2 => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      const { scale, offsetX, offsetY } = getStageTransform();
      return {
        x: (sx - offsetX) / scale,
        y: (sy - offsetY) / scale,
      };
    },
    [getStageTransform]
  );

  // Main 2D Canvas Render Effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bundle) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = stageSize.width * dpr;
    canvas.height = stageSize.height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, stageSize.width, stageSize.height);

    const { scale, offsetX, offsetY } = getStageTransform();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    const effectiveRest = mode === 'rig' && draftRestJoints ? draftRestJoints : bundle.rig.restJoints;
    const effectivePose = mode === 'rig' ? createRestPose() : currentPose;

    // Subtle ground shadow ellipse beneath character feet
    const fkMain = evaluateForwardKinematics(effectiveRest, effectivePose);
    const groundY = Math.max(bundle.rig.restJoints.leftFoot.y, bundle.rig.restJoints.rightFoot.y) + 14;
    const shadowCenterX = fkMain.joints.hip.x;
    const liftFactor = Math.max(0.45, Math.min(1.15, 1 + effectivePose.rootOffset.y / 140));
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.08)';
    ctx.beginPath();
    ctx.ellipse(shadowCenterX, groundY, 74 * liftFactor, 12 * liftFactor, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 1. Optional Onion Skin (previous & next keyframe ghosts when not playing)
    if (showOnionSkin && mode === 'animate' && !isPlaying && keyframes.length > 1) {
      let prevKf: Keyframe | null = null;
      let nextKf: Keyframe | null = null;
      for (const kf of keyframes) {
        if (kf.time < currentTime - 0.03) prevKf = kf;
        if (kf.time > currentTime + 0.03 && !nextKf) nextKf = kf;
      }
      if (prevKf) {
        const prevFk = evaluateForwardKinematics(effectiveRest, prevKf.pose);
        const prevVerts = deformMeshVertices(bundle.rig.mesh, prevFk);
        renderDeformedMesh2D(ctx, bundle.textureCanvas, bundle.rig.mesh, prevVerts, 0.17);
      }
      if (nextKf) {
        const nextFk = evaluateForwardKinematics(effectiveRest, nextKf.pose);
        const nextVerts = deformMeshVertices(bundle.rig.mesh, nextFk);
        renderDeformedMesh2D(ctx, bundle.textureCanvas, bundle.rig.mesh, nextVerts, 0.11);
      }
    }

    // 2. Render Deformed Character Mesh + Animated Eyelid Blink
    const deformedVerts = deformMeshVertices(bundle.rig.mesh, fkMain);
    renderDeformedMesh2D(ctx, bundle.textureCanvas, bundle.rig.mesh, deformedVerts, 1);

    const extraAutoBlink =
      mode === 'animate' ? evaluateAutoBlinkAtTime(currentTime, autoBlink && isPlaying) : 0;
    renderCharacterBlink2D(ctx, bundle.rig.eyes, fkMain, extraAutoBlink, 1);

    // 3. Optional Triangle Mesh Wireframe Overlay
    if (showMesh) {
      const { indices } = bundle.rig.mesh;
      ctx.save();
      ctx.strokeStyle = 'rgba(37, 99, 235, 0.32)';
      ctx.lineWidth = 1 / scale;
      ctx.beginPath();
      for (let t = 0; t < indices.length; t += 3) {
        const i0 = indices[t] * 2;
        const i1 = indices[t + 1] * 2;
        const i2 = indices[t + 2] * 2;
        ctx.moveTo(deformedVerts[i0], deformedVerts[i0 + 1]);
        ctx.lineTo(deformedVerts[i1], deformedVerts[i1 + 1]);
        ctx.lineTo(deformedVerts[i2], deformedVerts[i2 + 1]);
        ctx.closePath();
      }
      ctx.stroke();
      ctx.restore();
    }

    // 4. Skeleton Bones & Draggable Joint Handles
    if (showSkeleton || mode === 'rig') {
      ctx.save();
      const invScale = 1 / scale;

      // Draw structural clavicles/pelvis dashed connectors
      const structuralPairs: [JointId, JointId][] = [
        ['chest', 'leftShoulder'],
        ['chest', 'rightShoulder'],
        ['hip', 'leftHip'],
        ['hip', 'rightHip'],
      ];
      ctx.strokeStyle = mode === 'rig' ? 'rgba(217, 119, 6, 0.65)' : 'rgba(37, 99, 235, 0.5)';
      ctx.lineWidth = 2 * invScale;
      ctx.setLineDash([4 * invScale, 4 * invScale]);
      for (const [a, b] of structuralPairs) {
        ctx.beginPath();
        ctx.moveTo(fkMain.joints[a].x, fkMain.joints[a].y);
        ctx.lineTo(fkMain.joints[b].x, fkMain.joints[b].y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Draw tapered bones
      for (const boneId of BONE_ORDER) {
        if (boneId === 'pelvis') continue;
        const def = BONE_DEFINITIONS[boneId];
        const a = fkMain.joints[def.startJoint];
        const b = fkMain.joints[def.endJoint];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy);
        if (len < 1) continue;
        const nx = -dy / len;
        const ny = dx / len;
        const w = 4.5 * invScale;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(a.x + dx * 0.22 + nx * w, a.y + dy * 0.22 + ny * w);
        ctx.lineTo(b.x, b.y);
        ctx.lineTo(a.x + dx * 0.22 - nx * w, a.y + dy * 0.22 - ny * w);
        ctx.closePath();

        ctx.fillStyle =
          mode === 'rig' ? 'rgba(245, 158, 11, 0.42)' : 'rgba(59, 130, 246, 0.36)';
        ctx.strokeStyle = mode === 'rig' ? '#b45309' : '#1d4ed8';
        ctx.lineWidth = 1.6 * invScale;
        ctx.fill();
        ctx.stroke();
      }

      // Draw joints
      for (const jId of PRIMARY_DRAGGABLE_JOINTS) {
        const pt = fkMain.joints[jId];
        const isEnd = END_EFFECTOR_JOINTS.has(jId);
        const isWristOrAnkle = WRIST_ANKLE_JOINTS.has(jId);
        const isRoot = jId === 'hip';
        const isHovered = hoveredJoint === jId;
        const isActive = activeJoint === jId;

        const baseRadius = (isEnd ? 8 : isRoot ? 9 : isWristOrAnkle ? 6.8 : 5.8) * invScale;
        const radius = isActive ? baseRadius * 1.3 : isHovered ? baseRadius * 1.2 : baseRadius;

        // Outer halo on end effectors, wrists/ankles, or hovered joints
        if (isEnd || isWristOrAnkle || isHovered || isActive || isRoot) {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, radius + (isEnd || isRoot ? 4.2 : 3.2) * invScale, 0, Math.PI * 2);
          ctx.fillStyle = isActive
            ? 'rgba(245, 158, 11, 0.32)'
            : mode === 'rig'
            ? 'rgba(245, 158, 11, 0.22)'
            : isWristOrAnkle
            ? 'rgba(14, 165, 233, 0.18)'
            : 'rgba(37, 99, 235, 0.2)';
          ctx.fill();
        }

        if (isRoot) {
          // Diamond handle for root body translation
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y - radius * 1.25);
          ctx.lineTo(pt.x + radius * 1.25, pt.y);
          ctx.lineTo(pt.x, pt.y + radius * 1.25);
          ctx.lineTo(pt.x - radius * 1.25, pt.y);
          ctx.closePath();
          ctx.fillStyle = isActive || isHovered ? '#f59e0b' : '#ffffff';
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2.2 * invScale;
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
          ctx.fillStyle =
            isActive || isHovered
              ? '#f59e0b'
              : mode === 'rig'
              ? '#fef3c7'
              : isEnd
              ? '#2563eb'
              : isWristOrAnkle
              ? '#38bdf8'
              : '#ffffff';
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2 * invScale;
          ctx.fill();
          ctx.stroke();
        }
      }

      ctx.restore();
    }

    ctx.restore();
  }, [
    bundle,
    stageSize,
    getStageTransform,
    mode,
    draftRestJoints,
    currentPose,
    showOnionSkin,
    showMesh,
    showSkeleton,
    isPlaying,
    keyframes,
    currentTime,
    autoBlink,
    hoveredJoint,
    activeJoint,
  ]);

  const pickJointAtPoint = useCallback(
    (charPt: Vec2): JointId | null => {
      if (!bundle) return null;
      const { scale } = getStageTransform();
      const effectiveRest =
        mode === 'rig' && draftRestJoints ? draftRestJoints : bundle.rig.restJoints;
      const effectivePose = mode === 'rig' ? createRestPose() : currentPose;
      const fk = evaluateForwardKinematics(effectiveRest, effectivePose);

      // 1. Check direct proximity to joint handles first (generous 20px screen hit radius)
      const hitRadius = 20 / scale;
      let closestId: JointId | null = null;
      let closestDist = hitRadius;

      for (const jId of PRIMARY_DRAGGABLE_JOINTS) {
        const jp = fk.joints[jId];
        const d = Math.hypot(charPt.x - jp.x, charPt.y - jp.y);
        if (d < closestDist) {
          closestDist = d;
          closestId = jId;
        }
      }
      if (closestId) return closestId;

      // 2. In Animate mode, allow grabbing ANY body part pixel on the character mesh!
      if (mode === 'animate') {
        const deformed = deformMeshVertices(bundle.rig.mesh, fk);
        return hitTestBodyPartJoint(charPt, bundle.rig.mesh, deformed);
      }

      return null;
    },
    [bundle, getStageTransform, mode, draftRestJoints, currentPose]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!bundle || e.button !== 0) return;
    const charPt = clientToCharSpace(e.clientX, e.clientY);
    const picked = pickJointAtPoint(charPt);
    if (!picked) {
      setActiveJoint(null);
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    setActiveJoint(picked);

    const startRest = draftRestJoints ?? bundle.rig.restJoints;
    dragRef.current = {
      jointId: picked,
      startPointerCharSpace: charPt,
      startPose: clonePose(currentPose),
      latestPose: clonePose(currentPose),
      latestRestJoints: mode === 'rig' ? { ...startRest } : null,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!bundle) return;
    const charPt = clientToCharSpace(e.clientX, e.clientY);

    if (!dragRef.current) {
      const hovered = pickJointAtPoint(charPt);
      if (hovered !== hoveredJoint) setHoveredJoint(hovered);
      return;
    }

    const { jointId, startPointerCharSpace, startPose } = dragRef.current;

    if (mode === 'rig') {
      const clampedPt: Vec2 = {
        x: Math.max(8, Math.min(bundle.rig.width - 8, charPt.x)),
        y: Math.max(8, Math.min(bundle.rig.height - 8, charPt.y)),
      };
      const baseRest = dragRef.current.latestRestJoints ?? bundle.rig.restJoints;
      const updatedRest: RestJoints = {
        ...baseRest,
        [jointId]: clampedPt,
      };
      dragRef.current.latestRestJoints = updatedRest;
      setDraftRestJoints(updatedRest);
    } else {
      const solvedPose = dragJointToTarget(
        bundle.rig.restJoints,
        startPose,
        dragRef.current.latestPose,
        jointId,
        charPt,
        startPointerCharSpace,
        { keepHeadLevel }
      );
      dragRef.current.latestPose = solvedPose;
      onLivePoseChange(solvedPose);
    }
  };

  const finishPointerDrag = () => {
    setActiveJoint(null);
    if (!dragRef.current) return;
    const { jointId, latestPose, latestRestJoints } = dragRef.current;
    dragRef.current = null;

    if (mode === 'rig' && latestRestJoints) {
      onCommitAdjustedJoints(latestRestJoints);
    } else if (mode === 'animate') {
      onCommitPoseChange(latestPose, jointId);
    }
  };

  const activeLabelJoint = activeJoint || hoveredJoint;

  return (
    <section
      aria-label="Animation Stage"
      className="flex-1 flex flex-col min-w-0 min-h-[380px] bg-slate-50 relative"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setIsFileDraggingOver(true);
        }
      }}
      onDragLeave={() => setIsFileDraggingOver(false)}
      onDrop={(e) => {
        if (e.dataTransfer.files?.length) {
          e.preventDefault();
          setIsFileDraggingOver(false);
          const f = e.dataTransfer.files[0];
          if (f.type.startsWith('image/')) {
            onDropPngFile(f);
          }
        }
      }}
    >
      {/* Workspace Stage Toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white border-b border-slate-200 flex-wrap">
        {/* Mode Segmented Control: Animate vs Adjust Rig */}
        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label="Rigging and Animation Mode"
            className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200"
          >
            <button
              type="button"
              onClick={() => onChangeMode('animate')}
              aria-pressed={mode === 'animate'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === 'animate'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bone className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
              <span>Animate Body</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeMode('rig')}
              aria-pressed={mode === 'rig'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === 'rig'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Adjust Rig</span>
            </button>
          </div>

          {mode === 'rig' ? (
            <button
              type="button"
              onClick={onAutoRedetectRig}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
              <span>Auto-Fit Joints</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onResetPose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              <span>Reset Pose</span>
            </button>
          )}
        </div>

        {/* Center/Right View & History Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowSkeleton((v) => !v)}
            aria-pressed={showSkeleton}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showSkeleton
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Skeleton</span>
          </button>

          <button
            type="button"
            onClick={() => setShowOnionSkin((v) => !v)}
            aria-pressed={showOnionSkin}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showOnionSkin
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Onion Skin</span>
          </button>

          <button
            type="button"
            onClick={() => setShowMesh((v) => !v)}
            aria-pressed={showMesh}
            className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showMesh
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Grid className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Mesh</span>
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1" aria-hidden="true" />

          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="Undo pose edit"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <Undo2 className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            aria-label="Redo pose edit"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <Redo2 className="w-4 h-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onOpenExport}
            className="ml-1 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Interactive Canvas Viewport */}
      <div ref={containerRef} className="flex-1 relative stage-checkerboard overflow-hidden">
        <canvas
          ref={canvasRef}
          data-testid="character-stage-canvas"
          data-mode={mode}
          data-active-joint={activeJoint || 'none'}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishPointerDrag}
          onPointerCancel={finishPointerDrag}
          style={{
            width: `${stageSize.width}px`,
            height: `${stageSize.height}px`,
            touchAction: 'none',
          }}
          className={`block select-none ${
            dragRef.current
              ? 'cursor-grabbing'
              : hoveredJoint
              ? 'cursor-grab'
              : 'cursor-default'
          }`}
        />

        {/* Contextual Non-Intrusive Guidance Callout */}
        <div className="pointer-events-none absolute top-3 left-4 right-4 flex items-center justify-between gap-4">
          <div className="bg-white/90 backdrop-blur-xs border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 shadow-xs">
            {mode === 'rig' ? (
              <span>
                <strong className="font-semibold text-amber-800">Adjust Rig Mode:</strong> Drag any
                joint pin onto the character&apos;s limbs, then switch back to{' '}
                <strong className="font-semibold">Animate Body</strong>.
              </span>
            ) : activeLabelJoint ? (
              <span>
                <strong className="font-semibold text-blue-700">
                  {JOINT_LABELS[activeLabelJoint]}
                </strong>{' '}
                · Drag to move &amp; auto-save keyframe
              </span>
            ) : (
              <span>
                Drag hands, feet, head, or belly directly on the character to animate
              </span>
            )}
          </div>
        </div>

        {/* Full-Stage PNG Drop Overlay */}
        {isFileDraggingOver && (
          <div className="absolute inset-3 rounded-xl bg-blue-600/10 border-2 border-dashed border-blue-600 flex items-center justify-center pointer-events-none">
            <div className="bg-white px-5 py-3 rounded-xl shadow-md border border-blue-200 text-sm font-semibold text-blue-900">
              Drop PNG to Auto-Rig Skeleton &amp; Mesh
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
