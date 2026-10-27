# 🦉 House of Bulbul — Complete Project Guide

> Handmade Wedding Favours & Festive Keepsakes — E-commerce Website + Admin Panel

---

## 📁 Project Structure (File Map)

```
Houseofbulbul/
│
├── index.html              ← 🏠 Main storefront (customer-facing homepage)
├── app.js                  ← 🧠 Frontend logic (products, cart, filters, UI)
├── styles.css              ← 🎨 All storefront styles
├── data.js                 ← 📦 Product & collection data (source of truth)
├── Folder.js / Folder.jsx  ← 🗂️ Collection folder UI component
├── Folder.css              ← 🎨 Folder UI styles
│
├── admin/                  ← 🔐 Admin Panel (password-protected)
│   ├── index.html          ← Admin panel HTML (login + dashboard)
│   ├── admin.js            ← Admin panel logic (products, collections, etc.)
│   └── admin.css           ← Admin panel styles
│
├── api/                    ← ⚙️ Backend (Vercel Serverless Functions)
│   ├── admin/
│   │   ├── auth/
│   │   │   ├── login.js    ← POST /api/admin/auth/login
│   │   │   └── me.js       ← GET  /api/admin/auth/me (verify session)
│   │   ├── products/       ← CRUD for products
│   │   ├── collections/    ← CRUD for collections
│   │   ├── campaigns/      ← Festival campaigns management
│   │   ├── media/          ← Image upload/management
│   │   ├── settings/       ← Site settings (WhatsApp no, colors, etc.)
│   │   ├── users/          ← Admin user management
│   │   └── analytics/      ← View site analytics
│   └── storefront/
│       └── data.js         ← GET /api/storefront/data (public product data)
│
├── lib/                    ← 🔧 Shared backend utilities
│   ├── db.js               ← Database connection (Neon/Postgres)
│   ├── auth.js             ← JWT + bcrypt + role-based access
│   ├── helpers.js          ← CORS, response helpers
│   ├── audit.js            ← Audit log helper
│   └── schema.js           ← Database table definitions (14 tables)
│
├── scripts/
│   └── seed-database.js    ← 🌱 One-time DB setup + data import script
│
├── package.json            ← Dependencies list
├── vercel.json             ← Deployment config for Vercel
├── robots.txt              ← SEO robots file
└── sitemap.xml             ← SEO sitemap
```

---

## 🗄️ Database Tables (14 total)

| Table | Purpose |
|-------|---------|
| `admin_users` | Admin login accounts with roles |
| `products` | All products with images, price, SEO |
| `product_variants` | Size/color/material variants |
| `collections` | Product collections/categories |
| `collection_products` | Which product belongs to which collection |
| `site_settings` | Key-value store (WhatsApp no, colors, etc.) |
| `media` | Uploaded images library |
| `campaigns` | Festival campaigns (Diwali, Navratri, etc.) |
| `page_sections` | Homepage builder sections |
| `navigation` | Header/footer navigation links |
| `url_redirects` | SEO URL redirects |
| `audit_log` | Who changed what and when |
| `enquiries` | Customer enquiry tracking |
| `analytics_events` | Page views, WhatsApp clicks, etc. |

---

## 🔑 Admin Roles

| Role | Can Do |
|------|--------|
| `super_admin` | Everything |
| `product_manager` | Manage products, view analytics & enquiries |
| `content_manager` | Manage collections, campaigns, content |
| `enquiry_manager` | View & manage customer enquiries |

---

## 💻 LOCAL PR CHALANE KA TARIKA (Step by Step)

### Step 1 — Zaruri Software Install Karo

1. **Node.js** install karo (version 18+): https://nodejs.org
   - Download karo, install karo, restart karo
   - Check: `node --version` (18.x ya usse upar aana chahiye)

2. **Vercel CLI** install karo:
   ```bash
   npm install -g vercel
   ```

### Step 2 — Project Folder Open Karo

ZIP extract karo, phir terminal/CMD mein us folder mein jao:
```bash
cd Houseofbulbul
```

### Step 3 — Dependencies Install Karo

```bash
npm install
```

### Step 4 — Free Database Banao (Neon)

1. Jao: https://neon.tech
2. Free account banao (GitHub se bhi login ho sakta hai)
3. **New Project** banao — naam kuch bhi do (e.g. `houseofbulbul`)
4. Project ban ne ke baad **Connection String** copy karo
   - Format kuch aisa hoga:
     ```
     postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
     ```

### Step 5 — Environment Variables Set Karo

Project folder mein `.env.local` naam ki file banao:

```
POSTGRES_URL=postgresql://your-neon-connection-string-here
JWT_SECRET=koi-bhi-random-string-likho-yahan-32-char
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@houseofbulbul.com
ADMIN_PASSWORD=apna-strong-password-yahan
```

> ⚠️ IMPORTANT: Yeh file kabhi share mat karna, kisi ko bhejna mat!

### Step 6 — Database Setup Karo (sirf ek baar)

```bash
node scripts/seed-database.js
```

Yeh karega:
- ✅ 14 tables create karega database mein
- ✅ Products aur collections import karega `data.js` se
- ✅ Admin user banayega

### Step 7 — Local Server Chalaao

```bash
npx vercel dev
```

Pehli baar Vercel login maangega — browser mein link khulega, login karo.

Phir website khulegi:
- 🌐 **Storefront**: http://localhost:3000
- 🔐 **Admin Panel**: http://localhost:3000/admin

### Step 8 — Admin Login

- **URL**: http://localhost:3000/admin
- **Username**: jo aapne `.env.local` mein rakha
- **Password**: jo aapne `.env.local` mein rakha

---

## 🚀 LIVE KARNE KA TARIKA (Vercel pe Deploy)

### Step 1 — Vercel Account Banao

https://vercel.com — free account banao

### Step 2 — Project Deploy Karo

```bash
vercel
```

Follow karo prompts:
- Link to existing project? → **N** (no)
- Project name → `houseofbulbul`
- Directory? → press Enter (current folder)

### Step 3 — Environment Variables Add Karo Vercel Dashboard Mein

1. Vercel dashboard pe jao: https://vercel.com/dashboard
2. Apna project kholо
3. **Settings** → **Environment Variables**
4. Yeh sab add karo:

| Variable | Value |
|----------|-------|
| `POSTGRES_URL` | Neon connection string |
| `JWT_SECRET` | Koi bhi 32+ character random string |

> Production mein `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` nahi chahiye — seed ek baar ho chuka hai

### Step 4 — Production Deploy Karo

```bash
vercel --prod
```

Ya phir Vercel dashboard pe **Redeploy** button dabao.

### Step 5 — Custom Domain (Optional)

Vercel Dashboard → Project → **Settings** → **Domains** → apna domain add karo

---

## ⚠️ Common Errors aur Solutions

| Error | Solution |
|-------|---------|
| `POSTGRES_URL environment variable is not set` | `.env.local` file check karo — connection string sahi likhi hai? |
| `npm command not found` | Node.js install nahi hua — Step 1 dobara karo |
| `vercel: command not found` | `npm install -g vercel` phir se chalao |
| Admin login fail | Seed script chali thi? `.env.local` mein ADMIN_PASSWORD hai? |
| Port 3000 already in use | `npx vercel dev --port 3001` |

---

## 📞 Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | HTML + Vanilla JavaScript + CSS |
| Backend | Vercel Serverless Functions (Node.js) |
| Database | Neon (Serverless PostgreSQL) |
| Auth | JWT (8hr expiry) + bcrypt passwords |
| Deployment | Vercel |
| Images | Hosted externally (URLs in DB) |

---

*Built with ❤️ for House of Bulbul*
