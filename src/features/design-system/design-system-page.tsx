import { useState } from 'react';
import { Button } from '@/design-system/components/button';
import { Badge, StatusBadge } from '@/design-system/components/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  MetricCard,
} from '@/design-system/components/card';
import { Alert, Banner, EmptyState, Progress, Skeleton } from '@/design-system/components/feedback';
import { Checkbox, RadioGroup, Switch } from '@/design-system/components/choice';
import { Input, SearchInput, Textarea } from '@/design-system/components/input';
import { Select } from '@/design-system/components/select';
import { Combobox, MultiSelect } from '@/design-system/components/combobox';
import { DatePicker } from '@/design-system/components/date-picker';
import { CurrencyInput, QuantityInput } from '@/design-system/components/number-input';
import { Dialog } from '@/design-system/components/dialog';
import { ConfirmationDialog } from '@/design-system/components/alert-dialog';
import { Sheet } from '@/design-system/components/sheet';
import { DropdownMenu, Popover } from '@/design-system/components/overlays';
import { ThemeSwitcher } from '@/design-system/components/theme-switcher';
import { pushToast } from '@/design-system/components/toast';
import { BarChart, DonutChart, LineChart } from '@/design-system/components/charts';
import { DataTable } from '@/design-system/components/data-table';
import { Tabs } from '@/design-system/components/media';
import { SegmentedControl } from '@/design-system/components/navigation';

export function DesignSystemPage() {
  const [dialog, setDialog] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [checked, setChecked] = useState(true);
  const [cents, setCents] = useState(4590);
  const [qty, setQty] = useState(1);
  const [date, setDate] = useState<Date | null>(new Date());
  const [combo, setCombo] = useState<string | null>('centro');
  const [many, setMany] = useState<string[]>(['pix']);
  const [segment, setSegment] = useState('hoje');
  const [tab, setTab] = useState('botoes');

  return (
    <div className="grid gap-8">
      <div>
        <p className="text-xs font-extrabold tracking-wide text-primary-strong uppercase">
          Sabli UI
        </p>
        <h1 className="text-3xl font-extrabold">Design system</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Rota interna de inspeção, disponível só no modo de desenvolvimento. Não faz parte do
          produto público.
        </p>
      </div>
      <ThemeSwitcher />
      <Tabs
        value={tab}
        onValueChange={setTab}
        tabs={[
          {
            id: 'botoes',
            label: 'Botões',
            content: (
              <div className="flex flex-wrap gap-2">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="success">Success</Button>
                <Button variant="link">Link</Button>
                <Button loading>Carregando</Button>
                <Button disabled>Desabilitado</Button>
              </div>
            ),
          },
          {
            id: 'form',
            label: 'Formulários',
            content: (
              <div className="grid max-w-xl gap-4">
                <Input placeholder="Texto" aria-label="Texto" />
                <SearchInput aria-label="Busca" placeholder="Busca" />
                <Textarea aria-label="Observação" placeholder="Observação" />
                <Select
                  options={[
                    { value: 'broto', label: 'Broto' },
                    { value: 'grande', label: 'Grande' },
                  ]}
                  placeholder="Tamanho"
                />
                <Combobox
                  options={[
                    { id: 'centro', label: 'Pizzaria do Centro' },
                    { id: 'praia', label: 'Pizzaria da Praia' },
                  ]}
                  value={combo}
                  onChange={setCombo}
                />
                <MultiSelect
                  options={[
                    { id: 'pix', label: 'Pix' },
                    { id: 'credit', label: 'Crédito' },
                  ]}
                  value={many}
                  onChange={setMany}
                />
                <DatePicker value={date} onChange={setDate} />
                <CurrencyInput valueCents={cents} onValueChange={setCents} />
                <QuantityInput value={qty} onChange={setQty} label="quantidade" />
                <Checkbox checked={checked} onCheckedChange={setChecked} label="Campo de exemplo" />
                <Switch checked={checked} onCheckedChange={setChecked} label="Interruptor" />
                <RadioGroup
                  value="a"
                  onValueChange={() => undefined}
                  options={[
                    { value: 'a', label: 'Opção A' },
                    { value: 'b', label: 'Opção B' },
                  ]}
                />
              </div>
            ),
          },
          {
            id: 'feedback',
            label: 'Feedback',
            content: (
              <div className="grid gap-3">
                <div className="flex flex-wrap gap-2">
                  <Badge>Neutro</Badge>
                  <Badge tone="coral">Coral</Badge>
                  <StatusBadge status="occupied" />
                  <StatusBadge status="available" />
                </div>
                <Alert title="Informação" tone="info">
                  Texto de apoio.
                </Alert>
                <Banner>Faixa contextual.</Banner>
                <Progress value={64} label="Preparo" />
                <Skeleton className="h-12" />
                <EmptyState title="Vazio" description="Estado sem registros." />
                <MetricCard
                  label="Exemplo"
                  value="R$ 45,66"
                  delta={8}
                  hint="variação ilustrativa"
                  icon={<span>R$</span>}
                />
              </div>
            ),
          },
          {
            id: 'overlay',
            label: 'Sobreposições',
            content: (
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setDialog(true)}>Dialog</Button>
                <Button variant="outline" onClick={() => setConfirm(true)}>
                  Confirmação
                </Button>
                <Button variant="secondary" onClick={() => setSheet(true)}>
                  Sheet
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => pushToast({ title: 'Aviso', description: 'Toast do Sabli UI.' })}
                >
                  Toast
                </Button>
                <Popover trigger={<Button variant="outline">Popover</Button>}>
                  <p className="text-sm font-bold">Conteúdo do popover</p>
                </Popover>
                <DropdownMenu
                  label="Menu"
                  trigger={<Button variant="outline">Menu</Button>}
                  items={[
                    {
                      id: '1',
                      label: 'Ação',
                      onSelect: () => pushToast({ title: 'Ação do menu' }),
                    },
                  ]}
                />
                <SegmentedControl
                  label="Período de exemplo"
                  value={segment}
                  onChange={setSegment}
                  options={[
                    { id: 'hoje', label: 'Hoje' },
                    { id: 'semana', label: 'Semana' },
                  ]}
                />
              </div>
            ),
          },
          {
            id: 'dados',
            label: 'Dados',
            content: (
              <div className="grid gap-4">
                <Card>
                  <CardHeader>
                    <div>
                      <CardTitle>Gráfico</CardTitle>
                      <CardDescription>Barras, linha e rosca</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-6">
                    <BarChart
                      title="Barras"
                      data={[
                        { label: '12h', value: 12000 },
                        { label: '13h', value: 18000 },
                      ]}
                    />
                    <LineChart
                      title="Linha"
                      data={[
                        { label: '12h', value: 12000 },
                        { label: '13h', value: 18000 },
                      ]}
                    />
                    <DonutChart
                      title="Rosca"
                      centerLabel="R$ 100,00"
                      data={[
                        { label: 'Pix', value: 60, color: '#7BC142', amount: 'R$ 60,00' },
                        { label: 'Crédito', value: 40, color: '#FF5A3C', amount: 'R$ 40,00' },
                      ]}
                    />
                  </CardContent>
                  <CardFooter>
                    <Button size="sm" variant="outline">
                      Ação do card
                    </Button>
                  </CardFooter>
                </Card>
                <DataTable
                  rows={[{ id: '1', name: 'Calabresa' }]}
                  getRowId={(row) => row.id}
                  columns={[{ id: 'name', header: 'Produto', cell: (row) => row.name }]}
                />
              </div>
            ),
          },
        ]}
      />
      <Dialog
        open={dialog}
        onOpenChange={setDialog}
        title="Dialog"
        description="Exemplo de diálogo acessível."
      >
        <p className="text-sm">Foco preso, Escape fecha e o foco volta ao botão.</p>
      </Dialog>
      <ConfirmationDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Confirmar ação?"
        description="Nada destrutivo acontece neste exemplo."
        confirmLabel="Confirmar"
        onConfirm={() => pushToast({ title: 'Confirmado', tone: 'success' })}
      />
      <Sheet open={sheet} onOpenChange={setSheet} title="Painel" description="Sheet lateral">
        <p className="text-sm">Conteúdo do painel.</p>
      </Sheet>
    </div>
  );
}
