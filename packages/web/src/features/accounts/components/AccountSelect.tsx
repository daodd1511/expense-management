import {
  Select,
  SelectItem,
  SelectPopup,
  SelectPositioner,
  SelectPortal,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'

interface AccountOption {
  id: string
  name: string
}

/** Account dropdown built on the shared `Select` component. Shared by the
 * transaction and subscription forms so both stay visually and behaviorally
 * consistent instead of hand-rolling native `<select>` elements. */
export function AccountSelect({
  value,
  onChange,
  accounts,
  placeholder,
  id,
}: {
  value: string
  onChange: (accountId: string) => void
  accounts: AccountOption[]
  placeholder: string
  id?: string
}) {
  const labels = Object.fromEntries(accounts.map((account) => [account.id, account.name]))

  return (
    <Select value={value} onValueChange={(nextValue) => nextValue && onChange(nextValue)}>
      <SelectTrigger id={id}>
        <SelectValue>{(selected: string | null) => labels[selected ?? ''] ?? placeholder}</SelectValue>
      </SelectTrigger>
      <SelectPortal>
        <SelectPositioner>
          <SelectPopup>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectPopup>
        </SelectPositioner>
      </SelectPortal>
    </Select>
  )
}
