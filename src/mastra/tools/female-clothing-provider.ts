import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { getEventBasedFemaleCloth } from "../../utils/model";


export const femaleClothingTool = createTool({
  id: "female-clothing-tool",
  description: "Fetches cloth combination, compatible for a specific event or outing",
  inputSchema: z.object({
    eventName: z.string().describe("Name of a given event or outing")
  }),
  outputSchema: z.object({
    femaleCloth: z.string().describe("Female cloth recommended for a given event")
  }),
  execute: async (input) => {
    try {
      const eventName = input.context.eventName
      const femaleCloth = getEventBasedFemaleCloth(eventName)
      return { femaleCloth };
    } catch (error) {
      return { femaleCloth: '' }      
    }
  }
})
