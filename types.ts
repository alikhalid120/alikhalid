
export enum BubbleType {
  NORMAL = 'normal',
  SHOUT = 'shout',
  SUN = 'sun',
  THOUGHT = 'thought',
  WHISPER = 'whisper',
  SQUARE = 'square',
  MASK = 'mask' // No border / Text Mask
}

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  align: 'right' | 'center' | 'left' | 'justify';
  textWrap: 'balance' | 'pretty' | 'wrap'; // New property for text shaping
  lineHeight: number;
  padding: number; // Percentage 0-100
  direction: 'rtl' | 'ltr';
  isAutoFit: boolean;
}

export interface Bubble {
  id: string;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  width: number; // Percentage 0-100
  height: number; // Percentage 0-100
  text: string;
  type: BubbleType;
  style: TextStyle;
}

export interface CleanPatch {
  id: string;
  x: number; // Percentage
  y: number; // Percentage
  width: number; // Percentage
  height: number; // Percentage
  imageBase64: string;
}

export interface HistoryState {
  bubbles: Bubble[];
  cleanPatches: CleanPatch[];
}

export const DEFAULT_BUBBLE_STYLE: TextStyle = {
  fontFamily: 'Segoe UI',
  fontSize: 16,
  fontWeight: 400,
  color: '#000000',
  align: 'center',
  textWrap: 'balance', // Default to balanced for better comic look
  lineHeight: 1.5,
  padding: 10,
  direction: 'rtl',
  isAutoFit: true,
};
