'use client'

import * as THREE from 'three';
import { useRef, useEffect, useCallback } from 'react';
import {CANVAS_BOARD_CONSTANTS} from '../constants/canvas-board.constants'
import { useBoardStore } from '@/context/use-board-store';
const {MIN_ZOOM,MAX_ZOOM,OFFSCREEN_CANVAS_SIZE} = CANVAS_BOARD_CONSTANTS;


// Throttle funksiyasi
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const throttle = <T extends (...args: any[]) => any>(func: T, limit: number): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

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
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const linesRef = useRef<THREE.Line[]>([]);

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
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const x = ((clientX - rect.left) - offset.x) / zoom;
      const y = -((clientY - rect.top) - offset.y) / zoom; // Y o'qi teskari
      return { x, y };
    },
    [offset, zoom]
  );

  // Sahna va rendererni sozlash
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Sahna yaratish
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Ortografik kamera
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = OFFSCREEN_CANVAS_SIZE.height;
    const camera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      1000
    );
    camera.position.z = 10;
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0xf0f0f0);
    rendererRef.current = renderer;

    // Grid yaratish
    const gridGeometry = new THREE.PlaneGeometry(OFFSCREEN_CANVAS_SIZE.width, OFFSCREEN_CANVAS_SIZE.height);
    const gridMaterial = new THREE.ShaderMaterial({
      uniforms: {
        spacing: { value: 20.0 },
        dotRadius: { value: 0.5 },
        color: { value: new THREE.Color(0xcccccc) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float spacing;
        uniform float dotRadius;
        uniform vec3 color;
        varying vec2 vUv;
        void main() {
          vec2 grid = fract(vUv * vec2(${OFFSCREEN_CANVAS_SIZE.width.toFixed(1)}, ${OFFSCREEN_CANVAS_SIZE.height.toFixed(1)}) / spacing);
          float dist = length(grid);
          if (dist < dotRadius / spacing) {
            gl_FragColor = vec4(color, 1.0);
          } else {
            discard;
          }
        }
      `,
      transparent: true,
    });
    const gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
    scene.add(gridMesh);

    // Render loop
    const animate = () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
      requestAnimationFrame(animate);
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(width, height);
      camera.left = (frustumSize * (width / height)) / -2;
      camera.right = (frustumSize * (width / height)) / 2;
      camera.top = frustumSize / 2;
      camera.bottom = frustumSize / -2;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // Kamera pozitsiyasini yangilash
  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.position.x = -offset.x / zoom;
      cameraRef.current.position.y = -offset.y / zoom;
      cameraRef.current.zoom = zoom;
      cameraRef.current.updateProjectionMatrix();
    }
  }, [offset, zoom]);

  // Strokes ni render qilish
  useEffect(() => {
    if (!sceneRef.current) return;

    // Eski liniyalarni o'chirish
    linesRef.current.forEach((line) => sceneRef.current?.remove(line));
    linesRef.current = [];

    // Yangi liniyalarni qo'shish
    strokes.forEach((stroke) => {
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        stroke.start.x, stroke.start.y, 0,
        stroke.end.x, stroke.end.y, 0
      ]);
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      const material = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 / zoom });
      const line = new THREE.Line(geometry, material);
      sceneRef.current?.add(line);
      linesRef.current.push(line);
    });
  }, [strokes, zoom]);

  // Clear canvas bo'lganda sahna tozalash
  useEffect(() => {
    if (strokes.length === 0 && sceneRef.current) {
      linesRef.current.forEach((line) => sceneRef.current?.remove(line));
      linesRef.current = [];
    }
  }, [strokes]);

  // Event Handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (mode === 'draw') {
        setIsDrawing(true);
        const pos = getCanvasCoords(e.clientX, e.clientY);
        setLastPos(pos);
        addStroke({ start: pos, end: pos });
      } else if (mode === 'pan') {
        setStartPan({ x: e.clientX, y: e.clientY });
      }
    },
    [mode, getCanvasCoords, setIsDrawing, setLastPos, setStartPan, addStroke]
  );

  const handleMouseMove = useCallback(
    throttle((e: React.MouseEvent) => {
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
    }, 16),
    [mode, isDrawing, startPan, lastPos, offset, getCanvasCoords, addStroke, setLastPos, setOffset, setStartPan]
  );

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
    setStartPan(null);
  }, [setIsDrawing, setStartPan]);

  const handleWheel = useCallback(
    throttle((e: React.WheelEvent) => {
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
    }, 16),
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