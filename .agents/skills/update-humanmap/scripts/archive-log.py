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

    # Match dates like: `- **2026-07-16**` or `#### 2026-07-15`
    date_pattern = re.compile(r'^(?:-\s\*\*|####\s)(\d{4}-\d{2}-\d{2})(?:\*\*|)\s*$')

    new_lines = []
    current_date = None
    buffer = []
    archives = {}

    for line in lines:
        match = date_pattern.match(line)
        if match:
            # Flush the buffer to the appropriate destination
            if current_date and current_date != today:
                if current_date not in archives:
                    archives[current_date] = []
                archives[current_date].extend(buffer)
            elif current_date == today or current_date is None:
                new_lines.extend(buffer)
            
            current_date = match.group(1)
            buffer = [line]
        else:
            # Reset if we hit a new section heading that is not a date block
            if line.startswith("### ") and not line.startswith("#### "):
                if current_date and current_date != today:
                    if current_date not in archives:
                        archives[current_date] = []
                    archives[current_date].extend(buffer)
                elif current_date == today or current_date is None:
                    new_lines.extend(buffer)
                
                current_date = None
                buffer = [line]
            else:
                buffer.append(line)

    # Flush the last buffer
    if current_date and current_date != today:
        if current_date not in archives:
            archives[current_date] = []
        archives[current_date].extend(buffer)
    elif current_date == today or current_date is None:
        new_lines.extend(buffer)

    if not archives:
        print("✅ No old logs found to archive.")
        return

    os.makedirs(UPDATELOG_DIR, exist_ok=True)
    for date_str, log_lines in archives.items():
        archive_path = os.path.join(UPDATELOG_DIR, f"{date_str}.md")
        with open(archive_path, "a", encoding="utf-8") as f:
            f.write("\n")
            f.writelines(log_lines)
        print(f"📁 Archived {len(log_lines)} lines to {archive_path}")

    with open(HUMANMAP_PATH, "w", encoding="utf-8") as f:
        f.writelines(new_lines)

    print("✅ Archiving complete. HumanMap.md has been cleanly updated.")

if __name__ == "__main__":
    archive_logs()
