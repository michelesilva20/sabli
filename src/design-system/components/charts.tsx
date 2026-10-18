import { useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import {
  Bar,
  BarChart as ReBarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart as ReLineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatBRL } from '@/shared/domain/money';

interface ChartPoint {
  label: string;
  value: number;
}

function SabliTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number | string;
    payload?: { amount?: string };
  }>;
  label?: string | number;
}) {
  const point = payload?.[0];
  if (!active || !point) return null;
  const amount = point.payload?.amount;
  const text =
    amount !== undefined
      ? `${Number(point.value ?? 0)}% · ${amount}`
      : formatBRL(Number(point.value ?? 0));
  return (
    <div className="rounded-[14px] border border-border bg-popover px-3 py-2 shadow-pop">
      <p className="text-xs font-extrabold text-popover-foreground">
        {String(label ?? point.name ?? '')}
      </p>
      <p className="tabular text-sm font-bold text-muted-foreground">{text}</p>
    </div>
  );
}

const axisTick = { fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 700 };

function ChartFrame({
  title,
  children,
  summary,
  plotClassName = 'h-56',
}: {
  title: string;
  children: ReactNode;
  summary: { label: string; value: string }[];
  plotClassName?: string;
}) {
  return (
    <div className="grid gap-2">
      <div className={plotClassName}>{children}</div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th>Item</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          {summary.map((item) => (
            <tr key={item.label}>
              <td>{item.label}</td>
              <td>{item.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BarChart({ title, data }: { title: string; data: ChartPoint[] }) {
  const reduce = useReducedMotion();
  return (
    <ChartFrame
      title={title}
      summary={data.map((item) => ({ label: item.label, value: formatBRL(item.value) }))}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ReBarChart
          data={data}
          barCategoryGap={22}
          margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
        >
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 6" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} interval={0} />
          <YAxis hide />
          <Tooltip cursor={{ fill: 'var(--muted)', radius: 10 }} content={<SabliTooltip />} />
          <Bar
            dataKey="value"
            name="Vendas"
            fill="var(--primary)"
            radius={[10, 10, 4, 4]}
            maxBarSize={28}
            isAnimationActive={!reduce}
            animationDuration={480}
            animationEasing="ease-out"
          />
        </ReBarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function LineChart({ title, data }: { title: string; data: ChartPoint[] }) {
  const reduce = useReducedMotion();
  return (
    <ChartFrame
      title={title}
      summary={data.map((item) => ({ label: item.label, value: formatBRL(item.value) }))}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ReLineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 6" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} />
          <YAxis hide />
          <Tooltip content={<SabliTooltip />} />
          <Line
            type="monotone"
            dataKey="value"
            name="Valor"
            stroke="var(--secondary)"
            strokeWidth={3}
            dot={false}
            isAnimationActive={!reduce}
            animationDuration={480}
          />
        </ReLineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function DonutChart({
  title,
  data,
  centerLabel,
}: {
  title: string;
  data: { label: string; value: number; color: string; amount: string }[];
  centerLabel: string;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
      <div className="relative h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={52}
              outerRadius={70}
              paddingAngle={3}
              cornerRadius={6}
              stroke="var(--card)"
              isAnimationActive={!reduce}
              animationDuration={480}
              animationEasing="ease-out"
            >
              {data.map((item) => (
                <Cell key={item.label} fill={item.color} />
              ))}
            </Pie>
            <Tooltip content={<SabliTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-[11px] font-bold text-muted-foreground">Total</p>
            <p className="tabular text-sm font-extrabold tracking-tight">{centerLabel}</p>
          </div>
        </div>
      </div>
      <ul className="grid w-full gap-2.5">
        {data.map((item) => (
          <li key={item.label} className="flex items-center justify-between gap-2 text-[13px]">
            <span className="flex min-w-0 items-center gap-2 font-bold">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: item.color }}
                aria-hidden
              />
              <span className="leading-tight">{item.label}</span>
            </span>
            <span className="tabular shrink-0 font-extrabold">{total === 0 ? 0 : item.value}%</span>
          </li>
        ))}
      </ul>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((item) => (
            <tr key={item.label}>
              <td>{item.label}</td>
              <td>
                {item.value}% {item.amount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
