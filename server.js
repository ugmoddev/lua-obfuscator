const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// Đảm bảo thư mục data tồn tại
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

const CODES_FILE = path.join(DATA_DIR, 'codes.json');

// Đọc dữ liệu codes
function loadCodes() {
  try {
    if (fs.existsSync(CODES_FILE)) {
      const data = fs.readFileSync(CODES_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Lỗi đọc codes:', error);
  }
  return {};
}

// Lưu dữ liệu codes
function saveCodes(codes) {
  try {
    fs.writeFileSync(CODES_FILE, JSON.stringify(codes, null, 2));
    return true;
  } catch (error) {
    console.error('Lỗi lưu codes:', error);
    return false;
  }
}

// Tạo ID ngẫu nhiên
function generateId(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < length; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// Mã hóa code
function encodeLuaCode(code) {
  const num1 = Math.floor(Math.random() * 2147483647);
  const num2 = Math.floor(Math.random() * 2147483647);
  const num3 = Math.floor(Math.random() * 2147483647);
  const num4 = Math.floor(Math.random() * 2147483647);
  const num5 = Math.floor(Math.random() * 2147483647);
  const num6 = Math.floor(Math.random() * 9000) + 1000;
  const num7 = Math.floor(Math.random() * 9000) + 1000;
  
  const randomString1 = generateRandomString(50);
  const randomString2 = generateRandomString(20);
  const randomString3 = generateRandomString(15);
  
  const hexString = Buffer.from(code).toString('hex');
  const encryptedData = encryptData(code);
  
  return `_bsdata0 = {
    ${num1},
    '${randomString1}',
    ${num2},
    '${randomString2}',
    ${num3},
    ${num4},
    '${randomString3}',
    ${num6},
    ${num7},
    ${num5},
    '${hexString}',
    '${encryptedData}'
}`;
}

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function encryptData(data) {
  const encoded = Buffer.from(data).toString('base64');
  return encoded.split('').map((c, i) => {
    if (i % 3 === 0) return String.fromCharCode(c.charCodeAt(0) ^ 0x05);
    if (i % 3 === 1) return String.fromCharCode(c.charCodeAt(0) ^ 0x0A);
    return c;
  }).join('');
}

// ============ API ============

// 1. Lưu code mới
app.post('/api/save', (req, res) => {
  try {
    const { code, name, description } = req.body;
    
    if (!code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Không có code được cung cấp' 
      });
    }

    const codes = loadCodes();
    const id = generateId();
    const timestamp = new Date().toISOString();
    
    // Tạo script hoàn chỉnh với loadstring
    const encoded = encodeLuaCode(code);
    const script = `${encoded}

-- Code ID: ${id}
-- Tên: ${name || 'Không tên'}
-- Ngày tạo: ${timestamp}

local loaded = loadstring(game:HttpGet("${req.protocol}://${req.get('host')}/api/raw/${id}", true))()
return loaded`;

    // Lưu vào database
    codes[id] = {
      id: id,
      name: name || 'Không tên',
      description: description || '',
      code: code,
      encoded: encoded,
      script: script,
      createdAt: timestamp,
      updatedAt: timestamp,
      views: 0,
      downloads: 0
    };

    if (saveCodes(codes)) {
      res.json({
        success: true,
        id: id,
        loadstring: `loadstring(game:HttpGet("${req.protocol}://${req.get('host')}/api/raw/${id}", true))()`,
        url: `${req.protocol}://${req.get('host')}/api/raw/${id}`,
        script: script
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Không thể lưu code' 
      });
    }

  } catch (error) {
    console.error('Lỗi save:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 2. Lấy code raw (cho loadstring)
app.get('/api/raw/:id', (req, res) => {
  try {
    const { id } = req.params;
    const codes = loadCodes();
    
    if (!codes[id]) {
      return res.status(404).send('-- Code không tồn tại');
    }

    // Tăng lượt xem
    codes[id].views = (codes[id].views || 0) + 1;
    saveCodes(codes);

    // Trả về code gốc để loadstring có thể tải
    res.set('Content-Type', 'text/plain');
    res.send(codes[id].code);

  } catch (error) {
    console.error('Lỗi raw:', error);
    res.status(500).send('-- Lỗi server');
  }
});

// 3. Lấy script đã mã hóa
app.get('/api/script/:id', (req, res) => {
  try {
    const { id } = req.params;
    const codes = loadCodes();
    
    if (!codes[id]) {
      return res.status(404).json({ 
        success: false, 
        error: 'Code không tồn tại' 
      });
    }

    // Tăng lượt tải
    codes[id].downloads = (codes[id].downloads || 0) + 1;
    saveCodes(codes);

    res.json({
      success: true,
      script: codes[id].script,
      encoded: codes[id].encoded
    });

  } catch (error) {
    console.error('Lỗi script:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 4. Lấy danh sách tất cả codes
app.get('/api/list', (req, res) => {
  try {
    const codes = loadCodes();
    const list = Object.values(codes).map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      createdAt: item.createdAt,
      views: item.views || 0,
      downloads: item.downloads || 0,
      size: item.code.length
    }));
    
    res.json({
      success: true,
      total: list.length,
      codes: list
    });

  } catch (error) {
    console.error('Lỗi list:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 5. Lấy chi tiết một code
app.get('/api/code/:id', (req, res) => {
  try {
    const { id } = req.params;
    const codes = loadCodes();
    
    if (!codes[id]) {
      return res.status(404).json({ 
        success: false, 
        error: 'Code không tồn tại' 
      });
    }

    res.json({
      success: true,
      code: codes[id]
    });

  } catch (error) {
    console.error('Lỗi code:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 6. Xóa code
app.delete('/api/delete/:id', (req, res) => {
  try {
    const { id } = req.params;
    const codes = loadCodes();
    
    if (!codes[id]) {
      return res.status(404).json({ 
        success: false, 
        error: 'Code không tồn tại' 
      });
    }

    delete codes[id];
    saveCodes(codes);

    res.json({
      success: true,
      message: 'Đã xóa code thành công'
    });

  } catch (error) {
    console.error('Lỗi delete:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 7. Health check
app.get('/health', (req, res) => {
  const codes = loadCodes();
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    totalCodes: Object.keys(codes).length,
    uptime: process.uptime()
  });
});

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server đang chạy tại port ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📁 Data directory: ${DATA_DIR}`);
  console.log(`📝 Total codes: ${Object.keys(loadCodes()).length}`);
});
