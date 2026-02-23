import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, CheckCircle, Package, ChevronDown, ChevronRight, Pencil, Check, X } from "lucide-react";

type OrderItem = { productId: number; quantityOrdered: number; unitCost: string; productName: string };

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "badge-warning",
    confirmed: "badge-info",
    received: "badge-success",
    cancelled: "badge-danger",
  };
  return <span className={map[status] ?? "badge-neutral"}>{status}</span>;
}

function OrderItemsRow({ orderId, canEdit }: { orderId: number; canEdit: boolean }) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.orders.byId.useQuery({ id: orderId });
  const updateItemMutation = trpc.orders.updateItem.useMutation({
    onSuccess: () => {
      utils.orders.byId.invalidate({ id: orderId });
      utils.orders.list.invalidate();
      toast.success("Quantity updated");
      setEditingId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editQty, setEditQty] = useState("");

  const startEdit = (itemId: number, currentQty: number) => {
    setEditingId(itemId);
    setEditQty(String(currentQty));
  };

  const saveEdit = (itemId: number) => {
    const qty = Number(editQty);
    if (!qty || qty < 1) { toast.error("Quantity must be at least 1"); return; }
    updateItemMutation.mutate({ itemId, quantityOrdered: qty });
  };

  if (isLoading) return (
    <tr><td colSpan={9} className="py-3 px-6 bg-muted/30">
      <p className="text-xs text-muted-foreground">Loading items...</p>
    </td></tr>
  );

  const items = data?.items ?? [];

  return (
    <tr>
      <td colSpan={9} className="p-0 bg-muted/20">
        <div className="px-8 py-3 border-t border-border/40">
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground">No items found for this order.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border/40">
                  <th className="text-left pb-1.5 font-medium w-[40%]">Product</th>
                  <th className="text-left pb-1.5 font-medium">SKU</th>
                  <th className="text-right pb-1.5 font-medium">Qty Ordered</th>
                  <th className="text-right pb-1.5 font-medium">Qty Received</th>
                  <th className="text-right pb-1.5 font-medium">Unit Cost</th>
                  <th className="text-right pb-1.5 font-medium">Total</th>
                  {canEdit && <th className="pb-1.5 w-20"></th>}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-border/20 last:border-0">
                    <td className="py-1.5 font-medium text-foreground">{item.productName ?? "—"}</td>
                    <td className="py-1.5 font-mono text-xs text-muted-foreground">{item.productSku ?? "—"}</td>
                    <td className="py-1.5 text-right">
                      {editingId === item.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <Input
                            type="number"
                            min="1"
                            value={editQty}
                            onChange={e => setEditQty(e.target.value)}
                            className="w-20 h-7 text-right text-sm"
                            autoFocus
                          />
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600"
                            onClick={() => saveEdit(item.id)} disabled={updateItemMutation.isPending}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground"
                            onClick={() => setEditingId(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <span className="font-semibold">{item.quantityOrdered}</span>
                      )}
                    </td>
                    <td className="py-1.5 text-right text-muted-foreground">{item.quantityReceived}</td>
                    <td className="py-1.5 text-right text-muted-foreground">£{Number(item.unitCost).toFixed(2)}</td>
                    <td className="py-1.5 text-right font-semibold">£{Number(item.totalCost).toFixed(2)}</td>
                    {canEdit && (
                      <td className="py-1.5 text-right">
                        {editingId !== item.id && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => startEdit(item.id, item.quantityOrdered)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function Orders() {
  const utils = trpc.useUtils();
  const { data: orders = [], isLoading } = trpc.orders.list.useQuery();
  const { data: products = [] } = trpc.products.list.useQuery();
  const { data: suppliers = [] } = trpc.suppliers.list.useQuery();

  const createMutation = trpc.orders.create.useMutation({
    onSuccess: (r) => { utils.orders.list.invalidate(); toast.success(`Order created — ${r.orderNumber}`); setOpen(false); setItems([]); setSupplierId(""); setNotes(""); setExpectedDate(""); },
    onError: (e) => toast.error(e.message),
  });
  const updateStatusMutation = trpc.orders.updateStatus.useMutation({
    onSuccess: () => { utils.orders.list.invalidate(); utils.products.list.invalidate(); toast.success("Order status updated"); },
    onError: (e) => toast.error(e.message),
  });

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [qty, setQty] = useState("1");
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (id: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const addItem = () => {
    const prod = products.find(p => String(p.id) === selectedProduct);
    if (!prod) { toast.error("Select a product"); return; }
    const existing = items.findIndex(i => i.productId === prod.id);
    if (existing >= 0) {
      setItems(prev => prev.map((it, idx) => idx === existing ? { ...it, quantityOrdered: it.quantityOrdered + Number(qty) } : it));
    } else {
      setItems(prev => [...prev, { productId: prod.id, quantityOrdered: Number(qty), unitCost: String(prod.costPrice), productName: prod.name }]);
    }
    setSelectedProduct(""); setQty("1");
  };

  const total = items.reduce((s, i) => s + Number(i.unitCost) * i.quantityOrdered, 0);

  const handleSubmit = () => {
    if (!supplierId) { toast.error("Select a supplier"); return; }
    if (items.length === 0) { toast.error("Add at least one item"); return; }
    createMutation.mutate({
      supplierId: Number(supplierId),
      notes: notes || undefined,
      expectedDate: expectedDate || undefined,
      items: items.map(i => ({ productId: i.productId, quantityOrdered: i.quantityOrdered, unitCost: i.unitCost })),
    });
  };

  const statusFlow: Record<string, "pending" | "confirmed" | "received" | "cancelled"> = {
    pending: "confirmed",
    confirmed: "received",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Supplier Orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{orders.filter(o => o.status === "pending").length} pending, {orders.filter(o => o.status === "confirmed").length} confirmed</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />New Order</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Supplier Order</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Supplier *</Label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger><SelectValue placeholder="Select supplier..." /></SelectTrigger>
                    <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Expected Date</Label>
                  <Input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." />
              </div>

              <div className="bg-muted/40 rounded-lg p-3 space-y-3">
                <p className="text-sm font-medium">Add Products</p>
                <div className="flex gap-2">
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Select product..." /></SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name} — cost: £{Number(p.costPrice).toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} className="w-20" />
                  <Button type="button" onClick={addItem} size="sm">Add</Button>
                </div>
              </div>

              {items.length > 0 && (
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="data-table">
                    <thead><tr><th>Product</th><th>Qty</th><th>Unit Cost</th><th>Total</th><th></th></tr></thead>
                    <tbody>
                      {items.map((item, i) => (
                        <tr key={i}>
                          <td>{item.productName}</td>
                          <td>{item.quantityOrdered}</td>
                          <td>£{Number(item.unitCost).toFixed(2)}</td>
                          <td className="font-semibold">£{(Number(item.unitCost) * item.quantityOrdered).toFixed(2)}</td>
                          <td>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"
                              onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="bg-muted/40 rounded-lg p-3 flex justify-between">
                <span className="text-sm text-muted-foreground">Order Total</span>
                <span className="font-bold">£{total.toFixed(2)}</span>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setOpen(false); setItems([]); }}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Order"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-8"></th>
              <th>Order #</th><th>Supplier</th><th>Total</th><th>Expected</th>
              <th>Received</th><th>Notes</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">No orders yet</td></tr>
            ) : orders.map(o => (
              <>
                <tr key={o.id} className={expandedRows.has(o.id) ? "bg-muted/10" : ""}>
                  <td>
                    <Button
                      variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground"
                      onClick={() => toggleRow(o.id)}
                    >
                      {expandedRows.has(o.id)
                        ? <ChevronDown className="h-3.5 w-3.5" />
                        : <ChevronRight className="h-3.5 w-3.5" />}
                    </Button>
                  </td>
                  <td className="font-mono text-xs">{o.orderNumber}</td>
                  <td className="font-medium">{o.supplierName ?? "—"}</td>
                  <td className="font-semibold">£{Number(o.totalAmount).toFixed(2)}</td>
                  <td className="text-xs">{o.expectedDate ? new Date(o.expectedDate).toLocaleDateString("en-GB") : "—"}</td>
                  <td className="text-xs">{o.receivedDate ? new Date(o.receivedDate).toLocaleDateString("en-GB") : "—"}</td>
                  <td className="text-xs max-w-[150px] truncate">{o.notes ?? "—"}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td>
                    <div className="flex gap-1">
                      {statusFlow[o.status] && (
                        <Button
                          variant="ghost" size="sm"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => updateStatusMutation.mutate({ id: o.id, status: statusFlow[o.status] })}
                        >
                          {statusFlow[o.status] === "confirmed" ? (
                            <><CheckCircle className="h-3.5 w-3.5 mr-1" />Confirm</>
                          ) : (
                            <><Package className="h-3.5 w-3.5 mr-1" />Received</>
                          )}
                        </Button>
                      )}
                      {o.status === "pending" && (
                        <Button
                          variant="ghost" size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => updateStatusMutation.mutate({ id: o.id, status: "cancelled" })}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
                {expandedRows.has(o.id) && (
                  <OrderItemsRow key={`items-${o.id}`} orderId={o.id} canEdit={o.status === "pending"} />
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
