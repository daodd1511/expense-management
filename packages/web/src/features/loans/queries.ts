import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateLoanDependentQueries } from "@/core/query-invalidation";
import { useAuth } from "@/features/auth/auth";
import { todayLocalIso } from "@/shared/lib/date";
import {
  closeLoan,
  deleteLoan,
  deleteLoanRepayment,
  deletePerson,
  fetchLoanDetail,
  fetchLoanSummaries,
  fetchPeople,
  fetchPersonSummaries,
  insertDisbursedLoan,
  insertLoanRepayment,
  insertOpeningLoan,
  insertPerson,
  patchLoanDisbursement,
  patchLoanMetadata,
  patchLoanRepayment,
  patchPerson,
  reopenLoan,
} from "./db";
import type {
  CloseLoan,
  DisbursedLoanCreate,
  LoanDisbursementPatch,
  LoanMetadataPatch,
  LoanRepaymentCreate,
  LoanRepaymentPatch,
  OpeningLoanCreate,
  PersonCreate,
  PersonPatch,
} from "@wallet/shared";

type UserId = string | undefined;

export const loanQueryKeys = {
  all: (userId: UserId) => ["loans", userId] as const,
  people: (userId: UserId) => ["loans", userId, "people"] as const,
  summaries: (userId: UserId, today: string) => ["loans", userId, "summaries", today] as const,
  personSummaries: (userId: UserId, today: string) =>
    ["loans", userId, "person-summaries", today] as const,
  detail: (userId: UserId, loanId: string, today: string) =>
    ["loans", userId, "detail", loanId, today] as const,
};

function useLoanMutationInvalidation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return () => invalidateLoanDependentQueries(queryClient, user?.id);
}

export function usePeople() {
  const { user } = useAuth();
  return useQuery({
    queryKey: loanQueryKeys.people(user?.id),
    queryFn: fetchPeople,
    enabled: !!user,
  });
}

export function useLoanSummaries(today: string = todayLocalIso()) {
  const { user } = useAuth();
  return useQuery({
    queryKey: loanQueryKeys.summaries(user?.id, today),
    queryFn: () => fetchLoanSummaries(today),
    enabled: !!user,
  });
}

export function usePersonSummaries(today: string = todayLocalIso()) {
  const { user } = useAuth();
  return useQuery({
    queryKey: loanQueryKeys.personSummaries(user?.id, today),
    queryFn: () => fetchPersonSummaries(today),
    enabled: !!user,
  });
}

export function useLoanDetail(loanId: string, today: string = todayLocalIso()) {
  const { user } = useAuth();
  return useQuery({
    queryKey: loanQueryKeys.detail(user?.id, loanId, today),
    queryFn: () => fetchLoanDetail(loanId, today),
    enabled: !!user && loanId.length > 0,
  });
}

export function useAddPerson() {
  const invalidate = useLoanMutationInvalidation();
  return useMutation({
    mutationFn: (input: PersonCreate) => insertPerson(input),
    onSuccess: invalidate,
  });
}

export function useUpdatePerson() {
  const invalidate = useLoanMutationInvalidation();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: PersonPatch }) => patchPerson(id, patch),
    onSuccess: invalidate,
  });
}

export function useDeletePerson() {
  const invalidate = useLoanMutationInvalidation();
  return useMutation({ mutationFn: (id: string) => deletePerson(id), onSuccess: invalidate });
}

export function useAddDisbursedLoan(today: string = todayLocalIso()) {
  const invalidate = useLoanMutationInvalidation();
  return useMutation({
    mutationFn: (input: DisbursedLoanCreate) => insertDisbursedLoan(input, today),
    onSuccess: invalidate,
  });
}

export function useAddOpeningLoan(today: string = todayLocalIso()) {
  const invalidate = useLoanMutationInvalidation();
  return useMutation({
    mutationFn: (input: OpeningLoanCreate) => insertOpeningLoan(input, today),
    onSuccess: invalidate,
  });
}

export function useUpdateLoanMetadata(today: string = todayLocalIso()) {
  const invalidate = useLoanMutationInvalidation();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: LoanMetadataPatch }) =>
      patchLoanMetadata(id, patch, today),
    onSuccess: invalidate,
  });
}

export function useUpdateLoanDisbursement(today: string = todayLocalIso()) {
  const invalidate = useLoanMutationInvalidation();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: LoanDisbursementPatch }) =>
      patchLoanDisbursement(id, patch, today),
    onSuccess: invalidate,
  });
}

export function useDeleteLoan() {
  const invalidate = useLoanMutationInvalidation();
  return useMutation({ mutationFn: (id: string) => deleteLoan(id), onSuccess: invalidate });
}

export function useAddLoanRepayment(today: string = todayLocalIso()) {
  const invalidate = useLoanMutationInvalidation();
  return useMutation({
    mutationFn: ({ loanId, input }: { loanId: string; input: LoanRepaymentCreate }) =>
      insertLoanRepayment(loanId, input, today),
    onSuccess: invalidate,
  });
}

export function useUpdateLoanRepayment(today: string = todayLocalIso()) {
  const invalidate = useLoanMutationInvalidation();
  return useMutation({
    mutationFn: ({
      loanId,
      eventId,
      patch,
    }: {
      loanId: string;
      eventId: string;
      patch: LoanRepaymentPatch;
    }) => patchLoanRepayment(loanId, eventId, patch, today),
    onSuccess: invalidate,
  });
}

export function useDeleteLoanRepayment() {
  const invalidate = useLoanMutationInvalidation();
  return useMutation({
    mutationFn: ({ loanId, eventId }: { loanId: string; eventId: string }) =>
      deleteLoanRepayment(loanId, eventId),
    onSuccess: invalidate,
  });
}

export function useCloseLoan(today: string = todayLocalIso()) {
  const invalidate = useLoanMutationInvalidation();
  return useMutation({
    mutationFn: ({ loanId, input }: { loanId: string; input: CloseLoan }) =>
      closeLoan(loanId, input, today),
    onSuccess: invalidate,
  });
}

export function useReopenLoan(today: string = todayLocalIso()) {
  const invalidate = useLoanMutationInvalidation();
  return useMutation({
    mutationFn: (loanId: string) => reopenLoan(loanId, today),
    onSuccess: invalidate,
  });
}
