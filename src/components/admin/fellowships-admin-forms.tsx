"use client";

import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";

type SpecialtyOption = {
  id: string;
  name: string;
};

type FellowshipSpecialtyOption = {
  id: string;
  nameHe: string;
};

type FellowshipProgramOption = {
  id: string;
  label: string;
  fellowshipSpecialtyId: string;
};

type ExistingFellowshipSpecialty = {
  id: string;
  baseSpecialtyId?: string | null;
  slug: string;
  nameHe: string;
  nameEn?: string | null;
  description?: string | null;
  beforeContent?: string | null;
  duringContent?: string | null;
  afterContent?: string | null;
  isPublished: boolean;
};

type ExistingFellowshipProgram = {
  id: string;
  fellowshipSpecialtyId: string;
  baseSpecialtyId?: string | null;
  country: string;
  city?: string | null;
  institution: string;
  departmentName?: string | null;
  duration?: string | null;
  requirements?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  websiteUrl?: string | null;
  notes?: string | null;
  isPublished: boolean;
};

type ExistingFellowshipExperience = {
  id: string;
  fellowshipProgramId?: string | null;
  fellowshipSpecialtyId?: string | null;
  physicianName?: string | null;
  roleTitle?: string | null;
  currentInstitution?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  experienceText?: string | null;
  visibility: "ADMIN_ONLY" | "PUBLIC_ANONYMIZED" | "PUBLIC_IDENTIFIED";
  notes?: string | null;
  isPublished: boolean;
};

async function postJson(path: string, values: Record<string, unknown>) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(values)
  });
  const payload = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "שמירה נכשלה.");
  }

  return payload?.message ?? "נשמר.";
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="text-xs font-black text-slate-600">{children}</label>;
}

function Message({ value }: { value: string | null }) {
  return value ? <p className="rounded-2xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">{value}</p> : null;
}

export function FellowshipSpecialtyForm({
  baseSpecialties,
  existing = []
}: {
  baseSpecialties: SpecialtyOption[];
  existing?: ExistingFellowshipSpecialty[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const selected = useMemo(() => existing.find((item) => item.id === selectedId) ?? null, [existing, selectedId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const form = new FormData(event.currentTarget);

    try {
      const saved = await postJson("/api/admin/fellowships/specialties", {
        id: selectedId,
        baseSpecialtyId: String(form.get("baseSpecialtyId") ?? ""),
        slug: String(form.get("slug") ?? ""),
        nameHe: String(form.get("nameHe") ?? ""),
        nameEn: String(form.get("nameEn") ?? ""),
        description: String(form.get("description") ?? ""),
        beforeContent: String(form.get("beforeContent") ?? ""),
        duringContent: String(form.get("duringContent") ?? ""),
        afterContent: String(form.get("afterContent") ?? ""),
        isPublished: form.get("isPublished") === "on"
      });
      setMessage(saved);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "שמירה נכשלה.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl bg-brand-50 p-4">
      <div className="space-y-1">
        <FieldLabel>עריכה קיימת</FieldLabel>
        <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none">
          <option value="">יצירת תחום פלושיפ חדש</option>
          {existing.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nameHe}
            </option>
          ))}
        </select>
      </div>
      <div key={selected?.id ?? "new"} className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <select name="baseSpecialtyId" defaultValue={selected?.baseSpecialtyId ?? ""} className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none">
            <option value="">תחום בסיס לא משויך</option>
            {baseSpecialties.map((specialty) => (
              <option key={specialty.id} value={specialty.id}>
                {specialty.name}
              </option>
            ))}
          </select>
          <input name="slug" defaultValue={selected?.slug ?? ""} placeholder="slug" className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" required />
          <input name="nameHe" defaultValue={selected?.nameHe ?? ""} placeholder="שם בעברית" className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" required />
          <input name="nameEn" defaultValue={selected?.nameEn ?? ""} placeholder="שם באנגלית" className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" />
        </div>
        <textarea name="description" defaultValue={selected?.description ?? ""} placeholder="תיאור פנימי / עתידי" className="min-h-20 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" />
        <div className="grid gap-3 md:grid-cols-3">
          <textarea name="beforeContent" defaultValue={selected?.beforeContent ?? ""} placeholder="לפני פלושיפ" className="min-h-28 rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" />
          <textarea name="duringContent" defaultValue={selected?.duringContent ?? ""} placeholder="במהלך פלושיפ" className="min-h-28 rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" />
          <textarea name="afterContent" defaultValue={selected?.afterContent ?? ""} placeholder="אחרי פלושיפ" className="min-h-28 rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" />
        </div>
        <label className="inline-flex items-center gap-2 rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
          <input name="isPublished" type="checkbox" defaultChecked={selected?.isPublished ?? false} />
          מסומן לפרסום עתידי
        </label>
      </div>
      <Message value={message} />
      <button className="rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white">שמירת תחום פלושיפ</button>
    </form>
  );
}

export function FellowshipProgramForm({
  fellowshipSpecialties,
  baseSpecialties,
  existing = []
}: {
  fellowshipSpecialties: FellowshipSpecialtyOption[];
  baseSpecialties: SpecialtyOption[];
  existing?: ExistingFellowshipProgram[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const selected = useMemo(() => existing.find((item) => item.id === selectedId) ?? null, [existing, selectedId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const form = new FormData(event.currentTarget);

    try {
      const saved = await postJson("/api/admin/fellowships/programs", {
        id: selectedId,
        fellowshipSpecialtyId: String(form.get("fellowshipSpecialtyId") ?? ""),
        baseSpecialtyId: String(form.get("baseSpecialtyId") ?? ""),
        country: String(form.get("country") ?? ""),
        city: String(form.get("city") ?? ""),
        institution: String(form.get("institution") ?? ""),
        departmentName: String(form.get("departmentName") ?? ""),
        duration: String(form.get("duration") ?? ""),
        requirements: String(form.get("requirements") ?? ""),
        contactName: String(form.get("contactName") ?? ""),
        contactEmail: String(form.get("contactEmail") ?? ""),
        contactPhone: String(form.get("contactPhone") ?? ""),
        websiteUrl: String(form.get("websiteUrl") ?? ""),
        notes: String(form.get("notes") ?? ""),
        isPublished: form.get("isPublished") === "on"
      });
      setMessage(saved);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "שמירה נכשלה.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl bg-brand-50 p-4">
      <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none">
        <option value="">יצירת תוכנית חדשה</option>
        {existing.map((item) => (
          <option key={item.id} value={item.id}>
            {item.institution} · {item.country}
          </option>
        ))}
      </select>
      <div key={selected?.id ?? "new"} className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <select name="fellowshipSpecialtyId" defaultValue={selected?.fellowshipSpecialtyId ?? ""} className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" required>
            <option value="">תחום פלושיפ</option>
            {fellowshipSpecialties.map((specialty) => (
              <option key={specialty.id} value={specialty.id}>
                {specialty.nameHe}
              </option>
            ))}
          </select>
          <select name="baseSpecialtyId" defaultValue={selected?.baseSpecialtyId ?? ""} className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none">
            <option value="">תחום בסיס</option>
            {baseSpecialties.map((specialty) => (
              <option key={specialty.id} value={specialty.id}>
                {specialty.name}
              </option>
            ))}
          </select>
          <input name="country" defaultValue={selected?.country ?? ""} placeholder="מדינה" className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" required />
          <input name="city" defaultValue={selected?.city ?? ""} placeholder="עיר" className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" />
          <input name="institution" defaultValue={selected?.institution ?? ""} placeholder="מוסד" className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" required />
          <input name="departmentName" defaultValue={selected?.departmentName ?? ""} placeholder="מחלקה" className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" />
          <input name="duration" defaultValue={selected?.duration ?? ""} placeholder="משך" className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" />
          <input name="contactName" defaultValue={selected?.contactName ?? ""} placeholder="איש קשר" className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" />
          <input name="contactEmail" defaultValue={selected?.contactEmail ?? ""} type="email" placeholder="אימייל קשר" className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" />
          <input name="contactPhone" defaultValue={selected?.contactPhone ?? ""} placeholder="טלפון קשר" className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" />
          <input name="websiteUrl" defaultValue={selected?.websiteUrl ?? ""} type="url" placeholder="אתר" className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none md:col-span-2" />
        </div>
        <textarea name="requirements" defaultValue={selected?.requirements ?? ""} placeholder="דרישות" className="min-h-20 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" />
        <textarea name="notes" defaultValue={selected?.notes ?? ""} placeholder="הערות" className="min-h-20 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" />
        <label className="inline-flex items-center gap-2 rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
          <input name="isPublished" type="checkbox" defaultChecked={selected?.isPublished ?? false} />
          מסומן לפרסום עתידי
        </label>
      </div>
      <Message value={message} />
      <button className="rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white">שמירת תוכנית פלושיפ</button>
    </form>
  );
}

export function FellowshipExperienceForm({
  fellowshipSpecialties,
  fellowshipPrograms,
  existing = []
}: {
  fellowshipSpecialties: FellowshipSpecialtyOption[];
  fellowshipPrograms: FellowshipProgramOption[];
  existing?: ExistingFellowshipExperience[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const selected = useMemo(() => existing.find((item) => item.id === selectedId) ?? null, [existing, selectedId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const form = new FormData(event.currentTarget);

    try {
      const saved = await postJson("/api/admin/fellowships/experiences", {
        id: selectedId,
        fellowshipProgramId: String(form.get("fellowshipProgramId") ?? ""),
        fellowshipSpecialtyId: String(form.get("fellowshipSpecialtyId") ?? ""),
        physicianName: String(form.get("physicianName") ?? ""),
        roleTitle: String(form.get("roleTitle") ?? ""),
        currentInstitution: String(form.get("currentInstitution") ?? ""),
        contactEmail: String(form.get("contactEmail") ?? ""),
        contactPhone: String(form.get("contactPhone") ?? ""),
        experienceText: String(form.get("experienceText") ?? ""),
        visibility: String(form.get("visibility") ?? "ADMIN_ONLY"),
        notes: String(form.get("notes") ?? ""),
        isPublished: form.get("isPublished") === "on"
      });
      setMessage(saved);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "שמירה נכשלה.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl bg-brand-50 p-4">
      <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none">
        <option value="">יצירת ניסיון ישראלי חדש</option>
        {existing.map((item) => (
          <option key={item.id} value={item.id}>
            {item.physicianName ?? item.currentInstitution ?? item.id}
          </option>
        ))}
      </select>
      <div key={selected?.id ?? "new"} className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <select name="fellowshipSpecialtyId" defaultValue={selected?.fellowshipSpecialtyId ?? ""} className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none">
            <option value="">תחום פלושיפ</option>
            {fellowshipSpecialties.map((specialty) => (
              <option key={specialty.id} value={specialty.id}>
                {specialty.nameHe}
              </option>
            ))}
          </select>
          <select name="fellowshipProgramId" defaultValue={selected?.fellowshipProgramId ?? ""} className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none">
            <option value="">תוכנית פלושיפ</option>
            {fellowshipPrograms.map((program) => (
              <option key={program.id} value={program.id}>
                {program.label}
              </option>
            ))}
          </select>
          <select name="visibility" defaultValue={selected?.visibility ?? "ADMIN_ONLY"} className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none">
            <option value="ADMIN_ONLY">אדמין בלבד</option>
            <option value="PUBLIC_ANONYMIZED">פרסום אנונימי בעתיד</option>
            <option value="PUBLIC_IDENTIFIED">פרסום מזוהה בעתיד</option>
          </select>
          <input name="physicianName" defaultValue={selected?.physicianName ?? ""} placeholder="שם רופא/ה" className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" />
          <input name="roleTitle" defaultValue={selected?.roleTitle ?? ""} placeholder="תפקיד" className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" />
          <input name="currentInstitution" defaultValue={selected?.currentInstitution ?? ""} placeholder="מוסד נוכחי" className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" />
          <input name="contactEmail" defaultValue={selected?.contactEmail ?? ""} type="email" placeholder="אימייל פנימי" className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" />
          <input name="contactPhone" defaultValue={selected?.contactPhone ?? ""} placeholder="טלפון פנימי" className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" />
        </div>
        <textarea name="experienceText" defaultValue={selected?.experienceText ?? ""} placeholder="טקסט ניסיון" className="min-h-24 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" />
        <textarea name="notes" defaultValue={selected?.notes ?? ""} placeholder="הערות אדמין" className="min-h-20 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none" />
        <label className="inline-flex items-center gap-2 rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
          <input name="isPublished" type="checkbox" defaultChecked={selected?.isPublished ?? false} />
          מסומן לפרסום עתידי
        </label>
      </div>
      <Message value={message} />
      <button className="rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white">שמירת ניסיון ישראלי</button>
    </form>
  );
}
