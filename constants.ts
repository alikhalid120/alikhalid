
import { BubbleType, TextStyle } from "./types";

export const INITIAL_FONTS = [
  { name: 'Noto Kufi Arabic', value: 'sans-serif' },
  { name: 'Cairo', value: 'sans-serif' },
  { name: 'Changa', value: 'sans-serif' },
  { name: 'Tahoma', value: 'Tahoma, sans-serif' },
  { name: 'Courier New', value: 'Courier New, monospace' },
  { name: 'Segoe UI', value: 'sans-serif' },
  { name: 'Comic Sans MS', value: 'comic' },
];

export const BUBBLE_TYPES_CONFIG = [
  { id: BubbleType.NORMAL, label: 'عادية', icon: '💬', borderRadius: '50%' },
  { id: BubbleType.SHOUT, label: 'صراخ', icon: '💥', borderRadius: '10%' },
  { id: BubbleType.SUN, label: 'شمسية', icon: '☀', borderRadius: '50%' },
  { id: BubbleType.THOUGHT, label: 'تفكير', icon: '💭', borderRadius: '50%' },
  { id: BubbleType.SQUARE, label: 'مربع/سرد', icon: '⏹️', borderRadius: '0%' },
  { id: BubbleType.WHISPER, label: 'همس', icon: '🤫', borderRadius: '50%' },
  { id: BubbleType.MASK, label: 'قناع/بدون', icon: '🔲', borderRadius: '0%' },
];

// Visual presets for each bubble type to automate styling
export const TYPE_STYLE_PRESETS: Record<BubbleType, Partial<TextStyle>> = {
  [BubbleType.NORMAL]: {
    fontFamily: 'Segoe UI',
    fontWeight: 400,
    color: '#000000',
    fontSize: 16,
    align: 'center',
    textWrap: 'balance'
  },
  [BubbleType.SHOUT]: {
    fontFamily: 'Changa', // Impact-like font
    fontWeight: 900,
    color: '#dc2626', // Red
    fontSize: 22,
    align: 'center',
    textWrap: 'balance'
  },
  [BubbleType.SUN]: {
    fontFamily: 'Cairo',
    fontWeight: 700,
    color: '#ea580c', // Orange
    fontSize: 20,
    align: 'center',
    textWrap: 'balance'
  },
  [BubbleType.THOUGHT]: {
    fontFamily: 'Comic Sans MS',
    fontWeight: 400,
    color: '#475569', // Slate/Gray
    fontSize: 15,
    align: 'center',
    textWrap: 'balance'
  },
  [BubbleType.SQUARE]: {
    fontFamily: 'Tahoma',
    fontWeight: 400,
    color: '#000000',
    fontSize: 16,
    align: 'justify',
    textWrap: 'pretty' // Better for narration blocks
  },
  [BubbleType.WHISPER]: {
    fontFamily: 'Courier New',
    fontWeight: 300,
    color: '#64748b', // Light Gray
    fontSize: 12,
    align: 'center',
    textWrap: 'balance'
  },
  [BubbleType.MASK]: {
    fontFamily: 'Cairo',
    fontWeight: 700,
    color: '#ffffff', // White text often looks better on backgrounds
    fontSize: 18,
    align: 'center',
    textWrap: 'balance'
  }
};

export const PRESET_TEXTS = [
  "ماذا دهاك؟",
  "سأقضي عليك!",
  "هممم...",
  "لا أصدق ذلك!",
  "في مكان آخر..."
];
