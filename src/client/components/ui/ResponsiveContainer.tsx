import React from 'react';
import { clsx } from 'clsx';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  variant?: 'default' | 'narrow' | 'wide' | 'full';
  layout?: 'stack' | 'inline' | 'spread' | 'grid';
  className?: string;
  style?: React.CSSProperties;
  as?: keyof JSX.IntrinsicElements;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  variant = 'default',
  layout = 'stack',
  className,
  style,
  as: Component = 'div',
  ...props
}) => {
  const containerClasses = clsx(
    'responsive-container',
    {
      'content-container': variant === 'default',
      'content-narrow': variant === 'narrow',
      'content-wide': variant === 'wide',
      'layout-stack': layout === 'stack',
      'layout-inline': layout === 'inline',
      'layout-spread': layout === 'spread',
      'responsive-grid': layout === 'grid',
    },
    className
  );

  return (
    <Component className={containerClasses} style={style} {...props}>
      {children}
    </Component>
  );
};

interface ResponsiveButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  loading?: boolean;
}

export const ResponsiveButton: React.FC<ResponsiveButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  loading = false,
  className,
  disabled,
  style,
  ...props
}) => {
  const buttonClasses = clsx(
    'responsive-button',
    'text-arcade',
    'arcade-focus',
    'instant-change',
    'touch-target',
    {
      'w-full': fullWidth,
    },
    className
  );

  const variantStyles = {
    primary: {
      backgroundColor: 'var(--color-green)',
      color: 'var(--color-black)',
    },
    secondary: {
      backgroundColor: 'var(--color-black)',
      color: 'var(--color-white)',
    },
    danger: {
      backgroundColor: 'var(--color-red)',
      color: 'var(--color-white)',
    },
    success: {
      backgroundColor: 'var(--color-yellow)',
      color: 'var(--color-black)',
    },
  };

  const sizeStyles = {
    small: { fontSize: 'clamp(10px, 2vw, 12px)' },
    medium: { fontSize: 'clamp(12px, 2.5vw, 16px)' },
    large: { fontSize: 'clamp(16px, 3vw, 20px)' },
  };

  const combinedStyle = {
    ...variantStyles[variant],
    ...sizeStyles[size],
    opacity: (disabled || loading) ? 0.6 : 1,
    ...style,
  };

  return (
    <button
      className={buttonClasses}
      disabled={disabled || loading}
      style={combinedStyle}
      {...props}
    >
      {loading ? 'LOADING...' : children}
    </button>
  );
};

interface ResponsiveTextProps {
  children: React.ReactNode;
  variant?: 'hero' | 'large' | 'medium' | 'small';
  color?: 'white' | 'yellow' | 'red' | 'green' | 'gold';
  className?: string;
  style?: React.CSSProperties;
  as?: keyof JSX.IntrinsicElements;
}

export const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  children,
  variant = 'medium',
  color = 'white',
  className,
  style,
  as: Component = 'div',
  ...props
}) => {
  const textClasses = clsx(
    'text-arcade',
    `text-responsive-${variant}`,
    `color-${color}`,
    className
  );

  return (
    <Component className={textClasses} style={style} {...props}>
      {children}
    </Component>
  );
};

interface ResponsiveModalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  children,
  isOpen,
  onClose,
  className,
  style,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="responsive-modal" 
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', ...style }}
      onClick={onClose}
    >
      <div 
        className={clsx('responsive-modal-content', 'arcade-container', className)}
        style={{
          backgroundColor: 'var(--color-black)',
          border: '2px solid var(--color-white)',
          padding: 'clamp(16px, 4vw, 32px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 'auto';
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  style?: React.CSSProperties;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  columns = 'auto',
  gap = 'md',
  className,
  style,
}) => {
  const gridClasses = clsx(
    'responsive-grid',
    {
      'responsive-grid-1': columns === 1,
      'responsive-grid-2': columns === 2,
      'responsive-grid-3': columns === 3,
      'responsive-grid-auto': columns === 'auto',
    },
    `gap-responsive-${gap}`,
    className
  );

  return (
    <div className={gridClasses} style={style}>
      {children}
    </div>
  );
};