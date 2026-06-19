import zipfile
import xml.etree.ElementTree as ET
import sys
import os

def read_docx(file_path):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return ""
    try:
        with zipfile.ZipFile(file_path) as docx:
            xml_content = docx.read('word/document.xml')
            root = ET.fromstring(xml_content)
            
            # Namespaces
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            
            text_runs = []
            for paragraph in root.findall('.//w:p', ns):
                for run in paragraph.findall('.//w:r', ns):
                    text_el = run.find('w:t', ns)
                    if text_el is not None and text_el.text:
                        text_runs.append(text_el.text)
                text_runs.append('\n')
            return "".join(text_runs)
    except Exception as e:
        return f"Error reading {file_path}: {e}"

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python parse_docx.py <path_to_docx>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    out_file = file_path.replace(".docx", "_text.txt")
    text = read_docx(file_path)
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(text)
    print(f"Written text to {out_file}")

