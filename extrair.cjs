const fs = require('fs');
const path = require('path');

const outputFileName = 'contexto_projeto.txt';
// Ignoramos apenas as pastas de sistema e o próprio script/saída
const ignoreList = ['node_modules', '.git', 'dist', 'build', '.next'];
const allowedExtensions = ['.js', '.jsx', '.json', '.css'];

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (ignoreList.includes(file)) return; // Pula pastas ignoradas

    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      const ext = path.extname(file);
      if (allowedExtensions.includes(ext)) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });

  return arrayOfFiles;
}

try {
    const root = process.cwd();
    const files = getAllFiles(root);
    
    console.log(`🔎 Arquivos encontrados: ${files.length}`);
    
    let content = "";
    files.forEach(file => {
        if (file.includes(outputFileName) || file.includes('extrair.js')) return;
        
        const relativePath = path.relative(root, file);
        const data = fs.readFileSync(file, 'utf8');
        
        content += `\n\n--- FILE: ${relativePath} ---\n`;
        content += data;
    });

    fs.writeFileSync(outputFileName, content);
    console.log(`✅ Sucesso! O arquivo "${outputFileName}" foi gerado com ${Buffer.byteLength(content, 'utf8')} bytes.`);
} catch (err) {
    console.error("❌ Erro ao extrair:", err);
}