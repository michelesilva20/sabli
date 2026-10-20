import { useMemo, useState } from 'react';
import { BarChart, DonutChart } from '@/design-system/components/charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/components/card';
import { DataTable } from '@/design-system/components/data-table';
import { Alert, Banner, EmptyState, Skeleton } from '@/design-system/components/feedback';
import { PageHeader, Pagination } from '@/design-system/components/navigation';
import { ReportPeriodBar, type ReportPreset } from '@/features/reports/report-period-bar';
import { ApiError } from '@/shared/api/http-client';
import {
  REPORT_CHANNEL_LABEL,
  REPORT_METHOD_COLOR,
  REPORT_METHOD_LABEL,
  REPORT_TIMEZONE,
  presetRange,
  type ReportPeriodQuery,
} from '@/shared/api/reports';
import {
  useReportOperationsQuery,
  useReportOverviewQuery,
  useReportPaymentsQuery,
  useReportProductsQuery,
  useReportRevenueQuery,
  useReportSalesQuery,
} from '@/shared/api/reports-queries';
import { canViewManagerReports, canViewReports, useAuthSession } from '@/shared/auth/session';
import { formatBRL } from '@/shared/domain/money';

export function ApiReportsPage() {
  const session = useAuthSession();
  const canRead = canViewReports(session.context);
  const manager = canViewManagerReports(session.context);
  const [preset, setPreset] = useState<ReportPreset>('7d');
  const initial = presetRange('7d');
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [channel, setChannel] = useState<'' | 'TABLE' | 'COUNTER'>('');
  const [page, setPage] = useState(0);
  const query: ReportPeriodQuery = useMemo(
    () => ({ from, to, timezone: REPORT_TIMEZONE, channel, page, size: 10 }),
    [from, to, channel, page],
  );
  const overview = useReportOverviewQuery(query, canRead);
  const payments = useReportPaymentsQuery(query, canRead);
  const operations = useReportOperationsQuery(query, canRead);
  const sales = useReportSalesQuery(query, canRead && manager);
  const revenue = useReportRevenueQuery(query, canRead && manager);
  const products = useReportProductsQuery(query, canRead && manager);

  const applyPreset = (next: ReportPreset) => {
    setPreset(next);
    setPage(0);
    if (next === 'custom') return;
    const range = presetRange(next);
    setFrom(range.from);
    setTo(range.to);
  };

  const error = [overview, payments, operations, sales, revenue, products]
    .map((item) => item.error)
    .find((item): item is ApiError => item instanceof ApiError);
  const loading =
    canRead &&
    (overview.isLoading ||
      payments.isLoading ||
      operations.isLoading ||
      (manager && (sales.isLoading || revenue.isLoading || products.isLoading)));

  if (!canRead) {
    return (
      <div className="grid gap-5">
        <PageHeader
          title="Relatórios"
          description="Consolidação oficial do estabelecimento selecionado."
        />
        <EmptyState
          title="Acesso negado"
          description="Relatórios financeiros e gerenciais ficam com administração, gerência e, em parte, com o caixa."
        />
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Relatórios"
        description={`Leitura do PostgreSQL de ${session.context?.establishment?.name ?? 'seu estabelecimento'}. Venda usa a confirmação do pedido; recebimento usa o registro do pagamento. Fuso: America/Sao_Paulo.`}
      />
      <Banner>
        Faturamento recebido não inclui troco, sangria, suprimento nem fundo de caixa. Ticket médio é por
        pedido confirmado.
      </Banner>
      <ReportPeriodBar
        from={from}
        to={to}
        preset={preset}
        channel={channel}
        onPreset={applyPreset}
        onFrom={(value) => {
          setPreset('custom');
          setPage(0);
          setFrom(value);
        }}
        onTo={(value) => {
          setPreset('custom');
          setPage(0);
          setTo(value);
        }}
        onChannel={(value) => {
          setPage(0);
          setChannel(value);
        }}
        showChannel={manager}
      />
      {error?.status === 403 ? (
        <Alert title="Acesso negado" tone="warning">
          {error.message}
        </Alert>
      ) : error ? (
        <Alert title="Não foi possível carregar os relatórios" tone="danger">
          {error.message}
        </Alert>
      ) : loading ? (
        <div className="grid gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Resumo financeiro">
            <Summary label="Recebido" value={formatBRL(overview.data?.receivedCents ?? 0)} hint="applied_cents" />
            <Summary
              label="Vendido"
              value={formatBRL(overview.data?.soldCents ?? 0)}
              hint={`${overview.data?.salesCount ?? 0} pedidos`}
            />
            <Summary
              label="Ticket médio"
              value={formatBRL(overview.data?.averageTicketCents ?? 0)}
              hint="pedido confirmado"
            />
            <Summary
              label="Contas pendentes"
              value={formatBRL(overview.data?.pendingCents ?? 0)}
              hint={`${overview.data?.pendingBills ?? 0} contas · estado atual`}
            />
          </section>

          {manager ? (
            <Card>
              <CardHeader>
                <CardTitle>Vendas e recebimentos por dia</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6 xl:grid-cols-2">
                {sales.data && sales.data.soldCents === 0 ? (
                  <EmptyState
                    title="Período sem vendas"
                    description="Nenhum pedido confirmado nestas datas."
                  />
                ) : (
                  <BarChart
                    title="Vendas por dia"
                    data={(sales.data?.byDay ?? []).map((point) => ({
                      label: point.date.slice(8, 10),
                      value: point.cents,
                    }))}
                  />
                )}
                {revenue.data && revenue.data.receivedCents === 0 ? (
                  <EmptyState
                    title="Período sem pagamentos"
                    description="Nenhum valor aplicado nestas datas."
                  />
                ) : (
                  <BarChart
                    title="Recebimentos por dia"
                    data={(revenue.data?.byDay ?? []).map((point) => ({
                      label: point.date.slice(8, 10),
                      value: point.cents,
                    }))}
                  />
                )}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Métodos de pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.data && payments.data.receivedCents === 0 ? (
                <EmptyState
                  title="Nenhum recebimento"
                  description="Não há pagamentos aplicados no período selecionado."
                />
              ) : (
                <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                  <DonutChart
                    title="Métodos de pagamento"
                    centerLabel={formatBRL(payments.data?.receivedCents ?? 0)}
                    data={(payments.data?.byMethod ?? [])
                      .filter((item) => item.receivedCents > 0)
                      .map((item) => ({
                        label: REPORT_METHOD_LABEL[item.method],
                        value: item.percent,
                        color: REPORT_METHOD_COLOR[item.method],
                        amount: formatBRL(item.receivedCents),
                      }))}
                  />
                  <DataTable
                    caption="Recebimentos por método"
                    rows={payments.data?.byMethod ?? []}
                    getRowId={(row) => row.method}
                    emptyTitle="Sem pagamentos"
                    emptyDescription="Nenhum recebimento neste filtro."
                    columns={[
                      { id: 'method', header: 'Método', cell: (row) => REPORT_METHOD_LABEL[row.method] },
                      { id: 'count', header: 'Qtd', cell: (row) => row.count },
                      {
                        id: 'cents',
                        header: 'Recebido',
                        className: 'text-right',
                        cell: (row) => formatBRL(row.receivedCents),
                      },
                    ]}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {manager ? (
            <Card>
              <CardHeader>
                <CardTitle>Produtos mais vendidos</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <DataTable
                  caption="Produtos mais vendidos"
                  rows={products.data?.items ?? []}
                  getRowId={(row) => `${row.productId ?? row.productName}`}
                  emptyTitle="Nenhum produto vendido"
                  emptyDescription="Não há itens de pedidos confirmados neste período."
                  columns={[
                    { id: 'name', header: 'Produto', cell: (row) => row.productName },
                    { id: 'qty', header: 'Qtd', cell: (row) => row.quantity },
                    {
                      id: 'sold',
                      header: 'Vendido',
                      className: 'text-right',
                      cell: (row) => formatBRL(row.soldCents),
                    },
                  ]}
                />
                {products.data && products.data.total > products.data.size ? (
                  <Pagination
                    page={products.data.page + 1}
                    pageCount={Math.ceil(products.data.total / products.data.size)}
                    onPageChange={(next) => setPage(next - 1)}
                  />
                ) : null}
                {sales.data ? (
                  <BarChart
                    title="Pedidos por canal"
                    formatValue={(value) => String(value)}
                    data={sales.data.byChannel.map((item) => ({
                      label: REPORT_CHANNEL_LABEL[item.channel],
                      value: item.count,
                    }))}
                  />
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Operação de mesas</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                caption="Operação de mesas"
                rows={[
                  {
                    id: 'occupied',
                    label: 'Mesas ocupadas agora',
                    value: `${operations.data?.occupiedTables ?? 0} / ${operations.data?.totalTables ?? 0}`,
                  },
                  {
                    id: 'awaiting',
                    label: 'Aguardando conta',
                    value: String(operations.data?.awaitingBill ?? 0),
                  },
                  {
                    id: 'production',
                    label: 'Pedidos em produção',
                    value: String(operations.data?.inProductionOrders ?? 0),
                  },
                  {
                    id: 'pending',
                    label: 'Contas com saldo',
                    value: `${operations.data?.pendingBills ?? 0} · ${formatBRL(operations.data?.pendingCents ?? 0)}`,
                  },
                  {
                    id: 'opened',
                    label: 'Atendimentos abertos no período',
                    value: String(operations.data?.servicesOpenedInPeriod ?? 0),
                  },
                  {
                    id: 'closed',
                    label: 'Atendimentos encerrados no período',
                    value: String(operations.data?.servicesClosedInPeriod ?? 0),
                  },
                ]}
                getRowId={(row) => row.id}
                columns={[
                  { id: 'label', header: 'Indicador', cell: (row) => row.label },
                  { id: 'value', header: 'Valor', className: 'text-right', cell: (row) => row.value },
                ]}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Summary({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <CardContent className="grid gap-1 py-5">
        <p className="text-xs font-bold text-muted-foreground">{label}</p>
        <p className="tabular text-2xl font-extrabold tracking-tight">{value}</p>
        <p className="text-xs font-semibold text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
