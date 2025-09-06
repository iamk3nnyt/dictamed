"use client";

import AudioInput from "@/components/audio-input";
import { useState } from "react";

export default function Home() {
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <main className="flex min-h-screen flex-col justify-center py-8 sm:px-6 sm:py-12">
        <div className="mx-auto w-full space-y-6 text-center sm:max-w-2xl sm:space-y-8 lg:max-w-4xl xl:max-w-6xl">
          <h1 className="mb-3 text-3xl font-normal sm:mb-4 sm:text-4xl md:text-5xl lg:text-6xl">
            Dictamed
          </h1>
          <p className="mx-auto w-full px-2 text-lg leading-relaxed text-gray-600 sm:max-w-lg sm:px-0 sm:text-xl md:max-w-2xl md:text-2xl">
            Transform your medical documentation workflow with intelligent voice
            recognition that understands medical terminology, ensures HIPAA
            compliance, and seamlessly integrates into your existing practice
            management systems.
          </p>

          {error && (
            <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          <div className="mx-auto max-w-lg pt-4">
            <AudioInput
              onTranscriptionComplete={(result) => {
                console.log("Transcription completed:", result);
                setError(null);
              }}
              onTranscriptionError={(errorMessage) => {
                console.error("Transcription error:", errorMessage);
                setError(errorMessage);
              }}
            />
          </div>
        </div>
      </main>
    </>
  );
}
