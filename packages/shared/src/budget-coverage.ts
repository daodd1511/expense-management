import type { Budget, Category } from "./models";

/**
 * The set of category ids a budget's spend is drawn from: just the category
 * itself for `self`, or the category plus its direct children for `tree`.
 * Categories are capped at two levels, but this walks children generically
 * so a future depth change doesn't silently under-count.
 */
export function budgetCoverage(budget: Pick<Budget, "categoryId" | "scope">, categories: Category[]): Set<string> {
  if (budget.scope === "self") {
    return new Set([budget.categoryId]);
  }

  const coverage = new Set([budget.categoryId]);
  for (const category of categories) {
    if (category.parentId === budget.categoryId) {
      coverage.add(category.id);
    }
  }
  return coverage;
}

function coverageOverlaps(a: Set<string>, b: Set<string>): boolean {
  for (const id of a) {
    if (b.has(id)) return true;
  }
  return false;
}

/**
 * The existing budget whose coverage would overlap a candidate budget on
 * `candidateCategoryId` with the given `candidateScope`, or `null` if there is
 * none. `excludeCategoryId` omits the budget being edited from the check.
 */
export function conflictingBudget(
  candidateCategoryId: string,
  candidateScope: Budget["scope"],
  budgets: Budget[],
  categories: Category[],
  excludeCategoryId?: string,
): Budget | null {
  const candidateCoverage = budgetCoverage(
    { categoryId: candidateCategoryId, scope: candidateScope },
    categories,
  );

  for (const budget of budgets) {
    if (budget.categoryId === excludeCategoryId) continue;
    const existingCoverage = budgetCoverage(budget, categories);
    if (coverageOverlaps(candidateCoverage, existingCoverage)) {
      return budget;
    }
  }

  return null;
}
