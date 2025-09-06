"use client";

import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";

interface AudioRecorderProps {
  onRecordingComplete?: (audioBlob: Blob) => void;
  onRecordingError?: (error: string) => void;
  className?: string;
}

export default function AudioRecorder({
  onRecordingComplete,
  onRecordingError,
  className,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);

  // Request microphone permission
  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasPermission(true);
      stream.getTracks().forEach((track) => track.stop()); // Stop the test stream
    } catch (error) {
      setHasPermission(false);
      onRecordingError?.(
        "Microphone permission denied. Please allow microphone access to record audio."
      );
    }
  }, [onRecordingError]);

  // Initialize audio context and analyser for visualizing audio levels
  const initializeAudioContext = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Create audio context for visualization
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      // Configure analyser for better sensitivity
      analyserRef.current.fftSize = 512; // Increased for better resolution
      analyserRef.current.smoothingTimeConstant = 0.3; // Reduce smoothing for more responsive visualization
      analyserRef.current.minDecibels = -90;
      analyserRef.current.maxDecibels = -10;

      // Ensure audio context is running
      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }

      return stream;
    } catch (error) {
      onRecordingError?.(
        "Failed to access microphone. Please check your permissions."
      );
      throw error;
    }
  }, [onRecordingError]);

  // Audio level visualization - removed dependencies to avoid stale closures
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteTimeDomainData(dataArray);

    // Calculate RMS (Root Mean Square) for better audio level detection
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const sample = (dataArray[i] - 128) / 128; // Convert to -1 to 1 range
      sum += sample * sample;
    }
    const rms = Math.sqrt(sum / dataArray.length);

    // Apply amplification for better visualization
    const amplifiedLevel = Math.min(1, rms * 8);
    setAudioLevel(amplifiedLevel);

    // Continue animation loop - will be controlled by start/stop recording
    animationRef.current = requestAnimationFrame(updateAudioLevel);
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await initializeAudioContext();

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4",
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType,
        });
        onRecordingComplete?.(audioBlob);
        cleanup();
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      // Start audio level animation immediately
      updateAudioLevel();
    } catch (error) {
      console.error("Recording start error:", error);
      onRecordingError?.("Failed to start recording. Please try again.");
    }
  }, [
    initializeAudioContext,
    onRecordingComplete,
    onRecordingError,
    updateAudioLevel,
  ]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      // Stop animation loop
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      // Reset audio level
      setAudioLevel(0);
    }
  }, [isRecording]);

  // Pause/Resume recording
  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current || !isRecording) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      // Resume timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      // Pause timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording, isPaused]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    mediaRecorderRef.current = null;
  }, []);

  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Check permission on mount
  useEffect(() => {
    if (hasPermission === null) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  if (hasPermission === false) {
    return (
      <div className={cn("w-full", className)}>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <div className="mb-4 flex justify-center">
            <svg
              className="h-12 w-12 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-base font-medium text-red-900">
            Microphone Access Required
          </h3>
          <p className="mb-4 text-sm text-red-700">
            Please allow microphone access to record audio for transcription.
          </p>
          <button
            onClick={requestPermission}
            className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            Grant Permission
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        {/* Audio Level Visualization */}
        {isRecording && (
          <div className="mb-6 flex items-center justify-center">
            <div className="flex items-center gap-1">
              {[...Array(20)].map((_, i) => {
                // Use current audio level for active bars
                const isActive = audioLevel * 20 > i;
                const barHeight = isPaused
                  ? 8
                  : Math.max(8, 8 + audioLevel * 40);

                return (
                  <div
                    key={i}
                    className={cn(
                      "w-1 rounded-full transition-all duration-100",
                      isActive
                        ? isPaused
                          ? "bg-yellow-500"
                          : "bg-green-500"
                        : "bg-gray-200"
                    )}
                    style={{
                      height: `${barHeight}px`,
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Recording Status */}
        <div className="mb-6 text-center">
          {isRecording ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <div
                  className={cn(
                    "h-3 w-3 rounded-full",
                    isPaused ? "bg-yellow-500" : "bg-red-500 animate-pulse"
                  )}
                />
                <span className="text-lg font-medium text-gray-900">
                  {isPaused ? "Paused" : "Recording"}
                </span>
              </div>
              <div className="text-2xl font-mono text-gray-600">
                {formatTime(recordingTime)}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-center">
                <svg
                  className="h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              </div>
              <h3 className="text-base font-medium text-gray-900">
                Ready to Record
              </h3>
              <p className="text-sm text-gray-500">
                Click the record button to start capturing audio
              </p>
            </div>
          )}
        </div>

        {/* Recording Controls */}
        <div className="flex items-center justify-center gap-4">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-all duration-200 hover:bg-red-600 hover:scale-105 hover:shadow-xl"
            >
              <div className="absolute inset-0 rounded-full bg-red-500 opacity-20 animate-pulse"></div>
              <svg
                className="relative z-10 h-8 w-8"
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
            </button>
          ) : (
            <>
              <button
                onClick={togglePause}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition-all duration-200 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 hover:shadow-md"
              >
                {isPaused ? (
                  <svg
                    className="h-5 w-5 ml-0.5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                )}
              </button>

              <button
                onClick={stopRecording}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-900 text-white shadow-lg transition-all duration-200 hover:bg-gray-800 hover:scale-105 hover:shadow-xl"
              >
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Recording Tips */}
        {!isRecording && (
          <div className="mt-6 rounded-lg bg-gray-50 p-4">
            <h4 className="mb-2 text-sm font-medium text-gray-900">
              Recording Tips
            </h4>
            <ul className="space-y-1 text-xs text-gray-600">
              <li>• Speak clearly and at a normal pace</li>
              <li>• Use medical terminology as needed</li>
              <li>• Minimize background noise for best results</li>
              <li>• Recording will automatically transcribe when stopped</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
