require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { v4: uuidv4 } = require('uuid')
const puppeteer = require('puppeteer')
const pool = require('./db')

const app = express()

app.use(cors({
  origin: [
    'http://localhost:5173',
    process.env.FRONTEND_URL
  ].filter(Boolean)
}))
app.use(express.json({ limit: '10mb' }))

function getPeriodKey(date = new Date()) {
  const year = date.getFullYear().toString().slice(-2)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}${month}`
}

function buildOrderNo(periodKey, runningNumber) {
  return `JX-${periodKey}-${String(runningNumber).padStart(4, '0')}`
}

app.post('/api/receipts', async (req, res) => {
  const {
    customerName,
    totalAmount,
    discount = 0,
    finalAmount,
    paymentMethod = null,
    items = []
  } = req.body

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'ต้องมีรายการสินค้าอย่างน้อย 1 รายการ' })
  }

  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    const periodKey = getPeriodKey()
    const receiptUuid = uuidv4()

    await connection.query(
      `
      INSERT INTO order_counters (period_key, last_number)
      VALUES (?, 0)
      ON DUPLICATE KEY UPDATE period_key = period_key
      `,
      [periodKey]
    )

    const [counterRows] = await connection.query(
      `
      SELECT last_number
      FROM order_counters
      WHERE period_key = ?
      FOR UPDATE
      `,
      [periodKey]
    )

    const nextNumber = counterRows[0].last_number + 1

    await connection.query(
      `
      UPDATE order_counters
      SET last_number = ?
      WHERE period_key = ?
      `,
      [nextNumber, periodKey]
    )

    const orderNo = buildOrderNo(periodKey, nextNumber)

    const [receiptResult] = await connection.query(
      `
      INSERT INTO receipts (
        receipt_uuid,
        order_no,
        customer_name,
        total_amount,
        discount,
        final_amount,
        payment_method
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        receiptUuid,
        orderNo,
        customerName || null,
        totalAmount,
        discount,
        finalAmount,
        paymentMethod
      ]
    )

    const receiptId = receiptResult.insertId

    for (const item of items) {
      await connection.query(
        `
    INSERT INTO receipt_items (
      receipt_id,
      item_name,
      unit_price,
      quantity,
      line_total
    ) VALUES (?, ?, ?, ?, ?)
    `,
        [
          receiptId,
          item.itemName,
          item.unitPrice,
          item.quantity,
          item.lineTotal
        ]
      )
    }

    await connection.commit()

    res.status(201).json({
      message: 'สร้างใบเสร็จสำเร็จ',
      receipt_uuid: receiptUuid,
      order_no: orderNo
    })
  } catch (error) {
    await connection.rollback()
    console.error(error)
    res.status(500).json({
      message: 'สร้างใบเสร็จไม่สำเร็จ'
    })
  } finally {
    connection.release()
  }
})

app.post('/api/receipt-image', async (req, res) => {
  const { html } = req.body

  if (!html) {
    return res.status(400).json({ message: 'ไม่พบ HTML สำหรับสร้างภาพ' })
  }

  let browser

  try {
    browser = await puppeteer.launch({
      headless: true
    })

    const page = await browser.newPage()

    await page.setViewport({
      width: 1000,
      height: 1400,
      deviceScaleFactor: 2
    })

    await page.setContent(html, {
      waitUntil: 'networkidle0'
    })

    const receipt = await page.$('#receipt-preview')

    if (!receipt) {
      return res.status(400).json({ message: 'ไม่พบ #receipt-preview ใน HTML' })
    }

    const imageBuffer = await receipt.screenshot({
      type: 'png'
    })

    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Content-Disposition', 'attachment; filename="receipt.png"')
    res.send(imageBuffer)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      message: 'สร้างภาพใบเสร็จไม่สำเร็จ'
    })
  } finally {
    if (browser) {
      await browser.close()
    }
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

pool.query('SELECT 1')
  .then(() => console.log('DB connected ✅'))
  .catch(err => console.error('DB error ❌', err))

app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT *
      FROM products
      ORDER BY category, subcategory, name
    `)

    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'ดึงสินค้าไม่สำเร็จ' })
  }
})

app.post('/api/products', async (req, res) => {
  const { name, price, category, subcategory } = req.body

  if (!name || price === undefined || price === null) {
    return res.status(400).json({ message: 'กรอกชื่อสินค้าและราคา' })
  }

  try {
    const [result] = await pool.query(
      `
      INSERT INTO products (name, price, category, subcategory)
      VALUES (?, ?, ?, ?)
      `,
      [
        name.trim(),
        price,
        category?.trim() || null,
        subcategory?.trim() || null
      ]
    )

    res.status(201).json({
      message: 'เพิ่มสินค้าสำเร็จ',
      product_id: result.insertId
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'เพิ่มสินค้าไม่สำเร็จ' })
  }
})