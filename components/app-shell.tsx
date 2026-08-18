import Link from "next/link";
import type { ReactNode } from "react";
import { signOutAction } from "@/app/actions";
import type { AppProfile } from "@/lib/auth";

const nav = [
  ["/dashboard", "⌂", "Dashboard"],
  ["/trattamenti", "◉", "Trattamenti"],
  ["/esecuzioni", "✓", "Esecuzioni"],
  ["/quaderno", "▤", "Quaderno digitale"],
  ["/magazzino", "▦", "Magazzino"],
  ["/acquisti", "€", "Acquisti"],
  ["/appezzamenti", "◇", "Appezzamenti"],
  ["/attivita", "+", "Attività"],
  ["/prodotti", "⚗", "Prodotti"],
  ["/documenti", "▣", "Documenti"],
  ["/report", "↗", "Report"],
  ["/aziende", "A", "Aziende"],
  ["/impostazioni", "⚙", "Impostazioni"],
] as const;

export function AppShell({ profile, children }: { profile: AppProfile; children: ReactNode }) {
  return <div className="app-frame">
    <aside className="sidebar">
      <Link href="/dashboard" className="logo"><span className="logo-mark">A</span><span><strong>AGRIGAL</strong><small>Farm OS</small></span></Link>
      <nav>{nav.map(([href,icon,label])=><Link key={href} href={href}><span>{icon}</span>{label}</Link>)}</nav>
      <div className="sidebar-user"><div><strong>{profile.full_name || "Utente"}</strong><span className={profile.role === "ADMIN" ? "role admin" : "role"}>{profile.role}</span></div><form action={signOutAction}><button className="icon-btn" title="Esci">↪</button></form></div>
    </aside>
    <div className="main-column">
      <header className="mobile-header"><Link href="/dashboard" className="logo"><span className="logo-mark">A</span><strong>AGRIGAL</strong></Link><span className={profile.role === "ADMIN" ? "role admin" : "role"}>{profile.role}</span></header>
      <div className="mobile-nav">{nav.slice(0,10).map(([href,icon,label])=><Link key={href} href={href}><span>{icon}</span><small>{label}</small></Link>)}</div>
      <main className="content">{children}</main>
    </div>
  </div>;
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <div className="page-header"><div>{eyebrow&&<p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description&&<p className="page-description">{description}</p>}</div>{actions&&<div className="header-actions">{actions}</div>}</div>;
}

export function Feedback({ ok, error }: { ok?: string; error?: string }) {
  return <>{ok&&<div className="alert success">✓ {ok}</div>}{error&&<div className="alert error">! {error}</div>}</>;
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return <div className="empty"><span className="empty-icon">↗</span><h3>{title}</h3><p>{text}</p>{action}</div>;
}
