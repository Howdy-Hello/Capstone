---
name: leaderboard-privacy-cross-account-testing
description: When testing leaderboards: check cross-account data access.
category: testing
---

Create test accounts with distinct identities (full name, display name, or username—whatever the app allows). Sign in as Account A and fetch the leaderboard and public-data endpoints as that account: both via UI network inspection and direct API calls (REST, GraphQL, RPC).

Record what Account A sees about Account B: username, display_name, full_name, email, score, profile picture, level, or any other field. Cross-check against the Privacy/Terms page: is every exposed field disclosed? Did the signup form warn players about data sharing?

If the Privacy page says display names are public but the signup field offers no choice or warning, report it as a UX gap (consent flow issue), not necessarily a data leak.

Test both light and dark themes where visibility differs.
