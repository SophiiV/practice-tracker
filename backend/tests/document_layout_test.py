"""Regressions for the university-form exporter; no document-authoring dependencies."""
import copy
import importlib.util
import io
from pathlib import Path
import unittest
from zipfile import ZipFile
from xml.etree import ElementTree as E

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('fill_document', ROOT/'scripts/fill_document.py')
generator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generator)
NS = {'w': generator.W}


def fixture(kind):
    return dict(kind=kind, student={'fullName': 'Студентка Тестова Олександрівна', 'groupName': 'ІПЗ-41'},
                teacher={'shortName': 'Керівник Т. М.'}, enterprise={'name': 'Навчальний центр'},
                assignment={'supervisorName': 'Керівник Олександр Миколайович'},
                period={'type': 'виробнича', 'startDate': '2025-11-03', 'endDate': '2025-11-30'},
                entries=[{'date': '2025-11-03', 'hours': 6, 'description': 'Розробка <API> & перевірка.\nДругий рядок.'}],
                data=dict(number='П-2026/15', city='Івано-Франківськ', signedOn='2025-10-27',
                          enterpriseName='Навчальний центр', representative='Керівник Олександр Миколайович',
                          authority='Статуту', address='вул. Навчальна, 1', email='center@example.com',
                          course='4', specialty='Інженерія програмного забезпечення', validUntil='2027-03-31',
                          additionalTerms='Додаткова умова', faculty='Факультет інформатики',
                          department='Інформаційних технологій', qualification='Бакалавр',
                          educationProgram='Інженерія програмного забезпечення', arrivedOn='2025-11-03',
                          departedOn='2025-11-30', responsiblePerson='Відповідальна Особа',
                          schedule=[{'title': 'Розробка <API> & перевірка', 'startDate': '2025-11-03',
                                     'endDate': '2025-11-30', 'completed': True}]))


def parsed(data):
    archive = ZipFile(io.BytesIO(data))
    return archive, E.fromstring(archive.read('word/document.xml'))


def text(node):
    return ''.join(t.text or '' for t in node.findall('.//w:t', NS))


class DocumentLayoutTests(unittest.TestCase):
    def test_whitespace_and_label_words_in_fields_do_not_break_export(self):
        f = fixture('contract')
        f['data']['city'] = '  Місто   Тест  '
        f['data']['authority'] = '  діючого на підставі\nСтатуту  '
        _, x = parsed(generator.generate(f))
        self.assertIn('Місто Місто Тест', text(x))
        self.assertIn('діючого на підставі Статуту', text(x))
        self.assertIn('(статут підприємства', text(x))

    def test_source_parts_and_section_geometry_are_retained(self):
        for kind in ('contract', 'diary'):
            path = ROOT/'templates'/f'{kind}.docx'
            before = path.read_bytes()
            out, result = parsed(generator.generate(fixture(kind)))
            with ZipFile(io.BytesIO(before)) as source:
                self.assertEqual(set(source.namelist()), set(out.namelist()))
                for part in source.namelist():
                    if part != 'word/document.xml':
                        self.assertEqual(source.read(part), out.read(part), part)
                ref = E.fromstring(source.read('word/document.xml'))
                self.assertEqual([E.tostring(s) for s in ref.findall('.//w:sectPr', NS)],
                                 [E.tostring(s) for s in result.findall('.//w:sectPr', NS)])
            self.assertEqual(before, path.read_bytes())

    def test_labels_run_styles_and_signature_tabs_survive(self):
        _, x = parsed(generator.generate(fixture('diary')))
        for label in ('Інститут, факультет, відділення', 'освітньо-кваліфікаційний рівень',
                      'від підприємства, компанії, установи'):
            self.assertIn(label, text(x))
        p = next(p for p in x.findall('w:body/w:p', NS) if text(p).startswith('підприємства, компанії, установи'))
        self.assertTrue(p.findall('.//w:tab', NS), 'date must keep its original alignment tab')
        signature = next(p for p in x.findall('w:body/w:p', NS) if 'Відповідальна Особа' in text(p))
        self.assertIn('____________', text(signature))
        self.assertTrue(signature.findall('.//w:tab', NS))
        _, c = parsed(generator.generate(fixture('contract')))
        p = next(p for p in c.findall('w:body/w:p', NS) if '(статут підприємства' in text(p))
        caption = next(r for r in p.findall('w:r', NS) if '(статут підприємства' in text(r))
        self.assertEqual(caption.find('w:rPr/w:sz', NS).get('{'+generator.W+'}val'), '18')

    def test_calendar_preserves_each_row_and_does_not_collapse_blanks(self):
        with ZipFile(ROOT/'templates/diary.docx') as z:
            ref = E.fromstring(z.read('word/document.xml')).find('w:body/w:tbl', NS)
        _, x = parsed(generator.generate(fixture('diary')))
        tables = x.findall('w:body/w:tbl', NS)
        self.assertEqual(len(tables), 2)
        for i, table in enumerate(tables):
            self.assertEqual(E.tostring(ref.find('w:tblGrid', NS)), E.tostring(table.find('w:tblGrid', NS)))
            for old, new in zip(ref.findall('w:tr', NS), table.findall('w:tr', NS)):
                self.assertEqual([len(c.findall('w:p', NS)) for c in old.findall('w:tc', NS)],
                                 [len(c.findall('w:p', NS)) for c in new.findall('w:tc', NS)])
            cells = table.findall('w:tr', NS)[1].findall('w:tc', NS)
            self.assertEqual([text(c) for c in cells[2:4]], [str(i*2+1), str(i*2+2)])
            filled = table.findall('w:tr', NS)[2].findall('w:tc', NS)[1]
            self.assertEqual(filled.find('w:p/w:r/w:rPr/w:rFonts', NS).get('{'+generator.W+'}ascii'), 'Times New Roman')
            self.assertIsNone(filled.find('w:p/w:r/w:rPr/w:sz', NS), 'retain original inherited table font size')

    def test_long_unicode_values_and_many_entries_are_not_lost(self):
        f = fixture('diary')
        f['data']['schedule'] = [dict(f['data']['schedule'][0], title=f'Робота {i} '+('ДовгаНазва'*16)) for i in range(48)]
        f['entries'] = [dict(f['entries'][0], description=f'Запис {i}: '+('Довгий текст <API> & перевірка. '*50)) for i in range(20)]
        _, x = parsed(generator.generate(f))
        for row in f['data']['schedule']:
            self.assertIn(row['title'], text(x))
        for row in f['entries']:
            self.assertIn(row['description'], text(x))
        self.assertEqual(len(x.findall('w:body/w:tbl', NS)[0].findall('w:tr', NS)), 50)
        self.assertFalse(x.findall('.//w:trHeight[@w:hRule="exact"]', NS))

    def test_notes_have_no_floating_rules_and_safe_line_height(self):
        _, x = parsed(generator.generate(fixture('diary')))
        self.assertFalse(x.findall('.//w:drawing', NS))
        notes = [p for p in x.findall('w:body/w:p', NS) if 'Розробка <API>' in text(p)]
        self.assertEqual(len(notes), 1)
        spacing = notes[0].find('w:pPr/w:spacing', NS)
        self.assertEqual(spacing.get('{'+generator.W+'}lineRule'), 'atLeast')
        self.assertGreaterEqual(int(spacing.get('{'+generator.W+'}line')), 340)
        self.assertTrue(notes[0].findall('w:pPr/w:tabs/w:tab[@w:leader="underscore"]', NS))

    def test_contract_text_boxes_cannot_mask_captions(self):
        _, x = parsed(generator.generate(fixture('contract')))
        ns = dict(NS, wps='http://schemas.microsoft.com/office/word/2010/wordprocessingShape',
                  a='http://schemas.openxmlformats.org/drawingml/2006/main')
        shapes = [s for p in x.findall('w:body/w:p', ns) for s in p.findall('.//wps:spPr', ns)]
        self.assertEqual(len(shapes), 3)
        self.assertTrue(all(s.find('a:solidFill', ns) is None for s in shapes))
        self.assertTrue(all(s.find('a:noFill', ns) is not None for s in shapes))


if __name__ == '__main__':
    unittest.main()
