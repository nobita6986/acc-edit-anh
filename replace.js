const fs = require('fs');
const path = './services/geminiService.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/ai\.models\.generateContent\(\{\n\s*model: 'gemini-2\.5-flash-image',/g, "getAI().models.generateContent({\n            model: getImageModel(),");
content = content.replace(/ai\.models\.generateContent\(\{\n\s*model: 'gemini-2\.5-flash',/g, "getAI().models.generateContent({\n            model: getTextModel(),");
content = content.replace(/ai\.models\.generateVideos/g, "getAI().models.generateVideos");

fs.writeFileSync(path, content);
console.log('Done');
