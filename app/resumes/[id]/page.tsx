"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Education = {
  degree?: string;
  college?: string;
  startYear?: string;
  endYear?: string;
  cgpa?: string;
};

type Project = {
  name?: string;
  description?: string;
  technologies?: string;
};

type Experience = {
  company?: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
};

type Certification = {
  name?: string;
  issuer?: string;
  year?: string;
};

type Resume = {
  id: string;
  title: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin: string | null;
  github: string | null;
  summary: string | null;
  skills: string[] | null;
  education: Education[] | null;
  projects: Project[] | null;
  experience: Experience[] | null;
  certifications: Certification[] | null;
};

type ExportType = "pdf" | "docx" | null;

function safeFileName(value: string) {
  const cleaned = value
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return cleaned || "resume";
}

function normalizeLines(value?: string | null) {
  if (!value) return [];

  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function ResumePreviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const supabase = useMemo(() => createClient(), []);

  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState<ExportType>(null);
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    const loadResume = async () => {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("resumes")
        .select("*")
        .eq("id", params.id)
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        console.error(error);
        setError("Resume not found.");
        setLoading(false);
        return;
      }

      setResume(data);
      setLoading(false);
    };

    loadResume();
  }, [params.id, router, supabase]);

  const downloadPdf = async () => {
    if (!resume || exporting) return;

    setExporting("pdf");
    setExportError("");

    try {
      const { jsPDF } = await import("jspdf");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const marginX = 48;
      const marginTop = 48;
      const marginBottom = 48;
      const contentWidth = pageWidth - marginX * 2;

      let y = marginTop;

      const ensureSpace = (neededHeight: number) => {
        if (y + neededHeight > pageHeight - marginBottom) {
          pdf.addPage();
          y = marginTop;
        }
      };

      const addWrappedText = (
        text: string,
        options?: {
          fontSize?: number;
          bold?: boolean;
          color?: [number, number, number];
          lineHeight?: number;
          indent?: number;
          after?: number;
          align?: "left" | "center";
        }
      ) => {
        const fontSize = options?.fontSize ?? 10.5;
        const lineHeight = options?.lineHeight ?? fontSize * 1.38;
        const indent = options?.indent ?? 0;
        const after = options?.after ?? 4;
        const align = options?.align ?? "left";

        pdf.setFont("helvetica", options?.bold ? "bold" : "normal");
        pdf.setFontSize(fontSize);

        if (options?.color) {
          pdf.setTextColor(...options.color);
        } else {
          pdf.setTextColor(15, 23, 42);
        }

        const availableWidth =
          align === "center" ? contentWidth : contentWidth - indent;

        const lines = pdf.splitTextToSize(text || "", availableWidth) as string[];
        const blockHeight = Math.max(lines.length, 1) * lineHeight + after;

        ensureSpace(blockHeight);

        if (align === "center") {
          lines.forEach((line) => {
            pdf.text(line, pageWidth / 2, y, { align: "center" });
            y += lineHeight;
          });
        } else {
          lines.forEach((line) => {
            pdf.text(line, marginX + indent, y);
            y += lineHeight;
          });
        }

        y += after;
      };

      const addSectionTitle = (title: string) => {
        ensureSpace(30);

        if (y > marginTop) {
          y += 8;
        }

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(15, 23, 42);
        pdf.text(title.toUpperCase(), marginX, y);

        y += 5;

        pdf.setDrawColor(203, 213, 225);
        pdf.setLineWidth(0.8);
        pdf.line(marginX, y, pageWidth - marginX, y);

        y += 14;
      };

      const addDescription = (description?: string) => {
        const lines = normalizeLines(description);

        lines.forEach((line) => {
          const cleaned = line.replace(/^[-•*]\s*/, "");
          addWrappedText(`- ${cleaned}`, {
            fontSize: 10.2,
            indent: 10,
            after: 2,
          });
        });
      };

      addWrappedText(resume.full_name || "Your Name", {
        fontSize: 20,
        bold: true,
        lineHeight: 24,
        after: 5,
        align: "center",
      });

      const contact = [
        resume.email,
        resume.phone,
        resume.location,
      ].filter(Boolean) as string[];

      if (contact.length > 0) {
        addWrappedText(contact.join(" | "), {
          fontSize: 9.5,
          color: [71, 85, 105],
          lineHeight: 12,
          after: 2,
          align: "center",
        });
      }

      const links = [
        resume.linkedin,
        resume.github,
      ].filter(Boolean) as string[];

      if (links.length > 0) {
        addWrappedText(links.join(" | "), {
          fontSize: 9.2,
          color: [51, 65, 85],
          lineHeight: 12,
          after: 6,
          align: "center",
        });
      }

      pdf.setDrawColor(203, 213, 225);
      pdf.setLineWidth(0.8);
      pdf.line(marginX, y, pageWidth - marginX, y);
      y += 8;

      if (resume.summary) {
        addSectionTitle("Professional Summary");
        addWrappedText(resume.summary, {
          fontSize: 10.3,
          lineHeight: 14,
          after: 2,
        });
      }

      if (resume.skills && resume.skills.length > 0) {
        addSectionTitle("Skills");
        addWrappedText(resume.skills.join(" | "), {
          fontSize: 10.2,
          lineHeight: 14,
          after: 2,
        });
      }

      const education = (resume.education || []).filter(
        (item) => item.degree || item.college
      );

      if (education.length > 0) {
        addSectionTitle("Education");

        education.forEach((item) => {
          const dateRange = [item.startYear, item.endYear]
            .filter(Boolean)
            .join(" - ");

          const heading = [item.degree, item.college]
            .filter(Boolean)
            .join(" — ");

          if (heading) {
            addWrappedText(
              dateRange ? `${heading} | ${dateRange}` : heading,
              {
                fontSize: 10.4,
                bold: true,
                lineHeight: 14,
                after: 2,
              }
            );
          }

          if (item.cgpa) {
            addWrappedText(`CGPA: ${item.cgpa}`, {
              fontSize: 9.8,
              color: [71, 85, 105],
              lineHeight: 13,
              after: 5,
            });
          } else {
            y += 3;
          }
        });
      }

      const experience = (resume.experience || []).filter(
        (item) => item.company || item.role || item.description
      );

      if (experience.length > 0) {
        addSectionTitle("Experience");

        experience.forEach((item) => {
          const dateRange = [item.startDate, item.endDate]
            .filter(Boolean)
            .join(" - ");

          const heading = [item.role, item.company]
            .filter(Boolean)
            .join(" — ");

          if (heading) {
            addWrappedText(
              dateRange ? `${heading} | ${dateRange}` : heading,
              {
                fontSize: 10.4,
                bold: true,
                lineHeight: 14,
                after: 2,
              }
            );
          }

          if (item.description) {
            addDescription(item.description);
          }

          y += 4;
        });
      }

      const projects = (resume.projects || []).filter(
        (item) => item.name || item.description
      );

      if (projects.length > 0) {
        addSectionTitle("Projects");

        projects.forEach((item) => {
          if (item.name) {
            addWrappedText(item.name, {
              fontSize: 10.4,
              bold: true,
              lineHeight: 14,
              after: 1,
            });
          }

          if (item.technologies) {
            addWrappedText(item.technologies, {
              fontSize: 9.7,
              bold: true,
              color: [71, 85, 105],
              lineHeight: 13,
              after: 2,
            });
          }

          if (item.description) {
            addDescription(item.description);
          }

          y += 4;
        });
      }

      const certifications = (resume.certifications || []).filter(
        (item) => item.name
      );

      if (certifications.length > 0) {
        addSectionTitle("Certifications");

        certifications.forEach((item) => {
          const mainText = [item.name, item.issuer]
            .filter(Boolean)
            .join(" — ");

          addWrappedText(
            item.year ? `${mainText} | ${item.year}` : mainText,
            {
              fontSize: 10.2,
              lineHeight: 14,
              after: 3,
            }
          );
        });
      }

      const fileName = safeFileName(
        resume.title || resume.full_name || "resume"
      );

      pdf.save(`${fileName}.pdf`);
    } catch (err) {
      console.error("PDF export error:", err);
      setExportError(
        "Unable to create the PDF. Please try again."
      );
    } finally {
      setExporting(null);
    }
  };

  const downloadDocx = async () => {
    if (!resume || exporting) return;

    setExporting("docx");
    setExportError("");

    try {
      const {
        AlignmentType,
        BorderStyle,
        Document,
        Packer,
        Paragraph,
        TextRun,
      } = await import("docx");

      const bodyText = (
        text: string,
        options?: {
          bold?: boolean;
          size?: number;
          color?: string;
          break?: number;
        }
      ) =>
        new TextRun({
          text,
          bold: options?.bold ?? false,
          size: options?.size ?? 21,
          color: options?.color ?? "0F172A",
          font: "Arial",
          break: options?.break,
        });

      const sectionTitle = (title: string) =>
        new Paragraph({
          spacing: {
            before: 220,
            after: 100,
          },
          border: {
            bottom: {
              color: "CBD5E1",
              size: 6,
              style: BorderStyle.SINGLE,
            },
          },
          children: [
            bodyText(title.toUpperCase(), {
              bold: true,
              size: 22,
            }),
          ],
        });

      const children = [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: {
            after: 70,
          },
          children: [
            bodyText(resume.full_name || "Your Name", {
              bold: true,
              size: 34,
            }),
          ],
        }),
      ];

      const contact = [
        resume.email,
        resume.phone,
        resume.location,
      ].filter(Boolean) as string[];

      if (contact.length > 0) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: {
              after: 40,
            },
            children: [
              bodyText(contact.join(" | "), {
                size: 19,
                color: "475569",
              }),
            ],
          })
        );
      }

      const links = [
        resume.linkedin,
        resume.github,
      ].filter(Boolean) as string[];

      if (links.length > 0) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: {
              after: 120,
            },
            children: [
              bodyText(links.join(" | "), {
                size: 18,
                color: "334155",
              }),
            ],
          })
        );
      }

      if (resume.summary) {
        children.push(sectionTitle("Professional Summary"));

        children.push(
          new Paragraph({
            spacing: {
              after: 90,
              line: 276,
            },
            children: [
              bodyText(resume.summary),
            ],
          })
        );
      }

      if (resume.skills && resume.skills.length > 0) {
        children.push(sectionTitle("Skills"));

        children.push(
          new Paragraph({
            spacing: {
              after: 90,
              line: 276,
            },
            children: [
              bodyText(resume.skills.join(" • ")),
            ],
          })
        );
      }

      const education = (resume.education || []).filter(
        (item) => item.degree || item.college
      );

      if (education.length > 0) {
        children.push(sectionTitle("Education"));

        education.forEach((item) => {
          const dateRange = [item.startYear, item.endYear]
            .filter(Boolean)
            .join(" - ");

          const heading = [item.degree, item.college]
            .filter(Boolean)
            .join(" — ");

          children.push(
            new Paragraph({
              spacing: {
                after: 40,
              },
              children: [
                bodyText(
                  dateRange ? `${heading} | ${dateRange}` : heading,
                  {
                    bold: true,
                  }
                ),
              ],
            })
          );

          if (item.cgpa) {
            children.push(
              new Paragraph({
                spacing: {
                  after: 90,
                },
                children: [
                  bodyText(`CGPA: ${item.cgpa}`, {
                    size: 19,
                    color: "475569",
                  }),
                ],
              })
            );
          }
        });
      }

      const experience = (resume.experience || []).filter(
        (item) => item.company || item.role || item.description
      );

      if (experience.length > 0) {
        children.push(sectionTitle("Experience"));

        experience.forEach((item) => {
          const dateRange = [item.startDate, item.endDate]
            .filter(Boolean)
            .join(" - ");

          const heading = [item.role, item.company]
            .filter(Boolean)
            .join(" — ");

          children.push(
            new Paragraph({
              spacing: {
                after: 40,
              },
              children: [
                bodyText(
                  dateRange ? `${heading} | ${dateRange}` : heading,
                  {
                    bold: true,
                  }
                ),
              ],
            })
          );

          normalizeLines(item.description).forEach((line) => {
            children.push(
              new Paragraph({
                bullet: {
                  level: 0,
                },
                spacing: {
                  after: 45,
                  line: 276,
                },
                children: [
                  bodyText(line.replace(/^[-•*]\s*/, "")),
                ],
              })
            );
          });
        });
      }

      const projects = (resume.projects || []).filter(
        (item) => item.name || item.description
      );

      if (projects.length > 0) {
        children.push(sectionTitle("Projects"));

        projects.forEach((item) => {
          if (item.name) {
            children.push(
              new Paragraph({
                spacing: {
                  after: 25,
                },
                children: [
                  bodyText(item.name, {
                    bold: true,
                  }),
                ],
              })
            );
          }

          if (item.technologies) {
            children.push(
              new Paragraph({
                spacing: {
                  after: 40,
                },
                children: [
                  bodyText(item.technologies, {
                    bold: true,
                    size: 19,
                    color: "475569",
                  }),
                ],
              })
            );
          }

          normalizeLines(item.description).forEach((line) => {
            children.push(
              new Paragraph({
                bullet: {
                  level: 0,
                },
                spacing: {
                  after: 45,
                  line: 276,
                },
                children: [
                  bodyText(line.replace(/^[-•*]\s*/, "")),
                ],
              })
            );
          });
        });
      }

      const certifications = (resume.certifications || []).filter(
        (item) => item.name
      );

      if (certifications.length > 0) {
        children.push(sectionTitle("Certifications"));

        certifications.forEach((item) => {
          const mainText = [item.name, item.issuer]
            .filter(Boolean)
            .join(" — ");

          children.push(
            new Paragraph({
              spacing: {
                after: 55,
              },
              children: [
                bodyText(
                  item.year ? `${mainText} | ${item.year}` : mainText
                ),
              ],
            })
          );
        });
      }

      const docxDocument = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: 720,
                  right: 720,
                  bottom: 720,
                  left: 720,
                },
              },
            },
            children,
          },
        ],
      });

      const blob = await Packer.toBlob(docxDocument);

      const url = URL.createObjectURL(blob);
      const anchor = documentObjectToAnchor(url);

      const fileName = safeFileName(
        resume.title || resume.full_name || "resume"
      );

      anchor.download = `${fileName}.docx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (err) {
      console.error("DOCX export error:", err);
      setExportError(
        "Unable to create the DOCX file. Please try again."
      );
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-400">Loading resume...</p>
      </main>
    );
  }

  if (error || !resume) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <p className="text-red-300">{error}</p>

          <button
            onClick={() => router.push("/resumes")}
            className="mt-5 text-indigo-400 hover:text-indigo-300"
          >
            ← Back to My Resumes
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10">
      <div className="mx-auto max-w-5xl">

        {/* TOP ACTIONS */}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 text-white">
          <button
            onClick={() => router.push("/resumes")}
            className="text-indigo-400 hover:text-indigo-300"
          >
            ← My Resumes
          </button>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() =>
                router.push(`/resumes/${resume.id}/edit`)
              }
              disabled={exporting !== null}
              className="rounded-lg border border-slate-700 px-4 py-2 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Edit
            </button>

            <button
              onClick={downloadDocx}
              disabled={exporting !== null}
              className="rounded-lg border border-emerald-700 bg-emerald-950/40 px-4 py-2 font-medium text-emerald-200 hover:bg-emerald-900/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exporting === "docx"
                ? "Creating DOCX..."
                : "Download DOCX"}
            </button>

            <button
              onClick={downloadPdf}
              disabled={exporting !== null}
              className="rounded-lg bg-indigo-600 px-4 py-2 font-medium hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exporting === "pdf"
                ? "Creating PDF..."
                : "Download PDF"}
            </button>
          </div>
        </div>

        {exportError && (
          <div className="mb-6 rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-200">
            {exportError}
          </div>
        )}

        <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-400">
          PDF and DOCX downloads are generated from your saved resume data so the exported text stays selectable and ATS-readable.
        </div>

        {/* RESUME */}

        <div className="mx-auto min-h-[1120px] max-w-[850px] bg-white px-12 py-12 text-slate-900 shadow-2xl">

          {/* HEADER */}

          <header className="border-b border-slate-300 pb-6 text-center">
            <h1 className="text-4xl font-bold">
              {resume.full_name || "Your Name"}
            </h1>

            <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-slate-600">
              {resume.email && <span>{resume.email}</span>}
              {resume.phone && <span>{resume.phone}</span>}
              {resume.location && <span>{resume.location}</span>}
            </div>

            <div className="mt-2 flex flex-wrap justify-center gap-4 text-sm text-slate-700">
              {resume.linkedin && (
                <span>{resume.linkedin}</span>
              )}

              {resume.github && (
                <span>{resume.github}</span>
              )}
            </div>
          </header>

          {/* SUMMARY */}

          {resume.summary && (
            <ResumeSection title="Professional Summary">
              <p className="leading-7">
                {resume.summary}
              </p>
            </ResumeSection>
          )}

          {/* SKILLS */}

          {resume.skills && resume.skills.length > 0 && (
            <ResumeSection title="Skills">
              <p className="leading-7">
                {resume.skills.join(" • ")}
              </p>
            </ResumeSection>
          )}

          {/* EDUCATION */}

          {resume.education &&
            resume.education.some(
              (item) => item.degree || item.college
            ) && (
              <ResumeSection title="Education">
                <div className="space-y-4">
                  {resume.education
                    .filter(
                      (item) =>
                        item.degree || item.college
                    )
                    .map((item, index) => (
                      <div key={index}>
                        <div className="flex justify-between gap-4">

                          <div>
                            <p className="font-semibold">
                              {item.degree}
                            </p>

                            <p>
                              {item.college}
                            </p>
                          </div>

                          <p className="text-sm text-slate-600">
                            {item.startYear}
                            {item.startYear || item.endYear
                              ? " - "
                              : ""}
                            {item.endYear}
                          </p>

                        </div>

                        {item.cgpa && (
                          <p className="mt-1 text-sm">
                            CGPA: {item.cgpa}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              </ResumeSection>
            )}

          {/* EXPERIENCE */}

          {resume.experience &&
            resume.experience.some(
              (item) =>
                item.company ||
                item.role ||
                item.description
            ) && (
              <ResumeSection title="Experience">
                <div className="space-y-5">

                  {resume.experience
                    .filter(
                      (item) =>
                        item.company ||
                        item.role ||
                        item.description
                    )
                    .map((item, index) => (
                      <div key={index}>

                        <div className="flex justify-between gap-4">
                          <div>
                            <p className="font-semibold">
                              {item.role}
                            </p>

                            <p>
                              {item.company}
                            </p>
                          </div>

                          <p className="text-sm text-slate-600">
                            {item.startDate}
                            {item.startDate || item.endDate
                              ? " - "
                              : ""}
                            {item.endDate}
                          </p>
                        </div>

                        {item.description && (
                          <p className="mt-2 whitespace-pre-line leading-6">
                            {item.description}
                          </p>
                        )}

                      </div>
                    ))}

                </div>
              </ResumeSection>
            )}

          {/* PROJECTS */}

          {resume.projects &&
            resume.projects.some(
              (item) =>
                item.name || item.description
            ) && (
              <ResumeSection title="Projects">

                <div className="space-y-5">

                  {resume.projects
                    .filter(
                      (item) =>
                        item.name || item.description
                    )
                    .map((item, index) => (
                      <div key={index}>

                        <p className="font-semibold">
                          {item.name}
                        </p>

                        {item.technologies && (
                          <p className="text-sm font-medium text-slate-600">
                            {item.technologies}
                          </p>
                        )}

                        {item.description && (
                          <p className="mt-1 whitespace-pre-line leading-6">
                            {item.description}
                          </p>
                        )}

                      </div>
                    ))}

                </div>
              </ResumeSection>
            )}

          {/* CERTIFICATIONS */}

          {resume.certifications &&
            resume.certifications.some(
              (item) => item.name
            ) && (
              <ResumeSection title="Certifications">

                <div className="space-y-2">

                  {resume.certifications
                    .filter(
                      (item) => item.name
                    )
                    .map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between gap-4"
                      >
                        <p>
                          <span className="font-semibold">
                            {item.name}
                          </span>

                          {item.issuer
                            ? ` — ${item.issuer}`
                            : ""}
                        </p>

                        {item.year && (
                          <p className="text-sm text-slate-600">
                            {item.year}
                          </p>
                        )}

                      </div>
                    ))}

                </div>
              </ResumeSection>
            )}

        </div>
      </div>
    </main>
  );
}

function documentObjectToAnchor(url: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  return anchor;
}

function ResumeSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-7">

      <h2 className="mb-3 border-b border-slate-300 pb-1 text-lg font-bold uppercase tracking-wide">
        {title}
      </h2>

      {children}

    </section>
  );
}