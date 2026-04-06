import './style.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

const PAYMENT_CONFIG = {
  BANK: {
    qr: '/images/payments/kbank-qr.jpg'
  },
  TRUEMONEY: {
    name: 'เจษฎาพร มานตรี',
    phone: '062-456-9202'
  }
}

const generateBtn = document.querySelector('#generateBtn')
const saveImageBtn = document.querySelector('#saveImageBtn')
const addItemBtn = document.querySelector('#addItemBtn')
const clearBtn = document.querySelector('#clearBtn')

let cart = []

function renderSelectedItems() {
  const selectedItemsEl = document.querySelector('#selectedItems')
  if (!selectedItemsEl) return

  if (cart.length === 0) {
    selectedItemsEl.innerHTML = '<p class="text-gray-500">ยังไม่มีรายการ</p>'
    return
  }

  selectedItemsEl.innerHTML = ''

  cart.forEach((item, index) => {
    const div = document.createElement('div')
    div.className = 'border rounded p-3 bg-gray-50 flex justify-between items-start gap-3'

    div.innerHTML = `
      <div>
        <div class="font-semibold">[${item.category}] ${item.itemName}</div>
        <div class="text-sm text-gray-600">
          ${Number(item.unitPrice).toFixed(2)} x ${item.quantity}
        </div>
      </div>
      <div class="text-right">
        <div class="font-bold">${Number(item.lineTotal).toFixed(2)} บาท</div>
        <button type="button" class="remove-item-btn text-red-500 text-sm mt-1" data-index="${index}">
          ลบ
        </button>
      </div>
    `

    selectedItemsEl.appendChild(div)
  })

  document.querySelectorAll('.remove-item-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = Number(btn.dataset.index)
      cart.splice(index, 1)
      renderSelectedItems()
    })
  })
}

function renderPaymentInfo() {
  const paymentInfoEl = document.querySelector('#paymentInfo')
  if (!paymentInfoEl) return

  paymentInfoEl.innerHTML = `
    <div class="w-full flex flex-col items-center">

      <div class="w-full rounded-2xl border border-orange-200 bg-orange-50 p-3 text-center shadow-md">
        <p class="text-xs font-semibold text-slate-700">TrueMoney Wallet</p>
        <p class="text-xs text-slate-500">ชื่อบัญชี: ${PAYMENT_CONFIG.TRUEMONEY.name}</p>
        <p class="mt-1 text-lg font-bold text-orange-500">${PAYMENT_CONFIG.TRUEMONEY.phone}</p>
      </div>

      <div class="mt-3 w-full rounded-2xl border border-rose-200 bg-white p-3 text-center shadow-sm">
        <p class="text-xs font-semibold text-slate-700">ชำระผ่านธนาคาร</p>
        <img src="${PAYMENT_CONFIG.BANK.qr}" class="mx-auto mt-2 w-40" alt="QR ธนาคาร" />
        <p class="text-[10px] text-slate-400 mt-1">สแกน QR เพื่อชำระเงิน</p>
      </div>
    </div>
  `
}

addItemBtn?.addEventListener('click', () => {
  const category = document.querySelector('#itemCategory')?.value || ''
  const itemName = document.querySelector('#itemName')?.value.trim() || ''
  const unitPrice = parseFloat(document.querySelector('#itemPrice')?.value)
  const quantity = parseInt(document.querySelector('#itemQty')?.value) || 1

  if (!itemName || isNaN(unitPrice) || quantity < 1) {
    alert('กรอกชื่อรายการ ราคา และจำนวนให้ถูกต้อง')
    return
  }

  const lineTotal = unitPrice * quantity

  cart.push({
    category,
    itemName,
    unitPrice,
    quantity,
    lineTotal
  })

  document.querySelector('#itemName').value = ''
  document.querySelector('#itemPrice').value = ''
  document.querySelector('#itemQty').value = 1

  renderSelectedItems()
})

clearBtn?.addEventListener('click', () => {
  cart = []
  document.querySelector('#customerName').value = ''
  document.querySelector('#discount').value = ''
  document.querySelector('#itemName').value = ''
  document.querySelector('#itemPrice').value = ''
  document.querySelector('#itemQty').value = 1
  document.querySelector('#displayCustomer').innerText = '-'
  document.querySelector('#receiptItems').innerHTML = '<p class="text-gray-500">ยังไม่มีรายการ</p>'
  document.querySelector('#displaySubtotal').innerText = '0.00'
  document.querySelector('#displayDiscount').innerText = '0.00'
  document.querySelector('#displayFinal').innerText = '0.00'
  document.querySelector('#date').innerText = ''
  document.querySelector('#receiptNo').innerText = ''
  renderSelectedItems()
  renderPaymentInfo()
})

generateBtn?.addEventListener('click', async () => {
  const customerNameEl = document.querySelector('#customerName')
  const receiptItemsEl = document.querySelector('#receiptItems')
  const discountEl = document.querySelector('#discount')
  const displayCustomerEl = document.querySelector('#displayCustomer')
  const displaySubtotalEl = document.querySelector('#displaySubtotal')
  const displayDiscountEl = document.querySelector('#displayDiscount')
  const displayFinalEl = document.querySelector('#displayFinal')
  const dateEl = document.querySelector('#date')
  const receiptNoEl = document.querySelector('#receiptNo')

  if (
    !receiptItemsEl ||
    !displayCustomerEl ||
    !displaySubtotalEl ||
    !displayDiscountEl ||
    !displayFinalEl ||
    !dateEl ||
    !receiptNoEl
  ) {
    alert('ไม่พบ element ที่จำเป็นในหน้าเว็บ')
    return
  }

  if (cart.length === 0) {
    alert('กรุณาเพิ่มอย่างน้อย 1 รายการ')
    return
  }

  const name = customerNameEl?.value.trim() || ''
  const discount = parseFloat(discountEl?.value) || 0

  const totalAmount = cart.reduce((sum, item) => sum + item.lineTotal, 0)
  const finalAmount = Math.max(0, totalAmount - discount)

  let itemsHTML = ''

  cart.forEach((item) => {
    itemsHTML += `
      <div class="grid grid-cols-12 items-center">
        <span class="col-span-6"><div>[ ${item.category} ]</div><div class="ml-3 mt-1">${item.itemName}</div></span>
        <span class="col-span-2 text-center">${item.quantity}</span>
        <span class="col-span-4 text-right">${item.lineTotal.toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}</span>
      </div>
    `
  })

  try {
    const response = await fetch(`${API_BASE}/api/receipts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: name,
        totalAmount,
        discount,
        finalAmount,
        paymentMethod: 'BANK',
        items: cart
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'สร้างใบเสร็จไม่สำเร็จ')
    }

    displayCustomerEl.innerText = name || '-'
    receiptItemsEl.innerHTML = itemsHTML
    displaySubtotalEl.innerText = totalAmount.toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
    displayDiscountEl.innerText = discount.toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
    displayFinalEl.innerText = finalAmount.toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })

    const now = new Date()
    dateEl.innerText = now.toLocaleString('th-TH')
    receiptNoEl.innerText = data.order_no || '-'

    renderPaymentInfo()
  } catch (error) {
    console.error(error)
    alert(error.message || 'เกิดข้อผิดพลาด')
  }
})

saveImageBtn?.addEventListener('click', async () => {
  try {
    const receiptEl = document.querySelector('#receipt-preview')

    if (!receiptEl) {
      throw new Error('ไม่พบใบเสร็จสำหรับบันทึกภาพ')
    }

    const response = await fetch(`${API_BASE}/api/receipt-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html: `
          <!DOCTYPE html>
          <html lang="th">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <base href="${window.location.origin}/">
            <title>Receipt</title>
          </head>
          <body style="margin:0; padding:20px; background:#fdf2f8;">
            ${receiptEl.outerHTML}
          </body>
          </html>
        `
      })
    })

    if (!response.ok) {
      const data = await response.json().catch(() => null)
      throw new Error(data?.message || 'บันทึกภาพไม่สำเร็จ')
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'receipt.png'
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error(error)
    alert(error.message || 'เกิดข้อผิดพลาดในการบันทึกภาพ')
  }
})

renderSelectedItems()
renderPaymentInfo()