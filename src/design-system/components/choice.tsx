import {
  Checkbox as CheckboxPrimitive,
  RadioGroup as RadioPrimitive,
  Switch as SwitchPrimitive,
} from 'radix-ui';
import { Check } from 'lucide-react';
interface CheckboxProps {
  id?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
  description?: string;
}

export function Checkbox({
  id,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  label,
  description,
}: CheckboxProps) {
  const controlId = id ?? label;
  return (
    <div className="flex items-start gap-3">
      <CheckboxPrimitive.Root
        id={controlId}
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onCheckedChange={(value) => onCheckedChange?.(value === true)}
        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[6px] border border-input bg-card text-primary-action-foreground data-[state=checked]:border-primary-action data-[state=checked]:bg-primary-action"
      >
        <CheckboxPrimitive.Indicator>
          <Check className="size-3.5" aria-hidden />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <label htmlFor={controlId} className="grid gap-0.5 text-sm">
        <span className="font-bold">{label}</span>
        {description ? <span className="text-muted-foreground">{description}</span> : null}
      </label>
    </div>
  );
}

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

interface RadioGroupProps {
  value: string;
  onValueChange: (value: string) => void;
  options: RadioOption[];
  name?: string;
  labelledBy?: string;
}

export function RadioGroup({ value, onValueChange, options, name, labelledBy }: RadioGroupProps) {
  return (
    <RadioPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      name={name}
      aria-labelledby={labelledBy}
      className="grid gap-2"
    >
      {options.map((option) => (
        <label
          key={option.value}
          className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-border bg-card px-3 py-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
        >
          <RadioPrimitive.Item
            value={option.value}
            className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-input bg-card data-[state=checked]:border-primary-action"
          >
            <RadioPrimitive.Indicator className="size-2.5 rounded-full bg-primary-action" />
          </RadioPrimitive.Item>
          <span className="grid gap-0.5">
            <span className="text-sm font-bold">{option.label}</span>
            {option.description ? (
              <span className="text-xs text-muted-foreground">{option.description}</span>
            ) : null}
          </span>
        </label>
      ))}
    </RadioPrimitive.Root>
  );
}

interface SwitchProps {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function Switch({
  id,
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
}: SwitchProps) {
  const controlId = id ?? label;
  return (
    <div className="flex items-center justify-between gap-4">
      <label htmlFor={controlId} className="grid gap-0.5">
        <span className="text-sm font-bold">{label}</span>
        {description ? <span className="text-xs text-muted-foreground">{description}</span> : null}
      </label>
      <SwitchPrimitive.Root
        id={controlId}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        className="relative h-7 w-12 shrink-0 rounded-full bg-muted transition-colors data-[state=checked]:bg-primary-action"
      >
        <SwitchPrimitive.Thumb className="block size-5 translate-x-1 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-6" />
      </SwitchPrimitive.Root>
    </div>
  );
}
