// saveFilesAsText.js
const fs = require("fs");
const path = require("path");

// مجلد المشروع اللي تريد قراءته
const srcFolder = path.join(__dirname, "src/shared/assets/styles");

// ملف الإخراج
const outputFile = path.join(__dirname, "styles.txt");

// دالة لقراءة الملفات بشكل متكرر (recursively)
function readFiles(folderPath) {
  let result = "";

  const files = fs.readdirSync(folderPath);
  files.forEach((file) => {
    const fullPath = path.join(folderPath, file);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      result += readFiles(fullPath); // استدعاء نفسها للملفات الفرعية
    } else {
      const content = fs.readFileSync(fullPath, "utf8");
      result += `\n\n/* ===== File: ${fullPath} ===== */\n\n`;
      result += content;
    }
  });

  return result;
}

// قراءة كل الملفات وكتابتها في ملف واحد
const allFilesContent = readFiles(srcFolder);
fs.writeFileSync(outputFile, allFilesContent, "utf8");

console.log(`تم حفظ جميع الملفات في: ${outputFile}`);
