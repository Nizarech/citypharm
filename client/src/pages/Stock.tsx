import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

type FilterType = "all" | "low" | "soldout" | "expiring" | "expired";

function StockBadge({ qty, reorder, expiry }: { qty: number; reorder: number; expiry?: Date | string | null }) {
  const today = new Date();
  const exp = expiry ? new Date(expiry) : null;
  const thirtyDays = new Date(today);
  thirtyDays.setDate(thirtyDays.getDate() + 30);

  if (qty === 0) return <span className="badge-danger">Sold Out</span>;
  if (exp && exp < today) return <span className="badge-danger">Expired</span>;
  if (exp && exp <= thirtyDays) return <span className="badge-warning">Expiring Soon</span>;
  if (qty <= reorder) return <span className="badge-warning">Low Stock</span>;
  return <span className="badge-success">In Stock</span>;
}

export default function Stock() {
  const { data: products = [], isLoading } = trpc.products.list.useQuery();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const today = new Date();
  const thirtyDays = new Date(today);
  thirtyDays.setDate(thirtyDays.getDate() + 30);

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                        p.sku.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    const exp = p.expiryDate ? new Date(p.expiryDate) : null;
    switch (filter) {
      case "low": return p.quantity > 0 && p.quantity <= p.reorderLevel;
      case "soldout": return p.quantity === 0;
      case "expiring": return exp !== null && exp >= today && exp <= thirtyDays;
      case "expired": return exp !== null && exp < today;
      default: return true;
    }
  });

  const counts = {
    all: products.length,
    low: products.filter(p => p.quantity > 0 && p.quantity <= p.reorderLevel).length,
    soldout: products.filter(p => p.quantity === 0).length,
    expiring: products.filter(p => { const e = p.expiryDate ? new Date(p.expiryDate) : null; return e && e >= today && e <= thirtyDays; }).length,
    expired: products.filter(p => { const e = p.expiryDate ? new Date(p.expiryDate) : null; return e && e < today; }).length,
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Stock Management</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Live inventory view with status tracking</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(["all", "low", "soldout", "expiring", "expired"] as FilterType[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-xl border p-4 text-left transition-all shadow-sm ${
              filter === f ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-card hover:bg-muted/30"
            }`}
          >
            <p className="text-2xl font-bold text-foreground">{counts[f]}</p>
            <p className="text-xs text-muted-foreground mt-0.5 capitalize">
              {f === "all" ? "All Products" : f === "low" ? "Low Stock" : f === "soldout" ? "Sold Out" : f === "expiring" ? "Expiring Soon" : "Expired"}
            </p>
          </button>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="p-4 border-b border-border flex gap-3 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by name or SKU..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filter} onValueChange={v => setFilter(v as FilterType)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({counts.all})</SelectItem>
              <SelectItem value="low">Low Stock ({counts.low})</SelectItem>
              <SelectItem value="soldout">Sold Out ({counts.soldout})</SelectItem>
              <SelectItem value="expiring">Expiring ({counts.expiring})</SelectItem>
              <SelectItem value="expired">Expired ({counts.expired})</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU</th><th>Product</th><th>Category</th><th>Qty</th>
                <th>Reorder Level</th><th>Batch</th><th>Expiry Date</th>
                <th>Unit</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">No products match the selected filter</td></tr>
              ) : filtered.map(p => {
                const exp = p.expiryDate ? new Date(p.expiryDate) : null;
                const isExpired = exp && exp < today;
                const isExpiring = exp && exp >= today && exp <= thirtyDays;
                return (
                  <tr key={p.id} className={isExpired ? "bg-red-50/50" : isExpiring ? "bg-amber-50/50" : ""}>
                    <td className="font-mono text-xs">{p.sku}</td>
                    <td className="font-medium">{p.name}</td>
                    <td>{p.categoryName ?? "—"}</td>
                    <td>
                      <span className={`font-bold ${p.quantity === 0 ? "text-red-600" : p.quantity <= p.reorderLevel ? "text-amber-600" : "text-foreground"}`}>
                        {p.quantity}
                      </span>
                    </td>
                    <td>{p.reorderLevel}</td>
                    <td className="font-mono text-xs">{p.batchNumber ?? "—"}</td>
                    <td className={`text-xs ${isExpired ? "text-red-600 font-semibold" : isExpiring ? "text-amber-600 font-semibold" : ""}`}>
                      {p.expiryDate ? new Date(p.expiryDate).toLocaleDateString("en-GB") : "—"}
                    </td>
                    <td className="capitalize">{p.unit}</td>
                    <td><StockBadge qty={p.quantity} reorder={p.reorderLevel} expiry={p.expiryDate} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
          Showing {filtered.length} of {products.length} products
        </div>
      </div>
    </div>
  );
}
