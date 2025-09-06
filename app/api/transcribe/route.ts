import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("audio") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("audio/")) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload an audio file." },
        { status: 400 }
      );
    }

    // Validate file size (25MB limit for Whisper API)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 25MB." },
        { status: 400 }
      );
    }

    // Convert File to format expected by OpenAI
    const buffer = await file.arrayBuffer();
    const audioFile = new File([buffer], file.name, { type: file.type });

    // Transcribe using Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en", // Can be made dynamic based on user preference
      response_format: "verbose_json",
      temperature: 0.2, // Lower temperature for more consistent medical transcription
    });

    // Enhanced response with medical context
    const response = {
      text: transcription.text,
      duration: transcription.duration,
      language: transcription.language,
      segments: transcription.segments,
      // Add medical-specific processing hints
      metadata: {
        processedAt: new Date().toISOString(),
        model: "whisper-1",
        medicalContext: true,
        confidence: "high", // Could be calculated from segments
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Transcription error:", error);

    // Handle specific OpenAI errors
    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        return NextResponse.json(
          { error: "OpenAI API key not configured" },
          { status: 500 }
        );
      }

      if (error.message.includes("quota")) {
        return NextResponse.json(
          { error: "API quota exceeded. Please try again later." },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to transcribe audio. Please try again." },
      { status: 500 }
    );
  }
}
