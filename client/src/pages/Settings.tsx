import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2, User, Shield, Stethoscope } from "lucide-react";

function RoleBadge({ role }: { role: string }) {
  if (role === "admin") return <span className="badge-danger">Admin</span>;
  if (role === "manager") return <span className="badge-info">Manager</span>;
  return <span className="badge-neutral">Pharmacist</span>;
}

function RoleIcon({ role }: { role: string }) {
  if (role === "admin") return <Shield className="h-4 w-4 text-red-500" />;
  if (role === "manager") return <User className="h-4 w-4 text-blue-500" />;
  return <Stethoscope className="h-4 w-4 text-green-500" />;
}

export default function Settings() {
  const utils = trpc.useUtils();
  const dedupMutation = trpc.utils.deduplicateSuppliers.useMutation({
    onSuccess: (r) => { utils.suppliers.list.invalidate(); toast.success(`Done: removed ${r.removed} duplicates, ${r.remaining} suppliers remain.`); },
    onError: (e) => toast.error(e.message),
  });

  // Users
  const { data: appUsers = [], isLoading: usersLoading } = trpc.appUsers.list.useQuery();
  const createUserMutation = trpc.appUsers.create.useMutation({
    onSuccess: () => { utils.appUsers.list.invalidate(); toast.success("User created"); setUserOpen(false); resetUserForm(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteUserMutation = trpc.appUsers.delete.useMutation({
    onSuccess: () => { utils.appUsers.list.invalidate(); toast.success("User deleted"); },
    onError: (e) => toast.error(e.message),
  });

  // Categories
  const { data: categories = [], isLoading: catsLoading } = trpc.categories.list.useQuery();
  const createCatMutation = trpc.categories.create.useMutation({
    onSuccess: () => { utils.categories.list.invalidate(); toast.success("Category created"); setCatOpen(false); setCatName(""); setCatDesc(""); },
    onError: (e) => toast.error(e.message),
  });
  const deleteCatMutation = trpc.categories.delete.useMutation({
    onSuccess: () => { utils.categories.list.invalidate(); toast.success("Category deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const [userOpen, setUserOpen] = useState(false);
  const [userForm, setUserForm] = useState({ username: "", password: "", fullName: "", email: "", role: "pharmacist" as "admin" | "manager" | "pharmacist" });
  const resetUserForm = () => setUserForm({ username: "", password: "", fullName: "", email: "", role: "pharmacist" });

  const [catOpen, setCatOpen] = useState(false);
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.username || !userForm.password || !userForm.fullName) {
      toast.error("Username, password, and full name are required");
      return;
    }
    createUserMutation.mutate(userForm);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage users, categories, and system configuration</p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="system">System Info</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{appUsers.length} registered users</p>
            <Dialog open={userOpen} onOpenChange={setUserOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Add User</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateUser} className="space-y-3 mt-2">
                  <div className="space-y-1">
                    <Label>Full Name *</Label>
                    <Input value={userForm.fullName} onChange={e => setUserForm(f => ({ ...f, fullName: e.target.value }))} placeholder="e.g. Dr. Jane Smith" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Username *</Label>
                      <Input value={userForm.username} onChange={e => setUserForm(f => ({ ...f, username: e.target.value }))} placeholder="e.g. jsmith" />
                    </div>
                    <div className="space-y-1">
                      <Label>Role *</Label>
                      <Select value={userForm.role} onValueChange={v => setUserForm(f => ({ ...f, role: v as any }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="pharmacist">Pharmacist</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} placeholder="user@citypharm.co.uk" />
                  </div>
                  <div className="space-y-1">
                    <Label>Password *</Label>
                    <Input type="password" value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 6 characters" />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => { setUserOpen(false); resetUserForm(); }}>Cancel</Button>
                    <Button type="submit" disabled={createUserMutation.isPending}>
                      {createUserMutation.isPending ? "Creating..." : "Create User"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-card rounded-xl border border-border shadow-sm overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>User</th><th>Username</th><th>Email</th><th>Role</th><th>Created</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                ) : appUsers.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <RoleIcon role={u.role} />
                        <span className="font-medium">{u.fullName}</span>
                      </div>
                    </td>
                    <td className="font-mono text-xs">{u.username}</td>
                    <td className="text-sm">{u.email ?? "—"}</td>
                    <td><RoleBadge role={u.role} /></td>
                    <td className="text-xs">{new Date(u.createdAt).toLocaleDateString("en-GB")}</td>
                    <td>
                      <Button
                        variant="ghost" size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => { if (confirm(`Delete user ${u.username}?`)) deleteUserMutation.mutate({ id: u.id }); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{categories.length} product categories</p>
            <Dialog open={catOpen} onOpenChange={setCatOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Add Category</Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader><DialogTitle>Create Category</DialogTitle></DialogHeader>
                <form onSubmit={e => { e.preventDefault(); if (!catName) { toast.error("Name required"); return; } createCatMutation.mutate({ name: catName, description: catDesc || undefined }); }} className="space-y-3 mt-2">
                  <div className="space-y-1">
                    <Label>Category Name *</Label>
                    <Input value={catName} onChange={e => setCatName(e.target.value)} placeholder="e.g. Oncology" />
                  </div>
                  <div className="space-y-1">
                    <Label>Description</Label>
                    <Input value={catDesc} onChange={e => setCatDesc(e.target.value)} placeholder="Optional description" />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setCatOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={createCatMutation.isPending}>Create</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-card rounded-xl border border-border shadow-sm overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Name</th><th>Description</th><th>Created</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {catsLoading ? (
                  <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                ) : categories.map(c => (
                  <tr key={c.id}>
                    <td className="font-medium">{c.name}</td>
                    <td className="text-sm text-muted-foreground">{c.description ?? "—"}</td>
                    <td className="text-xs">{new Date(c.createdAt).toLocaleDateString("en-GB")}</td>
                    <td>
                      <Button
                        variant="ghost" size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => { if (confirm(`Delete category "${c.name}"?`)) deleteCatMutation.mutate({ id: c.id }); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* System Info Tab */}
        <TabsContent value="system">
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-foreground">System Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {[
                { label: "Application", value: "CityPharm AI Stock System" },
                { label: "Version", value: "1.0.0" },
                { label: "Stack", value: "React 19 + tRPC + MySQL" },
                { label: "Authentication", value: "CityPharm Password Auth" },
                { label: "Database", value: "MySQL / TiDB" },
                { label: "AI Provider", value: "OpenAI (GPT-4o mini)" },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
            <div className="pt-2">
              <h3 className="text-sm font-semibold text-foreground mb-2">Default Credentials (Demo)</h3>
              <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs space-y-1">
                <p><span className="text-muted-foreground">Admin:</span> admin / admin123</p>
                <p><span className="text-muted-foreground">Manager:</span> manager / manager123</p>
                <p><span className="text-muted-foreground">Pharmacist:</span> pharmacist / pharm123</p>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                These accounts are seeded for the demo. Sign in with any of them on the
                /signin page, or create a new account from /signup. Passwords for new
                accounts are stored as bcrypt hashes; legacy seeded accounts use SHA-256
                hashes that the sign-in handler also accepts for backward compatibility.
              </p>
            </div>
            <div className="pt-4 border-t border-border/50">
              <h3 className="text-sm font-semibold text-foreground mb-1">Database Maintenance</h3>
              <p className="text-xs text-muted-foreground mb-3">Run one-time cleanup tasks to fix data issues from seeding.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => dedupMutation.mutate()}
                disabled={dedupMutation.isPending}
              >
                {dedupMutation.isPending ? "Cleaning..." : "Remove Duplicate Suppliers"}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
