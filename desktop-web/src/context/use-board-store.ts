import { create } from "zustand";
import { CANVAS_BOARD_CONSTANTS } from "../constants/canvas-board.constants";

const { MIN_ZOOM, MAX_ZOOM, } = CANVAS_BOARD_CONSTANTS;

type Mode = "draw" | "pan";

interface BoardState {
  mode: Mode;
  offset: { x: number; y: number };
  zoom: number;
  isDrawing: boolean;
  lastPos: { x: number; y: number };
  startPan: { x: number; y: number } | null;
  strokes: Array<{
    start: { x: number; y: number };
    end: { x: number; y: number };
  }>;
  setMode: (mode:Mode) => void;
  setOffset: (offset: { x: number; y: number }) => void;
  setZoom: (zoom: number) => void;
  setIsDrawing: (isDrawing: boolean) => void;
  setLastPos: (pos: { x: number; y: number }) => void;
  setStartPan: (startPan: { x: number; y: number } | null) => void;
  addStroke: (stroke: {
    start: { x: number; y: number };
    end: { x: number; y: number };
  }) => void;
  resetView: () => void;
  clearCanvas: () => void;
}


export const useBoardStore = create<BoardState>((set) => ({
  mode: 'pan',
  offset: { x: 0, y: 0 },
  zoom: 1,
  isDrawing: false,
  lastPos: { x: 0, y: 0 },
  startPan: null,
  strokes: [],
  setMode: (mode:Mode) => set({ mode }),
  setOffset: (offset) => set({ offset }),
  setZoom: (zoom) => set({ zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom)) }),
  setIsDrawing: (isDrawing) => set({ isDrawing }),
  setLastPos: (lastPos) => set({ lastPos }),
  setStartPan: (startPan) => set({ startPan }),
  addStroke: (stroke) => set((state) => ({ strokes: [...state.strokes, stroke] })),
  resetView: () => set({ offset: { x: 0, y: 0 }, zoom: 1 }),
  clearCanvas: () => set({ strokes: [] }),
}));