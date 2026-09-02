import { NextRequest, NextResponse } from "next/server";
import { generateContentWithFallback } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
    }

    const { messages, mode = "reflection", currentEntryText = "" } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "At least one message is required." },
        { status: 400 }
      );
    }

    // Build system instructions based on mode
    let systemInstruction = `You are a thoughtful, empathetic, and insightful AI Reflection Companion and Journal Assistant.
Your purpose is to help the user unpack their thoughts, explore their ideas, identify patterns, and find clarity.
- When reflecting: Validate feelings, offer nuanced perspectives, and gently ask a thought-provoking follow-up question if appropriate.
- When brainstorming: Organize creative ideas with clear, actionable bullet points, highlighting novel approaches.
- When summarizing: Synthesize key takeaways, emotional undertones, and actionable insights concisely.
- Tone: Warm, grounded, intelligent, objective, and supportive. Never generic or repetitive. Format with clean Markdown paragraphs and bullet points.`;

    if (mode === "brainstorm") {
      systemInstruction += `\nFOCUS: Brainstorming & Ideation. Provide 4-6 distinct, creative angles, ideas, or action avenues with concise justifications.`;
    } else if (mode === "summary") {
      systemInstruction += `\nFOCUS: Executive Reflection Summary. Provide a 2-3 sentence overview, key themes identified, and recommended mindful next steps.`;
    } else if (mode === "coaching") {
      systemInstruction += `\nFOCUS: Growth & Mindset Coaching. Challenge assumptions gently, highlight strengths, and formulate one high-leverage question.`;
    }

    // Prepare contents formatted for Gemini Multi-turn
    const contents = messages.map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: String(m.content || "").slice(0, 10000) }]
    }));

    const result = await generateContentWithFallback({
      contents,
      systemInstruction,
    });

    return NextResponse.json({
      text: result.text,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error("[Chat API Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate reflection response." },
      { status: 500 }
    );
  }
}
