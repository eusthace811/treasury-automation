import * as React from 'react';

import { cn } from '@/lib/utils';

export interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  width?: string | number;
  height?: string | number;
}

const Logo = React.forwardRef<HTMLDivElement, LogoProps>(
  (
    {
      className,
      src = '/images/logo.png',
      alt = 'Treasury Automation',
      width = '84px',
      height = 'auto',
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      className={cn('flex items-center space-x-3', className)}
      {...props}
    >
      <img
        src={src}
        alt={alt}
        className="object-contain"
        width={width}
        height={height}
      />
    </div>
  ),
);
Logo.displayName = 'Logo';

export { Logo };
