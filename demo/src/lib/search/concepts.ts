// Concept groups let a query like "billing" also match "stripe" or "checkout".
// The first entry is the label Chilla shows to the user ("…about payments").
// A synonym only counts as *related* evidence, never as a direct match, so a
// person with "churn" on their profile is not presented as a conversion expert.
// Add a group, or extend one, to teach the search new vocabulary.

export const concepts: string[][] = [
  ["payments", "payment", "pay", "billing", "stripe", "adyen", "checkout", "card", "cards", "transaction", "transactions", "processor", "retry", "retries", "dunning", "ledger", "reconciliation", "payouts", "ach", "wire"],
  ["authentication", "auth", "sso", "saml", "oauth", "oidc", "login", "identity", "okta", "security", "permissions", "rbac", "roles", "access"],
  ["data & analytics", "data", "analytics", "metrics", "dashboard", "dashboards", "reporting", "warehouse", "snowflake", "dbt", "pipeline", "pipelines", "tracking", "events", "instrumentation", "sql", "amplitude", "looker", "funnel analysis"],
  ["AI & ML", "ai", "ml", "machine learning", "model", "models", "llm", "llms", "pytorch", "automation"],
  ["fraud & risk", "fraud", "fraud detection", "risk", "risk scoring", "chargebacks", "chargeback"],
  ["reliability", "reliability", "incident", "incidents", "outage", "uptime", "sre", "infrastructure", "infra", "kubernetes", "load test", "load testing", "performance", "latency", "scaling", "on-call", "postmortem"],
  ["design", "design", "designer", "ux", "ui", "figma", "design system", "components", "accessibility", "a11y", "prototype", "mockups"],
  ["user research", "research", "researcher", "interviews", "interview", "usability", "survey", "surveys", "personas", "customers", "insights"],
  ["launches & GTM", "launch", "launches", "gtm", "go-to-market", "positioning", "messaging", "announcement", "release notes", "enablement", "sales"],
  ["growth", "growth", "onboarding", "activation", "signup", "funnel", "conversion", "drop-off", "dropoff", "abandonment", "experiment", "experiments", "a/b testing", "experimentation", "retention", "churn"],
  ["marketing", "marketing", "email", "emails", "lifecycle", "seo", "acquisition", "campaign", "campaigns", "content"],
  ["legal & compliance", "legal", "compliance", "gdpr", "privacy", "pci", "soc 2", "audit", "contract", "contracts", "dpa", "consent", "data retention", "sign-off", "signoff", "regulatory"],
  ["pricing", "pricing", "price", "prices", "plans", "packaging", "tiers", "discount", "discounts", "monetization"],
  ["finance", "finance", "budget", "forecast", "revenue", "margin", "margins", "business case", "roi", "unit economics", "cost"],
  ["customer support", "support", "tickets", "ticket", "escalation", "escalations", "zendesk", "help center", "csat", "complaints", "feedback", "voice of customer"],
  ["Europe", "eu", "europe", "european", "uk", "international", "localization"],
];

/** Words a person types around the topic. They never count as part of it. */
export const stopwords = new Set(
  `a an the and or but if of to in on for with about at by from into over is are was were be been am
  i me my we our us you your he she they them it its this that these those who whom whose what which where when why how
  should would could can will do does did need needs want wants help talk speak ask contact reach out someone somebody person people
  anyone knows know knowledge expert experts best right go-to please hey hi chilla regarding re thing things stuff team owns own owner currently get
  find work working works worked whos whats im ive id has have had just any some more most really like let also both either
  improve improving improved reduce reducing reduced increase increasing fix fixing build building understand understanding
  experience experienced background familiar handle handles handling run runs running lead leads leading make making
  question questions issue issues problem problems lot lots kind sort good great new old recent recently thinking trying
  looking look figure out start started starting plan planning quick quickly whether there here then than so very
  before after during since until next last week weeks month months year today tomorrow yesterday soon now later
  already ever still yet each every all many much one two first second guy gal folks folk anybody everyone
  free available monday tuesday wednesday thursday friday morning afternoon tell told show give going doing done`.split(/\s+/),
);

/**
 * Words that sharpen a topic ("payment *systems*") but aren't a topic on their
 * own. They boost exact phrases but are never required.
 */
export const softWords = new Set(
  `system systems side area areas space stuff details detail implementation technical general overall process
  part parts piece pieces flow flows thing approach strategy side work`.split(/\s+/),
);
