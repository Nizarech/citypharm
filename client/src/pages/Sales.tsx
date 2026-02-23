import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2, RotateCcw } from "lucide-react";

type SaleItem = { productId: number; quantity: number; unitPrice: string; productName: string };

export default function Sales() {
  const utils = trpc.useUtils();
  const { data: sales = [], isLoading } = trpc.sales.list.useQuery({ limit: 200 });
  const { data: products = [] } = trpc.products.list.useQuery();
  const createMutation = trpc.sales.create.useMutation({
    onSuccess: (r) => { utils.sales.list.invalidate(); utils.dashboard.stats.invalidate(); toast.success(`Sale recorded — ${r.receiptNumber}`); setOpen(false); setItems([]); setPayment("cash"); setDiscount("0"); },
    onError: (e) => toast.error(e.message),
  });
  const returnMutation = trpc.sales.return.useMutation({
    onSuccess: () => { utils.sales.list.invalidate(); utils.dashboard.stats.invalidate(); toast.success("Sale returned and stock restored"); },
    onError: (e) => toast.error(e.message),
  });

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [payment, setPayment] = useState<"cash" | "card" | "insurance">("cash");
  const [discount, setDiscount] = useState("0");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [qty, setQty] = useState("1");

  const addItem = () => {
    const prod = products.find(p => String(p.id) === selectedProduct);
    if (!prod) { toast.error("Select a product"); return; }
    if (Number(qty) < 1) { toast.error("Quantity must be at least 1"); return; }
    const existing = items.findIndex(i => i.productId === prod.id);
    if (existing >= 0) {
      setItems(prev => prev.map((it, idx) => idx === existing ? { ...it, quantity: it.quantity + Number(qty) } : it));
    } else {
      setItems(prev => [...prev, { productId: prod.id, quantity: Number(qty), unitPrice: String(prod.sellPrice), productName: prod.name }]);
    }
    setSelectedProduct(""); setQty("1");
  };

  const total = items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
  const finalTotal = Math.max(0, total - Number(discount));

  const handleSubmit = () => {
    if (items.length === 0) { toast.error("Add at least one item"); return; }
    createMutation.mutate({
      paymentMethod: payment,
      discountAmount: discount,
      items: items.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
    });
  };

  const fmt = (n: number) => `£${n.toFixed(2)}`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Sales</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{sales.filter(s => s.status === "completed").length} completed sales</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />New Sale</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Record New Sale</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              {/* Add item */}
              <div className="bg-muted/40 rounded-lg p-3 space-y-3">
                <p className="text-sm font-medium">Add Products</p>
                <div className="flex gap-2">
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Select product..." /></SelectTrigger>
                    <SelectContent>
                      {products.filter(p => p.quantity > 0).map(p => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name} — £{Number(p.sellPrice).toFixed(2)} (stock: {p.quantity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} className="w-20" placeholder="Qty" />
                  <Button type="button" onClick={addItem} size="sm">Add</Button>
                </div>
              </div>

              {/* Items list */}
              {items.length > 0 && (
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="data-table">
                    <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th><th></th></tr></thead>
                    <tbody>
                      {items.map((item, i) => (
                        <tr key={i}>
                          <td>{item.productName}</td>
                          <td>{item.quantity}</td>
                          <td>{fmt(Number(item.unitPrice))}</td>
                          <td className="font-semibold">{fmt(Number(item.unitPrice) * item.quantity)}</td>
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

              {/* Payment */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Payment Method</Label>
                  <Select value={payment} onValueChange={v => setPayment(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Discount (£)</Label>
                  <Input type="number" min="0" step="0.01" value={discount} onChange={e => setDiscount(e.target.value)} />
                </div>
              </div>

              {/* Total */}
              <div className="bg-muted/40 rounded-lg p-3 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-xl font-bold text-foreground">{fmt(finalTotal)}</span>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setOpen(false); setItems([]); }}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending || items.length === 0}>
                  {createMutation.isPending ? "Processing..." : "Complete Sale"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="completed">
        <TabsList>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="returned">Returned</TabsTrigger>
        </TabsList>
        {["completed", "returned"].map(status => (
          <TabsContent key={status} value={status}>
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Receipt #</th><th>Date</th><th>Total</th><th>Discount</th>
                    <th>Payment</th><th>Status</th>{status === "completed" && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                  ) : sales.filter(s => s.status === status).length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No {status} sales</td></tr>
                  ) : sales.filter(s => s.status === status).map(s => (
                    <tr key={s.id}>
                      <td className="font-mono text-xs">{s.receiptNumber}</td>
                      <td className="text-xs">{new Date(s.saleDate).toLocaleString("en-GB")}</td>
                      <td className="font-semibold">{fmt(Number(s.totalAmount))}</td>
                      <td>{Number(s.discountAmount) > 0 ? fmt(Number(s.discountAmount)) : "—"}</td>
                      <td className="capitalize">{s.paymentMethod}</td>
                      <td>
                        <span className={s.status === "completed" ? "badge-success" : "badge-neutral"}>
                          {s.status}
                        </span>
                      </td>
                      {status === "completed" && (
                        <td>
                          <Button
                            variant="ghost" size="sm"
                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            onClick={() => { if (confirm("Process return for this sale?")) returnMutation.mutate({ saleId: s.id }); }}
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1" />Return
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
