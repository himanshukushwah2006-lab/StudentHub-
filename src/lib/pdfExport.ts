import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { computeStats, getGrade, type Branch, type Student } from "@/src/lib/students";

const MITS_LOGO_PATH =
  "/assets/aistudio/Madhav_Institute_of_Technology_and_Science_logo_f02501a3.png";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "ST";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) % 997;
  }
  return Math.abs(h);
}

const BADGE_PALETTE: [number, number, number][] = [
  [14, 165, 233],
  [99, 102, 241],
  [20, 184, 166],
  [245, 158, 11],
  [244, 63, 94],
];

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Center-crops any student photo into a crisp square JPEG data URL
 * so images never stretch or distort inside PDF table cells.
 */
async function prepareSquarePhotoDataUrl(src: string): Promise<string | null> {
  const img = await loadImage(src);
  if (!img || img.naturalWidth === 0 || img.naturalHeight === 0) return null;

  const size = 160;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  const minSide = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - minSide) / 2;
  const sy = (img.naturalHeight - minSide) / 2;

  ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

  try {
    return canvas.toDataURL("image/jpeg", 0.9);
  } catch {
    return null;
  }
}

async function prepareLogoDataUrl(): Promise<string | null> {
  const img = await loadImage(MITS_LOGO_PATH);
  if (!img || img.naturalWidth === 0 || img.naturalHeight === 0) return null;

  const size = 160;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const scale = Math.min(size / img.naturalWidth, size / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);

  try {
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

export async function exportStudentsPdf(students: Student[], label?: string): Promise<number> {
  if (students.length === 0) return 0;

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 12;

  // Preload MITS emblem and all student photos in parallel
  const [logoDataUrl, preparedPhotos] = await Promise.all([
    prepareLogoDataUrl(),
    Promise.all(
      students.map((s) => (s.photo ? prepareSquarePhotoDataUrl(s.photo) : Promise.resolve(null)))
    ),
  ]);

  const stats = computeStats(students);
  const scopeTitle = label ? `${label} Department` : "All Students";
  const generatedAt = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Top dark-navy official header banner
  doc.setFillColor(10, 20, 44);
  doc.roundedRect(marginX, 10, pageWidth - marginX * 2, 26, 3, 3, "F");

  // Subtle cyan accent stripe at bottom of banner
  doc.setFillColor(34, 211, 238);
  doc.rect(marginX, 34.8, pageWidth - marginX * 2, 1.2, "F");

  if (logoDataUrl) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(marginX + 4, 13.5, 18.5, 18.5, 2.5, 2.5, "F");
    doc.addImage(logoDataUrl, "PNG", marginX + 5.2, 14.7, 16.1, 16.1);
  }

  const textStartX = logoDataUrl ? marginX + 27 : marginX + 6;
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14.5);
  doc.text("Madhav Institute of Technology & Science, Gwalior", textStartX, 20.5);

  doc.setTextColor(165, 243, 252);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(`MITS StudentHub  |  Official Student Directory Report (${scopeTitle})`, textStartX, 27.5);

  // Right-aligned metadata inside header
  doc.setTextColor(226, 232, 240);
  doc.setFontSize(8.5);
  doc.text(`Generated: ${generatedAt}`, pageWidth - marginX - 5, 20.5, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setTextColor(56, 189, 248);
  doc.text(`${students.length} ${students.length === 1 ? "Student" : "Students"} Included`, pageWidth - marginX - 5, 27.5, {
    align: "right",
  });

  // Summary metrics bar
  const metricsY = 40;
  const metricGap = 4;
  const cardWidth = (pageWidth - marginX * 2 - metricGap * 3) / 4;
  const metricCards = [
    { label: "Total Students", value: String(stats.total) },
    { label: "Active Enrolled", value: `${stats.active} / ${stats.total}` },
    { label: "Average Marks", value: `${stats.average} / 100` },
    { label: "Pass Rate", value: `${stats.passRate}%` },
  ];

  metricCards.forEach((m, i) => {
    const x = marginX + i * (cardWidth + metricGap);
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(x, metricsY, cardWidth, 13, 2, 2, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(m.label.toUpperCase(), x + 3.5, metricsY + 4.8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(m.value, x + 3.5, metricsY + 10.6);
  });

  // Table rows
  const tableBody = students.map((s) => [
    "", // Photo column drawn custom in didDrawCell
    s.roll,
    s.name,
    `${s.branch} - Y${s.year}`,
    `${s.marks} / 100`,
    getGrade(s.marks),
    s.status === "active" ? "Active" : "Inactive",
    s.email || "-",
    s.phone || "-",
  ]);

  autoTable(doc, {
    startY: 57,
    margin: { left: marginX, right: marginX, bottom: 14 },
    head: [
      [
        "Photo",
        "Roll No",
        "Student Name",
        "Department",
        "Marks",
        "Grade",
        "Status",
        "Email",
        "Phone",
      ],
    ],
    body: tableBody,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      cellPadding: { top: 2.8, right: 3, bottom: 2.8, left: 3 },
      valign: "middle",
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.25,
      minCellHeight: 16.5,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [248, 250, 252],
      fontStyle: "bold",
      fontSize: 8.5,
      minCellHeight: 9.5,
      halign: "left",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 18, halign: "center" },
      1: { cellWidth: 30, fontStyle: "bold" },
      2: { cellWidth: 42, fontStyle: "bold" },
      3: { cellWidth: 27 },
      4: { cellWidth: 21, halign: "center" },
      5: { cellWidth: 15, halign: "center", fontStyle: "bold" },
      6: { cellWidth: 19, halign: "center", fontStyle: "bold" },
      7: { cellWidth: 62 },
      8: { cellWidth: 39 },
    },
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 6) {
        const val = String(data.cell.raw ?? "");
        if (val === "Active") {
          data.cell.styles.textColor = [5, 150, 105];
        } else {
          data.cell.styles.textColor = [100, 116, 139];
        }
      }
      if (data.section === "body" && data.column.index === 5) {
        const grade = String(data.cell.raw ?? "");
        if (grade === "A+" || grade === "A") {
          data.cell.styles.textColor = [2, 132, 199];
        } else if (grade === "F") {
          data.cell.styles.textColor = [220, 38, 38];
        }
      }
    },
    didDrawCell(data) {
      if (data.section !== "body" || data.column.index !== 0) return;
      const student = students[data.row.index];
      if (!student) return;

      const photoSize = 12.5;
      const imgX = data.cell.x + (data.cell.width - photoSize) / 2;
      const imgY = data.cell.y + (data.cell.height - photoSize) / 2;
      const photoUrl = preparedPhotos[data.row.index];

      if (photoUrl) {
        doc.addImage(photoUrl, "JPEG", imgX, imgY, photoSize, photoSize);
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.25);
        doc.rect(imgX, imgY, photoSize, photoSize, "S");
      } else {
        const [r, g, b] = BADGE_PALETTE[hashName(student.name) % BADGE_PALETTE.length];
        doc.setFillColor(r, g, b);
        doc.roundedRect(imgX, imgY, photoSize, photoSize, 2, 2, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);
        doc.text(
          getInitials(student.name),
          imgX + photoSize / 2,
          imgY + photoSize / 2 + 1,
          { align: "center", baseline: "middle" }
        );
      }
    },
  });

  // Add consistent page footer with page numbers on every page
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.25);
    doc.line(marginX, pageHeight - 10, pageWidth - marginX, pageHeight - 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      "MITS StudentHub  |  Madhav Institute of Technology & Science, Gwalior",
      marginX,
      pageHeight - 6
    );
    doc.text(`Page ${page} of ${totalPages}`, pageWidth - marginX, pageHeight - 6, {
      align: "right",
    });
  }

  const slug = label
    ? `-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`
    : "";
  const filename = `mits-studenthub${slug}-${new Date().toISOString().slice(0, 10)}.pdf`;

  doc.save(filename);
  return students.length;
}

export async function exportDepartmentPdf(
  students: Student[],
  branch: Branch | "ALL"
): Promise<number> {
  const subset = branch === "ALL" ? students : students.filter((s) => s.branch === branch);
  if (subset.length === 0) return 0;
  return exportStudentsPdf(subset, branch === "ALL" ? "All Departments" : branch);
}
