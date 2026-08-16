# سند نقشه راه و تفکیک ماژول‌های API هزاردستان (Hazardastan API Map & Modularization Plan)

---

## ۱. هدف سند
این سند ساختار فعلی اندپوینت‌های API را مستند کرده و طرح تفکیک فایل متمرکز `src/api/routes.ts` (شامل ۲۵۰۰ خط) به ماژول‌های تک‌مسئولیتی در طول اسپرینت‌های آینده را تشریح می‌نماید.

---

## ۲. ساختار ماژولار هدف در دایرکتوری `src/api/`

```
src/api/
├── index.ts          <-- ادغام‌کننده مرکزی روت‌ها (Hono Root Router)
├── sources.ts        <-- مدیریت منابع، قوانین استخراج، سلکتورها و Live Sandbox
├── crawler.ts        <-- تریگر دستی خزش، تست فید و مدیریت صف CRAWL_QUEUE
├── articles.ts       <-- دریافت مقالات، بلوک‌های ترتیبی، متادیتای تصاویر و تگ‌ها
├── jobs.ts           <-- چرخه‌های خزش (crawl_jobs)، چک‌پوینت‌ها و لاگ خطاها (crawl_errors)
├── backup.ts         <-- اتصال Google Sheets، تست پینگ، لاگ همگام‌سازی و تولید اسکریپت
└── health.ts         <-- بررسی سلامت D1، سیستم‌عامل، KV و منابع لبه
```

---

## ۳. نگاشت اندپوینت‌های تفکیکی (Endpoint Routing Map)

### ماژول ۱: `sources.ts` (مدیریت منابع و آزمایشگاه استخراج)
* `GET /api/sources`: لیست کلیه منابع همراه با تنظیمات و آخرین وضعیت سلامت.
* `POST /api/sources`: ثبت منبع جدید به همراه رکورد `source_configs` و `crawl_checkpoints`.
* `PUT /api/sources/:id`: ویرایش مشخصات منبع، سلکتورها و قوانین Clean.
* `DELETE /api/sources/:id`: حذف منبع با اثر آبشاری (`ON DELETE CASCADE`).
* `POST /api/sources/test-extraction`: **[Live Sandbox]** تست زنده سلکتورها روی یک URL نمونه بدون درج در دیتابیس.
* `POST /api/sources/:id/toggle`: فعال/غیرفعال‌سازی وضعیت خزش خودکار منبع.

### ماژول ۲: `crawler.ts` (موتور خزش و کنترل صف)
* `POST /api/crawler/trigger`: تریگر فوری چرخه خزش برای تمام منابع فعال یا یک منبع مشخص.
* `POST /api/crawler/test-feed`: تست و اعتبارسنجی فید RSS/Atom/Sitemap قبل از ثبت منبع.
* `GET /api/crawler/queue-status`: مشاهده تعداد پیام‌های در صف و نرخ پردازش.

### ماژول ۳: `articles.ts` (مخزن مقالات و داده‌های ساختاریافته)
* `GET /api/articles`: واکشی لیست مقالات با قابلیت فیلتر بر اساس `source_id`، وضعیت `validation_status` و تاریخ.
* `GET /api/articles/:id`: جزئیات کامل یک مقاله شامل متن پاک‌سازی‌شده، فراداده‌ها و خلاصه.
* `GET /api/articles/:id/blocks`: دریافت بلوک‌های ترتیبی محتوا (`article_blocks`) مرتب‌شده با `order_index`.
* `GET /api/articles/:id/images`: دریافت فراداده‌های تصاویر همراه با نقش (`role`)، ابعاد و کپشن.
* `DELETE /api/articles/:id`: حذف یک مقاله و بلوک‌های متصل.

### ماژول ۴: `jobs.ts` (مانیتورینگ چرخه‌ها و خطاها)
* `GET /api/jobs`: تاریخچه چرخه‌های خزش (`crawl_jobs`) همراه با تعداد کشف، تایید و رد شده.
* `GET /api/jobs/:id`: جزئیات یک چرخه به همراه مدت زمان اجرا (`duration_ms`).
* `GET /api/jobs/:id/errors`: خطاهای تفکیکی ثبت‌شده در جدول `crawl_errors`.
* `GET /api/checkpoints`: وضعیت کرسرهای زمانی و آخرین صفحات اسکن‌شده منابع.

### ماژول ۵: `backup.ts` (هاب پشتیبان‌گیری Google Sheets)
* `GET /api/backup/destinations`: دریافت تنظیمات مقصد پشتیبان‌گیری Google Sheets.
* `POST /api/backup/destinations`: ذخیره و به‌روزرسانی Web App URL و نام شیت در D1.
* `POST /api/backup/test-connection`: ارسال درخواست سلامت‌سنجی (Health Check) به Google Apps Script و محاسبه Latency.
* `POST /api/backup/sync-now`: تریگر همگام‌سازی دستی رکوردهای `pending` به گوگل شیت.
* `GET /api/backup/runs`: تاریخچه لاگ‌های پشتیبان‌گیری و زمان پاسخ‌دهی.

### ماژول ۶: `health.ts` (داشبورد مانیتورینگ سیستم)
* `GET /api/stats`: خلاصه شاخص‌های عملکردی کلیدی (تعداد منابع، مقالات خزش‌شده امروز، نرخ موفقیت، میانگین تاخیر).
* `GET /api/health`: بررسی زنده سلامت ارتباط با D1 و حافظه KV.
* `POST /api/database/seed`: بازنشانی امن و مقداردهی اولیه داده‌های پایه.

---

## ۴. استراتژی اعمال در اسپرینت‌ها
در فاز Sprint 0، فایل `src/api/routes.ts` پایدار نگه داشته شده تا فرانت‌اند به درستی کار کند. در Sprint 1 و همگام با توسعه ویژگی‌ها، اندپوینت‌های بالا به صورت ماژولار پیاده‌سازی و جایگزین خواهند شد.
