const pool = require("../config/db.config.js");
const readline = require("readline");
const fs = require("fs");
const csvParser = require("csv-parser"); // Used for TSV too
const { insertRecords } = require("./records.js");

const expectedHeaders = [
  "settlement-id", "transaction-type", "order-id", "shipment-id",
  "marketplace-name", "amount-type", "amount-description", "amount", "total-amount",
  "fulfillment-id", "posted-date", "posted-date-time", "sku",
  "quantity-purchased"
].map(h => h.toLowerCase().trim());

const uploadSettlementData = async (req, res) => {
  const maxRows = Math.min(parseInt(req.query.limit) || 100, 1000);
  let count = 0;

  if (!req.file) return res.status(400).send("TXT file not uploaded.");
  const filePath = req.file.path;
  console.log("✅ File uploaded and ready for TSV parsing");

  try {
    const client = await pool.connect();
    let results = [];
    const batchSize = 1000;
    let headerFound = false;
    let parsedHeaders = [];

    const rl = readline.createInterface({
      input: fs.createReadStream(filePath),
      crlfDelay: Infinity,
    });

    rl.on("line", (line) => {
      if (!headerFound && line.includes("settlement-id")) {
        parsedHeaders = line.split("\t").map((h) => h.trim().toLowerCase());
        const match = expectedHeaders.every(h => parsedHeaders.includes(h));
        if (match) {
          headerFound = true;
          rl.close();
        }
      }
    });

    rl.on("close", () => {
      if (!headerFound) {
        fs.unlinkSync(filePath);
        return res.status(400).send("No valid header found in TXT.");
      }

      fs.createReadStream(filePath)
        .pipe(csvParser({
          separator: "\t",
          mapHeaders: ({ header }) => header.toLowerCase().trim(),
        }))
        .on("data", async (row) => {
          if (count >= maxRows) return;

          const amount = parseFloat(row["amount"]) || 0;
          const quantity = parseInt(row["quantity-purchased"]) || 0;

          results.push({
            settlement_id: row["settlement-id"],
            transaction_type: row["transaction-type"],
            order_id: row["order-id"],
            shipment_id: row["shipment-id"],
            marketplace_name: row["marketplace-name"],
            amount_type: row["amount-type"],
            amount_description: row["amount-description"],
            amount,
            total_amount: amount * quantity,
            fulfillment_id: row["fulfillment-id"],
            posted_date: row["posted-date"],
            posted_datetime: new Date(row["posted-date-time"]),
            sku: row["sku"],
            quantity_purchased: quantity,
            raw_data: row,
          });
          if (results.length >= batchSize) {
            await insertBatch(results, client)
            results = []
          }
          count++;
        })
        .on("end", async () => {
          console.log("✅ Rows prepared for DB insertion:", results.length);
          try {
            const insertQuery = `
                            INSERT INTO settlement_data 
                            (
                                settlement_id, 
                                transaction_type, 
                                order_id, 
                                shipment_id,
                                marketplace_name, 
                                amount_type, 
                                amount_description, 
                                amount,
                                total_amount,
                                fulfillment_id, 
                                posted_date, 
                                posted_datetime, 
                                sku,
                                quantity_purchased, 
                                raw_data
                            )
                            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
                        `;

            for (const rec of results) {
              await client.query(insertQuery, [
                rec.settlement_id,
                rec.transaction_type,
                rec.order_id,
                rec.shipment_id,
                rec.marketplace_name,
                rec.amount_type,
                rec.amount_description,
                rec.amount,
                rec.total_amount,
                rec.fulfillment_id,
                rec.posted_date,
                rec.posted_datetime,
                rec.sku,
                rec.quantity_purchased,
                rec.raw_data,
              ]);
            }

            await insertRecords(results, "settlements")
            console.log("✅ TSV data uploaded and inserted successfully");

            res.status(200).send("TXT data uploaded and inserted successfully.");
          } catch (error) {
            console.error("Insert error", error);
            res.status(500).send("Database insertion error.");
          } finally {
            client.release();
            fs.unlinkSync(filePath);
          }
        });
    });

  } catch (error) {
    console.error("❌ Upload Error:", error);
    res.status(500).send("Server error while uploading.");
  }
};


module.exports = { uploadSettlementData };
