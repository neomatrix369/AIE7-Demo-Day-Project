import React from 'react';
import BalloonTooltip from './BalloonTooltip';

interface RuleBasedBadgeProps {
  text?: string;
  style?: React.CSSProperties;
}

const RuleBasedBadge: React.FC<RuleBasedBadgeProps> = ({
  text = 'Rule-Based',
  style,
}) => {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 8px',
        fontSize: '0.75rem',
        borderRadius: '9999px',
        background: 'linear-gradient(135deg, #eef7ff 0%, #dceeff 100%)',
        border: '1px solid #99c2ff',
        color: '#0b5ed7',
        fontWeight: 600,
        ...style,
      }}
    >
      <span>🧩 {text}</span>
      <BalloonTooltip
        content={
          'This section uses transparent, rule-based scoring (no ML). Useful for explainability and fast iteration.'
        }
        maxWidth={320}
        cursor="help"
      >
        <span style={{ fontSize: '1rem', color: '#0b5ed7', opacity: 0.85 }}>ℹ️</span>
      </BalloonTooltip>
    </span>
  );
};

export default React.memo(RuleBasedBadge);


