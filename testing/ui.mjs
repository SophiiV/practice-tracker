// Browser acceptance tests on an isolated DB. npm install in testing/ before running.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url); const {chromium}=require('playwright');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'practice-ui-')); process.env.DB_PATH=path.join(dir,'test.db');
const {app}=await import('../backend/src/app.js');const {db}=await import('../backend/src/db.js');
const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5179','--strictPort'],{cwd:fileURLToPath(new URL('../frontend/',import.meta.url)),env:{...process.env,API_TARGET:'http://127.0.0.1:'+server.address().port},stdio:'pipe'});
const base='http://127.0.0.1:5179'; const out=fileURLToPath(new URL('screenshots/',import.meta.url));fs.mkdirSync(out,{recursive:true});
let browser;const result=[];const browserErrors=[];
try{
 for(let i=0;i<60;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}
 browser=await chromium.launch({headless:true,channel:'chrome'});
 const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});page.on('pageerror',e=>browserErrors.push(e.message));
 await page.goto(base+'/register');await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:out+'01-register.png',fullPage:true});
 const fields={fullName:'Тестова Марія Олегівна',groupName:'ІПЗ-41',recordBookNumber:'UI-001',email:'ui@example.com',password:'Testing123!'};
 for(const [k,v] of Object.entries(fields))await page.locator(`[name="${k}"]`).fill(v);
 await page.getByRole('button',{name:'Зареєструватися',exact:true}).click();await page.getByRole('status').filter({hasText:'Обліковий запис створено'}).waitFor();
 result.push({id:'UI-01',name:'Реєстрація через форму',status:'PASS',actual:'Показано підтвердження створення облікового запису'});
 await page.goto(base+'/login');await page.locator('[name=email]').fill('sofiia.vasyliuk.23@pnu.edu.ua');await page.locator('[name=password]').fill('praktyka2026');await page.getByRole('button',{name:'Увійти',exact:true}).click();await page.getByRole('heading',{name:'Трекер Практики',exact:true}).waitFor({state:'hidden'});
 await page.goto(base+'/assignments');const search=page.getByRole('searchbox',{name:'Пошук'});await search.fill('Василюк');await page.getByText('Показано 2 із 2',{exact:true}).waitFor();await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:out+'02-search-found.png'});
 result.push({id:'TC-19',name:'Пошук за прізвищем',type:'positive',precondition:'Студент увійшов; відкритий список направлень',steps:'Ввести Василюк у поле пошуку',input:'Василюк',expected:'Два власні направлення',actual:'Показано 2 із 2',status:'PASS'});
 await search.fill('НеіснуючаКомпанія');await page.getByText('Направлень не знайдено',{exact:true}).waitFor();await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:out+'03-search-empty.png'});
 result.push({id:'TC-20',name:'Пошук без збігів',type:'negative',precondition:'Студент увійшов; список направлень',steps:'Ввести НеіснуючаКомпанія у поле пошуку',input:'НеіснуючаКомпанія',expected:'Повідомлення про відсутність результатів',actual:'Направлень не знайдено',status:'PASS'});
 await page.goto(base+'/assignments/2');await page.getByRole('tab',{name:'Документи',exact:true}).click();await page.locator('[name=number]').waitFor();
 await page.getByRole('button',{name:'Завантажити заповнений DOCX'}).click();await page.locator('#field-number-error').waitFor();await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:out+'04-contract-validation.png',fullPage:true});
 const data={number:'П-2026/15',city:'Івано-Франківськ',signedOn:'2025-10-27',representative:'Директор Іваненко Іван Іванович',authority:'Статуту',validUntil:'2027-03-31'};
 for(const [k,v] of Object.entries(data))await page.locator(`[name="${k}"]`).fill(v);
 await page.getByRole('button',{name:'Зберегти чернетку',exact:true}).click();await page.getByRole('status').filter({hasText:'Чернетку збережено'}).waitFor();
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:out+'05-contract-desktop.png',fullPage:true});
 await page.reload();await page.getByRole('tab',{name:'Документи',exact:true}).click();await page.locator('[name=number]').waitFor();assert.equal(await page.locator('[name=number]').inputValue(),'П-2026/15');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Завантажити заповнений DOCX'}).click();const file=await download;assert.match(file.suggestedFilename(),/Договір_2.docx/);await file.saveAs(path.join(dir,'ui-contract.docx'));assert.equal(fs.readFileSync(path.join(dir,'ui-contract.docx')).subarray(0,2).toString(),'PK');
 result.push({id:'UI-02',name:'Договір: валідація, збереження, перезавантаження, файл',status:'PASS',actual:'Чернетка збереглась після reload; браузер завантажив DOCX'});
 await page.getByRole('button',{name:'Щоденник для друку',exact:true}).click();await page.locator('[name=faculty]').waitFor();await page.getByRole('button',{name:'+ Додати роботу до графіка',exact:true}).click();await page.locator('[name=schedule-0-title]').fill('Розроблення та тестування модуля документів');
 await page.getByRole('button',{name:'Зберегти чернетку',exact:true}).click();await page.getByRole('status').filter({hasText:'Чернетку збережено'}).waitFor();await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:out+'06-diary-desktop.png',fullPage:true});
 const diaryDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Завантажити заповнений DOCX'}).click();assert.match((await diaryDownload).suggestedFilename(),/Щоденник_2.docx/);
 result.push({id:'UI-03',name:'Щоденник: графік і завантаження',status:'PASS',actual:'Графік збережено; браузер завантажив щоденник'});
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.scrollTo(0,0));await page.getByRole('heading',{name:'Оформлення щоденника',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:out+'07-diary-mobile.png'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 result.push({id:'UI-04',name:'Мобільний інтерфейс 390 px',status:'PASS',actual:'Немає горизонтального переповнення'});
 await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/materials');await page.getByRole('heading',{name:'Інструктаж з техніки безпеки'}).waitFor();assert.equal((await page.request.get(base+'/api/materials/safety.pdf')).status(),200);await page.evaluate(()=>window.scrollTo(0,0));// Chrome's PDF viewer renders after the iframe load event.
 await page.waitForTimeout(4000);await page.screenshot({path:out+'08-safety.png',fullPage:true});
 result.push({id:'UI-05',name:'Інструктаж і бланки',status:'PASS',actual:'Сторінка доступна; PDF повертає 200'});
 await page.getByRole('button',{name:'Вийти',exact:true}).click();await page.getByRole('button',{name:'Увійти',exact:true}).waitFor();result.push({id:'UI-06',name:'Вихід із системи',status:'PASS',actual:'Повернення до форми входу'});
 assert.deepEqual(browserErrors,[]);
}finally{fs.writeFileSync(new URL('ui-results.json',import.meta.url),JSON.stringify({results:result,browserErrors},null,2));await browser?.close();vite.kill();await new Promise(r=>server.close(r));db.close();fs.rmSync(dir,{recursive:true,force:true});}
console.log(JSON.stringify(result,null,2));
