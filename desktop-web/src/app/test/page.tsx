'use client'
import React, { useRef, useEffect, useState, useCallback } from 'react';

// =================================================================
// === FAYL: src/components/Icons.tsx (Piktogrammalar)
// =================================================================
const PenIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>;
const MoveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 9v4"/><path d="M5 15v2"/><path d="M5 7V5"/><path d="M9 5h4"/><path d="M15 5h2"/><path d="M7 5H5"/><path d="M21 12h-2"/><path d="M17 12h-2"/><path d="M13 12H9"/><path d="M9 21v-2"/><path d="M9 17v-2"/><path d="M9 13V9"/><path d="M15 21v-2"/><path d="M15 17v-2"/><path d="M15 13V9"/><path d="M12 21v-2"/><path d="M12 17v-2"/><path d="M12 13V9"/><path d="M12 5V3"/><path d="M12 7V5"/></svg>;
const HighlighterIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 5-3-3-3 3L6 8l3 3-3 3 3 3 3-3 3 3 3-3-3-3 3-3-3-3Z"/><path d="M9 22v-3h6v3Z"/></svg>;
const EraserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21H7Z"/><path d="M22 11.5 12.5 2"/></svg>;
const SquareIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>;
const TextIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 6.1H7"/><path d="M21 12.1H3"/><path d="M15 18.1H9"/><path d="M7 4v2"/><path d="M17 4v2"/><path d="M7 10v4"/><path d="M17 10v4"/><path d="M7 16v4"/><path d="M17 16v4"/></svg>;
const ImageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>;
const StickerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/><circle cx="12" cy="12" r="10"/></svg>;
const UndoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>;
const RedoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 0 9-9 9 9 0 0 0 6 2.3L21 13"/></svg>;

// =================================================================
// === FAYL: src/hooks/useBoard.ts (Kengaytirilgan Hook)
// =================================================================

type Tool = 'pan' | 'pen' | 'highlighter' | 'eraser' | 'rectangle' | 'text' | 'image' | 'sticker';
interface Point { x: number; y: number; }
interface TextInput { worldPos: Point; value: string; }
interface ToolOptions { color: string; lineWidth: number; sticker: string; }

// Konfiguratsiya
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10.0;
const OFFSCREEN_CANVAS_SIZE = { width: 8000, height: 8000 };
const HISTORY_LIMIT = 50;

const useBoard = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const worldOriginRef = useRef({ x: 0, y: 0 });

    const [tool, setTool] = useState<Tool>('pen');
    const [toolOptions, setToolOptions] = useState<ToolOptions>({ color: '#000000', lineWidth: 5, sticker: '😊' });
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [isInteracting, setIsInteracting] = useState(false);
    const [startPos, setStartPos] = useState<Point | null>(null);
    const [lastPos, setLastPos] = useState<Point>({ x: 0, y: 0 });
    const [textInput, setTextInput] = useState<TextInput | null>(null);
    
    // Tarix uchun holatlar
    const historyStack = useRef<ImageData[]>([]);
    const historyPointer = useRef(-1);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    // Asosiy chizish funksiyasi
    const drawMainCanvas = useCallback((tempDraw?: (ctx: CanvasRenderingContext2D) => void) => {
        const canvas = canvasRef.current;
        const offscreen = offscreenCanvasRef.current;
        if (!canvas || !offscreen) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Asosiy kanvasni tozalash
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Pan va zoom uchun transformatsiyalarni o'rnatish
        ctx.save();
        ctx.translate(offset.x, offset.y);
        ctx.scale(zoom, zoom);

        // Orqa fon (grid) chizish
        const spacing = 50;
        ctx.strokeStyle = '#e9ecef';
        ctx.lineWidth = 1 / zoom;
        const viewBounds = {
            xMin: -offset.x / zoom, xMax: (canvas.width - offset.x) / zoom,
            yMin: -offset.y / zoom, yMax: (canvas.height - offset.y) / zoom,
        };
        for (let x = Math.floor(viewBounds.xMin / spacing) * spacing; x < viewBounds.xMax; x += spacing) {
            ctx.beginPath(); ctx.moveTo(x, viewBounds.yMin); ctx.lineTo(x, viewBounds.yMax); ctx.stroke();
        }
        for (let y = Math.floor(viewBounds.yMin / spacing) * spacing; y < viewBounds.yMax; y += spacing) {
            ctx.beginPath(); ctx.moveTo(viewBounds.xMin, y); ctx.lineTo(viewBounds.xMax, y); ctx.stroke();
        }

        // Doimiy chizilgan qismni offscreen canvas'dan ko'chirish
        const origin = worldOriginRef.current;
        ctx.drawImage(offscreen, -origin.x, -origin.y);

        // Vaqtinchalik chizish (masalan, to'rtburchakni cho'zayotganda)
        if (tempDraw) tempDraw(ctx);
        ctx.restore();
    }, [offset, zoom]);

    // Tarix (Undo/Redo) funksiyalari
    const updateHistory = useCallback(() => {
        const offscreen = offscreenCanvasRef.current;
        const ctx = offscreen?.getContext('2d');
        if (!offscreen || !ctx) return;
        
        if (historyPointer.current < historyStack.current.length - 1) {
            historyStack.current.splice(historyPointer.current + 1);
        }
        
        const imageData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
        historyStack.current.push(imageData);
        
        if (historyStack.current.length > HISTORY_LIMIT) {
            historyStack.current.shift();
        } else {
            historyPointer.current++;
        }
        
        setCanUndo(true);
        setCanRedo(false);
    }, []);
    
    const undo = useCallback(() => {
        if (historyPointer.current > 0) {
            historyPointer.current--;
            const imageData = historyStack.current[historyPointer.current];
            const ctx = offscreenCanvasRef.current?.getContext('2d');
            if (ctx && imageData) {
                ctx.putImageData(imageData, 0, 0);
                drawMainCanvas();
                setCanUndo(historyPointer.current > 0);
                setCanRedo(true);
            }
        }
    }, [drawMainCanvas]);

    const redo = useCallback(() => {
        if (historyPointer.current < historyStack.current.length - 1) {
            historyPointer.current++;
            const imageData = historyStack.current[historyPointer.current];
            const ctx = offscreenCanvasRef.current?.getContext('2d');
            if (ctx && imageData) {
                ctx.putImageData(imageData, 0, 0);
                drawMainCanvas();
                setCanRedo(historyPointer.current < historyStack.current.length - 1);
                setCanUndo(true);
            }
        }
    }, [drawMainCanvas]);
    
    // Kanvasni initsializatsiya qilish effekti
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
            updateHistory();
        }

        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, [drawMainCanvas, updateHistory]);

    // Koordinata va matn chizish funksiyalari
    const getCanvasCoords = useCallback((clientX: number, clientY: number): Point => ({
        x: (clientX - offset.x) / zoom,
        y: (clientY - offset.y) / zoom,
    }), [offset, zoom]);
    
    const drawText = useCallback((text: string, pos: Point) => {
        const offCtx = offscreenCanvasRef.current?.getContext('2d');
        if (offCtx && text.trim() !== '') {
            const origin = worldOriginRef.current;
            offCtx.font = `${32}px Arial`; // O'lchamni zoom'ga bo'lish shart emas, chunki butun kanvas masshtablanadi
            offCtx.fillStyle = toolOptions.color;
            offCtx.textBaseline = 'top';
            offCtx.fillText(text, pos.x + origin.x, pos.y + origin.y);
            updateHistory();
        }
    }, [toolOptions.color, updateHistory]);

    // === Event Handlers ===
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        const pos = getCanvasCoords(e.clientX, e.clientY);
        if (textInput) {
            drawText(textInput.value, textInput.worldPos);
            setTextInput(null);
            return;
        }

        setIsInteracting(true);
        setStartPos(pos);
        if (tool === 'pan') {
            setLastPos({ x: e.clientX, y: e.clientY }); // Pan uchun ekran koordinatalari
        } else {
            setLastPos(pos); // Chizish uchun dunyo koordinatalari
        }
        
        if (tool === 'image') {
            fileInputRef.current?.click();
            setIsInteracting(false);
        } else if (tool === 'text') {
            setTextInput({ worldPos: pos, value: '' });
            setIsInteracting(false);
        } else if (tool === 'sticker') {
            const offCtx = offscreenCanvasRef.current?.getContext('2d');
            if (offCtx) {
                const origin = worldOriginRef.current;
                offCtx.font = `${100}px Arial`;
                offCtx.textAlign = 'center';
                offCtx.textBaseline = 'middle';
                offCtx.fillText(toolOptions.sticker, pos.x + origin.x, pos.y + origin.y);
                updateHistory();
            }
            setIsInteracting(false);
        }
    }, [getCanvasCoords, textInput, tool, toolOptions.sticker, drawText, updateHistory]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isInteracting) return;
        const currentPos = getCanvasCoords(e.clientX, e.clientY);
        
        if (tool === 'pan' && startPos) {
            setOffset(prev => ({ x: prev.x + (e.clientX - lastPos.x), y: prev.y + (e.clientY - lastPos.y) }));
            setLastPos({ x: e.clientX, y: e.clientY });
            return;
        }

        const offCtx = offscreenCanvasRef.current?.getContext('2d');
        if (!offCtx || !startPos) return;

        if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
            const origin = worldOriginRef.current;
            offCtx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
            offCtx.strokeStyle = tool === 'highlighter' ? 'rgba(255, 255, 0, 0.4)' : toolOptions.color;
            offCtx.lineWidth = tool === 'eraser' ? 40 : (tool === 'highlighter' ? 20 : toolOptions.lineWidth);
            offCtx.lineCap = 'round';
            offCtx.lineJoin = 'round';
            offCtx.beginPath();
            offCtx.moveTo(lastPos.x + origin.x, lastPos.y + origin.y);
            offCtx.lineTo(currentPos.x + origin.x, currentPos.y + origin.y);
            offCtx.stroke();
            setLastPos(currentPos);
        }
        
        drawMainCanvas(ctx => {
            if (tool === 'rectangle' && startPos) {
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.lineWidth = 2;
                ctx.strokeRect(startPos.x, startPos.y, currentPos.x - startPos.x, currentPos.y - startPos.y);
            }
        });
    }, [isInteracting, tool, startPos, lastPos, toolOptions, getCanvasCoords, drawMainCanvas]);

    const handleMouseUp = useCallback(() => {
        if (!isInteracting) return;
        const offCtx = offscreenCanvasRef.current?.getContext('2d');
        if (offCtx && startPos) {
            const endPos = lastPos;
            if (tool === 'rectangle') {
                const origin = worldOriginRef.current;
                offCtx.strokeStyle = toolOptions.color;
                offCtx.lineWidth = toolOptions.lineWidth;
                offCtx.strokeRect(startPos.x + origin.x, startPos.y + origin.y, endPos.x - startPos.x, endPos.y - startPos.y);
            }
            if (['pen', 'highlighter', 'eraser', 'rectangle'].includes(tool)) {
                offCtx.globalCompositeOperation = 'source-over';
                updateHistory();
            }
        }
        setIsInteracting(false);
        setStartPos(null);
    }, [isInteracting, tool, startPos, lastPos, toolOptions, updateHistory]);
    
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const rect = canvasRef.current!.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const worldX = (mouseX - offset.x) / zoom;
        const worldY = (mouseY - offset.y) / zoom;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * (1 - e.deltaY * 0.001)));
        setOffset({ x: mouseX - worldX * newZoom, y: mouseY - worldY * newZoom });
    }, [offset, zoom]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !startPos) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const offCtx = offscreenCanvasRef.current?.getContext('2d');
                if (offCtx) {
                    const origin = worldOriginRef.current;
                    const MAX_IMG_SIZE = 500;
                    let w = img.width, h = img.height;
                    if (w > MAX_IMG_SIZE || h > MAX_IMG_SIZE) {
                        if (w > h) { h *= MAX_IMG_SIZE / w; w = MAX_IMG_SIZE; } 
                        else { w *= MAX_IMG_SIZE / h; h = MAX_IMG_SIZE; }
                    }
                    offCtx.drawImage(img, startPos.x + origin.x, startPos.y + origin.y, w, h);
                    updateHistory();
                    drawMainCanvas();
                }
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    return {
        canvasRef, fileInputRef, tool, setTool, toolOptions, setToolOptions,
        textInput, setTextInput, zoom, offset,
        eventHandlers: {
            onMouseDown: handleMouseDown, onMouseMove: handleMouseMove,
            onMouseUp: handleMouseUp, onMouseLeave: handleMouseUp, onWheel: handleWheel
        },
        actions: { undo, redo, handleImageUpload },
        historyState: { canUndo, canRedo }
    };
};

// =================================================================
// === FAYL: src/components/Toolbar.tsx (Yangilangan Toolbar)
// =================================================================

const ToolButton = ({ children, ...props }: React.ComponentProps<'button'>) => (
    <button {...props} style={{ background: 'transparent', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', ...props.style }}>
        {children}
    </button>
);

const Toolbar: React.FC<{
    tool: Tool; setTool: (tool: Tool) => void;
    undo: () => void; redo: () => void;
    canUndo: boolean; canRedo: boolean;
}> = ({ tool, setTool, undo, redo, canUndo, canRedo }) => {
    const commonStyle = { color: '#343a40' };
    const activeStyle = { ...commonStyle, backgroundColor: '#e9ecef' };
  
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)', zIndex: 10, background: 'rgba(255,255,255,0.95)', padding: '6px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
            <ToolButton onClick={() => setTool('pan')} style={tool === 'pan' ? activeStyle : commonStyle} title="Siljitish"><MoveIcon /></ToolButton>
            <ToolButton onClick={() => setTool('pen')} style={tool === 'pen' ? activeStyle : commonStyle} title="Qalam"><PenIcon /></ToolButton>
            <ToolButton onClick={() => setTool('highlighter')} style={tool === 'highlighter' ? activeStyle : commonStyle} title="Marker"><HighlighterIcon /></ToolButton>
            <ToolButton onClick={() => setTool('eraser')} style={tool === 'eraser' ? activeStyle : commonStyle} title="O'chirg'ich"><EraserIcon /></ToolButton>
            <ToolButton onClick={() => setTool('rectangle')} style={tool === 'rectangle' ? activeStyle : commonStyle} title="To'rtburchak"><SquareIcon /></ToolButton>
            <ToolButton onClick={() => setTool('text')} style={tool === 'text' ? activeStyle : commonStyle} title="Matn"><TextIcon /></ToolButton>
            <ToolButton onClick={() => setTool('image')} style={tool === 'image' ? activeStyle : commonStyle} title="Rasm"><ImageIcon /></ToolButton>
            <ToolButton onClick={() => setTool('sticker')} style={tool === 'sticker' ? activeStyle : commonStyle} title="Stiker"><StickerIcon /></ToolButton>
            
            <div style={{ borderLeft: '1px solid #dee2e6', margin: '0 8px' }} />

            <ToolButton onClick={undo} disabled={!canUndo} style={{ ...commonStyle, opacity: canUndo ? 1 : 0.4 }} title="Orqaga"><UndoIcon /></ToolButton>
            <ToolButton onClick={redo} disabled={!canRedo} style={{ ...commonStyle, opacity: canRedo ? 1 : 0.4 }} title="Oldinga"><RedoIcon /></ToolButton>
        </div>
    );
};

const OptionsBar: React.FC<{
    tool: Tool;
    options: ToolOptions;
    setOptions: (options: ToolOptions | ((prev: ToolOptions) => ToolOptions)) => void;
}> = ({ tool, options, setOptions }) => {
    if (!['pen', 'highlighter', 'rectangle', 'text'].includes(tool)) return null;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'fixed', top: '5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 9, background: 'rgba(255,255,255,0.95)', padding: '8px 12px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
            <input type="color" value={options.color} onChange={e => setOptions(p => ({ ...p, color: e.target.value }))} style={{ border: 'none', background: 'transparent', width: '30px', height: '30px', cursor: 'pointer' }}/>
            {!['highlighter', 'text'].includes(tool) && (
              <>
                <input type="range" min="1" max="50" value={options.lineWidth} onChange={e => setOptions(p => ({ ...p, lineWidth: +e.target.value }))} />
                <span>{options.lineWidth}px</span>
              </>
            )}
        </div>
    );
};

// =================================================================
// === FAYL: src/components/CanvasBoard.tsx (Asosiy Komponent)
// =================================================================

export default function CanvasBoard() {
    const { tool, setTool, toolOptions, setToolOptions, canvasRef, fileInputRef, eventHandlers, textInput, setTextInput, zoom, offset, actions, historyState } = useBoard();
    
    // Matn kiritish oynasining pozitsiyasini hisoblash
    const getTextAreaStyle = (): React.CSSProperties => {
        if (!textInput) return { display: 'none' };
        const screenX = textInput.worldPos.x * zoom + offset.x;
        const screenY = textInput.worldPos.y * zoom + offset.y;
        return {
            position: 'absolute',
            left: `${screenX}px`,
            top: `${screenY}px`,
            zIndex: 20,
            border: `1px solid ${toolOptions.color}`,
            outline: 'none',
            fontSize: `${32 * zoom}px`,
            fontFamily: 'Arial',
            lineHeight: 1.2,
            background: '#ffffff',
            color: toolOptions.color,
            resize: 'none',
            width: 'auto',
            minWidth: '10px',
            padding: '0',
            transform: 'scale(1)',
            transformOrigin: 'top left',
        };
    };

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#f8f9fa' }}>
            <Toolbar tool={tool} setTool={setTool} undo={actions.undo} redo={actions.redo} canUndo={historyState.canUndo} canRedo={historyState.canRedo} />
            <OptionsBar tool={tool} options={toolOptions} setOptions={setToolOptions} />
            <canvas ref={canvasRef} {...eventHandlers} style={{ display: 'block', cursor: tool === 'pan' ? 'grab' : 'crosshair' }} />
            <input type="file" ref={fileInputRef} onChange={actions.handleImageUpload} accept="image/*" style={{ display: 'none' }} />
            {textInput && (
                <textarea
                    style={getTextAreaStyle()}
                    autoFocus
                    value={textInput.value}
                    onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
                    onBlur={() => {
                        if (textInput) {
                            actions.undo(); // Bu trick bilan matnni chizishga majburlaymiz
                        }
                    }}
                />
            )}
        </div>
    );
}