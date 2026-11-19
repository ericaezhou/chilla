// Who has worked with whom at Fernway. Chilla uses this to show degrees of
// separation and mutual contacts, so you can ask for a warm intro instead of
// cold-messaging someone.
//
// People who share a project in employees.ts are connected automatically.
// Add extra edges here; `how` finishes the sentence "They …".

export const ME = "me";

export interface Collaboration {
  a: string;
  b: string;
  how: string;
}

/** Your own working relationships (you are Jess Lin, PM on Spend Management). */
export const myCollaborations: Collaboration[] = [
  { a: ME, b: "maya-chen", how: "have a weekly PM sync" },
  { a: ME, b: "grace-liu", how: "worked together on the Card spend controls compliance review" },
  { a: ME, b: "noah-bennett", how: "ran customer interviews together for Card spend controls" },
  { a: ME, b: "daniel-okafor", how: "shipped the Expense policy engine experiment together" },
];

export const collaborations: Collaboration[] = [
  { a: "priya-raman", b: "kenji-watanabe", how: "work together in #payments-squad on fraud checks in the payment flow" },
  { a: "priya-raman", b: "grace-liu", how: "are scoping the payments stack for PCI DSS 4.0 together" },
  { a: "priya-raman", b: "dev-patel", how: "load tested Payments Orchestration v2 together" },
  { a: "priya-raman", b: "tom-becker", how: "built the failed-payments escalation path together" },
  { a: "maya-chen", b: "chloe-dubois", how: "are running the Q4 Checkout & Payouts launch together" },
  { a: "isabel-torres", b: "noah-bennett", how: "ran the expense reporting usability study together" },
  { a: "daniel-okafor", b: "omar-haddad", how: "built the onboarding emails for Self-serve onboarding together" },
  { a: "daniel-okafor", b: "ethan-brooks", how: "defined the activation metrics together" },
  { a: "ethan-brooks", b: "aiko-kim", how: "built the revenue metrics behind the FY27 forecast together" },
  { a: "marcus-oyelaran", b: "aiko-kim", how: "worked on the EU pricing change together" },
  { a: "marcus-oyelaran", b: "chloe-dubois", how: "planned the EU launch messaging together" },
  { a: "sofia-marquez", b: "grace-liu", how: "did the SSO security review together" },
  { a: "tom-becker", b: "noah-bennett", how: "share voice-of-customer insights every month" },
];
