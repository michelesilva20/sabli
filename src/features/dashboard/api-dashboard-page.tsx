import { Banknote, ChefHat, ReceiptText, ShoppingBag, Store, UtensilsCrossed, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { BarChart, DonutChart } from '@/design-system/components/charts';
import { Button } from '@/design-system/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/components/card';
import { MetricCard } from '@/design-system/components/card';
import { Alert, EmptyState, Skeleton } from '@/design-system/components/feedback';
import { PageHeader } from '@/design-system/components/navigation';
import { ReportPeriodBar, type ReportPreset } from '@/features/reports/report-period-bar';
import { ApiError } from '@/shared/api/http-client';
import {
  useReportOverviewQuery,
  useReportPaymentsQuery,
  useReportSalesQuery,
} from '@/shared/api/reports-queries';
import {
  REPORT_CHANNEL_LABEL,
  REPORT_METHOD_COLOR,
  REPORT_METHOD_LABEL,
  REPORT_TIMEZONE,
  presetRange,
  type ReportPeriodQuery,
} from '@/shared/api/reports';
import {
  canViewManagerReports,
  canViewReports,
  firstNameFrom,
  roleLabel,
  useAuthSession,
} from '@/shared/auth/session';
import { formatBRL } from '@/shared/domain/money';
import { greetingFor } from '@/shared/domain/date';

export function ApiDashboardPage() {
  const session = useAuthSession();
  const navigate = useNavigate();
  const place = session.context?.establishment;
  const canRead = canViewReports(session.context);
  const manager = canViewManagerReports(session.context);
  const [preset, setPreset] = useState<ReportPreset>('today');
  const [from, setFrom] = useState(() => presetRange('today').from);
  const [to, setTo] = useState(() => presetRange('today').to);
  const [channel, setChannel] = useState<'' | 'TABLE' | 'COUNTER'>('');
  const query: ReportPeriodQuery = useMemo(
    () => ({ from, to, timezone: REPORT_TIMEZONE, channel }),
    [from, to, channel],
  );
  const overview = useReportOverviewQuery(query, canRead);
  const payments = useReportPaymentsQuery(query, canRead);
  const sales = useReportSalesQuery(query, canRead && manager);

  const applyPreset = (next: ReportPreset) => {
    setPreset(next);
    if (next === 'custom') return;
    const range = presetRange(next);
    setFrom(range.from);
    setTo(range.to);
  };

  const changeFrom = (value: string) => {
    setPreset('custom');
    setFrom(value);
  };
  const changeTo = (value: string) => {
    setPreset('custom');
    setTo(value);
  };

  const error =
    overview.error instanceof ApiError
      ? overview.error
      : payments.error instanceof ApiError
        ? payments.error
        : sales.error instanceof ApiError
          ? sales.error
          : null;
  const forbidden = error?.status === 403;
  const loading = canRead && (overview.isLoading || payments.isLoading || (manager && sales.isLoading));
  const data = overview.data;
  const paymentData = payments.data;
  const salesData = sales.data;

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Início"
        description={`${greetingFor()}, ${firstNameFrom(session.me?.user.name)}. Indicadores de ${place?.name ?? 'seu estabelecimento'} no fuso America/Sao_Paulo.`}
      />
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-5">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-[14px] bg-primary-action text-primary-action-foreground">
              <Store className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-bold text-muted-foreground">{session.context?.organization.name}</p>
              <p className="text-lg font-extrabold">{place?.name}</p>
              <p className="text-xs font-semibold text-muted-foreground">{roleLabel(session.context, session.me)}</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/selecionar-estabelecimento')}>
            Trocar estabelecimento
          </Button>
        </CardContent>
      </Card>

      {!canRead ? (
        <EmptyState
          title="Indicadores gerenciais indisponíveis"
          description="Relatórios financeiros exigem perfil de gestão ou caixa. Garçom e cozinha acompanham mesas, pedidos e produção nas telas operacionais."
        />
      ) : (
        <>
          <ReportPeriodBar
            from={from}
            to={to}
            preset={preset}
            channel={channel}
            onPreset={applyPreset}
            onFrom={changeFrom}
            onTo={changeTo}
            onChannel={setChannel}
            showChannel={manager}
          />
          {forbidden ? (
            <Alert title="Acesso negado" tone="warning">
              {error?.message ?? 'Você não pode ver estes indicadores.'}
            </Alert>
          ) : error ? (
            <Alert title="Não foi possível carregar os indicadores" tone="danger">
              {error.message}
            </Alert>
          ) : loading || !data ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="h-24" />
              ))}
            </div>
          ) : (
            <>
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Indicadores">
                <MetricCard
                  label="Faturamento recebido"
                  value={formatBRL(data.receivedCents)}
                  hint="pagamentos aplicados no período"
                  tone="coral"
                  icon={<Banknote className="size-5" aria-hidden />}
                />
                <MetricCard
                  label="Vendas confirmadas"
                  value={String(data.salesCount)}
                  hint={`${formatBRL(data.soldCents)} em pedidos`}
                  tone="purple"
                  delay={0.04}
                  icon={<ShoppingBag className="size-5" aria-hidden />}
                />
                <MetricCard
                  label="Ticket médio"
                  value={formatBRL(data.averageTicketCents)}
                  hint="por pedido confirmado"
                  tone="lime"
                  delay={0.08}
                  icon={<ReceiptText className="size-5" aria-hidden />}
                />
                <MetricCard
                  label="Pedidos em produção"
                  value={String(data.inProductionOrders)}
                  hint="estado atual"
                  tone="neutral"
                  delay={0.1}
                  icon={<ChefHat className="size-5" aria-hidden />}
                />
                <MetricCard
                  label="Mesas ocupadas"
                  value={`${data.occupiedTables} / ${data.totalTables}`}
                  hint="ocupadas ou aguardando conta"
                  tone="coral"
                  delay={0.12}
                  icon={<UtensilsCrossed className="size-5" aria-hidden />}
                />
                <MetricCard
                  label="Contas pendentes"
                  value={String(data.pendingBills)}
                  hint={`${formatBRL(data.pendingCents)} em aberto`}
                  tone="purple"
                  delay={0.14}
                  icon={<Wallet className="size-5" aria-hidden />}
                />
              </section>

              <section className="grid items-stretch gap-4 xl:grid-cols-2">
                {manager ? (
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle>Vendas por dia</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {salesData && salesData.soldCents === 0 ? (
                        <EmptyState
                          title="Nenhuma venda no período"
                          description="Não há pedidos confirmados nestas datas. Os eixos mostram zero, sem série ilustrativa."
                        />
                      ) : (
                        <BarChart
                          title="Vendas por dia"
                          data={(salesData?.byDay ?? []).map((point) => ({
                            label: point.date.slice(8, 10),
                            value: point.cents,
                          }))}
                        />
                      )}
                    </CardContent>
                  </Card>
                ) : null}
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Formas de pagamento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {paymentData && paymentData.receivedCents === 0 ? (
                      <EmptyState
                        title="Nenhum recebimento no período"
                        description="Não há pagamentos aplicados nestas datas. Sangria, suprimento e troco não entram aqui."
                      />
                    ) : (
                      <DonutChart
                        title="Formas de pagamento"
                        centerLabel={formatBRL(paymentData?.receivedCents ?? 0)}
                        data={(paymentData?.byMethod ?? [])
                          .filter((item) => item.receivedCents > 0)
                          .map((item) => ({
                            label: REPORT_METHOD_LABEL[item.method],
                            value: item.percent,
                            color: REPORT_METHOD_COLOR[item.method],
                            amount: formatBRL(item.receivedCents),
                          }))}
                      />
                    )}
                  </CardContent>
                </Card>
                {manager && salesData ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Pedidos por canal</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <BarChart
                        title="Pedidos por canal"
                        formatValue={(value) => String(value)}
                        data={salesData.byChannel.map((item) => ({
                          label: REPORT_CHANNEL_LABEL[item.channel],
                          value: item.count,
                        }))}
                      />
                    </CardContent>
                  </Card>
                ) : null}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
