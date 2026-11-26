// =====================================================================================
//  FIGHTER RIGS: bone hierarchies with merged part meshes. Bipeds share one skeleton so they share one animator.
//  Armour and machines are cut from bevelled plate and flat facets; only cloth and flesh are soft.
// =====================================================================================
const belt = (k, mat, rx, rz, y, t = .2) => k.geo(G.torusFat, mat, 0, y, 0, rx, rz, t, HPI);       // an elliptical band around the body
const T8 = PI / 8;                                                                                  // turns an eight-sided chest so a flat faces forward
function heroTemplate() {
  return rigTemplate('hero', add => {
    const dk = k => k.tint(.26, .28, .36), cl = k => k.tint(.2, .25, .44);
    add('hips', null, 0, .92, 0, k => {
      k.cbox('armor', 0, 0, 0, .36, .2, .26).cbox('brass', 0, .08, 0, .39, .06, .29);
      cl(k).cbox('cloth', 0, -.3, .135, .2, .5, .04).tint(1).cbox('armor', -.2, -.13, 0, .1, .28, .22, 0, 0, .12).cbox('armor', .2, -.13, 0, .1, .28, .22, 0, 0, -.12);
    });
    add('torso', 'hips', 0, .1, 0, k => {
      dk(k).lathe(G.fTorso, 'cloth', 0, -.04, 0, .2, .3, .14, 0, 0, T8).tint(1).lathe(G.fTorso, 'armor', 0, .08, 0, .255, .47, .185, 0, 0, T8);
      k.cbox('brass', 0, .38, .175, .12, .12, .04, 0, 0, PI / 4).cbox('steel', 0, .3, -.2, .3, .36, .14).box('gDim', -.08, .3, -.275, .05, .2, .01).box('gDim', .08, .3, -.275, .05, .2, .01).cyl('brass', 0, .5, 0, .13, .07, 8);
    });
    add('head', 'torso', 0, .56, 0, k => {
      k.geo(G.fSph, 'armor', 0, .13, .01, .15, .165, .165).cbox('armor', 0, .05, .1, .15, .12, .13, .25).cbox('brass', 0, .27, -.01, .035, .09, .27).box('gWarm', 0, .14, .16, .16, .03, .03);
      cl(k).geo(G.hemi, 'cloth', 0, .1, -.03, .21, .24, .22, -.25).cone('cloth', 0, .27, -.1, .1, .16, 8, -1.1).cbox('cloth', 0, 0, -.12, .34, .14, .16).tint(1);
    });
    for (const [s, sx] of [['L', -1], ['R', 1]]) {
      add('arm' + s, 'torso', .28 * sx, .44, 0, k => { k.cbox('armor', sx * .01, .06, 0, .27, .1, .29, 0, 0, sx * -.3).cbox('armor', sx * .05, -.03, 0, .2, .1, .25, 0, 0, sx * -.55).cbox('brass', sx * .09, -.1, 0, .12, .04, .2, 0, 0, sx * -.75); dk(k).lathe(G.fLimb, 'cloth', 0, -.3, 0, .07, .3).tint(1); });
      add('fore' + s, 'arm' + s, 0, -.3, 0, k => { k.cbox('brass', 0, -.02, 0, .15, .05, .15).lathe(G.fLimb, 'armor', 0, -.28, 0, .092, .29).cbox('steel', 0, -.33, 0, .12, .12, .13); });
      add('leg' + s, 'hips', .11 * sx, -.06, 0, k => { dk(k).lathe(G.fLimb, 'cloth', 0, -.42, 0, .1, .44).tint(1).cbox('armor', 0, -.41, .07, .13, .13, .07, 0, 0, PI / 4); });
      add('shin' + s, 'leg' + s, 0, -.42, 0, k => { k.lathe(G.fLimb, 'armor', 0, -.4, 0, .098, .42).cbox('steel', 0, -.43, .055, .14, .11, .28); });
    }
    add('blade', 'foreR', 0, -.32, 0, k => { k.cyl('steel', 0, 0, -.09, .028, .2, 8, HPI).cbox('brass', 0, 0, .12, .22, .05, .06).geo(G.oct, 'brass', 0, 0, -.1, .045, .045, .05); });
  });
}
// o.hard: bevelled plate and faceted limbs. Otherwise lathed, soft-edged forms for cloth and flesh
function bipedRig(key, o) {
  return rigTemplate(key, add => {
    const b = o.bulk || 1, tc = o.tint || [1, 1, 1], lm = o.limb || 'bone', lt = o.limbTint || [1, 1, 1], ar = o.armor, lr = o.limbR || 1, H = o.hard;
    const LG = H ? G.fLimb : G.limb, TG = H ? G.fTorso : G.torso, SG = H ? G.fSph : G.sphHi, tr = H ? T8 : 0;
    const bx = (k, mat, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) => H ? k.cbox(mat, x, y, z, sx, sy, sz, rx, ry, rz) : k.rbox(mat, x, y, z, sx, sy, sz, rx, ry, rz, true);
    add('hips', null, 0, .9, 0, k => {
      k.tint(tc[0], tc[1], tc[2]); if (H) k.cbox(o.cloth, 0, 0, 0, .35 * b, .2, .25 * b); else k.sph(o.cloth, 0, 0, 0, .18 * b, .13, .135 * b, G.sphHi);
      if (o.robe) k.lathe(G.fRobe, o.cloth, 0, -.9, 0, .38 * b, .96, .34 * b); else if (!o.bare) { bx(k, o.cloth, 0, -.24, -.115 * b, .3 * b, .42, .05, .2); bx(k, o.cloth, 0, -.2, .115 * b, .22 * b, .3, .04, -.1); }
      k.tint(1); if (ar) { if (H) k.cbox(ar, 0, .07, 0, .38 * b, .06, .28 * b); else belt(k, ar, .19 * b, .145 * b, .06); }
    });
    add('torso', 'hips', 0, .1, 0, k => {
      if (o.chest) o.chest(k, b);
      else {
        k.tint(tc[0], tc[1], tc[2]).lathe(TG, o.cloth, 0, -.03, 0, .21 * b, .54, .14 * b, 0, 0, tr).tint(1);
        if (ar) { k.lathe(TG, ar, 0, .1, 0, .25 * b, .46, .18 * b, 0, 0, tr); if (H) k.cyl(ar, 0, .5, 0, .13 * b, .07, 8); else belt(k, ar, .13 * b, .115 * b, .52, .4); }
        else if (!o.bare) for (let i = 0; i < 3; i++) belt(k, 'bone', (.17 + i * .02) * b, (.12 + i * .012) * b, .2 + i * .09, .1);
      }
      if (o.torso) o.torso(k, b);
    });
    add('head', 'torso', 0, .54, 0, k => o.head(k, b));
    for (const [s, sx] of [['L', -1], ['R', 1]]) {
      add('arm' + s, 'torso', .27 * b * sx, .42, 0, k => {
        if (ar) { if (H) k.cbox(ar, sx * .01 * b, .06, 0, .28 * b, .1, .3 * b, 0, 0, sx * -.3).cbox(ar, sx * .05 * b, -.03, 0, .21 * b, .1, .26 * b, 0, 0, sx * -.55); else k.sph(ar, 0, .03, 0, .15 * b, .11, .15 * b, G.sphHi); }
        k.tint(lt[0], lt[1], lt[2]); if (!ar) k.geo(SG, lm, 0, 0, 0, .068 * b * lr, .068 * b * lr, .068 * b * lr); k.lathe(LG, lm, 0, -.3, 0, .058 * b * lr, .31).tint(1);
      });
      add('fore' + s, 'arm' + s, 0, -.3, 0, k => {
        k.tint(lt[0], lt[1], lt[2]).geo(SG, lm, 0, 0, 0, .056 * b * lr, .056 * b * lr, .056 * b * lr).lathe(LG, lm, 0, -.3, 0, .052 * b * lr, .31);
        if (!o.fist && !o.claws) { if (H) k.cbox(lm, 0, -.33, 0, .1 * b, .1 * b, .11 * b); else k.sph(lm, 0, -.33, 0, .055 * b); } k.tint(1);
        if (ar && !o.fist) k.lathe(LG, ar, 0, -.27, 0, .078 * b, .2);
        if (o.claws) for (let i = -1; i <= 1; i++) k.geo(G.cone4, 'bone', i * .035, -.3, .02, .016, .18, .016, PI + .2, 0, 0);
        if (o.fist) { if (H) k.geo(G.dod, o.fist, 0, -.36, 0, .15 * b, .15 * b, .15 * b); else k.sph(o.fist, 0, -.36, 0, .13 * b, .13 * b, .13 * b, G.sphHi); }
        if (s === 'R' && o.weapon) o.weapon(k, b); if (s === 'L' && o.offhand) o.offhand(k, b);
      });
      if (!o.robe) {
        add('leg' + s, 'hips', .11 * b * sx, -.06, 0, k => { k.tint(tc[0], tc[1], tc[2]).lathe(LG, o.cloth, 0, -.42, 0, .095 * b, .45).tint(1); if (ar) { if (H) k.cbox(ar, 0, -.41, .065 * b, .13 * b, .13, .07, 0, 0, PI / 4); else k.sph(ar, 0, -.42, .03, .085 * b, .09, .08 * b); } });
        add('shin' + s, 'leg' + s, 0, -.42, 0, k => { k.tint(lt[0], lt[1], lt[2]).lathe(LG, ar || lm, 0, -.4, 0, (ar ? .09 : .064) * b, .42).tint(1); bx(k, ar || 'rubber', 0, -.43, .05, .13 * b, .1, .26 * b); });
      }
    }
  });
}
const RIGS = {
  knight: heroTemplate,
  // the Colossus: slabs of furnace plate, a head sunk between boulder shoulders
  golem: () => bipedRig('golem', { hard: true, bulk: 1.7, cloth: 'rust', armor: 'rust', limb: 'stone', limbTint: [.5, .42, .38], limbR: 1.45, fist: 'stone',
    chest: (k) => { k.cbox('rust', 0, .08, 0, .6, .26, .44).cbox('rust', 0, .37, 0, .86, .44, .54).cbox('iron', 0, .6, 0, .7, .08, .46).cbox('iron', 0, .26, .26, .4, .3, .06).box('gWarm', 0, .26, .285, .3, .2, .02); for (let i = -1; i <= 1; i++) k.cbox('iron', i * .09, .26, .3, .03, .22, .03); },
    head: (k) => { k.cbox('rust', 0, .14, .04, .34, .26, .3).cbox('iron', 0, .27, .03, .39, .08, .35).box('gWarm', 0, .14, .195, .24, .06, .02).cbox('iron', 0, .03, .19, .2, .08, .06); },
    torso: (k) => { k.cyl('iron', -.24, .52, -.2, .085, .42, 6).cyl('iron', .24, .52, -.2, .085, .34, 6).cyl('rust', -.24, .92, -.2, .105, .04, 6).cyl('rust', .24, .84, -.2, .105, .04, 6); } }),
  // the Lancer: gilded plate, a crimson plume and cape, a halberd twice his height
  automaton: () => bipedRig('automaton', { hard: true, bulk: 1.15, cloth: 'brass', armor: 'brass', limb: 'steel',
    head: (k) => { k.geo(G.fSph, 'brass', 0, .13, 0, .155, .17, .165).cbox('brass', 0, .05, .1, .15, .1, .12, .2).cbox('brass', 0, .28, -.02, .04, .1, .28).box('gWarm', 0, .13, .158, .15, .028, .03).tint(.6, .08, .1).cone('cloth', 0, .3, -.08, .06, .36, 6, -.5).tint(1); },
    torso: (k) => { k.tint(.55, .08, .1).cbox('cloth', 0, .05, -.2, .46, .9, .04, .12).tint(1).box('relief', 0, .33, .2, .2, .2, .02); },
    weapon: (k) => { k.cyl('steel', 0, -.32, -.7, .024, 2.3, 6, HPI).box('steel', 0, -.2, 1.42, .02, .44, .4).geo(G.cone4, 'steel', 0, -.32, 1.6, .04, .34, .04, HPI).cbox('brass', 0, -.32, 1.2, .07, .07, .12).geo(G.oct, 'brass', 0, -.32, -.72, .05, .05, .06); } }),
  // the Acolyte: a pleated robe and hood with nothing visible inside but two cold lights
  acolyte: () => bipedRig('acolyte', { robe: true, cloth: 'cloth', tint: [.17, .15, .34], limb: 'bone',
    head: (k) => { k.tint(.13, .11, .26).geo(G.hemi, 'cloth', 0, .08, -.02, .21, .27, .23, -.2).cone('cloth', 0, .3, -.1, .09, .18, 6, -1).tint(.02).sph('cloth', 0, .1, .04, .135, .135, .135, G.sphHi).tint(1).sph('gCold', -.045, .12, .16, .028).sph('gCold', .045, .12, .16, .028); },
    torso: (k) => { k.tint(.22, .19, .44).lathe(G.fRobe, 'cloth', 0, .26, 0, .36, .3, .25).tint(1).geo(G.oct, 'brass', 0, .5, .17, .04, .05, .03); },
    weapon: (k) => { k.cyl('brass', 0, -1.1, .05, .02, 1.9, 6).geo(G.oct, 'gCold', 0, .9, .05, .09, .15, .09).ring('brass', 0, .9, .05, .17, false, 0, 0, 0, .015).ring('brass', 0, .9, .05, .17, false, 0, HPI, 0, .015); } }),
  // the Hound: a war-drone on four piston legs. Gunmetal plate, hazard flanks, chest vents, one violet visor
  hound: () => rigTemplate('hound', add => {
    const pl = k => k.tint(.5, .47, .72), dk = k => k.tint(.3, .29, .42);
    add('body', null, 0, .55, 0, k => {
      pl(k).cbox('armor', 0, .02, .26, .46, .4, .42).cbox('armor', 0, 0, -.3, .4, .32, .46).cbox('armor', 0, .04, -.02, .34, .3, .3);
      dk(k).cbox('hull', 0, -.15, 0, .28, .1, .8).cbox('hull', 0, .215, .26, .3, .03, .3).tint(1);
      k.cbox('iron', 0, .22, -.04, .1, .07, .92).cbox('hazard', -.205, .04, -.3, .02, .12, .36).cbox('hazard', .205, .04, -.3, .02, .12, .36).box('grate', -.236, .04, .26, .02, .2, .26).box('grate', .236, .04, .26, .02, .2, .26)
        .geo(G.fCyl6, 'steel', 0, .27, -.36, .085, .3, .085, HPI).cbox('brass', 0, .27, -.21, .2, .06, .04).box('gViolet', 0, .358, -.21, .03, .01, .2);
      for (const sx of [-1, 1]) { for (const zz of [-.34, .32]) k.geo(G.fCyl6, 'steel', sx * .2, -.05, zz, .13, .09, .13, 0, 0, -sx * HPI); for (let i = 0; i < 3; i++) k.geo(G.oct, 'brass', sx * .236, .17, .14 + i * .12, .015, .015, .015); }
      // neck, wedge of a head, a jaw that hangs a little open
      k.beam('steel', 0, .08, .42, 0, .2, .66, .09, 6, 1, G.fCyl6).beam('rubber', -.07, .02, .44, -.07, .14, .64, .018, 5).beam('rubber', .07, .02, .44, .07, .14, .64, .018, 5);
      pl(k).cbox('armor', 0, .22, .74, .27, .2, .3).cbox('armor', 0, .16, .95, .17, .12, .24).tint(1);
      dk(k).cbox('hull', 0, .305, .7, .16, .03, .2).tint(1).cbox('steel', 0, .065, .9, .15, .045, .26, .14).box('gViolet', 0, .265, .892, .22, .04, .03).box('gViolet', -.135, .22, .76, .01, .03, .12).box('gViolet', .135, .22, .76, .01, .03, .12);
      k.cbox('iron', -.11, .38, .64, .035, .22, .1, -.5, 0, .2).cbox('iron', .11, .38, .64, .035, .22, .1, -.5, 0, -.2).cyl('steel', .125, .4, .58, .008, .3, 4, -.4);
      for (let i = -2; i <= 2; i++) k.geo(G.cone4, 'steel', i * .03, .105, 1.03, .011, .06, .011, PI).geo(G.cone4, 'steel', i * .03, .08, .99, .01, .05, .01);
      // a jointed tail with a light on the end
      k.beam('steel', 0, .1, -.52, 0, .28, -.76, .05, 6, 1, G.fCyl6).geo(G.oct, 'brass', 0, .28, -.76, .06, .06, .06).beam('iron', 0, .28, -.76, 0, .4, -1.02, .036, 6, 1, G.fCyl6).geo(G.oct, 'gViolet', 0, .42, -1.07, .04, .04, .06);
    });
    for (let i = 0; i < 4; i++) {
      const sx = i < 2 ? -1 : 1, front = i % 2 === 1, zz = front ? .32 : -.34, kz = front ? -.07 : -.16, fz = front ? .05 : -.01;
      add('leg' + i, 'body', sx * .2, -.05, zz, k => {
        const x = sx * .1;
        k.beam('steel', x, -.26, kz, x, 0, 0, .075, 6, 1, G.fLimb); pl(k).cbox('armor', x + sx * .06, -.12, kz * .46, .05, .26, .2, Math.atan2(-kz, .26)).tint(1);
        k.geo(G.fCyl6, 'iron', x - .06, -.26, kz, .062, .12, .062, 0, 0, -HPI).geo(G.oct, 'brass', x + sx * .065, -.26, kz, .03, .03, .03);
        k.beam('iron', x, -.5, fz, x, -.26, kz, .058, 6, 1, G.fLimb).beam('brass', x, -.47, fz - .07, x, -.2, kz - .08, .014, 6, 1, G.fCyl6);
        pl(k).cbox('armor', x, -.38, (kz + fz) / 2 + .05, .1, .17, .05, Math.atan2(kz - fz, .24)).tint(1);
        k.cbox('steel', x, -.515, fz + .04, .12, .06, .2).cbox('rubber', x, -.545, fz + .04, .1, .02, .16).geo(G.cone4, 'steel', x - .03, -.525, fz + .13, .015, .09, .015, HPI).geo(G.cone4, 'steel', x + .03, -.525, fz + .13, .015, .09, .015, HPI);
      });
    }
  }),
  // the Shade: a splinter of mirror in the shape of a person
  shade: () => bipedRig('shade', { hard: true, cloth: 'mirror', limb: 'mirror', claws: true, bare: true,
    head: (k) => { k.geo(G.oct, 'mirror', 0, .15, 0, .13, .2, .15).box('gWhite', 0, .16, .1, .13, .02, .06).geo(G.tet, 'mirror', -.09, .3, -.04, .04, .18, .04, -.3, 0, .3).geo(G.tet, 'mirror', .09, .3, -.04, .04, .18, .04, -.3, 0, -.3); },
    torso: (k) => { for (let i = 0; i < 4; i++) k.geo(G.tet, 'mirror', -.18 + i * .12, .46, -.14, .07, .22 + (i % 2) * .14, .05, -.5, i, 0); k.geo(G.oct, 'gWhite', 0, .34, .15, .025, .06, .01); } }),
  // the Storm Engine: a caged reactor core that rolls where it likes
  dynamo: () => rigTemplate('dynamo', add => {
    add('body', null, 0, .62, 0, k => { k.sph('gCold', 0, 0, 0, .2, .2, .2, G.sphHi).geo(G.fHemi, 'steel', 0, .07, 0, .3, .25, .3).geo(G.fHemi, 'steel', 0, -.07, 0, .3, .25, .3, PI).cyl('brass', 0, .05, 0, .31, .035, 10).cyl('brass', 0, -.085, 0, .31, .035, 10).ring('steel', 0, 0, 0, .44, true, 0, 0, 0, .05).ring('steel', 0, 0, 0, .44, true, 0, HPI, 0, .05); });
    add('eye', 'body', 0, 0, .3, k => { k.geo(G.oct, 'gCold', 0, 0, 0, .05, .05, .05); });
    add('ring', 'body', 0, 0, 0, k => { k.ring('steel', 0, 0, 0, .56, true, HPI, 0, 0, .06); for (let i = 0; i < 4; i++) { const a = i / 4 * TAU; k.geo(G.cone4, 'steel', Math.cos(a) * .6, 0, Math.sin(a) * .6, .055, .24, .055, Math.sin(a) * HPI, 0, -Math.cos(a) * HPI).geo(G.oct, 'gCold', Math.cos(a + .78) * .56, 0, Math.sin(a + .78) * .56, .045, .06, .045); } });
  }),
  // the Apex: all shoulders and jaw, spined down the back
  horror: () => bipedRig('horror', { bulk: 1.6, cloth: 'rubber', tint: [2.2, 3.6, 2.2], limb: 'rubber', limbTint: [2, 3.3, 2], limbR: 1.35, fist: 'bone', bare: true,
    head: (k) => { k.tint(2.2, 3.6, 2.2).sph('rubber', 0, .12, .04, .23, .2, .25, G.sphHi).tint(1).cbox('bone', 0, .02, .2, .32, .07, .22); for (let i = -3; i <= 3; i++) k.geo(G.cone4, 'bone', i * .045, .07, .28, .018, .12, .018, PI); k.sph('gGreen', -.1, .2, .22, .038).sph('gGreen', .1, .2, .22, .038).sph('gGreen', 0, .27, .2, .028).geo(G.cone4, 'bone', -.17, .26, -.02, .04, .2, .04, -.5, 0, .5).geo(G.cone4, 'bone', .17, .26, -.02, .04, .2, .04, -.5, 0, -.5); },
    torso: (k) => { for (let i = 0; i < 5; i++) k.geo(G.cone4, 'bone', 0, .12 + i * .1, -.2 - (i % 2) * .02, .045, .3 - i * .025, .045, -1.15); k.tint(2.2, 3.6, 2.2).sph('rubber', -.3, .46, -.02, .2, .16, .2, G.sphHi).sph('rubber', .3, .46, -.02, .2, .16, .2, G.sphHi).tint(1).cbox('bone', -.34, .56, 0, .14, .06, .2, 0, 0, .5).cbox('bone', .34, .56, 0, .14, .06, .2, 0, 0, -.5).sph('gGreen', 0, .28, .225, .06); } }),
  // the Gearknight: an eight-sided brass helm, a mainspring wheel on its back
  gearknight: () => bipedRig('gearknight', { hard: true, bulk: 1.1, cloth: 'brass', armor: 'brass', limb: 'steel', fist: 'steel',
    head: (k) => { k.cyl('brass', 0, .0, 0, .155, .24, 8).cyl('steel', 0, .1, .13, .075, .04, 8, HPI).sph('gWarm', 0, .12, .135, .048).cyl('steel', 0, .24, 0, .17, .045, 8); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; k.cbox('steel', Math.cos(a) * .18, .262, Math.sin(a) * .18, .07, .055, .055, 0, -a, 0); } },
    torso: (k) => { k.cyl('steel', 0, .3, -.25, .3, .06, 12, HPI).cyl('brass', 0, .3, -.26, .1, .08, 8, HPI).cyl('gDim', 0, .34, .2, .08, .012, 8, HPI); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; k.cbox('steel', Math.cos(a) * .32, .3 + Math.sin(a) * .32, -.22, .09, .09, .06, 0, 0, a); } },
    weapon: (k) => { k.box('steel', 0, -.56, .08, .03, .56, .16).geo(G.cone4, 'steel', 0, -.84, .08, .022, .18, .11, PI).cbox('brass', 0, -.3, .05, .1, .08, .14); }, offhand: (k) => { k.box('steel', 0, -.56, .08, .03, .56, .16).geo(G.cone4, 'steel', 0, -.84, .08, .022, .18, .11, PI).cbox('brass', 0, -.3, .05, .1, .08, .14); } }),
  // the Corsair: a long red coat, a wide hat, a pistol and a cutlass
  corsair: () => bipedRig('corsair', { hard: true, cloth: 'cloth', tint: [.5, .1, .12], limb: 'cloth', limbTint: [.16, .15, .2], armor: null, bare: true,
    head: (k) => { k.geo(G.fSph, 'bone', 0, .12, .02, .125, .135, .14).cbox('bone', 0, .04, .08, .13, .08, .1, .2).box('gGreen', .05, .135, .145, .07, .028, .03).tint(.1, .1, .14).cyl('cloth', 0, .22, 0, .3, .035, 8).cyl('cloth', 0, .25, 0, .16, .13, 8, 0, 0, .8).tint(1).cyl('brass', 0, .255, 0, .165, .03, 8).geo(G.cone4, 'gGreen', .13, .34, -.04, .02, .28, .02, -.3, 0, -.5); },
    torso: (k) => { k.cbox('brass', -.25, .5, 0, .2, .05, .2, 0, 0, .25).cbox('brass', .25, .5, 0, .2, .05, .2, 0, 0, -.25).tint(.85, .72, .3).cbox('cloth', 0, .26, .15, .1, .46, .04, 0, 0, .5).tint(.5, .1, .12).cbox('cloth', 0, -.14, -.17, .46, .86, .04, .16).cbox('cloth', -.13, -.26, .1, .16, .5, .04, -.08, 0, .06).cbox('cloth', .13, -.26, .1, .16, .5, .04, -.08, 0, -.06).tint(1); for (let i = 0; i < 3; i++) k.geo(G.oct, 'brass', -.1 + i * .07, .42 - i * .04, .165, .024, .024, .014); k.cbox('steel', .2, .02, -.1, .05, .5, .05, .5); },
    weapon: (k) => { k.cbox('steel', 0, -.34, .08, .055, .1, .3).cyl('steel', 0, -.31, .2, .028, .3, 6, HPI).cbox('brass', 0, -.42, .02, .05, .16, .075, .3).sph('gGreen', 0, -.31, .52, .028); },
    offhand: (k) => { k.cbox('brass', 0, -.32, .04, .18, .05, .06).box('steel', 0, -.32, .5, .05, .02, .9).geo(G.cone4, 'steel', 0, -.32, .95, .025, .14, .01, HPI); } })
};
