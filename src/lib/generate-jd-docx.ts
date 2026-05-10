import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, WidthType, BorderStyle, ShadingType, PageOrientation,
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
  structure_boxes?: { manager: string; position: string; subordinates: string[] };
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
    language_skills: string[];
    core_competencies?: string[];
    functional_competencies?: string[];
    leadership_competencies?: string[];
    competency?: string[]; // legacy
  };
  hse_requirements?: string[];
}

const HEADER_FILL = "C0392B"; // Nahdet Misr red
const SUB_FILL = "FADBD8";
const BOX_FILL = "FDEDEC";
const BORDER = { style: BorderStyle.SINGLE, size: 4, color: "999999" };
const BOX_BORDER = { style: BorderStyle.SINGLE, size: 8, color: "C0392B" };
const cellBorders = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
const boxBorders = { top: BOX_BORDER, bottom: BOX_BORDER, left: BOX_BORDER, right: BOX_BORDER };

const txt = (s: string, opts: { bold?: boolean; color?: string; size?: number } = {}) =>
  new TextRun({ text: s || "", bold: opts.bold, color: opts.color, size: opts.size, font: "Calibri" });

const para = (children: TextRun[], align?: typeof AlignmentType[keyof typeof AlignmentType]) =>
  new Paragraph({ children, alignment: align });

const cell = (
  content: Paragraph[] | string,
  opts: { bold?: boolean; fill?: string; color?: string; width?: number; colSpan?: number; align?: typeof AlignmentType[keyof typeof AlignmentType]; borders?: typeof cellBorders } = {}
) => {
  const paragraphs = typeof content === "string"
    ? [para([txt(content, { bold: opts.bold, color: opts.color })], opts.align)]
    : content;
  return new TableCell({
    borders: opts.borders || cellBorders,
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

// Build the structure-boxes table: Manager (top) -> Position (middle) -> Subordinates row (bottom)
function buildStructureBoxes(sb: { manager: string; position: string; subordinates: string[] }) {
  const tables: Table[] = [];

  // Manager box (centered, single cell)
  tables.push(new Table({
    width: { size: TOTAL, type: WidthType.DXA },
    columnWidths: [TOTAL],
    rows: [new TableRow({
      children: [cell(
        [para([txt(sb.manager || "—", { bold: true, size: 22 })], AlignmentType.CENTER)],
        { fill: BOX_FILL, width: TOTAL, borders: boxBorders }
      )],
    })],
  }));
  // Connector "↓"
  tables.push(new Table({
    width: { size: TOTAL, type: WidthType.DXA },
    columnWidths: [TOTAL],
    rows: [new TableRow({
      children: [new TableCell({
        borders: { top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } },
        children: [para([txt("↓", { bold: true, size: 28, color: "C0392B" })], AlignmentType.CENTER)],
      })],
    })],
  }));
  // Position box (highlighted)
  tables.push(new Table({
    width: { size: TOTAL, type: WidthType.DXA },
    columnWidths: [TOTAL],
    rows: [new TableRow({
      children: [cell(
        [para([txt(sb.position, { bold: true, color: "FFFFFF", size: 24 })], AlignmentType.CENTER)],
        { fill: HEADER_FILL, width: TOTAL, borders: boxBorders }
      )],
    })],
  }));

  if (sb.subordinates && sb.subordinates.length > 0) {
    // Connector "↓"
    tables.push(new Table({
      width: { size: TOTAL, type: WidthType.DXA },
      columnWidths: [TOTAL],
      rows: [new TableRow({
        children: [new TableCell({
          borders: { top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } },
          children: [para([txt("↓", { bold: true, size: 28, color: "C0392B" })], AlignmentType.CENTER)],
        })],
      })],
    }));
    // Subordinates row (boxes side by side)
    const n = sb.subordinates.length;
    const colW = Math.floor(TOTAL / n);
    const widths = Array(n).fill(colW);
    tables.push(new Table({
      width: { size: TOTAL, type: WidthType.DXA },
      columnWidths: widths,
      rows: [new TableRow({
        children: sb.subordinates.map((sub, idx) => cell(
          [para([txt(sub, { bold: true, size: 18 })], AlignmentType.CENTER)],
          { fill: BOX_FILL, width: widths[idx], borders: boxBorders }
        )),
      })],
    }));
  }
  return tables;
}

export async function generateJDDocx(data: JDData) {
  const children: (Paragraph | Table)[] = [];

  // Branded title
  children.push(new Paragraph({
    children: [txt("Nahdet Misr Publishing Group", { bold: true, size: 22, color: "FFFFFF" })],
    alignment: AlignmentType.CENTER,
    shading: { fill: HEADER_FILL, type: ShadingType.CLEAR, color: "auto" },
    spacing: { after: 0 },
  }));
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

  // Position Reporting Line (Structure) — boxes
  if (data.structure_boxes && data.structure_boxes.position) {
    children.push(new Paragraph({
      children: [txt("Position Reporting Line (Structure)", { bold: true, color: "FFFFFF", size: 24 })],
      alignment: AlignmentType.CENTER,
      shading: { fill: HEADER_FILL, type: ShadingType.CLEAR, color: "auto" },
      spacing: { after: 200 },
    }));
    buildStructureBoxes(data.structure_boxes).forEach((t) => {
      children.push(t);
      children.push(new Paragraph({ text: "" }));
    });
  }

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

  // Work Environment
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

  // HSE is now merged into Key Result Areas as the last block (see analyze-job).

  // Qualifications + Competencies
  const q = data.qualifications;
  // Build competency cell content with three sub-headings
  const core = q.core_competencies || [];
  const func = q.functional_competencies || [];
  const lead = q.leadership_competencies || [];
  // Backward compat: if only legacy competency present, dump it under core
  const legacyOnly = !core.length && !func.length && !lead.length && q.competency && q.competency.length;
  const compParas: Paragraph[] = [];
  if (legacyOnly) {
    compParas.push(...bulletParas(q.competency!));
  } else {
    if (core.length) {
      compParas.push(new Paragraph({ children: [txt("Core Competencies:", { bold: true, color: "C0392B" })], spacing: { after: 60 } }));
      compParas.push(...bulletParas(core));
    }
    if (func.length) {
      compParas.push(new Paragraph({ children: [txt("Functional Competencies:", { bold: true, color: "C0392B" })], spacing: { before: 120, after: 60 } }));
      compParas.push(...bulletParas(func));
    }
    if (lead.length) {
      compParas.push(new Paragraph({ children: [txt("Leadership Competencies:", { bold: true, color: "C0392B" })], spacing: { before: 120, after: 60 } }));
      compParas.push(...bulletParas(lead));
    }
  }

  const qRows = [
    new TableRow({
      children: [
        cell("Education", { bold: true, fill: SUB_FILL, width: 3120 }),
        cell(bulletParas(q.education), { width: 6240 }),
      ],
    }),
    new TableRow({
      children: [
        cell("Experience", { bold: true, fill: SUB_FILL, width: 3120 }),
        cell(bulletParas(q.experience), { width: 6240 }),
      ],
    }),
    new TableRow({
      children: [
        cell("Computer Skills", { bold: true, fill: SUB_FILL, width: 3120 }),
        cell(bulletParas(q.computer_skills), { width: 6240 }),
      ],
    }),
    new TableRow({
      children: [
        cell("Language Skills", { bold: true, fill: SUB_FILL, width: 3120 }),
        cell(bulletParas(q.language_skills), { width: 6240 }),
      ],
    }),
    new TableRow({
      children: [
        cell("Competency", { bold: true, fill: SUB_FILL, width: 3120 }),
        cell(compParas.length ? compParas : [new Paragraph({ children: [txt("")] })], { width: 6240 }),
      ],
    }),
  ];
  children.push(new Table({
    width: { size: TOTAL, type: WidthType.DXA },
    columnWidths: [3120, 6240],
    rows: [
      sectionHeader("Job Requirement", 2, TOTAL),
      ...qRows,
    ],
  }));

  // Signatures
  const sigCell = (label: string) => new TableCell({
    width: { size: 4680, type: WidthType.DXA },
    margins: { top: 200, bottom: 200, left: 160, right: 160 },
    children: [
      new Paragraph({ children: [txt(label, { bold: true })], spacing: { after: 600 } }),
      new Paragraph({ children: [txt("Name: ____________________________")], spacing: { after: 120 } }),
      new Paragraph({ children: [txt("Signature: _______________________")], spacing: { after: 120 } }),
      new Paragraph({ children: [txt("Date: ____________________________")] }),
    ],
  });
  children.push(new Paragraph({ children: [txt("")], spacing: { before: 240 } }));
  children.push(new Table({
    width: { size: TOTAL, type: WidthType.DXA },
    columnWidths: [4680, 4680],
    rows: [
      new TableRow({ children: [
        new TableCell({ width: { size: 4680, type: WidthType.DXA }, children: [new Paragraph({ children: [txt("Employee", { bold: true, color: "FFFFFF" })] })], shading: { fill: HEADER_FILL, type: "clear" as never } }),
        new TableCell({ width: { size: 4680, type: WidthType.DXA }, children: [new Paragraph({ children: [txt("Direct Manager", { bold: true, color: "FFFFFF" })] })], shading: { fill: HEADER_FILL, type: "clear" as never } }),
      ] }),
      new TableRow({ children: [sigCell("Employee Acknowledgement"), sigCell("Manager Approval")] }),
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
