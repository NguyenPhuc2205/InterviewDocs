const fs = require('fs')

fs.readFile('text.txt', 'utf-8', (err, data) => {
  console.log(data)
})

console.log('Đọc file xong') // Thực thi trước