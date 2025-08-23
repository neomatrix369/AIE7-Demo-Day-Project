import React from 'react';

export interface QuickAction {
  label: string;
  icon: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'accent';
  disabled?: boolean;
}

interface QuickActionsProps {
  actions: QuickAction[];
  layout?: 'horizontal' | 'vertical';
  size?: 'small' | 'compact';
  title?: string;
  style?: React.CSSProperties;
}

const QuickActions: React.FC<QuickActionsProps> = ({
  actions,
  layout = 'horizontal',
  size = 'small',
  title = 'Quick Actions',
  style
}) => {
  const getButtonStyle = (variant: QuickAction['variant'] = 'secondary') => {
    const baseStyle = {
      fontSize: size === 'compact' ? '0.75rem' : '0.8rem',
      padding: size === 'compact' ? '4px 8px' : '6px 12px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontWeight: '500',
      textDecoration: 'none',
      transition: 'all 0.2s ease',
      minWidth: layout === 'vertical' ? 'auto' : '100px'
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: '#007bff',
          color: 'white',
          border: '1px solid #007bff'
        };
      case 'accent':
        return {
          ...baseStyle,
          backgroundColor: '#e67e22',
          color: 'white',
          border: '1px solid #e67e22'
        };
      case 'secondary':
      default:
        return {
          ...baseStyle,
          backgroundColor: '#6c757d',
          color: 'white',
          border: '1px solid #6c757d'
        };
    }
  };

  const containerStyle = {
    display: 'flex',
    flexDirection: layout === 'vertical' ? 'column' as const : 'row' as const,
    gap: size === 'compact' ? '4px' : '8px',
    padding: size === 'compact' ? '8px' : '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
    alignItems: layout === 'horizontal' ? 'center' : 'stretch',
    flexWrap: 'wrap' as const,
    ...style
  };

  if (actions.length === 0) return null;

  return (
    <div style={containerStyle}>
      {layout === 'horizontal' && (
        <strong style={{ 
          fontSize: size === 'compact' ? '0.8rem' : '0.9rem', 
          color: '#333', 
          marginRight: '8px',
          whiteSpace: 'nowrap'
        }}>
          🚀 {title}:
        </strong>
      )}
      {layout === 'vertical' && (
        <h4 style={{ 
          margin: '0 0 8px 0', 
          color: '#333', 
          fontSize: size === 'compact' ? '0.8rem' : '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          🚀 {title}
        </h4>
      )}
      
      <div style={{
        display: 'flex',
        flexDirection: layout === 'vertical' ? 'column' as const : 'row' as const,
        gap: size === 'compact' ? '4px' : '6px',
        flex: 1
      }}>
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            disabled={action.disabled}
            style={{
              ...getButtonStyle(action.variant),
              opacity: action.disabled ? 0.6 : 1,
              cursor: action.disabled ? 'not-allowed' : 'pointer'
            }}
            title={action.label}
          >
            <span>{action.icon}</span>
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;