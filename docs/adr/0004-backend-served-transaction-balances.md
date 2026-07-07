# Transaction rows include backend-computed balances

Transaction list responses include account-specific post-transaction balances
computed on the backend, superseding ADR-0001's client-only balance fold.
Chosen because row-level balances must stay stable under UI filters and after
edits/deletes, accepting a heavier list query so clients do not each replay
hidden ledger history differently.
