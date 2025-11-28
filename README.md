<<<<<<< HEAD
# Rehmat Dairy - Quick Start Guide

## ✅ Fixed Issues

1. **Tools Dashboard** - Now shows a proper landing page with cards for each tool
2. **Milk Entry (Cow/Buffalo)** - Added helpful message with link to add customers when none exist
3. **All forms are working** - Date, Shift selectors, and input fields are all functional

## 🚀 Getting Started

### Step 1: Add Customers First
Before entering milk data, you need to add customers:
1. Click **"Users"** in the sidebar
2. Click **"Add Customer"**
3. Fill in:
   - Customer ID (e.g., 1, 2, 3)
   - Name
   - Phone (optional)
   - Rate (PKR per liter)
4. Click **"Save"**

### Step 2: Enter Milk Data
Once you have customers:
1. Go to **"Cow Milk"** or **"Buffalo Milk"**
2. Select the **Date**
3. Select the **Shift** (Morning/Evening)
4. Enter quantities for each customer
5. Click **"Save All"**

### Step 3: View Reports
- **Daily Record**: View and download PDF of daily milk collection
- **Monthly Record**: Generate date-range reports and export to Excel

### Step 4: Use Tools
Click **"Tools"** in the sidebar to access:
- **Purchasing**: Create and manage purchase orders
- **Issue Payments**: Manage employee payments
- **Consumption**: Track item consumption
- **Notes**: Keep farm notes

## 📝 Important Notes

- The app is running at: http://localhost:3000
- All data is stored in Firebase Firestore
- PDF exports work for Daily Records and PO documents
- Excel exports work for Monthly Records

## 🐛 If You See Errors

1. **"No customers found"** - Add customers in the Users section first
2. **Firebase errors** - Check your `.env.local` file has correct credentials
3. **Page not loading** - Refresh the browser or restart the dev server

Enjoy managing your dairy farm! 🐄🥛
=======
Farm Management System — User Guide
A step-by-step manual to use all features of the Farm Management System.
Quick Navigation
• Getting Started
• Milk Management
• Customer Management
• Daily & Monthly Records
• Financial Management
• Animal Inventory
• Medical Records
• Tools: Purchasing
• Tools: Payments
• Tools: Consumption
• Tools: Notes
• Security (MPIN)
• Tips & Best Practices
1. Getting Started
Follow these steps to log in, secure quick access, and navigate the dashboard.
1 Step 1: Open the app and enter your registered email address and password on the login screen.
2 Step 2: If you prefer quick access, click the 'Use MPIN' option on the login screen (after you set it up).
3 Step 3: To set or change your MPIN: open the left sidebar → click 'Set MPIN' → enter a 4-digit PIN →
confirm.
4 Step 4: Use the left sidebar menu to access modules like Milk, Users, Records, Tools, and Settings.
5 Step 5: If you forget your MPIN, reset it from the sidebar by choosing 'Reset MPIN' and re-enter your
credentials.
2. Milk Management
Record, edit, and export milk production entries for cows and buffaloes.
1 Step 1: From the left sidebar select 'Cow Milk' or 'Buffalo Milk' depending on the animal.
2 Step 2: Click the 'Add Entry' button to open the milk entry form.
3 Step 3: Fill the entry form fields: • Customer name: Select an existing customer or add a new
customer inline. • Quantity (liters): Enter a numeric value (decimals allowed). • Date: Use the date
picker to choose the production date (defaults to today).
4 Step 4: Optional: Add notes or tags if your system supports them (e.g., 'Morning', 'Evening').
5 Step 5: Click 'Save' or 'Submit' to store the entry. A confirmation message should appear.
6 Step 6: To edit an entry: find the row in the table and click 'Edit', update fields, then 'Save'.
7 Step 7: To delete an entry: click 'Delete' on the row. Deletion may require MPIN confirmation for
security.
8 Step 8: Use filters above the table to search by customer name, date range, or tags.
9 Step 9: Export milk records by clicking 'Export' → choose Excel (XLSX) to generate a downloadable
file.
3. Customer Management
Create and manage customers, rates, and payments.
1 Step 1: Open 'Users' (or 'Customers') from the sidebar to view the customer list.
2 Step 2: Click 'Add Customer' to open the customer form and provide: Full name, Contact number,
Address (optional).
3 Step 3: Set milk rates: enter separate rates for Cow Milk and Buffalo Milk so billing calculates
correctly.
4 Step 4: Save the customer. The customer now appears in dropdowns across milk entry forms.
5 Step 5: To view a customer's summary: click the customer's name to open a detailed page with total
milk supplied, rates, and payment balance.
6 Step 6: To record a payment: on the customer's page click 'Record Payment' → enter amount,
payment date, and payment method → Save.
7 Step 7: The system updates the customer's debit/credit balance. Review payment history in the same
panel.
4. Daily & Monthly Records
Use daily and monthly records to track production and performance over time.
1 Step 1: Open 'Daily Record' to view entries for a single date; typically the page loads showing today's
records.
2 Step 2: Each daily entry groups milk amounts by animal type and customer; use the table to inspect
details.
3 Step 3: Open 'Monthly Record' to see aggregated totals for a selected month.
4 Step 4: Use the month picker to choose month/year and click 'Load' to get summaries for that period.
5 Step 5: Monthly summaries show total liters, total sales, and revenue. Use these to monitor trends.
6 Step 6: Apply filters (customer, date range) to refine which records are included in exports.
7 Step 7: Export daily or monthly records to PDF or Excel via 'Export' buttons for reporting or backups.
5. Financial Management
Track cash flows, income, and expenses; categorize expenses for accurate accounting.
1 Step 1: Open 'Cash' or 'Finance' module to view cash inflows and outflows.
2 Step 2: To add income: click 'Add Income', describe the source (e.g., Milk Sales), enter amount and
date, then save.
3 Step 3: To log expenses: click 'Add Expense', choose a category (Feed, Medicine, Utilities, Labor),
enter amount, date and note.
4 Step 4: Make sure to tag expenses with the related farm unit or barn if your system supports multiple
units.
5 Step 5: Run finance reports or balance sheets to view net profit/loss for a selected period.
6 Step 6: Export financial data and share it with your accountant or for tax filings using Excel/PDF
export.
6. Animal Inventory
Maintain a register of animals, track status, and update breeding or health details.
1 Step 1: Navigate to 'Tools' → 'Animal Inventory'.
2 Step 2: Click 'Add Animal' and fill in: ID/Tag, Type (Cow/Buffalo/Other), Breed, Date of Birth or Age,
and Current Health Status.
3 Step 3: Assign animals to groups or pens if supported by the app for easier tracking.
4 Step 4: Update an animal's record when there are changes (sold, died, moved, or bred).
5 Step 5: Use inventory reports to see total counts by type, breed, and status.
7. Medical Records
Keep clear, time-stamped medical histories for every animal.
1 Step 1: Open 'Tools' → 'Medical' to access medical logs and reminders.
2 Step 2: Add a medical entry: choose animal, record vaccination/treatment details, medicine name,
dosage, administering vet, and date.
3 Step 3: Attach notes for observations or next steps (e.g., 'check in 7 days').
4 Step 4: Schedule reminders for upcoming vaccinations or follow-ups and enable notifications if
available.
5 Step 5: Track medicine stock levels to know when to reorder (medicine inventory integration).
8. Tools — Purchasing
Create and manage purchase orders for supplies and vendor management.
1 Step 1: Open 'Tools' → 'Purchasing' and click 'New Purchase Order' (PO).
2 Step 2: Enter vendor details, list of items, quantities, unit prices, and expected delivery date.
3 Step 3: Save the PO: initial status is usually 'Pending'. Update to 'Received' when goods arrive.
4 Step 4: To change or cancel a PO, use 'Edit' or 'Delete' (these actions may require MPIN
authorization).
5 Step 5: Review vendor history and total purchase amounts to evaluate supplier performance.
9. Tools — Payments
Manage employee salaries and payments efficiently.
1 Step 1: Go to 'Tools' → 'Payments' and click 'Add Employee' to create a staff profile (Name, Role,
Salary).
2 Step 2: To issue payment: select the employee → click 'Issue Payment' → enter amount and payment
date → Save.
3 Step 3: Mark payment status as 'Pending' or 'Received' to keep payroll up to date.
4 Step 4: View the employee payment history to reconcile accounts and prepare payroll reports.
5 Step 5: Export payments data to Excel for payroll or auditing purposes.
10. Tools — Consumption
Log usage of feed, medicine, and supplies to monitor inventory depletion.
1 Step 1: Navigate to 'Tools' → 'Consumption'.
2 Step 2: Click 'Add Consumption' and specify the item name, quantity used, unit (kg, liters), date, and
notes.
3 Step 3: Link consumption entries to animals or pens if applicable to trace usage patterns.
4 Step 4: Run consumption reports to identify high-usage items and optimize ordering schedules.
5 Step 5: Export consumption logs to PDF for record-keeping.
11. Tools — Notes
Record important reminders, SOPs, or observations for team members.
1 Step 1: Go to 'Tools' → 'Notes' and click 'Create Note'.
2 Step 2: Add a Title/Topic, write a clear description, and choose a date (default is today).
3 Step 3: Use remarks to add follow-up actions or assign responsibility to a staff member.
4 Step 4: Keep notes organized by date and topic so team members can find them easily.
5 Step 5: Export notes to PDF for handover or compliance documentation.
12. Security — MPIN
MPIN is a 4-digit code for quick login and protection of sensitive actions.
1 Step 1: Open the sidebar and click 'Set MPIN'. Enter a 4-digit number and confirm it.
2 Step 2: Use MPIN for quick login: on the login screen choose 'Use MPIN' and enter your PIN.
3 Step 3: MPIN may be required when performing sensitive actions like deleting records — you will be
prompted to enter it.
4 Step 4: If you suspect your MPIN is compromised, reset it immediately via the sidebar 'Reset MPIN'
option.
5 Step 5: Remember to store your MPIN securely and do not share it with others.
13. Tips & Best Practices
• Regularly backup your data by exporting to Excel or PDF at least weekly.
• Set different milk rates for cows and buffaloes per customer to ensure correct billing.
• Use search and filter functions to locate entries quickly; use date ranges to narrow results.
• Keep your MPIN secret and change it periodically for added security.
• Record customer payments promptly to maintain correct balance tracking.
• Review monthly records to spot trends, seasonal changes, and opportunities for improvement.
• Log expenses immediately to keep financial reports accurate and avoid missing deductions.
For additional help, contact support at: support@example.com or consult the in-app Help Center.
>>>>>>> 57e33c11d4d972c13cf59442880c8debd5b7f7ef
