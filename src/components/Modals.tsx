import React, { useState } from 'react';
import { Download, Film, Image as ImageIcon, Layers, X } from 'lucide-react';
import { deformMeshVertices, renderCharacterBlink2D, renderDeformedMesh2D } from '../engine/mesh';
import { LoadedCharacterBundle } from '../engine/pngLoader';
import { evaluateForwardKinematics } from '../engine/rigging';
import { evaluateAutoBlinkAtTime, sampleTimelineAtTime } from '../engine/timeline';
import { Keyframe, PoseState } from '../engine/types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  bundle: LoadedCharacterBundle | null;
  currentPose: PoseState;
  keyframes: Keyframe[];
  duration: number;
  loop: boolean;
  autoBlink?: boolean;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  bundle,
  currentPose,
  keyframes,
  duration,
  loop,
  autoBlink = true,
}) => {
  const [spriteFrames, setSpriteFrames] = useState(8);
  const [isRecordingWebm, setIsRecordingWebm] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  if (!isOpen || !bundle) return null;

  const triggerDownload = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadPosePng = () => {
    const off = document.createElement('canvas');
    off.width = bundle.rig.width;
    off.height = bundle.rig.height;
    const ctx = off.getContext('2d');
    if (!ctx) return;

    const fk = evaluateForwardKinematics(bundle.rig.restJoints, currentPose);
    const verts = deformMeshVertices(bundle.rig.mesh, fk);
    renderDeformedMesh2D(ctx, bundle.textureCanvas, bundle.rig.mesh, verts, 1);
    renderCharacterBlink2D(ctx, bundle.rig.eyes, fk, 0, 1);

    triggerDownload(off.toDataURL('image/png'), `${bundle.rig.name.toLowerCase().replace(/\s+/g, '_')}_pose.png`);
    setExportStatus('Downloaded transparent PNG of current pose.');
  };

  const handleDownloadSpriteSheet = () => {
    const count = spriteFrames;
    const fw = bundle.rig.width;
    const fh = bundle.rig.height;
    const off = document.createElement('canvas');
    off.width = fw * count;
    off.height = fh;
    const ctx = off.getContext('2d');
    if (!ctx) return;

    for (let i = 0; i < count; i++) {
      const t = (i / count) * duration;
      const pose = sampleTimelineAtTime(keyframes, t, duration, loop);
      const fk = evaluateForwardKinematics(bundle.rig.restJoints, pose);
      const verts = deformMeshVertices(bundle.rig.mesh, fk);

      ctx.save();
      ctx.translate(i * fw, 0);
      renderDeformedMesh2D(ctx, bundle.textureCanvas, bundle.rig.mesh, verts, 1);
      renderCharacterBlink2D(
        ctx,
        bundle.rig.eyes,
        fk,
        evaluateAutoBlinkAtTime(t, autoBlink),
        1
      );
      ctx.restore();
    }

    triggerDownload(
      off.toDataURL('image/png'),
      `${bundle.rig.name.toLowerCase().replace(/\s+/g, '_')}_spritesheet_${count}f.png`
    );
    setExportStatus(`Downloaded ${count}-frame transparent PNG sprite strip (${off.width}×${off.height}px).`);
  };

  const handleRecordWebm = async () => {
    if (typeof MediaRecorder === 'undefined') {
      setExportStatus('WebM video recording is not supported in this browser. Use Sprite Sheet PNG instead.');
      return;
    }

    setIsRecordingWebm(true);
    setExportStatus('Rendering smooth 60fps animation clip...');

    const off = document.createElement('canvas');
    off.width = bundle.rig.width;
    off.height = bundle.rig.height;
    const ctx = off.getContext('2d');
    if (!ctx) {
      setIsRecordingWebm(false);
      return;
    }

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    const stream = off.captureStream(60);
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, `${bundle.rig.name.toLowerCase().replace(/\s+/g, '_')}_animation.webm`);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setIsRecordingWebm(false);
      setExportStatus('Downloaded WebM animation video.');
    };

    recorder.start();
    const fps = 60;
    const totalFrames = Math.max(12, Math.round(duration * fps));
    for (let f = 0; f <= totalFrames; f++) {
      const t = (f / totalFrames) * duration;
      const pose = sampleTimelineAtTime(keyframes, t, duration, loop);
      const fk = evaluateForwardKinematics(bundle.rig.restJoints, pose);
      const verts = deformMeshVertices(bundle.rig.mesh, fk);

      ctx.clearRect(0, 0, off.width, off.height);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, off.width, off.height);
      renderDeformedMesh2D(ctx, bundle.textureCanvas, bundle.rig.mesh, verts, 1);
      renderCharacterBlink2D(
        ctx,
        bundle.rig.eyes,
        fk,
        evaluateAutoBlinkAtTime(t, autoBlink),
        1
      );

      await new Promise((r) => setTimeout(r, 1000 / fps));
    }
    recorder.stop();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
    >
      <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 id="export-modal-title" className="font-display text-lg font-bold text-slate-900">
            Export Character Animation
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close export dialog"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <p className="text-sm text-slate-600 mb-5">
          All exports render cleanly without skeleton pins or mesh wireframes.
        </p>

        <div className="space-y-3">
          {/* Option 1: Sprite Sheet */}
          <div className="p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Layers className="w-4 h-4 text-blue-600" aria-hidden="true" />
                <span>Game Sprite Strip (Transparent PNG)</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Evenly spaced animation frames ready for Unity, Godot, or CSS sprites.
              </p>
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 mt-2">
                <span>Frames:</span>
                <select
                  value={spriteFrames}
                  onChange={(e) => setSpriteFrames(Number(e.target.value))}
                  className="py-1 px-2 border border-slate-200 rounded-md font-mono tabular-nums"
                >
                  <option value={6}>6 frames</option>
                  <option value={8}>8 frames</option>
                  <option value={12}>12 frames</option>
                </select>
              </label>
            </div>
            <button
              type="button"
              onClick={handleDownloadSpriteSheet}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Download Strip</span>
            </button>
          </div>

          {/* Option 2: Single Pose PNG */}
          <div className="p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ImageIcon className="w-4 h-4 text-blue-600" aria-hidden="true" />
                <span>Current Pose Cutout (PNG)</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                High-resolution transparent PNG at the current playhead timestamp.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadPosePng}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Save PNG</span>
            </button>
          </div>

          {/* Option 3: WebM Video */}
          <div className="p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Film className="w-4 h-4 text-blue-600" aria-hidden="true" />
                <span>Animation Video Clip (WebM)</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Records one full {duration.toFixed(1)}s cycle at 60 FPS.
              </p>
            </div>
            <button
              type="button"
              disabled={isRecordingWebm}
              onClick={handleRecordWebm}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isRecordingWebm ? 'Recording...' : 'Export WebM'}</span>
            </button>
          </div>
        </div>

        {exportStatus && (
          <p role="status" className="mt-4 text-xs font-medium text-blue-700">
            {exportStatus}
          </p>
        )}
      </div>
    </div>
  );
};

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
    >
      <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 id="guide-modal-title" className="font-display text-lg font-bold text-slate-900">
            How to Animate Any PNG in 3 Steps
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close quick guide"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <ol className="space-y-4 text-sm text-slate-700 mb-6">
          <li>
            <strong className="font-semibold text-slate-900">01. Upload or Drop Your PNG</strong>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              Click <strong>Upload PNG</strong> (or drag an image onto the stage). PuppetDrop
              automatically traces your character&apos;s silhouette, removes solid backgrounds if
              needed, and binds a 12-bone skeleton + triangle mesh. Need to fine-tune joint
              placement? Switch to <strong>Adjust Rig</strong>.
            </p>
          </li>
          <li>
            <strong className="font-semibold text-slate-900">02. Drag Body Parts Directly</strong>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              Scrub the orange playhead to any time on the bottom ruler, then grab a hand, foot,
              head, or torso right on the character. Inverse Kinematics bends elbows and knees
              naturally and saves a keyframe diamond automatically.
            </p>
          </li>
          <li>
            <strong className="font-semibold text-slate-900">
              03. Drag-and-Drop Keyframes &amp; Pose Stamps
            </strong>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              Slide keyframe diamonds left or right on the timeline to change speed, or drag{' '}
              <strong>Pose Stamps</strong> from the left panel directly onto the ruler. Press{' '}
              <kbd className="px-1.5 py-0.5 text-[11px] font-mono bg-slate-100 border border-slate-200 rounded">
                Space
              </kbd>{' '}
              to play and loop!
            </p>
          </li>
        </ol>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
