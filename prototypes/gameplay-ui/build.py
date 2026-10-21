import base64, sys, pathlib, re, json
root = pathlib.Path(sys.argv[1])
b64 = lambda name: "data:image/png;base64," + base64.b64encode((root/"sprites"/f"{name}.png").read_bytes()).decode()
m = {"cdn":"monster_8_front","cdnB":"monster_8_back","lb":"monster_44_front","lbB":"monster_44_back","key":"monster_31_front","keyB":"monster_31_back","spike":"monster_11_front","agent":"monster_33_front","clientP":"peb_portrait11","youP":"peb_portrait3"}
html = (root/"template.html").read_text()
nums = sorted({int(n) for n in re.findall(r"\[(\d+),\"", html[html.index("const GUIDE"):html.index("function guideState")])})
html = html.replace("{{MONMAP}}", json.dumps({n: b64(f"monster_{n}_front") for n in nums}))
for k,t in m.items():
    html = html.replace("{{"+k+"}}", b64(t))
assert "{{" not in html, html[html.index("{{"):html.index("{{")+30]
(root/"index.html").write_text(html)
print(len(html), len(nums))
