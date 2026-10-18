import { Select as SelectPrimitive } from 'radix-ui';
import { Check, ChevronDown } from 'lucide-react';
import { fieldClass } from '@/design-system/components/form-field';
import { cn } from '@/shared/utils/cn';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  id?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  name?: string;
  ariaLabel?: string;
  className?: string;
}

export function Select({
  id,
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder = 'Selecione',
  disabled,
  invalid,
  describedBy,
  name,
  ariaLabel,
  className,
}: SelectProps) {
  return (
    <SelectPrimitive.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      disabled={disabled}
      name={name}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-label={ariaLabel}
        className={cn(fieldClass, 'flex items-center justify-between gap-2 text-left', className)}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="sabli-pop z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[12px] border border-border bg-popover p-1 text-popover-foreground shadow-pop"
        >
          <SelectPrimitive.Viewport>
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="flex cursor-pointer items-center justify-between rounded-[10px] px-3 py-2 text-sm font-semibold outline-none data-[disabled]:opacity-40 data-[highlighted]:bg-muted"
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator>
                  <Check className="size-4" aria-hidden />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
