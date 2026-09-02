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

    const { messages, title } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages are required for synthesis." }, { status: 400 });
    }

    const dialogueText = messages
      .map((m: any) => `${m.role === "user" ? "User" : "Gemini"}: ${m.content}`)
      .join("\n\n");

    const prompt = `Analyze the following reflection session titled "${title || "Journal Entry"}":

${dialogueText}

Please provide a JSON structured response with:
1. "summary": A rich 2-3 sentence synthesis of the user's thoughts and Gemini's reflection.
2. "brainstormIdeas": An array of 3 to 5 bulleted takeaway ideas or actionable insights.
3. "tags": An array of 2 to 4 relevant topical tags (e.g. "Productivity", "Mindfulness", "Career Strategy").
4. "suggestedTitle": A concise 3-6 word title capturing the essence if the current title is generic.

Respond strictly in valid JSON format without markdown wrapping.`;

    const result = await generateContentWithFallback({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction: "You are an analytical reflection synthesizer. You always respond in valid JSON format only.",
      config: {
        responseMimeType: "application/json",
      }
    });

    let parsed: any = {};
    try {
      // Remove any potential code blocks if returned
      const cleanJson = result.text.replace(/```json/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      parsed = {
        summary: result.text.slice(0, 300),
        brainstormIdeas: ["Continue exploring clarity on these goals.", "Revisit this reflection in a few days."],
        tags: ["Reflection", "Journal"],
      };
    }

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("[Synthesize API Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to synthesize reflection." },
      { status: 500 }
    );
  }
}
