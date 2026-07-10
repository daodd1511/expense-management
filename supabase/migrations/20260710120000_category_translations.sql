-- System category translations (per specs/system-category-translations/PLAN.md).
-- Only system categories (owner_id is null) get localized display names;
-- custom categories keep their stored `name` unchanged. `categories.name`
-- remains the canonical English label and fallback.

create table category_translations (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  locale text not null check (locale in ('vi', 'en')),
  name text not null,
  unique (category_id, locale)
);

-- Vietnamese seed for every existing system category matched below. Names in
-- the seed are globally unique except 'Balance Adjustment' (one expense row,
-- one income row), handled separately below. Per PLAN.md, the database
-- enforces uniqueness but not language completeness — a system category
-- whose name isn't recognized here is silently skipped (no `vi` row) rather
-- than failing the migration; the API falls back to `categories.name` for it.
insert into category_translations (category_id, locale, name)
select id, 'vi', translated
from (
  select id, case name
  when 'Food & Dining' then 'Ăn uống'
  when 'Transport' then 'Di chuyển'
  when 'Housing' then 'Nhà ở'
  when 'Bills & Utilities' then 'Hóa đơn & Tiện ích'
  when 'Entertainment' then 'Giải trí'
  when 'Dating' then 'Hẹn hò'
  when 'Health' then 'Sức khỏe'
  when 'Shopping' then 'Mua sắm'
  when 'Education' then 'Giáo dục'
  when 'Pet' then 'Thú cưng'
  when 'Gifts & Charity' then 'Quà tặng & Từ thiện'
  when 'Other' then 'Khác'
  when 'Salary' then 'Lương'
  when 'Investment' then 'Đầu tư'
  when 'Business' then 'Kinh doanh'
  when 'Other Income' then 'Thu nhập khác'
  when 'Restaurant' then 'Nhà hàng'
  when 'Coffee' then 'Cà phê'
  when 'Groceries' then 'Tạp hóa'
  when 'Food Delivery' then 'Giao đồ ăn'
  when 'C-Store' then 'Cửa hàng tiện lợi'
  when 'Gas' then 'Xăng'
  when 'Grab/Taxi' then 'Grab/Taxi'
  when 'Parking' then 'Gửi xe'
  when 'Car Maintenance' then 'Bảo dưỡng xe'
  when 'Public Transit' then 'Phương tiện công cộng'
  when 'Rent' then 'Tiền thuê nhà'
  when 'Repairs' then 'Sửa chữa'
  when 'Furniture' then 'Nội thất'
  when 'Electricity' then 'Tiền điện'
  when 'Water' then 'Tiền nước'
  when 'Internet' then 'Internet'
  when 'Phone' then 'Điện thoại'
  when 'Streaming' then 'Dịch vụ streaming'
  when 'Travel' then 'Du lịch'
  when 'Movies' then 'Phim ảnh'
  when 'Games' then 'Trò chơi'
  when 'Books/Music' then 'Sách/Âm nhạc'
  when 'Food' then 'Ăn uống'
  when 'Doctor' then 'Bác sĩ'
  when 'Medicine' then 'Thuốc'
  when 'Health Insurance' then 'Bảo hiểm sức khỏe'
  when 'Gym' then 'Phòng gym'
  when 'Sports' then 'Thể thao'
  when 'Clothing' then 'Quần áo'
  when 'Electronics' then 'Đồ điện tử'
  when 'Cosmetics' then 'Mỹ phẩm'
  when 'Household Items' then 'Đồ gia dụng'
  when 'Tuition' then 'Học phí'
  when 'Books/Supplies' then 'Sách/Dụng cụ học tập'
  when 'Courses' then 'Khóa học'
  when 'Pet Food' then 'Thức ăn thú cưng'
  when 'Vet' then 'Thú y'
  when 'Grooming' then 'Chăm sóc lông'
  when 'Gifts' then 'Quà tặng'
  when 'Charity' then 'Từ thiện'
  when 'Base Salary' then 'Lương cơ bản'
  when 'Bonus' then 'Thưởng'
  when 'Savings Interest' then 'Lãi tiết kiệm'
  when 'Dividends' then 'Cổ tức'
  when 'Sales Revenue' then 'Doanh thu bán hàng'
  when 'Freelance' then 'Việc tự do'
  when 'Refund' then 'Hoàn tiền'
  when 'Winnings' then 'Trúng thưởng'
  when 'Gift Received' then 'Quà tặng nhận được'
  end as translated
  from categories
  where owner_id is null and name <> 'Balance Adjustment'
) matched
where translated is not null;

insert into category_translations (category_id, locale, name)
select id, 'vi', 'Điều chỉnh số dư'
from categories
where owner_id is null and name = 'Balance Adjustment';
