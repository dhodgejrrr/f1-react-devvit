import React from 'react';
import { clsx } from 'clsx';

interface GridProps {
  columns?: 1 | 2 | 3 | 4;
  gap?: 'small' | 'medium' | 'large';
  className?: string;
  children: React.ReactNode;
}

export const Grid: React.FC<GridProps> = ({
  columns = 1,
  gap = 'medium',
  className,
  children
}) => {
  const columnClasses = {
    1: 'arcade-grid-1',
    2: 'arcade-grid-2', 
    3: 'arcade-grid-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  };

  const gapClasses = {
    small: 'gap-2',
    medium: 'gap-4',
    large: 'gap-6'
  };

  return (
    <div className={clsx(
      'arcade-grid',
      columnClasses[columns],
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  );
};

interface GridItemProps {
  span?: 1 | 2 | 3 | 4;
  className?: string;
  children: React.ReactNode;
}

export const GridItem: React.FC<GridItemProps> = ({
  span = 1,
  className,
  children
}) => {
  const spanClasses = {
    1: 'col-span-1',
    2: 'col-span-2',
    3: 'col-span-3',
    4: 'col-span-4'
  };

  return (
    <div className={clsx(spanClasses[span], className)}>
      {children}
    </div>
  );
};

interface ResponsiveContainerProps {
  maxWidth?: 'small' | 'medium' | 'large' | 'full';
  padding?: 'none' | 'small' | 'medium' | 'large';
  center?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  maxWidth = 'large',
  padding = 'medium',
  center = true,
  className,
  children
}) => {
  const maxWidthClasses = {
    small: 'max-w-sm',
    medium: 'max-w-md',
    large: 'max-w-4xl',
    full: 'max-w-full'
  };

  const paddingClasses = {
    none: '',
    small: 'p-2',
    medium: 'p-4',
    large: 'p-6'
  };

  const centerClasses = center ? 'mx-auto' : '';

  return (
    <div className={clsx(
      'w-full',
      maxWidthClasses[maxWidth],
      paddingClasses[padding],
      centerClasses,
      className
    )}>
      {children}
    </div>
  );
};

interface FlexProps {
  direction?: 'row' | 'column';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  gap?: 'none' | 'small' | 'medium' | 'large' | 'xl';
  wrap?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const Flex: React.FC<FlexProps> = ({
  direction = 'row',
  align = 'start',
  justify = 'start',
  gap = 'none',
  wrap = false,
  className,
  children
}) => {
  const directionClasses = {
    row: 'flex-row',
    column: 'flex-col'
  };

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch'
  };

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly'
  };

  const gapClasses = {
    none: '',
    small: 'gap-2',
    medium: 'gap-4',
    large: 'gap-6',
    xl: 'gap-8'
  };

  const wrapClasses = wrap ? 'flex-wrap' : '';

  return (
    <div className={clsx(
      'flex',
      directionClasses[direction],
      alignClasses[align],
      justifyClasses[justify],
      gapClasses[gap],
      wrapClasses,
      className
    )}>
      {children}
    </div>
  );
};

interface StackProps {
  spacing?: 'none' | 'small' | 'medium' | 'large' | 'xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
  className?: string;
  children: React.ReactNode;
}

export const Stack: React.FC<StackProps> = ({
  spacing = 'medium',
  align = 'stretch',
  className,
  children
}) => {
  return (
    <Flex
      direction="column"
      align={align}
      gap={spacing}
      className={className}
    >
      {children}
    </Flex>
  );
};

interface CenterProps {
  className?: string;
  children: React.ReactNode;
}

export const Center: React.FC<CenterProps> = ({ className, children }) => {
  return (
    <Flex
      align="center"
      justify="center"
      className={clsx('min-h-full', className)}
    >
      {children}
    </Flex>
  );
};

interface SpacerProps {
  size?: 'small' | 'medium' | 'large' | 'xl';
}

export const Spacer: React.FC<SpacerProps> = ({ size = 'medium' }) => {
  const sizeClasses = {
    small: 'h-2',
    medium: 'h-4',
    large: 'h-6',
    xl: 'h-8'
  };

  return <div className={sizeClasses[size]} />;
};

interface AspectRatioProps {
  ratio?: '1:1' | '4:3' | '16:9' | '3:2';
  className?: string;
  children: React.ReactNode;
}

export const AspectRatio: React.FC<AspectRatioProps> = ({
  ratio = '1:1',
  className,
  children
}) => {
  const ratioClasses = {
    '1:1': 'aspect-square',
    '4:3': 'aspect-[4/3]',
    '16:9': 'aspect-video',
    '3:2': 'aspect-[3/2]'
  };

  return (
    <div className={clsx('relative', ratioClasses[ratio], className)}>
      <div className="absolute inset-0">
        {children}
      </div>
    </div>
  );
};