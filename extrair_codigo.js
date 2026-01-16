import fs from 'fs';
import path from 'path';

const srcDir = path.join(process.cwd(), 'src');
const outputFile = 'projeto_codigo_completo.txt';

function readFiles(dir, allCode = "") {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (!['node_modules', 'dist', '.git'].includes(file)) {
        allCode = readFiles(filePath, allCode);
      }
    } else if (['.jsx', '.js', '.css'].some(ext => file.endsWith(ext))) {
      const content = fs.readFileSync(filePath, 'utf8');
      allCode += `\n\n// ##########################################\n`;
      allCode += `// ARQUIVO: ${path.relative(process.cwd(), filePath)}\n`;
      allCode += `// ##########################################\n\n`;
      allCode += content;
    }
  });
  return allCode;
}

const finalCode = readFiles(srcDir);
fs.writeFileSync(outputFile, finalCode);
console.log("✅ Código completo salvo em: projeto_codigo_completo.txt");