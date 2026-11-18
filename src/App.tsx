/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { CharacterStage, WorkspaceMode } from './components/CharacterStage';
import { KeyframeTimeline } from './components/KeyframeTimeline';
import { LeftSidebar } from './components/LeftSidebar';
import { ExportModal, GuideModal } from './components/Modals';
import { PoseControlPanel } from './components/PoseControlPanel';
import { TopBar } from './components/TopBar';
import {
  LoadedCharacterBundle,
  loadAndAutoRigPng,
  rebindRigWithUpdatedJoints,
} from './engine/pngLoader';
import { autoDetectJointsFromAlpha, clonePose, createRestPose } from './engine/rigging';
import {
  STARTER_CHARACTERS,
  StarterCharacterSpec,
  generateStarterPngDataUrl,
} from './engine/starterCharacters';
import {
  createStarterWaveAnimation,
  insertQuickBlinkKeyframes,
  moveKeyframeTime,
  sampleTimelineAtTime,
  sortKeyframes,
  upsertKeyframeAtTime,
} from './engine/timeline';
import { EasingType, Keyframe, PosePreset, PoseState, RestJoints } from './engine/types';

interface HistoryEntry {
  keyframes: Keyframe[];
  currentTime: number;
  selectedKeyframeId: string | null;
}

export default function App() {
  const [bundle, setBundle] = useState<LoadedCharacterBundle | null>(null);
  const [activeStarterId, setActiveStarterId] = useState<string | null>(STARTER_CHARACTERS[0].id);
  const [sourceImageInfo, setSourceImageInfo] = useState<{ url: string; name: string } | null>(
    null
  );
  const [autoRemoveBg, setAutoRemoveBg] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Navigation & Modals
  const [activeSidebarSection, setActiveSidebarSection] = useState<'characters' | 'presets'>(
    'characters'
  );
  const [mode, setMode] = useState<WorkspaceMode>('animate');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Expression & IK Rig Preferences
  const [autoBlink, setAutoBlink] = useState<boolean>(true);
  const [keepHeadLevel, setKeepHeadLevel] = useState<boolean>(true);

  // Timeline & Pose State
  const initialKeyframes = useRef<Keyframe[]>(createStarterWaveAnimation()).current;
  const [keyframes, setKeyframes] = useState<Keyframe[]>(initialKeyframes);
  const [selectedKeyframeId, setSelectedKeyframeId] = useState<string | null>(
    initialKeyframes[1]?.id ?? initialKeyframes[0]?.id ?? null
  );
  const [duration, setDuration] = useState<number>(2.0);
  const [currentTime, setCurrentTime] = useState<number>(0.5);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [loop, setLoop] = useState<boolean>(true);

  // Live pose while dragging (before pointerUp commits to keyframe + undo history)
  const [liveDragPose, setLiveDragPose] = useState<PoseState | null>(null);

  // Undo / Redo History
  const [past, setPast] = useState<HistoryEntry[]>([]);
  const [future, setFuture] = useState<HistoryEntry[]>([]);

  const pushHistory = useCallback(
    (nextKeyframes: Keyframe[], nextTime: number, nextSelectedId: string | null) => {
      setPast((prev) => [
        ...prev.slice(-29),
        {
          keyframes: keyframes.map((k) => ({ ...k, pose: clonePose(k.pose) })),
          currentTime,
          selectedKeyframeId,
        },
      ]);
      setFuture([]);
      setKeyframes(nextKeyframes);
      setCurrentTime(nextTime);
      setSelectedKeyframeId(nextSelectedId);
    },
    [keyframes, currentTime, selectedKeyframeId]
  );

  const handleUndo = useCallback(() => {
    setPast((prev) => {
      if (prev.length === 0) return prev;
      const previous = prev[prev.length - 1];
      setFuture((f) => [
        {
          keyframes: keyframes.map((k) => ({ ...k, pose: clonePose(k.pose) })),
          currentTime,
          selectedKeyframeId,
        },
        ...f,
      ]);
      setKeyframes(previous.keyframes);
      setCurrentTime(previous.currentTime);
      setSelectedKeyframeId(previous.selectedKeyframeId);
      setLiveDragPose(null);
      return prev.slice(0, -1);
    });
  }, [keyframes, currentTime, selectedKeyframeId]);

  const handleRedo = useCallback(() => {
    setFuture((prev) => {
      if (prev.length === 0) return prev;
      const next = prev[0];
      setPast((p) => [
        ...p,
        {
          keyframes: keyframes.map((k) => ({ ...k, pose: clonePose(k.pose) })),
          currentTime,
          selectedKeyframeId,
        },
      ]);
      setKeyframes(next.keyframes);
      setCurrentTime(next.currentTime);
      setSelectedKeyframeId(next.selectedKeyframeId);
      setLiveDragPose(null);
      return prev.slice(1);
    });
  }, [keyframes, currentTime, selectedKeyframeId]);

  // Load initial starter PNG character through the real PNG auto-rig pipeline
  useEffect(() => {
    const starter = STARTER_CHARACTERS[0];
    const dataUrl = generateStarterPngDataUrl(starter);
    setSourceImageInfo({ url: dataUrl, name: starter.name });
    loadAndAutoRigPng(dataUrl, starter.name, { autoRemoveOpaqueBg: true })
      .then((loaded) => setBundle(loaded))
      .catch((err) => setErrorMessage(err instanceof Error ? err.message : 'Failed to load PNG'));
  }, []);

  const handleSelectStarter = useCallback(
    async (spec: StarterCharacterSpec) => {
      try {
        setErrorMessage(null);
        setIsPlaying(false);
        const dataUrl = generateStarterPngDataUrl(spec);
        setActiveStarterId(spec.id);
        setSourceImageInfo({ url: dataUrl, name: spec.name });
        const loaded = await loadAndAutoRigPng(dataUrl, spec.name, {
          autoRemoveOpaqueBg: autoRemoveBg,
        });
        setBundle(loaded);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Could not rig starter PNG.');
      }
    },
    [autoRemoveBg]
  );

  const handleUploadFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        setErrorMessage('Please choose a valid PNG, WebP, or JPEG character image.');
        return;
      }
      try {
        setErrorMessage(null);
        setIsPlaying(false);
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('Failed to read uploaded file.'));
          reader.readAsDataURL(file);
        });

        const cleanName = file.name.replace(/\.[^.]+$/, '') || 'Custom Character';
        setActiveStarterId(null);
        setSourceImageInfo({ url: dataUrl, name: cleanName });

        const loaded = await loadAndAutoRigPng(dataUrl, cleanName, {
          autoRemoveOpaqueBg: autoRemoveBg,
        });
        setBundle(loaded);
        setMode('animate');
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Could not auto-rig uploaded PNG.');
      }
    },
    [autoRemoveBg]
  );

  const handleToggleAutoRemoveBg = useCallback(
    async (checked: boolean) => {
      setAutoRemoveBg(checked);
      if (!sourceImageInfo) return;
      try {
        const loaded = await loadAndAutoRigPng(sourceImageInfo.url, sourceImageInfo.name, {
          autoRemoveOpaqueBg: checked,
        });
        setBundle(loaded);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Failed to update background cutout.');
      }
    },
    [sourceImageInfo]
  );

  // Playback loop (only runs while isPlaying === true, throttled cleanly to ~30fps for smooth CPU rendering)
  const playbackRef = useRef<{ lastTs: number; accum: number; time: number }>({
    lastTs: 0,
    accum: 0,
    time: 0,
  });
  useEffect(() => {
    if (!isPlaying) return;
    playbackRef.current = { lastTs: performance.now(), accum: 0, time: currentTime };
    let rafId = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - playbackRef.current.lastTs) / 1000);
      playbackRef.current.lastTs = now;
      playbackRef.current.accum += dt;

      if (playbackRef.current.accum >= 1 / 30) {
        const step = playbackRef.current.accum;
        playbackRef.current.accum = 0;
        let nextT = playbackRef.current.time + step;

        if (nextT >= duration) {
          if (loop) {
            nextT = nextT % duration;
          } else {
            setCurrentTime(duration);
            setIsPlaying(false);
            return;
          }
        }
        playbackRef.current.time = nextT;
        setCurrentTime(nextT);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, duration, loop]);

  // Keyboard shortcuts (Space = Play/Pause, Ctrl/Cmd+Z = Undo, Delete = Delete Keyframe)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')
      ) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedKeyframeId) {
        if (keyframes.length > 1) {
          e.preventDefault();
          const remaining = keyframes.filter((k) => k.id !== selectedKeyframeId);
          pushHistory(remaining, currentTime, remaining[0]?.id ?? null);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo, selectedKeyframeId, keyframes, currentTime, pushHistory]);

  const sampledPose = sampleTimelineAtTime(keyframes, currentTime, duration, loop);
  const effectivePose = liveDragPose ?? sampledPose;

  // Stage & Timeline Handlers
  const handleLivePoseChange = useCallback((pose: PoseState) => {
    setIsPlaying(false);
    setLiveDragPose(pose);
  }, []);

  const handleCommitPoseChange = useCallback(
    (pose: PoseState) => {
      setLiveDragPose(null);
      const { keyframes: updated, activeId } = upsertKeyframeAtTime(keyframes, currentTime, pose);
      pushHistory(updated, Math.round(currentTime * 20) / 20, activeId);
    },
    [keyframes, currentTime, pushHistory]
  );

  const handleCommitInspectorPoseChange = useCallback(
    (pose: PoseState, label?: string) => {
      setIsPlaying(false);
      setLiveDragPose(null);
      const { keyframes: updated, activeId } = upsertKeyframeAtTime(
        keyframes,
        currentTime,
        pose,
        label ? { label } : undefined
      );
      pushHistory(updated, Math.round(currentTime * 20) / 20, activeId);
    },
    [keyframes, currentTime, pushHistory]
  );

  const handleInsertQuickBlink = useCallback(() => {
    setIsPlaying(false);
    setLiveDragPose(null);
    const { keyframes: updated, activeId } = insertQuickBlinkKeyframes(
      keyframes,
      currentTime,
      duration,
      effectivePose
    );
    const closedKf = updated.find((k) => k.id === activeId);
    pushHistory(updated, closedKf?.time ?? currentTime, activeId);
  }, [keyframes, currentTime, duration, effectivePose, pushHistory]);

  const handleCommitAdjustedJoints = useCallback(
    (joints: RestJoints) => {
      if (!bundle) return;
      setBundle(rebindRigWithUpdatedJoints(bundle, joints));
    },
    [bundle]
  );

  const handleAutoRedetectRig = useCallback(() => {
    if (!bundle) return;
    const redetected = autoDetectJointsFromAlpha(
      bundle.rgba,
      bundle.rig.width,
      bundle.rig.height
    );
    setBundle(rebindRigWithUpdatedJoints(bundle, redetected));
  }, [bundle]);

  const handleResetPose = useCallback(() => {
    setIsPlaying(false);
    const rest = createRestPose();
    const { keyframes: updated, activeId } = upsertKeyframeAtTime(keyframes, currentTime, rest, {
      label: 'Rest',
    });
    pushHistory(updated, currentTime, activeId);
  }, [keyframes, currentTime, pushHistory]);

  const handleApplyPresetAtPlayhead = useCallback(
    (preset: PosePreset) => {
      setIsPlaying(false);
      setMode('animate');
      const { keyframes: updated, activeId } = upsertKeyframeAtTime(
        keyframes,
        currentTime,
        preset.pose,
        { label: preset.name }
      );
      pushHistory(updated, Math.round(currentTime * 20) / 20, activeId);
    },
    [keyframes, currentTime, pushHistory]
  );

  const handleDropPresetAtTime = useCallback(
    (preset: PosePreset, dropTime: number) => {
      setIsPlaying(false);
      setMode('animate');
      const { keyframes: updated, activeId } = upsertKeyframeAtTime(
        keyframes,
        dropTime,
        preset.pose,
        { label: preset.name }
      );
      pushHistory(updated, dropTime, activeId);
    },
    [keyframes, pushHistory]
  );

  const handleLoadWaveDemo = useCallback(() => {
    setIsPlaying(false);
    setMode('animate');
    const demo = createStarterWaveAnimation();
    pushHistory(demo, 0.5, demo[1]?.id ?? null);
  }, [pushHistory]);

  return (
    <div
      data-state={isPlaying ? 'playing' : mode}
      className="min-h-screen lg:h-screen flex flex-col bg-slate-50 text-slate-900 overflow-x-hidden lg:overflow-hidden"
    >
      <TopBar
        activeSection={activeSidebarSection}
        onSelectSection={setActiveSidebarSection}
        onOpenExport={() => {
          setIsPlaying(false);
          setIsExportOpen(true);
        }}
        onOpenGuide={() => setIsGuideOpen(true)}
        onUploadFile={handleUploadFile}
      />

      {errorMessage && (
        <div
          role="alert"
          className="bg-red-50 border-b border-red-200 px-6 py-2.5 flex items-center justify-between gap-4 text-xs text-red-800 shrink-0"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            aria-label="Dismiss error message"
            className="p-1 text-red-600 hover:bg-red-100 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      <main className="flex-1 flex flex-col lg:flex-row min-h-0">
        <LeftSidebar
          activeSection={activeSidebarSection}
          onSelectSection={setActiveSidebarSection}
          rig={bundle?.rig ?? null}
          activeStarterId={activeStarterId}
          autoRemoveBg={autoRemoveBg}
          onToggleAutoRemoveBg={handleToggleAutoRemoveBg}
          onSelectStarter={handleSelectStarter}
          onUploadFile={handleUploadFile}
          onApplyPresetAtPlayhead={handleApplyPresetAtPlayhead}
          onLoadWaveDemo={handleLoadWaveDemo}
        />

        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex-1 flex flex-col lg:flex-row min-w-0 min-h-0">
            <CharacterStage
              bundle={bundle}
              mode={mode}
              onChangeMode={(nextMode) => {
                setIsPlaying(false);
                setMode(nextMode);
              }}
              currentPose={effectivePose}
              onLivePoseChange={handleLivePoseChange}
              onCommitPoseChange={handleCommitPoseChange}
              onCommitAdjustedJoints={handleCommitAdjustedJoints}
              onAutoRedetectRig={handleAutoRedetectRig}
              onResetPose={handleResetPose}
              canUndo={past.length > 0}
              canRedo={future.length > 0}
              onUndo={handleUndo}
              onRedo={handleRedo}
              isPlaying={isPlaying}
              keyframes={keyframes}
              currentTime={currentTime}
              autoBlink={autoBlink}
              keepHeadLevel={keepHeadLevel}
              onDropPngFile={handleUploadFile}
              onOpenExport={() => {
                setIsPlaying(false);
                setIsExportOpen(true);
              }}
            />

            <PoseControlPanel
              restJoints={bundle?.rig.restJoints ?? null}
              currentPose={effectivePose}
              onLivePoseChange={handleLivePoseChange}
              onCommitPoseChange={handleCommitInspectorPoseChange}
              onInsertQuickBlink={handleInsertQuickBlink}
              autoBlink={autoBlink}
              onToggleAutoBlink={setAutoBlink}
              keepHeadLevel={keepHeadLevel}
              onToggleKeepHeadLevel={setKeepHeadLevel}
            />
          </div>

          <KeyframeTimeline
            keyframes={keyframes}
            selectedKeyframeId={selectedKeyframeId}
            currentTime={currentTime}
            duration={duration}
            isPlaying={isPlaying}
            loop={loop}
            onTogglePlay={() => {
              if (!isPlaying && mode === 'rig') {
                setMode('animate');
              }
              if (!isPlaying && currentTime >= duration - 0.01) {
                setCurrentTime(0);
              }
              setIsPlaying((p) => !p);
            }}
            onSeek={(t) => {
              setIsPlaying(false);
              setLiveDragPose(null);
              setCurrentTime(t);
              const hit = keyframes.find((k) => Math.abs(k.time - t) < 0.03);
              if (hit) setSelectedKeyframeId(hit.id);
            }}
            onToggleLoop={() => setLoop((l) => !l)}
            onChangeDuration={(newDur) => {
              setIsPlaying(false);
              setDuration(newDur);
              if (currentTime > newDur) setCurrentTime(newDur);
            }}
            onSelectKeyframe={(kf) => {
              setIsPlaying(false);
              setLiveDragPose(null);
              setSelectedKeyframeId(kf.id);
              setCurrentTime(kf.time);
            }}
            onAddKeyframeAtPlayhead={() => {
              setIsPlaying(false);
              const { keyframes: updated, activeId } = upsertKeyframeAtTime(
                keyframes,
                currentTime,
                effectivePose
              );
              pushHistory(updated, Math.round(currentTime * 20) / 20, activeId);
            }}
            onDuplicateSelectedKeyframe={() => {
              setIsPlaying(false);
              const sel = keyframes.find((k) => k.id === selectedKeyframeId);
              if (!sel) return;
              const dupTime = Math.min(duration, Math.round((sel.time + 0.25) * 20) / 20);
              const newKf: Keyframe = {
                id: `kf_${Date.now()}`,
                time: dupTime,
                label: sel.label ? `${sel.label} Copy` : undefined,
                pose: clonePose(sel.pose),
                easing: sel.easing,
              };
              const merged = moveKeyframeTime(
                sortKeyframes([...keyframes, newKf]),
                newKf.id,
                dupTime,
                duration
              );
              const placed = merged.find((k) => k.id === newKf.id);
              pushHistory(merged, placed?.time ?? dupTime, newKf.id);
            }}
            onDeleteSelectedKeyframe={() => {
              if (!selectedKeyframeId || keyframes.length <= 1) return;
              setIsPlaying(false);
              const remaining = keyframes.filter((k) => k.id !== selectedKeyframeId);
              pushHistory(remaining, currentTime, remaining[0]?.id ?? null);
            }}
            onChangeSelectedEasing={(easing: EasingType) => {
              if (!selectedKeyframeId) return;
              const updated = keyframes.map((k) =>
                k.id === selectedKeyframeId ? { ...k, easing } : k
              );
              pushHistory(updated, currentTime, selectedKeyframeId);
            }}
            onMoveKeyframeTime={(id, newTime) => {
              setIsPlaying(false);
              const moved = moveKeyframeTime(keyframes, id, newTime, duration);
              const movedKf = moved.find((k) => k.id === id);
              setKeyframes(moved);
              if (movedKf) setCurrentTime(movedKf.time);
            }}
            onDropPresetAtTime={handleDropPresetAtTime}
          />
        </div>
      </main>

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        bundle={bundle}
        currentPose={effectivePose}
        keyframes={keyframes}
        duration={duration}
        loop={loop}
        autoBlink={autoBlink}
      />

      <GuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
}
