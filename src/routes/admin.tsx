import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { LayoutDashboard, FileText, Tags, LogOut, Loader2, ShieldAlert, ArrowLeft, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NotConfiguredNotice } from "@/components/States";
import { cn } from "@/lib/utils";
import { SITE } from "@/lib/config";
import factoniaLogo from "@/assets/factonia-logo.png";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: `Admin — ${SITE.name}` }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const { loading, user, isAdmin, configured } = useAuth();

  if (!configured) {
    return (
      <CenteredShell>
        <div className="w-full max-w-md">
          <NotConfiguredNotice />
          <BackHome />
        </div>
      </CenteredShell>
    );
  }

  if (loading) {
    return (
      <CenteredShell>
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </CenteredShell>
    );
  }

  if (!user) return <AdminLogin />;

  if (!isAdmin) return <AccessDenied />;

  return <AdminShell />;
}

function CenteredShell({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">{children}</div>;
}

function BackHome() {
  return (
    <Link to="/" className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" /> Back to site
    </Link>
  );
}

function AdminLogin() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await signIn(email.trim(), password);
    setBusy(false);
    if (error) toast.error(error);
    else toast.success("Signed in");
  }

  return (
    <CenteredShell>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl">
            <img src={factoniaLogo} alt={`${SITE.name} logo`} width={48} height={48} className="h-12 w-12 rounded-xl" />
          </span>
          <h1 className="mt-4 text-2xl font-bold">Admin sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Restricted area — authorized users only.</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border bg-card p-6 shadow-card">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign in
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Create the user in Supabase → Authentication, then grant the admin role (see setup notes).
        </p>
        <div className="text-center"><BackHome /></div>
      </div>
    </CenteredShell>
  );
}

function AccessDenied() {
  const { signOut, user } = useAuth();
  return (
    <CenteredShell>
      <div className="w-full max-w-md text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <ShieldAlert className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-2xl font-bold">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You're signed in as <span className="font-medium text-foreground">{user?.email}</span> but this
          account does not have the admin role.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="outline" onClick={() => signOut()}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
          <Button asChild><Link to="/">Back to site</Link></Button>
        </div>
      </div>
    </CenteredShell>
  );
}

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/generate", label: "AI Writer", icon: Sparkles, exact: false },
  { to: "/admin/posts", label: "Posts", icon: FileText, exact: false },
  { to: "/admin/taxonomy", label: "Taxonomy", icon: Tags, exact: false },
] as const;

function AdminShell() {
  const { signOut, user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen bg-muted/20">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-card p-4 md:flex">
        <Link to="/" className="mb-8 flex items-center gap-2 font-display text-lg font-bold">
          <img src={factoniaLogo} alt={`${SITE.name} logo`} width={32} height={32} className="h-8 w-8 rounded-lg" />
          {SITE.name}
        </Link>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4" /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-2 border-t pt-4">
          <p className="truncate px-3 text-xs text-muted-foreground">{user?.email}</p>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => signOut()}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex-1">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between border-b bg-card px-4 py-3 md:hidden">
          <div className="flex gap-1">
            {NAV.map((item) => (
              <Link key={item.to} to={item.to} className="rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted" activeProps={{ className: "text-foreground" }}>
                {item.label}
              </Link>
            ))}
          </div>
          <Button variant="ghost" size="icon" onClick={() => signOut()} aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <main className="mx-auto max-w-5xl p-4 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
