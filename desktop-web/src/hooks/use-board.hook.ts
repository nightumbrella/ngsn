import { useRef, useEffect, useCallback } from 'react';
import {CANVAS_BOARD_CONSTANTS} from '../constants/canvas-board.constants'
import { useBoardStore } from '@/context/use-board-store';
const {MIN_ZOOM,MAX_ZOOM,OFFSCREEN_CANVAS_SIZE} = CANVAS_BOARD_CONSTANTS;

// Hook'da qaytariladigan qiymatlar uchun interfeys
interface BoardState {
  mode: 'draw' | 'pan';
  setMode: (mode: 'draw' | 'pan') => void;
  resetView: () => void;
  clearCanvas: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  eventHandlers: {
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseUp: () => void;
    onMouseLeave: () => void;
    onWheel: (e: React.WheelEvent) => void;
  };
}

export const useBoard = (): BoardState => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldOriginRef = useRef({ x: OFFSCREEN_CANVAS_SIZE.width / 2, y: OFFSCREEN_CANVAS_SIZE.height / 2 });

  // Zustand store'dan holatlarni olish
  const {
    mode,
    offset,
    zoom,
    isDrawing,
    lastPos,
    startPan,
    strokes,
    setMode,
    setOffset,
    setZoom,
    setIsDrawing,
    setLastPos,
    setStartPan,
    addStroke,
    resetView,
    clearCanvas,
  } = useBoardStore();

  // Kanvas koordinatalarini hisoblash
  const getCanvasCoords = useCallback(
    (clientX: number, clientY: number) => {
      return {
        x: (clientX - offset.x) / zoom,
        y: (clientY - offset.y) / zoom,
      };
    },
    [offset, zoom]
  );

  // Asosiy kanvasni chizish funksiyasi
  const drawMainCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const offscreen = offscreenCanvasRef.current;
    if (!canvas || !offscreen) return;
    const ctx = canvas.getContext('2d');
    const offCtx = offscreen.getContext('2d');
    if (!ctx || !offCtx) return;

    // Asosiy kanvasni tozalash
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid (nuqtali to'r) chizish
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    const spacing = 20;
    const dotRadius = 1;
    ctx.fillStyle = '#ccc';
    const viewBounds = {
      xMin: -offset.x / zoom,
      xMax: (canvas.width - offset.x) / zoom,
      yMin: -offset.y / zoom,
      yMax: (canvas.height - offset.y) / zoom,
    };
    const xStart = Math.floor(viewBounds.xMin / spacing) * spacing;
    const yStart = Math.floor(viewBounds.yMin / spacing) * spacing;
    for (let x = xStart; x < viewBounds.xMax; x += spacing) {
      for (let y = yStart; y < viewBounds.yMax; y += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, dotRadius / zoom, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    // Offscreen kanvasga chizilganlarni yangilash
    offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
    offCtx.strokeStyle = '#000000';
    offCtx.lineWidth = 2 / zoom;
    offCtx.lineCap = 'round';
    offCtx.lineJoin = 'round';
    const origin = worldOriginRef.current;
    strokes.forEach((stroke) => {
      offCtx.beginPath();
      offCtx.moveTo(stroke.start.x + origin.x, stroke.start.y + origin.y);
      offCtx.lineTo(stroke.end.x + origin.x, stroke.end.y + origin.y);
      offCtx.stroke();
    });

    // Offscreen kanvasni asosiy kanvasga chizish
    ctx.drawImage(offscreen, -origin.x, -origin.y);
    ctx.restore();
  }, [offset, zoom, strokes]);

  // Kanvasni initsializatsiya qilish va o'lcham o'zgarganda qayta chizish
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      drawMainCanvas();
    };

    if (!offscreenCanvasRef.current) {
      const off = document.createElement('canvas');
      off.width = OFFSCREEN_CANVAS_SIZE.width;
      off.height = OFFSCREEN_CANVAS_SIZE.height;
      offscreenCanvasRef.current = off;
      worldOriginRef.current = { x: off.width / 2, y: off.height / 2 };
    }

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [drawMainCanvas]);

  // Holat o'zgarganda kanvasni qayta chizish
  useEffect(() => {
    drawMainCanvas();
  }, [drawMainCanvas]);

  // Event Handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (mode === 'draw') {
        setIsDrawing(true);
        const pos = getCanvasCoords(e.clientX, e.clientY);
        setLastPos(pos);
      } else if (mode === 'pan') {
        setStartPan({ x: e.clientX, y: e.clientY });
      }
    },
    [mode, getCanvasCoords, setIsDrawing, setLastPos, setStartPan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (mode === 'draw' && isDrawing) {
        const currentPos = getCanvasCoords(e.clientX, e.clientY);
        addStroke({ start: lastPos, end: currentPos });
        setLastPos(currentPos);
      } else if (mode === 'pan' && startPan) {
        const dx = e.clientX - startPan.x;
        const dy = e.clientY - startPan.y;
        setOffset({ x: offset.x + dx, y: offset.y + dy });
        setStartPan({ x: e.clientX, y: e.clientY });
      }
    },
    [mode, isDrawing, startPan, lastPos, offset, getCanvasCoords, addStroke, setLastPos, setOffset, setStartPan]
  );

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
    setStartPan(null);
  }, [setIsDrawing, setStartPan]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldX = (mouseX - offset.x) / zoom;
      const worldY = (mouseY - offset.y) / zoom;

      const zoomFactor = 1.0 - e.deltaY * 0.001;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * zoomFactor));

      const newOffsetX = mouseX - worldX * newZoom;
      const newOffsetY = mouseY - worldY * newZoom;

      setZoom(newZoom);
      setOffset({ x: newOffsetX, y: newOffsetY });
    },
    [offset, zoom, setZoom, setOffset]
  );

  return {
    mode,
    setMode,
    resetView,
    clearCanvas,
    canvasRef,
    eventHandlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseUp,
      onWheel: handleWheel,
    },
  };
};