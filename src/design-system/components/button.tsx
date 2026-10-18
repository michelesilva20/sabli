import { Slot } from 'radix-ui';
import { LoaderCircle } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[12px] font-bold transition-[background-color,color,transform,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary:
          'bg-primary-action text-primary-action-foreground hover:bg-primary-hover shadow-card',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary-hover',
        outline: 'border border-border bg-card text-foreground hover:bg-muted',
        ghost: 'text-foreground hover:bg-muted',
        destructive: 'bg-danger text-danger-foreground hover:brightness-95',
        success: 'bg-success text-success-foreground hover:brightness-95',
        link: 'h-auto rounded-none px-0 text-primary-strong underline-offset-4 hover:underline active:scale-100',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-4 text-sm',
        lg: 'h-12 px-5 text-base',
        icon: 'size-11',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps extends ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  loading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  asChild = false,
  type = 'button',
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className);
  if (asChild) {
    return (
      <Slot.Root className={classes} {...props}>
        {children}
      </Slot.Root>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-variant={variant ?? 'primary'}
      data-size={size ?? 'md'}
      {...props}
    >
      {loading ? (
        <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </button>
  );
}

export { buttonVariants };
