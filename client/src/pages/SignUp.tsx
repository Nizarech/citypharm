import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Pill, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

export default function SignUp() {
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const signup = trpc.auth.signup.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      setLocation("/dashboard");
    },
    onError: (err) => {
      setError(err.message || "Unable to create your account. Please try again.");
    },
  });

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!form.fullName.trim()) return setError("Please enter your full name.");
    if (!form.username.trim()) return setError("Please choose a username.");
    if (form.username.length < 3) return setError("Usernames must be at least 3 characters long.");
    if (!/^[a-zA-Z0-9_.-]+$/.test(form.username)) {
      return setError("Usernames may only contain letters, numbers, dots, dashes and underscores.");
    }
    if (form.password.length < 8) return setError("Passwords must be at least 8 characters long.");
    if (form.password !== form.confirm) return setError("Your passwords don't match.");

    signup.mutate({
      username: form.username.trim(),
      password: form.password,
      fullName: form.fullName.trim(),
      email: form.email.trim() || undefined,
    });
  };

  const onField = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Sign-up form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-sm">
          <Link href="/">
            <a className="inline-flex items-center gap-2.5 mb-10">
              <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
                <Pill className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-semibold tracking-tight leading-none">CityPharm</p>
                <p className="text-[11px] text-muted-foreground leading-none mt-1">AI Stock System</p>
              </div>
            </a>
          </Link>

          <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
          <p className="mt-2 text-sm text-slate-600">
            Set up CityPharm in under a minute. The first account on a fresh installation
            automatically becomes the administrator.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={form.fullName}
                onChange={onField("fullName")}
                placeholder="Jane Doe"
                disabled={signup.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={form.username}
                onChange={onField("username")}
                placeholder="jane.doe"
                autoComplete="username"
                disabled={signup.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-xs text-slate-400 font-normal">(optional)</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={onField("email")}
                placeholder="jane@citypharm.example"
                autoComplete="email"
                disabled={signup.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={onField("password")}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                disabled={signup.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                value={form.confirm}
                onChange={onField("confirm")}
                placeholder="Repeat your password"
                autoComplete="new-password"
                disabled={signup.isPending}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={signup.isPending}>
              {signup.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create account
            </Button>
          </form>

          <p className="mt-6 text-sm text-slate-600">
            Already have an account?{" "}
            <Link href="/signin">
              <a className="font-medium text-primary hover:underline">Sign in instead</a>
            </Link>
          </p>
        </div>
      </div>

      {/* Feature panel */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] bg-slate-50 border-l border-slate-200 p-10 items-center">
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">What you get</p>
            <h2 className="mt-2 text-xl font-bold tracking-tight">A complete pharmacy back office.</h2>
            <p className="mt-2 text-sm text-slate-600">
              Your account unlocks every CityPharm module the moment you sign up.
            </p>
          </div>
          <ul className="space-y-3 text-sm text-slate-700">
            {[
              "Live KPI dashboard with today's sales, low-stock and expiring items",
              "Product catalogue with 120 real UK medications pre-loaded",
              "Sales register with receipt capture and refunds workflow",
              "Supplier orders generated from sold-out and low-stock lists",
              "Built-in AI assistant for narrative summaries and reorder suggestions",
              "Role-based access: admin, manager, pharmacist",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500 leading-relaxed">
            Demo data is sourced from the NHS BSA Prescription Cost Analysis (Feb 2026) and
            published under the Open Government Licence v3.0.
          </p>
        </div>
      </div>
    </div>
  );
}
