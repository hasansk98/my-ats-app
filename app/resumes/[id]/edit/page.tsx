"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Education = {
  degree: string;
  college: string;
  startYear: string;
  endYear: string;
  cgpa: string;
};

type Project = {
  name: string;
  description: string;
  technologies: string;
};

type Experience = {
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
};

type Certification = {
  name: string;
  issuer: string;
  year: string;
};

export default function EditResumePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [title, setTitle] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [github, setGithub] = useState("");

  const [summary, setSummary] = useState("");
  const [skillsText, setSkillsText] = useState("");

  const [education, setEducation] = useState<Education[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [experience, setExperience] = useState<Experience[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
        setError("Unable to load resume.");
        setLoading(false);
        return;
      }

      setTitle(data.title ?? "");

      setFullName(data.full_name ?? "");
      setEmail(data.email ?? "");
      setPhone(data.phone ?? "");
      setLocation(data.location ?? "");
      setLinkedin(data.linkedin ?? "");
      setGithub(data.github ?? "");

      setSummary(data.summary ?? "");
      setSkillsText((data.skills ?? []).join(", "));

      setEducation(
        Array.isArray(data.education) && data.education.length > 0
          ? data.education
          : [
              {
                degree: "",
                college: "",
                startYear: "",
                endYear: "",
                cgpa: "",
              },
            ]
      );

      setProjects(
        Array.isArray(data.projects) && data.projects.length > 0
          ? data.projects
          : [
              {
                name: "",
                description: "",
                technologies: "",
              },
            ]
      );

      setExperience(
        Array.isArray(data.experience) && data.experience.length > 0
          ? data.experience
          : [
              {
                company: "",
                role: "",
                startDate: "",
                endDate: "",
                description: "",
              },
            ]
      );

      setCertifications(
        Array.isArray(data.certifications) &&
          data.certifications.length > 0
          ? data.certifications
          : [
              {
                name: "",
                issuer: "",
                year: "",
              },
            ]
      );

      setLoading(false);
    };

    loadResume();
  }, [params.id, router, supabase]);

  const addEducation = () => {
    setEducation((current) => [
      ...current,
      {
        degree: "",
        college: "",
        startYear: "",
        endYear: "",
        cgpa: "",
      },
    ]);
  };

  const removeEducation = (index: number) => {
    setEducation((current) =>
      current.filter((_, i) => i !== index)
    );
  };

  const addProject = () => {
    setProjects((current) => [
      ...current,
      {
        name: "",
        description: "",
        technologies: "",
      },
    ]);
  };

  const removeProject = (index: number) => {
    setProjects((current) =>
      current.filter((_, i) => i !== index)
    );
  };

  const addExperience = () => {
    setExperience((current) => [
      ...current,
      {
        company: "",
        role: "",
        startDate: "",
        endDate: "",
        description: "",
      },
    ]);
  };

  const removeExperience = (index: number) => {
    setExperience((current) =>
      current.filter((_, i) => i !== index)
    );
  };

  const addCertification = () => {
    setCertifications((current) => [
      ...current,
      {
        name: "",
        issuer: "",
        year: "",
      },
    ]);
  };

  const removeCertification = (index: number) => {
    setCertifications((current) =>
      current.filter((_, i) => i !== index)
    );
  };

  const updateResume = async (e: React.FormEvent) => {
    e.preventDefault();

    setSaving(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.push("/login");
      return;
    }

    const skills = skillsText
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);

    const cleanedEducation = education.filter(
      (item) =>
        item.degree ||
        item.college ||
        item.startYear ||
        item.endYear ||
        item.cgpa
    );

    const cleanedProjects = projects.filter(
      (item) =>
        item.name ||
        item.description ||
        item.technologies
    );

    const cleanedExperience = experience.filter(
      (item) =>
        item.company ||
        item.role ||
        item.startDate ||
        item.endDate ||
        item.description
    );

    const cleanedCertifications = certifications.filter(
      (item) =>
        item.name ||
        item.issuer ||
        item.year
    );

    const { error } = await supabase
      .from("resumes")
      .update({
        title,
        full_name: fullName,
        email,
        phone,
        location,
        linkedin,
        github,
        summary,
        skills,
        education: cleanedEducation,
        projects: cleanedProjects,
        experience: cleanedExperience,
        certifications: cleanedCertifications,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .eq("user_id", user.id);

    if (error) {
      console.error(error);
      setError(error.message);
      setSaving(false);
      return;
    }

    router.push(`/resumes/${params.id}`);
    router.refresh();
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-400">
          Loading resume...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">

        <button
          onClick={() =>
            router.push(`/resumes/${params.id}`)
          }
          className="text-sm font-medium text-indigo-400 hover:text-indigo-300"
        >
          ← Back to Resume Preview
        </button>

        <div className="mt-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-400">
            Resume Editor
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Edit Resume
          </h1>

          <p className="mt-2 text-slate-400">
            Update your resume information and save your changes.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-800 bg-red-950/40 p-4 text-red-300">
            {error}
          </div>
        )}

        <form
          onSubmit={updateResume}
          className="mt-8 space-y-8"
        >

          {/* RESUME TITLE */}

          <Section title="Resume Title">
            <Input
              label="Resume title"
              value={title}
              onChange={setTitle}
              placeholder="AI/ML Resume"
            />
          </Section>

          {/* PERSONAL INFORMATION */}

          <Section title="Personal Information">
            <div className="grid gap-5 md:grid-cols-2">

              <Input
                label="Full name"
                value={fullName}
                onChange={setFullName}
              />

              <Input
                label="Email"
                value={email}
                onChange={setEmail}
              />

              <Input
                label="Phone"
                value={phone}
                onChange={setPhone}
              />

              <Input
                label="Location"
                value={location}
                onChange={setLocation}
              />

              <Input
                label="LinkedIn"
                value={linkedin}
                onChange={setLinkedin}
              />

              <Input
                label="GitHub"
                value={github}
                onChange={setGithub}
              />

            </div>
          </Section>

          {/* SUMMARY */}

          <Section title="Professional Summary">
            <textarea
              value={summary}
              onChange={(e) =>
                setSummary(e.target.value)
              }
              rows={6}
              placeholder="Write your professional summary..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-indigo-500"
            />
          </Section>

          {/* SKILLS */}

          <Section title="Skills">

            <Input
              label="Skills"
              value={skillsText}
              onChange={setSkillsText}
              placeholder="Python, Machine Learning, SQL"
            />

            <p className="mt-2 text-sm text-slate-500">
              Separate skills using commas.
            </p>

          </Section>

          {/* EDUCATION */}

          <Section title="Education">

            {education.map((item, index) => (
              <ItemCard
                key={index}
                title={`Education ${index + 1}`}
                onRemove={
                  education.length > 1
                    ? () => removeEducation(index)
                    : undefined
                }
              >

                <div className="grid gap-4 md:grid-cols-2">

                  <Input
                    label="Degree"
                    value={item.degree}
                    onChange={(value) => {
                      const updated = [...education];
                      updated[index] = {
                        ...updated[index],
                        degree: value,
                      };
                      setEducation(updated);
                    }}
                  />

                  <Input
                    label="College / University"
                    value={item.college}
                    onChange={(value) => {
                      const updated = [...education];
                      updated[index] = {
                        ...updated[index],
                        college: value,
                      };
                      setEducation(updated);
                    }}
                  />

                  <Input
                    label="Start Year"
                    value={item.startYear}
                    onChange={(value) => {
                      const updated = [...education];
                      updated[index] = {
                        ...updated[index],
                        startYear: value,
                      };
                      setEducation(updated);
                    }}
                  />

                  <Input
                    label="End Year"
                    value={item.endYear}
                    onChange={(value) => {
                      const updated = [...education];
                      updated[index] = {
                        ...updated[index],
                        endYear: value,
                      };
                      setEducation(updated);
                    }}
                  />

                  <Input
                    label="CGPA"
                    value={item.cgpa}
                    onChange={(value) => {
                      const updated = [...education];
                      updated[index] = {
                        ...updated[index],
                        cgpa: value,
                      };
                      setEducation(updated);
                    }}
                  />

                </div>

              </ItemCard>
            ))}

            <AddButton onClick={addEducation}>
              + Add Education
            </AddButton>

          </Section>

          {/* PROJECTS */}

          <Section title="Projects">

            {projects.map((item, index) => (
              <ItemCard
                key={index}
                title={`Project ${index + 1}`}
                onRemove={
                  projects.length > 1
                    ? () => removeProject(index)
                    : undefined
                }
              >

                <div className="space-y-4">

                  <Input
                    label="Project name"
                    value={item.name}
                    onChange={(value) => {
                      const updated = [...projects];
                      updated[index] = {
                        ...updated[index],
                        name: value,
                      };
                      setProjects(updated);
                    }}
                  />

                  <Input
                    label="Technologies"
                    value={item.technologies}
                    onChange={(value) => {
                      const updated = [...projects];
                      updated[index] = {
                        ...updated[index],
                        technologies: value,
                      };
                      setProjects(updated);
                    }}
                    placeholder="Python, NLP, React"
                  />

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Project Description
                    </label>

                    <textarea
                      value={item.description}
                      onChange={(e) => {
                        const updated = [...projects];
                        updated[index] = {
                          ...updated[index],
                          description:
                            e.target.value,
                        };
                        setProjects(updated);
                      }}
                      rows={5}
                      placeholder="Describe what you built..."
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
                    />
                  </div>

                </div>

              </ItemCard>
            ))}

            <AddButton onClick={addProject}>
              + Add Project
            </AddButton>

          </Section>

          {/* EXPERIENCE */}

          <Section title="Experience">

            {experience.map((item, index) => (
              <ItemCard
                key={index}
                title={`Experience ${index + 1}`}
                onRemove={
                  experience.length > 1
                    ? () => removeExperience(index)
                    : undefined
                }
              >

                <div className="grid gap-4 md:grid-cols-2">

                  <Input
                    label="Company"
                    value={item.company}
                    onChange={(value) => {
                      const updated = [...experience];
                      updated[index] = {
                        ...updated[index],
                        company: value,
                      };
                      setExperience(updated);
                    }}
                  />

                  <Input
                    label="Role"
                    value={item.role}
                    onChange={(value) => {
                      const updated = [...experience];
                      updated[index] = {
                        ...updated[index],
                        role: value,
                      };
                      setExperience(updated);
                    }}
                  />

                  <Input
                    label="Start Date"
                    value={item.startDate}
                    onChange={(value) => {
                      const updated = [...experience];
                      updated[index] = {
                        ...updated[index],
                        startDate: value,
                      };
                      setExperience(updated);
                    }}
                  />

                  <Input
                    label="End Date"
                    value={item.endDate}
                    onChange={(value) => {
                      const updated = [...experience];
                      updated[index] = {
                        ...updated[index],
                        endDate: value,
                      };
                      setExperience(updated);
                    }}
                  />

                </div>

                <div className="mt-4">

                  <label className="mb-2 block text-sm font-medium">
                    Description
                  </label>

                  <textarea
                    value={item.description}
                    onChange={(e) => {
                      const updated = [...experience];
                      updated[index] = {
                        ...updated[index],
                        description: e.target.value,
                      };
                      setExperience(updated);
                    }}
                    rows={5}
                    placeholder="Describe your responsibilities and achievements..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-indigo-500"
                  />

                </div>

              </ItemCard>
            ))}

            <AddButton onClick={addExperience}>
              + Add Experience
            </AddButton>

          </Section>

          {/* CERTIFICATIONS */}

          <Section title="Certifications">

            {certifications.map((item, index) => (
              <ItemCard
                key={index}
                title={`Certification ${index + 1}`}
                onRemove={
                  certifications.length > 1
                    ? () =>
                        removeCertification(index)
                    : undefined
                }
              >

                <div className="grid gap-4 md:grid-cols-3">

                  <Input
                    label="Certification"
                    value={item.name}
                    onChange={(value) => {
                      const updated = [
                        ...certifications,
                      ];

                      updated[index] = {
                        ...updated[index],
                        name: value,
                      };

                      setCertifications(updated);
                    }}
                  />

                  <Input
                    label="Issuer"
                    value={item.issuer}
                    onChange={(value) => {
                      const updated = [
                        ...certifications,
                      ];

                      updated[index] = {
                        ...updated[index],
                        issuer: value,
                      };

                      setCertifications(updated);
                    }}
                  />

                  <Input
                    label="Year"
                    value={item.year}
                    onChange={(value) => {
                      const updated = [
                        ...certifications,
                      ];

                      updated[index] = {
                        ...updated[index],
                        year: value,
                      };

                      setCertifications(updated);
                    }}
                  />

                </div>

              </ItemCard>
            ))}

            <AddButton onClick={addCertification}>
              + Add Certification
            </AddButton>

          </Section>

          {/* SAVE */}

          <div className="flex flex-col gap-3 sm:flex-row">

            <button
              type="button"
              onClick={() =>
                router.push(`/resumes/${params.id}`)
              }
              className="flex-1 rounded-xl border border-slate-700 py-4 font-semibold hover:bg-slate-900"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-indigo-600 py-4 font-semibold transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving changes..."
                : "Save Changes"}
            </button>

          </div>

        </form>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

      <h2 className="mb-5 text-xl font-semibold">
        {title}
      </h2>

      {children}

    </section>
  );
}

function ItemCard({
  title,
  children,
  onRemove,
}: {
  title: string;
  children: React.ReactNode;
  onRemove?: () => void;
}) {
  return (
    <div className="mb-5 rounded-xl border border-slate-800 bg-slate-950/40 p-5">

      <div className="mb-5 flex items-center justify-between">

        <h3 className="font-semibold text-slate-200">
          {title}
        </h3>

        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-sm text-red-400 hover:text-red-300"
          >
            Remove
          </button>
        )}

      </div>

      {children}

    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>

      <label className="mb-2 block text-sm font-medium">
        {label}
      </label>

      <input
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-indigo-500"
      />

    </div>
  );
}

function AddButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300 transition hover:bg-indigo-500/20"
    >
      {children}
    </button>
  );
}