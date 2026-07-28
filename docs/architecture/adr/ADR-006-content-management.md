# ADR-006: Replace Event-Only Presentation with Generic Content Management

**Status:** Accepted

## Problem

A dedicated Events model cannot represent scripture, quotes, announcements, news, stories, video, audio, galleries, documents, and future organization content without repeated schema changes.

## Alternatives

1. Extend Events with many nullable fields.
2. Build separate modules for each content type.
3. Create generic Content Items with configured Content Types, Assets, Targets, and typed metadata.

## Decision

Use Content Items, Content Types, Content Assets, Content Targets, and Featured Content. Baseline types are Event, Bhagavad-gita Verse, Srimad Bhagavatam Verse, Srila Prabhupada Quote, Festival, News, Announcement, Story, Video, Audio, Gallery, PDF, and Custom Content. Krishna Conscious content receives first-class structured fields for source, original text, transliteration, translation, purport summary, and practical application while retaining the generic model.

Dashboard Configuration determines presentation. A Program Offering may feature at most three active Content Items. Parent experiences show only content relevant to a child's Active Memberships and de-duplicate items across memberships.

## Consequences

Parent and dashboard experiences are configurable and reusable. Type-specific validation is handled through versioned content schemas rather than one rigid event form. Content targeting adds query and permission complexity, but prevents irrelevant parent content from being displayed.
