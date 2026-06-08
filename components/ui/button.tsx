'use client';

import * as React from 'react';
import { buttonClassName, type ButtonSize, type ButtonVariant } from './button-styles';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/**
 * `type` defaults to "button". The previous implementation let it default to
 * the HTML default of "submit", which made every Cancel button inside a modal
 * form submit that form instead of closing it.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClassName({ variant, size, className })}
      {...props}
    />
  );
});
