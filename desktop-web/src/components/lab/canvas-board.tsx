import { useBoard } from "@/hooks/use-board.hook";
import Toolbar from "./toolbar";

export const CanvasBoard = () => {
  const { mode, setMode, resetView, clearCanvas, canvasRef, eventHandlers } =
    useBoard();
  return (
    <div>
      <Toolbar
        mode={mode}
        setMode={setMode}
        resetView={resetView}
        clearCanvas={clearCanvas}
      />
      <canvas
        ref={canvasRef}
        {...eventHandlers}
        style={{
          display: "block",
          cursor: mode === "draw" ? "crosshair" : "grab",
        }}
      />
    </div>
  );
};
