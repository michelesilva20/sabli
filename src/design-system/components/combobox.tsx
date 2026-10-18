import { useMemo, useState } from 'react';
import { Popover as PopoverPrimitive } from 'radix-ui';
import { Check, ChevronsUpDown } from 'lucide-react';
import { fieldClass } from '@/design-system/components/form-field';
import { cn } from '@/shared/utils/cn';

export interface ComboOption {
  id: string;
  label: string;
  description?: string;
}

export function Combobox({
  id,
  options,
  value,
  onChange,
  placeholder = 'Buscar',
  emptyText = 'Nenhum resultado',
  invalid,
  describedBy,
}: {
  id?: string;
  options: ComboOption[];
  value: string | null;
  onChange: (id: string) => void;
  placeholder?: string;
  emptyText?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((option) => option.id === value);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) => option.label.toLowerCase().includes(term));
  }, [options, query]);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          id={id}
          type="button"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          aria-expanded={open}
          className={cn(fieldClass, 'flex items-center justify-between text-left')}
        >
          <span className={selected ? '' : 'text-muted-foreground'}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          className="sabli-pop z-50 w-[var(--radix-popover-trigger-width)] rounded-[12px] border border-border bg-popover p-2 shadow-pop"
        >
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filtrar"
            className={cn(fieldClass, 'mb-2')}
            aria-label="Filtrar opções"
          />
          <ul className="max-h-56 overflow-auto" role="listbox">
            {filtered.length === 0 ? (
              <li className="px-2 py-3 text-sm text-muted-foreground">{emptyText}</li>
            ) : (
              filtered.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={option.id === value}
                    className="flex w-full items-center justify-between rounded-[10px] px-2 py-2 text-left text-sm font-bold hover:bg-muted"
                    onClick={() => {
                      onChange(option.id);
                      setOpen(false);
                    }}
                  >
                    <span>
                      {option.label}
                      {option.description ? (
                        <span className="block text-xs font-semibold text-muted-foreground">
                          {option.description}
                        </span>
                      ) : null}
                    </span>
                    {option.id === value ? <Check className="size-4" aria-hidden /> : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

export function MultiSelect({
  id,
  options,
  value,
  onChange,
  placeholder = 'Selecione',
  invalid,
  describedBy,
}: {
  id?: string;
  options: ComboOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [open, setOpen] = useState(false);
  const summary =
    value.length === 0
      ? placeholder
      : options
          .filter((option) => value.includes(option.id))
          .map((option) => option.label)
          .join(', ');

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          id={id}
          type="button"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn(fieldClass, 'flex items-center justify-between text-left')}
        >
          <span className="truncate">{summary}</span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content className="sabli-pop z-50 w-[var(--radix-popover-trigger-width)] rounded-[12px] border border-border bg-popover p-2 shadow-pop">
          <ul className="grid max-h-56 gap-1 overflow-auto">
            {options.map((option) => {
              const checked = value.includes(option.id);
              return (
                <li key={option.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-[10px] px-2 py-2 text-sm font-bold hover:bg-muted">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        onChange(
                          checked
                            ? value.filter((item) => item !== option.id)
                            : [...value, option.id],
                        )
                      }
                    />
                    {option.label}
                  </label>
                </li>
              );
            })}
          </ul>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
