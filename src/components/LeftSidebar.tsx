import React, { useRef } from 'react';
import { GripVertical, ImagePlus, Sparkles } from 'lucide-react';
import { POSE_PRESETS } from '../engine/timeline';
import { STARTER_CHARACTERS, StarterCharacterSpec } from '../engine/starterCharacters';
import { CharacterRigData, PosePreset } from '../engine/types';

interface LeftSidebarProps {
  activeSection: 'characters' | 'presets';
  onSelectSection: (section: 'characters' | 'presets') => void;
  rig: CharacterRigData | null;
  activeStarterId: string | null;
  autoRemoveBg: boolean;
  onToggleAutoRemoveBg: (checked: boolean) => void;
  onSelectStarter: (spec: StarterCharacterSpec) => void;
  onUploadFile: (file: File) => void;
  onApplyPresetAtPlayhead: (preset: PosePreset) => void;
  onLoadWaveDemo: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  activeSection,
  onSelectSection,
  rig,
  activeStarterId,
  autoRemoveBg,
  onToggleAutoRemoveBg,
  onSelectStarter,
  onUploadFile,
  onApplyPresetAtPlayhead,
  onLoadWaveDemo,
}) => {
  const sidebarFileRef = useRef<HTMLInputElement>(null);

  const handleDropZone = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onUploadFile(file);
    }
  };

  return (
    <aside
      aria-label="Character and Pose Library"
      className="w-full lg:w-72 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto"
    >
      {/* Mobile / Compact Switcher */}
      <div className="flex sm:hidden border-b border-slate-200 p-2 gap-1 bg-slate-50">
        <button
          type="button"
          onClick={() => onSelectSection('characters')}
          className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            activeSection === 'characters'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Characters
        </button>
        <button
          type="button"
          onClick={() => onSelectSection('presets')}
          className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            activeSection === 'presets'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Pose Stamps
        </button>
      </div>

      {/* Section 1: Character Source & Auto-Rig Info */}
      <section
        aria-labelledby="sidebar-char-heading"
        className={`p-5 border-b border-slate-200 ${
          activeSection === 'presets' ? 'hidden sm:block' : 'block'
        }`}
      >
        <div className="mb-3">
          <h2 id="sidebar-char-heading" className="text-sm font-semibold text-slate-900">
            Character PNG
          </h2>
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDropZone}
          className="mb-3"
        >
          <input
            ref={sidebarFileRef}
            type="file"
            accept="image/png,image/webp,image/jpeg"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                onUploadFile(f);
                e.target.value = '';
              }
            }}
            className="sr-only"
            id="sidebar-png-upload"
          />
          <button
            type="button"
            onClick={() => sidebarFileRef.current?.click()}
            className="w-full py-3 px-4 rounded-lg border border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 transition-colors flex items-center justify-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <ImagePlus className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
            <span className="whitespace-nowrap">Drop PNG or Browse File</span>
          </button>
        </div>

        <label className="flex items-center gap-2.5 text-xs text-slate-600 cursor-pointer select-none mb-4">
          <input
            type="checkbox"
            checked={autoRemoveBg}
            onChange={(e) => onToggleAutoRemoveBg(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
          />
          <span>Auto-cutout solid backgrounds</span>
        </label>

        {rig && (
          <div className="mb-4">
            <div className="text-xs font-semibold text-slate-800 truncate">{rig.name}</div>
            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 font-mono tabular-nums whitespace-nowrap">
              <span>
                {rig.width}×{rig.height}px
              </span>
              <span aria-hidden="true">·</span>
              <span>{rig.mesh.boneOrder.length} bones</span>
              <span aria-hidden="true">·</span>
              <span>{rig.mesh.indices.length / 3} tris</span>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-slate-500 mb-2">Starter Transparent PNGs</p>
          {STARTER_CHARACTERS.map((spec) => {
            const isSelected = activeStarterId === spec.id;
            return (
              <button
                key={spec.id}
                type="button"
                onClick={() => onSelectStarter(spec)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 text-blue-900 font-semibold border border-blue-200'
                    : 'text-slate-700 hover:bg-slate-100 border border-transparent'
                }`}
              >
                <span className="truncate">{spec.name}</span>
                <span className="text-[11px] text-slate-500 whitespace-nowrap shrink-0">
                  {spec.role.replace(' PNG', '')}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Section 2: Drag-and-Drop Pose Stamps */}
      <section
        aria-labelledby="sidebar-poses-heading"
        className={`p-5 flex-1 ${
          activeSection === 'characters' ? 'hidden sm:block' : 'block'
        }`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <h2 id="sidebar-poses-heading" className="text-sm font-semibold text-slate-900">
            Pose Stamps
          </h2>
          <button
            type="button"
            onClick={onLoadWaveDemo}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Wave Loop</span>
          </button>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed mb-3.5">
          Click a stamp to pose at playhead, or drag it onto the timeline ruler below.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-1 gap-2">
          {POSE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/x-puppetdrop-preset', preset.id);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => onApplyPresetAtPlayhead(preset)}
              aria-label={`Apply ${preset.name} pose`}
              className="group w-full text-left px-3 py-2.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-slate-50 active:scale-[0.99] transition-all flex items-center gap-2.5 cursor-grab active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              <GripVertical
                className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-800 truncate">
                  {preset.name}
                </div>
                <div className="text-[11px] text-slate-500 truncate">{preset.summary}</div>
              </div>
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
};
