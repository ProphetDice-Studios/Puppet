import React, { useRef } from 'react';
import { Upload } from 'lucide-react';

interface TopBarProps {
  activeSection: 'characters' | 'presets';
  onSelectSection: (section: 'characters' | 'presets') => void;
  onOpenExport: () => void;
  onOpenGuide: () => void;
  onUploadFile: (file: File) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeSection,
  onSelectSection,
  onOpenExport,
  onOpenGuide,
  onUploadFile,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
      e.target.value = '';
    }
  };

  return (
    <header className="flex items-center justify-between gap-8 px-6 h-14 bg-white border-b border-slate-200 shrink-0">
      {/* Zone 1: Brand Title (single text element, one line) */}
      <a
        href="#studio"
        onClick={(e) => {
          e.preventDefault();
          onSelectSection('characters');
        }}
        className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 rounded"
      >
        PuppetDrop
      </a>

      {/* Zone 2: 4 concise single-line navigation links */}
      <nav aria-label="Studio navigation" className="hidden sm:flex items-center gap-6 text-sm font-medium text-slate-600">
        <a
          href="#characters"
          onClick={(e) => {
            e.preventDefault();
            onSelectSection('characters');
          }}
          className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
            activeSection === 'characters'
              ? 'text-slate-900 border-blue-600'
              : 'border-transparent hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          Characters
        </a>
        <a
          href="#presets"
          onClick={(e) => {
            e.preventDefault();
            onSelectSection('presets');
          }}
          className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
            activeSection === 'presets'
              ? 'text-slate-900 border-blue-600'
              : 'border-transparent hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          Pose Stamps
        </a>
        <a
          href="#export"
          onClick={(e) => {
            e.preventDefault();
            onOpenExport();
          }}
          className="py-1 border-b-2 border-transparent hover:text-slate-900 hover:border-slate-300 transition-colors whitespace-nowrap shrink-0"
        >
          Export
        </a>
        <a
          href="#guide"
          onClick={(e) => {
            e.preventDefault();
            onOpenGuide();
          }}
          className="py-1 border-b-2 border-transparent hover:text-slate-900 hover:border-slate-300 transition-colors whitespace-nowrap shrink-0"
        >
          Quick Guide
        </a>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center shrink-0">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/webp,image/jpeg"
          onChange={handleFileChange}
          tabIndex={-1}
          aria-hidden="true"
          data-testid="png-file-input"
          className="sr-only"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:scale-[0.99] transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <Upload className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Upload PNG</span>
        </button>
      </div>
    </header>
  );
};
