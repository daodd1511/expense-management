---
status: superseded by ADR-0004
---

# Balances are computed on the client, not stored or served

Account balances are derived on the client by folding every transaction over
the account's opening balance; there is no stored balance and no balance API.
Chosen so a balance can never drift out of sync with the transactions that
produce it, accepting that each consumer must load the transactions to compute
one. Revisit if transaction volume makes the client-side fold too slow.
