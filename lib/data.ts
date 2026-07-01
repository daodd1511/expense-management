import type { Account, Budget, Category, Subscription, Transaction } from './types'

export const categories: Category[] = [
  { id: 'food', name: 'Ăn uống', icon: 'Utensils', color: 'chart-1' },
  { id: 'transport', name: 'Đi lại', icon: 'Bus', color: 'chart-2' },
  { id: 'home', name: 'Nhà cửa', icon: 'House', color: 'chart-3' },
  { id: 'bills', name: 'Hóa đơn', icon: 'ReceiptText', color: 'chart-4' },
  { id: 'fun', name: 'Giải trí', icon: 'Gamepad2', color: 'chart-5' },
  { id: 'health', name: 'Sức khỏe', icon: 'HeartPulse', color: 'chart-2' },
  { id: 'shopping', name: 'Mua sắm', icon: 'ShoppingBag', color: 'chart-3' },
  { id: 'salary', name: 'Lương', icon: 'Briefcase', color: 'chart-1' },
  { id: 'other-income', name: 'Thu nhập khác', icon: 'Gift', color: 'chart-1' },
]

export const accounts: Account[] = [
  { id: 'cash', name: 'Tiền mặt', kind: 'cash', balance: 2_450_000 },
  { id: 'vcb', name: 'Vietcombank', kind: 'bank', balance: 38_720_000 },
  { id: 'tcb-card', name: 'Techcombank Visa', kind: 'card', balance: -4_180_000 },
  { id: 'momo', name: 'Ví MoMo', kind: 'ewallet', balance: 1_065_000 },
]

export const budgets: Budget[] = [
  { categoryId: 'food', limit: 5_000_000 },
  { categoryId: 'transport', limit: 1_500_000 },
  { categoryId: 'home', limit: 7_000_000 },
  { categoryId: 'bills', limit: 2_500_000 },
  { categoryId: 'fun', limit: 1_500_000 },
  { categoryId: 'shopping', limit: 3_000_000 },
  { categoryId: 'health', limit: 1_000_000 },
]

// Today's date parts for seed nextDueDate
const _now = new Date()
const _y = _now.getFullYear()
const _m = _now.getMonth() + 1 // 1-based

function nextDue(day: number, month?: number): string {
  const d = new Date()
  if (month !== undefined) {
    // yearly: next occurrence
    const candidate = new Date(_y, month - 1, day)
    if (candidate <= d) candidate.setFullYear(_y + 1)
    return candidate.toISOString().slice(0, 10)
  }
  // monthly: this month if day >= today, else next month
  const candidate = new Date(_y, _m - 1, day)
  if (candidate <= d) candidate.setMonth(candidate.getMonth() + 1)
  return candidate.toISOString().slice(0, 10)
}

// Seed: 2 overdue (day=1 of current month, already past), rest upcoming
const _overdue1 = new Date(_y, _m - 1, 1).toISOString().slice(0, 10)
const _overdue2 = new Date(_y, _m - 1, 3).toISOString().slice(0, 10)

export const subscriptions: Subscription[] = [
  {
    id: 'sub-netflix',
    name: 'Netflix',
    amount: 260_000,
    type: 'expense',
    categoryId: 'fun',
    accountId: 'tcb-card',
    cadence: 'monthly',
    dayOfMonth: 1,
    monthOfYear: 1,
    nextDueDate: _overdue1,
    note: 'Gói Premium 4K',
    active: true,
  },
  {
    id: 'sub-spotify',
    name: 'Spotify',
    amount: 59_000,
    type: 'expense',
    categoryId: 'fun',
    accountId: 'momo',
    cadence: 'monthly',
    dayOfMonth: 3,
    monthOfYear: 1,
    nextDueDate: _overdue2,
    active: true,
  },
  {
    id: 'sub-icloud',
    name: 'iCloud 200GB',
    amount: 49_000,
    type: 'expense',
    categoryId: 'bills',
    accountId: 'tcb-card',
    cadence: 'monthly',
    dayOfMonth: 15,
    monthOfYear: 1,
    nextDueDate: nextDue(15),
    active: true,
  },
  {
    id: 'sub-domain',
    name: 'Tên miền .com',
    amount: 350_000,
    type: 'expense',
    categoryId: 'bills',
    accountId: 'tcb-card',
    cadence: 'yearly',
    dayOfMonth: 20,
    monthOfYear: 8,
    nextDueDate: nextDue(20, 8),
    note: 'Gia hạn hàng năm',
    active: true,
  },
  {
    id: 'sub-chatgpt',
    name: 'ChatGPT Plus',
    amount: 500_000,
    type: 'expense',
    categoryId: 'bills',
    accountId: 'tcb-card',
    cadence: 'monthly',
    dayOfMonth: 22,
    monthOfYear: 1,
    nextDueDate: nextDue(22),
    active: true,
  },
  {
    id: 'sub-gym',
    name: 'Thẻ phòng gym',
    amount: 450_000,
    type: 'expense',
    categoryId: 'health',
    accountId: 'vcb',
    cadence: 'monthly',
    dayOfMonth: 28,
    monthOfYear: 1,
    nextDueDate: nextDue(28),
    active: false,
  },
]

function daysAgo(n: number, h = 9, m = 30): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

let idc = 0
const tx = (t: Omit<Transaction, 'id'>): Transaction => ({ id: `tx-${++idc}`, ...t })

export const transactions: Transaction[] = [
  tx({ type: 'income', amount: 25_000_000, categoryId: 'salary', accountId: 'vcb', merchant: 'Công ty TNHH ABC', note: 'Lương tháng', date: daysAgo(0, 8, 0) }),
  tx({ type: 'expense', amount: 65_000, categoryId: 'food', accountId: 'cash', merchant: 'Bún bò Huế', date: daysAgo(0, 7, 45) }),
  tx({ type: 'expense', amount: 35_000, categoryId: 'transport', accountId: 'momo', merchant: 'Grab Bike', date: daysAgo(0, 8, 20) }),
  tx({ type: 'expense', amount: 89_000, categoryId: 'food', accountId: 'momo', merchant: 'Highlands Coffee', note: 'Cà phê họp', date: daysAgo(0, 14, 10) }),
  tx({ type: 'expense', amount: 1_250_000, categoryId: 'shopping', accountId: 'tcb-card', merchant: 'Uniqlo Vincom', note: 'Áo khoác', date: daysAgo(1, 19, 30) }),
  tx({ type: 'expense', amount: 320_000, categoryId: 'food', accountId: 'tcb-card', merchant: 'Pizza 4P\'s', date: daysAgo(1, 20, 0) }),
  tx({ type: 'transfer', amount: 3_000_000, categoryId: null, accountId: 'vcb', toAccountId: 'cash', merchant: 'Rút tiền mặt', date: daysAgo(1, 10, 0) }),
  tx({ type: 'expense', amount: 450_000, categoryId: 'bills', accountId: 'vcb', merchant: 'EVN Hà Nội', note: 'Tiền điện', date: daysAgo(2, 9, 0) }),
  tx({ type: 'expense', amount: 180_000, categoryId: 'bills', accountId: 'vcb', merchant: 'Viettel', note: 'Internet', date: daysAgo(2, 9, 5) }),
  tx({ type: 'expense', amount: 120_000, categoryId: 'fun', accountId: 'momo', merchant: 'CGV Cinemas', note: 'Vé xem phim', date: daysAgo(2, 21, 0) }),
  tx({ type: 'expense', amount: 540_000, categoryId: 'health', accountId: 'cash', merchant: 'Nhà thuốc Long Châu', date: daysAgo(3, 11, 0) }),
  tx({ type: 'expense', amount: 75_000, categoryId: 'food', accountId: 'cash', merchant: 'Cơm tấm Sài Gòn', date: daysAgo(3, 12, 15) }),
  tx({ type: 'expense', amount: 240_000, categoryId: 'transport', accountId: 'tcb-card', merchant: 'Đổ xăng Petrolimex', date: daysAgo(3, 18, 0) }),
  tx({ type: 'income', amount: 2_500_000, categoryId: 'other-income', accountId: 'momo', merchant: 'Freelance thiết kế', note: 'Dự án ngoài', date: daysAgo(4, 16, 0) }),
  tx({ type: 'expense', amount: 6_500_000, categoryId: 'home', accountId: 'vcb', merchant: 'Chủ nhà', note: 'Tiền thuê nhà', date: daysAgo(4, 8, 0) }),
  tx({ type: 'expense', amount: 95_000, categoryId: 'food', accountId: 'momo', merchant: 'GrabFood', date: daysAgo(4, 12, 30) }),
  tx({ type: 'expense', amount: 410_000, categoryId: 'shopping', accountId: 'tcb-card', merchant: 'WinMart', note: 'Đi siêu thị', date: daysAgo(5, 17, 0) }),
  tx({ type: 'expense', amount: 60_000, categoryId: 'food', accountId: 'cash', merchant: 'Phở Thìn', date: daysAgo(5, 7, 30) }),
  tx({ type: 'expense', amount: 150_000, categoryId: 'fun', accountId: 'momo', merchant: 'Spotify + Netflix', note: 'Đăng ký tháng', date: daysAgo(6, 9, 0) }),
  tx({ type: 'expense', amount: 28_000, categoryId: 'transport', accountId: 'momo', merchant: 'Gửi xe', date: daysAgo(6, 8, 45) }),
  tx({ type: 'expense', amount: 880_000, categoryId: 'food', accountId: 'tcb-card', merchant: 'Nhà hàng Gogi House', note: 'Sinh nhật bạn', date: daysAgo(7, 19, 0) }),
  tx({ type: 'expense', amount: 1_900_000, categoryId: 'shopping', accountId: 'tcb-card', merchant: 'Shopee', note: 'Đồ gia dụng', date: daysAgo(8, 22, 0) }),
  tx({ type: 'expense', amount: 70_000, categoryId: 'food', accountId: 'cash', merchant: 'Trà sữa Phúc Long', date: daysAgo(9, 15, 0) }),
  tx({ type: 'expense', amount: 350_000, categoryId: 'health', accountId: 'vcb', merchant: 'Phòng khám Đa khoa', date: daysAgo(10, 10, 0) }),
  tx({ type: 'expense', amount: 130_000, categoryId: 'transport', accountId: 'momo', merchant: 'Grab Car', date: daysAgo(11, 20, 0) }),
  tx({ type: 'expense', amount: 220_000, categoryId: 'fun', accountId: 'cash', merchant: 'Karaoke Kingdom', date: daysAgo(12, 21, 30) }),
  tx({ type: 'expense', amount: 480_000, categoryId: 'home', accountId: 'cash', merchant: 'Chợ Hôm', note: 'Đồ ăn tuần', date: daysAgo(13, 8, 0) }),
  tx({ type: 'income', amount: 1_200_000, categoryId: 'other-income', accountId: 'cash', merchant: 'Bán đồ cũ', date: daysAgo(14, 14, 0) }),
]

// 6-month trend sample (income / expense per month) in millions of VND
export const monthlyTrend = [
  { month: 'T1', income: 27.5, expense: 18.2 },
  { month: 'T2', income: 26.0, expense: 21.4 },
  { month: 'T3', income: 28.5, expense: 19.7 },
  { month: 'T4', income: 27.5, expense: 23.1 },
  { month: 'T5', income: 30.0, expense: 20.8 },
  { month: 'T6', income: 27.5, expense: 22.3 },
]
