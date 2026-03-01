import { useState } from "react";

const SAMPLE_DISCUSSION = [
  {
    id: 1,
    author: "Dr. Sarah Chen",
    specialty: "Cardiology",
    time: "2h ago",
    text: "Seeing a 58yo male post-CABG with persistent AF. Currently on amiodarone 200mg daily. Considering rhythm vs rate control strategy. Any thoughts on long-term management given his EF of 35%?",
  },
  {
    id: 2,
    author: "Dr. James Okafor",
    specialty: "Electrophysiology",
    time: "1h 50m ago",
    text: "With EF 35%, rhythm control would be my preference. EAST-AFNET trial showed benefit in patients with HF. However, amiodarone toxicity is a real concern long-term. Have you considered ablation? Recent data from CASTLE-AF is compelling for HFrEF patients.",
  },
  {
    id: 3,
    author: "Dr. Priya Nair",
    specialty: "Internal Medicine",
    time: "1h 40m ago",
    text: "I'd second the ablation consideration. In my experience, catheter ablation has been superior to AAD therapy in maintaining sinus rhythm in post-CABG patients. What's the duration of AF? Paroxysmal or persistent?",
  },
  {
    id: 4,
    author: "Dr. Martin Reyes",
    specialty: "Cardiology",
    time: "1h 30m ago",
    text: "Don't overlook anticoagulation here. CHA2DS2-VASc score? With HF and post-CABG status, likely high risk. I'd ensure solid anticoagulation regardless of rhythm strategy.",
  },
  {
    id: 5,
    author: "Dr. Sarah Chen",
    specialty: "Cardiology",
    time: "1h 20m ago",
    text: "AF is persistent, ~6 months duration. CHA2DS2-VASc is 4. He's on apixaban. Good point on ablation - was hesitant given surgical complexity but CASTLE-AF data is convincing.",
  },
  {
    id: 6,
    author: "Dr. James Okafor",
    specialty: "Electrophysiology",
    time: "1h ago",
    text: "6 months persistent with EF 35% - ablation makes strong sense. I'd consider cardioversion first to assess reversibility of cardiomyopathy. If tachycardia-mediated component, restoring SR could improve EF significantly. Then plan for ablation if recurs.",
  },
  {
    id: 7,
    author: "Dr. Anita Voss",
    specialty: "Cardiac Surgery",
    time: "50m ago",
    text: "Surgical perspective: post-CABG anatomy matters for ablation access. Was the surgery recent? Adhesions could complicate catheter navigation. Worth imaging beforehand.",
  },
  {
    id: 8,
    author: "Dr. Priya Nair",
    specialty: "Internal Medicine",
    time: "40m ago",
    text: "Agree with cardioversion trial. Also worth checking thyroid function if not done recently - amiodarone can cause both hypo and hyperthyroidism, either of which would make AF harder to control.",
  },
  {
    id: 9,
    author: "Dr. Leon Hartmann",
    specialty: "Pharmacology",
    time: "30m ago",
    text: "On the amiodarone point - if you're already at 200mg and planning long-term, baseline PFTs, LFTs, and thyroid are essential. Annual follow-up on these. Pulmonary toxicity risk is dose-cumulative.",
  },
  {
    id: 10,
    author: "Dr. Martin Reyes",
    specialty: "Cardiology",
    time: "20m ago",
    text: "Summary from my end: anticoagulation secured ✓, EF warrants rhythm control strategy, cardioversion trial reasonable, ablation as definitive if needed, amiodarone monitoring essential if continuing.",
  },
];

const SYSTEM_PROMPT = `You are a medical discussion summarizer for busy physicians. Be extremely concise and clinically precise. 

For FULL DISCUSSION summaries, respond in this exact JSON format:
{
  "tldr": "One sentence clinical bottom line (max 20 words)",
  "consensus": ["Point 1", "Point 2", "Point 3"],
  "keyInsights": [{"author": "Dr. Name", "insight": "brief insight"}],
  "actionItems": ["Action 1", "Action 2"]
}

For SINGLE COMMENT summaries, respond in this exact JSON format:
{
  "summary": "2-3 sentence summary of this comment's clinical point",
  "keyPoint": "The single most important takeaway in one sentence"
}

Always respond with valid JSON only, no markdown.`;

export default function MedicalSummarizer() {
  const [comments, setComments] = useState(SAMPLE_DISCUSSION);
  const [newComment, setNewComment] = useState({ author: "", specialty: "", text: "" });
  const [summary, setSummary] = useState(null);
  const [commentSummaries, setCommentSummaries] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const [activeTab, setActiveTab] = useState("discussion");

  async function callClaude(userMessage) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "YOUR_API_KEY_HERE",
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });
    const data = await response.json();
    const text = data.content?.[0]?.text || "{}";
    try {
      return JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      return null;
    }
  }

  async function summarizeAll() {
    setLoading(true);
    const discussionText = comments
      .map((c) => `${c.author} (${c.specialty}): ${c.text}`)
      .join("\n\n");
    const result = await callClaude(
      `Summarize this medical discussion:\n\n${discussionText}`
    );
    setSummary(result);
    setActiveTab("summary");
    setLoading(false);
  }

  async function summarizeComment(comment) {
    if (commentSummaries[comment.id]) return;
    setLoadingId(comment.id);
    const result = await callClaude(
      `Summarize this single medical comment by ${comment.author} (${comment.specialty}):\n\n"${comment.text}"`
    );
    setCommentSummaries((prev) => ({ ...prev, [comment.id]: result }));
    setLoadingId(null);
  }

  function addComment() {
    if (!newComment.author || !newComment.text) return;
    setComments((prev) => [
      ...prev,
      {
        id: Date.now(),
        author: newComment.author,
        specialty: newComment.specialty || "Unknown",
        time: "Just now",
        text: newComment.text,
      },
    ]);
    setNewComment({ author: "", specialty: "", text: "" });
    setSummary(null);
  }

  const specialtyColor = (spec) => {
    const map = {
      Cardiology: "#e05c5c",
      Electrophysiology: "#7c6fe0",
      "Internal Medicine": "#3a9a7e",
      "Cardiac Surgery": "#d4832a",
      Pharmacology: "#4a90c4",
    };
    return map[spec] || "#888";
  };

  return (
    <div style={styles.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d0ccc5; border-radius: 4px; }
        textarea:focus, input:focus { outline: none; }
        button { cursor: pointer; }
        .comment-card:hover .summarize-btn { opacity: 1 !important; }
        .tab-btn:hover { background: #f0ede8 !important; }
        .action-btn:hover { background: #1a1a1a !important; }
        .add-btn:hover { background: #2a5a4a !important; }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>⚕</div>
          <div>
            <div style={styles.headerTitle}>ClinicalThread</div>
            <div style={styles.headerSub}>AI-Powered Discussion Intelligence</div>
          </div>
        </div>
        <div style={styles.headerStats}>
          <span style={styles.stat}>{comments.length} replies</span>
          <span style={styles.statDot}>·</span>
          <span style={styles.stat}>10 physicians</span>
          <span style={styles.statDot}>·</span>
          <span style={styles.statTag}>Cardiology</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          className="tab-btn"
          style={{ ...styles.tabBtn, ...(activeTab === "discussion" ? styles.tabActive : {}) }}
          onClick={() => setActiveTab("discussion")}
        >
          Discussion
        </button>
        <button
          className="tab-btn"
          style={{ ...styles.tabBtn, ...(activeTab === "summary" ? styles.tabActive : {}) }}
          onClick={() => setActiveTab("summary")}
        >
          AI Summary {summary && <span style={styles.badge}>✓</span>}
        </button>
      </div>

      <div style={styles.content}>
        {/* Discussion Tab */}
        {activeTab === "discussion" && (
          <div style={styles.discussionPane}>
            {/* Summarize CTA */}
            <div style={styles.ctaBanner}>
              <div style={styles.ctaText}>
                <span style={styles.ctaIcon}>⚡</span>
                <span>Understand this entire discussion in under 30 seconds</span>
              </div>
              <button
                className="action-btn"
                style={styles.actionBtn}
                onClick={summarizeAll}
                disabled={loading}
              >
                {loading ? (
                  <span style={styles.spinner}>⟳</span>
                ) : (
                  "Summarize Discussion"
                )}
              </button>
            </div>

            {/* Comments */}
            <div style={styles.commentList}>
              {comments.map((comment) => (
                <div key={comment.id} className="comment-card" style={styles.commentCard}>
                  <div style={styles.commentHeader}>
                    <div style={styles.authorBlock}>
                      <div
                        style={{
                          ...styles.avatar,
                          background: specialtyColor(comment.specialty),
                        }}
                      >
                        {comment.author.split(" ").pop()[0]}
                      </div>
                      <div>
                        <div style={styles.authorName}>{comment.author}</div>
                        <div style={{ ...styles.specialty, color: specialtyColor(comment.specialty) }}>
                          {comment.specialty}
                        </div>
                      </div>
                    </div>
                    <div style={styles.commentRight}>
                      <span style={styles.time}>{comment.time}</span>
                      <button
                        className="summarize-btn"
                        style={styles.summarizeBtn}
                        onClick={() => summarizeComment(comment)}
                        disabled={loadingId === comment.id}
                      >
                        {loadingId === comment.id ? "..." : "TL;DR"}
                      </button>
                    </div>
                  </div>

                  <p style={styles.commentText}>{comment.text}</p>

                  {commentSummaries[comment.id] && (
                    <div style={styles.inlineSummary}>
                      <div style={styles.inlineSummaryLabel}>AI Summary</div>
                      <p style={styles.inlineSummaryText}>
                        {commentSummaries[comment.id].keyPoint}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add Comment */}
            <div style={styles.addComment}>
              <div style={styles.addTitle}>Add to Discussion</div>
              <div style={styles.addRow}>
                <input
                  style={styles.input}
                  placeholder="Your name"
                  value={newComment.author}
                  onChange={(e) => setNewComment((p) => ({ ...p, author: e.target.value }))}
                />
                <input
                  style={styles.input}
                  placeholder="Specialty"
                  value={newComment.specialty}
                  onChange={(e) => setNewComment((p) => ({ ...p, specialty: e.target.value }))}
                />
              </div>
              <textarea
                style={styles.textarea}
                placeholder="Share your clinical insights..."
                value={newComment.text}
                onChange={(e) => setNewComment((p) => ({ ...p, text: e.target.value }))}
                rows={3}
              />
              <button className="add-btn" style={styles.addBtn} onClick={addComment}>
                Post Comment
              </button>
            </div>
          </div>
        )}

        {/* Summary Tab */}
        {activeTab === "summary" && (
          <div style={styles.summaryPane}>
            {!summary ? (
              <div style={styles.emptySummary}>
                <div style={styles.emptyIcon}>✦</div>
                <div style={styles.emptyTitle}>No summary yet</div>
                <p style={styles.emptyText}>
                  Generate an AI summary of the full discussion to quickly grasp the clinical consensus.
                </p>
                <button
                  className="action-btn"
                  style={styles.actionBtn}
                  onClick={summarizeAll}
                  disabled={loading}
                >
                  {loading ? "Generating..." : "Generate Summary"}
                </button>
              </div>
            ) : (
              <div style={styles.summaryContent}>
                {/* TL;DR */}
                <div style={styles.tldrCard}>
                  <div style={styles.tldrLabel}>TL;DR — 30-second read</div>
                  <div style={styles.tldrText}>{summary.tldr}</div>
                </div>

                {/* Two columns */}
                <div style={styles.twoCol}>
                  {/* Consensus */}
                  <div style={styles.section}>
                    <div style={styles.sectionTitle}>
                      <span style={styles.sectionIcon}>◉</span> Consensus Points
                    </div>
                    <div style={styles.sectionBody}>
                      {summary.consensus?.map((point, i) => (
                        <div key={i} style={styles.consensusItem}>
                          <span style={styles.checkmark}>✓</span>
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Items */}
                  <div style={styles.section}>
                    <div style={styles.sectionTitle}>
                      <span style={styles.sectionIcon}>▶</span> Action Items
                    </div>
                    <div style={styles.sectionBody}>
                      {summary.actionItems?.map((item, i) => (
                        <div key={i} style={styles.actionItem}>
                          <span style={styles.actionNum}>{i + 1}</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Key Insights */}
                <div style={styles.section}>
                  <div style={styles.sectionTitle}>
                    <span style={styles.sectionIcon}>◆</span> Notable Expert Opinions
                  </div>
                  <div style={styles.insightGrid}>
                    {summary.keyInsights?.map((ins, i) => (
                      <div key={i} style={styles.insightCard}>
                        <div style={styles.insightAuthor}>{ins.author}</div>
                        <div style={styles.insightText}>{ins.insight}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  style={styles.regenerateBtn}
                  onClick={summarizeAll}
                  disabled={loading}
                >
                  {loading ? "Regenerating..." : "↺ Regenerate"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  app: {
    fontFamily: "'DM Sans', sans-serif",
    background: "#faf8f4",
    minHeight: "100vh",
    color: "#1a1a18",
    maxWidth: 780,
    margin: "0 auto",
  },
  header: {
    padding: "24px 28px 20px",
    borderBottom: "1px solid #e8e4dc",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#fff",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 14 },
  logo: {
    fontSize: 28,
    width: 44,
    height: 44,
    background: "#1c3a30",
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#7ecfad",
  },
  headerTitle: {
    fontFamily: "'Instrument Serif', serif",
    fontSize: 20,
    fontWeight: 400,
    color: "#1a1a18",
  },
  headerSub: { fontSize: 12, color: "#9a9688", marginTop: 1 },
  headerStats: { display: "flex", alignItems: "center", gap: 8, fontSize: 13 },
  stat: { color: "#6a6660" },
  statDot: { color: "#ccc" },
  statTag: {
    background: "#e8f4ee",
    color: "#2a6a4a",
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
  },
  tabs: {
    display: "flex",
    borderBottom: "1px solid #e8e4dc",
    background: "#fff",
    padding: "0 28px",
  },
  tabBtn: {
    padding: "12px 20px",
    border: "none",
    background: "transparent",
    fontSize: 14,
    color: "#6a6660",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 400,
    borderBottom: "2px solid transparent",
    marginBottom: -1,
    transition: "all 0.15s",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  tabActive: {
    color: "#1a1a18",
    borderBottomColor: "#1c3a30",
    fontWeight: 500,
  },
  badge: {
    background: "#2a6a4a",
    color: "#fff",
    borderRadius: 20,
    padding: "1px 6px",
    fontSize: 10,
  },
  content: { padding: "0" },

  // Discussion
  discussionPane: {},
  ctaBanner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 28px",
    background: "#1c3a30",
    color: "#fff",
  },
  ctaText: { display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#a8d8be" },
  ctaIcon: { fontSize: 16 },
  actionBtn: {
    background: "#2a5a40",
    color: "#fff",
    border: "1px solid #3a7a58",
    padding: "8px 18px",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    fontFamily: "'DM Sans', sans-serif",
    transition: "background 0.15s",
    cursor: "pointer",
  },
  spinner: { display: "inline-block", animation: "spin 1s linear infinite" },
  commentList: { padding: "0 28px" },
  commentCard: {
    padding: "20px 0",
    borderBottom: "1px solid #f0ece4",
    transition: "background 0.1s",
  },
  commentHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  authorBlock: { display: "flex", alignItems: "center", gap: 10 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    flexShrink: 0,
  },
  authorName: { fontSize: 14, fontWeight: 500 },
  specialty: { fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" },
  commentRight: { display: "flex", alignItems: "center", gap: 10 },
  time: { fontSize: 12, color: "#aaa" },
  summarizeBtn: {
    opacity: 0,
    background: "#f0ece4",
    border: "none",
    padding: "4px 10px",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    color: "#3a6a52",
    cursor: "pointer",
    fontFamily: "'DM Mono', monospace",
    transition: "opacity 0.15s",
    letterSpacing: "0.03em",
  },
  commentText: { fontSize: 14, lineHeight: 1.65, color: "#3a3830" },
  inlineSummary: {
    marginTop: 12,
    background: "#f0f7f3",
    borderLeft: "3px solid #2a7a54",
    padding: "10px 14px",
    borderRadius: "0 6px 6px 0",
  },
  inlineSummaryLabel: { fontSize: 10, fontWeight: 700, color: "#2a7a54", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 },
  inlineSummaryText: { fontSize: 13, color: "#2a4a3a", lineHeight: 1.5 },

  // Add comment
  addComment: {
    margin: "0 28px 28px",
    padding: 20,
    background: "#fff",
    border: "1px solid #e8e4dc",
    borderRadius: 10,
    marginTop: 8,
  },
  addTitle: { fontSize: 14, fontWeight: 600, marginBottom: 14 },
  addRow: { display: "flex", gap: 10, marginBottom: 10 },
  input: {
    flex: 1,
    padding: "8px 12px",
    border: "1px solid #e0dcd4",
    borderRadius: 6,
    fontSize: 13,
    background: "#faf8f4",
    fontFamily: "'DM Sans', sans-serif",
    color: "#1a1a18",
  },
  textarea: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #e0dcd4",
    borderRadius: 6,
    fontSize: 13,
    background: "#faf8f4",
    fontFamily: "'DM Sans', sans-serif",
    color: "#1a1a18",
    resize: "vertical",
    lineHeight: 1.6,
    marginBottom: 10,
  },
  addBtn: {
    background: "#1c3a30",
    color: "#fff",
    border: "none",
    padding: "9px 18px",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    fontFamily: "'DM Sans', sans-serif",
    transition: "background 0.15s",
    cursor: "pointer",
  },

  // Summary
  summaryPane: { padding: "28px" },
  emptySummary: { textAlign: "center", padding: "60px 20px" },
  emptyIcon: { fontSize: 32, color: "#c8c4bc", marginBottom: 12 },
  emptyTitle: { fontFamily: "'Instrument Serif', serif", fontSize: 22, marginBottom: 8 },
  emptyText: { color: "#6a6660", fontSize: 14, maxWidth: 340, margin: "0 auto 20px" },
  summaryContent: {},
  tldrCard: {
    background: "#1c3a30",
    color: "#fff",
    padding: "22px 24px",
    borderRadius: 12,
    marginBottom: 20,
  },
  tldrLabel: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "#7ecfad",
    marginBottom: 8,
    fontFamily: "'DM Mono', monospace",
  },
  tldrText: {
    fontFamily: "'Instrument Serif', serif",
    fontSize: 20,
    lineHeight: 1.5,
    fontStyle: "italic",
  },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 },
  section: {
    background: "#fff",
    border: "1px solid #e8e4dc",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 16,
  },
  sectionTitle: {
    padding: "14px 18px",
    borderBottom: "1px solid #f0ece4",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#4a4840",
    display: "flex",
    alignItems: "center",
    gap: 7,
    fontFamily: "'DM Mono', monospace",
  },
  sectionIcon: { color: "#2a7a54" },
  sectionBody: { padding: "14px 18px" },
  consensusItem: {
    display: "flex",
    gap: 10,
    fontSize: 13,
    lineHeight: 1.55,
    marginBottom: 10,
    color: "#2a3a30",
    alignItems: "flex-start",
  },
  checkmark: { color: "#2a9a64", flexShrink: 0, marginTop: 1 },
  actionItem: {
    display: "flex",
    gap: 10,
    fontSize: 13,
    lineHeight: 1.55,
    marginBottom: 10,
    color: "#2a3a30",
    alignItems: "flex-start",
  },
  actionNum: {
    background: "#e8f4ee",
    color: "#2a7a4a",
    borderRadius: "50%",
    width: 20,
    height: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 700,
    flexShrink: 0,
  },
  insightGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    padding: "14px 18px",
  },
  insightCard: {
    background: "#faf8f4",
    border: "1px solid #ece8e0",
    borderRadius: 8,
    padding: "12px 14px",
  },
  insightAuthor: { fontSize: 11, fontWeight: 700, color: "#4a4840", marginBottom: 4, fontFamily: "'DM Mono', monospace" },
  insightText: { fontSize: 12, color: "#4a4840", lineHeight: 1.5 },
  regenerateBtn: {
    background: "transparent",
    border: "1px solid #d0ccc5",
    color: "#6a6660",
    padding: "8px 16px",
    borderRadius: 6,
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    marginTop: 4,
  },
};
