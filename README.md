# 📦 PortOne Reconciliation System

This project automates the reconciliation of Amazon Payments and Settlement data. It parses raw CSV and TXT files, stores them in a PostgreSQL database, and generates reconciliation reports comparing total amounts per order.


# Input
I use multer for take inputwhich is in data folder p.csv and s.txt

# Output
Response output is in output directory as well (output/reconciliation_data.csv)

# Drive Link
[https://drive.google.com/drive/folders/1jJs-5z0onE-HdP7fk9Pe5tFB1zImJiS_?usp=sharing]

---

## 📁 Table of Contents

- [📦 PortOne Reconciliation System](#-portone-reconciliation-system)
- [📁 Table of Contents](#-table-of-contents)
- [🚀 Getting Started](#-getting-started)
  - [1️⃣ Clone the Repository](#1️⃣-clone-the-repository)
  - [2️⃣ Install Dependencies](#2️⃣-install-dependencies)
- [🛠️ Database Setup](#️-database-setup)
- [🌐 API Endpoints](#-api-endpoints)
  - [📥 Upload Endpoints](#-upload-endpoints)
  - [📊 Report Endpoint](#-report-endpoint)
- [🧪 Running the Server](#-running-the-server)
- [📂 Recommended File Structure](#-recommended-file-structure)
- [✅ Features](#-features)

## 🚀 Getting Started

### 1️⃣ Clone the Repository

 ```bash
    git clone https://github.com/meerathaakur/portone-reconciliation.git
    cd portone-reconciliation

    # install dependencies
    npm init -y
    npm install csv-parser csv-writer dotenv express json2csv multer pg readline sequelize

    # For development
    npm install --save-dev nodemon

    # Database setup - run these cose in your pgAdmin
    CREATE TABLE payments (
        id SERIAL PRIMARY KEY,
        order_id TEXT,
        settlement_id TEXT,
        date TIMESTAMP,
        type TEXT,
        sku TEXT,
        quantity NUMERIC,
        product_sales NUMERIC,
        product_sales_tax NUMERIC,
        shipping_credits NUMERIC,
        shipping_credits_tax NUMERIC,
        total_amount NUMERIC,
        raw_data JSONB
    );

    CREATE TABLE settlement_details (
        id SERIAL PRIMARY KEY,
        settlement_id TEXT,
        transaction_type TEXT,
        order_id TEXT,
        shipment_id TEXT,
        marketplace_name TEXT,
        amount_type TEXT,
        amount_description TEXT,
        amount NUMERIC,
        total_amount NUMERIC,
        fulfillment_id TEXT,
        posted_date DATE,
        posted_datetime TIMESTAMP,
        sku TEXT,
        quantity_purchased INTEGER,
        raw_data JSONB
    );

    CREATE TABLE records (
        id SERIAL PRIMARY KEY,
        source TEXT CHECK (source IN ('payments', 'settlements')),
        order_id TEXT NOT NULL,
        date TIMESTAMP,
        total_amount NUMERIC,
        raw_data JSONB
    );

    CREATE TABLE reconciled_records (
        payments_record_id INT REFERENCES records(id),
        settlements_record_id INT REFERENCES records(id),
        amount_difference NUMERIC,
    );
```

## Running Server
```bash
   # Development mode
    npm run dev 
    nodemon server.js

    # Production mode
    npm start
    node server.js
```

# File Structure
```bash
portone-reconciliation/
│
├── config/
│   └── db.config.js
│
├── controllers/
│   ├── paymentsController.js
│   ├── settlementsController.js
│   └── reportController.js
│
├── routes/
│   ├── payments.js
│   ├── settlements.js
│   └── report.js
│
├── scripts/
│   ├── ingestPayments.js
│   ├── ingestSettlements.js
│   └── reconcile.js
│
├── uploads/
│   └── (Uploaded raw files)
│
├── .env
├── server.js
└── README.md
```

* End Points
```bash
# Payment API
- http://localhost:8080/api/payments/upload

# Settlement API
- http://localhost:8080/api/settlements/upload?txt

# report API
- http://localhost:8080/api/report
```


* Environment Variables
```bash
    PORT=8080

    # PostgreSQL DB
    DB_HOST=localhost
    DB_PORT=5432
    DB_USER=your_db_user
    DB_PASSWORD=your_db_password
    DB_NAME=reconciliation_db
```

- ⚠️ Note: This setup is intended for smaller file size reconciliation only. For large-scale  datasets, additional optimizations (e.g., streaming + batching + queue workers) are recommended.
