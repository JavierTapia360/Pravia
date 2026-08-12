import React, { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  title: string | React.ReactNode;
  children: React.ReactNode;
  width?: string;
}

export function SlideOver({ isOpen, onClose, title, children, width = '600px' }: SlideOverProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setShouldRender(true);
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => panelRef.current?.focus(), 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [isOpen, onClose]);

  const onAnimationEnd = () => {
    if (!isOpen) setShouldRender(false);
  };

  if (!shouldRender) return null;

  return (
    <div className={`slideover-shell ${isOpen ? 'slideover-shell--open' : ''}`}>
      {/* Backdrop for click outside */}
      <div className="slideover-backdrop" onClick={onClose} />
      
      {/* Panel */}
      <div 
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onAnimationEnd={onAnimationEnd}
        style={{
          width: '100%',
          maxWidth: width,
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        }}
        className="slideover-panel"
      >
        <div className="slideover-header">
          <div id={titleId} className="slideover-title">{title}</div>
          <button type="button" onClick={onClose} className="btn-icon" aria-label="Cerrar panel">
            <X size={20} />
          </button>
        </div>
        
        <div className="slideover-body">
          {children}
        </div>
      </div>
    </div>
  );
}
