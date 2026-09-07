import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { FileText, LoaderCircle, ShieldCheck } from "lucide-react";
import { getPolicy } from "../data/storefrontData";
import type { PolicyContent } from "../types/storefront";

interface PolicyDocumentPageProps {
  type: string;
  title: string;
  subtitle: string;
  accent: "green" | "blue";
}

interface PolicyBlock {
  heading: string;
  paragraphs: string[];
}

const titleCase = (value: string) =>
  value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());

const normalizeHeading = (key: string) => {
  const normalizedKey = key.replace(/\d+$/g, "").trim().toLowerCase();
  if (!normalizedKey || normalizedKey === "section") return "Policy details";
  if (normalizedKey === "payments" || normalizedKey === "payment") return "Payments";
  return titleCase(normalizedKey);
};

const parsePolicyBlocks = (content: string): { blocks: PolicyBlock[] | null; html: string | null } => {
  const trimmed = content.trim();
  if (!trimmed) {
    return { blocks: [], html: null };
  }

  if (trimmed.startsWith("<")) {
    return { blocks: null, html: trimmed };
  }

  try {
    const parsed = JSON.parse(trimmed);

    if (typeof parsed === "string") {
      return {
        blocks: [{ heading: "Overview", paragraphs: [parsed] }],
        html: null,
      };
    }

    if (Array.isArray(parsed)) {
      return {
        blocks: parsed.map((value, index) => ({
          heading: `Section ${index + 1}`,
          paragraphs: [typeof value === "string" ? value : JSON.stringify(value)],
        })),
        html: null,
      };
    }

    if (parsed && typeof parsed === "object") {
      const groups = new Map<string, PolicyBlock>();

      Object.entries(parsed).forEach(([key, value]) => {
        const text =
          typeof value === "string"
            ? value
            : Array.isArray(value)
              ? value.join(" ")
              : JSON.stringify(value);

        if (!text) return;

        const groupKey = (key.match(/^[a-zA-Z_-]+/)?.[0] || key).toLowerCase();
        const existing = groups.get(groupKey) || {
          heading: normalizeHeading(groupKey),
          paragraphs: [],
        };

        existing.paragraphs.push(text);
        groups.set(groupKey, existing);
      });

      return {
        blocks: Array.from(groups.values()),
        html: null,
      };
    }
  } catch {
    return {
      blocks: trimmed.split(/\n\s*\n/).map((paragraph, index) => ({
        heading: index === 0 ? "Overview" : `Section ${index + 1}`,
        paragraphs: [paragraph.trim()],
      })),
      html: null,
    };
  }

  return { blocks: [{ heading: "Overview", paragraphs: [trimmed] }], html: null };
};

export function PolicyDocumentPage({ type, title, subtitle, accent }: PolicyDocumentPageProps) {
  const [policy, setPolicy] = useState<PolicyContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setError("");

    getPolicy(type)
      .then((nextPolicy) => {
        if (!isMounted) return;
        setPolicy(nextPolicy);
      })
      .catch((fetchError: any) => {
        if (!isMounted) return;
        setError(fetchError?.message || "Unable to load this document right now.");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [type]);

  const isGreen = accent === "green";
  const Icon = isGreen ? ShieldCheck : FileText;
  const renderedContent = useMemo(() => parsePolicyBlocks(policy?.content || ""), [policy?.content]);
  const updatedDate = policy?.updatedAt ? new Date(policy.updatedAt).toLocaleDateString("en-IN") : "";

  return (
    <div className="app-shell-narrow">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className={`overflow-hidden rounded-[2.3rem] border ${
          isGreen ? "border-[#D4A853]/30" : "border-[#1E5AFA]/20"
        } bg-[linear-gradient(135deg,#ffffff,rgba(248,250,253,0.95))] shadow-[0_30px_70px_rgba(10,22,40,0.08)]`}
      >
        <div
          className={`border-b px-6 py-7 sm:px-8 ${
            isGreen
              ? "border-[#D4A853]/20 bg-[radial-gradient(circle_at_top_left,rgba(212,168,83,0.25),transparent_45%),linear-gradient(140deg,#0A1628,#1A3358)] text-white"
              : "border-[#1E5AFA]/20 bg-[radial-gradient(circle_at_top_left,rgba(30,90,250,0.25),transparent_45%),linear-gradient(140deg,#142748,#1E5AFA)] text-white"
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <Icon className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-white/70">{subtitle}</p>
              <h1 className="page-title mt-2 text-white">{title}</h1>
              {updatedDate ? <p className="mt-3 text-sm text-white/75">Last updated on {updatedDate}</p> : null}
            </div>
          </div>
        </div>

        <div className="px-6 py-8 sm:px-8">
          {isLoading ? (
            <div className="flex min-h-[240px] items-center justify-center gap-3 text-[#6B7B94]">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Loading document...
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              {error}
            </div>
          ) : renderedContent.html ? (
            <article
              className="policy-document max-w-none"
              dangerouslySetInnerHTML={{ __html: renderedContent.html }}
            />
          ) : renderedContent.blocks && renderedContent.blocks.length > 0 ? (
            <div className="space-y-5">
              {renderedContent.blocks.map((block) => (
                <section
                  key={`${block.heading}-${block.paragraphs[0]}`}
                  className="rounded-[1.8rem] border border-[#E2E8F0] bg-white p-5 shadow-[0_10px_24px_rgba(10,22,40,0.04)]"
                >
                  <h2 className="font-sans font-bold text-2xl text-[#0A1628]">{block.heading}</h2>
                  <div className="mt-3 space-y-3">
                    {block.paragraphs.map((paragraph) => (
                      <p key={paragraph} className="text-sm leading-7 text-[#3A4D6B]">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-[#E2E8F0] bg-[#F8FAFD] px-5 py-4 text-sm text-[#6B7B94]">
              No document content available.
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
