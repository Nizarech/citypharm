import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertCircle, RefreshCw, Bot, Zap, Clock, Package, Sparkles, ShoppingCart, Info,
} from "lucide-react";
import { Streamdown } from "streamdown";

type Window = 30 | 60 | 90;

export default function AIAssistant() {
  const utils = trpc.useUtils();
  const { data: expiryAlerts, isLoading: expiryLoading } = trpc.ai.expiryAlerts.useQuery();
  const { data: reorderCandidates, isLoading: reorderLoading } = trpc.ai.reorderCandidates.useQuery();

  const [window, setWindow] = useState<Window>(30);
  const [summary, setSummary] = useState<{ text: string; days: Window } | null>(null);

  const autoReorderMutation = trpc.ai.autoCreateReorders.useMutation({
    onSuccess: (r) => {
      utils.orders.list.invalidate();
      utils.dashboard.stats.invalidate();
      if (r.created === 0) toast.info("No reorder candidates with assigned suppliers were found.");
      else toast.success(`${r.created} reorder order(s) created for low-stock items.`);
    },
    onError: (e) => toast.error(e.message),
  });

  const soldOutMutation = trpc.ai.autoCreateSoldOutOrders.useMutation({
    onSuccess: (r) => {
      utils.orders.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.ai.reorderCandidates.invalidate();
      if (r.created === 0) toast.info("No sold-out products were found.");
      else toast.success(`${r.created} not-confirmed order(s) created covering ${r.items} sold-out product(s).`);
    },
    onError: (e) => toast.error(e.message),
  });

  const summaryMutation = trpc.ai.businessSummary.useMutation({
    onError: (e) => toast.error(e.message),
    onSuccess: (r) => {
      setSummary({ text: typeof r.summary === "string" ? r.summary : String(r.summary), days: window });
    },
  });

  const handleSummary = () => {
    setSummary(null);
    summaryMutation.mutate({ days: window });
  };

  const soldOutCount = reorderCandidates?.filter((p) => p.quantity === 0).length ?? 0;
  const lowStockCount = reorderCandidates?.filter((p) => p.quantity > 0).length ?? 0;
  const withSupplier = reorderCandidates?.filter((p) => p.supplierId).length ?? 0;

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">AI Assistant</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Automated expiry alerts, reorder generation, and narrative business summaries.
        </p>
      </div>

      {/* Summary banner — quick signal */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatTile label="Expired" value={expiryAlerts?.expired?.length ?? 0} tone="danger" icon={AlertCircle} />
        <StatTile label="Expiring ≤ 30d" value={expiryAlerts?.expiringSoon?.length ?? 0} tone="warning" icon={Clock} />
        <StatTile label="Sold out" value={soldOutCount} tone="danger" icon={Package} />
        <StatTile label="Low stock" value={lowStockCount} tone="warning" icon={Package} />
      </div>

      {/* Action row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ActionCard
          title="Auto-reorder low stock"
          desc="Generate pending supplier orders for products at or below reorder level (with assigned suppliers)."
          icon={Zap}
          accent="amber"
          cta={
            <Button
              className="w-full"
              variant="outline"
              onClick={() => autoReorderMutation.mutate()}
              disabled={autoReorderMutation.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${autoReorderMutation.isPending ? "animate-spin" : ""}`} />
              {autoReorderMutation.isPending ? "Generating…" : `Generate (${withSupplier} item(s))`}
            </Button>
          }
        />
        <ActionCard
          title="Sold-out → Not-confirmed orders"
          desc="Create pending orders for every sold-out product. Unassigned items are grouped under a Pending Assignment supplier."
          icon={ShoppingCart}
          accent="red"
          cta={
            <Button
              className="w-full"
              variant="outline"
              onClick={() => soldOutMutation.mutate()}
              disabled={soldOutMutation.isPending || soldOutCount === 0}
            >
              <ShoppingCart className={`h-4 w-4 mr-2 ${soldOutMutation.isPending ? "animate-pulse" : ""}`} />
              {soldOutMutation.isPending
                ? "Generating…"
                : soldOutCount === 0
                ? "Nothing to reorder"
                : `Generate (${soldOutCount} item(s))`}
            </Button>
          }
        />
        <ActionCard
          title="Business narrative summary"
          desc="LLM-generated three-paragraph summary for the selected time window."
          icon={Sparkles}
          accent="blue"
          cta={
            <div className="space-y-2">
              <div className="flex gap-1">
                {([30, 60, 90] as Window[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setWindow(d)}
                    className={`flex-1 text-xs font-medium rounded-md px-2 py-1.5 border transition-colors ${
                      window === d
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-transparent text-foreground border-border hover:bg-accent"
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
              <Button
                className="w-full"
                variant="outline"
                onClick={handleSummary}
                disabled={summaryMutation.isPending}
              >
                <Bot className={`h-4 w-4 mr-2 ${summaryMutation.isPending ? "animate-spin" : ""}`} />
                {summaryMutation.isPending ? "Generating…" : `Summarise last ${window} days`}
              </Button>
            </div>
          }
        />
      </div>

      {/* Narrative summary output */}
      {summary && (
        <div className="bg-card rounded-xl border border-blue-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-foreground">
              Business narrative summary — last {summary.days} days
            </h2>
          </div>
          <div className="prose prose-sm max-w-none text-foreground">
            <Streamdown>{summary.text}</Streamdown>
          </div>
        </div>
      )}

      {/* Expiry + reorder detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <DetailCard
            title={`Expired products (${expiryAlerts?.expired?.length ?? 0})`}
            icon={AlertCircle}
            iconClass="text-red-500"
            loading={expiryLoading}
            emptyMsg="No expired products"
          >
            {expiryAlerts?.expired?.map((p) => (
              <Row
                key={p.id}
                tone="red"
                title={p.name}
                meta={`SKU: ${p.sku} · Expired: ${
                  p.expiryDate ? new Date(p.expiryDate).toLocaleDateString("en-GB") : "—"
                } · Qty: ${p.quantity}`}
                badge="Expired"
              />
            ))}
          </DetailCard>

          <DetailCard
            title={`Expiring within 30 days (${expiryAlerts?.expiringSoon?.length ?? 0})`}
            icon={Clock}
            iconClass="text-amber-500"
            loading={expiryLoading}
            emptyMsg="No products expiring in the next 30 days"
          >
            {expiryAlerts?.expiringSoon?.map((p) => {
              const daysLeft = Math.ceil(
                (new Date(p.expiryDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              );
              return (
                <Row
                  key={p.id}
                  tone="amber"
                  title={p.name}
                  meta={`SKU: ${p.sku} · Expires: ${new Date(p.expiryDate!).toLocaleDateString(
                    "en-GB"
                  )} · ${daysLeft}d left · Qty: ${p.quantity}`}
                  badge={`${daysLeft}d`}
                />
              );
            })}
          </DetailCard>
        </div>

        <DetailCard
          title={`Reorder candidates (${reorderCandidates?.length ?? 0})`}
          icon={Package}
          iconClass="text-orange-500"
          loading={reorderLoading}
          emptyMsg="All products are above reorder levels"
        >
          {reorderCandidates?.map((p) => (
            <div
              key={p.id}
              className="flex items-start justify-between rounded-lg bg-orange-50 border border-orange-200 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-orange-800 truncate">{p.name}</p>
                <p className="text-xs text-orange-600 mt-0.5 truncate">
                  SKU: {p.sku} · Stock: <strong>{p.quantity}</strong> · Reorder at: {p.reorderLevel}
                  {p.supplierName && ` · ${p.supplierName}`}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
                {p.quantity === 0 ? (
                  <span className="badge-danger">Sold Out</span>
                ) : (
                  <span className="badge-warning">Low Stock</span>
                )}
                {!p.supplierId && (
                  <span className="text-[10px] text-muted-foreground">No supplier</span>
                )}
              </div>
            </div>
          ))}
          {(reorderCandidates?.length ?? 0) > 0 && (
            <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
              <Info className="h-3 w-3" />
              Only candidates with an assigned supplier are included in the auto-reorder action above.
            </div>
          )}
        </DetailCard>
      </div>
    </div>
  );
}

/* UI helpers */

function StatTile({
  label, value, tone, icon: Icon,
}: { label: string; value: number; tone: "warning" | "danger"; icon: any }) {
  const cls = tone === "danger" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600";
  return (
    <div className="bg-card rounded-xl border border-border/80 p-4 shadow-sm flex items-center gap-3">
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${cls}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function ActionCard({
  title, desc, icon: Icon, accent, cta,
}: {
  title: string; desc: string; icon: any; accent: "amber" | "red" | "blue"; cta: React.ReactNode;
}) {
  const accentCls =
    accent === "red"
      ? "bg-red-50 text-red-600"
      : accent === "blue"
      ? "bg-blue-50 text-blue-600"
      : "bg-amber-50 text-amber-600";
  return (
    <div className="bg-card rounded-xl border border-border/80 p-5 shadow-sm space-y-3 flex flex-col">
      <div className="flex items-center gap-2">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${accentCls}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
        </div>
      </div>
      <div className="mt-auto">{cta}</div>
    </div>
  );
}

function DetailCard({
  title, icon: Icon, iconClass, loading, emptyMsg, children,
}: {
  title: string; icon: any; iconClass: string; loading: boolean; emptyMsg: string; children: React.ReactNode;
}) {
  const isEmpty = !loading && Array.isArray(children) && (children as any[]).length === 0;
  return (
    <div className="bg-card rounded-xl border border-border/80 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`h-4 w-4 ${iconClass}`} />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Scanning…</p>
      ) : isEmpty ? (
        <p className="text-sm text-emerald-600 font-medium">✓ {emptyMsg}</p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </div>
  );
}

function Row({
  tone, title, meta, badge,
}: { tone: "red" | "amber"; title: string; meta: string; badge: string }) {
  const cls =
    tone === "red"
      ? "bg-red-50 border-red-200 text-red-800"
      : "bg-amber-50 border-amber-200 text-amber-800";
  return (
    <div className={`flex items-start justify-between rounded-lg border px-3 py-2.5 ${cls}`}>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        <p className={`text-xs mt-0.5 truncate ${tone === "red" ? "text-red-600" : "text-amber-600"}`}>
          {meta}
        </p>
      </div>
      <span className={tone === "red" ? "badge-danger" : "badge-warning"}>{badge}</span>
    </div>
  );
}
