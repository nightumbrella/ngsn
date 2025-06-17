"use client";

import React, { ReactNode, useRef, useState, useCallback } from "react";

interface WhiteboardCanvasProps {
  children: ReactNode;
  className?: string;
}

const WhiteboardCanvas = React.memo(
  ({ children, className = "" }: WhiteboardCanvasProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      setPosition((pos) => ({ x: pos.x + dx, y: pos.y + dy }));
      lastPos.current = { x: e.clientX, y: e.clientY };
    }, []);

    const handleMouseUp = useCallback(() => {
      isDragging.current = false;
    }, []);

    const handleWheel = useCallback((e: React.WheelEvent) => {
      e.preventDefault();
      const zoomSpeed = 0.001;
      setScale((prev) => {
        const newScale = Math.min(Math.max(0.1, prev - e.deltaY * zoomSpeed), 4);
        return newScale;
      });
    }, []);

    return (
      <div
        ref={containerRef}
        className={`relative w-full h-full overflow-hidden bg-whiteboard-grid cursor-grab ${className}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div
          className="absolute top-0 left-0 will-change-transform"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: "0 0",
            width: "10000px",
            height: "10000px",
          }}
        >
          {children}
        </div>
      </div>
    );
  },
  (prev, next) => prev.children === next.children && prev.className === next.className
);

export default WhiteboardCanvas;

WhiteboardCanvas.displayName = "WhiteboardCanvas";

// export default WhiteboardCanvas;