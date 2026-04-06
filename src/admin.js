async function loadProducts() {
  const res = await fetch('http://localhost:3000/api/products')
  const products = await res.json()

  const productList = document.querySelector('#productList')
  productList.innerHTML = ''

  products.forEach((p) => {
    const div = document.createElement('div')
    div.className = 'border rounded p-3 bg-gray-50'

    div.innerHTML = `
      <div class="font-semibold">${p.name}</div>
      <div class="text-sm text-gray-600">
        ${p.category || '-'} / ${p.subcategory || '-'}
      </div>
      <div class="text-blue-600 font-bold">${Number(p.price).toFixed(2)} บาท</div>
    `

    productList.appendChild(div)
  })
}

document.querySelector('#saveBtn')?.addEventListener('click', async () => {
  const name = document.querySelector('#name').value.trim()
  const price = parseFloat(document.querySelector('#price').value)
  const category = document.querySelector('#category').value.trim()
  const subcategory = document.querySelector('#subcategory').value.trim()

  if (!name || isNaN(price)) {
    alert('กรอกชื่อสินค้าและราคา')
    return
  }

  const res = await fetch('http://localhost:3000/api/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name,
      price,
      category,
      subcategory
    })
  })

  const data = await res.json()

  if (!res.ok) {
    alert(data.message || 'เพิ่มสินค้าไม่สำเร็จ')
    return
  }

  document.querySelector('#name').value = ''
  document.querySelector('#price').value = ''
  document.querySelector('#category').value = ''
  document.querySelector('#subcategory').value = ''

  await loadProducts()
  alert('เพิ่มสินค้าสำเร็จ')
})

loadProducts()