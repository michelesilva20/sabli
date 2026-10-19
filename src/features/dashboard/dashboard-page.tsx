import { Banknote, CalendarDays, ReceiptText, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useMemo, useState, type ReactNode } from 'react';
import { BarChart, DonutChart } from '@/design-system/components/charts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  MetricCard,
} from '@/design-system/components/card';
import { DataTable } from '@/design-system/components/data-table';
import { Skeleton } from '@/design-system/components/feedback';
import { PageHeader } from '@/design-system/components/navigation';
import { Select } from '@/design-system/components/select';
import { StatusBadge } from '@/design-system/components/badge';
import { ApiHomePage } from '@/features/auth/api-home-page';
import { isApiMode } from '@/shared/config/runtime';
import { useDashboardQuery } from '@/shared/api/hooks';
import { elapsedLabel, formatLongDate, greetingFor } from '@/shared/domain/date';
import { formatBRL } from '@/shared/domain/money';
import { useDemoSession } from '@/shared/demo/session';
import { PERIOD_OPTIONS } from '@/shared/mocks/fixtures';
import type { DashboardPeriod } from '@/shared/types/domain';

function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="h-full"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function DashboardPage() {
  if (isApiMode()) return <ApiHomePage />;
  return <DemoDashboardPage />;
}

function DemoDashboardPage() {
  const [period, setPeriod] = useState<DashboardPeriod>('today');
  const query = useDashboardQuery(period);
  const session = useDemoSession();
  const data = query.data;
  const greeting = greetingFor();
  const periodLabel = PERIOD_OPTIONS.find((item) => item.id === period)?.label ?? 'Hoje';

  const recent = useMemo(() => {
    const local =
      period === 'today'
        ? session.localOrders.map((order) => ({
            id: order.id,
            number: order.number,
            channel: order.channel,
            totalCents: order.totalCents,
            status: 'Em preparo',
            time: elapsedLabel(order.openedAt),
          }))
        : [];
    return [...local, ...(data?.recentOrders ?? [])];
  }, [data?.recentOrders, period, session.localOrders]);

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Início"
        description={`${greeting}, ${session.profile.firstName}. Resumo da operação ${period === 'today' ? 'de hoje' : periodLabel.toLowerCase()}, ${formatLongDate()}.`}
        actions={
          <div className="relative w-full sm:w-36">
            <CalendarDays
              className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-primary-strong"
              aria-hidden
            />
            <Select
              value={period}
              onValueChange={(value) => setPeriod(value as DashboardPeriod)}
              options={PERIOD_OPTIONS.map((item) => ({ value: item.id, label: item.label }))}
              ariaLabel="Período"
              className="h-9 rounded-[12px] bg-card pr-2 pl-8 text-sm font-extrabold shadow-card"
            />
          </div>
        }
      />

      {query.isLoading || !data ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores">
            <MetricCard
              label="Faturamento"
              value={formatBRL(data.revenueCents)}
              delta={data.revenueDelta}
              hint=""
              tone="coral"
              delay={0}
              icon={<Banknote className="size-5" aria-hidden />}
            />
            <MetricCard
              label="Vendas"
              value={String(data.salesCount)}
              delta={data.salesDelta}
              hint=""
              tone="purple"
              delay={0.04}
              icon={<ShoppingBag className="size-5" aria-hidden />}
            />
            <MetricCard
              label="Ticket médio"
              value={formatBRL(data.averageTicketCents)}
              delta={data.averageTicketDelta}
              hint=""
              tone="lime"
              delay={0.08}
              icon={<ReceiptText className="size-5" aria-hidden />}
            />
            <MetricCard
              label="Mesas ocupadas"
              value={`${data.occupiedTables} / ${data.totalTables}`}
              hint="do salão"
              tone="neutral"
              delay={0.12}
              icon={<UtensilsCrossed className="size-5" aria-hidden />}
            />
          </section>

          <section className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.95fr)]">
            <Reveal delay={0.1}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Vendas por horário</CardTitle>
                  <span className="inline-flex h-9 items-center gap-2 rounded-[12px] bg-muted px-3 text-sm font-bold text-foreground">
                    <CalendarDays className="size-4 text-primary-strong" aria-hidden />
                    {periodLabel}
                  </span>
                </CardHeader>
                <CardContent className="pt-2">
                  <BarChart
                    title="Vendas por horário"
                    data={data.salesByHour.map((point) => ({
                      label: point.hour,
                      value: point.totalCents,
                    }))}
                  />
                </CardContent>
              </Card>
            </Reveal>
            <Reveal delay={0.16}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Formas de pagamento</CardTitle>
                  <span className="inline-flex h-9 items-center gap-2 rounded-[12px] bg-muted px-3 text-sm font-bold text-foreground">
                    <CalendarDays className="size-4 text-primary-strong" aria-hidden />
                    {periodLabel}
                  </span>
                </CardHeader>
                <CardContent className="pt-2">
                  <DonutChart
                    title="Formas de pagamento"
                    centerLabel={formatBRL(data.revenueCents)}
                    data={data.payments.map((item) => ({
                      label: item.method,
                      value: item.percent,
                      color: item.color,
                      amount: formatBRL(item.totalCents),
                    }))}
                  />
                </CardContent>
              </Card>
            </Reveal>
          </section>

          <Reveal delay={0.2}>
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Pedidos recentes</CardTitle>
                  <p className="text-sm font-semibold text-muted-foreground">
                    Exemplos da operação
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  caption="Pedidos recentes"
                  rows={recent}
                  getRowId={(row) => row.id}
                  columns={[
                    {
                      id: 'number',
                      header: 'Pedido',
                      cell: (row) => <span className="tabular">#{row.number}</span>,
                    },
                    { id: 'channel', header: 'Origem', cell: (row) => row.channel },
                    {
                      id: 'status',
                      header: 'Status',
                      cell: (row) => <StatusBadge status={row.status.toLowerCase()} />,
                    },
                    { id: 'time', header: 'Quando', cell: (row) => row.time },
                    {
                      id: 'total',
                      header: 'Total',
                      className: 'text-right',
                      cell: (row) => <span className="tabular">{formatBRL(row.totalCents)}</span>,
                    },
                  ]}
                />
              </CardContent>
            </Card>
          </Reveal>
        </>
      )}
    </div>
  );
}
