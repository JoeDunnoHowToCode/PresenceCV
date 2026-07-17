import os
import re
from datetime import datetime

HUMANMAP_PATH = ".agents/HumanMap.md"
UPDATELOG_DIR = "UpdateLog"

def archive_logs():
    if not os.path.exists(HUMANMAP_PATH):
        print(f"File not found: {HUMANMAP_PATH}")
        return

    today = datetime.now().strftime("%Y-%m-%d")
    print(f"Today is {today}. Archiving older logs...")

    with open(HUMANMAP_PATH, "r", encoding="utf-8") as f:
        lines = f.readlines()

    date_pattern = re.compile(r'^(?:-\s\*\*|####\s)(\d{4}-\d{2}-\d{2})(?:\*\*|)\s*$')

    new_lines = []
    current_date = None
    current_section = None
    buffer = []
    
    # archives[date][section] = [lines...]
    archives = {}

    def flush_buffer():
        nonlocal current_date, buffer
        if not buffer:
            return
            
        if current_date and current_date != today:
            if current_date not in archives:
                archives[current_date] = {}
            if current_section not in archives[current_date]:
                archives[current_date][current_section] = []
            archives[current_date][current_section].extend(buffer)
        else:
            new_lines.extend(buffer)
            
        buffer = []

    for line in lines:
        if line.startswith("### ") and not line.startswith("#### "):
            flush_buffer()
            current_section = line.strip()
            current_date = None
            new_lines.append(line)
        else:
            match = date_pattern.match(line)
            if match:
                flush_buffer()
                current_date = match.group(1)
                buffer = [line]
            else:
                if current_date:
                    buffer.append(line)
                else:
                    new_lines.append(line)

    flush_buffer()

    if not archives:
        print("✅ No old logs found to archive.")
        return

    os.makedirs(UPDATELOG_DIR, exist_ok=True)
    for date_str, sections in archives.items():
        archive_path = os.path.join(UPDATELOG_DIR, f"{date_str}.md")
        with open(archive_path, "a", encoding="utf-8") as f:
            f.write("\n")
            for section, log_lines in sections.items():
                if section:
                    f.write(f"\n{section}\n\n")
                f.writelines(log_lines)
        
        total_lines = sum(len(lines) for lines in sections.values())
        print(f"📁 Archived {total_lines} lines to {archive_path}")

    with open(HUMANMAP_PATH, "w", encoding="utf-8") as f:
        f.writelines(new_lines)

    print("✅ Archiving complete. HumanMap.md has been cleanly updated.")

if __name__ == "__main__":
    archive_logs()
