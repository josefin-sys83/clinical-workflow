import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface SignatureModalProps {
  role: 'investigator' | 'sponsor';
  onComplete: (data: { name: string; date: string; signature: string }) => void;
  onCancel: () => void;
}

export function SignatureModal({ role, onComplete, onCancel }: SignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [name, setName] = useState('');
  const [hasDrawn, setHasDrawn] = useState(false);

  const roleNames = {
    investigator: 'Coordinating Investigator',
    sponsor: 'Sponsor Representative'
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setHasDrawn(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSubmit = () => {
    if (!name.trim() || !hasDrawn) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const signatureData = canvas.toDataURL('image/png');
    const today = new Date().toLocaleDateString('sv-SE'); // ISO format: YYYY-MM-DD

    onComplete({
      name: name.trim(),
      date: today,
      signature: signatureData
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>E-Signature: {roleNames[role]}</h3>
          <button onClick={onCancel} className="close-button">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="signer-name">Full Name</label>
            <input
              id="signer-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className="text-input"
            />
          </div>

          <div className="form-group">
            <label>Signature</label>
            <div className="signature-canvas-container">
              <canvas
                ref={canvasRef}
                width={500}
                height={200}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="signature-canvas"
              />
              <p className="canvas-hint">Draw your signature above</p>
            </div>
            <button onClick={clearSignature} className="clear-button">
              Clear Signature
            </button>
          </div>

          <div className="form-group">
            <p className="agreement-text">
              By signing this document, I confirm that I have read and agree to the protocol as outlined,
              and I will conduct the clinical investigation in accordance with ISO 14155:2020, EU MDR,
              and Good Clinical Practice principles.
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onCancel} className="cancel-button">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || !hasDrawn}
            className="submit-button"
          >
            Apply Signature
          </button>
        </div>
      </div>
    </div>
  );
}
