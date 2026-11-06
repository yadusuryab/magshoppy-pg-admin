"use client";
import { usePathname } from "next/navigation";
import { Package, Settings, Star } from "lucide-react";
import Link from "next/link";

const navItems = [
  { href: "/admin", label: "Products", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: Package },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-4 left-4 right-4 md:sticky md:top-4 md:left-auto md:right-auto z-50 mx-auto flex max-w-fit items-center gap-1 rounded-full  bg-primary/75 backdrop-blur-lg shadow-lg shadow-black/10 justify-around md:justify-center p-1 overflow-x-auto">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col md:flex-row items-center gap-0.5 md:gap-2 px-3 md:px-4 py-2 rounded-full text-[10px] md:text-sm font-semibold whitespace-nowrap transition ${
              active
                ? "bg-secondary "
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </Link>
        );
      })}
     
    </nav>
  );
}