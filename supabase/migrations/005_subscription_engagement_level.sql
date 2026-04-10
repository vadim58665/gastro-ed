-- Add engagement_level to subscriptions.
-- Used by SubscriptionContext and every MedMind premium UI component
-- (ContextualTip, MedMindDrawer, MedMindFAB, NudgeBanner, EngagementPicker).
-- Values come from EngagementLevel type in src/types/medmind.ts.

alter table subscriptions
  add column if not exists engagement_level text not null default 'medium'
  check (engagement_level in ('light','medium','maximum'));
