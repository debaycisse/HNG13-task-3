type ToolResult = {
  success: boolean;
  outfits?: Array<{
    title: string;
    items: string[]; // e.g., ["navy suit", "white shirt", "brown oxford shoes"]
    notes?: string;
    formality?: "formal" | "semi-formal" | "casual" | "sport" | "beach" | string;
  }>;
  error?: string;
};

type AnalyzeResult = {
  eventDetected: boolean;
  appropriateOutfits: boolean;
  bothGendersCovered: boolean;
  confidence: number; // 0..1
  explanation?: string;
};

interface WorkflowContext {
  userText: string;
  preprocessed: {
    eventName?: string;
    clarified?: boolean;
  };
  agentOutput?: {
    male?: ToolResult;
    female?: ToolResult;
    plainTextResponse?: string;
  };
  analyzeStepResult?: AnalyzeResult;
}

// Dummy tool signatures — replace with your actual tool bindings
declare const maleClothingTool: {
  run: (args: { event: string }) => Promise<ToolResult>;
};
declare const femaleClothingTool: {
  run: (args: { event: string }) => Promise<ToolResult>;
};

// Example builder-like API (adjust to your Mastra/SDK if different)
export const clothingAgentWorkflow = (workflowApi: any) =>
  workflowApi
    .createWorkflow({
      name: "clothingAgent",
      description:
        "A clothing recommendation workflow that suggests outfits for both male and female based on an event or outing name.",
    })

    // ---------------------
    // Preprocess Step
    // ---------------------
    .addStep("preprocess", async ({ inputs, state }: { inputs: any; state: WorkflowContext }) => {
      const userText = (inputs.userText || "").trim();
      state.userText = userText;

      // Simple heuristic to extract event name:
      // If user explicitly says "for a <event>" or single-word like "wedding", treat it as event.
      // This is intentionally lightweight; the agent may ask clarifying Qs in a later version.
      let eventName: string | undefined;

      // regex tries to capture phrases like "for a wedding", "wedding", "going to a wedding"
      const forMatch = userText.match(/\bfor (an |a |the )?([A-Za-zÀ-ÖØ-öø-ÿ' -]{2,50})$/i);
      if (forMatch) eventName = forMatch[2].trim();

      // fallback: if userText is short and likely an event
      if (!eventName && userText.split(/\s+/).length <= 4) {
        eventName = userText;
      }

      state.preprocessed = {
        eventName,
        clarified: !!eventName,
      };

      return { status: "ok", state };
    })

    // ---------------------
    // Agent Step (call tools)
    // ---------------------
    .addStep("agentStep", async ({ state }: { state: WorkflowContext }) => {
      const eventName = state.preprocessed?.eventName;

      // If no event specified, ask user to provide it (plain text response).
      if (!eventName) {
        state.agentOutput = {
          plainTextResponse:
            "Could you tell me the event or outing name (for example: 'wedding', 'beach party', 'job interview') so I can recommend outfits for both men and women?",
        };
        return { status: "needs_clarification", state };
      }

      // Call male and female tools in parallel (if available)
      const [maleRes, femaleRes] = await Promise.all([
        maleClothingTool.run({ event: eventName }).catch((err) => ({ success: false, error: String(err) })),
        femaleClothingTool.run({ event: eventName }).catch((err) => ({ success: false, error: String(err) })),
      ]);

      // Build plain-text response combining both tools' outputs (human-friendly)
      const buildOutfitText = (role: string, tr: ToolResult | undefined) => {
        if (!tr) return `${role}: No data (tool not available).`;
        if (!tr.success) return `${role}: Failed to fetch outfits. ${tr.error ?? ""}`;

        if (!tr.outfits || tr.outfits.length === 0) return `${role}: No outfit suggestions found.`;

        // Compose a compact description: take up to two outfit suggestions
        const lines: string[] = [];
        for (let i = 0; i < Math.min(2, tr.outfits.length); i++) {
          const o = tr.outfits[i];
          lines.push(
            `${i + 1}. ${o.title} — ${o.items.join(", ")}${o.notes ? ` (${o.notes})` : ""}${
              o.formality ? ` [${o.formality}]` : ""
            }`
          );
        }
        return `${role} suggestions:\n${lines.join("\n")}`;
      };

      const maleText = buildOutfitText("Male", maleRes);
      const femaleText = buildOutfitText("Female", femaleRes);

      const plainTextResponse =
        `Outfit recommendations for "${eventName}":\n\n` +
        maleText +
        "\n\n" +
        femaleText +
        "\n\n" +
        `If you want more detail (colors, fabric, or weather considerations), tell me the season or location.`;

      state.agentOutput = {
        male: maleRes,
        female: femaleRes,
        plainTextResponse,
      };

      return { status: "ok", state };
    })

    // ---------------------
    // Analyze Step (evaluate assistant output)
    // ---------------------
    .addStep("analyzeStep", async ({ state }: { state: WorkflowContext }) => {
      const r: AnalyzeResult = {
        eventDetected: false,
        appropriateOutfits: false,
        bothGendersCovered: false,
        confidence: 0,
        explanation: "",
      };

      const eventName = state.preprocessed?.eventName;
      const agentOut = state.agentOutput;

      if (!eventName) {
        r.eventDetected = false;
        r.explanation = "No event was detected in user input.";
        state.analyzeStepResult = r;
        return { status: "ok", state };
      }

      r.eventDetected = true;

      // Heuristics for appropriateness:
      // - Tools returned success and at least one outfit each
      const maleOK = !!agentOut?.male && agentOut.male.success && (agentOut.male.outfits?.length ?? 0) > 0;
      const femaleOK = !!agentOut?.female && agentOut.female.success && (agentOut.female.outfits?.length ?? 0) > 0;

      r.bothGendersCovered = maleOK && femaleOK;

      // Basic semantic check: do any returned outfit formality tags or item keywords match expected event keywords?
      // e.g., eventName includes "wedding" -> expect "formal" or "semi-formal" presence in at least one outfit
      const eventLower = (eventName || "").toLowerCase();

      const formalityMatches = (tool: ToolResult | undefined) => {
        if (!tool || !tool.outfits || tool.outfits.length === 0) return 0;
        let score = 0;
        for (const o of tool.outfits) {
          const formality = (o.formality || "").toLowerCase();
          if (!formality) continue;
          if (eventLower.includes("wedding") && (formality === "formal" || formality === "semi-formal")) score += 1;
          else if (eventLower.includes("beach") && formality === "beach") score += 1;
          else if (eventLower.includes("party") && (formality === "casual" || formality === "semi-formal")) score += 1;
          else if (eventLower.includes("interview") && formality === "formal") score += 1;
          else score += 0.2; // small credit for any formality present
        }
        return score;
      };

      const maleFormalityScore = formalityMatches(agentOut?.male);
      const femaleFormalityScore = formalityMatches(agentOut?.female);

      // Compose appropriateness heuristic:
      // - If at least one tool returned outfit(s) -> base credit
      // - If formality scores align with event -> increases confidence
      const anyOutfit = maleOK || femaleOK;
      if (anyOutfit) {
        r.appropriateOutfits = true;
      } else {
        r.appropriateOutfits = false;
      }

      // Confidence: base 0.5 if any outfits, plus normalized formality match (capped 1.0)
      let confidence = 0;
      if (!anyOutfit) {
        confidence = 0;
      } else {
        const base = 0.5;
        const extra = Math.min(0.5, (maleFormalityScore + femaleFormalityScore) / 4); // scale down
        confidence = Math.max(0, Math.min(1, base + extra));
      }

      r.confidence = confidence;
      r.explanation = [
        `maleOK=${maleOK}`,
        `femaleOK=${femaleOK}`,
        `maleFormalityScore=${maleFormalityScore}`,
        `femaleFormalityScore=${femaleFormalityScore}`,
      ].join(", ");

      state.analyzeStepResult = r;
      return { status: "ok", state };
    })

    // ---------------------
    // Scoring (map analyze result -> numeric score)
    // ---------------------
    .generateScore(({ results }) => {
      const r = (results as any)?.analyzeStepResult || ({} as AnalyzeResult);

      // If no event detected, consider the task not applicable -> full credit
      if (!r.eventDetected) return 1;

      // If event detected and appropriate outfits, reward; bonus for both genders coverage
      if (r.appropriateOutfits) {
        const genderBonus = r.bothGendersCovered ? 0.3 : 0.15;
        // Map to [0.0, 1.0], base 0.7 plus bonus scaled by confidence
        return Math.max(0, Math.min(1, 0.7 + genderBonus * (r.confidence ?? 1)));
      }

      // Event detected but outfits inappropriate -> zero
      return 0;
    })

    // ---------------------
    // Reason generator (human-friendly explanation)
    // ---------------------
    .generateReason(({ results, score }) => {
      const r = (results)?.analyzeStepResult || ({} as AnalyzeResult);
      return `Outfit recommendation scoring: eventDetected=${r.eventDetected ?? false}, appropriateOutfits=${r.appropriateOutfits ?? false}, bothGendersCovered=${r.bothGendersCovered ?? false}, confidence=${r.confidence ?? 0}. Score=${score}. ${r.explanation ?? ""}`;
    })

    // ---------------------
    // Finalize: return plain-text response to user
    // ---------------------
    .finalize(async ({ state }: { state: WorkflowContext }) => {
      // If agent asked for clarification earlier
      if (state.agentOutput?.plainTextResponse && !state.preprocessed?.eventName) {
        return {
          output: {
            text: state.agentOutput.plainTextResponse,
          },
          state,
        };
      }

      const text = state.agentOutput?.plainTextResponse ?? "Sorry — I couldn't prepare recommendations.";

      return {
        output: {
          text,
        },
        state,
      };
    });
