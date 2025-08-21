import React, { useState, useRef, useEffect } from 'react';

interface BalloonTooltipProps {
  children: React.ReactNode;
  content: string;
  maxWidth?: number;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  cursor?: 'help' | 'pointer' | 'default';
}

const BalloonTooltip: React.FC<BalloonTooltipProps> = ({
  children,
  content,
  maxWidth = 300,
  position = 'top',
  delay = 200,
  cursor = 'help'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        
        // Simple positioning based on position prop
        let top = rect.bottom + 8; // Default to bottom
        let left = rect.left + rect.width / 2 - maxWidth / 2;
        
        if (position === 'top') {
          top = rect.top - 40; // Approximate tooltip height
        }
        
        // Keep within viewport
        if (left < 8) left = 8;
        if (left + maxWidth > window.innerWidth - 8) {
          left = window.innerWidth - maxWidth - 8;
        }
        if (top < 8) top = 8;
        
        setTooltipPosition({ top, left });
        setIsVisible(true);
      }
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <div
        ref={triggerRef}
        style={{ 
          display: 'inline-block', 
          cursor
        }}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
      >
        {children}
      </div>

      {isVisible && (
        <div
          style={{
            position: 'fixed',
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            maxWidth,
            padding: '8px 12px',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 'normal',
            lineHeight: '1.4',
            zIndex: 10000,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            wordWrap: 'break-word',
            whiteSpace: 'pre-wrap',
            pointerEvents: 'none'
          }}
        >
          {content}
        </div>
      )}
    </>
  );
};

export default BalloonTooltip;