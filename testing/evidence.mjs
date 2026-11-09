import {createRequire} from 'node:module';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);const {chromium}=require('playwright');const root=fileURLToPath(new URL('.',import.meta.url));
const browser=await chromium.launch({headless:true,channel:'chrome'});const page=await browser.newPage({viewport:{width:1300,height:1000}});
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
for(const [name,title,cmd,body] of [
 ['09-unit-results','Модульне тестування','npm run test:unit',fs.readFileSync(path.join(root,'unit-output.txt'),'utf8')],
 ['10-integration-results','Інтеграційне тестування','npm run test:integration',fs.readFileSync(path.join(root,'integration-output.txt'),'utf8')],
 ['11-student-db','Перевірка запису студента в SQLite','IT-01: читання через окреме з’єднання',JSON.stringify(JSON.parse(fs.readFileSync(path.join(root,'integration-results.json'),'utf8'))[0],null,2)],
 ['12-all-tests','Підсумок автоматичних перевірок','npm test',fs.readFileSync(path.join(root,'test-output.txt'),'utf8').split('\n').slice(-10).join('\n')]
]){
 const html=`<!doctype html><meta charset="utf-8"><style>body{font:20px Arial;margin:36px;color:#172b40;background:#f5f8fb}h1{font-size:30px}p{color:#52677a}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:white;border:1px solid #cbd5e1;border-radius:12px;padding:24px;font:19px/1.6 monospace}</style><h1>${title}</h1><p>Трекер Практики · Lab 11 · 19 жовтня 2026</p><p>Команда: ${cmd}. Нижче наведено фактичний журнал виконання.</p><pre>${escape(body)}</pre>`;
 fs.writeFileSync(path.join(root,name+'.html'),html);await page.setContent(html);await page.screenshot({path:path.join(root,'screenshots',name+'.png'),fullPage:true});
}
await browser.close();
