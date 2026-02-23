import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Mail, Phone, MapPin, Clock } from "lucide-react";

export default function Suppliers() {
  const utils = trpc.useUtils();
  const { data: suppliers = [], isLoading } = trpc.suppliers.list.useQuery();
  const createMutation = trpc.suppliers.create.useMutation({
    onSuccess: () => { utils.suppliers.list.invalidate(); toast.success("Supplier added"); setOpen(false); resetForm(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.suppliers.delete.useMutation({
    onSuccess: () => { utils.suppliers.list.invalidate(); toast.success("Supplier removed"); },
    onError: (e) => toast.error(e.message),
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", contactName: "", email: "", phone: "", address: "", leadTimeDays: "7" });
  const resetForm = () => setForm({ name: "", contactName: "", email: "", phone: "", address: "", leadTimeDays: "7" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { toast.error("Supplier name is required"); return; }
    createMutation.mutate({
      name: form.name,
      contactName: form.contactName || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      address: form.address || undefined,
      leadTimeDays: Number(form.leadTimeDays),
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Suppliers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{suppliers.length} registered suppliers</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Add Supplier</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add New Supplier</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3 mt-2">
              <div className="space-y-1">
                <Label>Company Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Alliance Healthcare UK" />
              </div>
              <div className="space-y-1">
                <Label>Contact Person</Label>
                <Input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} placeholder="e.g. John Smith" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="orders@supplier.co.uk" />
                </div>
                <div className="space-y-1">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="0800 123 4567" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Address</Label>
                <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Full address..." />
              </div>
              <div className="space-y-1">
                <Label>Lead Time (days)</Label>
                <Input type="number" min="1" value={form.leadTimeDays} onChange={e => setForm(f => ({ ...f, leadTimeDays: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Adding..." : "Add Supplier"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Supplier Cards */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading suppliers...</div>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No suppliers yet. Add your first supplier.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {suppliers.map(s => (
            <div key={s.id} className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{s.name}</h3>
                  {s.contactName && <p className="text-sm text-muted-foreground mt-0.5">{s.contactName}</p>}
                </div>
                <Button
                  variant="ghost" size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 -mt-1"
                  onClick={() => { if (confirm(`Delete ${s.name}?`)) deleteMutation.mutate({ id: s.id }); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-1.5 text-sm">
                {s.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <a href={`mailto:${s.email}`} className="hover:text-primary truncate">{s.email}</a>
                  </div>
                )}
                {s.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span>{s.phone}</span>
                  </div>
                )}
                {s.address && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span className="text-xs leading-relaxed">{s.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span>Lead time: <strong className="text-foreground">{s.leadTimeDays} days</strong></span>
                </div>
              </div>
              <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span>{(s as any).productCount ?? 0} products</span>
                <span>Added {new Date(s.createdAt).toLocaleDateString("en-GB")}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
