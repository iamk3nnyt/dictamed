"use client";

import AudioUpload from "@/components/audio-upload";

export default function Home() {
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
          <div className="mx-auto max-w-lg pt-4">
            <AudioUpload
              onFileSelect={(file) => {
                if (file) {
                  console.log("Selected audio file:", file.name);
                  // TODO: Implement audio processing with OpenAI
                }
              }}
            />
          </div>
        </div>
      </main>
    </>
  );
}
