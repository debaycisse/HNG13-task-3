import { z } from 'zod';
import { createToolCallAccuracyScorerCode } from '@mastra/evals/scorers/code';
import { createCompletenessScorer } from '@mastra/evals/scorers/code';
import { createScorer } from '@mastra/core/scores';

export const toolCallAppropriatenessScorerForMale = createToolCallAccuracyScorerCode({
  expectedTool: 'female-clothing-tool',
  strictMode: false,
});

export const toolCallAppropriatenessScorerForFemale = createToolCallAccuracyScorerCode({
  expectedTool: 'female-clothing-tool',
  strictMode: false,
});

export const completenessScorer = createCompletenessScorer();

// Custom LLM-judged scorer: evaluates if non-English locations are translated appropriately
export const translationScorer = createScorer({
  name: 'Translation Quality',
  description:
    'Checks that non-English location names are translated and used correctly',
  type: 'agent',
  judge: {
    model: 'google/gemini-2.5-pro',
    instructions:
      'You are an expert evaluator of translation quality for geographic locations. ' +
      'Determine whether the user text mentions a non-English location and whether the assistant correctly uses an English translation of that location. ' +
      'Be lenient with transliteration differences and diacritics. ' +
      'Return only the structured JSON matching the provided schema.',
  },
})
  .preprocess(({ run }) => {
    const userText = (run.input?.inputMessages?.[0]?.content as string) || '';
    const assistantText = (run.output?.[0]?.content as string) || '';
    return { userText, assistantText };
  })
  .analyze({
    description:
      'Extract location names and detect language/translation adequacy',
    outputSchema: z.object({
      nonEnglish: z.boolean(),
      translated: z.boolean(),
      confidence: z.number().min(0).max(1).default(1),
      explanation: z.string().default(''),
    }),
    createPrompt: ({ results }) => `
          You are evaluating whether a clothing recommendation assistant correctly provided appropriate outfit suggestions based on a user’s mentioned event or outing.
          """
          ${results.preprocessStepResult.userText}
          User text:
          """
          Assistant response:
          """
          ${results.preprocessStepResult.assistantText}
          """
          Tasks:
          1) Identify if the user mentioned a specific event or outing (e.g., wedding, beach party, office meeting, date night).
          2) Check whether the assistant provided appropriate clothing recommendations that align with the context of the mentioned event or outing.
          3) Ensure the assistant included suggestions for both male and female outfits, or clarified if the request was gender-specific.
          4) Evaluate if the recommendations reflect suitable formality, style, and season-appropriate choices.
          Return JSON with fields:
          {
            "eventDetected": boolean,
            "appropriateOutfits": boolean,
            "bothGendersCovered": boolean,
            "confidence": number,
            "explanation": string
          }
        `,
  })
  .generateScore(({ results }) => {
    const r = (results as any)?.analyzeStepResult || {};

    // If no event was detected, there's nothing to evaluate — full credit
    if (!r.eventDetected) return 1;

    // If both event detected and appropriate outfits are given, reward proportionally
    if (r.appropriateOutfits) {
      // Bonus if both genders are covered
      const genderBonus = r.bothGendersCovered ? 0.3 : 0.15;
      return Math.max(0, Math.min(1, 0.7 + genderBonus * (r.confidence ?? 1)));
    }

    // Event detected but outfits inappropriate → no credit
    return 0;
})
.generateReason(({ results, score }) => {
  const r = (results as any)?.analyzeStepResult || {};
  return `Outfit recommendation scoring: eventDetected=${r.eventDetected ?? false}, appropriateOutfits=${r.appropriateOutfits ?? false}, bothGendersCovered=${r.bothGendersCovered ?? false}, confidence=${r.confidence ?? 0}. Score=${score}. ${r.explanation ?? ''}`;
});


export const scorers = {
  toolCallAppropriatenessScorerForMale,
  toolCallAppropriatenessScorerForFemale,
  completenessScorer,
  translationScorer,
};
