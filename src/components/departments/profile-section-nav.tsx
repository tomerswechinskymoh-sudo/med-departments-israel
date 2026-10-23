"use client";
import { useEffect, useRef, useState } from "react";


const sections = [
  { id: "overview", label: "אודות", event: "overview" },
  { id: "official-data", label: "נתונים ומגמות", event: "data" },
  { id: "profile-training", label: "מבנה ההתמחות", event: "data" },
  { id: "profile-work", label: "הכשרה ותנאים", event: "data" },
  { id: "profile-contact", label: "אנשי קשר", event: "contact" },
  { id: "department-experiences", label: "חוות דעת", event: "experience" },
] as const;

/** Ordinary anchors remain usable without JavaScript; scrolling updates location. */
export function ProfileSectionNav({}: { departmentSlug: string }) {
  const [active, setActive] = useState<string>("overview");
  const frame = useRef<number>(0);
  const selectedByNavigation = useRef<string | null>(null);
  useEffect(() => {
    const update = () => {
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        if (selectedByNavigation.current) { setActive(selectedByNavigation.current); return; }
        const reached = sections.filter(section => {
          const element = document.getElementById(section.id);
          return element && element.getBoundingClientRect().top <= 170;
        });
        setActive(window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4 ? sections.at(-1)!.id : reached.at(-1)?.id ?? "overview");
      });
    };
    const resumeScrollTracking = () => { selectedByNavigation.current = null; update(); };
    const onKeyDown = (event: KeyboardEvent) => { if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) resumeScrollTracking(); };
    window.addEventListener("wheel", resumeScrollTracking, { passive: true });
    window.addEventListener("touchmove", resumeScrollTracking, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => { cancelAnimationFrame(frame.current); window.removeEventListener("scroll", update); window.removeEventListener("wheel", resumeScrollTracking); window.removeEventListener("touchmove", resumeScrollTracking); window.removeEventListener("keydown", onKeyDown); };
  }, []);
  return <nav className="profile-nav profile-section-nav" aria-label="תוכן עמוד המחלקה">
    {sections.map(section => <a key={section.id} href={`#${section.id}`} aria-current={active === section.id ? "location" : undefined} onClick={() => {
      selectedByNavigation.current = section.id;
      setActive(section.id);
      document.getElementById(section.id)?.focus({ preventScroll: true });

    }}>{section.label}</a>)}
  </nav>;
}
