import React from 'react';
import { clsx } from 'clsx';
import { useAccessibility } from '../../hooks/useAccessibility.js';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'outline';
  size?: 'small' | 'medium' | 'large' | 'hero';
  fullWidth?: boolean;
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  children: React.ReactNode;
  ariaDescribedBy?: string;
  ariaPressed?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  loading = false,
  loadingText = 'LOADING...',
  icon,
  iconPosition = 'left',
  className,
  children,
  disabled,
  ariaDescribedBy,
  ariaPressed,
  ...props
}) => {
  const { settings, isMotionReduced } = useAccessibility();
  const isDisabled = disabled || loading;
  
  const baseClasses = [
    'arcade-focus',
    'text-arcade',
    'border-2',
    'cursor-pointer',
    'select-none',
    'transition-none',
    'active:transform',
    'active:translate-y-0.5',
    'disabled:cursor-not-allowed',
    'disabled:opacity-50',
    'touch-target',
    'flex',
    'items-center',
    'justify-center',
    'gap-2',
  ];

  const variantClasses = {
    primary: [
      'bg-black',
      'color-white',
      'border-white',
      'hover:bg-white',
      'hover:color-black',
    ],
    secondary: [
      'bg-black',
      'color-yellow',
      'border-yellow',
      'hover:bg-yellow',
      'hover:color-black',
    ],
    danger: [
      'bg-black',
      'color-red',
      'border-red',
      'hover:bg-red',
      'hover:color-white',
    ],
    success: [
      'bg-black',
      'color-green',
      'border-green',
      'hover:bg-green',
      'hover:color-black',
    ],
    ghost: [
      'bg-transparent',
      'color-white',
      'border-transparent',
      'hover:border-white',
      'hover:bg-black',
    ],
    outline: [
      'bg-transparent',
      'color-white',
      'border-white',
      'hover:bg-white',
      'hover:color-black',
    ],
  };

  const sizeClasses = {
    small: ['text-small', 'px-3', 'py-2', 'min-h-[32px]'],
    medium: ['text-medium', 'px-4', 'py-3', 'min-h-[44px]'],
    large: ['text-large', 'px-6', 'py-4', 'min-h-[56px]'],
    hero: ['text-hero', 'px-8', 'py-6', 'min-h-[72px]'],
  };

  const widthClasses = fullWidth ? ['w-full'] : [];

  const renderContent = () => {
    if (loading) {
      return (
        <>
          <div className="animate-spin border-2 border-t-transparent w-4 h-4 border-current" />
          <span>{loadingText}</span>
        </>
      );
    }

    const iconElement = icon && (
      <span className="flex-shrink-0">{icon}</span>
    );

    return (
      <>
        {icon && iconPosition === 'left' && iconElement}
        <span>{children}</span>
        {icon && iconPosition === 'right' && iconElement}
      </>
    );
  };

  return (
    <button
      className={clsx(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        widthClasses,
        {
          'high-contrast': settings.highContrast,
          'large-text': settings.largeText,
          'reduced-motion': isMotionReduced(),
        },
        className
      )}
      disabled={isDisabled}
      aria-busy={loading}
      aria-describedby={ariaDescribedBy}
      aria-pressed={ariaPressed}
      {...props}
    >
      {renderContent()}
    </button>
  );
};