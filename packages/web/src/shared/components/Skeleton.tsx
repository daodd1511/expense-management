import { cn } from "@/shared/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-xl bg-muted", className)} />;
}

export function DashboardSkeleton({ mobile = false }: { mobile?: boolean }) {
  return mobile ? (
    <div className="flex flex-col gap-4 p-4" data-testid="dashboard-skeleton">
      <Skeleton className="h-40 rounded-3xl" />
      <Skeleton className="h-56" />
      <Skeleton className="h-44" />
      <Skeleton className="h-48" />
      <Skeleton className="h-44" />
    </div>
  ) : (
    <div className="flex flex-col gap-5" data-testid="dashboard-skeleton">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-32" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-96 lg:col-span-1" />
        <Skeleton className="h-96 lg:col-span-2" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-72" />
        ))}
      </div>
    </div>
  );
}

export function AccountsSkeleton({ mobile = false }: { mobile?: boolean }) {
  return mobile ? (
    <div className="flex flex-col gap-4 p-4" data-testid="accounts-skeleton">
      <Skeleton className="h-32 rounded-3xl" />
      <Skeleton className="h-80" />
      <Skeleton className="h-14 rounded-2xl" />
    </div>
  ) : (
    <div className="flex flex-col gap-6" data-testid="accounts-skeleton">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-11 w-36" />
      </div>
      <Skeleton className="h-28" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-44" />
        ))}
      </div>
    </div>
  );
}

export function BudgetsSkeleton({ mobile = false }: { mobile?: boolean }) {
  return mobile ? (
    <div className="flex flex-col gap-4 p-4" data-testid="budgets-skeleton">
      <Skeleton className="h-32" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-8 w-24" />
      </div>
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-28" />
      ))}
    </div>
  ) : (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3" data-testid="budgets-skeleton">
      <div className="flex flex-col gap-4 lg:col-span-1">
        <Skeleton className="h-44" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-80" />
      </div>
      <Skeleton className="h-[34rem] lg:col-span-2" />
    </div>
  );
}

export function TransactionsSkeleton({ mobile = false }: { mobile?: boolean }) {
  return mobile ? (
    <div className="flex flex-col gap-3 p-4" data-testid="transactions-skeleton">
      <Skeleton className="h-10" />
      <Skeleton className="h-11" />
      <div className="flex gap-2">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-32 rounded-2xl" />
      ))}
    </div>
  ) : (
    <div className="flex flex-col gap-4" data-testid="transactions-skeleton">
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-10 flex-1" />
      </div>
      <Skeleton className="h-[33rem]" />
    </div>
  );
}

export function SubscriptionsSkeleton({ mobile = false }: { mobile?: boolean }) {
  return mobile ? (
    <div className="flex flex-col gap-4 p-4" data-testid="subscriptions-skeleton">
      <Skeleton className="h-32 rounded-3xl" />
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-52" />
      ))}
      <Skeleton className="h-14 rounded-2xl" />
    </div>
  ) : (
    <div className="flex flex-col gap-6" data-testid="subscriptions-skeleton">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <Skeleton className="h-24" />
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-28" />
      ))}
    </div>
  );
}

export function CategoriesSkeleton({ mobile = false }: { mobile?: boolean }) {
  return (
    <div
      className={cn("flex flex-col gap-4", mobile ? "p-4 pt-3" : "gap-6")}
      data-testid="categories-skeleton"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-28" />
          {!mobile && (
            <>
              <Skeleton className="h-8 w-44" />
              <Skeleton className="h-4 w-48" />
            </>
          )}
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className="h-12" />
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="h-16" />
      ))}
    </div>
  );
}

export function ReportsSkeleton({ mobile = false }: { mobile?: boolean }) {
  return mobile ? (
    <div className="flex flex-col gap-4 p-4" data-testid="reports-skeleton">
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-44 rounded-2xl" />
      <Skeleton className="h-56 rounded-2xl" />
    </div>
  ) : (
    <div className="flex flex-col gap-6" data-testid="reports-skeleton">
      <Skeleton className="h-24" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
        <Skeleton className="h-[28rem]" />
        <Skeleton className="h-[28rem]" />
      </div>
    </div>
  );
}
