import React, { useState } from 'react';
import { Eye, FlipHorizontal2, RotateCcw, Sparkles, UserCheck } from 'lucide-react';
import { flipArmElbowBend, flipLegKneeBend } from '../engine/ik';
import { clonePose } from '../engine/rigging';
import { PoseState, RestJoints } from '../engine/types';

interface PoseControlPanelProps {
  restJoints: RestJoints | null;
  currentPose: PoseState;
  onLivePoseChange: (pose: PoseState) => void;
  onCommitPoseChange: (pose: PoseState, label?: string) => void;
  onInsertQuickBlink: () => void;
  autoBlink: boolean;
  onToggleAutoBlink: (checked: boolean) => void;
  keepHeadLevel: boolean;
  onToggleKeepHeadLevel: (checked: boolean) => void;
}

export const PoseControlPanel: React.FC<PoseControlPanelProps> = ({
  restJoints,
  currentPose,
  onLivePoseChange,
  onCommitPoseChange,
  onInsertQuickBlink,
  autoBlink,
  onToggleAutoBlink,
  keepHeadLevel,
  onToggleKeepHeadLevel,
}) => {
  const [activeTab, setActiveTab] = useState<'head' | 'torso' | 'arms' | 'legs'>('arms');

  const headTurnX = currentPose.headTurnX ?? 0;
  const headTurnY = currentPose.headTurnY ?? 0;
  const blink = currentPose.blink ?? 0;
  const headTiltDeg = Math.round(
    (((currentPose.boneAngles.head || 0) + (currentPose.boneAngles.neck || 0)) * 180) / Math.PI
  );

  const spineDeg = Math.round(((currentPose.boneAngles.spine || 0) * 180) / Math.PI);
  const pelvisDeg = Math.round(((currentPose.boneAngles.pelvis || 0) * 180) / Math.PI);
  const torsoTwist = currentPose.torsoTwist ?? 0;
  const torsoSquash = currentPose.torsoSquash ?? 0;
  const avgShrugY = Math.round(
    ((currentPose.leftShoulderOffset?.y ?? 0) + (currentPose.rightShoulderOffset?.y ?? 0)) * 0.5
  );

  const lUpperDeg = Math.round(((currentPose.boneAngles.leftUpperArm || 0) * 180) / Math.PI);
  const lLowerDeg = Math.round(((currentPose.boneAngles.leftLowerArm || 0) * 180) / Math.PI);
  const lHandDeg = Math.round(((currentPose.boneAngles.leftHandBone || 0) * 180) / Math.PI);

  const rUpperDeg = Math.round(((currentPose.boneAngles.rightUpperArm || 0) * 180) / Math.PI);
  const rLowerDeg = Math.round(((currentPose.boneAngles.rightLowerArm || 0) * 180) / Math.PI);
  const rHandDeg = Math.round(((currentPose.boneAngles.rightHandBone || 0) * 180) / Math.PI);

  const lThighDeg = Math.round(((currentPose.boneAngles.leftThigh || 0) * 180) / Math.PI);
  const lShinDeg = Math.round(((currentPose.boneAngles.leftShin || 0) * 180) / Math.PI);
  const lFootDeg = Math.round(((currentPose.boneAngles.leftFootBone || 0) * 180) / Math.PI);

  const rThighDeg = Math.round(((currentPose.boneAngles.rightThigh || 0) * 180) / Math.PI);
  const rShinDeg = Math.round(((currentPose.boneAngles.rightShin || 0) * 180) / Math.PI);
  const rFootDeg = Math.round(((currentPose.boneAngles.rightFootBone || 0) * 180) / Math.PI);

  const updatePoseField = (mutator: (draft: PoseState) => void, commit = false, label?: string) => {
    const next = clonePose(currentPose);
    mutator(next);
    if (commit) {
      onCommitPoseChange(next, label);
    } else {
      onLivePoseChange(next);
    }
  };

  return (
    <aside
      aria-label="Head, Blink, Torso, Wrist, Hand, Ankle and Foot Controls"
      className="w-full lg:w-76 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col shrink-0 overflow-y-auto select-none"
    >
      {/* 4-Tab Segmented Control */}
      <div className="p-2.5 border-b border-slate-200 bg-slate-50/70">
        <div
          role="tablist"
          aria-label="Pose inspector sections"
          className="grid grid-cols-2 gap-1 p-1 bg-slate-200/75 rounded-lg"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'head'}
            onClick={() => setActiveTab('head')}
            className={`py-1.5 px-2 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'head'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Head &amp; Blink
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'torso'}
            onClick={() => setActiveTab('torso')}
            className={`py-1.5 px-2 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'torso'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Torso &amp; Spine
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'arms'}
            onClick={() => setActiveTab('arms')}
            className={`py-1.5 px-2 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'arms'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hands &amp; Wrists
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'legs'}
            onClick={() => setActiveTab('legs')}
            className={`py-1.5 px-2 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'legs'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Feet &amp; Ankles
          </button>
        </div>
      </div>

      {/* TAB 1: HEAD TURNING & BLINKING */}
      {activeTab === 'head' && (
        <div className="p-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-900">2.5D Head Turn</span>
              <button
                type="button"
                onClick={() =>
                  updatePoseField(
                    (d) => {
                      d.headTurnX = 0;
                      d.headTurnY = 0;
                      d.boneAngles.head = 0;
                      d.boneAngles.neck = 0;
                    },
                    true,
                    'Center Head'
                  )
                }
                aria-label="Reset head turn and tilt"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                <span>Center</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              Turn face left/right or up/down with 2.5D perspective parallax.
            </p>

            {/* Head Turn X (Yaw) */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <label htmlFor="slider-head-yaw" className="font-medium text-slate-700">
                  Head Turn (L / R)
                </label>
                <span className="font-mono tabular-nums text-slate-500">
                  {Math.round(headTurnX * 100)}%
                </span>
              </div>
              <input
                id="slider-head-yaw"
                type="range"
                min={-100}
                max={100}
                step={2}
                value={Math.round(headTurnX * 100)}
                onChange={(e) => {
                  const val = Number(e.target.value) / 100;
                  updatePoseField((d) => {
                    d.headTurnX = val;
                  }, false);
                }}
                onPointerUp={(e) => {
                  const val = Number((e.target as HTMLInputElement).value) / 100;
                  updatePoseField((d) => {
                    d.headTurnX = val;
                  }, true);
                }}
                onKeyUp={() => updatePoseField(() => {}, true)}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex items-center justify-between gap-1.5 mt-1.5">
                <button
                  type="button"
                  onClick={() =>
                    updatePoseField(
                      (d) => {
                        d.headTurnX = -0.75;
                      },
                      true,
                      'Look Left'
                    )
                  }
                  className="flex-1 py-1 px-2 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer whitespace-nowrap"
                >
                  Look Left
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updatePoseField(
                      (d) => {
                        d.headTurnX = 0;
                      },
                      true,
                      'Look Center'
                    )
                  }
                  className="flex-1 py-1 px-2 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer whitespace-nowrap"
                >
                  Front
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updatePoseField(
                      (d) => {
                        d.headTurnX = 0.75;
                      },
                      true,
                      'Look Right'
                    )
                  }
                  className="flex-1 py-1 px-2 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer whitespace-nowrap"
                >
                  Look Right
                </button>
              </div>
            </div>

            {/* Head Pitch Y (Up / Down) */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <label htmlFor="slider-head-pitch" className="font-medium text-slate-700">
                  Head Pitch (Up / Down)
                </label>
                <span className="font-mono tabular-nums text-slate-500">
                  {Math.round(headTurnY * 100)}%
                </span>
              </div>
              <input
                id="slider-head-pitch"
                type="range"
                min={-100}
                max={100}
                step={2}
                value={Math.round(headTurnY * 100)}
                onChange={(e) => {
                  const val = Number(e.target.value) / 100;
                  updatePoseField((d) => {
                    d.headTurnY = val;
                  }, false);
                }}
                onPointerUp={(e) => {
                  const val = Number((e.target as HTMLInputElement).value) / 100;
                  updatePoseField((d) => {
                    d.headTurnY = val;
                  }, true);
                }}
                onKeyUp={() => updatePoseField(() => {}, true)}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Head Roll / Tilt */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <label htmlFor="slider-head-tilt" className="font-medium text-slate-700">
                  Head Tilt (Roll)
                </label>
                <span className="font-mono tabular-nums text-slate-500">{headTiltDeg}°</span>
              </div>
              <input
                id="slider-head-tilt"
                type="range"
                min={-55}
                max={55}
                step={1}
                value={headTiltDeg}
                onChange={(e) => {
                  const rad = (Number(e.target.value) * Math.PI) / 180;
                  updatePoseField((d) => {
                    d.boneAngles.neck = rad * 0.35;
                    d.boneAngles.head = rad * 0.65;
                  }, false);
                }}
                onPointerUp={(e) => {
                  const rad = (Number((e.target as HTMLInputElement).value) * Math.PI) / 180;
                  updatePoseField((d) => {
                    d.boneAngles.neck = rad * 0.35;
                    d.boneAngles.head = rad * 0.65;
                  }, true);
                }}
                onKeyUp={() => updatePoseField(() => {}, true)}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Eye Blinking Section */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-900">Eye Blinking</span>
              <span className="text-[11px] font-mono tabular-nums text-slate-500">
                {Math.round(blink * 100)}% closed
              </span>
            </div>

            <div className="mb-3">
              <label htmlFor="slider-eye-blink" className="sr-only">
                Eye Blink Closure
              </label>
              <input
                id="slider-eye-blink"
                type="range"
                min={0}
                max={100}
                step={2}
                value={Math.round(blink * 100)}
                onChange={(e) => {
                  const val = Number(e.target.value) / 100;
                  updatePoseField((d) => {
                    d.blink = val;
                  }, false);
                }}
                onPointerUp={(e) => {
                  const val = Number((e.target as HTMLInputElement).value) / 100;
                  updatePoseField((d) => {
                    d.blink = val;
                  }, true);
                }}
                onKeyUp={() => updatePoseField(() => {}, true)}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={onInsertQuickBlink}
                className="py-2 px-2.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Stamp Blink</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  updatePoseField(
                    (d) => {
                      d.blink = (d.blink ?? 0) > 0.5 ? 0 : 1;
                    },
                    true,
                    'Toggle Eyes'
                  )
                }
                className="py-2 px-2.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Eye className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{blink > 0.5 ? 'Open Eyes' : 'Close Eyes'}</span>
              </button>
            </div>

            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={autoBlink}
                onChange={(e) => onToggleAutoBlink(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
              />
              <span>Auto-blink naturally during playback</span>
            </label>
          </div>
        </div>
      )}

      {/* TAB 2: BETTER TORSO & SHOULDER CONTROL */}
      {activeTab === 'torso' && (
        <div className="p-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-900">Spine &amp; Torso Control</span>
              <button
                type="button"
                onClick={() =>
                  updatePoseField(
                    (d) => {
                      d.boneAngles.spine = 0;
                      d.boneAngles.pelvis = 0;
                      d.torsoTwist = 0;
                      d.torsoSquash = 0;
                      d.leftShoulderOffset = { x: 0, y: 0 };
                      d.rightShoulderOffset = { x: 0, y: 0 };
                    },
                    true,
                    'Reset Torso'
                  )
                }
                aria-label="Reset torso and shoulders"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                <span>Reset</span>
              </button>
            </div>

            {/* Spine Bend (Lean L / R) */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <label htmlFor="slider-torso-bend" className="font-medium text-slate-700">
                  Torso Bend (Lean)
                </label>
                <span className="font-mono tabular-nums text-slate-500">{spineDeg}°</span>
              </div>
              <input
                id="slider-torso-bend"
                type="range"
                min={-60}
                max={60}
                step={1}
                value={spineDeg}
                onChange={(e) => {
                  const newRad = (Number(e.target.value) * Math.PI) / 180;
                  updatePoseField((d) => {
                    const diff = newRad - (d.boneAngles.spine || 0);
                    d.boneAngles.spine = newRad;
                    if (keepHeadLevel) {
                      d.boneAngles.neck = Math.max(-0.85, Math.min(0.85, (d.boneAngles.neck || 0) - diff * 0.45));
                      d.boneAngles.head = Math.max(-0.95, Math.min(0.95, (d.boneAngles.head || 0) - diff * 0.55));
                    }
                  }, false);
                }}
                onPointerUp={(e) => {
                  const newRad = (Number((e.target as HTMLInputElement).value) * Math.PI) / 180;
                  updatePoseField((d) => {
                    d.boneAngles.spine = newRad;
                  }, true);
                }}
                onKeyUp={() => updatePoseField(() => {}, true)}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Pelvis / Hip Tilt */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <label htmlFor="slider-pelvis-tilt" className="font-medium text-slate-700">
                  Pelvis / Hip Sway
                </label>
                <span className="font-mono tabular-nums text-slate-500">{pelvisDeg}°</span>
              </div>
              <input
                id="slider-pelvis-tilt"
                type="range"
                min={-45}
                max={45}
                step={1}
                value={pelvisDeg}
                onChange={(e) => {
                  const newRad = (Number(e.target.value) * Math.PI) / 180;
                  updatePoseField((d) => {
                    d.boneAngles.pelvis = newRad;
                  }, false);
                }}
                onPointerUp={(e) => {
                  const newRad = (Number((e.target as HTMLInputElement).value) * Math.PI) / 180;
                  updatePoseField((d) => {
                    d.boneAngles.pelvis = newRad;
                  }, true);
                }}
                onKeyUp={() => updatePoseField(() => {}, true)}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            {/* 2.5D Torso Twist */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <label htmlFor="slider-torso-twist" className="font-medium text-slate-700">
                  2.5D Chest Twist
                </label>
                <span className="font-mono tabular-nums text-slate-500">
                  {Math.round(torsoTwist * 100)}%
                </span>
              </div>
              <input
                id="slider-torso-twist"
                type="range"
                min={-100}
                max={100}
                step={2}
                value={Math.round(torsoTwist * 100)}
                onChange={(e) => {
                  const val = Number(e.target.value) / 100;
                  updatePoseField((d) => {
                    d.torsoTwist = val;
                  }, false);
                }}
                onPointerUp={(e) => {
                  const val = Number((e.target as HTMLInputElement).value) / 100;
                  updatePoseField((d) => {
                    d.torsoTwist = val;
                  }, true);
                }}
                onKeyUp={() => updatePoseField(() => {}, true)}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Torso Squash & Stretch / Breathing */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <label htmlFor="slider-torso-squash" className="font-medium text-slate-700">
                  Squash &amp; Stretch (Breath)
                </label>
                <span className="font-mono tabular-nums text-slate-500">
                  {Math.round(torsoSquash * 100)}%
                </span>
              </div>
              <input
                id="slider-torso-squash"
                type="range"
                min={-30}
                max={30}
                step={1}
                value={Math.round(torsoSquash * 100)}
                onChange={(e) => {
                  const val = Number(e.target.value) / 100;
                  updatePoseField((d) => {
                    d.torsoSquash = val;
                  }, false);
                }}
                onPointerUp={(e) => {
                  const val = Number((e.target as HTMLInputElement).value) / 100;
                  updatePoseField((d) => {
                    d.torsoSquash = val;
                  }, true);
                }}
                onKeyUp={() => updatePoseField(() => {}, true)}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Shoulder Shrug */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <label htmlFor="slider-shoulder-shrug" className="font-medium text-slate-700">
                  Shoulder Shrug (Lift / Drop)
                </label>
                <span className="font-mono tabular-nums text-slate-500">{-avgShrugY}px</span>
              </div>
              <input
                id="slider-shoulder-shrug"
                type="range"
                min={-18}
                max={22}
                step={1}
                value={-avgShrugY}
                onChange={(e) => {
                  const shrugLift = Number(e.target.value);
                  updatePoseField((d) => {
                    d.leftShoulderOffset = {
                      x: d.leftShoulderOffset?.x ?? 0,
                      y: -shrugLift,
                    };
                    d.rightShoulderOffset = {
                      x: d.rightShoulderOffset?.x ?? 0,
                      y: -shrugLift,
                    };
                  }, false);
                }}
                onPointerUp={(e) => {
                  const shrugLift = Number((e.target as HTMLInputElement).value);
                  updatePoseField((d) => {
                    d.leftShoulderOffset = {
                      x: d.leftShoulderOffset?.x ?? 0,
                      y: -shrugLift,
                    };
                    d.rightShoulderOffset = {
                      x: d.rightShoulderOffset?.x ?? 0,
                      y: -shrugLift,
                    };
                  }, true);
                }}
                onKeyUp={() => updatePoseField(() => {}, true)}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={keepHeadLevel}
                onChange={(e) => onToggleKeepHeadLevel(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
              />
              <span className="inline-flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                <span>Keep head level when bending torso</span>
              </span>
            </label>
          </div>
        </div>
      )}

      {/* TAB 3: HANDS, WRISTS & ARMS */}
      {activeTab === 'arms' && (
        <div className="p-4 space-y-4">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Drag <strong className="font-semibold text-blue-700">Hands</strong> (dark blue) to rotate
            wrists or pull arms, or drag <strong className="font-semibold text-sky-600">Wrists</strong>{' '}
            (sky blue) for pure 2-bone arm IK.
          </p>

          {/* Right Hand, Wrist & Arm */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-900">Right Hand, Wrist &amp; Arm</span>
              <button
                type="button"
                disabled={!restJoints}
                onClick={() => {
                  if (!restJoints) return;
                  const flipped = flipArmElbowBend(restJoints, currentPose, 'right');
                  onCommitPoseChange(flipped, 'Flip Right Elbow');
                }}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors cursor-pointer whitespace-nowrap"
              >
                <FlipHorizontal2 className="w-3 h-3" aria-hidden="true" />
                <span>Flip Elbow</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {/* Right Wrist / Hand Angle */}
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80">
                <div className="flex items-center justify-between text-xs mb-1">
                  <label htmlFor="slider-r-hand" className="font-semibold text-slate-800">
                    Right Wrist / Hand Angle
                  </label>
                  <span className="font-mono tabular-nums text-blue-700 font-medium">{rHandDeg}°</span>
                </div>
                <input
                  id="slider-r-hand"
                  type="range"
                  min={-135}
                  max={135}
                  step={1}
                  value={rHandDeg}
                  onChange={(e) => {
                    const rad = (Number(e.target.value) * Math.PI) / 180;
                    updatePoseField((d) => {
                      d.boneAngles.rightHandBone = rad;
                    }, false);
                  }}
                  onPointerUp={(e) => {
                    const rad = (Number((e.target as HTMLInputElement).value) * Math.PI) / 180;
                    updatePoseField((d) => {
                      d.boneAngles.rightHandBone = rad;
                    }, true);
                  }}
                  onKeyUp={() => updatePoseField(() => {}, true)}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex items-center gap-1 mt-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      updatePoseField(
                        (d) => {
                          d.boneAngles.rightHandBone = -0.85;
                        },
                        true,
                        'Cock Right Wrist Up'
                      )
                    }
                    className="flex-1 py-1 px-1.5 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Cock Up
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updatePoseField(
                        (d) => {
                          d.boneAngles.rightHandBone = 0;
                        },
                        true,
                        'Straighten Right Wrist'
                      )
                    }
                    className="flex-1 py-1 px-1.5 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Straight
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updatePoseField(
                        (d) => {
                          d.boneAngles.rightHandBone = 0.85;
                        },
                        true,
                        'Flex Right Wrist Down'
                      )
                    }
                    className="flex-1 py-1 px-1.5 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Flex Down
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <label htmlFor="slider-r-lower" className="text-slate-600">
                    Right Elbow / Forearm
                  </label>
                  <span className="font-mono tabular-nums text-slate-500">{rLowerDeg}°</span>
                </div>
                <input
                  id="slider-r-lower"
                  type="range"
                  min={-155}
                  max={155}
                  step={1}
                  value={rLowerDeg}
                  onChange={(e) => {
                    const rad = (Number(e.target.value) * Math.PI) / 180;
                    updatePoseField((d) => {
                      d.boneAngles.rightLowerArm = rad;
                    }, false);
                  }}
                  onPointerUp={(e) => {
                    const rad = (Number((e.target as HTMLInputElement).value) * Math.PI) / 180;
                    updatePoseField((d) => {
                      d.boneAngles.rightLowerArm = rad;
                    }, true);
                  }}
                  onKeyUp={() => updatePoseField(() => {}, true)}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <label htmlFor="slider-r-upper" className="text-slate-600">
                    Right Shoulder / Upper Arm
                  </label>
                  <span className="font-mono tabular-nums text-slate-500">{rUpperDeg}°</span>
                </div>
                <input
                  id="slider-r-upper"
                  type="range"
                  min={-165}
                  max={165}
                  step={1}
                  value={rUpperDeg}
                  onChange={(e) => {
                    const rad = (Number(e.target.value) * Math.PI) / 180;
                    updatePoseField((d) => {
                      d.boneAngles.rightUpperArm = rad;
                    }, false);
                  }}
                  onPointerUp={(e) => {
                    const rad = (Number((e.target as HTMLInputElement).value) * Math.PI) / 180;
                    updatePoseField((d) => {
                      d.boneAngles.rightUpperArm = rad;
                    }, true);
                  }}
                  onKeyUp={() => updatePoseField(() => {}, true)}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Left Hand, Wrist & Arm */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-900">Left Hand, Wrist &amp; Arm</span>
              <button
                type="button"
                disabled={!restJoints}
                onClick={() => {
                  if (!restJoints) return;
                  const flipped = flipArmElbowBend(restJoints, currentPose, 'left');
                  onCommitPoseChange(flipped, 'Flip Left Elbow');
                }}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors cursor-pointer whitespace-nowrap"
              >
                <FlipHorizontal2 className="w-3 h-3" aria-hidden="true" />
                <span>Flip Elbow</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {/* Left Wrist / Hand Angle */}
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80">
                <div className="flex items-center justify-between text-xs mb-1">
                  <label htmlFor="slider-l-hand" className="font-semibold text-slate-800">
                    Left Wrist / Hand Angle
                  </label>
                  <span className="font-mono tabular-nums text-blue-700 font-medium">{lHandDeg}°</span>
                </div>
                <input
                  id="slider-l-hand"
                  type="range"
                  min={-135}
                  max={135}
                  step={1}
                  value={lHandDeg}
                  onChange={(e) => {
                    const rad = (Number(e.target.value) * Math.PI) / 180;
                    updatePoseField((d) => {
                      d.boneAngles.leftHandBone = rad;
                    }, false);
                  }}
                  onPointerUp={(e) => {
                    const rad = (Number((e.target as HTMLInputElement).value) * Math.PI) / 180;
                    updatePoseField((d) => {
                      d.boneAngles.leftHandBone = rad;
                    }, true);
                  }}
                  onKeyUp={() => updatePoseField(() => {}, true)}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex items-center gap-1 mt-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      updatePoseField(
                        (d) => {
                          d.boneAngles.leftHandBone = 0.85;
                        },
                        true,
                        'Cock Left Wrist Up'
                      )
                    }
                    className="flex-1 py-1 px-1.5 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Cock Up
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updatePoseField(
                        (d) => {
                          d.boneAngles.leftHandBone = 0;
                        },
                        true,
                        'Straighten Left Wrist'
                      )
                    }
                    className="flex-1 py-1 px-1.5 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Straight
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updatePoseField(
                        (d) => {
                          d.boneAngles.leftHandBone = -0.85;
                        },
                        true,
                        'Flex Left Wrist Down'
                      )
                    }
                    className="flex-1 py-1 px-1.5 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Flex Down
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <label htmlFor="slider-l-lower" className="text-slate-600">
                    Left Elbow / Forearm
                  </label>
                  <span className="font-mono tabular-nums text-slate-500">{lLowerDeg}°</span>
                </div>
                <input
                  id="slider-l-lower"
                  type="range"
                  min={-155}
                  max={155}
                  step={1}
                  value={lLowerDeg}
                  onChange={(e) => {
                    const rad = (Number(e.target.value) * Math.PI) / 180;
                    updatePoseField((d) => {
                      d.boneAngles.leftLowerArm = rad;
                    }, false);
                  }}
                  onPointerUp={(e) => {
                    const rad = (Number((e.target as HTMLInputElement).value) * Math.PI) / 180;
                    updatePoseField((d) => {
                      d.boneAngles.leftLowerArm = rad;
                    }, true);
                  }}
                  onKeyUp={() => updatePoseField(() => {}, true)}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <label htmlFor="slider-l-upper" className="text-slate-600">
                    Left Shoulder / Upper Arm
                  </label>
                  <span className="font-mono tabular-nums text-slate-500">{lUpperDeg}°</span>
                </div>
                <input
                  id="slider-l-upper"
                  type="range"
                  min={-165}
                  max={165}
                  step={1}
                  value={lUpperDeg}
                  onChange={(e) => {
                    const rad = (Number(e.target.value) * Math.PI) / 180;
                    updatePoseField((d) => {
                      d.boneAngles.leftUpperArm = rad;
                    }, false);
                  }}
                  onPointerUp={(e) => {
                    const rad = (Number((e.target as HTMLInputElement).value) * Math.PI) / 180;
                    updatePoseField((d) => {
                      d.boneAngles.leftUpperArm = rad;
                    }, true);
                  }}
                  onKeyUp={() => updatePoseField(() => {}, true)}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FEET, ANKLES & LEGS */}
      {activeTab === 'legs' && (
        <div className="p-4 space-y-4">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Drag <strong className="font-semibold text-blue-700">Feet</strong> (dark blue) to flex
            ankles or pull legs, or drag <strong className="font-semibold text-sky-600">Ankles</strong>{' '}
            (sky blue) for pure 2-bone leg IK.
          </p>

          {/* Right Foot, Ankle & Leg */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-900">Right Foot, Ankle &amp; Leg</span>
              <button
                type="button"
                disabled={!restJoints}
                onClick={() => {
                  if (!restJoints) return;
                  const flipped = flipLegKneeBend(restJoints, currentPose, 'right');
                  onCommitPoseChange(flipped, 'Flip Right Knee');
                }}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors cursor-pointer whitespace-nowrap"
              >
                <FlipHorizontal2 className="w-3 h-3" aria-hidden="true" />
                <span>Flip Knee</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {/* Right Ankle / Foot Angle */}
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80">
                <div className="flex items-center justify-between text-xs mb-1">
                  <label htmlFor="slider-r-foot" className="font-semibold text-slate-800">
                    Right Ankle / Foot Angle
                  </label>
                  <span className="font-mono tabular-nums text-blue-700 font-medium">{rFootDeg}°</span>
                </div>
                <input
                  id="slider-r-foot"
                  type="range"
                  min={-120}
                  max={120}
                  step={1}
                  value={rFootDeg}
                  onChange={(e) => {
                    const rad = (Number(e.target.value) * Math.PI) / 180;
                    updatePoseField((d) => {
                      d.boneAngles.rightFootBone = rad;
                    }, false);
                  }}
                  onPointerUp={(e) => {
                    const rad = (Number((e.target as HTMLInputElement).value) * Math.PI) / 180;
                    updatePoseField((d) => {
                      d.boneAngles.rightFootBone = rad;
                    }, true);
                  }}
                  onKeyUp={() => updatePoseField(() => {}, true)}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex items-center gap-1 mt-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      updatePoseField(
                        (d) => {
                          d.boneAngles.rightFootBone = -0.65;
                        },
                        true,
                        'Flex Right Foot Up'
                      )
                    }
                    className="flex-1 py-1 px-1.5 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Flex Up
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updatePoseField(
                        (d) => {
                          d.boneAngles.rightFootBone = 0;
                        },
                        true,
                        'Flat Right Foot'
                      )
                    }
                    className="flex-1 py-1 px-1.5 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Flat Foot
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updatePoseField(
                        (d) => {
                          d.boneAngles.rightFootBone = 0.65;
                        },
                        true,
                        'Point Right Toe'
                      )
                    }
                    className="flex-1 py-1 px-1.5 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Point Toe
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <label htmlFor="slider-r-shin" className="text-slate-600">
                    Right Knee / Shin
                  </label>
                  <span className="font-mono tabular-nums text-slate-500">{rShinDeg}°</span>
                </div>
                <input
                  id="slider-r-shin"
                  type="range"
                  min={-155}
                  max={155}
                  step={1}
                  value={rShinDeg}
                  onChange={(e) => {
                    const rad = (Number(e.target.value) * Math.PI) / 180;
                    updatePoseField((d) => {
                      d.boneAngles.rightShin = rad;
                    }, false);
                  }}
                  onPointerUp={(e) => {
                    const rad = (Number((e.target as HTMLInputElement).value) * Math.PI) / 180;
                    updatePoseField((d) => {
                      d.boneAngles.rightShin = rad;
                    }, true);
                  }}
                  onKeyUp={() => updatePoseField(() => {}, true)}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <label htmlFor="slider-r-thigh" className="text-slate-600">
                    Right Hip / Thigh
                  </label>
                  <span className="font-mono tabular-nums text-slate-500">{rThighDeg}°</span>
                </div>
                <input
                  id="slider-r-thigh"
                  type="range"
                  min={-145}
                  max={145}
                  step={1}
                  value={rThighDeg}
                  onChange={(e) => {
                    const rad = (Number(e.target.value) * Math.PI) / 180;
                    updatePoseField((d) => {
                      d.boneAngles.rightThigh = rad;
                    }, false);
                  }}
                  onPointerUp={(e) => {
                    const rad = (Number((e.target as HTMLInputElement).value) * Math.PI) / 180;
                    updatePoseField((d) => {
                      d.boneAngles.rightThigh = rad;
                    }, true);
                  }}
                  onKeyUp={() => updatePoseField(() => {}, true)}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Left Foot, Ankle & Leg */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-900">Left Foot, Ankle &amp; Leg</span>
              <button
                type="button"
                disabled={!restJoints}
                onClick={() => {
                  if (!restJoints) return;
                  const flipped = flipLegKneeBend(restJoints, currentPose, 'left');
                  onCommitPoseChange(flipped, 'Flip Left Knee');
                }}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors cursor-pointer whitespace-nowrap"
              >
                <FlipHorizontal2 className="w-3 h-3" aria-hidden="true" />
                <span>Flip Knee</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {/* Left Ankle / Foot Angle */}
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80">
                <div className="flex items-center justify-between text-xs mb-1">
                  <label htmlFor="slider-l-foot" className="font-semibold text-slate-800">
                    Left Ankle / Foot Angle
                  </label>
                  <span className="font-mono tabular-nums text-blue-700 font-medium">{lFootDeg}°</span>
                </div>
                <input
                  id="slider-l-foot"
                  type="range"
                  min={-120}
                  max={120}
                  step={1}
                  value={lFootDeg}
                  onChange={(e) => {
                    const rad = (Number(e.target.value) * Math.PI) / 180;
                    updatePoseField((d) => {
                      d.boneAngles.leftFootBone = rad;
                    }, false);
                  }}
                  onPointerUp={(e) => {
                    const rad = (Number((e.target as HTMLInputElement).value) * Math.PI) / 180;
                    updatePoseField((d) => {
                      d.boneAngles.leftFootBone = rad;
                    }, true);
                  }}
                  onKeyUp={() => updatePoseField(() => {}, true)}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex items-center gap-1 mt-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      updatePoseField(
                        (d) => {
                          d.boneAngles.leftFootBone = 0.65;
                        },
                        true,
                        'Flex Left Foot Up'
                      )
                    }
                    className="flex-1 py-1 px-1.5 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Flex Up
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updatePoseField(
                        (d) => {
                          d.boneAngles.leftFootBone = 0;
                        },
                        true,
                        'Flat Left Foot'
                      )
                    }
                    className="flex-1 py-1 px-1.5 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Flat Foot
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updatePoseField(
                        (d) => {
                          d.boneAngles.leftFootBone = -0.65;
                        },
                        true,
                        'Point Left Toe'
                      )
                    }
                    className="flex-1 py-1 px-1.5 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Point Toe
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <label htmlFor="slider-l-shin" className="text-slate-600">
                    Left Knee / Shin
                  </label>
                  <span className="font-mono tabular-nums text-slate-500">{lShinDeg}°</span>
                </div>
                <input
                  id="slider-l-shin"
                  type="range"
                  min={-155}
                  max={155}
                  step={1}
                  value={lShinDeg}
                  onChange={(e) => {
                    const rad = (Number(e.target.value) * Math.PI) / 180;
                    updatePoseField((d) => {
                      d.boneAngles.leftShin = rad;
                    }, false);
                  }}
                  onPointerUp={(e) => {
                    const rad = (Number((e.target as HTMLInputElement).value) * Math.PI) / 180;
                    updatePoseField((d) => {
                      d.boneAngles.leftShin = rad;
                    }, true);
                  }}
                  onKeyUp={() => updatePoseField(() => {}, true)}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <label htmlFor="slider-l-thigh" className="text-slate-600">
                    Left Hip / Thigh
                  </label>
                  <span className="font-mono tabular-nums text-slate-500">{lThighDeg}°</span>
                </div>
                <input
                  id="slider-l-thigh"
                  type="range"
                  min={-145}
                  max={145}
                  step={1}
                  value={lThighDeg}
                  onChange={(e) => {
                    const rad = (Number(e.target.value) * Math.PI) / 180;
                    updatePoseField((d) => {
                      d.boneAngles.leftThigh = rad;
                    }, false);
                  }}
                  onPointerUp={(e) => {
                    const rad = (Number((e.target as HTMLInputElement).value) * Math.PI) / 180;
                    updatePoseField((d) => {
                      d.boneAngles.leftThigh = rad;
                    }, true);
                  }}
                  onKeyUp={() => updatePoseField(() => {}, true)}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
