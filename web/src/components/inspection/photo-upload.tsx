"use client";

import { useRef, useState, useCallback } from "react";
import { X, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhotoUploadProps {
  onFileSelected: (file: File) => void;
  preview?: string | null;
  onRemove?: () => void;
  disabled?: boolean;
}

export function PhotoUpload({ onFileSelected, preview, onRemove, disabled }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    onFileSelected(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  if (preview) {
    return (
      <div className="relative rounded-card overflow-hidden border border-border bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt="Inspection photo" className="w-full max-h-72 object-cover" />
        {onRemove && !disabled && (
          <button
            onClick={onRemove}
            className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-card border-2 border-dashed p-10 text-center transition-colors cursor-pointer",
        dragging ? "border-primary bg-primary-tint" : "border-border bg-surface hover:border-primary/50 hover:bg-background",
        disabled && "pointer-events-none opacity-60"
      )}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-tint mb-3">
        <ImageIcon className="h-6 w-6 text-primary" />
      </div>
      <p className="text-sm font-medium text-text-primary mb-1">
        Drop photo here or <span className="text-primary">browse</span>
      </p>
      <p className="text-xs text-text-secondary">PNG, JPG, WEBP — max 20 MB</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
