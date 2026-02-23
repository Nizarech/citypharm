import { trpc } from "@/lib/trpc";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from "recharts";
import {
  Package, AlertTriangle, TrendingUp, ShoppingCart,
  Clock, XCircle, AlertCircle, CheckCircle2, CalendarDays, Trophy, Activity
} from "lucide-react";

type KpiTone = "neutral" | "warning" | "danger" | "success" | "info";

const toneStyles: Record<KpiTone, { bg: string; fg: string }> = {
  neutral: { bg: "bg-slate-50", fg: "text-slate-600" },
  info:    { bg: "bg-blue-50",  fg: "text-blue-600"  },
  success: { bg: "bg-emerald-50", fg: "text-emerald-600" },
  warning: { bg: "bg-amber-50", fg: "text-amber-600" },
  danger:  { bg: "bg-red-50",   fg: "text-red-600"   },
};

function KpiCard({
  label, value, icon: Icon, tone = "neutral", sub,
}: {
  label: string;
  value: string | number;
  icon: any;
  tone?: KpiTone;
  sub?: string;
}) {
  const t = toneStyles[tone];
  return (
    <div className="bg-card rounded-xl border border-border/80 p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold text-foreground mt-1.5 tracking-tight">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${t.bg} ${t.fg}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title, icon: Icon, action, children,
}: {
  title: string;
  icon?: any;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-xl border border-border/80 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const { data: stats } = trpc.dashboard.stats.useQuery();
  const { data: dailyRevenue } = trpc.dashboard.dailyRevenue.useQuery({ days: 30 });
  const { data: topProducts } = trpc.dashboard.topProducts.useQuery({ limit: 8 });

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);

  const alerts: { type: "danger" | "warning" | "info"; msg: string }[] = [];
  if (stats) {
    if (stats.expired > 0) alerts.push({ type: "danger", msg: `${stats.expired} product(s) have expired and require immediate removal from saleable stock.` });
    if (stats.soldOut > 0) alerts.push({ type: "warning", msg: `${stats.soldOut} product(s) are sold out. Reorder orders should be placed.` });
    if (stats.lowStock > 0) alerts.push({ type: "warning", msg: `${stats.lowStock} product(s) are below their reorder level.` });
    if (stats.expiringSoon > 0) alerts.push({ type: "info", msg: `${stats.expiringSoon} product(s) are expiring within 30 days.` });
  }

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of your pharmacy operations</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>

      {/* Primary KPI row — commercial metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Sales Today" value={fmt(stats?.salesToday ?? 0)} icon={TrendingUp} tone="success" sub="Revenue recorded today" />
        <KpiCard label="Sales This Month" value={fmt(stats?.salesMonth ?? 0)} icon={Activity} tone="success" sub="Running monthly total" />
        <KpiCard label="Total Products" value={stats?.totalProducts ?? "—"} icon={Package} tone="info" sub="Active SKUs in catalogue" />
        <KpiCard label="Pending Orders" value={stats?.pendingOrders ?? "—"} icon={ShoppingCart} tone="neutral" sub="Awaiting confirmation" />
      </div>

      {/* Secondary KPI row — stock health */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Low Stock" value={stats?.lowStock ?? "—"} icon={AlertTriangle} tone="warning" sub="Below reorder level" />
        <KpiCard label="Sold Out" value={stats?.soldOut ?? "—"} icon={XCircle} tone="danger" sub="Zero quantity on hand" />
        <KpiCard label="Expiring Soon" value={stats?.expiringSoon ?? "—"} icon={Clock} tone="warning" sub="Within 30 days" />
        <KpiCard label="Expired" value={stats?.expired ?? "—"} icon={AlertCircle} tone="danger" sub="Removal required" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Daily Revenue — Last 30 Days" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dailyRevenue ?? []} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} stroke="var(--muted-foreground)" />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `£${v}`} stroke="var(--muted-foreground)" />
              <Tooltip
                formatter={(v: number) => [`£${v.toFixed(2)}`, "Revenue"]}
                labelFormatter={(l) => `Date: ${l}`}
                contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", fontSize: "12px" }}
              />
              <Line type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Top Products by Revenue (30d)" icon={Trophy}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topProducts ?? []} layout="vertical" margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `£${v}`} stroke="var(--muted-foreground)" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={130} stroke="var(--muted-foreground)" />
              <Tooltip
                formatter={(v: number) => [`£${v.toFixed(2)}`, "Revenue"]}
                contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", fontSize: "12px" }}
              />
              <Bar dataKey="totalRevenue" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <SectionCard title="Active Alerts" icon={AlertTriangle}>
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ${
                  a.type === "danger" ? "bg-red-50 text-red-800 border border-red-200" :
                  a.type === "warning" ? "bg-amber-50 text-amber-800 border border-amber-200" :
                  "bg-blue-50 text-blue-800 border border-blue-200"
                }`}
              >
                {a.type === "danger" ? <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> :
                 a.type === "warning" ? <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> :
                 <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />}
                <span>{a.msg}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
