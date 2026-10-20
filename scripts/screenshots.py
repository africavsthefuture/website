import asyncio, json, sys
from playwright.async_api import async_playwright
B = "http://127.0.0.1:4321"
pages = [("home", "/"), ("article", "/articles/reality-check-could-copper-do-for"), ("articles", "/articles"), ("podcast", "/podcast"), ("about", "/about"), ("briefing", "/briefing"), ("404", "/nope")]
out = {}
async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        for name, path in pages:
            for w, h, label, mob in [(1280, 800, "desktop", False), (390, 844, "mobile", True)]:
                ctx = await br.new_context(viewport={"width": w, "height": h}, is_mobile=mob, has_touch=mob)
                pg = await ctx.new_page(); errs = []; ext = set()
                pg.on("console", lambda m, e=errs: e.append(m.text) if m.type == "error" else None)
                pg.on("request", lambda r, s=ext: s.add(r.url.split("/")[2]) if not r.url.startswith(B) and not r.url.startswith("data:") else None)
                await pg.goto(B + path, wait_until="networkidle")
                await pg.screenshot(path=f"/workspace/avtf-site/screenshots/{name}-{label}-{w}-fold.png")
                # scroll through so lazy images load, then return to top for the full capture
                await pg.evaluate("""async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } window.scrollTo(0, 0); }""")
                await pg.wait_for_load_state("networkidle"); await pg.wait_for_timeout(400)
                await pg.screenshot(path=f"/workspace/avtf-site/screenshots/{name}-{label}-{w}-full.png", full_page=True)
                info = await pg.evaluate("""() => { const f=document.querySelector('form[data-subscribe]'); const r=f&&f.getBoundingClientRect();
                  return { h1:[...document.querySelectorAll('h1')].map(x=>x.innerText), formTop: r? Math.round(r.top+scrollY):null, formBottom: r? Math.round(r.bottom+scrollY):null,
                    imgsNoAlt:[...document.images].filter(i=>!i.hasAttribute('alt')).length, imgsNoDims:[...document.images].filter(i=>!i.getAttribute('width')||!i.getAttribute('height')).length,
                    navToggleVisible: getComputedStyle(document.querySelector('.nav-toggle')).display!=='none', sticky: getComputedStyle(document.querySelector('.sticky-sub')).display } }""")
                if mob and name == "home":
                    await pg.click(".nav-toggle"); await pg.wait_for_timeout(500)
                    await pg.screenshot(path=f"/workspace/avtf-site/screenshots/home-mobile-390-nav-open.png")
                    info["navOpen"] = await pg.evaluate("document.getElementById('site-nav').classList.contains('open')")
                    await pg.click(".nav-toggle"); await pg.evaluate("window.scrollTo(0, 2000)"); await pg.wait_for_timeout(600)
                    await pg.screenshot(path=f"/workspace/avtf-site/screenshots/home-mobile-390-scrolled-sticky.png")
                info["errors"] = errs; info["externalHosts"] = sorted(ext)
                out[f"{name}-{label}"] = info
                await ctx.close()
        await br.close()
    json.dump(out, open("/workspace/avtf-site/screenshots/checks.json", "w"), indent=1)
    print(json.dumps(out, indent=1))
asyncio.run(main())
