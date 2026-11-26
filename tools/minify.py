#!/usr/bin/env python3
"""Tokenizer-based minifier for the VOIDLIGHT bundles.
   - strips comments and needless whitespace from JS and embedded GLSL
   - consistent whole-program identifier renaming (variables and own property names alike), skipping every name
     that is a keyword, a platform API name, a word that occurs inside any string, or matches a dynamic-key prefix
   usage: minify.py in.js out.js [--ids ids.json] [--platform platform.txt] [--map map.json]"""
import re, sys, json, itertools

KEY = set('''break case catch class const continue debugger default delete do else export extends finally for function if import in
instanceof new return super switch this throw try typeof var void while with yield let static enum await implements package protected
interface private public null true false undefined NaN Infinity async of get set arguments constructor prototype'''.split())
DICT = set('''antialias alpha depth stencil powerPreference premultipliedAlpha preserveDrawingBuffer desynchronized passive once capture
value writable configurable enumerable next done stack message name length then latencyHint sampleRate numberOfChannels
willReadFrequently TEXTURE_MAX_ANISOTROPY_EXT'''.split())
HOOK = set('''__vd fast go errors game state deckNo slain theme lockQ descend room hero deck kills id
Q level ema GX calls progs gl Post render Brain goal type tgt kind x z hp THEMES VIEW iw ih CAM h FINU'''.split())
HOOK_ONLY = set('''game VIEW Flow Brain Post CAM THEMES Nav Coins Lights FX FINU VOLU DOFU SKYP AOU RESU BLU hemi moon lantern scene deck hero errors GX fast
descend room theme lockQ fatal'''.split())
DYN = re.compile(r'^(banner|cone|cyl|glyph|glyphUp|screen|leg)\d+$|^p_|^(arm|fore|leg|shin)[LR]$|^(Key[A-Z]|Digit\d|Numpad\w+|Arrow(Up|Down|Left|Right)|Space|Enter|Escape|Tab|Backspace|(Shift|Control|Alt|Meta)(Left|Right)|F\d\d?)$')
PUNCT = ['>>>=', '...', '===', '!==', '**=', '<<=', '>>=', '>>>', '=>', '==', '!=', '<=', '>=', '&&', '||', '??', '?.', '++', '--', '+=', '-=', '*=',
         '/=', '%=', '&=', '|=', '^=', '**', '<<', '>>']
RE_ID = re.compile(r'[A-Za-z_$][\w$]*')
RE_NUM = re.compile(r'0[xX][0-9a-fA-F]+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?')
RE_WS = re.compile(r'[ \t\r\n]+')
REGEX_PREV = set('( , = : [ ! & | ? { } ; + - * % < > ~ ^ && || => == === != !== += -= *= /= ?? return typeof case do else in of new delete void throw'.split())

def tokenize(s, i=0, until=None):
    """returns (tokens, index). tokens: [type, text] with type in id num str re tpl p nl"""
    out = []; n = len(s); depth = 0
    def last():
        for t in reversed(out):
            if t[0] != 'nl': return t
        return None
    while i < n:
        c = s[i]
        if until and c == until and depth == 0: return out, i
        m = RE_WS.match(s, i)
        if m:
            if '\n' in m.group(): out.append(['nl', '\n'])
            i = m.end(); continue
        if s.startswith('//', i):
            j = s.find('\n', i); i = n if j < 0 else j; continue
        if s.startswith('/*', i):
            i = s.index('*/', i) + 2; continue
        if c in '\'"':
            j = i + 1
            while s[j] != c: j += 2 if s[j] == '\\' else 1
            out.append(['str', s[i:j + 1]]); i = j + 1; continue
        if c == '`':
            parts = []; j = i + 1; buf = ''
            while s[j] != '`':
                if s[j] == '\\': buf += s[j:j + 2]; j += 2
                elif s.startswith('${', j):
                    parts.append(buf); buf = ''; toks, j = tokenize(s, j + 2, '}'); parts.append(toks); j += 1
                else: buf += s[j]; j += 1
            parts.append(buf); out.append(['tpl', parts]); i = j + 1; continue
        m = RE_ID.match(s, i)
        if m: out.append(['id', m.group()]); i = m.end(); continue
        if c.isdigit() or (c == '.' and i + 1 < n and s[i + 1].isdigit()):
            m = RE_NUM.match(s, i); out.append(['num', m.group()]); i = m.end(); continue
        if c == '/':
            p = last()
            if p is None or (p[0] == 'p' and p[1] in REGEX_PREV) or (p[0] == 'id' and p[1] in REGEX_PREV):
                j = i + 1; cls = False
                while True:
                    ch = s[j]
                    if ch == '\\': j += 2; continue
                    if ch == '[': cls = True
                    elif ch == ']': cls = False
                    elif ch == '/' and not cls: break
                    j += 1
                j += 1
                while j < n and s[j].isalpha(): j += 1
                out.append(['re', s[i:j]]); i = j; continue
        for p in PUNCT:
            if s.startswith(p, i): out.append(['p', p]); i += len(p); break
        else:
            if c in '{': depth += 1
            elif c in '}': depth -= 1
            out.append(['p', c]); i += 1
    return out, i

GLSL_HINT = re.compile(r'void main|uniform |gl_Position|gl_FragColor|\bvec[234]\b|\bfloat ')
RE_GT = re.compile(r'\s+|//[^\n]*|/\*.*?\*/|#[^\n]*|[A-Za-z_][\w]*|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?|\+\+|--|&&|\|\||<<|>>|[-+*/<>=!]=|.', re.S)
RE_GW = re.compile(r'[A-Za-z_][\w]*$|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$')
def glsl_min(src):
    out = ''; prev = ''
    for m in RE_GT.finditer(src):
        t = m.group()
        if t.isspace() or t.startswith('//') or t.startswith('/*'): continue
        if t[0] == '#':
            out = out.rstrip(' ') + ('' if out.endswith('\n') else '\n') + ' '.join(t.split()) + '\n'; prev = ''; continue
        if prev and ((RE_GW.match(prev) and RE_GW.match(t)) or (prev[-1] in '+-' and t[0] == prev[-1])): out += ' '
        out += t; prev = t
    if re.search(r'\n\s*$', src) and not out.endswith('\n'): out += '\n'
    return out

def words_of(text): return RE_ID.findall(text)

def walk(tokens, fn):
    for t in tokens:
        if t[0] == 'tpl':
            for k, part in enumerate(t[1]):
                if k % 2: walk(part, fn)
                else: fn('tpltext', part, t, k)
        else: fn(t[0], t[1], t, None)

def emit(tokens):
    out = []; prev = None; pend_nl = False; stack = []; ctl = False
    def wordy(t): return t[0] in ('id', 'num')
    sig = [t for t in tokens if t[0] != 'nl']; nxt = {}
    for a, b in zip(sig, sig[1:]): nxt[id(a)] = b
    for t in tokens:
        if t[0] == 'nl': pend_nl = True; continue
        txt = t[1]
        if t[0] == 'tpl':
            txt = '`' + ''.join(('${' + emit(p) + '}') if k % 2 else p for k, p in enumerate(t[1])) + '`'
        if t[0] == 'p' and txt == ';':
            n = nxt.get(id(t))
            if n is not None and n[0] == 'p' and n[1] == '}' and not ctl and prev is not None and not (prev[0] == 'id' and prev[1] in ('else', 'do')) and not (prev[0] == 'p' and prev[1] in ('{', ';')):
                continue
        was_ctl = False
        if t[0] == 'p' and txt == '(': stack.append(prev)
        elif t[0] == 'p' and txt == ')':
            o = stack.pop() if stack else None
            was_ctl = o is not None and o[0] == 'id' and o[1] in ('for', 'while', 'if', 'with')
        if prev is not None:
            a = prev[2]; sep = ''
            if pend_nl and not (prev[0] == 'p' and prev[1] in (';', '{', ',', '(', '[', ':', '=', '=>', '&&', '||', '?', '+', '-', '*', '/', '<', '>')) and not (t[0] == 'p' and txt in ('}', ')', ']', ',', ';', '.', '?', ':', '&&', '||', '=', '=>', '*', '/', '<', '>')): sep = '\n'
            elif wordy(prev) and wordy(t): sep = ' '
            elif prev[0] == 'num' and txt[0] == '.': sep = ' '
            elif a[-1] in '+-' and txt[0] == a[-1]: sep = ' '
            elif a[-1] == '/' and txt[0] == '/': sep = ' '
            out.append(sep)
        out.append(txt); prev = (t[0], t[1], txt); pend_nl = False; ctl = was_ctl
    return ''.join(out)

def names():
    a = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$'; b = a + '0123456789'
    for c in a: yield c
    for n in itertools.count(1):
        for first in a:
            for rest in itertools.product(b, repeat=n): yield first + ''.join(rest)

def main():
    args = sys.argv[1:]; src = open(args[0]).read(); strip = '--strip-hook' in args
    if strip: args.remove('--strip-hook')
    opt = dict(zip(args[2::2], args[3::2]))
    if strip:
        a = src.index('window.__vd = {'); b = src.index('requestAnimationFrame(frame);', a); src = src[:a] + src[b:]
    MANUAL = DICT if strip else DICT | HOOK
    toks, _ = tokenize(src)
    # GLSL inside templates and plain strings
    def gl(kind, text, tok, k):
        if kind == 'tpltext':
            whole = ''.join(p for i, p in enumerate(tok[1]) if i % 2 == 0)
            if GLSL_HINT.search(whole):
                m = glsl_min(text)
                if text[:1].isspace() and m and (m[0].isalnum() or m[0] == '_') and k > 0: m = ' ' + m
                if text[-1:].isspace() and m and (m[-1].isalnum() or m[-1] == '_') and k < len(tok[1]) - 1: m = m + ' '
                tok[1][k] = m
        elif kind == 'str' and GLSL_HINT.search(text):
            body = text[1:-1]
            if '\\' not in body.replace('\\n', ''):
                tok[1] = text[0] + glsl_min(body.replace('\\n', '\n')).replace('\n', '\\n') + text[0]
    walk(toks, gl)
    # identifier census
    count = {}; strwords = set()
    def census(kind, text, tok, k):
        if kind == 'id': count[text] = count.get(text, 0) + 1
        elif kind in ('str', 'tpltext'): strwords.update(words_of(text))
    walk(toks, census)
    if '--ids' in opt: json.dump(sorted(count), open(opt['--ids'], 'w'))
    # names that only ever appear as object-literal keys are reached through computed lookups (often with strings the
    # platform supplies, such as KeyboardEvent.code), so they keep their spelling
    keyocc = {}
    def keys_in(toks_):
        sig = [x for x in toks_ if x[0] != 'nl']
        for i, x in enumerate(sig):
            if x[0] == 'tpl':
                for k, part in enumerate(x[1]):
                    if k % 2: keys_in(part)
            elif x[0] == 'id' and 0 < i < len(sig) - 1 and sig[i - 1][0] == 'p' and sig[i - 1][1] in ('{', ',') and sig[i + 1][0] == 'p' and sig[i + 1][1] == ':': keyocc[x[1]] = keyocc.get(x[1], 0) + 1
    keys_in(toks); keyonly = {n for n, c in keyocc.items() if c == count.get(n)}
    platform = set(open(opt['--platform']).read().split()) if '--platform' in opt else None
    if platform is not None and strip: platform -= HOOK_ONLY
    rename = {}
    if platform is not None:
        keep = KEY | MANUAL | platform | strwords | keyonly
        cand = [n for n in count if len(n) > 2 and n not in keep and not DYN.match(n)]
        cand.sort(key=lambda n: -count[n] * (len(n) - 2))
        taken = set(count) | KEY | platform | strwords | MANUAL
        gen = names()
        for n in cand:
            while True:
                s = next(gen)
                if s not in taken: break
            if len(s) >= len(n): continue
            rename[n] = s
        def ren(kind, text, tok, k):
            if kind == 'id' and text in rename: tok[1] = rename[text]
            elif kind == 'id' and text == 'const': tok[1] = 'let'
        walk(toks, ren)
        if '--map' in opt: json.dump(rename, open(opt['--map'], 'w'), indent=0)
    out = emit(toks)
    open(args[1], 'w').write(out)
    print('minified:', len(src), '->', len(out), 'ids:', len(count), 'renamed:', len(rename), 'key-only kept:', len([n for n in keyonly if len(n) > 2 and n not in (KEY | MANUAL | (platform or set()) | strwords)]))

main()
