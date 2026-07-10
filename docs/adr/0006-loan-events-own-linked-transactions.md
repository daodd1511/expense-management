# Loan events own linked transactions

Personal-loan events are authoritative for loan balances and create or update their linked account transactions atomically. A loan-linked transaction uses a distinct `loan` type, an explicit inflow or outflow direction, and no income/expense category; it remains visible in the general ledger but cannot be mutated through generic transaction operations, preventing account balances and loan history from diverging.
