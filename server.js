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
const STATIC_DIR = path.join(__dirname, 'static_content_130526');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(STATIC_DIR)) {
  fs.mkdirSync(STATIC_DIR, { recursive: true });
}

const CODES_FILE = path.join(DATA_DIR, 'codes.lua');

// ============ HÀM ĐỌC/GHI DATABASE ============

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

function parseLuaTable(content) {
  try {
    const match = content.match(/return\s*\{([\s\S]*)\}/);
    if (!match) return {};
    
    const tableContent = match[1];
    const codes = {};
    
    const entryRegex = /\["([^"]+)"\]\s*=\s*\{([\s\S]*?)\},?\s*(?=\[|$)/g;
    let entryMatch;
    
    while ((entryMatch = entryRegex.exec(tableContent)) !== null) {
      const id = entryMatch[1];
      const fields = entryMatch[2];
      
      const code = {};
      
      const nameMatch = fields.match(/name\s*=\s*"([^"]*)"/);
      if (nameMatch) code.name = nameMatch[1];
      
      const descMatch = fields.match(/description\s*=\s*"([^"]*)"/);
      if (descMatch) code.description = descMatch[1];
      
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

function escapeLuaString(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

// ============ HÀM MÃ HÓA NÂNG CAO ============

function generateId(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < length; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Mã hóa code thành dạng khó đọc
function encodeLuaCodeAdvanced(code, id) {
  const hex = Buffer.from(code).toString('hex');
  
  const key1 = generateRandomString(16);
  const key2 = generateRandomString(16);
  const key3 = generateRandomString(16);
  
  const v1 = '_' + generateRandomString(6);
  const v2 = '_' + generateRandomString(6);
  const v3 = '_' + generateRandomString(6);
  const v4 = '_' + generateRandomString(6);
  const v5 = '_' + generateRandomString(6);
  const v6 = '_' + generateRandomString(6);
  const v7 = '_' + generateRandomString(6);
  
  return `local ${v1}="${hex}"
local ${v2}="${key1}"
local ${v3}="${key2}"
local ${v4}="${key3}"

local ${v5}=string
local ${v6}=table
local ${v7}=${v5}.char

-- Hàm giải mã
local function ${v5}6(...)
    local _=...
    local __={}
    for i=1,#_ do
        __[i]=${v7}(tonumber(${v5}.sub(_,i*2-1,i*2),16))
    end
    return ${v6}.concat(__)
end

-- Giải mã
local ${v5}7=${v5}6(${v1})
local ${v5}8=${v5}7

-- Thực thi
local ${v5}9=loadstring(${v5}8)
${v5}9()`;
}

// ============ TẠO SCRIPT HOÀN CHỈNH ============
function createFullScript(encoded, id, baseUrl) {
  return `--[[
  __  __          _____         _       _          _     
 |  \\/  |        |_   _|       | |     | |        | |    
 | \\  / | ___      | |  ___  __| |_   _| | ___  __| |___ 
 | |\\/| |/ _ \\     | | / _ \\/ _\` | | | | |/ _ \\/ _\` / __|
 | |  | | (_) |    | ||  __/ (_| | |_| | |  __/ (_| \\__ \\
 |_|  |_|\\___/     |_| \\___|\\__,_|\\__,_|_|\\___|\\__,_|___/
]]--

${encoded}`;
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
    
    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;
    
    const encoded = encodeLuaCodeAdvanced(code, id);
    const script = createFullScript(encoded, id, baseUrl);

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

    const staticFile = path.join(STATIC_DIR, `init-${id}.lua`);
    fs.writeFileSync(staticFile, code, 'utf8');

    if (saveCodes(codes)) {
      console.log(`✅ Đã lưu code ID: ${id}, Tên: ${codes[id].name}`);
      
      res.json({
        success: true,
        id: id,
        loadstring: `loadstring(game:HttpGet("${baseUrl}/api/raw/${id}", true))()`,
        url: `${baseUrl}/api/raw/${id}`,
        script: script,
        encoded: encoded,
        totalCodes: Object.keys(codes).length,
        domain: baseUrl
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

// 2. Lấy script đã mã hóa
app.get('/api/raw/:id', (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Đang tìm script ID: ${id}`);
    
    const codes = loadCodes();
    
    if (!codes[id]) {
      console.log(`❌ Không tìm thấy ID: ${id}`);
      return res.status(404).send('-- Code không tồn tại');
    }

    console.log(`✅ Tìm thấy code: ${codes[id].name}`);
    
    codes[id].views = (codes[id].views || 0) + 1;
    codes[id].updatedAt = new Date().toISOString();
    saveCodes(codes);

    res.set('Content-Type', 'text/plain');
    res.send(codes[id].script);

  } catch (error) {
    console.error('Lỗi raw:', error);
    res.status(500).send('-- Lỗi server: ' + error.message);
  }
});

// 3. Lấy code gốc
app.get('/api/raw-code/:id', (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Đang tìm code gốc ID: ${id}`);
    
    const codes = loadCodes();
    
    if (!codes[id]) {
      console.log(`❌ Không tìm thấy ID: ${id}`);
      return res.status(404).send('-- Code không tồn tại');
    }

    console.log(`✅ Trả về code gốc: ${codes[id].name}`);

    res.set('Content-Type', 'text/plain');
    res.send(codes[id].code);

  } catch (error) {
    console.error('Lỗi raw-code:', error);
    res.status(500).send('-- Lỗi server: ' + error.message);
  }
});

// 4. Lấy danh sách codes
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

// 5. Lấy chi tiết code
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

    const name = codes[id].name;
    delete codes[id];
    saveCodes(codes);

    const staticFile = path.join(STATIC_DIR, `init-${id}.lua`);
    if (fs.existsSync(staticFile)) {
      fs.unlinkSync(staticFile);
    }

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

// 7. Xem nội dung codes.lua
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

// 8. Health check
app.get('/health', (req, res) => {
  try {
    const codes = loadCodes();
    const fileExists = fs.existsSync(CODES_FILE);
    const fileSize = fileExists ? fs.statSync(CODES_FILE).size : 0;
    
    const staticFiles = fs.readdirSync(STATIC_DIR).filter(f => f.endsWith('.lua'));
    
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      totalCodes: Object.keys(codes).length,
      staticFiles: staticFiles.length,
      fileExists: fileExists,
      fileSize: fileSize,
      filePath: CODES_FILE,
      staticPath: STATIC_DIR,
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      error: error.message 
    });
  }
});

// 9. Root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============ KHỞI ĐỘNG SERVER ============

app.listen(PORT, () => {
  console.log(`✅ Server đang chạy tại port ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📁 Data directory: ${DATA_DIR}`);
  console.log(`📁 Static directory: ${STATIC_DIR}`);
  console.log(`📄 File database: ${CODES_FILE}`);
  
  if (fs.existsSync(CODES_FILE)) {
    const stats = fs.statSync(CODES_FILE);
    console.log(`📊 Database size: ${(stats.size / 1024).toFixed(2)} KB`);
    const codes = loadCodes();
    console.log(`📝 Total codes: ${Object.keys(codes).length}`);
  } else {
    console.log('📝 Chưa có codes.lua, sẽ tạo khi lưu code đầu tiên');
  }
  
  const staticFiles = fs.readdirSync(STATIC_DIR).filter(f => f.endsWith('.lua'));
  console.log(`📁 Static files: ${staticFiles.length}`);
});
