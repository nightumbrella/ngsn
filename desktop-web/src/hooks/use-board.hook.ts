// File: hooks/use-board.hook.ts
'use client'

import { useRef, useEffect, useCallback } from 'react';
import { CANVAS_BOARD_CONSTANTS } from '../constants/canvas-board.constants';
import { useBoardStore } from '@/context/use-board-store';

const { MIN_ZOOM, MAX_ZOOM, OFFSCREEN_CANVAS_SIZE } = CANVAS_BOARD_CONSTANTS;

export const useBoard = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvas = useRef<HTMLCanvasElement | null>(null);
  const pathCache = useRef<Path2D[]>([]);
  const worldOrigin = useRef({ x: OFFSCREEN_CANVAS_SIZE.width / 2, y: OFFSCREEN_CANVAS_SIZE.height / 2 });
  const animationFrame = useRef<number | null>(null);
  const dirty = useRef(false);

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

  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    return {
      x: (clientX - offset.x) / zoom,
      y: (clientY - offset.y) / zoom,
    };
  }, [offset, zoom]);

  const drawMainCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const offCanvas = offscreenCanvas.current;
    if (!canvas || !offCanvas) return;

    const ctx = canvas.getContext('2d');
    const offCtx = offCanvas.getContext('2d');
    if (!ctx || !offCtx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!isFinite(zoom) || zoom <= 0) return;

    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    // Dot grid chizish - zoom bo'yicha radius ni cheklash
    const spacing = 20;
    const baseRadius = 1;
    // Dot radius ni zoom bo'yicha normallashtirish va maksimal qiymat berish
    const dotRadius = Math.min(baseRadius / zoom, 2);
    
    // Faqat zoom yetarlicha katta bo'lganda dot larni ko'rsatish
    if (zoom > 0.3) {
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
          ctx.arc(x, y, dotRadius, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    }

    // Offscreen canvas da chiziqlarni chizish
    offCtx.clearRect(0, 0, offCanvas.width, offCanvas.height);
    offCtx.strokeStyle = '#000000';
    offCtx.lineWidth = 2 / zoom;
    offCtx.lineCap = 'round';
    offCtx.lineJoin = 'round';

    const origin = worldOrigin.current;
    for (const path of pathCache.current) {
      offCtx.stroke(path);
    }

    ctx.drawImage(offCanvas, -origin.x, -origin.y);
    ctx.restore();
  }, [offset, zoom]);

  const scheduleDraw = useCallback(() => {
    if (!dirty.current) {
      dirty.current = true;
      animationFrame.current = requestAnimationFrame(() => {
        drawMainCanvas();
        dirty.current = false;
      });
    }
  }, [drawMainCanvas]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldX = (mouseX - offset.x) / zoom;
    const worldY = (mouseY - offset.y) / zoom;

    const zoomFactor = 1.0 - e.deltaY * 0.001;
    const proposedZoom = zoom * zoomFactor;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, proposedZoom));

    if (!isFinite(newZoom) || newZoom <= 0) return;

    const newOffsetX = mouseX - worldX * newZoom;
    const newOffsetY = mouseY - worldY * newZoom;

    setZoom(newZoom);
    setOffset({ x: newOffsetX, y: newOffsetY });
  }, [offset, zoom, setZoom, setOffset]);

  useEffect(() => {
    if (!offscreenCanvas.current) {
      const canvas = document.createElement('canvas');
      canvas.width = OFFSCREEN_CANVAS_SIZE.width;
      canvas.height = OFFSCREEN_CANVAS_SIZE.height;
      offscreenCanvas.current = canvas;
      worldOrigin.current = {
        x: canvas.width / 2,
        y: canvas.height / 2,
      };
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const offCanvas = offscreenCanvas.current;
    if (!canvas || !offCanvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      scheduleDraw();
    };

    // Wheel event listener ni to'g'ridan-to'g'ri canvas ga qo'shish
    const addWheelListener = () => {
      if (canvas) {
        canvas.addEventListener('wheel', handleWheel, { passive: false });
      }
    };

    window.addEventListener('resize', resize);
    addWheelListener();
    resize();
    
    return () => {
      window.removeEventListener('resize', resize);
      if (canvas) {
        canvas.removeEventListener('wheel', handleWheel);
      }
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [scheduleDraw, handleWheel]);

  useEffect(() => {
    pathCache.current = strokes.map((stroke) => {
      const origin = worldOrigin.current;
      const path = new Path2D();
      path.moveTo(stroke.start.x + origin.x, stroke.start.y + origin.y);
      path.lineTo(stroke.end.x + origin.x, stroke.end.y + origin.y);
      return path;
    });
    scheduleDraw();
  }, [strokes, scheduleDraw]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (mode === 'draw') {
      setIsDrawing(true);
      const pos = getCanvasCoords(e.clientX, e.clientY);
      setLastPos(pos);
    } else if (mode === 'pan') {
      setStartPan({ x: e.clientX, y: e.clientY });
    }
  }, [mode, getCanvasCoords, setIsDrawing, setLastPos, setStartPan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
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
  }, [mode, isDrawing, startPan, lastPos, offset, getCanvasCoords, addStroke, setLastPos, setOffset, setStartPan]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
    setStartPan(null);
  }, [setIsDrawing, setStartPan]);

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
      // onWheel ni olib tashlash, chunki uni to'g'ridan-to'g'ri addEventListener bilan qo'shyapmiz
    },
  };
};