"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import AudioRecorder from "./audio-recorder";
import AudioUpload from "./audio-upload";

interface TranscriptionResult {
  text: string;
  duration?: number;
  language?: string;
  segments?: any[];
  metadata?: {
    processedAt: string;
    model: string;
    medicalContext: boolean;
    confidence: string;
  };
}

interface AudioInputProps {
  onTranscriptionComplete?: (result: TranscriptionResult) => void;
  onTranscriptionError?: (error: string) => void;
  className?: string;
}

type InputMode = "upload" | "record";

export default function AudioInput({
  onTranscriptionComplete,
  onTranscriptionError,
  className,
}: AudioInputProps) {
  const [mode, setMode] = useState<InputMode>("upload");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionResult, setTranscriptionResult] =
    useState<TranscriptionResult | null>(null);

  const handleRecordingComplete = async (audioBlob: Blob) => {
    setIsTranscribing(true);

    try {
      // Convert blob to file for transcription
      const audioFile = new File([audioBlob], `recording-${Date.now()}.webm`, {
        type: audioBlob.type,
      });

      const formData = new FormData();
      formData.append("audio", audioFile);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Transcription failed");
      }

      const result: TranscriptionResult = await response.json();
      setTranscriptionResult(result);
      onTranscriptionComplete?.(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Transcription failed";
      onTranscriptionError?.(errorMessage);
      console.error("Transcription error:", error);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleNewRecording = () => {
    setTranscriptionResult(null);
  };

  const handleUploadTranscriptionComplete = (result: TranscriptionResult) => {
    setTranscriptionResult(result);
    onTranscriptionComplete?.(result);
  };

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Mode Toggle */}
      <div className="flex items-center justify-center">
        <div className="flex rounded-full bg-gray-100 p-1 shadow-sm">
          <button
            onClick={() => setMode("upload")}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
              mode === "upload"
                ? "bg-white text-gray-900 shadow-md"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            )}
          >
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              Upload File
            </div>
          </button>
          <button
            onClick={() => setMode("record")}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
              mode === "record"
                ? "bg-white text-gray-900 shadow-md"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            )}
          >
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
              Record Audio
            </div>
          </button>
        </div>
      </div>

      {/* Loading Overlay for Recording Transcription */}
      {isTranscribing && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900"></div>
            <span className="text-sm font-medium text-gray-900">
              Transcribing recording...
            </span>
          </div>
        </div>
      )}

      {/* Input Component */}
      {!isTranscribing && !transcriptionResult && (
        <>
          {mode === "upload" ? (
            <AudioUpload
              onTranscriptionComplete={handleUploadTranscriptionComplete}
              onTranscriptionError={onTranscriptionError}
            />
          ) : (
            <AudioRecorder
              onRecordingComplete={handleRecordingComplete}
              onRecordingError={onTranscriptionError}
            />
          )}
        </>
      )}

      {/* Transcription Result */}
      {transcriptionResult && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900">
                Transcription Result
              </h4>
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
                <span>
                  Confidence: {transcriptionResult.metadata.confidence}
                </span>
              </div>
            )}
          </div>

          {/* New Recording Button */}
          <div className="flex justify-center">
            <button
              onClick={handleNewRecording}
              className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white shadow-lg transition-all duration-200 hover:bg-gray-800 hover:scale-105 hover:shadow-xl"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New {mode === "upload" ? "Upload" : "Recording"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
