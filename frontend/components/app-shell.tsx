"use client"

import { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Briefcase,
  LayoutDashboard,
  PlusCircle,
  Settings,
  UserPlus,
  type LucideIcon,
} from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"

type SidebarItem = {
  label: string
  href: string
  icon: LucideIcon
}

const NAV_ITEMS: SidebarItem[] = [
  { label: "Inicio", href: "/", icon: LayoutDashboard },
  { label: "Admin", href: "/admin", icon: Settings },
  { label: "Métricas", href: "/admin/metrics", icon: BarChart3 },
  { label: "Oportunidades", href: "/opportunities", icon: Briefcase },
  { label: "Nueva oportunidad", href: "/opportunities/new", icon: PlusCircle },
  { label: "Nuevo cliente", href: "/clients/new", icon: UserPlus },
]

interface AppShellProps {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}

export function AppShell({ title, description, actions, children }: AppShellProps) {
  const pathname = usePathname()

  const renderNavItem = (item: SidebarItem) => {
    const Icon = item.icon
    const isActive =
      pathname === item.href || (pathname?.startsWith(item.href) && item.href !== "/")

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Icon className="h-4 w-4" />
        {item.label}
      </Link>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen w-full">
        <aside className="hidden border-r bg-muted/30 lg:block lg:w-64 xl:w-72">
          <div className="flex h-16 items-center border-b px-6 font-semibold tracking-tight">
            CLIInt Ops
          </div>
          <nav className="flex flex-col gap-1 px-4 py-4">{NAV_ITEMS.map(renderNavItem)}</nav>
        </aside>

        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
            <div className="flex h-16 flex-col justify-center gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:gap-4 lg:py-0">
              <div className="flex-1">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Control center</p>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-semibold">{title}</h1>
                  {description ? (
                    <p className="text-sm text-muted-foreground">{description}</p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                {actions}
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto border-t px-4 py-2 text-sm lg:hidden">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={`mobile-${item.href}`}
                  href={item.href}
                  className={cn(
                    "rounded-full px-3 py-1",
                    pathname === item.href
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  )
}


