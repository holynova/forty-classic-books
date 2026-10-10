import json
import os
import re

conv_ids = [
    ("group1", "c2827a3d-7f43-4bd4-849e-d46e33269d51"),
    ("group3", "a5e80567-dd1a-411d-8da1-4dd2d8f81055"),
    ("group4", "a48dd152-fc18-4c28-8733-3b589d4de755"),
    ("group5", "8418ef3a-df8c-4339-953f-874f2b72c225"),
]

for name, cid in conv_ids:
    log_path = f"/Users/sym/.gemini/antigravity/brain/{cid}/.system_generated/logs/transcript_full.jsonl"
    if not os.path.exists(log_path):
        log_path = f"/Users/sym/.gemini/antigravity/brain/{cid}/.system_generated/logs/transcript.jsonl"
    
    found = False
    with open(log_path, "r", encoding="utf-8") as f:
        for line_no, line in enumerate(f):
            try:
                step = json.loads(line)
            except Exception:
                continue
            content = step.get("content") or ""
            thinking = step.get("thinking") or ""
            
            # Check content and thinking
            for text in [content, thinking]:
                if "```json" in text:
                    m = re.findall(r"```json\s*(\[\s*\{.*?\}\s*\])\s*```", text, re.DOTALL)
                    if m:
                        raw_json = m[-1]
                        try:
                            data = json.loads(raw_json)
                            titles = [b.get("title") for b in data]
                            print(f"SUCCESS {name} at line {line_no}: {len(data)} books: {titles}")
                            with open(f"data/batch2_{name}.json", "w", encoding="utf-8") as out:
                                json.dump(data, out, ensure_ascii=False, indent=2)
                            found = True
                            break
                        except Exception as e:
                            pass
            if found:
                break
    if not found:
        print(f"NOT COMPLETED in transcript: {name}")
