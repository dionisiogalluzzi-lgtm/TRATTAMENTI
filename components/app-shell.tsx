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

const AGRIGAL_ICON = "/agrigal-icon-192.png";

function AgrigalIcon({ mobile = false }: { mobile?: boolean }) {
  const size = mobile ? 40 : 44;
  return (
    <img
      src={AGRIGAL_ICON}
      alt="AGRIGAL"
      width={size}
      height={size}
      className={mobile ? "brand-icon mobile" : "brand-icon"}
      loading="eager"
      decoding="sync"
    />
  );
}

export function AppShell({ profile, children }: { profile: AppProfile; children: ReactNode }) {
  return <div className="app-frame">
    <aside className="sidebar">
      <Link href="/dashboard" className="logo brand-button" aria-label="Vai alla Dashboard AGRIGAL">
        <AgrigalIcon />
        <span className="brand-copy"><strong>AGRIGAL</strong><small>Farm OS</small></span>
      </Link>
      <nav>{nav.map(([href,icon,label])=><Link key={href} href={href}>
        {href === "/dashboard"
          ? <img src={AGRIGAL_ICON} alt="" width="24" height="24" className="nav-brand-icon" loading="eager" />
          : <span>{icon}</span>}
        {label}
      </Link>)}</nav>
      <div className="sidebar-user"><div><strong>{profile.full_name || "Utente"}</strong><span className={profile.role === "ADMIN" ? "role admin" : "role"}>{profile.role}</span></div><form action={signOutAction}><button className="icon-btn" title="Esci" aria-label="Esci">↪</button></form></div>
    </aside>
    <div className="main-column">
      <header className="mobile-header">
        <Link href="/dashboard" className="logo brand-button" aria-label="Vai alla Dashboard AGRIGAL"><AgrigalIcon mobile /><strong>AGRIGAL</strong></Link>
        <span className={profile.role === "ADMIN" ? "role admin" : "role"}>{profile.role}</span>
      </header>
      <div className="mobile-nav" aria-label="Navigazione principale">{nav.slice(0,10).map(([href,icon,label])=><Link key={href} href={href}>
        {href === "/dashboard"
          ? <img src={AGRIGAL_ICON} alt="" width="30" height="30" className="mobile-dashboard-icon" loading="eager" />
          : <span>{icon}</span>}
        <small>{label}</small>
      </Link>)}</div>
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
