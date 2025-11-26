# **📊 ScaleX Dashboard Demo**

### ***Modern Marketing Analytics Interface • Fully Responsive • Chart.js Powered***

---

## **🎯 Overview**

**ScaleX Dashboard Demo** is a modern, responsive analytics dashboard crafted for **marketing performance intelligence**.  
 It simulates the UI of a real multi-tenant SaaS analytics platform, featuring:

* KPI cards  
* Smart Alerts  
* Performance overview charts  
* Channel & campaign analytics  
* Export options (PNG \+ PDF)  
* Responsive layouts for mobile/tablet/laptop

Though it uses **sample data today**, the architecture is fully ready for real backend integration (FastAPI → Cloud Run → BigQuery).

---

## **🌐 Live Demo / Hosting**

Deploy seamlessly on **GitHub Pages**, **Vercel**, **Netlify**, or any static hosting service.

---

# **🧭 Project Features**

## **1️⃣ Authentication — Login & Register Pages**

A minimal auth flow with two entry pages:

- **Login Page** → `index.html`  
  Simple email/password form that (for now) redirects to the dashboard on submit.

- **Register Page** → `register.html`  
  Basic signup-style screen designed to be wired later to a real backend (JWT / API-based registration).

Both pages are purely frontend today, but the layout is ready for plugging into a real auth service.

---

## **2️⃣ Dashboard — Performance Overview**

### **📌 KPI Cards**

Each KPI includes:

* Current month value  
* Previous month comparison  
* % change with color-coded deltas  
* Micro trend sparkline

KPIs:

* **Revenue**  
* **Ad Spend**  
* **ROAS**  
* **ROI (%)**

---

### **🔥 Smart Alerts Panel**

Server-driven insights (future):

* Performance Gain  
* Data Quality Alert  
* Attribution Insight

Features:

* Icons (▲ ⚠ ★)  
* Highlights (green/red/sky)  
* Subtext explanations

---

### **📊 10 Performance Charts**

Including:

* CAC Trends  
* Spend→Revenue→ROI→ROAS Funnel  
* Paid Campaign ROI  
* Pipeline Value  
* LTV:CAC Ratio  
* Attribution Accuracy  
* Top Channels by ROAS  
* New vs Repeat Revenue Mix  
   …and more\!

---

### **🖼️ Chart Interactions**

* Fullscreen modal on click  
* PNG & PDF export  
* Smooth animations

---

## **3️⃣ Channel & Campaign Analytics Page**

Contains **8 analytics modules**, such as:

* Channel-wise CPL/CAC/ROAS  
* Campaign ROI bubble chart  
* Touchpoint revenue split  
* Audience ROAS  
* Lead quality scoring  
* Spend efficiency index  
* Creative metric tiles  
* Channel performance table \+ CSV export

---

## **4️⃣ Global Components**

* Sidebar navigation  
* Dynamic page titles  
* Global export (PNG / PDF)  
* Filter section (UI-ready)  
* Fully responsive design

---

# **📁 Project Structure**

`scaletrix-dashboard-demo/`  
`│`  
`├── index.html                  # Login page`  
`├── dashboard.html              # Main dashboard`  
`├── register.html               # Register page`  
`│`  
`├── static/`  
`│  ├── css/`  
`│  │   ├── tailwind.css`  
`│  │   └── dashboard.css       # Custom styles (cards, charts, layout)`  
`│  │`  
`│  ├── js/`  
`│  │   ├── dashboard.js        # Charts, KPIs, Alerts, Exports`  
`│  │`  
`│  ├── img/                    # Logos / Icons`  
`│`  
`└── README.md                  # Will paste this document here`

---

# **🛠️ Tech Stack**

### **Frontend**

* 🌈 TailwindCSS  
* 🧩 Vanilla JavaScript  
* 📊 Chart.js 4  
* 🖼️ html-to-image  
* 📝 jsPDF  
* 🔗 Lucide Icons

### **Backend (future-ready)**

* FastAPI  
* Cloud Run  
* BigQuery  
* Multi-tenant architecture

---

# **🔌 Data Flow (Future Integration)**

### **Today**

`Static Data → dashboard.js → Render Charts`

### **Future**

`Frontend → FastAPI API → Replace sample constants → Render live analytics`

API endpoints expected:

`GET /api/kpi`  
`GET /api/performance-overview`  
`GET /api/channel-analytics`  
`GET /api/smart-alerts`  

---

# **📘 Summary**

ScaleX Dashboard Demo provides:

* High-level marketing performance reporting  
* Deep channel and campaign analytics  
* Exportable interactive visualizations  
* Smart Alerts powered by backend logic  
* A foundation for a production-level SaaS analytics platform

It represents the **front-end analytics layer for the ScaleX360 ecosystem**.

---

# **📡 Data Requirements (Full Spec for Backend Integration)**

Below is the **complete data specification** for every element on the dashboard.

---

# **📄 Page 1 — Performance Overview**

---

## **1️⃣ KPI Cards (Top Summary)**

### **1.1 💰 Revenue KPI**

* **Name:** Total Revenue (Month-to-date)  
* **Type:** KPI card \+ tiny sparkline  
* **Data needed:**  
  * `Daily revenue for the current month (array of numbers, 1 value per day)`  
  * `Daily revenue for the previous month (array of numbers, 1 value per day)`

### **1.2 💸 Ad Spend KPI**

* **Name:** Ad Spend (Month-to-date)  
* **Type:** KPI card \+ tiny sparkline  
* **Data needed:**  
  * `Daily ad spend for the current month`  
  * `Daily ad spend for the previous month`  
  * `(Same structure as revenue)`

### **1.3 📈 ROAS KPI**

* **Name:** ROAS (Return on Ad Spend)  
* **Type:** KPI card \+ tiny sparkline  
* **Data needed:**  
  * `Daily ROAS for the current month`   
  * `Daily ROAS for the previous month`

### **1.4 📊 ROI KPI**

* **Name:** ROI (%)  
* **Type:** KPI card \+ tiny sparkline  
* **Data needed:**  
  * `Daily ROI % for the current month`  
  * `Daily ROI % for the previous month`

---

## **2️⃣ Smart Alerts (Server-Driven)**

Smart Alerts now operate in a **server-driven** model. The backend returns structured insight data, and the frontend renders the alerts with styles (colors, highlights, icons). No calculations occur in the browser.

Below is the format.

### **2.1 ⚡ Performance Gain Alert (Server-Driven)**

**Sample Message:** *"ROAS up 18% MoM — driven mainly by Google campaigns"*

**Data needed:**

* **`Severity`**`: positive (positive | warning | critical | info)`  
* **`Icon`**`: up (mapped to ▲)`  
* **`Main prefix`**`: ROAS up`  
* **`Main highlight`**`: 18% MoM`  
* **`Main suffix`**```: `` (optional)```  
* **`Subtext`**`: Driven by a higher CRM match rate.`

---

### **2.2 ✨ Channel Mix Efficiency Alert (Server-Driven)**

**Sample Message:** *"Shift 10–15% budget from Meta to Google — higher revenue efficiency observed"*

**Data needed:**

* **`Severity`**`: info`  
* **`Icon`**`: star (mapped to ★)`  
* **`Main prefix`**`: Shift`  
* **`Main highlight`**`: 10–15% budget`  
* **`Main suffix`**`: from Meta to Google`  
* **`Subtext`**`: Higher revenue efficiency observed.`  
* **`Channels involved`**`: list of channels over/under-indexing`

---

### **2.3 ⚠️ Budget Reallocation / Risk Alert (Server-Driven)**

**Sample Message:** *"Google spend up 25% but ROAS flat — review campaigns"*

**Data needed:**

* **`Severity`**`: warning`  
* **`Icon`**`: warn (mapped to ⚠)`  
* **`Main prefix`**`: Google spend up`  
* **`Main highlight`**`: 25%`  
* **`Main suffix`**`: but ROAS flat`  
* **`Subtext`**`: Review campaigns.`  
* **`Metrics included`**`: spend_change, roas_change`

---

## **3️⃣ Performance Overview Charts**

### **3.1 🔄 Spend → Revenue → ROI → ROAS Funnel**

* **Name:** Spend → Revenue → ROI → ROAS (Meta vs Google vs LinkedIn)  
* **Type:** Grouped bar with dual axis (money \+ %)  
* **Data needed (per channel: Meta, Google, LinkedIn):**  
  * **`Spend`** `(total, in ₹) for the selected period`  
  * **`Revenue`** `(total, in ₹) for the selected period`  
  * **`ROAS`** `(ratio, e.g. 3.1x)`  
  * **`ROI`** `(ratio, e.g. 2.1x, used as 210%)`

---

### **3.2 📉 Blended CAC vs Paid CAC**

* **Name:** Blended CAC vs Paid CAC (Trend)  
* **Type:** 2-line series over months  
* **Data needed:**  
  * `Time labels (e.g. months: [May, Jun, Jul, Aug, Sep, Oct])`  
  * **`Blended CAC`** `per period (all channels)`  
  * **`Paid CAC`** `per period (only paid channels)`

---

### **3.3 📈 CAC Trend — Meta / Google / LinkedIn**

* **Name:** CAC Trend – Meta · Google · LinkedIn  
* **Type:** 3 line series  
* **Data needed:**  
  * `Same time labels as above`  
  * **`CAC per channel per period`**`:`  
    * `Meta CAC`  
    * `Google CAC`  
    * `LinkedIn CAC`

---

### **3.4 🎯 Paid Campaign ROI by Stage**

* **Name:** Paid Campaign ROI (%) by Stage  
* **Type:** Grouped bar chart (stages on X, channels as bars)  
* **Data needed:**  
  * `Stages: [Lead, MQL, SQL, Converted]`  
  * `For each stage and channel (Meta, Google, LinkedIn):`  
    * `ROI % (e.g. 210%)`

---

### **3.5 🪜 Pipeline Value Attributed to Marketing**

* **Name:** Pipeline Value Attributed to Marketing  
* **Type:** Horizontal bar chart  
* **Data needed:**  
  * `Time labels (months/quarters)`  
  * `For each period:`  
    * **`Marketing-influenced pipeline value`** `(in ₹)`

---

### **3.6 🧮 LTV:CAC Ratio Card**

* **Name:** LTV: CAC Ratio  
* **Type:** Single card (no chart)  
* **Data needed:**  
  * **`Average LTV per customer`** `(in ₹)`  
  * **`Average CAC`** `(in ₹)`  
  * `Status flag: healthy, warning, at_risk based on threshold`

---

### **3.7 📦 Customer LTV by Cohort**

* **Name:** Customer Lifetime Value by Cohort  
* **Type:** Horizontal bar chart  
* **Data needed:**  
  * `Cohort labels (e.g. Q1 2025, Q2 2025, ...)`  
  * `Average LTV for each cohort (in ₹)`

---

### **3.8 🎛 Attribution Accuracy Rate**

* **Name:** Attribution Accuracy Rate (vs baseline)  
* **Type:** 2-line series (baseline vs actual)  
* **Data needed:**  
  * `Time labels (months)`  
  * **`Baseline accuracy %`** `per period`  
  * **`Actual model accuracy %`** `per period (ScaleX)`

---

### **3.9 ⭐ Top Performing Channels by ROAS**

* **Name:** Top Performing Channels by ROAS  
* **Type:** Horizontal bar chart  
* **Data needed:**  
  * `Channel labels`  
  * `ROAS value per channel (ratio, e.g. 3.7x)`

---

### **3.10 🔁 New vs Repeat Revenue Mix**

* **Name:** New vs Repeat Revenue Mix  
* **Type:** 100% stacked bar chart by month  
* **Data needed (per period):**  
  * `Month labels (e.g. May–Oct)`  
  * **`Percentage of revenue from new customers`**  
  * **`Percentage of revenue from repeat customers`**  
  * `(for tooltips):`  
    * `Revenue from new customers (in Lakhs)`  
    * `Revenue from repeat customers (in Lakhs)`

---

# **📄 Page 2 — Channel & Campaign Analytics**

---

### **1.1 💹 Channel-wise CPL · CAC · ROAS**

* **Name:** Channel-wise CPL · CAC · ROAS  
* **Type:** Horizontal grouped bar (dual logical axis: ₹ vs ROAS)  
* **Data needed (per channel):**  
  * `Channel name (Meta Ads, Google Ads, LinkedIn, etc.)`  
  * **`CPL`** `– Cost per Lead (in ₹)`  
  * **`CAC`** `– Customer Acquisition Cost (in ₹)`  
  * **`ROAS`** `– Return on Ad Spend (ratio, e.g. 3.1)`

---

### **1.2 🫧 Campaign ROI & Incremental ROAS (Bubble Chart)**

* **Name:** Campaign ROI & Incremental ROAS  
* **Type:** Bubble chart  
* **Data needed (per campaign):**  
  * `Campaign name (e.g. Meta – Lead Gen)`  
  * `Channel name (Meta/Google/LinkedIn)`  
  * **`ROI %`** `(X-axis)`  
  * **`Spend`** `(Y-axis, in Lakhs or ₹)`  
  * **`Revenue`** `(used for bubble size, in Lakhs or ₹)`  
  * **`Incremental ROAS %`** `vs baseline (for tooltip)`

---

### **1.3 🔀 Touchpoint Revenue Split**

* **Name:** Touch-Point Revenue Split  
* **Type:** Stacked bar chart (% share)  
* **Data needed (per channel):**  
  * `Channel label (Meta Ads, Google Ads, Direct, etc.)`  
  * **`First-touch revenue share %`**  
  * **`Mid-touch revenue share %`**  
  * **`Last-touch revenue share %`**  
  * `(Each row should sum to ~100%)`

---

### **1.4 👥 Audience Segment ROAS**

* **Name:** Audience Segment ROAS  
* **Type:** Horizontal bar chart  
* **Data needed (per audience segment):**  
  * `Segment label (New Visitors, Repeat Buyers, CRM Lookalike, Remarketing, etc.)`  
  * `ROAS (ratio, e.g. 3.3x)`

---

### **1.5 📏 Lead Quality Score**

* **Name:** Lead Quality Score by Channel  
* **Type:** Horizontal bar chart (0–100 scale)  
* **Data needed (per channel):**  
  * `Channel label`  
  * `Lead quality score (0–100), derived from CRM outcomes`

---

### **1.6 📊 Spend Efficiency Index**

* **Name:** Spend Efficiency Index by Channel  
* **Type:** Grouped bar chart (Spend % vs Revenue %)  
* **Data needed (per channel):**  
  * `Channel label`  
  * **`Spend share %`** `of total budget`  
  * **`Revenue share %`** `of total revenue`  
  * `(We derive “Index = Revenue% − Spend%” for tooltip)`

---

### **1.7 🎨 Creative Performance Tiles**

* **Name:** Creative Performance (CTR, CPC, Engagement)  
* **Type:** 3 metric tiles (no chart)  
* **Data needed:**  
  * **`CTR tile:`**  
    * `Latest CTR % (e.g. 3.4%)`  
    * `Change vs previous period (in percentage points, e.g. +0.6pp)`  
    * `Direction (up / down)`  
  * **`CPC tile:`**  
    * `Latest CPC (in ₹)`  
    * `Change vs previous period (in %, e.g. -12%)`  
    * `Direction (up / down)`  
  * **`Engagement tile:`**  
    * `Latest engagement rate %`  
    * `Change vs previous period (in percentage points)`  
    * `Direction (up / down)`

---

### **1.8 📋 Channel Performance Snapshot Table**

* **Name:** Channel Performance Snapshot  
* **Type:** Data table \+ CSV download  
* **Data needed (per channel row):**  
  * `Channel name`  
  * **`Spend`** `(in ₹)`  
  * **`Revenue`** `(in ₹)`  
  * **`CPL`** `(in ₹)`  
  * **`CAC`** `(in ₹)`  
  * **`ROAS`** `(ratio, e.g. 3.1)`  
  * **`ROI`** `(%)`  
  * **`Lead quality score`** `(0–100)`  
* Data will be exported exactly with these columns in the CSV.