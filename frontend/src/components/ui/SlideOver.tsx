import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (isOpen) setShouldRender(true);
  }, [isOpen]);

  const onAnimationEnd = () => {
    if (!isOpen) setShouldRender(false);
  };

  if (!shouldRender) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 900,
      display: 'flex',
      justifyContent: 'flex-end',
      backgroundColor: isOpen ? 'rgba(0, 0, 0, 0.4)' : 'transparent',
      transition: 'background-color 0.3s ease',
      pointerEvents: isOpen ? 'auto' : 'none'
    }}>
      {/* Backdrop for click outside */}
      <div 
        style={{ position: 'absolute', inset: 0 }} 
        onClick={onClose}
      />
      
      {/* Panel */}
      <div 
        onAnimationEnd={onAnimationEnd}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: width,
          height: '100vh',
          background: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border-color)',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div style={{ 
          padding: 'var(--space-4) var(--space-6)', 
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-primary)'
        }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{title}</div>
          <button onClick={onClose} className="btn-icon">
            <X size={20} />
          </button>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
