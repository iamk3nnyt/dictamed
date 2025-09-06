"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface TranscriptionResult {
  text: string;
  duration?: number;
  language?: string;
  segments?: any[];
  audioUrl?: string; // URL for audio playback
  audioFileName?: string; // Original filename for display
  metadata?: {
    processedAt: string;
    model: string;
    medicalContext: boolean;
    confidence: string;
  };
}

interface AudioUploadProps {
  onFileSelect?: (file: File | null) => void;
  onTranscriptionComplete?: (result: TranscriptionResult) => void;
  onTranscriptionError?: (error: string) => void;
  className?: string;
}

export default function AudioUpload({
  onFileSelect,
  onTranscriptionComplete,
  onTranscriptionError,
  className,
}: AudioUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [transcriptionResult, setTranscriptionResult] =
    useState<TranscriptionResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File | null) => {
    setSelectedFile(file);
    setTranscriptionResult(null);
    onFileSelect?.(file);

    if (file) {
      await transcribeAudio(file);
    }
  };

  const transcribeAudio = async (file: File) => {
    setIsUploading(true);

    try {
      // Create audio URL for playback
      const audioUrl = URL.createObjectURL(file);

      const formData = new FormData();
      formData.append("audio", file);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Transcription failed");
      }

      const result: TranscriptionResult = await response.json();

      // Add audio URL and filename to result
      const enhancedResult = {
        ...result,
        audioUrl,
        audioFileName: file.name,
      };

      setTranscriptionResult(enhancedResult);
      onTranscriptionComplete?.(enhancedResult);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Transcription failed";
      onTranscriptionError?.(errorMessage);
      console.error("Transcription error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const audioFile = files.find((file) => file.type.startsWith("audio/"));

    if (audioFile) {
      handleFileSelect(audioFile);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && file.type.startsWith("audio/")) {
      handleFileSelect(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Clean up audio URL to prevent memory leaks
    if (transcriptionResult?.audioUrl) {
      URL.revokeObjectURL(transcriptionResult.audioUrl);
    }
    setSelectedFile(null);
    setTranscriptionResult(null);
    onFileSelect?.(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (transcriptionResult?.audioUrl) {
        URL.revokeObjectURL(transcriptionResult.audioUrl);
      }
    };
  }, [transcriptionResult?.audioUrl]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className={cn("w-full", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleInputChange}
        className="hidden"
      />

      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200",
          isDragOver
            ? "border-gray-400 bg-gray-50"
            : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100",
          selectedFile && "border-solid border-gray-300 bg-white"
        )}
      >
        {selectedFile ? (
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <svg
                  className="h-6 w-6 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            <button
              onClick={handleRemove}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <svg
                className="h-8 w-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-base font-medium text-gray-900">
              Upload audio file
            </h3>
            <p className="mb-4 text-sm text-gray-500">
              Drag and drop your audio file here, or click to browse
            </p>
            <div className="text-xs text-gray-400">
              Supports MP3, WAV, M4A, and other audio formats
            </div>
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/90">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900"></div>
              <span className="text-sm font-medium text-gray-900">
                Transcribing audio...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Transcription Result */}
      {transcriptionResult && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">Transcription</h4>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {transcriptionResult.duration && (
                <span>{Math.round(transcriptionResult.duration)}s</span>
              )}
              {transcriptionResult.language && (
                <span className="rounded-full bg-gray-200 px-2 py-1">
                  {transcriptionResult.language.toUpperCase()}
                </span>
              )}
            </div>
          </div>
          <div className="rounded-lg bg-white p-3">
            <p className="text-sm leading-relaxed text-gray-800">
              {transcriptionResult.text}
            </p>
          </div>
          {transcriptionResult.metadata && (
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-green-400"></div>
                Medical Context Enabled
              </span>
              <span>•</span>
              <span>Confidence: {transcriptionResult.metadata.confidence}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
