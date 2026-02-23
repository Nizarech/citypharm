import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Pill,
  Bot,
  BarChart3,
  Truck,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Clock,
  Package,
  ShoppingCart,
  Layers,
  ChevronRight,
  Star,
} from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Landing() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect to dashboard if already signed in
  useEffect(() => {
    if (!loading && user) setLocation("/dashboard");
  }, [loading, user, setLocation]);

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">

      {/* Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-40">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shadow-sm">
              <Pill className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-bold tracking-tight leading-none text-slate-900">CityPharm</p>
              <p className="text-[11px] text-slate-500 leading-none mt-0.5">AI Stock System</p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/signin")} className="text-slate-600 hover:text-slate-900">
              Sign in
            </Button>
            <Button size="sm" onClick={() => setLocation("/signup")} className="shadow-sm">
              Get started free
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero section */}
      <section className="container pt-16 pb-20">
        <div className="grid lg:grid-cols-12 gap-14 items-center">
          {/* Left copy */}
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              Built for UK community pharmacies
            </div>
            <h1 className="text-5xl lg:text-[3.4rem] font-extrabold tracking-tight leading-[1.08] text-slate-900">
              The smarter way to manage{" "}
              <span className="text-primary">pharmacy stock.</span>
            </h1>
            <p className="mt-5 text-lg text-slate-500 leading-relaxed max-w-lg">
              CityPharm unifies your inventory, dispensing records, supplier orders and AI-powered
              demand insight in one calm workspace — so your team spends less time on paperwork and
              more time on patients.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => setLocation("/signup")} className="shadow-md">
                Create your free account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50" onClick={() => setLocation("/signin")}>
                Sign in to your account
              </Button>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-2.5 text-sm text-slate-600 max-w-sm">
              {[
                "No credit card required",
                "Role-based access control",
                "NHS BSA real medicine data",
                "Expiry & reorder alerts",
                "AI business summaries",
                "Full audit trail",
              ].map((feat) => (
                <div key={feat} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — dashboard preview card */}
          <div className="lg:col-span-6">
            <div className="relative">
              {/* Glow backdrop */}
              <div className="absolute -inset-4 bg-gradient-to-br from-primary/10 via-blue-100/30 to-transparent rounded-3xl blur-2xl" />
              <Card className="relative border-slate-200 shadow-2xl shadow-slate-200/60 rounded-2xl overflow-hidden">
                {/* Fake topbar */}
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="flex-1 mx-3 h-5 rounded bg-slate-200/70 text-[10px] text-slate-400 flex items-center px-2">
                    localhost:3000/dashboard
                  </div>
                </div>
                <CardContent className="p-5 space-y-4">
                  {/* KPI row */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Sales today", value: "£3,032", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
                      { label: "Low stock", value: "12 items", icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
                      { label: "Expiring soon", value: "5 items", icon: Clock, color: "text-rose-600", bg: "bg-rose-50" },
                    ].map((kpi) => (
                      <div key={kpi.label} className="rounded-xl border border-slate-100 p-3">
                        <div className={`h-7 w-7 rounded-lg ${kpi.bg} flex items-center justify-center mb-2`}>
                          <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                        </div>
                        <p className="text-xs text-slate-500">{kpi.label}</p>
                        <p className={`text-sm font-bold mt-0.5 ${kpi.color}`}>{kpi.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Mini chart placeholder */}
                  <div className="rounded-xl border border-slate-100 p-3">
                    <p className="text-xs font-semibold text-slate-500 mb-2">Daily Revenue — Last 14 days</p>
                    <div className="flex items-end gap-1 h-14">
                      {[30, 55, 40, 70, 60, 80, 50, 90, 65, 75, 45, 85, 70, 95].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-sm bg-primary/80"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* AI suggestion */}
                  <div className="rounded-xl bg-gradient-to-r from-primary/5 to-blue-50 border border-primary/15 p-3.5 flex items-start gap-3">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">AI Assistant</p>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                        Trimbow 87/5/9mcg has sold out twice this month.
                        Suggested reorder: <span className="font-semibold text-primary">200 units from Chiesi</span>.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="container py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "120+", label: "Real NHS medicines", sub: "from the BSA PCA dataset" },
              { value: "34k+", label: "Simulated transactions", sub: "across 12 months" },
              { value: "3", label: "Access roles", sub: "admin, manager, pharmacist" },
              { value: "< 1s", label: "AI reorder generation", sub: "for your entire catalogue" },
            ].map((stat) => (
              <div key={stat.label} className="space-y-1">
                <p className="text-3xl font-extrabold text-primary">{stat.value}</p>
                <p className="text-sm font-semibold text-slate-800">{stat.label}</p>
                <p className="text-xs text-slate-500">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="container py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">What's inside</p>
          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900">
            Every part of stock management, in one place.
          </h2>
          <p className="mt-4 text-slate-500 text-base leading-relaxed">
            CityPharm replaces spreadsheets, sticky notes and the WhatsApp group with structured
            workflows your whole team can rely on.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              icon: Pill,
              title: "Product catalogue",
              body: "Maintain a clean catalogue of 120+ real NHS medicines with batch numbers, expiry dates, BNF categories and supplier links.",
              badge: "Core",
            },
            {
              icon: BarChart3,
              title: "Live dashboard",
              body: "See today's revenue, low-stock alerts, expiring items and pending orders the moment you open the app — no refresh needed.",
              badge: "Core",
            },
            {
              icon: ShoppingCart,
              title: "Sales & returns",
              body: "Record dispensing transactions with multi-line carts, payment methods and discounts. Process returns in seconds with automatic stock reinstatement.",
              badge: "Core",
            },
            {
              icon: Truck,
              title: "Supplier orders",
              body: "Generate purchase orders from low-stock and sold-out lists, track delivery status, and auto-increment stock when an order is marked received.",
              badge: "Core",
            },
            {
              icon: Bot,
              title: "AI assistant",
              body: "Get expiry warnings, reorder suggestions and a plain-English business narrative covering sales performance and inventory health for any time window.",
              badge: "AI",
            },
            {
              icon: ShieldCheck,
              title: "Role-based access",
              body: "Pharmacists dispense, managers reconcile, admins configure — with server-enforced permissions at every procedure, not just the UI.",
              badge: "Security",
            },
            {
              icon: Layers,
              title: "Statistics & analytics",
              body: "90-day revenue trends, inventory value by BNF category, and a top-10 products table — with the underlying numbers always visible.",
              badge: "Analytics",
            },
            {
              icon: Package,
              title: "Stock management",
              body: "Filter your catalogue by status — healthy, low, sold-out, expiring — and reorder a single product in one click without leaving the stock screen.",
              badge: "Core",
            },
            {
              icon: Sparkles,
              title: "Realistic demo data",
              body: "Loaded from the NHS BSA Prescription Cost Analysis dataset (Feb 2026) so you explore with real top-120 UK medications and realistic sales volumes.",
              badge: "Data",
            },
          ].map((f) => (
            <Card key={f.title} className="border-slate-200 bg-white hover:shadow-md hover:border-primary/20 transition-all group">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 border border-slate-200 rounded-full px-2 py-0.5">
                    {f.badge}
                  </span>
                </div>
                <h3 className="font-bold text-base text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-slate-200 bg-slate-50/70">
        <div className="container py-20">
          <div className="text-center max-w-xl mx-auto mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">How it works</p>
            <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900">
              Up and running in minutes.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: "01",
                title: "Create your account",
                body: "Sign up with a username and password. The first account on your installation is automatically promoted to administrator.",
              },
              {
                step: "02",
                title: "Explore with real data",
                body: "The system comes pre-loaded with 120 NHS medicines, 8 suppliers, and 34,000 realistic sales transactions — ready to explore immediately.",
              },
              {
                step: "03",
                title: "Manage & optimise",
                body: "Record sales, raise supplier orders, monitor expiry dates, and let the AI assistant surface reorder suggestions and business insights.",
              },
            ].map((s, i) => (
              <div key={s.step} className="relative flex flex-col items-start">
                {i < 2 && (
                  <ChevronRight className="hidden md:block absolute -right-5 top-4 h-5 w-5 text-slate-300" />
                )}
                <div className="h-11 w-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-extrabold text-sm mb-4 shadow-md">
                  {s.step}
                </div>
                <h3 className="font-bold text-base text-slate-900 mb-2">{s.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* {Democredentialscallout} */}
      <section className="container py-12">
        <div className="rounded-2xl border border-primary/20 bg-primary/4 p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Star className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-900 text-base">Try it instantly with demo accounts</p>
            <p className="text-sm text-slate-500 mt-1">
              Three pre-loaded accounts let you explore every role without signing up:
              <span className="font-mono text-slate-700 ml-1">admin / admin123</span>,{" "}
              <span className="font-mono text-slate-700">manager / manager123</span>, and{" "}
              <span className="font-mono text-slate-700">pharmacist / pharm123</span>.
            </p>
          </div>
          <Button onClick={() => setLocation("/signin")} className="shrink-0 shadow-sm">
            Sign in with demo
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-24">
        <div className="rounded-3xl bg-gradient-to-br from-primary to-blue-700 p-12 lg:p-16 text-center text-white relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-1/4 h-64 w-64 rounded-full bg-white blur-3xl" />
            <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-white blur-3xl" />
          </div>
          <div className="relative">
            <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight">
              Ready to take control of your stock?
            </h2>
            <p className="mt-4 text-blue-100 max-w-xl mx-auto text-base leading-relaxed">
              Sign up in under a minute — no credit card, no setup call. The first account on your
              installation becomes the administrator and the demo data is ready to explore straight away.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button
                size="lg"
                onClick={() => setLocation("/signup")}
                className="bg-white text-primary hover:bg-blue-50 shadow-lg font-semibold"
              >
                Create your free account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setLocation("/signin")}
                className="border-white/40 text-white bg-white/10 hover:bg-white/20"
              >
                Sign in
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="container py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
              <Pill className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-slate-600">CityPharm AI Stock System</span>
          </div>
          <p className="text-center sm:text-right">
            Final year project — London South Bank University &nbsp;·&nbsp; Data sourced from NHS BSA under the Open Government Licence v3.0
          </p>
        </div>
      </footer>
    </div>
  );
}
