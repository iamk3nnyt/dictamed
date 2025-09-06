"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import AudioRecorder from "./audio-recorder";
import AudioUpload from "./audio-upload";

interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

interface TranscriptionSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
}

interface TranscriptionResult {
  text: string;
  duration?: number;
  language?: string;
  segments?: TranscriptionSegment[];
  words?: WordTimestamp[]; // Word-level timestamps at top level
  audioUrl?: string; // URL for audio playback
  audioFileName?: string; // Original filename for display
  metadata?: {
    processedAt: string;
    model: string;
    medicalContext: boolean;
    confidence: string;
    hasWordTimestamps?: boolean;
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
  const [currentWordIndex, setCurrentWordIndex] = useState<{
    wordIndex: number;
  } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleRecordingComplete = async (audioBlob: Blob) => {
    setIsTranscribing(true);

    try {
      // Convert blob to file for transcription
      const audioFile = new File([audioBlob], `recording-${Date.now()}.webm`, {
        type: audioBlob.type,
      });

      // Create audio URL for playback
      const audioUrl = URL.createObjectURL(audioBlob);

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

      // Add audio URL and filename to result
      const enhancedResult = {
        ...result,
        audioUrl,
        audioFileName: audioFile.name,
      };

      setTranscriptionResult(enhancedResult);
      onTranscriptionComplete?.(enhancedResult);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Transcription failed";
      onTranscriptionError?.(errorMessage);
      console.error("Transcription error:", error);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Find current word based on audio time
  const findCurrentWord = (currentTime: number) => {
    if (!transcriptionResult?.words) return null;

    for (
      let wordIndex = 0;
      wordIndex < transcriptionResult.words.length;
      wordIndex++
    ) {
      const word = transcriptionResult.words[wordIndex];
      if (currentTime >= word.start && currentTime <= word.end) {
        return { wordIndex };
      }
    }
    return null;
  };

  // Handle audio time updates for word highlighting
  const handleTimeUpdate = () => {
    if (!audioRef.current) return;

    const currentTime = audioRef.current.currentTime;

    // Update word highlighting if word timestamps are available
    if (transcriptionResult?.words) {
      const currentWord = findCurrentWord(currentTime);
      setCurrentWordIndex(currentWord);

      // Auto-scroll to current word
      if (currentWord) {
        const wordElement = document.querySelector(
          `[data-word="${currentWord.wordIndex}"]`
        );
        if (wordElement) {
          wordElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });
        }
      }
    }
  };

  // Handle play/pause state
  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentWordIndex(null);
  };

  const handleNewRecording = () => {
    // Clean up previous audio URL to prevent memory leaks
    if (transcriptionResult?.audioUrl) {
      URL.revokeObjectURL(transcriptionResult.audioUrl);
    }
    setTranscriptionResult(null);
    setCurrentWordIndex(null);
    setIsPlaying(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (transcriptionResult?.audioUrl) {
        URL.revokeObjectURL(transcriptionResult.audioUrl);
      }
    };
  }, [transcriptionResult?.audioUrl]);

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

            {/* Audio Player */}
            {transcriptionResult.audioUrl && (
              <div className="mb-4 rounded-lg bg-white p-3">
                <div className="mb-2 flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-gray-500"
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
                  <span className="text-sm font-medium text-gray-700">
                    {transcriptionResult.audioFileName || "Audio Recording"}
                  </span>
                </div>
                <audio
                  ref={audioRef}
                  controls
                  preload="metadata"
                  className="w-full"
                  style={{ height: "40px" }}
                  onTimeUpdate={handleTimeUpdate}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onEnded={handleEnded}
                >
                  <source
                    src={transcriptionResult.audioUrl}
                    type="audio/webm"
                  />
                  <source src={transcriptionResult.audioUrl} type="audio/mp4" />
                  <source src={transcriptionResult.audioUrl} type="audio/wav" />
                  Your browser does not support audio playback.
                </audio>
              </div>
            )}

            <div className="rounded-lg bg-white p-3 overflow-hidden">
              {/* Check if we have word-level timestamps */}
              {transcriptionResult.words ? (
                <div className="text-sm leading-relaxed text-gray-800 break-words whitespace-normal">
                  {/* Word-level interactive transcript */}
                  {transcriptionResult.words.map((word, wordIndex) => {
                    const isCurrentWord =
                      currentWordIndex?.wordIndex === wordIndex;

                    return (
                      <>
                        <span
                          key={wordIndex}
                          data-word={`${wordIndex}`}
                          className={cn(
                            "cursor-pointer px-0.5 transition-all duration-200",
                            isCurrentWord && isPlaying
                              ? "underline font-bold"
                              : "hover:bg-blue-50 rounded"
                          )}
                          onClick={() => {
                            // Jump to word timestamp
                            if (audioRef.current) {
                              audioRef.current.currentTime = word.start;
                              audioRef.current.play();
                            }
                          }}
                          title={`${word.start.toFixed(
                            1
                          )}s - ${word.end.toFixed(1)}s`}
                        >
                          {word.word}
                        </span>
                        {wordIndex <
                          (transcriptionResult.words?.length || 0) - 1 && " "}
                      </>
                    );
                  })}
                  <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-green-400"></div>
                    Word-level sync active - Current word appears bold and
                    underlined
                  </div>
                </div>
              ) : (
                /* Fallback to segment-level or plain text */
                <div className="text-sm leading-relaxed text-gray-800 break-words whitespace-normal">
                  {transcriptionResult.segments ? (
                    /* Segment-level interactive transcript */
                    transcriptionResult.segments.map((segment, index) => {
                      // Find if current time is within this segment
                      const currentTime = audioRef.current?.currentTime || 0;
                      const isCurrentSegment =
                        isPlaying &&
                        currentTime >= segment.start &&
                        currentTime <= segment.end;

                      return (
                        <span
                          key={index}
                          className={cn(
                            "cursor-pointer px-1 transition-all duration-200",
                            isCurrentSegment
                              ? "underline font-bold text-blue-600"
                              : "hover:bg-blue-50 rounded"
                          )}
                          onClick={() => {
                            if (audioRef.current) {
                              audioRef.current.currentTime = segment.start;
                              audioRef.current.play();
                            }
                          }}
                          title={`${segment.start.toFixed(
                            1
                          )}s - ${segment.end.toFixed(1)}s`}
                        >
                          {segment.text}
                          {index <
                            (transcriptionResult.segments?.length || 0) - 1 &&
                            " "}
                        </span>
                      );
                    })
                  ) : (
                    /* Plain text fallback */
                    <p>{transcriptionResult.text}</p>
                  )}
                  {transcriptionResult.segments && (
                    <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                      Segment-level sync active - Current phrase appears bold
                      and underlined
                    </div>
                  )}
                </div>
              )}
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
