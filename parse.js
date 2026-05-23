const fs = require('fs');

try {
  const data = JSON.parse(fs.readFileSync('public/Template website/templates/team.json', 'utf8'));
  
  function extractText(obj, indent = '') {
    if (!obj) return;
    if (typeof obj === 'string') {
      // Print strings that look like text content
      if (obj.length > 10 && !obj.startsWith('http') && !obj.includes('_')) {
        console.log(indent + obj.substring(0, 100).replace(/\n/g, ' '));
      }
    } else if (Array.isArray(obj)) {
      obj.forEach(item => extractText(item, indent));
    } else if (typeof obj === 'object') {
      if (obj.elType) {
        console.log(indent + '[' + obj.elType + (obj.widgetType ? ' - ' + obj.widgetType : '') + ']');
        indent += '  ';
      }
      if (obj.settings && obj.settings.title) {
        console.log(indent + 'TITLE: ' + obj.settings.title);
      }
      if (obj.settings && obj.settings.editor) {
        console.log(indent + 'TEXT: ' + obj.settings.editor.substring(0, 100).replace(/\n/g, ' '));
      }
      if (obj.settings && obj.settings.text) {
        console.log(indent + 'BTN/TEXT: ' + obj.settings.text);
      }
      for (let key in obj) {
        extractText(obj[key], indent);
      }
    }
  }
  
  console.log("=== HOME PAGE STRUCTURE ===");
  if (data.content) {
     extractText(data.content);
  } else {
     extractText(data);
  }
} catch (e) {
  console.error(e);
}
