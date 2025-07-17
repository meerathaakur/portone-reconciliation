const pool = require("../config/db.config.js")
const fs = require("fs")
const { Parser } = require("json2csv")


async function insertRecords(recordsArray, source) {
    const client = await pool.connect()

    try {
        const insertQuery = `
        INSERT INTO records
        (source, order_id, date, total_amount, raw_data)
        VALUES
        ($1, $2, $3, $4, $5)
        `;
        for (const rec of recordsArray) {
            await client.query(insertQuery, [
                source,
                rec.order_id,
                rec.date,
                rec.total_amount,
                rec.raw_data
            ])
        }
        console.log(`${source} records inserted: ${recordsArray.length}`)
    } catch (error) {
        console.error(`Error inserting ${source} records:`, error)
        throw error
    } finally {
        client.release()
    }
}

const generateReport = async (req, res) => {
    const client = await pool.connect()

    try {
        const { rows } = await client.query(`
            SELECT
                order_id,
                MAX(CASE WHEN source='payments' THEN total_amount END) AS payments_total,
                MAX(CASE WHEN source='settlement' THEN total_amount END) AS settlement_total
            FROM records
            GROUP BY order_id
            `)
        const reportData = rows.map(row => {
            const payment = parseFloat(row.payments_total) || 0;
            const settlement = parseFloat(row.settlement_total) || 0
            const diff = Math.abs(payment - settlement).toFixed(2)

            return {
                order_id: row.order_id,
                status: diff === 0 ? "reconciled" : "unreconciled",
                payments_total: payment.toFixed(2),
                settlement_total: settlement.toFixed(2),
                difference: diff
            }
        })

        // convert to CSV
        const parser = new Parser({ fields: ["order_id", "status", "payments_total", "settlements_total", "difference"] })
        const csv = parser.parse(reportData)

        // Write file
        if (!fs.existsSync("output")) fs.mkdirSync("output")
        const filePath = "output/reconciliation_report.csv"
        fs.writeFileSync(filePath, csv)

        console.log("Data reconciliation done")
        res.download(filePath, (err) => {
            if (err) {
                console.error("Download failed", err);
            } else {
                fs.unlinkSync(filePath); // Delete the file after download
            }
        });
    } catch (error) {
        console.error("❌ Error generating report:", error);
        res.status(500).send("Failed to generate report.");
    } finally {
        client.release()
    }
}



module.exports = { insertRecords, generateReport }