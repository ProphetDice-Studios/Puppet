import React, { useRef, useState } from 'react';
import {
  Copy,
  Pause,
  Play,
  Plus,
  Repeat,
  SkipBack,
  Trash2,
} from 'lucide-react';
import { POSE_PRESETS } from '../engine/timeline';
import { EasingType, Keyframe, PosePreset } from '../engine/types';

interface KeyframeTimelineProps {
  keyframes: Keyframe[];
  selectedKeyframeId: string | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  loop: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onToggleLoop: () => void;
  onChangeDuration: (duration: number) => void;
  onSelectKeyframe: (kf: Keyframe) => void;
  onAddKeyframeAtPlayhead: () => void;
  onDuplicateSelectedKeyframe: () => void;
  onDeleteSelectedKeyframe: () => void;
  onChangeSelectedEasing: (easing: EasingType) => void;
  onMoveKeyframeTime: (id: string, newTime: number) => void;
  onDropPresetAtTime: (preset: PosePreset, time: number) => void;
}

export const KeyframeTimeline: React.FC<KeyframeTimelineProps> = ({
  keyframes,
  selectedKeyframeId,
  currentTime,
  duration,
  isPlaying,
  loop,
  onTogglePlay,
  onSeek,
  onToggleLoop,
  onChangeDuration,
  onSelectKeyframe,
  onAddKeyframeAtPlayhead,
  onDuplicateSelectedKeyframe,
  onDeleteSelectedKeyframe,
  onChangeSelectedEasing,
  onMoveKeyframeTime,
  onDropPresetAtTime,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dropPreviewTime, setDropPreviewTime] = useState<number | null>(null);
  const draggingKfRef = useRef<string | null>(null);
  const isScrubbingRef = useRef(false);

  const selectedKeyframe = keyframes.find((k) => k.id === selectedKeyframeId) || null;

  const clientXToTime = (clientX: number): number => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
    return Math.round(ratio * duration * 20) / 20;
  };

  // Generate ruler tick marks every 0.25s
  const tickCount = Math.round(duration * 4);
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => i * 0.25);

  return (
    <section
      aria-label="Keyframe Timeline Editor"
      className="bg-white border-t border-slate-200 px-5 py-3.5 shrink-0 select-none"
    >
      {/* Top Transport & Keyframe Controls Row */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
        {/* Left: Playback Transport */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                <span>Play</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSeek(0)}
            aria-label="Jump to start (0.00s)"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <SkipBack className="w-4 h-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onToggleLoop}
            aria-pressed={loop}
            aria-label="Loop playback"
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              loop
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Loop</span>
          </button>

          <div
            aria-live="off"
            className="px-2.5 py-1 text-xs font-mono tabular-nums text-slate-700 bg-slate-100 rounded-md"
          >
            {currentTime.toFixed(2)}s / {duration.toFixed(1)}s
          </div>

          <label className="hidden md:inline-flex items-center gap-1.5 text-xs text-slate-600 ml-1">
            <span>Length</span>
            <select
              aria-label="Animation duration"
              value={duration}
              onChange={(e) => onChangeDuration(Number(e.target.value))}
              className="py-1 px-2 text-xs font-mono tabular-nums bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-2 focus:outline-blue-600"
            >
              <option value={1.5}>1.5s</option>
              <option value={2.0}>2.0s</option>
              <option value={3.0}>3.0s</option>
              <option value={4.0}>4.0s</option>
            </select>
          </label>
        </div>

        {/* Right: Keyframe Editing Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onAddKeyframeAtPlayhead}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Add Keyframe</span>
          </button>

          <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
            <span className="hidden sm:inline">Motion</span>
            <select
              aria-label="Selected keyframe motion easing"
              value={selectedKeyframe?.easing ?? 'smooth'}
              disabled={!selectedKeyframe}
              onChange={(e) => onChangeSelectedEasing(e.target.value as EasingType)}
              className="py-1.5 px-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-800 disabled:opacity-45"
            >
              <option value="smooth">Smooth Ease</option>
              <option value="bouncy">Bouncy Spring</option>
              <option value="linear">Constant Linear</option>
              <option value="step">Instant Snap</option>
            </select>
          </label>

          <button
            type="button"
            onClick={onDuplicateSelectedKeyframe}
            disabled={!selectedKeyframe}
            aria-label="Duplicate selected keyframe"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Duplicate</span>
          </button>

          <button
            type="button"
            onClick={onDeleteSelectedKeyframe}
            disabled={!selectedKeyframe || keyframes.length <= 1}
            aria-label="Delete selected keyframe"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-white border border-slate-200 hover:bg-red-50 hover:border-red-200 rounded-lg disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>
      </div>

      {/* Drag-and-Drop Timeline Track */}
      <div className="px-2">
        <div
          ref={trackRef}
          data-testid="timeline-track"
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest('[data-keyframe-pill]')) return;
            isScrubbingRef.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            onSeek(clientXToTime(e.clientX));
          }}
          onPointerMove={(e) => {
            if (isScrubbingRef.current) {
              onSeek(clientXToTime(e.clientX));
            }
          }}
          onPointerUp={() => {
            isScrubbingRef.current = false;
          }}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes('application/x-puppetdrop-preset')) {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
              setDropPreviewTime(clientXToTime(e.clientX));
            }
          }}
          onDragLeave={() => setDropPreviewTime(null)}
          onDrop={(e) => {
            const presetId = e.dataTransfer.getData('application/x-puppetdrop-preset');
            setDropPreviewTime(null);
            if (!presetId) return;
            e.preventDefault();
            const preset = POSE_PRESETS.find((p) => p.id === presetId);
            if (preset) {
              onDropPresetAtTime(preset, clientXToTime(e.clientX));
            }
          }}
          className="relative h-20 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer overflow-visible"
        >
          {/* Ruler Ticks */}
          <div className="absolute inset-x-0 top-0 h-7 border-b border-slate-200/80 pointer-events-none">
            {ticks.map((t) => {
              const pct = (t / duration) * 100;
              const isWhole = Math.abs(t - Math.round(t)) < 1e-4;
              const isHalf = Math.abs(t * 2 - Math.round(t * 2)) < 1e-4;
              return (
                <div
                  key={t}
                  style={{ left: `${pct}%` }}
                  className="absolute top-0 bottom-0 -translate-x-1/2 flex flex-col items-center"
                >
                  <div
                    className={`w-px ${
                      isWhole
                        ? 'h-3 bg-slate-400'
                        : isHalf
                        ? 'h-2 bg-slate-300'
                        : 'h-1.5 bg-slate-200'
                    }`}
                  />
                  {(isWhole || isHalf) && (
                    <span className="text-[10px] font-mono tabular-nums text-slate-500 mt-0.5">
                      {t.toFixed(1)}s
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Interpolation Span Connectors */}
          {keyframes.length >= 2 && (
            <div
              style={{
                left: `${(keyframes[0].time / duration) * 100}%`,
                width: `${
                  ((keyframes[keyframes.length - 1].time - keyframes[0].time) / duration) * 100
                }%`,
              }}
              className="absolute top-[52px] h-1.5 bg-blue-100 rounded-full pointer-events-none"
            />
          )}

          {/* Drag-and-Drop Pose Stamp Preview Indicator */}
          {dropPreviewTime !== null && (
            <div
              style={{ left: `${(dropPreviewTime / duration) * 100}%` }}
              className="absolute top-1 bottom-1 -translate-x-1/2 pointer-events-none flex flex-col items-center z-20"
            >
              <div className="px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-mono tabular-nums whitespace-nowrap shadow-xs">
                Drop @ {dropPreviewTime.toFixed(2)}s
              </div>
              <div className="w-0.5 flex-1 bg-blue-600" />
            </div>
          )}

          {/* Draggable Keyframe Diamonds / Pills */}
          {keyframes.map((kf) => {
            const pct = Math.max(0, Math.min(100, (kf.time / duration) * 100));
            const isSelected = kf.id === selectedKeyframeId;
            return (
              <button
                key={kf.id}
                type="button"
                data-keyframe-pill="true"
                aria-label={`Keyframe at ${kf.time.toFixed(2)}s${kf.label ? ` (${kf.label})` : ''}`}
                style={{ left: `${pct}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectKeyframe(kf);
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  draggingKfRef.current = kf.id;
                  onSelectKeyframe(kf);
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (draggingKfRef.current === kf.id) {
                    e.stopPropagation();
                    onMoveKeyframeTime(kf.id, clientXToTime(e.clientX));
                  }
                }}
                onPointerUp={(e) => {
                  if (draggingKfRef.current === kf.id) {
                    e.stopPropagation();
                    draggingKfRef.current = null;
                  }
                }}
                className="group absolute top-9 -translate-x-1/2 flex flex-col items-center cursor-grab active:cursor-grabbing z-10 focus-visible:outline-2 focus-visible:outline-blue-600 rounded"
              >
                <span
                  className={`w-4 h-4 rotate-45 rounded-[3px] border-2 transition-transform group-hover:scale-110 ${
                    isSelected
                      ? 'bg-blue-600 border-slate-900 scale-110 shadow-xs'
                      : 'bg-white border-blue-600 hover:bg-blue-50'
                  }`}
                />
                <span
                  className={`mt-1.5 text-[10px] font-medium whitespace-nowrap max-w-[74px] truncate ${
                    isSelected ? 'text-blue-700 font-semibold' : 'text-slate-500'
                  }`}
                >
                  {kf.label || `${kf.time.toFixed(2)}s`}
                </span>
              </button>
            );
          })}

          {/* Playhead Scrubber Line (starts below ruler numbers so timestamps stay readable) */}
          <div
            style={{ left: `${Math.max(0, Math.min(100, (currentTime / duration) * 100))}%` }}
            className="absolute top-[22px] bottom-0 -translate-x-1/2 pointer-events-none z-20 flex flex-col items-center"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-slate-900 shadow-xs" />
            <div className="w-0.5 flex-1 bg-amber-500" />
          </div>
        </div>
      </div>
    </section>
  );
};
