import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('data/extracted_pages.json', 'r', encoding='utf-8') as f:
    pages = json.load(f)

for p in pages:
    lines = [l.strip() for l in p['text'].split('\n') if l.strip()]
    first_few = ' | '.join(lines[:2]) if lines else 'EMPTY'
    first_lower = first_few.lower()
    if any(k in first_lower for k in ['chapter', 'appendix', 'project', 'section', 'volume', 'part']):
        print(f"Page {p['page']:3d}: {first_few[:100]}")
