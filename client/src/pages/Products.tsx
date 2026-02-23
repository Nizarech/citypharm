import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Search } from "lucide-react";

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

export default function Products() {
  const utils = trpc.useUtils();
  const { data: products = [], isLoading } = trpc.products.list.useQuery();
  const { data: categories = [] } = trpc.categories.list.useQuery();
  const { data: suppliers = [] } = trpc.suppliers.list.useQuery();
  const createMutation = trpc.products.create.useMutation({
    onSuccess: () => { utils.products.list.invalidate(); toast.success("Product added"); setOpen(false); resetForm(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.products.delete.useMutation({
    onSuccess: () => { utils.products.list.invalidate(); toast.success("Product removed"); },
    onError: (e) => toast.error(e.message),
  });

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    sku: "", name: "", description: "", categoryId: "", supplierId: "",
    batchNumber: "", expiryDate: "", quantity: "0", reorderLevel: "10",
    costPrice: "", sellPrice: "", unit: "pack",
  });

  const resetForm = () => setForm({
    sku: "", name: "", description: "", categoryId: "", supplierId: "",
    batchNumber: "", expiryDate: "", quantity: "0", reorderLevel: "10",
    costPrice: "", sellPrice: "", unit: "pack",
  });

  const filtered = products.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) ||
           p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sku || !form.name || !form.categoryId || !form.costPrice || !form.sellPrice) {
      toast.error("Please fill all required fields");
      return;
    }
    createMutation.mutate({
      sku: form.sku, name: form.name,
      description: form.description || undefined,
      categoryId: Number(form.categoryId),
      supplierId: form.supplierId ? Number(form.supplierId) : undefined,
      batchNumber: form.batchNumber || undefined,
      expiryDate: form.expiryDate || undefined,
      quantity: Number(form.quantity),
      reorderLevel: Number(form.reorderLevel),
      costPrice: form.costPrice, sellPrice: form.sellPrice, unit: form.unit,
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Products</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{products.length} active products in catalogue</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Add Product</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add New Product</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 mt-2">
              <div className="space-y-1">
                <Label>SKU *</Label>
                <Input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="e.g. AMX-500" />
              </div>
              <div className="space-y-1">
                <Label>Product Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Amoxicillin 500mg" />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Description</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
              </div>
              <div className="space-y-1">
                <Label>Category *</Label>
                <Select value={form.categoryId} onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Supplier</Label>
                <Select value={form.supplierId} onValueChange={v => setForm(f => ({ ...f, supplierId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Batch Number</Label>
                <Input value={form.batchNumber} onChange={e => setForm(f => ({ ...f, batchNumber: e.target.value }))} placeholder="e.g. BATCH2024A" />
              </div>
              <div className="space-y-1">
                <Label>Expiry Date</Label>
                <Input type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Quantity *</Label>
                <Input type="number" min="0" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Reorder Level *</Label>
                <Input type="number" min="0" value={form.reorderLevel} onChange={e => setForm(f => ({ ...f, reorderLevel: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Cost Price (£) *</Label>
                <Input type="number" step="0.01" min="0" value={form.costPrice} onChange={e => setForm(f => ({ ...f, costPrice: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="space-y-1">
                <Label>Sell Price (£) *</Label>
                <Input type="number" step="0.01" min="0" value={form.sellPrice} onChange={e => setForm(f => ({ ...f, sellPrice: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="space-y-1">
                <Label>Unit</Label>
                <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["tablet", "capsule", "pack", "bottle", "inhaler", "tube", "vial", "box", "sachet"].map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Adding..." : "Add Product"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by name or SKU..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU</th><th>Name</th><th>Category</th><th>Supplier</th>
                <th>Batch</th><th>Expiry</th><th>Qty</th><th>Reorder</th>
                <th>Cost</th><th>Sell</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={12} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-8 text-muted-foreground">No products found</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id}>
                  <td className="font-mono text-xs">{p.sku}</td>
                  <td className="font-medium max-w-[180px] truncate">{p.name}</td>
                  <td>{p.categoryName ?? "—"}</td>
                  <td className="max-w-[120px] truncate">{p.supplierName ?? "—"}</td>
                  <td className="font-mono text-xs">{p.batchNumber ?? "—"}</td>
                  <td className="text-xs">{p.expiryDate ? new Date(p.expiryDate).toLocaleDateString("en-GB") : "—"}</td>
                  <td className="font-semibold">{p.quantity}</td>
                  <td>{p.reorderLevel}</td>
                  <td>£{Number(p.costPrice).toFixed(2)}</td>
                  <td>£{Number(p.sellPrice).toFixed(2)}</td>
                  <td><StockBadge qty={p.quantity} reorder={p.reorderLevel} expiry={p.expiryDate} /></td>
                  <td>
                    <Button
                      variant="ghost" size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => { if (confirm("Delete this product?")) deleteMutation.mutate({ id: p.id }); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
