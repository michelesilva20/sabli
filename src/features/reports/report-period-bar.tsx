import { DatePicker } from '@/design-system/components/date-picker';
import { FormField } from '@/design-system/components/form-field';
import { SegmentedControl } from '@/design-system/components/navigation';
import { Select } from '@/design-system/components/select';
import { fromCivilDate, toCivilDate } from '@/shared/api/reports';

export type ReportPreset = 'today' | '7d' | '30d' | 'custom';

export function ReportPeriodBar({
  from,
  to,
  preset,
  channel,
  onPreset,
  onFrom,
  onTo,
  onChannel,
  showChannel = true,
}: {
  from: string;
  to: string;
  preset: ReportPreset;
  channel: '' | 'TABLE' | 'COUNTER';
  onPreset: (preset: ReportPreset) => void;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
  onChannel: (value: '' | 'TABLE' | 'COUNTER') => void;
  showChannel?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <SegmentedControl<ReportPreset>
        label="Período rápido"
        value={preset}
        onChange={onPreset}
        options={[
          { id: 'today', label: 'Hoje' },
          { id: '7d', label: '7 dias' },
          { id: '30d', label: '30 dias' },
        ]}
      />
      <FormField id="report-from" label="De">
        <DatePicker
          id="report-from"
          value={fromCivilDate(from)}
          onChange={(date) => {
            onFrom(toCivilDate(date));
          }}
        />
      </FormField>
      <FormField id="report-to" label="Até">
        <DatePicker
          id="report-to"
          value={fromCivilDate(to)}
          onChange={(date) => {
            onTo(toCivilDate(date));
          }}
        />
      </FormField>
      {showChannel ? (
        <div className="w-40">
          <FormField id="report-channel" label="Canal">
            <Select
              id="report-channel"
              value={channel || 'ALL'}
              onValueChange={(value) =>
                onChannel(value === 'ALL' ? '' : (value as 'TABLE' | 'COUNTER'))
              }
              options={[
                { value: 'ALL', label: 'Todos' },
                { value: 'TABLE', label: 'Mesa' },
                { value: 'COUNTER', label: 'Balcão' },
              ]}
              ariaLabel="Canal de venda"
            />
          </FormField>
        </div>
      ) : null}
    </div>
  );
}
