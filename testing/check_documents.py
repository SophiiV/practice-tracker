"""Structural checks independent of the generator. Run after npm test."""
from pathlib import Path
from zipfile import ZipFile
from hashlib import sha256
from xml.etree import ElementTree as ET
import json
root=Path(__file__).resolve().parents[1]
ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
for kind in ['contract','diary']:
 ref=root/'backend/templates'/f'{kind}.docx'; out=root/'testing/artifacts'/f'{kind}-filled.docx'
 evidence=json.loads((ref.parent/f'{kind}-evidence.json').read_text())
 assert sha256(ref.read_bytes()).hexdigest()==evidence['sha256']
 with ZipFile(ref) as a, ZipFile(out) as b:
  assert set(a.namelist())==set(b.namelist())
  for part in a.namelist():
   if part!='word/document.xml': assert a.read(part)==b.read(part),part
  x=ET.fromstring(b.read('word/document.xml'));orig=ET.fromstring(a.read('word/document.xml'))
  assert [ET.tostring(s) for s in x.findall('.//w:sectPr',ns)]==[ET.tostring(s) for s in orig.findall('.//w:sectPr',ns)]
  text=' '.join(t.text or '' for t in x.findall('.//w:t',ns));assert 'Василюк Софія Ярославівна' in text
  if kind=='contract': assert 'П-2026/15' in text and '03.11.2025' in text and '30.11.2025' in text
  else:
   assert 'Розробка <API> & перевірка' in text
   assert 'Налаштування робочого середовища' in text
   tables=x.findall('w:body/w:tbl',ns)
   assert len(tables)==2
   for table,expected in zip(tables,[['1','2'],['3','4']]):
    cells=table.findall('w:tr',ns)[1].findall('w:tc',ns)
    assert [''.join(c.itertext()) for c in cells[2:4]]==expected
  print(f'PASS {kind}: template hash, ZIP preservation, section geometry, identity, content and table order')
print('Document structural checks passed.')
