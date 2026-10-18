import { useMemo, useState } from 'react';
import { Popover as PopoverPrimitive } from 'radix-ui';
import { Calendar } from 'lucide-react';
import { fieldClass } from '@/design-system/components/form-field';
import { cn } from '@/shared/utils/cn';

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function DatePicker({
  id,
  value,
  onChange,
  invalid,
  describedBy,
}: {
  id?: string;
  value: Date | null;
  onChange: (date: Date) => void;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(() => startOfMonth(value ?? new Date()));
  const label = value
    ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(
        value,
      )
    : 'Escolher data';

  const days = useMemo(() => {
    const first = startOfMonth(visible);
    const startWeekDay = first.getDay();
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - startWeekDay);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return date;
    });
  }, [visible]);

  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
    visible,
  );

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
          <span>{label}</span>
          <Calendar className="size-4 text-muted-foreground" aria-hidden />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content className="sabli-pop z-50 w-72 rounded-[16px] border border-border bg-popover p-3 shadow-pop">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              className="rounded-[10px] px-2 py-1 text-sm font-bold hover:bg-muted"
              onClick={() => setVisible(new Date(visible.getFullYear(), visible.getMonth() - 1, 1))}
            >
              Mês anterior
            </button>
            <p className="text-sm font-extrabold capitalize">{monthLabel}</p>
            <button
              type="button"
              className="rounded-[10px] px-2 py-1 text-sm font-bold hover:bg-muted"
              onClick={() => setVisible(new Date(visible.getFullYear(), visible.getMonth() + 1, 1))}
            >
              Próximo mês
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted-foreground">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => (
              <span key={`${day}-${index}`}>{day}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map((date) => {
              const inMonth = date.getMonth() === visible.getMonth();
              const selected = value ? sameDay(date, value) : false;
              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => {
                    onChange(date);
                    setOpen(false);
                  }}
                  className={cn(
                    'h-9 rounded-[10px] text-sm font-bold',
                    selected
                      ? 'bg-primary-action text-primary-action-foreground'
                      : 'hover:bg-muted',
                    !inMonth && 'text-muted-foreground',
                  )}
                  aria-pressed={selected}
                  aria-label={new Intl.DateTimeFormat('pt-BR').format(date)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
