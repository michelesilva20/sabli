import { Minus, Plus } from 'lucide-react';
import type { ComponentProps } from 'react';
import { fieldClass } from '@/design-system/components/form-field';
import { Button } from '@/design-system/components/button';
import { formatBRL, parseDigitsToCents } from '@/shared/domain/money';
import { cn } from '@/shared/utils/cn';

export function NumberInput({ className, ...props }: ComponentProps<'input'>) {
  return <input inputMode="numeric" className={cn(fieldClass, 'tabular', className)} {...props} />;
}

interface CurrencyInputProps {
  id?: string;
  valueCents: number;
  onValueChange: (cents: number) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  name?: string;
}

export function CurrencyInput({
  id,
  valueCents,
  onValueChange,
  disabled,
  invalid,
  describedBy,
  name,
}: CurrencyInputProps) {
  return (
    <input
      id={id}
      name={name}
      inputMode="numeric"
      autoComplete="off"
      disabled={disabled}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={cn(fieldClass, 'tabular')}
      value={formatBRL(valueCents)}
      onChange={(event) => onValueChange(parseDigitsToCents(event.target.value))}
    />
  );
}

interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label: string;
}

export function QuantityInput({ value, onChange, min = 1, max = 99, label }: QuantityInputProps) {
  return (
    <div className="inline-flex items-center gap-1" role="group" aria-label={label}>
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="size-9"
        aria-label={`Diminuir ${label}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus className="size-4" aria-hidden />
      </Button>
      <span className="tabular w-8 text-center text-sm font-extrabold">{value}</span>
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="size-9"
        aria-label={`Aumentar ${label}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus className="size-4" aria-hidden />
      </Button>
    </div>
  );
}
