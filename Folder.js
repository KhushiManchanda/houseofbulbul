/**
 * React Bits - Folder Component (Vanilla JS & Modern Browser Runtime)
 * Full 3D Spring Physics, Matrix3d Transforms, Flap/Book Modes, and Peeking
 * Adapted seamlessly for House of Bulbul Luxury Archive Portfolios
 */

(function (global) {
  'use strict';

  const TAU = Math.PI * 2;
  const STEP = 1 / 240;
  const MAX_ITEMS = 6;
  const DEFAULT_ITEMS = [
    { title: 'Brand guidelines' },
    { title: 'Launch plan' },
    { title: 'Moodboard' }
  ];

  const PILE_TURN = [0.5, -1.1, 1.5, -0.7, 1.2, -1.6];
  const BOOK_REST = [
    { x: 0.14, y: -0.004, r: 1.4 },
    { x: 0.115, y: 0.008, r: -1.1 },
    { x: 0.09, y: 0, r: 0.6 }
  ];
  const BOOK_PEEK = [
    { x: 0.27, y: -0.016, r: 4.5 },
    { x: 0.2, y: 0.014, r: 1.2 },
    { x: 0.14, y: 0, r: -1.2 }
  ];
  const FLAP_REST = [
    { x: 0.11, rise: -0.01, r: 2.2 },
    { x: -0.11, rise: 0.00, r: -2.2 },
    { x: 0, rise: 0.02, r: 0 },
    { x: 0.18, rise: 0.01, r: 4 },
    { x: -0.18, rise: 0.01, r: -4 },
    { x: 0.05, rise: 0.03, r: 1 }
  ];
  const SPREAD_TURN = [4, -5, 3, -6, 5, -3];
  const SPREAD_DROP = [0.03, -0.04, 0.05, -0.02, 0.04, -0.05];
  const DROP_TURN = [-6, 4, -3, 7, -5, 3];
  const BOOK_ANGLES = { open: -180, receive: -24, peek: -13, rest: 0 };
  const FLAP_ANGLES = { open: -68, receive: -30, peek: -24, rest: 0 };
  const LAYERS = { out: 50, drag: 80, focus: 90 };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const parseColor = (() => {
    let context = null;
    const cache = new Map();
    return value => {
      const key = String(value);
      if (cache.has(key)) return cache.get(key);
      let rgb = [61, 139, 255];
      if (typeof document !== 'undefined') {
        context = context || document.createElement('canvas').getContext('2d', { willReadFrequently: true });
        if (context) {
          context.clearRect(0, 0, 1, 1);
          context.fillStyle = '#3d8bff';
          context.fillStyle = key;
          context.fillRect(0, 0, 1, 1);
          rgb = Array.from(context.getImageData(0, 0, 1, 1).data.slice(0, 3));
        }
      }
      cache.set(key, rgb);
      return rgb;
    };
  })();

  const mixRgb = (rgb, target, amount) => rgb.map((channel, i) => Math.round(channel + (target[i] - channel) * amount));
  const rgbString = rgb => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  const luma = rgb => (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;

  const multiply = (a, b) => {
    const out = new Array(16);
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 4; row++) {
        out[col * 4 + row] =
          a[row] * b[col * 4] + a[4 + row] * b[col * 4 + 1] + a[8 + row] * b[col * 4 + 2] + a[12 + row] * b[col * 4 + 3];
      }
    }
    return out;
  };

  const chain = (...list) => list.reduce(multiply);
  const move = (x, y, z = 0) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
  const stretch = (x, y) => [x, 0, 0, 0, 0, y, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

  const turnX = degrees => {
    const r = (degrees * Math.PI) / 180;
    const c = Math.cos(r);
    const s = Math.sin(r);
    return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
  };

  const turnY = degrees => {
    const r = (degrees * Math.PI) / 180;
    const c = Math.cos(r);
    const s = Math.sin(r);
    return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
  };

  const turnZ = degrees => {
    const r = (degrees * Math.PI) / 180;
    const c = Math.cos(r);
    const s = Math.sin(r);
    return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  };

  const toCss = m => `matrix3d(${m.map(v => (Math.abs(v) < 1e-7 ? 0 : Number(v.toFixed(6)))).join(', ')})`;

  const measureFolder = (book, scale, labelWidth, hasLabel, tabPosition) => {
    const w = (book ? 180 : 224) * scale;
    const h = (book ? 232 : 176) * scale;
    const tabH = 20 * scale;
    const r = 12 * scale;
    const shoulder = tabH * 0.75;
    const frontTop = book ? tabH : tabH + h * 0.3;
    const corners = book ? [0, r, r, 0] : [r, r, r, r];
    const maxTab = w - corners[0] - corners[1] - shoulder * 2 - 10 * scale;
    const tabW = clamp(hasLabel ? labelWidth + 14 * scale + shoulder : w * 0.34, Math.min(w * 0.3, maxTab), maxTab);
    const tabX =
      tabPosition === 'left'
        ? corners[0] + 5 * scale + shoulder
        : tabPosition === 'center'
          ? (w - tabW) / 2
          : w - corners[1] - 5 * scale - shoulder - tabW;
    const docW = book ? w * 0.8 : w * 0.54;
    return {
      book,
      scale,
      w,
      h,
      tabH,
      r,
      shoulder,
      corners,
      tabW,
      tabX,
      frontTop,
      frontH: tabH + h - frontTop,
      docW,
      docH: docW * (book ? 1.28 : 1.22)
    };
  };

  const backPath = g => {
    const { w, h, tabX, tabW, tabH, shoulder } = g;
    const [tl, tr, br, bl] = g.corners;
    const top = tabH;
    const bottom = tabH + h;
    return [
      `M 0 ${top + tl}`,
      `Q 0 ${top} ${tl} ${top}`,
      `L ${tabX - shoulder} ${top}`,
      `C ${tabX} ${top} ${tabX} 0 ${tabX + shoulder} 0`,
      `L ${tabX + tabW - shoulder} 0`,
      `C ${tabX + tabW} 0 ${tabX + tabW} ${top} ${tabX + tabW + shoulder} ${top}`,
      `L ${w - tr} ${top}`,
      `Q ${w} ${top} ${w} ${top + tr}`,
      `L ${w} ${bottom - br}`,
      `Q ${w} ${bottom} ${w - br} ${bottom}`,
      `L ${bl} ${bottom}`,
      `Q 0 ${bottom} 0 ${bottom - bl}`,
      'Z'
    ].join(' ');
  };

  const placeBook = (rank, count, phase, layout, g) => {
    const pileX = g.w / 2;
    const pileY = g.frontTop + g.frontH / 2;
    if (phase === 'open') {
      if (layout === 'row') {
        const gap = 10 * g.scale;
        const fit = Math.min(0.8, (g.w * 1.86 - gap * (count - 1)) / (count * g.docW));
        const step = g.docW * fit + gap;
        return { x: g.w / 2 + (rank - (count - 1) / 2) * step, y: pileY, z: 0, r: 0, ry: 0, s: fit };
      }
      if (layout === 'stack') {
        const fit = 0.74;
        const strip = Math.min(26 * g.scale, (g.h * 0.36) / Math.max(1, count - 1));
        const top = g.frontTop + 14 * g.scale + (count - 1) * strip;
        return { x: g.w, y: top + (g.docH * fit) / 2 - rank * strip, z: 0, r: 0, ry: 0, s: fit };
      }
      const fit = count > 4 ? 0.58 : count > 3 ? 0.64 : 0.72;
      const span = count === 2 ? g.w : Math.min(g.w * 1.3, g.w * 0.6 * (count - 1));
      const x = count > 1 ? span / 2 - (rank * span) / (count - 1) : g.w * 0.5;
      return { x: g.w / 2 + x, y: pileY + SPREAD_DROP[rank] * g.h, z: 0, r: SPREAD_TURN[rank], ry: 0, s: fit };
    }
    const offsets = phase === 'rest' ? BOOK_REST : BOOK_PEEK;
    const offset = offsets[rank] ?? { x: 0.06, y: 0, r: PILE_TURN[rank] ?? 0 };
    return {
      x: pileX + offset.x * g.w,
      y: pileY + offset.y * g.h + rank * 0.8 * g.scale,
      z: 0,
      r: offset.r,
      ry: 0,
      s: 1
    };
  };

  const placeFlap = (rank, count, phase, layout, g, pointer) => {
    const rest = FLAP_REST[rank] ?? FLAP_REST[FLAP_REST.length - 1];
    const floor = g.tabH + g.h - 5 * g.scale - g.docH / 2;
    const mid = (count - 1) / 2;
    if (phase === 'open') {
      const lift = g.tabH - g.h * 0.02;
      if (layout === 'stack') {
        const strip = Math.min(30 * g.scale, (g.h * 0.62) / Math.max(1, count - 1));
        const fit = 1.04 - rank * 0.05;
        return {
          x: g.w / 2,
          y: g.tabH + g.h * 0.1 - rank * strip - (g.docH * (1.04 - fit)) / 2,
          z: -rank * 18 * g.scale,
          r: 0,
          ry: 0,
          s: fit
        };
      }
      const gap = 12 * g.scale;
      const fit = Math.min(0.94, (g.w * 2.3 - gap * (count - 1)) / (count * g.docW));
      const step = g.docW * fit + gap;
      const tidy = layout === 'row';
      return {
        x: g.w / 2 + (rank - mid) * step,
        y: lift + (tidy ? 0 : SPREAD_DROP[rank] * g.h * 0.7),
        z: 0,
        r: tidy ? 0 : SPREAD_TURN[rank] * 0.55,
        ry: 0,
        s: fit
      };
    }
    if (phase === 'peek') {
      const part = 1.85;
      const x = g.w / 2 + rest.x * g.w * part;
      const near = pointer != null ? Math.max(0, 1 - Math.abs(pointer - x) / (g.w * 0.34)) : 0;
      // High, springy, satisfying pop out of folder pocket on hover!
      const baseRise = rank === 2 ? 0.34 : 0.26;
      const rise = baseRise + rest.rise;
      const y = floor - rise * g.h - near * near * g.h * 0.12;
      const r = rest.r * 2.4;
      return { x, y, z: 0, r, ry: 0, s: 1.03 };
    }
    const part = phase === 'receive' ? 1.7 : 1;
    const x = g.w / 2 + rest.x * g.w * part;
    const rise = rest.rise + (phase === 'receive' ? 0.03 : 0);
    return { x, y: floor - rise * g.h, z: 0, r: rest.r, ry: 0, s: 1 };
  };

  /**
  /**
   * Adorable Boutique Miniature Owls Generator
   * Designed exclusively for House of Bulbul Folders
   * Each folder features its own unique miniature mascot owl tailored
   * for its celebratory theme (Wedding Tiara, Sacred Lotus, Kanjak Jhumkas, Diwali Diya, Lohri Scarf & Kite).
   */
  const generateMiniatureOwlSvg = (type, customId) => {
    const id = customId || 'owl_' + type + '_' + Math.random().toString(36).slice(2, 6);

    // Color palettes per celebratory theme
    let bodyColor = '#FFE8A3';
    let wingColor = '#9B72CF';

    if (type === 'all') {
      bodyColor = '#FEF9EE';
      wingColor = '#7C3AED';
    } else if (type === 'sacred') {
      bodyColor = '#FFF1D6';
      wingColor = '#E06D7D';
    } else if (type === 'kanjak') {
      bodyColor = '#FFE5D9';
      wingColor = '#E85D88';
    } else if (type === 'diwali') {
      bodyColor = '#FED7AA';
      wingColor = '#34D399';
    } else if (type === 'lohri') {
      bodyColor = '#FDE68A';
      wingColor = '#FB923C';
    }

    // Gradients & Shadows
    const defs = `
      <defs>
        <linearGradient id="${id}_gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFF6D8"/>
          <stop offset="40%" stop-color="#F2D184"/>
          <stop offset="70%" stop-color="#D4AF37"/>
          <stop offset="100%" stop-color="#A67C1E"/>
        </linearGradient>
        <linearGradient id="${id}_belly" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.96"/>
          <stop offset="100%" stop-color="#FFF4D9" stop-opacity="0.92"/>
        </linearGradient>
        <filter id="${id}_shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.32"/>
        </filter>
      </defs>
    `;

    // Delicate boutique foil frame
    const border = `
      <rect x="7" y="7" width="210" height="110" rx="10" fill="none" stroke="url(#${id}_gold)" stroke-width="1.2" opacity="0.6"/>
      <rect x="10" y="10" width="204" height="104" rx="8" fill="none" stroke="url(#${id}_gold)" stroke-width="0.6" opacity="0.35" stroke-dasharray="3, 3"/>
    `;

    // Branch perch with fresh leafy buds
    const branch = `
      <!-- Perch Branch -->
      <path d="M 44 98 Q 112 106 180 96" stroke="#4A2E10" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      <path d="M 44 98 Q 112 106 180 96" stroke="url(#${id}_gold)" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.85"/>
      <!-- Left Leaves -->
      <g fill="#7EA858" stroke="#3D5A20" stroke-width="1">
        <path d="M 50 97 Q 38 88 46 83 Q 56 91 50 97 Z"/>
        <path d="M 62 100 Q 56 112 66 114 Q 70 104 62 100 Z"/>
      </g>
      <!-- Right Leaves -->
      <g fill="#7EA858" stroke="#3D5A20" stroke-width="1">
        <path d="M 172 95 Q 184 86 178 81 Q 166 89 172 95 Z"/>
        <path d="M 160 98 Q 166 110 156 112 Q 152 102 160 98 Z"/>
      </g>
      <!-- Claws -->
      <g stroke="#3D2612" stroke-width="2.2" stroke-linecap="round">
        <line x1="103" y1="94" x2="103" y2="101"/>
        <line x1="99" y1="95" x2="98" y2="101"/>
        <line x1="107" y1="95" x2="108" y2="101"/>
        <line x1="121" y1="94" x2="121" y2="101"/>
        <line x1="117" y1="95" x2="116" y2="101"/>
        <line x1="125" y1="95" x2="126" y2="101"/>
      </g>
    `;

    // 5 Unique Mascot Variations
    let eyesMarkup = '';
    let accessoryMarkup = '';

    if (type === 'wedding') {
      // Dreaming closed eyes with long eyelashes
      eyesMarkup = `
        <g stroke="#2B1A3D" stroke-width="2.2" fill="none" stroke-linecap="round">
          <path d="M 91 50 Q 97 56 103 50"/>
          <line x1="93" y1="53" x2="92" y2="58"/>
          <line x1="97" y1="54" x2="97" y2="59"/>
          <line x1="101" y1="53" x2="102" y2="58"/>
          <path d="M 121 50 Q 127 56 133 50"/>
          <line x1="123" y1="53" x2="122" y2="58"/>
          <line x1="127" y1="54" x2="127" y2="59"/>
          <line x1="131" y1="53" x2="132" y2="58"/>
        </g>
      `;
      // Royal Wedding Tiara
      accessoryMarkup = `
        <polygon points="103,34 107,20 112,28 117,20 121,34" fill="url(#${id}_gold)" stroke="#B38728" stroke-width="1.3"/>
        <circle cx="107" cy="20" r="1.6" fill="#E11D48"/>
        <circle cx="112" cy="28" r="1.6" fill="#10B981"/>
        <circle cx="117" cy="20" r="1.6" fill="#E11D48"/>
        <circle cx="112" cy="20" r="1.2" fill="#FFFFFF"/>
      `;
    } else if (type === 'sacred') {
      // Serene closed eyes with Tilak
      eyesMarkup = `
        <g stroke="#2B1A3D" stroke-width="2.2" fill="none" stroke-linecap="round">
          <path d="M 92 51 Q 97 55 102 51"/>
          <path d="M 122 51 Q 127 55 132 51"/>
        </g>
        <path d="M 112 37 Q 110 42 112 45 Q 114 42 112 37 Z" fill="#E11D48"/>
        <circle cx="112" cy="42" r="1" fill="#FBBF24"/>
      `;
      // Blossoming Sacred Lotus
      accessoryMarkup = `
        <g fill="#F472B6" stroke="#9D174D" stroke-width="1.2" transform="translate(0, 14)">
          <path d="M 112 86 Q 106 75 112 70 Q 118 75 112 86 Z"/>
          <path d="M 103 87 Q 96 77 104 74 Q 109 81 103 87 Z"/>
          <path d="M 121 87 Q 128 77 120 74 Q 115 81 121 87 Z"/>
        </g>
      `;
    } else if (type === 'kanjak') {
      // Sparkling curious open eyes + Jhumkas
      eyesMarkup = `
        <circle cx="97" cy="51" r="5.5" fill="#1E1B4B"/>
        <circle cx="95" cy="49" r="2.2" fill="#FFFFFF"/>
        <circle cx="99" cy="53" r="1.2" fill="#FFFFFF"/>
        <circle cx="127" cy="51" r="5.5" fill="#1E1B4B"/>
        <circle cx="125" cy="49" r="2.2" fill="#FFFFFF"/>
        <circle cx="129" cy="53" r="1.2" fill="#FFFFFF"/>
        <circle cx="112" cy="40" r="2" fill="#E11D48"/>
      `;
      accessoryMarkup = `
        <g fill="url(#${id}_gold)" stroke="#B38728" stroke-width="1">
          <circle cx="77" cy="30" r="2.5"/>
          <circle cx="147" cy="30" r="2.5"/>
          <path d="M 75 32 Q 77 38 79 32 Z"/>
          <path d="M 145 32 Q 147 38 149 32 Z"/>
        </g>
      `;
    } else if (type === 'diwali') {
      // Joyful smiling crescent eyes + Glowing Diya
      eyesMarkup = `
        <g stroke="#2B1A3D" stroke-width="2.5" fill="none" stroke-linecap="round">
          <path d="M 92 53 Q 97 47 102 53"/>
          <path d="M 122 53 Q 127 47 132 53"/>
        </g>
      `;
      accessoryMarkup = `
        <g transform="translate(148, 86)">
          <path d="M 0 6 Q 7 14 16 10 Q 22 6 24 3 Q 12 1 0 6 Z" fill="#D97706" stroke="#92400E" stroke-width="1.2"/>
          <path d="M 3 4 Q 1 -5 6 -11 Q 11 -5 7 4 Z" fill="#FBBF24" stroke="#F59E0B" stroke-width="1"/>
          <path d="M 4 2 Q 3 -3 6 -6 Q 9 -2 6 2 Z" fill="#EF4444"/>
        </g>
      `;
    } else if (type === 'lohri') {
      // Winking playful face + Cozy Scarf & Patang
      eyesMarkup = `
        <circle cx="97" cy="51" r="5.5" fill="#1E1B4B"/>
        <circle cx="95" cy="49" r="2.2" fill="#FFFFFF"/>
        <path d="M 122 51 Q 127 55 132 51" stroke="#2B1A3D" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      `;
      accessoryMarkup = `
        <path d="M 94 65 Q 112 73 130 65" stroke="#DC2626" stroke-width="5" stroke-linecap="round" fill="none"/>
        <path d="M 94 65 Q 112 73 130 65" stroke="#FBBF24" stroke-width="1.5" stroke-linecap="round" fill="none" stroke-dasharray="3, 3"/>
        <g transform="translate(38, 48) rotate(-16)">
          <polygon points="12,0 24,12 12,24 0,12" fill="#E11D48" stroke="#9F1239" stroke-width="1"/>
          <polygon points="12,0 24,12 12,12 0,12" fill="#FBBF24"/>
          <line x1="12" y1="0" x2="12" y2="24" stroke="#4B5563" stroke-width="0.8"/>
          <path d="M 0 12 Q 12 6 24 12" stroke="#4B5563" stroke-width="0.8" fill="none"/>
        </g>
      `;
    } else if (type === 'all') {
      // Grand Atelier Mascot Owl - Golden Crown & Radiant Eyes
      eyesMarkup = `
        <circle cx="97" cy="51" r="5.8" fill="#1E1B4B"/>
        <circle cx="95" cy="48" r="2.4" fill="#FFFFFF"/>
        <circle cx="99" cy="53" r="1.3" fill="#FFFFFF"/>
        <circle cx="127" cy="51" r="5.8" fill="#1E1B4B"/>
        <circle cx="125" cy="48" r="2.4" fill="#FFFFFF"/>
        <circle cx="129" cy="53" r="1.3" fill="#FFFFFF"/>
        <!-- Golden Star on Forehead -->
        <polygon points="112,38 113.2,41.5 117,41.5 114,43.7 115.1,47 112,45 108.9,47 110,43.7 107,41.5 110.8,41.5" fill="url(#${id}_gold)"/>
      `;
      accessoryMarkup = `
        <!-- Imperial Gold Atelier Diadem -->
        <polygon points="101,32 105,16 112,24 119,16 123,32" fill="url(#${id}_gold)" stroke="#B38728" stroke-width="1.3"/>
        <circle cx="105" cy="16" r="1.8" fill="#8B5CF6"/>
        <circle cx="112" cy="24" r="1.8" fill="#F59E0B"/>
        <circle cx="119" cy="16" r="1.8" fill="#8B5CF6"/>
        <circle cx="112" cy="16" r="1.2" fill="#FFFFFF"/>
        <!-- Golden Atelier Wax Seal / Medallion on Right Branch -->
        <g transform="translate(162, 94)">
          <circle cx="0" cy="0" r="7.5" fill="url(#${id}_gold)" stroke="#92400E" stroke-width="0.8"/>
          <text x="0" y="3" text-anchor="middle" font-size="7" font-weight="900" fill="#451A03" font-family="'Outfit', sans-serif">★</text>
        </g>
      `;
    }

    return `
      <div class="folder-floral-overlay folder-art-overlay" aria-hidden="true">
        <svg class="folder-floral-svg folder-art-svg" viewBox="0 0 224 124" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
          ${defs}
          ${border}
          ${branch}

          <g id="mini-owl" filter="url(#${id}_shadow)">
            <!-- Ears -->
            <polygon points="87,42 79,23 97,33" fill="${bodyColor}" stroke="#2B1A3D" stroke-width="2.2"/>
            <polygon points="88,39 82,27 94,33" fill="#FFC5C5"/>
            <polygon points="137,42 145,23 127,33" fill="${bodyColor}" stroke="#2B1A3D" stroke-width="2.2"/>
            <polygon points="136,39 142,27 130,33" fill="#FFC5C5"/>

            <!-- Body -->
            <ellipse cx="112" cy="65" rx="33" ry="31" fill="${bodyColor}" stroke="#2B1A3D" stroke-width="2.4"/>

            <!-- Folded Wings -->
            <path d="M 81 48 Q 70 66 82 82 Q 91 70 88 52 Z" fill="${wingColor}" stroke="#2B1A3D" stroke-width="2.2"/>
            <path d="M 143 48 Q 154 66 142 82 Q 133 70 136 52 Z" fill="${wingColor}" stroke="#2B1A3D" stroke-width="2.2"/>
            <path d="M 77 64 Q 84 72 82 80 M 79 56 Q 87 64 86 72" stroke="#2B1A3D" stroke-width="1.4" fill="none" stroke-linecap="round" opacity="0.6"/>
            <path d="M 147 64 Q 140 72 142 80 M 145 56 Q 137 64 138 72" stroke="#2B1A3D" stroke-width="1.4" fill="none" stroke-linecap="round" opacity="0.6"/>

            <!-- Tummy / Belly -->
            <ellipse cx="112" cy="72" rx="20" ry="18" fill="url(#${id}_belly)" stroke="#2B1A3D" stroke-width="2"/>
            <!-- Scallop belly feathers (^^^) -->
            <g stroke="#B8860B" stroke-width="1.5" fill="none" stroke-linecap="round">
              <path d="M 103 66 Q 107 63 111 66 M 113 66 Q 117 63 121 66"/>
              <path d="M 98 72 Q 102 69 106 72 M 108 72 Q 112 69 116 72 M 118 72 Q 122 69 126 72"/>
              <path d="M 103 78 Q 107 75 111 78 M 113 78 Q 117 75 121 78"/>
            </g>

            <!-- Big Spectacle Eye Circles -->
            <circle cx="97" cy="51" r="14.5" fill="#FFFBEB" stroke="#2B1A3D" stroke-width="2.4"/>
            <circle cx="127" cy="51" r="14.5" fill="#FFFBEB" stroke="#2B1A3D" stroke-width="2.4"/>

            <!-- Cheeks -->
            <circle cx="87" cy="61" r="4.5" fill="#FF9999" opacity="0.75"/>
            <circle cx="137" cy="61" r="4.5" fill="#FF9999" opacity="0.75"/>

            <!-- Triangle Beak -->
            <polygon points="110,49 114,49 112,57" fill="#FF9500" stroke="#D97706" stroke-width="1"/>

            <!-- Expressive Eyes -->
            ${eyesMarkup}

            <!-- Category Accessory -->
            ${accessoryMarkup}
          </g>
        </svg>
      </div>
    `;
  };

  const generateFloralDoodleSvg = generateMiniatureOwlSvg;


  /**
   * Vanilla JS Folder Component
   */
  class Folder {
    constructor(container, options = {}) {
      this.container = typeof container === 'string' ? document.querySelector(container) : container;
      if (!this.container) {
        console.warn('Folder: Container element not found');
        return;
      }

      this.options = {
        items: options.items || DEFAULT_ITEMS,
        label: options.label || '',
        mode: options.mode || 'flap',
        variant: options.variant || 'solid',
        color: options.color || '#3d8bff',
        paperColor: options.paperColor || '#ffffff',
        tabPosition: options.tabPosition || 'right',
        layout: options.layout || 'spread',
        size: options.size || 1,
        openOn: options.openOn || 'click',
        defaultOpen: Boolean(options.defaultOpen),
        onOpenChange: options.onOpenChange || null,
        onItemClick: options.onItemClick || null,
        onItemDrop: options.onItemDrop || null,
        draggable: options.draggable !== false,
        zoomOnClick: options.zoomOnClick !== false,
        peek: options.peek !== false,
        intro: options.intro !== false,
        tilt: options.tilt !== undefined ? options.tilt : 0.5,
        bounce: options.bounce !== undefined ? options.bounce : 0.4,
        speed: options.speed || 1,
        frost: options.frost !== undefined ? options.frost : 0.25,
        closeOnOutsideClick: options.closeOnOutsideClick !== false,
        theme: options.theme || 'dark',
        doodle: options.doodle || 'wedding',
        className: options.className || '',
        ...options
      };

      this.isOpen = this.options.defaultOpen;
      this.entries = (this.options.items || []).slice(0, MAX_ITEMS);
      this.count = this.entries.length;
      this.scale = Math.max(0.3, Number(this.options.size) || 1);
      this.book = this.options.mode === 'book';
      this.glass = this.options.variant === 'glass';

      this.initDOM();
      this.initEngine();
    }

    initDOM() {
      const { label, tabPosition, color, paperColor, variant, theme, className, draggable } = this.options;
      const rgb = parseColor(color);
      const paper = parseColor(paperColor);
      const backTone = mixRgb(rgb, [0, 0, 0], 0.16);
      const insideTop = rgbString(mixRgb(rgb, [0, 0, 0], 0.08));
      const insideBottom = rgbString(backTone);

      // Measure folder dimensions
      const hasLabel = Boolean(label);
      const estimatedLabelWidth = hasLabel ? label.length * 8 * this.scale : 0;
      this.g = measureFolder(this.book, this.scale, estimatedLabelWidth, hasLabel, tabPosition);
      const total = this.g.tabH + this.g.h;
      const shape = backPath(this.g);

      const vars = {
        '--folder-rgb': rgb.join(', '),
        '--folder-base': rgbString(rgb),
        '--folder-front-top': rgbString(mixRgb(rgb, [255, 255, 255], 0.12)),
        '--folder-front-bottom': rgbString(mixRgb(rgb, [0, 0, 0], 0.06)),
        '--folder-inside-top': insideTop,
        '--folder-inside-bottom': insideBottom,
        '--folder-tab-ink': luma(backTone) > 0.6 ? 'rgba(0, 0, 0, 0.72)' : 'rgba(255, 255, 255, 0.92)',
        '--folder-paper': rgbString(paper),
        '--folder-paper-ink': rgbString(mixRgb(paper, [0, 0, 0], 0.11)),
        '--folder-paper-ink-strong': rgbString(mixRgb(paper, [0, 0, 0], 0.28)),
        '--folder-paper-text': rgbString(mixRgb(paper, [0, 0, 0], 0.72)),
        '--folder-w': `${this.g.w}px`,
        '--folder-h': `${this.g.h}px`,
        '--folder-tab-h': `${this.g.tabH}px`,
        '--folder-front-y': `${this.g.frontTop}px`,
        '--folder-front-h': `${this.g.frontH}px`,
        '--folder-r': `${this.g.r}px`,
        '--folder-front-radius': this.book ? `0 ${this.g.r}px ${this.g.r}px 0` : `${this.g.r}px`,
        '--folder-doc-w': `${this.g.docW}px`,
        '--folder-doc-h': `${this.g.docH}px`,
        '--folder-frost': `${(1.5 + clamp(this.options.frost, 0, 1) * 10) * this.scale}px`,
        '--folder-depth': `${Math.round(Math.max(this.g.w, this.g.h) * 5)}px`,
        '--folder-scale': this.scale
      };

      // Create root
      this.root = document.createElement('div');
      this.root.className = `folder-root${className ? ` ${className}` : ''}`;
      this.root.dataset.mode = this.book ? 'book' : 'flap';
      this.root.dataset.variant = variant;
      this.root.dataset.theme = theme === 'light' ? 'light' : 'dark';
      if (this.isOpen) this.root.dataset.open = '';
      if (draggable) this.root.dataset.draggable = '';

      Object.entries(vars).forEach(([k, v]) => this.root.style.setProperty(k, v));

      // Build inner HTML structure
      const itemsHtml = this.entries.map((item, idx) => {
        let contentHtml = '';
        if (typeof item === 'object' && item.image) {
          contentHtml = `
            <div class="folder-photo">
              <img src="${item.image}" alt="${item.alt || item.title || ''}" draggable="false" />
            </div>
          `;
        } else if (typeof item === 'object' && item.title) {
          contentHtml = `
            <div class="folder-doc">
              <span class="folder-doc-title">${item.title}</span>
              ${item.description ? `<span class="folder-doc-text">${item.description}</span>` : ''}
              <span class="folder-doc-line" style="width: 92%"></span>
              <span class="folder-doc-line" style="width: 84%"></span>
              <span class="folder-doc-block"></span>
              <span class="folder-doc-line" style="width: 80%"></span>
            </div>
          `;
        } else {
          contentHtml = `
            <div class="folder-doc">
              <span class="folder-doc-heading"></span>
              <span class="folder-doc-line" style="width: 90%"></span>
              <span class="folder-doc-line" style="width: 75%"></span>
              <span class="folder-doc-block"></span>
            </div>
          `;
        }

        return `
          <div class="folder-layer folder-item" data-folder-item="${idx}" tabindex="0" role="button" aria-label="${item.title || 'Item ' + (idx + 1)}">
            ${contentHtml}
          </div>
        `;
      }).join('');

      const doodleType = this.options.doodle || 'wedding';
      const doodleSvg = generateFloralDoodleSvg(doodleType);

      this.root.innerHTML = `
        <div class="folder-stage" role="button" tabindex="0" aria-expanded="${this.isOpen}" aria-label="${label ? `${label} folder` : 'Folder'}">
          <span class="folder-layer folder-ground" aria-hidden="true"></span>
          ${this.book ? '<span class="folder-layer folder-cast" aria-hidden="true"></span>' : ''}
          
          <div class="folder-layer folder-back" aria-hidden="true">
            <div class="folder-back-fill" style="clip-path: path('${shape}')">
              ${doodleSvg}
              ${this.book ? '<span class="folder-gutter"></span>' : ''}
            </div>
            <svg class="folder-back-rim" width="${this.g.w}" height="${total}" viewBox="0 0 ${this.g.w} ${total}">
              <path class="folder-focus" d="${shape}"></path>
            </svg>
            ${label ? `<span class="folder-tab-text" style="left: ${this.g.tabX}px; width: ${this.g.tabW}px">${label}</span>` : ''}
          </div>

          ${itemsHtml}

          ${this.book ? '<span class="folder-layer folder-shade" aria-hidden="true"></span>' : ''}

          <div class="folder-layer folder-front" data-face="outer" aria-hidden="true">
            <div class="folder-face folder-face-outer">${doodleSvg}</div>
            ${this.book ? '<div class="folder-face folder-face-inner"><span class="folder-inner-gutter"></span></div>' : ''}
          </div>
        </div>
        ${label ? `<span class="folder-tab-text folder-measure" aria-hidden="true">${label}</span>` : ''}
      `;

      this.container.innerHTML = '';
      this.container.appendChild(this.root);

      // Cache element refs
      this.stageEl = this.root.querySelector('.folder-stage');
      this.groundEl = this.root.querySelector('.folder-ground');
      this.castEl = this.root.querySelector('.folder-cast');
      this.backEl = this.root.querySelector('.folder-back');
      this.frontEl = this.root.querySelector('.folder-front');
      this.shadeEl = this.root.querySelector('.folder-shade');
      this.itemEls = Array.from(this.root.querySelectorAll('.folder-item'));
      this.measureEl = this.root.querySelector('.folder-measure');

      // Update label width if measured
      if (this.measureEl && this.measureEl.offsetWidth > 0) {
        const measuredW = this.measureEl.offsetWidth;
        this.g = measureFolder(this.book, this.scale, measuredW, hasLabel, tabPosition);
      }
    }

    initEngine() {
      const root = this.root;
      const s = this.options;
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

      const spring = value => ({ value, velocity: 0 });
      const state = {
        raf: 0,
        last: 0,
        ready: false,
        hovered: false,
        pressed: false,
        pointerX: 0,
        pointerY: 0,
        deskX: 0,
        deskY: 0,
        hoveredItem: -1,
        phase: 'rest',
        previous: 'rest',
        changedAt: 0,
        front: spring(0),
        rx: spring(0),
        ry: spring(0),
        lift: spring(0),
        squash: spring(1),
        items: [],
        focus: -1,
        drag: null,
        receiving: false,
        receiveUntil: 0,
        suppressClick: false,
        dropCount: 0,
        intro: { phase: 'done', start: 0, opening: false },
        anchor: spring(0),
        appear: 1
      };
      this.state = state;

      // Populate spring state for each item
      for (let i = 0; i < this.count; i++) {
        state.items.push({
          x: spring(0),
          y: spring(0),
          z: spring(0),
          r: spring(0),
          ry: spring(0),
          s: spring(1),
          hover: spring(0),
          mx: spring(0),
          my: spring(0),
          alpha: spring(1),
          place: 'inside',
          rank: i,
          layer: 'inside',
          elevated: false,
          insertUntil: 0,
          insertFrom: null,
          outX: 0,
          outY: 0,
          outR: 0,
          outS: 1,
          outOrder: 0,
          localX: 0,
          localY: 0,
          fresh: true
        });
      }

      const integrate = (item, target, omega, zeta, dt) => {
        const k = omega * omega;
        const d = 2 * zeta * omega;
        const steps = Math.max(1, Math.ceil(dt / STEP));
        const step = dt / steps;
        for (let i = 0; i < steps; i++) {
          item.velocity += (k * (target - item.value) - d * item.velocity) * step;
          item.value += item.velocity * step;
        }
        return Math.abs(target - item.value) > 0.01 || Math.abs(item.velocity) > 0.01;
      };

      const snap = (item, value) => {
        item.value = value;
        item.velocity = 0;
      };

      const toDesk = (clientX, clientY) => {
        const box = root.getBoundingClientRect();
        const kx = root.offsetWidth / (box.width || 1);
        const ky = root.offsetHeight / (box.height || 1);
        return [(clientX - box.left) * kx, (clientY - box.top) * ky];
      };

      const phaseOf = (time) => {
        if (this.isOpen) return 'open';
        if (state.receiving || time < state.receiveUntil) return 'receive';
        if (s.peek && state.hovered && !state.drag?.active) return 'peek';
        return 'rest';
      };

      const place = (rank, inside, phase) => {
        if (this.g.book) return placeBook(rank, inside, phase, s.layout, this.g);
        const pointer = state.hovered ? ((state.pointerX + 1) / 2) * this.g.w : null;
        return placeFlap(rank, inside, phase, s.layout, this.g, pointer);
      };

      const write = () => {
        const { w, h, tabH, frontTop, frontH, docW, docH, scale, book: isBook } = this.g;
        const pivotX = w / 2;
        const pivotY = tabH + h / 2;
        const theta = state.front.value;
        const angle = (theta * Math.PI) / 180;
        const unfold = isBook ? clamp(-theta / 180, 0, 1) : 0;
        const shift = (w / 2) * unfold * (1 - state.anchor.value);
        const zoom = (1 + state.lift.value * 0.012) * state.squash.value * (0.94 + 0.06 * state.appear);
        
        root.style.opacity = state.appear < 0.999 ? state.appear.toFixed(3) : '';
        const desk = chain(
          move(pivotX, pivotY),
          turnX(state.rx.value),
          turnY(state.ry.value),
          stretch(zoom, zoom),
          move(-pivotX, -pivotY)
        );
        const folder = multiply(desk, move(shift, 0));
        const flipped = isBook && theta < -90;
        const frontZ = flipped ? '3' : '40';

        if (this.backEl) {
          this.backEl.style.transform = toCss(folder);
          this.backEl.style.setProperty('--folder-gutter', unfold.toFixed(3));
          this.backEl.style.setProperty(
            '--folder-label',
            (isBook ? 1 : 1 - clamp((-theta - 18) / 26, 0, 1)).toFixed(3)
          );
        }

        const frontMatrix = isBook
          ? chain(folder, move(0, frontTop, 2 * scale * (1 - unfold)), turnY(theta))
          : chain(folder, move(0, tabH + h, 2 * scale), turnX(theta), move(0, -frontH));
        const facing = isBook
          ? Math.sin(angle) * -0.42 + Math.cos(angle) * 0.9
          : Math.sin(angle) * 0.5 + Math.cos(angle) * 0.86;
        const light = (flipped ? -facing : facing) / (isBook ? 0.9 : 0.86);
        const glint = clamp((light - 1) * 0.9, 0, 0.18);
        const dim = clamp((1 - light) * (isBook ? 0.5 : 0.22), 0, 0.5);

        if (this.frontEl) {
          this.frontEl.style.transform = toCss(frontMatrix);
          this.frontEl.style.zIndex = frontZ;
          this.frontEl.dataset.face = flipped ? 'inner' : 'outer';
          this.frontEl.style.setProperty('--folder-glint', glint.toFixed(3));
          this.frontEl.style.setProperty('--folder-dim', dim.toFixed(3));
        }

        const rise = isBook ? Math.max(0, Math.sin(-angle)) : 0;
        if (this.groundEl) {
          this.groundEl.style.transform = toCss(multiply(folder, move(0, isBook ? tabH : tabH + h)));
          this.groundEl.style.opacity = (0.75 + state.lift.value * 0.25).toFixed(3);
        }
        if (this.castEl) {
          this.castEl.style.transform = toCss(
            chain(folder, move(w * rise * 0.12, frontTop + h * rise * 0.04), stretch(Math.cos(angle), 1))
          );
          this.castEl.style.opacity = (flipped ? 1 - rise * 0.7 : 0).toFixed(3);
        }
        if (this.shadeEl) {
          const edge = w * Math.cos(angle) + w * rise * 0.36;
          this.shadeEl.style.transform = toCss(
            chain(folder, move(0, frontTop + h * rise * 0.03), stretch(edge / w, 1))
          );
          this.shadeEl.style.zIndex = edge > 0 ? '39' : '2';
          this.shadeEl.style.opacity = (clamp(rise * 4, 0, 1) * (1 - rise * 0.45)).toFixed(3);
        }

        state.items.forEach((item, index) => {
          const node = this.itemEls[index];
          if (!node) return;
          const z = 3 * scale + item.z.value + item.hover.value * 26 * scale;
          const matrix = chain(
            desk,
            move(item.x.value + item.mx.value, item.y.value + item.my.value, z),
            turnY(item.ry.value),
            turnZ(item.r.value),
            stretch(item.s.value, item.s.value),
            move(-docW / 2, -docH / 2)
          );
          let layer = 10 + this.count - item.rank;
          if (item.layer === 'inside' && state.phase === 'open' && state.hoveredItem === index) layer = 30;
          if (item.layer === 'out') layer = LAYERS.out;
          if (item.layer === 'drag') layer = LAYERS.drag;
          if (item.layer === 'focus') layer = LAYERS.focus;

          node.style.transform = toCss(matrix);
          node.style.zIndex = String(layer);
          node.style.setProperty('--folder-lift', clamp(item.hover.value, 0, 2.4).toFixed(3));
          node.style.opacity = item.alpha.value < 0.995 ? Math.max(0, item.alpha.value).toFixed(3) : '';
        });
      };

      const frame = (now) => {
        state.raf = 0;
        const time = now / 1000;
        const dt = state.last ? Math.min(0.05, (now - state.last) / 1000) : 1 / 60;
        state.last = now;

        const zeta = reduce ? 1 : 1 - 0.72 * s.bounce;
        const frontOmega = TAU * (this.g.book ? 1.55 : 2) * s.speed;
        const itemOmega = TAU * 2.1 * s.speed;
        const soft = TAU * 1.6 * s.speed;

        const phase = phaseOf(time);
        if (phase !== state.phase) {
          state.previous = state.phase;
          state.phase = phase;
          state.changedAt = now;
        }
        const elapsed = (now - state.changedAt) / 1000;
        let busy = time < state.receiveUntil;

        const ranks = [];
        state.items.forEach((item, index) => {
          if (item.place === 'inside') ranks.push(index);
        });
        const inside = ranks.length;
        ranks.forEach((index, rank) => {
          state.items[index].rank = rank;
        });

        const closing = state.previous === 'open' && phase !== 'open';
        const frontDelay = closing && !reduce ? ((this.g.book ? 0.1 : 0.06) + 0.035 * inside) / s.speed : 0;
        const frontPhase = elapsed < frontDelay ? state.previous : phase;
        const frontTarget = (this.g.book ? BOOK_ANGLES : FLAP_ANGLES)[frontPhase];

        if (!state.ready) {
          state.ready = true;
          snap(state.front, frontTarget);
          snap(state.anchor, 0);
          state.items.forEach(item => {
            const slot = place(item.rank, inside, phase);
            snap(item.x, slot.x);
            snap(item.y, slot.y);
            snap(item.z, slot.z);
            snap(item.r, slot.r);
            snap(item.ry, slot.ry);
            snap(item.s, slot.s);
            snap(item.alpha, 1);
            snap(item.hover, 0);
            item.fresh = false;
          });
        }

        busy = integrate(state.front, frontTarget, frontOmega, zeta, dt) || busy;
        const restitution = 0.2 + 0.35 * s.bounce;
        if (this.g.book && state.front.value < -180) {
          state.front.value = -360 - state.front.value;
          state.front.velocity = -state.front.velocity * restitution;
        } else if (state.front.value > 0) {
          state.front.value = -state.front.value;
          state.front.velocity = -state.front.velocity * restitution;
        }
        if (elapsed < frontDelay) busy = true;

        const engaged = state.hovered && !reduce;
        busy = integrate(state.rx, engaged ? -state.pointerY * 8 * s.tilt : 0, soft, 1, dt) || busy;
        busy = integrate(state.ry, engaged ? state.pointerX * 10 * s.tilt : 0, soft, 1, dt) || busy;
        busy = integrate(state.lift, state.hovered && phase !== 'open' ? 1 : 0, soft, 1, dt) || busy;
        busy = integrate(state.squash, state.pressed ? 0.975 : 1, TAU * 3.2, 0.6, dt) || busy;

        const opening = phase === 'open' && state.previous !== 'open';
        const hover = state.hoveredItem;
        const hovering = hover >= 0 && state.items[hover] ? state.items[hover] : null;
        const lead = hovering && hovering.place === 'inside' && phase === 'open' ? place(hovering.rank, inside, 'open') : null;
        const focusScale = clamp(((this.g.tabH + this.g.h) * 1.18) / this.g.docH, 1.2, 2.2);
        const focusY = this.g.book ? this.g.tabH + this.g.h / 2 : this.g.tabH + this.g.h * 0.36;

        state.items.forEach((item, index) => {
          let target;
          let omega = itemOmega;
          let damping = zeta;
          let lift = 0;
          let fade = 1;

          if (state.focus === index) {
            target = { x: this.g.w / 2, y: focusY, z: 0, r: 0, ry: 0, s: focusScale };
            lift = 2.4;
            item.layer = 'focus';
          } else {
            const order = opening ? (this.g.book ? inside - 1 - item.rank : item.rank) : item.rank;
            const delay = reduce ? 0 : opening ? ((this.g.book ? 0.16 : 0.05) + order * 0.045) / s.speed : (order * 0.03) / s.speed;
            const active = elapsed >= delay ? phase : state.previous;
            target = place(item.rank, inside, active);
            if (elapsed < delay) busy = true;

            item.layer = 'inside';
            if (lead && active === 'open') {
              if (hover === index) {
                target = { ...target, y: target.y - 6 * this.g.scale, r: target.r * 0.2, ry: 0, s: target.s * 1.05 };
                lift = 1;
              } else {
                const distance = target.x - lead.x;
                target = {
                  ...target,
                  x: target.x + Math.sign(distance) * 12 * this.g.scale * Math.max(0, 1 - Math.abs(distance) / (this.g.w * 1.1))
                };
                lift = 0.2;
              }
            } else if (active === 'open') {
              lift = 0.25;
            } else if (active === 'peek') {
              lift = 0.95 + (hover === index ? 0.45 : 0);
            }
          }

          busy = integrate(item.x, target.x, omega, damping, dt) || busy;
          busy = integrate(item.y, target.y, omega, damping, dt) || busy;
          busy = integrate(item.z, target.z, itemOmega, zeta, dt) || busy;
          busy = integrate(item.r, target.r, omega, damping, dt) || busy;
          busy = integrate(item.ry, target.ry, itemOmega, zeta, dt) || busy;
          busy = integrate(item.s, target.s, itemOmega, zeta, dt) || busy;
          busy = integrate(item.hover, lift, itemOmega, zeta, dt) || busy;
          busy = integrate(item.alpha, fade, TAU * 3 * s.speed, 1, dt) || busy;
        });

        write();
        if (busy) state.raf = requestAnimationFrame(frame);
        else state.last = 0;
      };

      const wake = () => {
        if (!state.raf) state.raf = requestAnimationFrame(frame);
      };
      this.wake = wake;

      // Event Handlers
      const onMove = event => {
        if (event.pointerType === 'touch') return;
        const box = root.getBoundingClientRect();
        state.pointerX = clamp(((event.clientX - box.left) / box.width) * 2 - 1, -1.5, 1.5);
        state.pointerY = clamp(((event.clientY - box.top) / box.height) * 2 - 1, -1.5, 1.5);
        
        const target = event.target.closest?.('[data-folder-item]');
        const index = target && root.contains(target) ? Number(target.getAttribute('data-folder-item')) : -1;
        state.hoveredItem = index;

        if (!state.hovered) {
          state.hovered = true;
          if (s.openOn === 'hover') this.setOpen(true);
        }
        wake();
      };

      const onLeave = event => {
        if (event.pointerType === 'touch') return;
        state.hovered = false;
        state.pressed = false;
        state.hoveredItem = -1;
        if (s.openOn === 'hover') this.setOpen(false);
        wake();
      };

      const onDown = event => {
        if (event.button > 0) return;
        state.pressed = true;
        wake();
      };

      const onUp = () => {
        state.pressed = false;
        wake();
      };

      const onDocumentDown = event => {
        if (root.contains(event.target)) return;
        if (state.focus >= 0) {
          state.focus = -1;
          wake();
        }
        if (this.isOpen && s.closeOnOutsideClick) {
          this.setOpen(false);
        }
      };

      const hoverTarget = this.container.closest('.pure-folder-item') || root;
      hoverTarget.addEventListener('pointermove', onMove);
      hoverTarget.addEventListener('pointerleave', onLeave);
      hoverTarget.addEventListener('pointerdown', onDown);
      window.addEventListener('pointerup', onUp);
      document.addEventListener('pointerdown', onDocumentDown);

      // Folder Click
      this.stageEl.addEventListener('click', (event) => {
        const itemTarget = event.target.closest('[data-folder-item]');
        if (itemTarget) return; // Handled by item listener
        if (s.openOn === 'hover') return;
        this.setOpen(!this.isOpen);
        if (typeof s.onClick === 'function') {
          s.onClick(event, this.isOpen);
        }
      });

      // Item Clicks
      this.itemEls.forEach((itemEl, idx) => {
        itemEl.addEventListener('click', (event) => {
          event.stopPropagation();
          const itemData = this.entries[idx];
          this.setOpen(!this.isOpen);
          if (typeof s.onClick === 'function') {
            s.onClick(event, this.isOpen, itemData, idx);
          } else if (typeof s.onItemClick === 'function') {
            s.onItemClick(itemData, idx);
          }
        });
      });

      wake();
    }

    setOpen(next) {
      const val = typeof next === 'function' ? next(this.isOpen) : Boolean(next);
      if (this.isOpen === val) return;
      this.isOpen = val;
      if (this.isOpen) {
        this.root.dataset.open = '';
      } else {
        delete this.root.dataset.open;
      }
      this.stageEl.setAttribute('aria-expanded', String(this.isOpen));
      if (typeof this.options.onOpenChange === 'function') {
        this.options.onOpenChange(this.isOpen);
      }
      this.wake?.();
    }

    destroy() {
      if (this.state?.raf) cancelAnimationFrame(this.state.raf);
      this.container.innerHTML = '';
    }
  }

  function createFolder(container, options) {
    return new Folder(container, options);
  }

  global.Folder = Folder;
  global.createFolder = createFolder;

})(typeof window !== 'undefined' ? window : this);
