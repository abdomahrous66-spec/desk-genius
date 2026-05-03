import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, BorderStyle, ShadingType, PageOrientation,
} from "docx";
import { saveAs } from "file-saver";

export interface JDData {
  position_title: string;
  sector: string;
  reporting_to: string;
  department: string;
  location: string;
  no_of_direct_reports: string;
  last_update: string;
  no_of_total_subordinate: string;
  version_number: string;
  type_of_employment: string;
  main_job_purpose: string;
  reporting_structure?: string;
  kpis?: { kpi: string; measurement: string; target: string }[];
  key_result_areas: { area: string; responsibilities: string[]; kras: string[] }[];
  internal_communication: string[];
  external_communication: string[];
  work_environment: {
    indoor: string; outdoor: string; working_hazards: string;
    working_days: string; days_off: string; working_hours: string;
  };
  reports: { report_name: string; frequency: string; report_purpose: string; presented_to: string }[];
  position_dimensions: {
    level_of_authority: string[];
    financial_control: string[];
    annual_amount: string[];
    hiring_promotion_authority: string[];
  };
  qualifications: {
    education: string[]; experience: string[]; computer_skills: string[];
    language_skills: string[]; competency: string[];
  };
}

const HEADER_FILL = "1F4E79";
const SUB_FILL = "D9E2F3";
const BORDER = { style: BorderStyle.SINGLE, size: 4, color: "999999" };
const cellBorders = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

const txt = (s: string, opts: { bold?: boolean; color?: string; size?: number } = {}) =>
  new TextRun({ text: s || "", bold: opts.bold, color: opts.color, size: opts.size, font: "Calibri" });

const para = (children: TextRun[], align?: typeof AlignmentType[keyof typeof AlignmentType]) =>
  new Paragraph({ children, alignment: align });

const cell = (
  content: Paragraph[] | string,
  opts: { bold?: boolean; fill?: string; color?: string; width?: number; colSpan?: number } = {}
) => {
  const paragraphs = typeof content === "string"
    ? [para([txt(content, { bold: opts.bold, color: opts.color })])]
    : content;
  return new TableCell({
    borders: cellBorders,
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    columnSpan: opts.colSpan,
    children: paragraphs,
  });
};

const sectionHeader = (title: string, colSpan: number, totalWidth: number) =>
  new TableRow({
    children: [cell(title, { bold: true, fill: HEADER_FILL, color: "FFFFFF", colSpan, width: totalWidth })],
  });

const bulletParas = (items: string[]) =>
  (items.length ? items : [""]).map(
    (i) => new Paragraph({ children: [txt(`• ${i}`)], spacing: { after: 60 } })
  );

const TOTAL = 9360;

export async function generateJDDocx(data: JDData) {
  const children: (Paragraph | Table)[] = [];

  // Title
  children.push(new Paragraph({
    children: [txt("Job Profile", { bold: true, size: 32, color: "FFFFFF" })],
    alignment: AlignmentType.CENTER,
    shading: { fill: HEADER_FILL, type: ShadingType.CLEAR, color: "auto" },
    spacing: { after: 200 },
  }));

  // Identification table (4 columns)
  const idRows = [
    ["Position Title", data.position_title, "Sector", data.sector],
    ["Reporting to (Title)", data.reporting_to, "Department", data.department],
    ["Location", data.location, "No. of Direct Reports", data.no_of_direct_reports],
    ["Last Update", data.last_update, "No. of Total Subordinate", data.no_of_total_subordinate],
    ["Version Number", data.version_number, "Type of Employment", data.type_of_employment],
  ];
  const colW = [2340, 2340, 2340, 2340];
  children.push(new Table({
    width: { size: TOTAL, type: WidthType.DXA },
    columnWidths: colW,
    rows: idRows.map(r => new TableRow({
      children: [
        cell(r[0], { bold: true, fill: SUB_FILL, width: colW[0] }),
        cell(r[1], { width: colW[1] }),
        cell(r[2], { bold: true, fill: SUB_FILL, width: colW[2] }),
        cell(r[3], { width: colW[3] }),
      ],
    })),
  }));
  children.push(new Paragraph({ text: "" }));

  // Main Job Purpose
  children.push(new Table({
    width: { size: TOTAL, type: WidthType.DXA },
    columnWidths: [TOTAL],
    rows: [
      sectionHeader("Main Job Purpose", 1, TOTAL),
      new TableRow({ children: [cell(data.main_job_purpose, { width: TOTAL })] }),
    ],
  }));
  children.push(new Paragraph({ text: "" }));

  // Key Result Areas
  const kraRows: TableRow[] = [sectionHeader("Key Result Areas & Accountabilities", 1, TOTAL)];
  data.key_result_areas.forEach((kra) => {
    kraRows.push(new TableRow({
      children: [cell(kra.area, { bold: true, fill: SUB_FILL, width: TOTAL })],
    }));
    const inner: Paragraph[] = [
      new Paragraph({ children: [txt("Responsibilities:", { bold: true })], spacing: { after: 80 } }),
      ...bulletParas(kra.responsibilities),
      new Paragraph({ children: [txt("KRAs:", { bold: true })], spacing: { before: 120, after: 80 } }),
      ...bulletParas(kra.kras),
    ];
    kraRows.push(new TableRow({ children: [cell(inner, { width: TOTAL })] }));
  });
  children.push(new Table({ width: { size: TOTAL, type: WidthType.DXA }, columnWidths: [TOTAL], rows: kraRows }));
  children.push(new Paragraph({ text: "" }));

  // KPIs (only if manager provided)
  if (data.kpis && data.kpis.length > 0) {
    const kpiColW = [4680, 2340, 2340];
    children.push(new Table({
      width: { size: TOTAL, type: WidthType.DXA },
      columnWidths: kpiColW,
      rows: [
        sectionHeader("Key Performance Indicators (KPIs)", 3, TOTAL),
        new TableRow({
          children: [
            cell("KPI", { bold: true, fill: SUB_FILL, width: kpiColW[0] }),
            cell("Measurement", { bold: true, fill: SUB_FILL, width: kpiColW[1] }),
            cell("Target", { bold: true, fill: SUB_FILL, width: kpiColW[2] }),
          ],
        }),
        ...data.kpis.map(k => new TableRow({
          children: [
            cell(k.kpi, { width: kpiColW[0] }),
            cell(k.measurement, { width: kpiColW[1] }),
            cell(k.target, { width: kpiColW[2] }),
          ],
        })),
      ],
    }));
    children.push(new Paragraph({ text: "" }));
  }

  // Position Relationship
  children.push(new Table({
    width: { size: TOTAL, type: WidthType.DXA },
    columnWidths: [TOTAL],
    rows: [
      sectionHeader("Position Relationship", 1, TOTAL),
      new TableRow({ children: [cell("Internal Communication", { bold: true, fill: SUB_FILL, width: TOTAL })] }),
      new TableRow({ children: [cell(bulletParas(data.internal_communication), { width: TOTAL })] }),
      new TableRow({ children: [cell("External Communication", { bold: true, fill: SUB_FILL, width: TOTAL })] }),
      new TableRow({ children: [cell(bulletParas(data.external_communication), { width: TOTAL })] }),
    ],
  }));
  children.push(new Paragraph({ text: "" }));

  // Position Reporting Line (Structure) — only if provided
  if (data.reporting_structure && data.reporting_structure.trim()) {
    const structureLines = data.reporting_structure.split("\n").map(l => l.trim()).filter(Boolean);
    children.push(new Table({
      width: { size: TOTAL, type: WidthType.DXA },
      columnWidths: [TOTAL],
      rows: [
        sectionHeader("Position Reporting Line (Structure)", 1, TOTAL),
        new TableRow({
          children: [cell(
            structureLines.map(l => new Paragraph({ children: [txt(l)], spacing: { after: 60 } })),
            { width: TOTAL }
          )],
        }),
      ],
    }));
    children.push(new Paragraph({ text: "" }));
  }
  const we = data.work_environment;
  const weRows = [
    ["Indoor", we.indoor], ["Outdoor", we.outdoor], ["Working Hazards", we.working_hazards],
    ["Working Days", we.working_days], ["Days off", we.days_off], ["Working Hours", we.working_hours],
  ];
  children.push(new Table({
    width: { size: TOTAL, type: WidthType.DXA },
    columnWidths: [3120, 6240],
    rows: [
      sectionHeader("Work Environment", 2, TOTAL),
      ...weRows.map(r => new TableRow({
        children: [
          cell(r[0], { bold: true, fill: SUB_FILL, width: 3120 }),
          cell(r[1], { width: 6240 }),
        ],
      })),
    ],
  }));
  children.push(new Paragraph({ text: "" }));

  // Reports
  const repColW = [2340, 1560, 3900, 1560];
  const repRows: TableRow[] = [
    sectionHeader("Reports", 4, TOTAL),
    new TableRow({
      children: [
        cell("Report Name", { bold: true, fill: SUB_FILL, width: repColW[0] }),
        cell("Frequency", { bold: true, fill: SUB_FILL, width: repColW[1] }),
        cell("Report Purpose", { bold: true, fill: SUB_FILL, width: repColW[2] }),
        cell("Presented to", { bold: true, fill: SUB_FILL, width: repColW[3] }),
      ],
    }),
    ...data.reports.map(r => new TableRow({
      children: [
        cell(r.report_name, { width: repColW[0] }),
        cell(r.frequency, { width: repColW[1] }),
        cell(r.report_purpose, { width: repColW[2] }),
        cell(r.presented_to, { width: repColW[3] }),
      ],
    })),
  ];
  children.push(new Table({ width: { size: TOTAL, type: WidthType.DXA }, columnWidths: repColW, rows: repRows }));
  children.push(new Paragraph({ text: "" }));

  // Position Dimensions
  const pd = data.position_dimensions;
  const pdRows = [
    ["Level of Authority", pd.level_of_authority],
    ["Financial Control", pd.financial_control],
    ["Annual Amount", pd.annual_amount],
    ["Hiring & Promotion Authority", pd.hiring_promotion_authority],
  ] as const;
  children.push(new Table({
    width: { size: TOTAL, type: WidthType.DXA },
    columnWidths: [3120, 6240],
    rows: [
      sectionHeader("Position Dimensions", 2, TOTAL),
      ...pdRows.map(([k, v]) => new TableRow({
        children: [
          cell(k, { bold: true, fill: SUB_FILL, width: 3120 }),
          cell(bulletParas(v), { width: 6240 }),
        ],
      })),
    ],
  }));
  children.push(new Paragraph({ text: "" }));

  // Qualifications
  const q = data.qualifications;
  const qRows = [
    ["Education", q.education], ["Experience", q.experience], ["Computer Skills", q.computer_skills],
    ["Language Skills", q.language_skills], ["Competency", q.competency],
  ] as const;
  children.push(new Table({
    width: { size: TOTAL, type: WidthType.DXA },
    columnWidths: [3120, 6240],
    rows: [
      sectionHeader("Qualifications", 2, TOTAL),
      ...qRows.map(([k, v]) => new TableRow({
        children: [
          cell(k, { bold: true, fill: SUB_FILL, width: 3120 }),
          cell(bulletParas(v), { width: 6240 }),
        ],
      })),
    ],
  }));

  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840, orientation: PageOrientation.PORTRAIT },
          margin: { top: 1080, bottom: 1080, left: 1440, right: 1440 },
        },
      },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const filename = `JD-${data.position_title.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-")}.docx`;
  saveAs(blob, filename);
}
