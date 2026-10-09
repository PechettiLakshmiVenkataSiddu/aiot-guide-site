import pypdf
import json
import os
import re

pdf_path = "data/docs/AIoT_Master_Guide_FINAL_v2.pdf"
reader = pypdf.PdfReader(pdf_path)
total_pages = len(reader.pages)
print(f"Total pages in PDF: {total_pages}")

pages_text = []
for i, page in enumerate(reader.pages):
    text = page.extract_text() or ""
    pages_text.append({
        "page": i + 1,
        "text": text
    })

with open("data/extracted_pages.json", "w", encoding="utf-8") as f:
    json.dump(pages_text, f, indent=2, ensure_ascii=False)

print(f"Saved {len(pages_text)} extracted pages to data/extracted_pages.json")
