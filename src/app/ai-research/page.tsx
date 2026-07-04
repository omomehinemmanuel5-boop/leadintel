import { PageHeader } from "@/components/ui";
import { Sparkles, FileText, Target, MessageSquare, Wand2 } from "lucide-react";

const PLANNED = [
  {
    icon: FileText,
    title: "Company summaries",
    desc: "One-paragraph briefs generated from public filings and site content before you reach out.",
  },
  {
    icon: Target,
    title: "Lead scoring",
    desc: "Rank contacts by fit signals — company size, industry match, hiring activity.",
  },
  {
    icon: MessageSquare,
    title: "Search assistance",
    desc: "Describe a target company profile in plain language instead of picking countries by hand.",
  },
  {
    icon: Wand2,
    title: "Outreach drafting",
    desc: "First-draft emails grounded in what was actually discovered about each company — not generic templates.",
  },
];

export default function AIResearchPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <PageHeader
        eyebrow="Volume V · AI Systems"
        title="AI Research"
        description="Not wired up yet — this is the next foundation layer once Search Jobs, Companies, and Contacts have real data flowing through them."
      />

      <div className="glass rounded-2xl p-6 mb-6 flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--teal-dim)] to-[var(--violet-dim)] flex items-center justify-center shrink-0">
          <Sparkles size={20} className="text-[var(--violet)]" />
        </div>
        <div>
          <div className="font-semibold text-sm mb-1">Why this isn&apos;t built yet</div>
          <p className="text-xs text-[var(--ink-dim)] leading-relaxed">
            AI features are only as good as what they're grounded in. Company universe and name
            discovery are still partly demo data for three of four countries — wiring AI summaries on
            top of that now would mean confidently-worded output about companies that aren&apos;t real.
            Once the live connectors are in (see Integrations), this becomes the natural next layer.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {PLANNED.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="glass rounded-2xl p-5">
              <div className="w-9 h-9 rounded-lg bg-[var(--glass-strong)] flex items-center justify-center mb-3">
                <Icon size={16} className="text-[var(--teal)]" />
              </div>
              <div className="font-semibold text-sm mb-1">{item.title}</div>
              <p className="text-xs text-[var(--ink-dim)] leading-relaxed">{item.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
