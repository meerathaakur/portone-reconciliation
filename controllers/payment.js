const pool = require("../config/db.config.js");
const readline = require("readline")
const fs = require("fs")
const csvParser = require("csv-parser");
const {insertRecords} = require("./records.js");


const expectedHeaders = [
    "date/time", "settlement id", "type", "order id", "sku", "description", "quantity",
    "marketplace", "account type", "fulfillment", "tax collection model", "product sales",
    "product sales tax", "shipping credits", "shipping credits tax", "gift wrap credits",
    "giftwrap credits tax", "regulatory fee", "tax on regulatory fee", "promotional rebates",
    "promotional rebates tax", "marketplace withheld tax", "selling fees", "fba fees",
    "other transaction fees", "other", "total"
].map(h => h.toLowerCase().trim());

const uploadPaymentData = async (req, res) => {
    const maxRows = parseInt(req.query.limit) || 100
    let count = 0
    if (!req.file) return res.status(400).send("CSV file not uploaded.")

    const filePath = req.file.path;
    console.log("✅ File uploaded and ready for parsing");

    try {
        const client = await pool.connect()
        const results = []
        let headerFound = false;
        let parsedHeaders = []

        const rl = readline.createInterface({
            input: fs.createReadStream(filePath),
            crlfDelay: Infinity,

        })

        rl.on("line", (line) => {
            if (!headerFound && line.includes("date/time")) {
                parsedHeaders = line.split(",").map((h) => h.trim().toLowerCase())
                const match = expectedHeaders.every(h => parsedHeaders.includes(h))
                if (match) {
                    headerFound = true;
                    rl.close() //headers found stop reading lines
                }
            }
        })

        rl.on("close", () => {
            if (!headerFound) {
                fs.unlinkSync(filePath)
                return res.status(400).send("No valid header found in CSV.")
            }

            fs.createReadStream(filePath)
                .pipe(csvParser({
                    skipLines: 7,
                    mapHeaders: ({ header }) => header.toLowerCase().trim()
                }))
                .on("data", (row) => {
                    // console.log("Row keys:", Object.keys(row))
                    if (count >= maxRows) return
                    results.push({
                        order_id: row["order id"],
                        settlement_id: row["settlement id"],
                        date: new Date(row["date/time"]),
                        type: row["type"],
                        sku: row["sku"],
                        quantity: parseInt(row["quantity"]) || 0,
                        product_sales: parseFloat(row["product sales"]) || 0,
                        product_sales_tax: parseFloat(row["product sales tax"]) || 0,
                        shipping_credits: parseFloat(row["shipping credits"]) || 0,
                        shipping_credits_tax: parseFloat(row["shipping credits tax"]) || 0,
                        total_amount: parseFloat(row["total"]) || 0,
                        raw_data: row,
                    });
                    count++
                })
                .on("end", async () => {
                    console.log("✅ Rows prepared for DB insertion:", results.length);
                    try {
                        const insertQuery = `
                        INSERT INTO payment_data
                        (order_id, settlement_id, date, type, sku,quantity,
                        product_sales, product_sales_tax, shipping_credits,
                        shipping_credits_tax, total_amount, raw_data)
                        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
                        `;

                        for (const rec of results) {
                            await client.query(insertQuery, [
                                rec.order_id,
                                rec.settlement_id,
                                rec.date,
                                rec.type,
                                rec.sku,
                                rec.quantity,
                                rec.product_sales,
                                rec.product_sales_tax,
                                rec.shipping_credits,
                                rec.shipping_credits_tax,
                                rec.total_amount,
                                rec.raw_data,
                            ])
                        }
                        await insertRecords(results,"payments")
                        console.log("payment_data.csv imported successfully")
                        res.status(200).send("CSV data uploaded and inserted successfully.")
                    } catch (error) {
                        console.error("Insert error", error)
                        res.send("Database insertion error")
                    } finally {
                        client.release()
                        fs.unlinkSync(filePath) //cleanup
                    }
                });
        });

    } catch (error) {
        console.error("❌ Upload Error:", error);
        res.status(500).send("Server error while uploading.");
    }
}

module.exports = { uploadPaymentData }