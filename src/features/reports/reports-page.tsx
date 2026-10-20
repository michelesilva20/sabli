import { useState } from 'react';
import { BarChart } from '@/design-system/components/charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/components/card';
import { Banner } from '@/design-system/components/feedback';
import { PageHeader, SegmentedControl } from '@/design-system/components/navigation';
import { ApiReportsPage } from '@/features/reports/api-reports-page';
import { useDashboardQuery } from '@/shared/api/hooks';
import { isApiMode } from '@/shared/config/runtime';
import { formatBRL } from '@/shared/domain/money';
import { PERIOD_OPTIONS } from '@/shared/mocks/fixtures';
import type { DashboardPeriod } from '@/shared/types/domain';

export function ReportsPage() {
  if (isApiMode()) return <ApiReportsPage />;
  return <DemoReportsPage />;
}

function DemoReportsPage() {
  const [period, setPeriod] = useState<DashboardPeriod>('week');
  const query = useDashboardQuery(period);
  const data = query.data;

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Relatórios"
        description="Leitura ilustrativa dos mesmos indicadores do painel. A consolidação oficial virá da API."
        actions={
          <SegmentedControl
            label="Período do relatório"
            value={period}
            onChange={setPeriod}
            options={PERIOD_OPTIONS.map((item) => ({ id: item.id, label: item.label }))}
          />
        }
      />
      <Banner>Estes gráficos não são um fechamento contábil.</Banner>
      {data ? (
        <Card>
          <CardHeader>
            <CardTitle>Faturamento por horário · {formatBRL(data.revenueCents)}</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              title="Faturamento por horário"
              data={data.salesByHour.map((point) => ({
                label: point.hour,
                value: point.totalCents,
              }))}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
