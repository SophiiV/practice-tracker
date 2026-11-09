#!/usr/bin/env python3
"""Fill the retained university DOCX forms; stdlib only, JSON stdin, DOCX stdout.
Only document.xml changes. Preserve labels, individual run styles, table cells,
section geometry and all other package parts. Variable text stays in normal flow.
"""
import io
import json
import math
import re
import sys
from datetime import date, timedelta
from pathlib import Path
from xml.dom import minidom
from zipfile import ZipFile

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'


def children(node, tag):
    return [n for n in node.childNodes if n.nodeType == n.ELEMENT_NODE and n.tagName == tag]


def el(doc, tag, attrs=None):
    node = doc.createElementNS(W, tag)
    for key, value in (attrs or {}).items():
        node.setAttribute(key, str(value))
    return node


def prop(node, tag, attrs=None):
    found = children(node, tag)
    result = found[0] if found else el(node.ownerDocument, tag)
    if not found:
        before = next((c for c in node.childNodes if getattr(c, 'tagName', '') in ('w:rPr', 'w:sectPr')), None)
        node.insertBefore(result, before)
    for key, value in (attrs or {}).items():
        result.setAttribute(key, str(value))
    return result


def ppr(p):
    found = children(p, 'w:pPr')
    if found:
        return found[0]
    result = el(p.ownerDocument, 'w:pPr')
    p.insertBefore(result, p.firstChild)
    return result


def content(node):
    if node.tagName == 'w:t':
        return ''.join(c.data for c in node.childNodes if c.nodeType == c.TEXT_NODE)
    return {'w:tab': '\t', 'w:br': '\n'}.get(node.tagName, '')


def plain(p):
    return ''.join(content(c) for r in children(p, 'w:r') for c in r.childNodes if c.nodeType == c.ELEMENT_NODE)


def new_run(p, value, source=None, underline=None):
    doc = p.ownerDocument
    run = el(doc, 'w:r')
    source_style = children(source, 'w:rPr') if source is not None else []
    if not source_style:
        source_style = children(ppr(p), 'w:rPr')
    style = source_style[0].cloneNode(True) if source_style else el(doc, 'w:rPr')
    # Empty template cells often have only rtl=0 on their first run. Their intended
    # Times font is on the paragraph mark; inherit it rather than falling back to Calibri.
    paragraph_style = children(ppr(p), 'w:rPr')
    if not children(style, 'w:rFonts') and paragraph_style:
        fonts = children(paragraph_style[0], 'w:rFonts')
        if fonts:
            style.insertBefore(fonts[0].cloneNode(True), style.firstChild)
    if underline is not None:
        prop(style, 'w:u', {'w:val': 'single' if underline else 'none'})
    run.appendChild(style)
    for token in re.split('([\n\t])', str(value)):
        if token in ('\n', '\t'):
            run.appendChild(el(doc, 'w:br' if token == '\n' else 'w:tab'))
        elif token:
            t = el(doc, 'w:t', {'xml:space': 'preserve'})
            t.appendChild(doc.createTextNode(token))
            run.appendChild(t)
    return run


def replace_span(p, start, end, value, underline=None):
    """Splice a range without flattening the styles/tabs around that range."""
    position = 0
    inserted = False
    for run in list(children(p, 'w:r')):
        replacement = run.cloneNode(False)
        for style in children(run, 'w:rPr'):
            replacement.appendChild(style.cloneNode(True))
        def flush():
            nonlocal replacement
            if any(getattr(c, 'tagName', '') != 'w:rPr' for c in replacement.childNodes):
                p.insertBefore(replacement, run)
            replacement = run.cloneNode(False)
            for style in children(run, 'w:rPr'):
                replacement.appendChild(style.cloneNode(True))
        for node in run.childNodes:
            if node.nodeType != node.ELEMENT_NODE or node.tagName == 'w:rPr':
                continue
            text = content(node)
            stop = position + len(text)
            if not text or stop <= start or position >= end:
                replacement.appendChild(node.cloneNode(True))
            else:
                if position < start:
                    t = node.cloneNode(False)
                    t.setAttribute('xml:space', 'preserve')
                    t.appendChild(p.ownerDocument.createTextNode(text[:start-position]))
                    replacement.appendChild(t)
                if not inserted:
                    flush()
                    p.insertBefore(new_run(p, value, run, underline), run)
                    inserted = True
                if stop > end:
                    t = node.cloneNode(False)
                    t.setAttribute('xml:space', 'preserve')
                    t.appendChild(p.ownerDocument.createTextNode(text[end-position:]))
                    replacement.appendChild(t)
            position = stop
        flush()
        p.removeChild(run)
    if not inserted:
        raise ValueError('Template text slot not found')


def safe_spacing(p):
    spacing = children(ppr(p), 'w:spacing')
    if spacing and spacing[0].getAttribute('w:lineRule') == 'auto':
        if float(spacing[0].getAttribute('w:line') or 240) < 240:
            spacing[0].setAttribute('w:line', '240')
    if spacing and spacing[0].getAttribute('w:lineRule') == 'exact':
        spacing[0].setAttribute('w:lineRule', 'atLeast')


def replace(p, pattern, value, occurrence=0, underline=True):
    matches = list(re.finditer(pattern, plain(p)))
    if len(matches) <= occurrence:
        raise ValueError('Template does not contain expected field: ' + pattern)
    match = matches[occurrence]
    value = ' '.join(str(value).split())
    if match.group().startswith('_') and match.start() and not plain(p)[match.start()-1].isspace():
        value = ' ' + value
    replace_span(p, match.start(), match.end(), value, underline)
    safe_spacing(p)
    return match.start(), match.start() + len(value)


def fill(p, value, occurrence=0, pattern=r'_+(?: +_+)*'):
    return replace(p, pattern, value, occurrence)


def set_text(p, value, source=None):
    """Whole editable cell/empty slot only. Inherit formatting, never force a font."""
    runs = children(p, 'w:r')
    source = source if source is not None else (runs[0] if runs else None)
    run = new_run(p, value, source)
    for node in list(p.childNodes):
        if getattr(node, 'tagName', '') not in ('w:pPr', 'w:bookmarkStart', 'w:bookmarkEnd'):
            p.removeChild(node)
    p.appendChild(run)
    if value:
        safe_spacing(p)


def cell(c, value):
    # Empty paragraphs define the original row height; do not delete them.
    ps = children(c, 'w:p')
    set_text(ps[0], value)
    for p in ps[1:]:
        set_text(p, '')


def keep(p):
    prop(ppr(p), 'w:keepNext', {'w:val': '1'})


def page_start(p):
    prop(ppr(p), 'w:pageBreakBefore', {'w:val': '1'})


def fmt(value):
    return date.fromisoformat(value).strftime('%d.%m.%Y')


def longdate(value, ending='року'):
    d = date.fromisoformat(value)
    months = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня']
    return f'«{d.day:02}» {months[d.month-1]} {d.year} {ending}'


def expand_rector_box(p):
    # The source uses 22pt superscript in a 22.5pt box plus many trailing tabs.
    # Use a full-size 14pt line and enough space in both Word representations.
    width, height = 234 * 12700, 26 * 12700
    for extent in p.getElementsByTagName('wp:extent'):
        extent.setAttribute('cx', str(width)); extent.setAttribute('cy', str(height))
    for transform in p.getElementsByTagName('a:xfrm'):
        for extent in children(transform, 'a:ext'):
            extent.setAttribute('cx', str(width)); extent.setAttribute('cy', str(height))
    for shape in p.getElementsByTagName('v:shape'):
        style = re.sub(r'(?<![\w-])width:[^;]+', 'width:234pt', shape.getAttribute('style'))
        style = re.sub(r'(?<![\w-])height:[^;]+', 'height:26pt', style)
        shape.setAttribute('style', style)
    for textbox in p.getElementsByTagName('v:textbox'):
        textbox.setAttribute('inset', '3pt,0pt,3pt,0pt')
    for body in p.getElementsByTagName('wps:bodyPr'):
        for key, value in {'lIns':38100, 'rIns':38100, 'tIns':0, 'bIns':0, 'wrap':'none'}.items():
            body.setAttribute(key, str(value))
    for box in p.getElementsByTagName('w:txbxContent'):
        paragraphs = children(box, 'w:p')
        line = paragraphs[0]
        set_text(line, 'ректора В.М. Якубів')
        for extra in paragraphs[1:]:
            box.removeChild(extra)
        for style in line.getElementsByTagName('w:rPr'):
            prop(style, 'w:sz', {'w:val':'28'}); prop(style, 'w:szCs', {'w:val':'28'})
            prop(style, 'w:vertAlign', {'w:val':'baseline'})
            prop(style, 'w:w', {'w:val':'100'})


def fill_contract(ps, tables, payload):
    data, student, period = payload['data'], payload['student'], payload['period']
    # The original three text boxes have white fills which mask the captions below
    # them in Word/LibreOffice. Keep their exact geometry/text, remove only that fill.
    for p in (ps[7], ps[9], ps[11]):
        for shape in p.getElementsByTagName('wps:spPr'):
            for fill_node in list(children(shape, 'a:solidFill')):
                transparent = p.ownerDocument.createElementNS(
                    'http://schemas.openxmlformats.org/drawingml/2006/main', 'a:noFill')
                shape.replaceChild(transparent, fill_node)
        for shape in p.getElementsByTagName('v:shape'):
            shape.setAttribute('filled', 'f')
    expand_rector_box(ps[9])
    fill(ps[0], data['number'])
    _, city_end = fill(ps[4], data['city'], pattern=r'_+')
    replace(ps[4], r'“.*?р\.', longdate(data['signedOn'], 'р.'))
    replace_span(ps[4], city_end, plain(ps[4]).rindex('«'), '\t', False)
    tabs = prop(ppr(ps[4]), 'w:tabs')
    for tab in list(tabs.childNodes):
        tabs.removeChild(tab)
    tabs.appendChild(el(ps[4].ownerDocument, 'w:tab', {'w:val': 'right', 'w:pos': '9639'}))
    fill(ps[14], data['enterpriseName'])
    fill(ps[16], data['representative'])
    _, authority_end = fill(ps[18], data['authority'])
    # Preserve the original 9pt caption run and give it its own line.
    caption_start = plain(ps[18]).index('(статут', authority_end)
    replace_span(ps[18], authority_end, caption_start, '\n', False)
    if data.get('additionalTerms'):
        fill(ps[31], data['additionalTerms'])
    replace(ps[41], r'“.*?року', longdate(data['validUntil']))
    fill(ps[48], data['address'] + ', ' + data['email'])
    for index in (14, 15, 16, 17):
        keep(ps[index])
    # Keep the signature heading and its original spacing with the signature table.
    for p in ps[53:57]:
        keep(p)
    row = children(tables[0], 'w:tr')[2]
    values = ['1', data['specialty'], data['course'], period['type'], '1', student['fullName'], fmt(period['startDate']), fmt(period['endDate'])]
    for c, value in zip(children(row, 'w:tc'), values):
        cell(c, value)


def schedule_tables(body, ps, table, data, period):
    source = table.cloneNode(True)
    start, end = date.fromisoformat(period['startDate']), date.fromisoformat(period['endDate'])
    blocks = max(1, math.ceil(((end-start).days+1)/14))
    anchor = table.nextSibling
    for block in range(blocks):
        current = table if block == 0 else source.cloneNode(True)
        rows = children(current, 'w:tr')
        for row in rows[:2]:
            prop(prop(row, 'w:trPr'), 'w:tblHeader', {'w:val': '1'})
        week_cells = children(rows[1], 'w:tc')
        cell(week_cells[2], str(block*2+1)); cell(week_cells[3], str(block*2+2))
        block_start = start + timedelta(days=block*14)
        block_end = min(end, block_start+timedelta(days=13))
        selected = [(i+1, item) for i, item in enumerate(data.get('schedule', []))
                    if date.fromisoformat(item['startDate']) <= block_end and date.fromisoformat(item['endDate']) >= block_start]
        # Clone only overflow rows. Retain all 24 distinct original rows and their spacing.
        for j in range(max(len(rows)-2, len(selected))):
            row = rows[j+2] if j+2 < len(rows) else rows[-1].cloneNode(True)
            if j+2 >= len(rows):
                current.appendChild(row)
            prop(prop(row, 'w:trPr'), 'w:cantSplit', {'w:val': '1'})
            for height in row.getElementsByTagName('w:trHeight'):
                height.setAttribute('w:hRule', 'atLeast')
            values = ['']*5
            if j < len(selected):
                number, item = selected[j]
                s, e = date.fromisoformat(item['startDate']), date.fromisoformat(item['endDate'])
                marks = []
                for week in range(2):
                    ws = block_start + timedelta(days=week*7)
                    we = min(end, ws+timedelta(days=6))
                    marks.append('+' if s <= we and e >= ws and ws <= end else '')
                values = [str(number), item['title'], *marks, 'Виконано' if item['completed'] else '']
            for c, value in zip(children(row, 'w:tc'), values):
                cell(c, value)
        if block:
            heading = ps[78].cloneNode(True)
            page_start(heading); keep(heading)
            body.insertBefore(heading, anchor)
            for spacer in ps[79:81]:
                body.insertBefore(spacer.cloneNode(True), anchor)
            body.insertBefore(current, anchor)


def work_notes(body, ps, entries):
    # Original floating rules have contradictory zero-width anchors. Ruled paragraphs
    # follow their own text when it wraps, so lines cannot cross another entry.
    template = ps[98]
    anchor = ps[107]
    for p in ps[97:107]:
        body.removeChild(p)
    page_start(ps[96]); keep(ps[96])
    lines = []
    for item in entries:
        lines.append(f"{fmt(item['date'])} - {item['hours']} год.")
        lines.extend(str(item['description']).splitlines() or [''])
        lines.append('')
    occupied_lines = sum(max(1, math.ceil(len(line)/65)) for line in lines)
    for value in lines + [''] * max(0, 39-occupied_lines):
        p = template.cloneNode(True)
        set_text(p, value + '\t')
        pr = ppr(p)
        prop(pr, 'w:spacing', {'w:before': '0', 'w:after': '0', 'w:line': '340', 'w:lineRule': 'atLeast'})
        prop(pr, 'w:contextualSpacing', {'w:val': '0'})
        tabs = prop(pr, 'w:tabs')
        tabs.appendChild(el(p.ownerDocument, 'w:tab', {'w:val': 'right', 'w:pos': '9633', 'w:leader': 'underscore'}))
        for r in children(p, 'w:r'):
            rp = prop(r, 'w:rPr')
            prop(rp, 'w:rFonts', {'w:ascii': 'Times New Roman', 'w:hAnsi': 'Times New Roman', 'w:cs': 'Times New Roman'})
            prop(rp, 'w:sz', {'w:val': '28'}); prop(rp, 'w:szCs', {'w:val': '28'})
            prop(rp, 'w:u', {'w:val': 'single'})
        body.insertBefore(p, anchor)


def fill_diary(body, ps, table, payload):
    data, student, period = payload['data'], payload['student'], payload['period']
    titles = {'навчальна': 'НАВЧАЛЬНО-ТЕХНОЛОГІЧНОЇ', 'виробнича': 'ВИРОБНИЧОЇ', 'переддипломна': 'ПЕРЕДДИПЛОМНОЇ'}
    replace(ps[12], 'НАВЧАЛЬНО-ТЕХНОЛОГІЧНОЇ', titles[period['type']], underline=None)
    fill(ps[13], period['type'].capitalize() + ' практика')
    for index, value in [(16, student['fullName']), (19, data['faculty']), (21, data['department']),
                         (23, data['qualification']), (25, data['educationProgram']), (27, data['specialty']),
                         (52, student['fullName'])]:
        fill(ps[index], value)
    fill(ps[29], data['course'], pattern='_+')
    fill(ps[29], student['groupName'], pattern='_+')
    for index in (57, 70):
        set_text(ps[index], payload['enterprise']['name'], children(ps[56], 'w:r')[0])
    for index, key in [(61, 'arrivedOn'), (73, 'departedOn')]:
        if data.get(key):
            replace(ps[index], r'[„“].*?року', longdate(data[key]))
    if data.get('responsiblePerson'):
        for index in (63, 75):
            fill(ps[index], data['responsiblePerson'], pattern=r'_{20,}')
    fill(ps[88], payload['teacher']['shortName'], pattern=r'_{20,}')
    if payload['assignment'].get('supervisorName'):
        fill(ps[92], payload['assignment']['supervisorName'], pattern=r'_{20,}')
    # Replace brittle page padding, but retain its section properties.
    for p in ps[30:51]:
        body.removeChild(p)
    page_start(ps[52]); page_start(ps[78])
    for index in [12, 13, 16, 27, 52, 56, 61, 63, 69, 73, 75, 78, 86, 87, 88, 92]:
        keep(ps[index])
    schedule_tables(body, ps, table, data, period)
    work_notes(body, ps, payload.get('entries', []))


def generate(payload):
    kind = payload['kind']
    if kind not in ('contract', 'diary'):
        raise ValueError('Unknown document kind')
    source = Path(__file__).resolve().parents[1] / 'templates' / (kind+'.docx')
    with ZipFile(source) as archive:
        doc = minidom.parseString(archive.read('word/document.xml'))
        body = doc.getElementsByTagName('w:body')[0]
        ps, tables = children(body, 'w:p'), children(body, 'w:tbl')
        if kind == 'contract':
            fill_contract(ps, tables, payload)
        else:
            fill_diary(body, ps, tables[0], payload)
        output = io.BytesIO()
        with ZipFile(output, 'w') as result:
            for info in archive.infolist():
                result.writestr(info, doc.toxml(encoding='UTF-8') if info.filename == 'word/document.xml' else archive.read(info.filename))
        return output.getvalue()


if __name__ == '__main__':
    sys.stdout.buffer.write(generate(json.load(sys.stdin)))
