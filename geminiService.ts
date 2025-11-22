
import { GoogleGenAI, Type } from "@google/genai";
import { Bubble, BubbleType, DEFAULT_BUBBLE_STYLE } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

interface DetectedBubbleRaw {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
  type: string;
}

const SYSTEM_INSTRUCTION = `
You are an expert Comic Book Typesetter AI. 
Your goal is to identify the "Safe Text Area" (Inscribed Rectangle) for speech bubbles with pixel-perfect precision.

### CORE OBJECTIVE
Return the coordinates of the rectangle that fits **COMPLETELY INSIDE** the bubble's main body, centered visually.

### CRITICAL DEFINITIONS
1.  **Bubble Body**: The main container (ellipse, cloud, box, jagged burst).
2.  **Tail/Pointer**: The protrusion pointing to the character. **MUST BE IGNORED**.
3.  **Safe Text Area**: The rectangle where text can sit without touching edges.

### SHAPE-SPECIFIC RULES (STRICT)
- **'shout' / 'sun' (Irregular/Jagged)**: The rectangle must fit inside the **INNER CORE**. Do NOT extend into the spikes/zigs-zags. The safe area is often significantly smaller than the bounding box.
- **'thought' (Cloud)**: The rectangle must fit inside the inner curves (arcs).
- **'square' (Box)**: Fit close to edges but maintain 2-5% internal padding.
- **'normal' (Oval)**: Fit inside the curvature.
- **'whisper' (Dashed)**: Treat boundaries as strict limits.

### HANDLING OVERLAPS (CRITICAL)
- If two bubbles intersect, overlap, or touch (e.g., a double bubble):
  1. **SPLIT THEM**: Treat each "lobe" or distinct circle as a SEPARATE bubble.
  2. **DISTINCT CENTERS**: Find the geometric center of *each* lobe.
  3. **SEPARATE RECTANGLES**: Return a separate Safe Text Area for each lobe. 
  4. Do NOT return one large rectangle covering both.
  5. Do NOT merge them into a single entry unless it is a single unified box.

### COORDINATE RULES
- Coordinates (ymin, xmin, ymax, xmax) are 0-100 percentages.
- **CENTERING**: The rectangle must be centered on the visual mass of the Body (ignoring the tail).
- **TAIL EXCLUSION**: If the rectangle overlaps the tail, it is WRONG.
`;

const mapRawToBubble = (b: DetectedBubbleRaw, index: number): Bubble => {
  // Calculate dimensions
  let width = b.xmax - b.xmin;
  let height = b.ymax - b.ymin;
  
  // Safety checks
  if (width <= 0) width = 10;
  if (height <= 0) height = 10;

  // Map AI string to Enum
  let mappedType = BubbleType.NORMAL;
  if (b.type === 'shout') mappedType = BubbleType.SHOUT;
  else if (b.type === 'sun') mappedType = BubbleType.SUN;
  else if (b.type === 'thought') mappedType = BubbleType.THOUGHT;
  else if (b.type === 'square') mappedType = BubbleType.SQUARE;
  else if (b.type === 'whisper') mappedType = BubbleType.WHISPER;

  return {
    id: `auto-${index}-${Date.now()}`,
    x: b.xmin,
    y: b.ymin,
    width: width,
    height: height,
    text: '',
    type: mappedType,
    style: { 
      ...DEFAULT_BUBBLE_STYLE,
      padding: 2, 
      isAutoFit: true,
      align: 'center'
    }
  };
};

export const detectBubblesInImage = async (base64Image: string): Promise<Bubble[]> => {
  if (!process.env.API_KEY) {
    console.error("API Key is missing");
    return [];
  }

  try {
    const modelId = 'gemini-2.5-flash'; 

    const prompt = `
      Detect ALL speech bubbles in the provided comic page.
      
      Steps:
      1. Scan the image for speech bubbles.
      2. **CHECK FOR OVERLAPS**: If bubbles overlap, identify each individual bubble lobe separately.
      3. Analyze shape type (shout, sun, thought, square, normal, whisper).
      4. Determine the "Safe Text Area" (Inscribed Rectangle) for each distinct bubble.
      5. STRICTLY EXCLUDE TAILS.
      6. For 'shout'/'sun' bubbles, find the solid inner core.
      
      Return JSON with coordinates and type for every single bubble found.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: prompt }
        ]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0, // Deterministic for coordinates
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bubbles: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  ymin: { type: Type.NUMBER },
                  xmin: { type: Type.NUMBER },
                  ymax: { type: Type.NUMBER },
                  xmax: { type: Type.NUMBER },
                  type: { 
                    type: Type.STRING, 
                    enum: ["normal", "shout", "sun", "thought", "square", "whisper"]
                  }
                },
                required: ["ymin", "xmin", "ymax", "xmax", "type"]
              }
            }
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return [];

    const parsed = JSON.parse(jsonText) as { bubbles: DetectedBubbleRaw[] };
    return parsed.bubbles.map(mapRawToBubble);

  } catch (error) {
    console.error("Error detecting bubbles:", error);
    return [];
  }
};

export const detectSingleBubble = async (base64Image: string, x: number, y: number): Promise<Bubble | null> => {
  if (!process.env.API_KEY) return null;

  try {
    const modelId = 'gemini-2.5-flash';

    const prompt = `
      Analyze the specific speech bubble located at or enclosing point X=${x}%, Y=${y}%.
      
      Precise Task:
      1. **Identify the Bubble**: Find the connected white/colored shape around this point.
      2. **Isolate Body**: Distinguish the main bubble body from its tail/pointer.
      3. **Calculate Safe Area**: Determine the largest rectangle that fits INSIDE the body.
         - **Shout/Sun**: The rectangle MUST NOT touch the jagged spikes. It must be in the solid center.
         - **Tail**: The rectangle MUST NOT overlap the tail.
      4. **Center It**: Ensure the rectangle is visually centered in the body.
      
      Return the coordinates of this single safe text box.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: prompt }
        ]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ymin: { type: Type.NUMBER },
            xmin: { type: Type.NUMBER },
            ymax: { type: Type.NUMBER },
            xmax: { type: Type.NUMBER },
            type: { 
              type: Type.STRING, 
              enum: ["normal", "shout", "sun", "thought", "square", "whisper"]
            }
          },
          required: ["ymin", "xmin", "ymax", "xmax", "type"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return null;

    const rawBubble = JSON.parse(jsonText) as DetectedBubbleRaw;
    // Add a small ID suffix to ensure uniqueness
    const bubble = mapRawToBubble(rawBubble, 0);
    bubble.id = `manual-single-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    return bubble;

  } catch (error) {
    console.error("Error detecting single bubble:", error);
    return null;
  }
};

export const identifyBubbleType = async (base64Image: string, x: number, y: number, w: number, h: number): Promise<BubbleType | null> => {
  if (!process.env.API_KEY) return null;

  try {
    const modelId = 'gemini-2.5-flash';
    
    const centerX = x + w / 2;
    const centerY = y + h / 2;

    const prompt = `
      Analyze the visual style of the speech bubble located at center X=${centerX}%, Y=${centerY}%.
      Width=${w}%, Height=${h}%.

      Classify based on BORDER style:
      - 'shout': Jagged, sharp zigzag edges (explosion).
      - 'sun': (Sunburst) Many sharp spikes radiating (sticker/seal style).
      - 'thought': Cloud-like, connected circular arcs.
      - 'square': Straight lines, rectangular.
      - 'whisper': Dotted/dashed line.
      - 'normal': Smooth oval/circle.

      Return JSON: { "type": "..." }
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: prompt }
        ]
      },
      config: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { 
              type: Type.STRING, 
              enum: ["normal", "shout", "sun", "thought", "square", "whisper"]
            }
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return null;
    
    const result = JSON.parse(jsonText);
    
    switch(result.type) {
        case 'shout': return BubbleType.SHOUT;
        case 'sun': return BubbleType.SUN;
        case 'thought': return BubbleType.THOUGHT;
        case 'square': return BubbleType.SQUARE;
        case 'whisper': return BubbleType.WHISPER;
        default: return BubbleType.NORMAL;
    }

  } catch (error) {
    console.error("Error identifying bubble type:", error);
    return null;
  }
};

export const cleanImageArea = async (base64Crop: string): Promise<string | null> => {
  if (!process.env.API_KEY) return null;

  try {
    const modelId = 'gemini-2.5-flash-image';

    const prompt = `
      Remove the text from this speech bubble crop.
      Inpaint the area with the matching paper/background texture.
      Return the clean image.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Crop } },
          { text: prompt }
        ]
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return part.inlineData.data;
        }
      }
    }
    
    return null;

  } catch (error) {
    console.error("Error cleaning image area:", error);
    return null;
  }
};

export const translateText = async (text: string): Promise<string | null> => {
    if (!process.env.API_KEY || !text.trim()) return null;
  
    try {
      const modelId = 'gemini-2.5-flash';
  
      const prompt = `
        Translate the following comic book text to Arabic.
        
        Rules:
        1. Maintain the tone, emotion, and brevity suitable for a comic bubble.
        2. Keep it punchy.
        3. If the text is already Arabic, correct any grammar or spelling.
        
        Text: "${text}"
        
        Return ONLY the translated text.
      `;
  
      const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt
      });
  
      return response.text?.trim() || null;
  
    } catch (error) {
      console.error("Error translating text:", error);
      return null;
    }
};

export const fixGrammar = async (text: string): Promise<string | null> => {
  if (!process.env.API_KEY || !text.trim()) return null;

  try {
    const modelId = 'gemini-2.5-flash';

    const prompt = `
      Fix the grammar, spelling, and punctuation of the following comic dialogue.
      
      Rules:
      1. Maintain the original dialect/style if relevant.
      2. Ensure correct Arabic/English punctuation.
      3. Do NOT change the meaning.
      
      Text: "${text}"
      
      Return ONLY the corrected text.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt
    });

    return response.text?.trim() || null;

  } catch (error) {
    console.error("Error fixing grammar:", error);
    return null;
  }
};

export const shortenText = async (text: string): Promise<string | null> => {
  if (!process.env.API_KEY || !text.trim()) return null;

  try {
    const modelId = 'gemini-2.5-flash';

    const prompt = `
      Rewrite the following comic dialogue to be SHORTER and more punchy to fit in a small bubble.
      
      Rules:
      1. Reduce character count by 20-40%.
      2. Keep the core meaning and emotion.
      
      Text: "${text}"
      
      Return ONLY the shortened text.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt
    });

    return response.text?.trim() || null;

  } catch (error) {
    console.error("Error shortening text:", error);
    return null;
  }
};
