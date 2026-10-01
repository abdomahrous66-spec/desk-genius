import * as XLSX from "xlsx";

export const ORD = ["One", "Two", "Three", "Four", "Five", "Six"] as const;
export const OBJ_COUNT = 6;
export const COMP_COUNT = 3;

export type Band = { key: string; label: string; label_ar: string; min: number; max: number; curve: number };
export type Objective = { objective: string; kpi: string; target: string; weight: number };
export type Competency = { name: string; indicators: string; weight: number };
export type Budget = { name: string; kpi: string; target: string; weight: number } | null;

export type Cycle = {
  id: string; name: string; year: number; company_id: string | null;
  objectives_weight: number; competencies_weight: number; penalties_weight: number;
  rating_bands: Band[]; status: string;
};

export type Emp = {
  id: string; cycle_id: string; company_id: string | null; code: string; name: string;
  hiring_date: string | null; employee_status: string | null; position_en: string | null;
  location: string | null; email: string | null; phone: string | null;
  sector: string | null; department: string | null; section: string | null; subsection: string | null;
  managerial_level: string | null; manager_name: string | null; parent_position_en: string | null;
  objectives: Objective[]; budget: Budget; competencies: Competency[];
};

export type Penalty = { id: string; cycle_id: string; code: string; employee_name: string | null; penalties_count: number; notes: string | null };

export const DEFAULT_BANDS: Band[] = [
  { key: "poor", label: "Poor", label_ar: "ضعيف", min: 0, max: 59.99, curve: 5 },
  { key: "acceptable", label: "Acceptable", label_ar: "مقبول", min: 60, max: 69.99, curve: 15 },
  { key: "good", label: "Good", label_ar: "جيد", min: 70, max: 79.99, curve: 60 },
  { key: "very_good", label: "Very Good", label_ar: "جيد جدا", min: 80, max: 89.99, curve: 15 },
  { key: "excellent", label: "Excellent", label_ar: "ممتاز", min: 90, max: 100, curve: 5 },
];

const BASE_COLS: [keyof Emp | "company", string][] = [
  ["code", "Code"], ["name", "Name"], ["hiring_date", "Hiring Date"], ["employee_status", "Employee Status"],
  ["position_en", "English Position"], ["location", "Location"], ["email", "Email"], ["phone", "Phone Number"],
  ["company", "Company"], ["sector", "Sector"], ["department", "Department"], ["section", "Section"], ["subsection", "Subsection"],
  ["managerial_level", "Managerial Level"], ["manager_name", "Manager Name"], ["parent_position_en", "Parent Position English"],
];

export function employeeHeaders() {
  const h = BASE_COLS.map(c => c[1]);
  ORD.forEach(o => h.push(`Objective ${o}`, `KPI ${o}`, `Target ${o}`, `Weight ${o}`));
  h.push("Budget Compliance", "Budget KPI", "Budget Target", "Budget Weight");
  ORD.slice(0, COMP_COUNT).forEach(o => h.push(`Core Competency ${o}`, `Indicators ${o}`, `Competency Weight ${o}`));
  return h;
}

const s = (v: unknown) => (v === undefined || v === null ? "" : String(v).trim());
const n = (v: unknown) => { const x = parseFloat(String(v ?? "").replace("%", "")); return Number.isFinite(x) ? (x > 0 && x <= 1 ? x * 100 : x) : 0; };
const d = (v: unknown): string | null => {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const t = new Date(String(v)); return isNaN(+t) ? null : t.toISOString().slice(0, 10);
};

export function downloadXlsx(name: string, headers: string[], rows: unknown[][] = []) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = headers.map(() => ({ wch: 20 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, name);
}

export async function readXlsx(file: File): Promise<Record<string, unknown>[]> {
  const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
}

export function rowToEmployee(r: Record<string, unknown>, companies: { id: string; name: string }[], fallbackCompany: string | null) {
  const g = (k: string) => {
    const key = Object.keys(r).find(x => x.trim().toLowerCase() === k.toLowerCase());
    return key ? r[key] : "";
  };
  const objectives: Objective[] = ORD.map(o => ({ objective: s(g(`Objective ${o}`)), kpi: s(g(`KPI ${o}`)), target: s(g(`Target ${o}`)), weight: n(g(`Weight ${o}`)) }))
    .filter(x => x.objective);
  const competencies: Competency[] = ORD.slice(0, COMP_COUNT).map(o => ({ name: s(g(`Core Competency ${o}`) || g(`Competency ${o}`)), indicators: s(g(`Indicators ${o}`)), weight: n(g(`Competency Weight ${o}`)) }))
    .filter(x => x.name);
  const bName = s(g("Budget Compliance"));
  const compName = s(g("Company")).toLowerCase();
  const company = companies.find(c => c.name.toLowerCase() === compName)?.id ?? fallbackCompany;
  return {
    code: s(g("Code")), name: s(g("Name")), hiring_date: d(g("Hiring Date")), employee_status: s(g("Employee Status")) || null,
    position_en: s(g("English Position")) || null, location: s(g("Location")) || null, email: s(g("Email")) || null,
    phone: s(g("Phone Number")) || null, company_id: company, sector: s(g("Sector")) || null, department: s(g("Department")) || null,
    section: s(g("Section")) || null, subsection: s(g("Subsection")) || null, managerial_level: s(g("Managerial Level")) || null,
    manager_name: s(g("Manager Name")) || null, parent_position_en: s(g("Parent Position English")) || null,
    objectives, competencies,
    budget: bName ? { name: bName, kpi: s(g("Budget KPI")), target: s(g("Budget Target")), weight: n(g("Budget Weight")) } : null,
  };
}

export function employeeToRow(e: Emp, companyName: string) {
  const r: unknown[] = BASE_COLS.map(([k]) => (k === "company" ? companyName : (e[k as keyof Emp] as unknown) ?? ""));
  ORD.forEach((_, i) => { const o = e.objectives?.[i]; r.push(o?.objective ?? "", o?.kpi ?? "", o?.target ?? "", o?.weight ?? ""); });
  r.push(e.budget?.name ?? "", e.budget?.kpi ?? "", e.budget?.target ?? "", e.budget?.weight ?? "");
  ORD.slice(0, COMP_COUNT).forEach((_, i) => { const c = e.competencies?.[i]; r.push(c?.name ?? "", c?.indicators ?? "", c?.weight ?? ""); });
  return r;
}

export const PENALTY_HEADERS = ["Code", "Name", "Penalties", "Notes"];

/** Weighted average of achievement % (capped at 120%). */
function weighted(items: { weight: number; score: number }[]) {
  const tw = items.reduce((a, b) => a + (b.weight || 0), 0);
  if (!tw) return items.length ? items.reduce((a, b) => a + b.score, 0) / items.length : 0;
  return items.reduce((a, b) => a + Math.min(b.score, 120) * (b.weight || 0), 0) / tw;
}

export function computeScore(cycle: Cycle, emp: Emp, objScores: number[], compScores: number[], budgetScore: number | null, penalties: number) {
  const objItems = emp.objectives.map((o, i) => ({ weight: o.weight, score: objScores[i] ?? 0 }));
  if (emp.budget) objItems.push({ weight: emp.budget.weight, score: budgetScore ?? 0 });
  const objectives_result = weighted(objItems);
  const competencies_result = weighted(emp.competencies.map((c, i) => ({ weight: c.weight, score: compScores[i] ?? 0 })));
  const penalties_result = Math.min(100, penalties * Number(cycle.penalties_weight || 0));
  const raw = objectives_result * Number(cycle.objectives_weight) / 100 + competencies_result * Number(cycle.competencies_weight) / 100 - penalties_result;
  const overall = Math.max(0, Math.min(100, raw));
  return { objectives_result, competencies_result, penalties_result, overall, band: bandFor(cycle.rating_bands, overall) };
}

export function bandFor(bands: Band[], score: number) {
  return bands.find(b => score >= b.min && score <= b.max) ?? (score > 100 ? bands[bands.length - 1] : bands[0]);
}
