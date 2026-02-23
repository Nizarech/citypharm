import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Pill, Loader2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

export default function SignIn() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const signin = trpc.auth.signin.useMutation({
    onSuccess: async () => {
      // Force a fresh `auth.me` fetch so the new session is picked up
      // immediately by every protected page.
      await utils.auth.me.invalidate();
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next");
      setLocation(next && next.startsWith("/") ? next : "/dashboard");
    },
    onError: (err) => {
      setError(err.message || "Unable to sign in. Please try again.");
    },
  });

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError("Please enter both your username and password.");
      return;
    }
    signin.mutate({ username: username.trim(), password });
  };

  const fillDemo = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Sign-in form */}
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

          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in to access your pharmacy dashboard.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin"
                disabled={signin.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={signin.isPending}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={signin.isPending}>
              {signin.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-sm text-slate-600">
            New to CityPharm?{" "}
            <Link href="/signup">
              <a className="font-medium text-primary hover:underline">Create an account</a>
            </Link>
          </p>
        </div>
      </div>

      {/* Demo credentials panel */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] bg-slate-50 border-l border-slate-200 p-10 items-center">
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Demo accounts</p>
            <h2 className="mt-2 text-xl font-bold tracking-tight">
              Try CityPharm with seeded credentials
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Tap any role below to autofill the form. Each demo user has a different permission
              level so you can explore role-based access.
            </p>
          </div>
          <div className="space-y-3">
            {[
              { role: "Administrator", username: "admin", password: "admin123", color: "bg-primary/10 text-primary" },
              { role: "Manager", username: "manager", password: "manager123", color: "bg-amber-100 text-amber-700" },
              { role: "Pharmacist", username: "pharmacist", password: "pharm123", color: "bg-emerald-100 text-emerald-700" },
            ].map((acc) => (
              <Card
                key={acc.username}
                className="cursor-pointer border-slate-200 bg-white hover:border-primary/50 transition-colors"
                onClick={() => fillDemo(acc.username, acc.password)}
              >
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded ${acc.color}`}>
                      {acc.role}
                    </span>
                    <p className="mt-2 font-mono text-sm text-slate-900">{acc.username}</p>
                    <p className="font-mono text-xs text-slate-500">{acc.password}</p>
                  </div>
                  <span className="text-xs text-primary font-medium">Use →</span>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Demo data is sourced from the NHS BSA Prescription Cost Analysis (Feb 2026) and
            published under the Open Government Licence v3.0.
          </p>
        </div>
      </div>
    </div>
  );
}
