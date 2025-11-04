import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { getEventBasedMaleCloth } from "../../utils/model";


export const maleClothingTool = createTool({
  id: "male-clothing-tool",
  description: "Fetches cloth combination, compatible for a specific event or outing",
  inputSchema: z.object({
    eventName: z.string().describe("Name of a given event or outing")
  }),
  outputSchema: z.object({
    maleCloth: z.string().describe("Male cloth recommended for a given event")
  }),
  execute: async (input) => {
    const eventName = input.context.eventName
    try {
      const maleCloth = getEventBasedMaleCloth(eventName)  
      return { maleCloth };
    } catch (error) {
      return {
        maleCloth: ''
      }      
    }
  }
})
