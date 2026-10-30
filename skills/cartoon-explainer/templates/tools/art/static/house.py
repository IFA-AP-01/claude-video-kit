import math, random
random.seed(7)
o=[]
A=o.append
def f(v): return f"{v:.1f}".rstrip('0').rstrip('.')
A('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">')
A('''<defs>
<radialGradient id="glow" cx="960" cy="640" r="420" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffd38a" stop-opacity="0.42"/><stop offset="0.55" stop-color="#f7c27a" stop-opacity="0.14"/><stop offset="1" stop-color="#f7c27a" stop-opacity="0"/></radialGradient>
<radialGradient id="lamp" cx="1078" cy="884" r="170" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffe2a0" stop-opacity="0.55"/><stop offset="1" stop-color="#ffe2a0" stop-opacity="0"/></radialGradient>
<linearGradient id="eave" x1="0" y1="470" x2="0" y2="560" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#1c1f3d" stop-opacity="0.55"/><stop offset="1" stop-color="#1c1f3d" stop-opacity="0"/></linearGradient>
<linearGradient id="roofg" x1="0" y1="232" x2="0" y2="470" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#555b88"/><stop offset="1" stop-color="#40456b"/></linearGradient>
<linearGradient id="wallg" x1="600" y1="0" x2="1320" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#8590b8"/><stop offset="0.6" stop-color="#7a86ad"/><stop offset="1" stop-color="#6a7499"/></linearGradient>
<linearGradient id="win2" x1="0" y1="860" x2="0" y2="1010" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#f5cf88"/><stop offset="1" stop-color="#d98f50"/></linearGradient>
<linearGradient id="glass" x1="0" y1="860" x2="0" y2="1010" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#4f5c88"/><stop offset="1" stop-color="#333c62"/></linearGradient>
<clipPath id="wallc"><path clip-rule="evenodd" d="M600 470 L1320 470 L1320 1080 L600 1080 Z M760 500 L1160 500 L1160 770 L760 770 Z"/></clipPath>
<clipPath id="roofc"><path d="M520 470 L790 232 L1130 232 L1400 470 Z"/></clipPath>
<clipPath id="gablec"><path d="M708 470 L960 282 L1212 470 Z"/></clipPath>
</defs>''')
# warm spill behind
A('<ellipse cx="960" cy="650" rx="520" ry="420" fill="url(#glow)" opacity="0.6"/>')
# chimney (behind roof)
A('<path d="M1168 330 L1168 168 Q1168 160 1176 160 L1246 160 Q1254 160 1254 168 L1254 330 Z" fill="#6a5571"/>')
A('<path d="M1226 160 L1246 160 Q1254 160 1254 168 L1254 330 L1226 330 Z" fill="#574560"/>')
for r,y in enumerate(range(176,330,18)):
    off = 0 if r%2==0 else 18
    for x in range(1168-off, 1254, 36):
        x0=max(x,1170); x1=min(x+32,1252)
        if x1-x0>8: A(f'<rect x="{x0}" y="{y}" width="{x1-x0}" height="14" rx="3" fill="#7a6480" opacity="{0.35 if x0<1226 else 0.18}"/>')
A('<path d="M1156 150 Q1156 140 1166 140 L1256 140 Q1266 140 1266 150 L1266 166 L1156 166 Z" fill="#4c3d57"/>')
A('<path d="M1160 141 L1262 141 L1262 147 L1160 147 Z" fill="#8c7a96" opacity="0.6"/>')
# wall
A('<path clip-rule="evenodd" fill-rule="evenodd" d="M600 470 L1320 470 L1320 1080 L600 1080 Z M760 500 L1160 500 L1160 770 L760 770 Z" fill="url(#wallg)"/>')
g=['<g clip-path="url(#wallc)">']
for y in range(500,1080,30):
    g.append(f'<rect x="600" y="{y}" width="720" height="4" fill="#4d5680" opacity="0.32"/>')
    g.append(f'<rect x="600" y="{y+4}" width="720" height="2" fill="#ffffff" opacity="0.07"/>')
g.append('<rect x="600" y="470" width="720" height="90" fill="url(#eave)"/>')
g.append('<ellipse cx="960" cy="640" rx="380" ry="300" fill="url(#glow)"/>')
g.append('<rect x="600" y="470" width="26" height="610" fill="#9aa4c8" opacity="0.55"/><rect x="1294" y="470" width="26" height="610" fill="#56608a" opacity="0.7"/>')
g.append('</g>')
A(''.join(g))
# roof
A('<path d="M520 470 L790 232 L1130 232 L1400 470 Z" fill="url(#roofg)"/>')
g=['<g clip-path="url(#roofc)">']
for i,y in enumerate(range(252,470,24)):
    r=14; x=500 + (r if i%2 else 0); d=f'M500 {y}'
    while x<1420:
        d+=f' L{x} {y} a{r} {r*0.75:.1f} 0 0 0 {2*r} 0'; x+=2*r
    g.append(f'<path d="{d}" fill="none" stroke="#353a5e" stroke-width="3" opacity="0.55" stroke-linejoin="round"/>')
g.append('<path d="M520 470 L790 232 L812 232 L548 470 Z" fill="#7076a6" opacity="0.5"/>')
g.append('<path d="M1400 470 L1130 232 L1108 232 L1372 470 Z" fill="#2f3355" opacity="0.45"/>')
g.append('</g>')
A(''.join(g))
A('<path d="M784 224 L1136 224 Q1144 224 1144 232 L1144 238 L776 238 L776 232 Q776 224 784 224 Z" fill="#3a3e62"/>')
A('<path d="M786 225 L1134 225 L1134 229 L786 229 Z" fill="#8a90bd" opacity="0.6"/>')
# eave fascia
A('<path d="M504 466 L1416 466 Q1424 466 1424 474 L1424 482 Q1424 490 1416 490 L504 490 Q496 490 496 482 L496 474 Q496 466 504 466 Z" fill="#3a3e62"/>')
A('<path d="M504 466 L1416 466 L1416 471 L504 471 Z" fill="#8a90bd" opacity="0.45"/>')
# front gable
A('<path d="M708 470 L960 282 L1212 470 Z" fill="#8792ba"/>')
g=['<g clip-path="url(#gablec)">']
for x in range(714,1212,22):
    g.append(f'<rect x="{x}" y="270" width="3" height="210" fill="#4d5680" opacity="0.28"/>')
g.append('<path d="M960 282 L1212 470 L1160 470 Z" fill="#5d678f" opacity="0.5"/>')
g.append('<rect x="700" y="440" width="520" height="40" fill="#1c1f3d" opacity="0.22"/>')
g.append('</g>')
A(''.join(g))
# attic vent
A('<circle cx="960" cy="402" r="34" fill="#e3d8c2"/><circle cx="960" cy="402" r="25" fill="#3b4268"/>')
for dy in (-14,-5,4,13):
    w=math.sqrt(max(0,25**2-dy**2))
    A(f'<rect x="{960-w:.0f}" y="{402+dy-2}" width="{2*w:.0f}" height="4" fill="#5a648e"/>')
A('<path d="M926 402 A34 34 0 0 1 994 402 L986 402 A26 26 0 0 0 934 402 Z" fill="#fff7e6" opacity="0.35"/>')
# bargeboards
A('<path d="M688 486 L960 268 L1232 486 L1206 490 L960 296 L714 490 Z" fill="#3a3e62"/>')
A('<path d="M688 486 L960 268 L966 274 L696 490 Z" fill="#8a90bd" opacity="0.55"/>')
A('<path d="M960 268 L1232 486 L1222 488 L960 282 Z" fill="#262a48" opacity="0.6"/>')
# upper window: shutters
for x0 in (684,1180):
    A(f'<rect x="{x0}" y="500" width="56" height="270" rx="5" fill="#4a5b86"/>')
    A(f'<rect x="{x0+6}" y="508" width="44" height="254" rx="3" fill="#3f4f78"/>')
    for y in range(518,758,16):
        A(f'<rect x="{x0+8}" y="{y}" width="40" height="7" rx="2" fill="#5a6c98"/>')
    A(f'<rect x="{x0+46}" y="500" width="10" height="270" fill="#2e3a5e" opacity="0.5"/>' if x0==684 else f'<rect x="{x0}" y="500" width="8" height="270" fill="#2e3a5e" opacity="0.35"/>')
# curtains inside the opening (overlap kid edges)
A('<path d="M760 500 L838 500 C826 560 822 640 836 700 C842 730 830 760 812 770 L760 770 Z" fill="#c9644d"/>')
A('<path d="M760 500 L792 500 C786 590 788 690 800 770 L760 770 Z" fill="#a84f40"/>')
A('<path d="M810 512 C802 580 802 660 816 728" fill="none" stroke="#e58a6c" stroke-width="5" stroke-linecap="round" opacity="0.7"/>')
A('<path d="M1160 500 L1104 500 C1114 560 1118 640 1108 700 C1104 730 1114 760 1128 770 L1160 770 Z" fill="#c9644d"/>')
A('<path d="M1160 500 L1138 500 C1144 590 1142 690 1134 770 L1160 770 Z" fill="#a84f40"/>')
A('<path d="M760 500 L1160 500 L1160 514 L760 514 Z" fill="#7b3a33"/>')
# window frame + mullion + header + sill
A('<path fill-rule="evenodd" d="M744 486 L1176 486 L1176 784 L744 784 Z M760 500 L760 770 L1160 770 L1160 500 Z" fill="#e6dbc5"/>')
A('<path d="M1160 500 L1176 486 L1176 784 L1160 770 Z" fill="#bfb39c"/><path d="M760 770 L1160 770 L1176 784 L744 784 Z" fill="#cfc3ab"/>')
A('<rect x="952" y="500" width="16" height="270" fill="#e6dbc5"/><rect x="964" y="500" width="4" height="270" fill="#bfb39c"/>')
A('<path d="M728 466 L1192 466 L1200 486 L720 486 Z" fill="#efe5d0"/><rect x="720" y="482" width="480" height="6" fill="#1c1f3d" opacity="0.25"/>')
A('<path d="M726 784 L1194 784 Q1202 784 1202 792 L1202 798 L718 798 L718 792 Q718 784 726 784 Z" fill="#f2e8d4"/>')
A('<rect x="718" y="798" width="484" height="10" fill="#1c1f3d" opacity="0.3"/>')
# glass glints
A('<path d="M772 512 L802 512 L776 560 Z" fill="#ffffff" opacity="0.12"/><path d="M978 512 L1018 512 L982 572 Z" fill="#ffffff" opacity="0.12"/>')
# flower box
A('<path d="M776 808 L1144 808 L1136 852 Q1134 858 1128 858 L792 858 Q786 858 784 852 Z" fill="#7a4e3a"/>')
A('<path d="M776 808 L1144 808 L1142 818 L778 818 Z" fill="#94604a"/>')
for x in range(796,1130,22): A(f'<rect x="{x}" y="824" width="3" height="28" fill="#5f3c2d" opacity="0.6"/>')
d='M780 812'
x=780
while x<1140:
    h=random.uniform(14,26); w=random.uniform(16,24)
    d+=f' Q{x+w/2:.0f} {812-h*2:.0f} {x+w:.0f} 812'; x+=w
A(f'<path d="{d} Z" fill="#3f6a52"/>')
for i in range(15):
    x=794+i*24+random.uniform(-4,4); y=792+random.uniform(-10,4)
    col=random.choice(['#f2a7a0','#f6d27a','#f7f0e2','#e98a7a'])
    A(f'<g transform="translate({x:.0f} {y:.0f})"><circle r="7" fill="{col}"/><circle r="3" fill="#f6c34a"/></g>')
# lower windows
def lowwin(x0,lit):
    A(f'<rect x="{x0-14}" y="846" width="198" height="178" rx="4" fill="#e6dbc5"/>')
    A(f'<rect x="{x0}" y="860" width="170" height="150" fill="url(#{"win2" if lit else "glass"})"/>')
    if lit:
        A(f'<path d="M{x0} 860 L{x0+46} 860 C{x0+38} 900 {x0+38} 960 {x0+50} 1010 L{x0} 1010 Z" fill="#c9644d" opacity="0.85"/>')
        A(f'<path d="M{x0+170} 860 L{x0+128} 860 C{x0+136} 900 {x0+136} 960 {x0+124} 1010 L{x0+170} 1010 Z" fill="#c9644d" opacity="0.85"/>')
        A(f'<path d="M{x0+70} 940 C{x0+70} 920 {x0+100} 920 {x0+100} 940 L{x0+104} 1010 L{x0+66} 1010 Z" fill="#9a5a3a" opacity="0.55"/>')
    else:
        A(f'<path d="M{x0+14} 872 L{x0+54} 872 L{x0+20} 930 Z" fill="#ffffff" opacity="0.13"/><path d="M{x0+92} 872 L{x0+112} 872 L{x0+94} 900 Z" fill="#ffffff" opacity="0.1"/>')
    A(f'<rect x="{x0+78}" y="860" width="14" height="150" fill="#e6dbc5"/><rect x="{x0}" y="928" width="170" height="12" fill="#e6dbc5"/>')
    A(f'<rect x="{x0+170}" y="860" width="14" height="164" fill="#bfb39c"/>')
    A(f'<rect x="{x0-22}" y="1018" width="214" height="14" rx="4" fill="#f2e8d4"/><rect x="{x0-22}" y="1032" width="214" height="8" fill="#1c1f3d" opacity="0.3"/>')
lowwin(660,True); lowwin(1090,False)
# door with porch
A('<path d="M862 1080 L862 836 Q862 822 876 822 L1044 822 Q1058 822 1058 836 L1058 1080 Z" fill="#e6dbc5"/>')
A('<path d="M878 1080 L878 852 Q878 838 892 838 L1028 838 Q1042 838 1042 852 L1042 1080 Z" fill="#6d4a52"/>')
A('<path d="M1010 838 L1028 838 Q1042 838 1042 852 L1042 1080 L1010 1080 Z" fill="#5a3c45"/>')
for (y,h) in ((900,70),(990,70)):
    A(f'<rect x="898" y="{y}" width="50" height="{h}" rx="6" fill="#5e3f47"/><rect x="972" y="{y}" width="50" height="{h}" rx="6" fill="#5e3f47"/>')
    A(f'<rect x="898" y="{y}" width="50" height="5" rx="2" fill="#86636b"/><rect x="972" y="{y}" width="50" height="5" rx="2" fill="#86636b"/>')
A('<path d="M906 884 Q906 856 960 856 Q1014 856 1014 884 Z" fill="#f2cf88"/><path d="M958 856 L962 856 L962 884 L958 884 Z" fill="#6d4a52"/>')
A('<circle cx="1022" cy="968" r="10" fill="#d9b468"/><circle cx="1019" cy="965" r="4" fill="#fff3c4"/>')
A('<path d="M842 812 L1078 812 L1066 790 L854 790 Z" fill="#3a3e62"/><path d="M842 812 L1078 812 L1078 820 L842 820 Z" fill="#1c1f3d" opacity="0.4"/>')
# porch lamp
A('<ellipse cx="1078" cy="884" rx="170" ry="170" fill="url(#lamp)"/>')
A('<rect x="1072" y="846" width="12" height="14" fill="#2e2a3a"/><path d="M1064 860 L1092 860 L1088 900 L1068 900 Z" fill="#ffe2a0"/><path d="M1062 856 L1094 856 L1090 862 L1066 862 Z" fill="#2e2a3a"/><rect x="1066" y="900" width="24" height="6" rx="2" fill="#2e2a3a"/>')
# step
A('<path d="M846 1048 L1074 1048 Q1084 1048 1084 1058 L1084 1080 L836 1080 L836 1058 Q836 1048 846 1048 Z" fill="#8a8aa6"/><rect x="836" y="1048" width="248" height="6" rx="3" fill="#b3b3ca"/>')
# bushes
def bush(cx,base,w,h,seed,col,sh,hi):
    rnd=random.Random(seed); pts=[]
    n=11
    for i in range(n+1):
        a=math.pi*(1-i/n); x=cx+math.cos(a)*w/2; y=base-math.sin(a)*h
        pts.append((x,y))
    d=f'M{cx-w/2-10:.0f} {base+60}'
    d+=f' L{pts[0][0]:.0f} {pts[0][1]:.0f}'
    for (x0,y0),(x1,y1) in zip(pts,pts[1:]):
        mx,my=(x0+x1)/2,(y0+y1)/2; nx,ny=mx-cx,my-(base); L=math.hypot(nx,ny) or 1
        bulge=rnd.uniform(16,30)
        d+=f' Q{mx+nx/L*bulge:.0f} {my+ny/L*bulge:.0f} {x1:.0f} {y1:.0f}'
    d+=f' L{cx+w/2+10:.0f} {base+60} Z'
    A(f'<path d="{d}" fill="{col}"/>')
    A(f'<path d="M{cx+w*0.05:.0f} {base+60} C{cx+w*0.2:.0f} {base-h*0.3:.0f} {cx+w*0.42:.0f} {base-h*0.55:.0f} {cx+w/2:.0f} {base-h*0.1:.0f} L{cx+w/2+10:.0f} {base+60} Z" fill="{sh}" opacity="0.8"/>')
    for i in range(9):
        a=rnd.uniform(0.25,0.75)*math.pi; rr=rnd.uniform(0.45,0.85)
        x=cx-math.cos(a)*w/2*rr; y=base-math.sin(a)*h*rr
        s=rnd.uniform(8,15)
        A(f'<path d="M{x-s:.0f} {y+s*0.3:.0f} Q{x:.0f} {y-s:.0f} {x+s:.0f} {y+s*0.3:.0f} Q{x:.0f} {y-s*0.2:.0f} {x-s:.0f} {y+s*0.3:.0f} Z" fill="{hi}"/>')
# fence
A('<rect x="540" y="1012" width="880" height="14" fill="#a99f8c"/><rect x="540" y="1050" width="880" height="14" fill="#a99f8c"/>')
for i,x in enumerate(range(552,1400,40)):
    if 836<x<1084: continue
    post = i%6==0
    w=26 if post else 22
    A(f'<path d="M{x} 1080 L{x} 996 Q{x} 990 {x+w/2:.0f} 978 Q{x+w} 990 {x+w} 996 L{x+w} 1080 Z" fill="#ddd3bf"/>')
    A(f'<path d="M{x+w-7} 1080 L{x+w-7} 990 Q{x+w-2} 994 {x+w} 996 L{x+w} 1080 Z" fill="#b7ad99"/>')
    A(f'<path d="M{x+3} 998 Q{x+5} 990 {x+w/2:.0f} 983" fill="none" stroke="#fff8ea" stroke-width="3" stroke-linecap="round" opacity="0.6"/>')
bush(500,1010,320,120,3,'#3a5c52','#2d4a43','#4f7768')
bush(700,1030,180,70,5,'#41665a','#2f4d45','#5a8473')
bush(1430,1000,340,140,9,'#3a5c52','#2d4a43','#4f7768')
bush(1240,1034,170,64,11,'#41665a','#2f4d45','#5a8473')
A('</svg>')
import sys
open(sys.argv[1] if len(sys.argv) > 1 else 'mid_house.svg','w').write('\n'.join(o))
