#!/usr/bin/env python3
"""Fill university DOCX copies. Python 3 standard library only; JSON stdin, DOCX stdout.
Only word/document.xml is changed; all other ZIP parts are copied byte for byte.
"""
import sys, json, io, math
from pathlib import Path
from zipfile import ZipFile
from xml.dom import minidom
from datetime import date, timedelta
DEFAULT_SIZE = 24
W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

def children(node, tag):
    return [n for n in node.childNodes if n.nodeType == n.ELEMENT_NODE and n.tagName == tag]

def el(doc, tag, attrs=None):
    n = doc.createElementNS(W, tag)
    for k, v in (attrs or {}).items(): n.setAttribute(k, str(v))
    return n

def text(p, value):
    """Keep paragraph settings (including section breaks) and the source run style."""
    doc = p.ownerDocument
    runs = children(p, 'w:r')
    style = children(runs[0], 'w:rPr')[0].cloneNode(True) if runs and children(runs[0], 'w:rPr') else None
    for n in list(p.childNodes):
        if n.nodeType == n.ELEMENT_NODE and n.tagName not in ('w:pPr', 'w:bookmarkStart', 'w:bookmarkEnd'): p.removeChild(n)
    r = el(doc, 'w:r')
    if style is None: style = el(doc, 'w:rPr')
    fonts = children(style, 'w:rFonts')
    font = fonts[0] if fonts else el(doc, 'w:rFonts')
    for attr in ['w:ascii','w:hAnsi','w:cs','w:eastAsia']: font.setAttribute(attr, 'Times New Roman')
    if not fonts: style.appendChild(font)
    if not children(style, 'w:sz'): style.appendChild(el(doc, 'w:sz', {'w:val': DEFAULT_SIZE}))
    r.appendChild(style)
    for i, line in enumerate(str(value).split('\n')):
        if i: r.appendChild(el(doc, 'w:br'))
        t = el(doc, 'w:t', {'xml:space': 'preserve'}); t.appendChild(doc.createTextNode(line)); r.appendChild(t)
    p.appendChild(r)

def cell(c, value, size=None):
    ps = children(c, 'w:p')
    for extra in ps[1:]: c.removeChild(extra)
    text(ps[0], value)
    if size is not None:
        style = children(children(ps[0], 'w:r')[0], 'w:rPr')[0]
        for tag in ('w:sz', 'w:szCs'):
            nodes = children(style, tag)
            if nodes: nodes[0].setAttribute('w:val', str(size))
            else: style.appendChild(el(c.ownerDocument, tag, {'w:val': size}))

def fmt(value):
    return date.fromisoformat(value).strftime('%d.%m.%Y') if value else '___ __________ 20___'

def longdate(value):
    d = date.fromisoformat(value)
    months = ['січня','лютого','березня','квітня','травня','червня','липня','серпня','вересня','жовтня','листопада','грудня']
    return f'«{d.day:02}» {months[d.month-1]} {d.year} року'

def generate(payload):
    global DEFAULT_SIZE
    kind, data = payload['kind'], payload['data']
    DEFAULT_SIZE = 24 if kind == 'contract' else 28
    if kind not in ('contract','diary'): raise ValueError('Unknown document kind')
    src = Path(__file__).resolve().parents[1] / 'templates' / (kind + '.docx')
    with ZipFile(src) as archive:
        doc = minidom.parseString(archive.read('word/document.xml'))
        body = doc.getElementsByTagName('w:body')[0]
        ps = children(body, 'w:p'); tables = children(body, 'w:tbl')
        student, period, assignment = payload['student'], payload['period'], payload['assignment']
        if kind == 'contract':
            values = {
                0: 'ДОГОВІР № ' + data['number'],
                4: f"Місто {data['city']}                         {longdate(data['signedOn'])}",
                14: 'і, з другої сторони, ' + data['enterpriseName'],
                16: '(далі – база практики), в особі ' + data['representative'],
                18: 'діючого на підставі ' + data['authority'] + '\n(статут підприємства, розпорядження, доручення)',
                41: 'Договір набуває сили після її підписання Сторонами і діє до ' + longdate(data['validUntil']) + '.',
                48: 'Бази практики, e-mail: ' + data['address'] + ', ' + data['email'],
            }
            if data['additionalTerms']: values[31] = 'Додаткові умови ' + data['additionalTerms']
            for i, v in values.items(): text(ps[i], v)
            row = children(tables[0], 'w:tr')[2]
            for i, (c, v) in enumerate(zip(children(row, 'w:tc'), ['1', data['specialty'], data['course'], period['type'], '1', student['fullName'], fmt(period['startDate']), fmt(period['endDate'])])):
                # Keep full dates on one line inside the university's narrow columns.
                cell(c, v, size=22 if i >= 6 else None)
        else:
            titles = {'навчальна': 'ЩОДЕННИК НАВЧАЛЬНО-ТЕХНОЛОГІЧНОЇ ПРАКТИКИ', 'виробнича': 'ЩОДЕННИК ВИРОБНИЧОЇ ПРАКТИКИ', 'переддипломна': 'ЩОДЕННИК ПЕРЕДДИПЛОМНОЇ ПРАКТИКИ'}
            values = {12: titles[period['type']], 13: period['type'].capitalize() + ' практика',
                16: 'здобувача вищої освіти ' + student['fullName'], 19: 'Факультет: ' + data['faculty'],
                21: 'Кафедра: ' + data['department'], 23: 'Освітній рівень: ' + data['qualification'],
                25: 'Освітня програма: ' + data['educationProgram'], 27: 'Спеціальність: ' + data['specialty'],
                29: data['course'] + ' курс, група ' + student['groupName'], 52: 'Здобувач ' + student['fullName'],
                57: payload['enterprise']['name'], 70: payload['enterprise']['name'],
                88: 'від закладу вищої освіти   ________ ' + payload['teacher']['shortName'],
                92: 'від бази практики   ________ ' + (assignment.get('supervisorName') or '________________'),
            }
            if data['arrivedOn']: values[61] = 'підприємства, компанії, установи   ' + longdate(data['arrivedOn'])
            if data['departedOn']: values[73] = 'підприємства, компанії, установи   ' + longdate(data['departedOn'])
            if data['responsiblePerson']:
                values[63] = '____________   ' + data['responsiblePerson']
                values[75] = '____________   ' + data['responsiblePerson']
            for i, v in values.items(): text(ps[i], v)
            # Repeat the university two-week table for longer practice periods.
            # No fixed February dates or pre-filled completion marks survive export.
            table = tables[0]; source_table = table.cloneNode(True)
            start = date.fromisoformat(period['startDate']); end = date.fromisoformat(period['endDate'])
            blocks = max(1, math.ceil(((end-start).days + 1) / 14))
            after_table = table.nextSibling
            for block in range(blocks):
                current = table if block == 0 else source_table.cloneNode(True)
                rows = children(current, 'w:tr')
                week_cells = children(rows[1], 'w:tc')
                cell(week_cells[2], str(block*2+1)); cell(week_cells[3], str(block*2+2))
                block_start = start + timedelta(days=block*14); block_end = min(end, block_start+timedelta(days=13))
                selected = [(i+1,r) for i,r in enumerate(data.get('schedule', [])) if date.fromisoformat(r['startDate']) <= block_end and date.fromisoformat(r['endDate']) >= block_start]
                for r in rows[2:]: current.removeChild(r)
                # Blank template has 24 rows. Filled content uses natural row height, preserving borders/fonts.
                for j in range(max(24, len(selected))):
                    row = rows[2].cloneNode(True)
                    for height in list(row.getElementsByTagName('w:trHeight')): height.setAttribute('w:hRule', 'atLeast')
                    if j < len(selected):
                        number, item = selected[j]; s=date.fromisoformat(item['startDate']); e=date.fromisoformat(item['endDate'])
                        marks=[]
                        for week in range(2):
                            ws=block_start+timedelta(days=week*7); we=min(end, ws+timedelta(days=6))
                            marks.append('+' if s <= we and e >= ws and ws <= end else '')
                        vals=[str(number),item['title'],*marks,'Виконано' if item['completed'] else '']
                    else: vals=['']*5
                    for c,v in zip(children(row,'w:tc'),vals): cell(c,v)
                    current.appendChild(row)
                if block:
                    heading=ps[78].cloneNode(True); text(heading, f'Календарний графік проходження практики (тижні {block*2+1}–{block*2+2})')
                    heading.getElementsByTagName('w:pPr')[0].appendChild(el(doc, 'w:pageBreakBefore'))
                    body.insertBefore(heading, after_table); body.insertBefore(current, after_table)
            # Work notes use the original last-page paragraph style. Remove blank ruled lines only
            # when replacing that writing area with actual entries; keep all ZIP relationships/media.
            ps[96].getElementsByTagName('w:pPr')[0].appendChild(el(doc, 'w:pageBreakBefore'))
            entries=payload.get('entries', [])
            if entries:
                anchor=ps[107]
                for p in ps[97:107]: body.removeChild(p)
                for item in entries:
                    p=ps[98].cloneNode(True)
                    text(p, f"{fmt(item['date'])} — {item['hours']} год.\n{item['description']}")
                    body.insertBefore(p, anchor)
        out=io.BytesIO()
        with ZipFile(out,'w') as result:
            for info in archive.infolist():
                result.writestr(info, doc.toxml(encoding='UTF-8') if info.filename=='word/document.xml' else archive.read(info.filename))
        return out.getvalue()

if __name__ == '__main__': sys.stdout.buffer.write(generate(json.load(sys.stdin)))
