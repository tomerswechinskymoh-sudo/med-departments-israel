"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function PublicNavigation({
  items,
}: {
  items: { href: string; label: string }[];
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="nav-toggle"
        type="button"
        aria-expanded={open}
        aria-controls="public-nav"
        onClick={() => setOpen(!open)}
      >
        {open ? "סגירת תפריט" : "תפריט"}{" "}
        <span aria-hidden="true">{open ? "×" : "☰"}</span>
      </button>
      <nav
        id="public-nav"
        aria-label="ניווט ראשי"
        className={`public-nav ${open ? "is-open" : ""}`}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            document.querySelector<HTMLButtonElement>(".nav-toggle")?.focus();
          }
        }}
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={path === item.href ? "page" : undefined}
            onClick={() => {
              setOpen(false);

            }}
          >
            {item.label}
            {item.href === "/career-fit" && (
              <span className="beta-badge">Beta</span>
            )}
          </Link>
        ))}
      </nav>
    </>
  );
}
