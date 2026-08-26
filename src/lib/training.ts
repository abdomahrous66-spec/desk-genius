export type TrainingNeed = {
  id: string;
  created_by: string | null;
  company_id: string | null;
  sector: string | null;
  department: string | null;
  section: string | null;
  position_title: string | null;
  employee_code: string | null;
  employee_name: string | null;
  training_topic: string;
  expected_kpi: string | null;
  training_type: string | null;
  training_objective: string | null;
  training_priority: string | null;
  recommended_quarter_1: string | null;
  recommended_quarter_2: string | null;
  provider_recommendation: string | null;
  notes: string | null;
  status: string;
  employee_title: string | null;
  gender: string | null;
  employee_status: string | null;
  hiring_date: string | null;
  internal_years_experience: number | null;
  location: string | null;
  training_identification: string | null;
  source: string | null;
  training_provider: string | null;
  delivery_type: string | null;
  training_start_date: string | null;
  training_end_date: string | null;
  implementation_quarter: string | null;
  implementation_month: string | null;
  implementation_year: number | null;
  training_days: number | null;
  training_hours: number | null;
  total_training_cost: number | null;
  attendance_status: string | null;
  reason_of_no_show: string | null;
  pre_assessment_score: number | null;
  after_assessment_score: number | null;
  knowledge_enhancement_roi: number | null;
  trainer_evaluation_score: number | null;
  content_evaluation_score: number | null;
  general_evaluation_score: number | null;
  training_effectiveness_status: string | null;
  training_status: string | null;
  employee_level: string | null;
  created_at: string;
  updated_at: string;
};

export const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
export const PRIORITIES = ["High", "Medium", "Low"];
export const TRAINING_TYPES = ["Technical", "Behavioral", "Managerial", "HSE", "Compliance", "Soft Skills"];
export const DELIVERY_TYPES = ["Online", "Offline", "Hybrid", "On-Job"];
export const STATUS_LABELS: Record<string, string> = {
  new: "جديد",
  approved: "معتمد",
  rejected: "مرفوض",
  completed: "مكتمل",
};

/** TN sheet columns (manager input) — header text used in template + upload matching. */
export const TN_COLUMNS: { key: keyof TrainingNeed; header: string }[] = [
  { key: "sector", header: "Sector / القطاع" },
  { key: "department", header: "Department / الإدارة" },
  { key: "position_title", header: "Position / المسمى الوظيفي" },
  { key: "employee_code", header: "Employee Code / كود الموظف" },
  { key: "employee_name", header: "Employee Name / اسم الموظف" },
  { key: "training_topic", header: "Training Topic Required / الموضوع التدريبي المطلوب" },
  { key: "expected_kpi", header: "Expected KPI After Training / مؤشر الأداء بعد التدريب" },
  { key: "training_type", header: "Training Type / نوع التدريب" },
  { key: "training_objective", header: "Training Objective / هدف التدريب" },
  { key: "training_priority", header: "Training Priority / أولوية التنفيذ" },
  { key: "recommended_quarter_1", header: "Recommended Quarter Option(01) / التوقيت المقترح 1" },
  { key: "recommended_quarter_2", header: "Recommended Quarter Option(02) / التوقيت المقترح 2" },
  { key: "provider_recommendation", header: "Training Provider Recommendation / شركات تدريب مقترحة" },
  { key: "notes", header: "Notes / ملاحظات" },
];

/** TP report columns (OD) — full training plan sheet. */
export const TP_COLUMNS: { key: keyof TrainingNeed; header: string }[] = [
  { key: "employee_code", header: "Code" },
  { key: "employee_name", header: "Employee Name" },
  { key: "employee_title", header: "Title" },
  { key: "gender", header: "Gender" },
  { key: "employee_status", header: "Employee Status" },
  { key: "hiring_date", header: "Hiring Date" },
  { key: "internal_years_experience", header: "Internal Years of Experience" },
  { key: "company_id", header: "Company" },
  { key: "location", header: "Location" },
  { key: "sector", header: "Sector" },
  { key: "department", header: "Department" },
  { key: "training_topic", header: "Training Topics" },
  { key: "training_identification", header: "Training Identification" },
  { key: "training_type", header: "Training Type" },
  { key: "training_objective", header: "Training Objective" },
  { key: "expected_kpi", header: "Expected KPI" },
  { key: "training_priority", header: "Training Priority" },
  { key: "source", header: "Source" },
  { key: "training_provider", header: "Training Provider" },
  { key: "delivery_type", header: "Delivery type" },
  { key: "training_start_date", header: "Training starting date" },
  { key: "training_end_date", header: "Training ending date" },
  { key: "implementation_quarter", header: "Implementation Quarter" },
  { key: "implementation_month", header: "Implementation Month" },
  { key: "implementation_year", header: "Implementation Year" },
  { key: "training_days", header: "# of training days" },
  { key: "training_hours", header: "# of training Hours" },
  { key: "total_training_cost", header: "Total Training Cost" },
  { key: "attendance_status", header: "Attendence status" },
  { key: "reason_of_no_show", header: "Reason of no show" },
  { key: "pre_assessment_score", header: "Pre- Assessment Score" },
  { key: "after_assessment_score", header: "After- Assessment Score" },
  { key: "knowledge_enhancement_roi", header: "Knowledge Enhancment ROI" },
  { key: "trainer_evaluation_score", header: "Trainer Evaluation Score" },
  { key: "content_evaluation_score", header: "Content Evaluation Score" },
  { key: "general_evaluation_score", header: "General Evaluation Score" },
  { key: "training_effectiveness_status", header: "Trainig Effectivness Status" },
  { key: "training_status", header: "Training Status" },
  { key: "employee_level", header: "Employee Level" },
];

/** OD-editable fields with their input type. */
export const TP_EDIT_FIELDS: { key: keyof TrainingNeed; label: string; type: "text" | "number" | "date" }[] = [
  { key: "employee_title", label: "Title", type: "text" },
  { key: "gender", label: "Gender", type: "text" },
  { key: "employee_status", label: "Employee Status", type: "text" },
  { key: "hiring_date", label: "Hiring Date", type: "date" },
  { key: "internal_years_experience", label: "Internal Years of Experience", type: "number" },
  { key: "location", label: "Location", type: "text" },
  { key: "training_identification", label: "Training Identification", type: "text" },
  { key: "source", label: "Source", type: "text" },
  { key: "training_provider", label: "Training Provider", type: "text" },
  { key: "delivery_type", label: "Delivery type", type: "text" },
  { key: "training_start_date", label: "Training starting date", type: "date" },
  { key: "training_end_date", label: "Training ending date", type: "date" },
  { key: "implementation_quarter", label: "Implementation Quarter", type: "text" },
  { key: "implementation_month", label: "Implementation Month", type: "text" },
  { key: "implementation_year", label: "Implementation Year", type: "number" },
  { key: "training_days", label: "# of training days", type: "number" },
  { key: "training_hours", label: "# of training Hours", type: "number" },
  { key: "total_training_cost", label: "Total Training Cost", type: "number" },
  { key: "attendance_status", label: "Attendence status", type: "text" },
  { key: "reason_of_no_show", label: "Reason of no show", type: "text" },
  { key: "pre_assessment_score", label: "Pre- Assessment Score", type: "number" },
  { key: "after_assessment_score", label: "After- Assessment Score", type: "number" },
  { key: "knowledge_enhancement_roi", label: "Knowledge Enhancment ROI", type: "number" },
  { key: "trainer_evaluation_score", label: "Trainer Evaluation Score", type: "number" },
  { key: "content_evaluation_score", label: "Content Evaluation Score", type: "number" },
  { key: "general_evaluation_score", label: "General Evaluation Score", type: "number" },
  { key: "training_effectiveness_status", label: "Trainig Effectivness Status", type: "text" },
  { key: "training_status", label: "Training Status", type: "text" },
  { key: "employee_level", label: "Employee Level", type: "text" },
];

export const NUMBER_KEYS = new Set<string>(
  TP_EDIT_FIELDS.filter(f => f.type === "number").map(f => f.key as string),
);

export function normalizeHeader(h: string) {
  return h.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, "");
}

/** Map an uploaded sheet row (any header language) onto TN fields. */
export function mapSheetRow(row: Record<string, unknown>): Partial<TrainingNeed> {
  const out: Record<string, unknown> = {};
  const entries = Object.entries(row).map(([k, v]) => [normalizeHeader(k), v] as const);
  for (const col of TN_COLUMNS) {
    const targets = col.header.split("/").map(s => normalizeHeader(s));
    const hit = entries.find(([k]) => targets.some(t => t && (k === t || k.includes(t) || t.includes(k))));
    if (hit && hit[1] !== undefined && hit[1] !== null && String(hit[1]).trim() !== "") {
      out[col.key as string] = String(hit[1]).trim();
    }
  }
  return out as Partial<TrainingNeed>;
}

/** Map an uploaded full training-plan (TP) sheet row onto TrainingNeed fields. */
export function mapPlanSheetRow(row: Record<string, unknown>): Partial<TrainingNeed> {
  const out: Record<string, unknown> = {};
  const entries = Object.entries(row).map(([k, v]) => [normalizeHeader(k), v] as const);
  const cols = [...TP_COLUMNS, ...TN_COLUMNS].filter(c => c.key !== "company_id");
  for (const col of cols) {
    if (out[col.key as string] !== undefined) continue;
    const targets = col.header.split("/").map(s => normalizeHeader(s)).filter(Boolean);
    const hit = entries.find(([k]) => targets.some(t => k === t || k.includes(t) || t.includes(k)));
    if (!hit) continue;
    const raw = hit[1];
    if (raw === undefined || raw === null || String(raw).trim() === "") continue;
    const key = col.key as string;
    if (NUMBER_KEYS.has(key) || key === "implementation_year") {
      const n = Number(String(raw).replace(/[^0-9.\-]/g, ""));
      if (!Number.isNaN(n)) out[key] = n;
    } else if (key.endsWith("_date")) {
      out[key] = excelDate(raw);
    } else {
      out[key] = String(raw).trim();
    }
  }
  return out as Partial<TrainingNeed>;
}

function excelDate(v: unknown): string | null {
  if (typeof v === "number") {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}
