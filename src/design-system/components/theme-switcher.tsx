import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/design-system/theme/theme-provider';
import type { ThemePreference } from '@/shared/types/domain';
import { cn } from '@/shared/utils/cn';

const options: { id: ThemePreference; label: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Claro', icon: Sun },
  { id: 'dark', label: 'Escuro', icon: Moon },
  { id: 'system', label: 'Sistema', icon: Monitor },
];

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { preference, setPreference } = useTheme();
  return (
    <div
      role="radiogroup"
      aria-label="Tema da interface"
      className="inline-flex rounded-[14px] bg-muted p-1"
    >
      {options.map((option) => {
        const selected = preference === option.id;
        const Icon = option.icon;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.label}
            title={option.label}
            onClick={() => setPreference(option.id)}
            className={cn(
              'flex h-9 items-center gap-1.5 rounded-[10px] px-2.5 text-xs font-extrabold text-muted-foreground',
              selected && 'bg-card text-foreground shadow-card',
            )}
          >
            <Icon className="size-4" aria-hidden />
            {compact ? <span className="sr-only">{option.label}</span> : option.label}
          </button>
        );
      })}
    </div>
  );
}
