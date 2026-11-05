#!/usr/bin/env python3
"""由 dashboard.html（claude.ai 儀表板的原始檔，不含 <html>/<head> 骨架）產生 GitHub Pages 用的 index.html。
修改頁面時請改 dashboard.html，再執行：python3 build_index.py"""
from pathlib import Path
body = Path("dashboard.html").read_text(encoding="utf-8")
head = ('<!doctype html>\n<!-- 由 build_index.py 自 dashboard.html 產生，請勿直接修改 -->\n<html lang="zh-Hant">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n'
        '</head>\n<body>\n')
Path("index.html").write_text(head + body + "\n</body>\n</html>\n", encoding="utf-8")
print("index.html 已更新")
