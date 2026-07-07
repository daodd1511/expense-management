-- The seed in 20260702053135_category_type_hierarchy.sql gave every child
-- category the same icon as its parent, so a category list rendered as a
-- wall of repeated icons instead of distinguishing categories by name.
-- Assign each system child category (owner_id null) its own name-matching
-- icon; parent icons are unchanged. Matched by name since all category
-- names in the seed are globally unique.

update categories set icon = 'ChefHat' where owner_id is null and name = 'Restaurant';
update categories set icon = 'Coffee' where owner_id is null and name = 'Coffee';
update categories set icon = 'ShoppingCart' where owner_id is null and name = 'Groceries';
update categories set icon = 'Package' where owner_id is null and name = 'Food Delivery';
update categories set icon = 'Store' where owner_id is null and name = 'C-Store';

update categories set icon = 'Fuel' where owner_id is null and name = 'Gas';
update categories set icon = 'Car' where owner_id is null and name = 'Grab/Taxi';
update categories set icon = 'ParkingCircle' where owner_id is null and name = 'Parking';
update categories set icon = 'Wrench' where owner_id is null and name = 'Car Maintenance';
update categories set icon = 'Train' where owner_id is null and name = 'Public Transit';

update categories set icon = 'Home' where owner_id is null and name = 'Rent';
update categories set icon = 'Wrench' where owner_id is null and name = 'Repairs';
update categories set icon = 'Sofa' where owner_id is null and name = 'Furniture';

update categories set icon = 'Zap' where owner_id is null and name = 'Electricity';
update categories set icon = 'Droplet' where owner_id is null and name = 'Water';
update categories set icon = 'Wifi' where owner_id is null and name = 'Internet';
update categories set icon = 'Phone' where owner_id is null and name = 'Phone';
update categories set icon = 'Tv' where owner_id is null and name = 'Streaming';

update categories set icon = 'Plane' where owner_id is null and name = 'Travel';
update categories set icon = 'Clapperboard' where owner_id is null and name = 'Movies';
update categories set icon = 'Joystick' where owner_id is null and name = 'Games';
update categories set icon = 'BookOpen' where owner_id is null and name = 'Books/Music';

update categories set icon = 'Utensils' where owner_id is null and name = 'Food';

update categories set icon = 'Stethoscope' where owner_id is null and name = 'Doctor';
update categories set icon = 'Pill' where owner_id is null and name = 'Medicine';
update categories set icon = 'ShieldCheck' where owner_id is null and name = 'Health Insurance';
update categories set icon = 'Dumbbell' where owner_id is null and name = 'Gym';
update categories set icon = 'Trophy' where owner_id is null and name = 'Sports';

update categories set icon = 'Shirt' where owner_id is null and name = 'Clothing';
update categories set icon = 'Laptop' where owner_id is null and name = 'Electronics';
update categories set icon = 'Sparkles' where owner_id is null and name = 'Cosmetics';
update categories set icon = 'ShoppingCart' where owner_id is null and name = 'Household Items';

update categories set icon = 'Landmark' where owner_id is null and name = 'Tuition';
update categories set icon = 'BookOpen' where owner_id is null and name = 'Books/Supplies';
update categories set icon = 'Presentation' where owner_id is null and name = 'Courses';

update categories set icon = 'PawPrint' where owner_id is null and name = 'Pet Food';
update categories set icon = 'Stethoscope' where owner_id is null and name = 'Vet';
update categories set icon = 'Scissors' where owner_id is null and name = 'Grooming';

update categories set icon = 'Gift' where owner_id is null and name = 'Gifts';
update categories set icon = 'HandCoins' where owner_id is null and name = 'Charity';

update categories set icon = 'Wallet' where owner_id is null and name = 'Base Salary';
update categories set icon = 'BadgeDollarSign' where owner_id is null and name = 'Bonus';

update categories set icon = 'PiggyBank' where owner_id is null and name = 'Savings Interest';
update categories set icon = 'LineChart' where owner_id is null and name = 'Dividends';

update categories set icon = 'ReceiptText' where owner_id is null and name = 'Sales Revenue';
update categories set icon = 'Laptop' where owner_id is null and name = 'Freelance';

update categories set icon = 'Repeat' where owner_id is null and name = 'Refund';
update categories set icon = 'PartyPopper' where owner_id is null and name = 'Winnings';
update categories set icon = 'Gift' where owner_id is null and name = 'Gift Received';
