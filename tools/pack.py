#!/usr/bin/env python3
"""pack.py min.js head.html out.html : deflate the script, store it as printable base-91 pairs, add a tiny self-extracting loader"""
import sys, zlib, re
js = open(sys.argv[1], 'rb').read(); head = open(sys.argv[2]).read()
co = zlib.compressobj(9, zlib.DEFLATED, 15, 9); z = co.compress(js) + co.flush()
def enc(v): v += 35; return chr(v + 1 if v >= 60 else v)
acc = 0; bits = 0; out = []
for b in z:
    acc |= b << bits; bits += 8
    while bits >= 13: v = acc & 8191; acc >>= 13; bits -= 13; out.append(enc(v // 91) + enc(v % 91))
if bits: out.append(enc(acc // 91) + enc(acc % 91))
data = ''.join(out); assert '<' not in data
head = head[:head.index('<script type="module">')]
css = re.search(r'<style>(.*?)</style>', head, re.S).group(1)
m = re.sub(r'\s+', ' ', css); m = re.sub(r'\s*([{};:,>])\s*', r'\1', m).replace(';}', '}').strip()
head = head.replace(css, m); head = re.sub(r'>\s+<', '><', head); head = re.sub(r'\n\s*', '\n', head).replace('\n', '')
loader = ("(async()=>{try{let t=document.getElementById('z').textContent,b=new Uint8Array(%d),a=0,k=0,j=0,i=0,c,d,s;"
          "for(;i<t.length;i+=2){c=t.charCodeAt(i)-35;d=t.charCodeAt(i+1)-35;a|=((c>24?c-1:c)*91+(d>24?d-1:d))<<k;k+=13;while(k>7){b[j++]=a;a>>=8;k-=8}}"
          "t=await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('deflate'))).text();"
          "s=document.createElement('script');s.type='module';s.textContent=t;document.body.appendChild(s)}"
          "catch(e){t=document.getElementById('fatal');t.style.display='block';t.textContent='VOIDLIGHT DEPTHS needs a current browser.'}})()") % len(z)
html = head + '<script type="z" id="z">' + data + '</script><script>' + loader + '</script></body></html>'
open(sys.argv[3], 'w').write(html)
print('js', len(js), 'deflate', len(z), 'html', len(html.encode()))
