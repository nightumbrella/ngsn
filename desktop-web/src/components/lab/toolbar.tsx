
// Oddiy Button komponenti
const Button = ({ children, ...props }: React.ComponentProps<'button'>) => (
  <button
    {...props}
    style={{
      ...props.style,
      background: '#333',
      color: 'white',
      padding: '8px 16px',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      margin: '0 4px',
      transition: 'background-color 0.2s',
    }}
  >
    {children}
  </button>
);

interface ToolbarProps {
  mode: 'draw' | 'pan';
  setMode: (mode: 'draw' | 'pan') => void;
  resetView: () => void;
  clearCanvas: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ mode, setMode, resetView, clearCanvas }) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        display: 'flex',
        gap: '0.5rem',
        background: 'rgba(255,255,255,0.8)',
        padding: '0.5rem',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      }}
    >
      <Button onClick={() => setMode('draw')} style={{ background: mode === 'draw' ? '#007bff' : '#333' }}>
        Chizish
      </Button>
      <Button onClick={() => setMode('pan')} style={{ background: mode === 'pan' ? '#007bff' : '#333' }}>
        Siljitish
      </Button>
      <Button onClick={resetView}>Reset</Button>
      <Button onClick={clearCanvas}>Tozalash</Button>
    </div>
  );
};

export default Toolbar;