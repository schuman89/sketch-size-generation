
import { GoogleGenAI, Type } from "@google/genai";
import { LayoutSpec, ElementType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "The general name of this layout collection" },
    elements: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          type: { 
            type: Type.STRING, 
            enum: ["ARTBOARD", "RECTANGLE", "TEXT"],
            description: "The type of Sketch element"
          },
          parentId: { type: Type.STRING, description: "If this is a layer, provide the ID of the ARTBOARD it belongs to. Artboards should have no parentId." },
          name: { type: Type.STRING, description: "For ARTBOARD types, this MUST be exactly '{width}*{height}'." },
          x: { type: Type.NUMBER, description: "Relative to the artboard origin (0,0) if it has a parentId, otherwise global canvas coordinates." },
          y: { type: Type.NUMBER },
          width: { type: Type.NUMBER },
          height: { type: Type.NUMBER },
          color: { type: Type.STRING, description: "Hex color code" },
          text: { type: Type.STRING },
          fontSize: { type: Type.NUMBER }
        },
        required: ["id", "type", "name", "x", "y", "width", "height"]
      }
    }
  },
  required: ["title", "elements"]
};

export const parsePromptToLayout = async (prompt: string): Promise<LayoutSpec> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are a design spec parser.
    User Input: "${prompt}"
    
    Instructions:
    1. Create a separate ARTBOARD for each dimension set provided.
    2. CRITICAL: The 'name' of each ARTBOARD must be exactly '{width}*{height}' (e.g., if width is 1200 and height is 800, the name MUST be '1200*800').
    3. Space the artboards out horizontally in the global canvas with at least 100px gap.
    4. If no specific layers are described, just return the empty artboards.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  try {
    const data = JSON.parse(response.text || "{}");
    return data as LayoutSpec;
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    throw new Error("Could not understand the layout dimensions.");
  }
};
