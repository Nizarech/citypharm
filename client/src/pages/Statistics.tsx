import { trpc } from "@/lib/trpc";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

export default function Statistics() {
  const { data, isLoading } = trpc.statistics.overview.useQuery();

  const fmt = (n: number) => `£${n.toFixed(2)}`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading statistics...
      </div>
    );
  }

  const { dailyRevenue = [], topProducts = [], categoryInventory = [], stats } = data ?? {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Statistics & Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Business performance overview for the last 30 days</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Monthly Revenue", value: fmt(stats?.salesMonth ?? 0) },
          { label: "Today's Revenue", value: fmt(stats?.salesToday ?? 0) },
          { label: "Total Products", value: String(stats?.totalProducts ?? 0) },
          { label: "Pending Orders", value: String(stats?.pendingOrders ?? 0) },
        ].map(item => (
          <div key={item.label} className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="text-xl font-bold text-foreground mt-1">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground mb-4">Daily Revenue — Last 30 Days</h2>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={dailyRevenue}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `£${v}`} />
            <Tooltip
              formatter={(v: number) => [`£${v.toFixed(2)}`, "Revenue"]}
              labelFormatter={(l) => `Date: ${l}`}
            />
            <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground mb-4">Top 10 Products by Revenue</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topProducts} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `£${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={130} />
              <Tooltip formatter={(v: number) => [`£${v.toFixed(2)}`, "Revenue"]} />
              <Bar dataKey="totalRevenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category Inventory Pie */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground mb-4">Inventory Value by Category</h2>
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Pie — no built-in labels so nothing overlaps */}
            <div className="shrink-0">
              <ResponsiveContainer width={220} height={220}>
                <PieChart>
                  <Pie
                    data={categoryInventory}
                    dataKey="totalValue"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    innerRadius={40}
                    label={false}
                    labelLine={false}
                  >
                    {categoryInventory.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number, _name: string, props: { payload?: { name?: string } }) => [
                      `£${v.toFixed(2)}`,
                      props.payload?.name ?? "",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend list */}
            <div className="flex flex-col gap-1.5 justify-center flex-1 min-w-0">
              {categoryInventory.map((c, i) => {
                const total = categoryInventory.reduce((s, x) => s + x.totalValue, 0);
                const pct = total > 0 ? ((c.totalValue / total) * 100).toFixed(1) : "0.0";
                return (
                  <div key={c.id} className="flex items-center gap-2 text-sm">
                    <span
                      className="inline-block shrink-0 rounded-sm"
                      style={{ width: 12, height: 12, background: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-foreground truncate flex-1">{c.name}</span>
                    <span className="text-muted-foreground tabular-nums ml-auto pl-2">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Category table */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Inventory by Category</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th><th>Products</th><th>Total Stock</th><th>Inventory Value</th>
              </tr>
            </thead>
            <tbody>
              {categoryInventory.map((c, i) => (
                <tr key={c.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      {c.name}
                    </div>
                  </td>
                  <td>{c.productCount}</td>
                  <td>{c.totalStock.toLocaleString()}</td>
                  <td className="font-semibold">{fmt(c.totalValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top products table */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Top Products — Revenue Detail</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr><th>Rank</th><th>SKU</th><th>Product</th><th>Units Sold</th><th>Revenue</th></tr>
            </thead>
            <tbody>
              {topProducts.map((p, i) => (
                <tr key={p.id}>
                  <td>
                    <span className={`font-bold ${i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-700" : "text-muted-foreground"}`}>
                      #{i + 1}
                    </span>
                  </td>
                  <td className="font-mono text-xs">{p.sku}</td>
                  <td className="font-medium">{p.name}</td>
                  <td>{p.totalQuantity.toLocaleString()}</td>
                  <td className="font-semibold">{fmt(p.totalRevenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
