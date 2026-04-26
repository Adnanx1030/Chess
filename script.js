/* ═══════════════════════════════════════════════
   DATA & CONSTANTS
═══════════════════════════════════════════════ */

// Unicode symbols for all 12 piece types
const UNICODE = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟'
};

// Column index to file letter
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

// Parse a piece code like 'wK' → { color: 'w', type: 'K' }
const pc = code => ({ color: code[0], type: code[1] });

/* ═══════════════════════════════════════════════
   SOUND ENGINE — Realistic chess piece sounds
   Uses Web Audio API (no files needed)
═══════════════════════════════════════════════ */

let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}

/* ── Noise burst (white noise) helper ──
   Used to create the woody "thud" of a piece hitting the board */
function noiseBuffer(ctx, duration) {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/* ── 🔔 Move — wooden piece placed on board ──
   Short noise burst (the "clack") + low thud body */
function soundMove() {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;

  // --- noise "clack" (high-freq attack of wood hitting board) ---
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer(ctx, 0.12);

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 2200;
  noiseFilter.Q.value = 0.8;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.55, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noiseSource.start(now);
  noiseSource.stop(now + 0.12);

  // --- low thud body (resonance of the piece) ---
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);

  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(0.4, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

  osc.connect(oscGain);
  oscGain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.12);
}

/* ── 💥 Capture — heavier slam + piece knocked off ──
   Louder, deeper, with a slight double-hit feel */
function soundCapture() {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;

  // --- heavy noise slam ---
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer(ctx, 0.2);

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 1200;
  noiseFilter.Q.value = 0.6;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.9, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noiseSource.start(now);
  noiseSource.stop(now + 0.2);

  // --- deep thud body ---
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(0.6, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

  osc.connect(oscGain);
  oscGain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.2);

  // --- second lighter tap (piece being removed) ---
  const tap = ctx.createBufferSource();
  tap.buffer = noiseBuffer(ctx, 0.07);
  const tapFilter = ctx.createBiquadFilter();
  tapFilter.type = 'highpass';
  tapFilter.frequency.value = 3000;
  const tapGain = ctx.createGain();
  tapGain.gain.setValueAtTime(0.3, now + 0.06);
  tapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
  tap.connect(tapFilter);
  tapFilter.connect(tapGain);
  tapGain.connect(ctx.destination);
  tap.start(now + 0.06);
  tap.stop(now + 0.14);
}

/* ── ⚠️ Check — two sharp knocks on the board ──
   Like tapping the table twice to signal check */
function soundCheck() {
  const ctx = getAudioCtx();

  [0, 0.13].forEach(delay => {
    const now = ctx.currentTime + delay;

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer(ctx, 0.1);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    filter.Q.value = 1.2;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.1);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.35, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(og);
    og.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  });
}

/* ── 🏆 Game Over — pieces being swept off the board ──
   A long rushing noise sweep + low finality thud */
function soundGameOver() {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;

  // --- sweeping noise (pieces sliding off board) ---
  const sweep = ctx.createBufferSource();
  sweep.buffer = noiseBuffer(ctx, 0.9);
  const sweepFilter = ctx.createBiquadFilter();
  sweepFilter.type = 'bandpass';
  sweepFilter.frequency.setValueAtTime(3000, now);
  sweepFilter.frequency.exponentialRampToValueAtTime(300, now + 0.7);
  sweepFilter.Q.value = 0.5;
  const sweepGain = ctx.createGain();
  sweepGain.gain.setValueAtTime(0.0, now);
  sweepGain.gain.linearRampToValueAtTime(0.5, now + 0.1);
  sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
  sweep.connect(sweepFilter);
  sweepFilter.connect(sweepGain);
  sweepGain.connect(ctx.destination);
  sweep.start(now);
  sweep.stop(now + 0.9);

  // --- final heavy thud ---
  const thudNoise = ctx.createBufferSource();
  thudNoise.buffer = noiseBuffer(ctx, 0.2);
  const thudFilter = ctx.createBiquadFilter();
  thudFilter.type = 'lowpass';
  thudFilter.frequency.value = 600;
  const thudGain = ctx.createGain();
  thudGain.gain.setValueAtTime(0.8, now + 0.55);
  thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
  thudNoise.connect(thudFilter);
  thudFilter.connect(thudGain);
  thudGain.connect(ctx.destination);
  thudNoise.start(now + 0.55);
  thudNoise.stop(now + 0.9);

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(100, now + 0.55);
  osc.frequency.exponentialRampToValueAtTime(30, now + 0.85);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.6, now + 0.55);
  og.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
  osc.connect(og);
  og.connect(ctx.destination);
  osc.start(now + 0.55);
  osc.stop(now + 0.9);
}

/* ═══════════════════════════════════════════════
   GAME STATE
═══════════════════════════════════════════════ */

let board;           // 8x8 array of piece codes or null
let turn;            // 'w' | 'b'
let selected;        // [r, c] of clicked piece, or null
let legalCache;      // cached legal moves for selected piece
let enPassant;       // [r, c] en passant target square, or null
let castleRights;    // { wK, wQ, bK, bQ } — can each side castle?
let lastMove;        // { from:[r,c], to:[r,c] } for highlight
let gameOver;        // true when checkmate or stalemate
let moveHistory;     // array of { n, w, b } move-pair objects
let capturedByWhite; // pieces white has captured
let capturedByBlack; // pieces black has captured

/* ═══════════════════════════════════════════════
   INIT — reset all state and re-render
═══════════════════════════════════════════════ */

function initGame() {
  board = [
    ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
    ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
    ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR']
  ];
  turn = 'w';
  selected = null;
  legalCache = null;
  enPassant = null;
  castleRights = { wK: true, wQ: true, bK: true, bQ: true };
  lastMove = null;
  gameOver = false;
  moveHistory = [];
  capturedByWhite = [];
  capturedByBlack = [];
  document.getElementById('promo-overlay').classList.remove('show');
  renderBoard();
  updateStatus();
  renderHistory();
  renderCaptures();
}

/* ═══════════════════════════════════════════════
   BOARD RENDER — rebuild the DOM grid each move
═══════════════════════════════════════════════ */

function renderBoard() {
  const boardEl = document.getElementById('board');
  boardEl.innerHTML = '';

  // find king position if in check (for red highlight)
  const kingInCheck = isInCheck(board, turn);
  const checkKingPos = kingInCheck ? findKing(board, turn) : null;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = document.createElement('div');
      sq.className = 'sq ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
      sq.dataset.r = r;
      sq.dataset.c = c;

      // last-move highlight
      if (lastMove) {
        if (r === lastMove.from[0] && c === lastMove.from[1]) sq.classList.add('last-from');
        if (r === lastMove.to[0]   && c === lastMove.to[1])   sq.classList.add('last-to');
      }

      // selected square highlight
      if (selected && selected[0] === r && selected[1] === c) sq.classList.add('selected');

      // king-in-check highlight
      if (checkKingPos && checkKingPos[0] === r && checkKingPos[1] === c) sq.classList.add('in-check');

      // legal move dots / rings
      if (legalCache) {
        const isLegal = legalCache.some(([lr, lc]) => lr === r && lc === c);
        if (isLegal) {
          const isEPTarget = enPassant && enPassant[0] === r && enPassant[1] === c
            && selected && board[selected[0]][selected[1]]
            && pc(board[selected[0]][selected[1]]).type === 'P';
          if (board[r][c] || isEPTarget) sq.classList.add('legal-capture');
          else sq.classList.add('legal-empty');
        }
      }

      // piece element
      const code = board[r][c];
      if (code) {
        const span = document.createElement('span');
        span.className = `piece ${pc(code).color === 'w' ? 'white' : 'black'}`;
        span.textContent = UNICODE[code];
        sq.appendChild(span);
      }

      sq.addEventListener('click', () => handleClick(r, c));
      boardEl.appendChild(sq);
    }
  }

  // build rank/file labels only once
  const rl = document.getElementById('rank-labels');
  if (!rl.children.length) {
    for (let r = 0; r < 8; r++) {
      const s = document.createElement('span');
      s.textContent = 8 - r;
      rl.appendChild(s);
    }
    const fl = document.getElementById('file-labels');
    for (let c = 0; c < 8; c++) {
      const s = document.createElement('span');
      s.textContent = FILES[c];
      fl.appendChild(s);
    }
  }
}

/* ═══════════════════════════════════════════════
   CLICK HANDLER
═══════════════════════════════════════════════ */

function handleClick(r, c) {
  if (gameOver) return;

  // if a piece is selected and this is a legal destination → move
  if (selected && legalCache && legalCache.some(([lr, lc]) => lr === r && lc === c)) {
    executeMove(selected[0], selected[1], r, c);
    return;
  }

  // clicking own piece → select it (or deselect if same square)
  const code = board[r][c];
  if (code && pc(code).color === turn) {
    if (selected && selected[0] === r && selected[1] === c) {
      selected = null;
      legalCache = null;
    } else {
      selected = [r, c];
      legalCache = getLegalMoves(board, r, c, enPassant, castleRights);
    }
    renderBoard();
    return;
  }

  // clicking empty square or enemy without a piece selected → deselect
  selected = null;
  legalCache = null;
  renderBoard();
}

/* ═══════════════════════════════════════════════
   EXECUTE MOVE — apply a validated move to state
═══════════════════════════════════════════════ */

function executeMove(fr, fc, tr, tc, promoType) {
  const code = board[fr][fc];
  const { color, type } = pc(code);
  const opp = color === 'w' ? 'b' : 'w';
  const newBoard = copyBoard(board);
  const newCR = { ...castleRights };
  let newEP = null;
  let captured = null;

  // standard capture
  if (newBoard[tr][tc]) captured = newBoard[tr][tc];

  // en passant capture — remove the pawn behind the target square
  if (type === 'P' && enPassant && tr === enPassant[0] && tc === enPassant[1]) {
    const captRow = color === 'w' ? tr + 1 : tr - 1;
    captured = newBoard[captRow][tc];
    newBoard[captRow][tc] = null;
  }

  // castling — also move the rook
  if (type === 'K' && Math.abs(tc - fc) === 2) {
    const row = color === 'w' ? 7 : 0;
    if (tc === 6) { newBoard[row][5] = newBoard[row][7]; newBoard[row][7] = null; } // kingside
    else          { newBoard[row][3] = newBoard[row][0]; newBoard[row][0] = null; } // queenside
  }

  // pawn double push → set en passant target
  if (type === 'P' && Math.abs(tr - fr) === 2) {
    newEP = [(fr + tr) / 2, tc];
  }

  // update castling rights when king or rook moves
  if (type === 'K') { newCR[color + 'K'] = false; newCR[color + 'Q'] = false; }
  if (type === 'R') {
    if (fr === 7 && fc === 0) newCR.wQ = false;
    if (fr === 7 && fc === 7) newCR.wK = false;
    if (fr === 0 && fc === 0) newCR.bQ = false;
    if (fr === 0 && fc === 7) newCR.bK = false;
  }
  // update castling rights when a rook is captured
  if (tr === 7 && tc === 0) newCR.wQ = false;
  if (tr === 7 && tc === 7) newCR.wK = false;
  if (tr === 0 && tc === 0) newCR.bQ = false;
  if (tr === 0 && tc === 7) newCR.bK = false;

  // pawn promotion — show modal if no type chosen yet
  let promotedTo = null;
  if (type === 'P' && (tr === 0 || tr === 7)) {
    if (!promoType) {
      board = newBoard;
      newBoard[tr][tc] = code;
      newBoard[fr][fc] = null;
      showPromoModal(color, fr, fc, tr, tc, newCR, newEP, captured);
      return;
    }
    promotedTo = color + promoType;
    newBoard[tr][tc] = promotedTo;
    newBoard[fr][fc] = null;
  } else {
    newBoard[tr][tc] = code;
    newBoard[fr][fc] = null;
  }

  // build algebraic notation before committing
  const notation = buildNotation(code, fr, fc, tr, tc, captured, promotedTo, newBoard, opp);

  // commit all state
  board = newBoard;
  enPassant = newEP;
  castleRights = newCR;
  lastMove = { from: [fr, fc], to: [tr, tc] };
  selected = null;
  legalCache = null;

  // track captured pieces
  if (captured) {
    if (color === 'w') capturedByWhite.push(captured);
    else capturedByBlack.push(captured);
  }

  // append to move history
  if (color === 'w') {
    moveHistory.push({ w: notation, b: null, n: moveHistory.length + 1 });
  } else {
    if (moveHistory.length && moveHistory[moveHistory.length - 1].b === null)
      moveHistory[moveHistory.length - 1].b = notation;
    else
      moveHistory.push({ w: '...', b: notation, n: moveHistory.length + 1 });
  }

  turn = opp;
  checkGameOver();
  renderBoard();
  updateStatus();
  renderHistory();
  renderCaptures();

  // ── Play the right sound ──
  if (gameOver)                    soundGameOver();
  else if (isInCheck(board, turn)) soundCheck();
  else if (captured)               soundCapture();
  else                             soundMove();
}

/* ═══════════════════════════════════════════════
   PROMOTION MODAL
═══════════════════════════════════════════════ */

function showPromoModal(color, fr, fc, tr, tc, newCR, newEP, captured) {
  const overlay = document.getElementById('promo-overlay');
  const choices = document.getElementById('promo-choices');
  choices.innerHTML = '';

  ['Q', 'R', 'B', 'N'].forEach(t => {
    const btn = document.createElement('div');
    btn.className = 'promo-piece';
    btn.textContent = UNICODE[color + t];
    btn.addEventListener('click', () => {
      overlay.classList.remove('show');
      // restore board to pre-promotion state then re-execute with chosen type
      board[fr][fc] = color + 'P';
      board[tr][tc] = captured;
      enPassant = newEP;
      castleRights = newCR;
      executeMove(fr, fc, tr, tc, t);
    });
    choices.appendChild(btn);
  });

  overlay.classList.add('show');
}

/* ═══════════════════════════════════════════════
   LEGAL MOVE GENERATION
═══════════════════════════════════════════════ */

/**
 * Returns all truly legal [r,c] destinations for the piece at (r,c).
 * Filters pseudo-legal moves that would leave own king in check.
 * Also appends castling moves when valid.
 */
function getLegalMoves(b, r, c, ep, cr) {
  const code = b[r][c];
  if (!code) return [];
  const { color } = pc(code);

  // filter raw moves: exclude any that leave own king in check
  const legal = getRawMoves(b, r, c, ep).filter(([tr, tc]) => {
    const nb = copyBoard(b);
    // en passant: remove captured pawn
    if (pc(code).type === 'P' && ep && tr === ep[0] && tc === ep[1]) {
      nb[color === 'w' ? tr + 1 : tr - 1][tc] = null;
    }
    nb[tr][tc] = code;
    nb[r][c] = null;
    return !isInCheck(nb, color);
  });

  // castling — only if king is not currently in check
  if (pc(code).type === 'K' && !isInCheck(b, color)) {
    const row = color === 'w' ? 7 : 0;

    // kingside: squares f and g must be empty, king must not pass through check
    if (cr[color + 'K'] && !b[row][5] && !b[row][6]) {
      const nb1 = copyBoard(b); nb1[row][5] = code; nb1[row][4] = null;
      const nb2 = copyBoard(b); nb2[row][6] = code; nb2[row][4] = null;
      if (!isInCheck(nb1, color) && !isInCheck(nb2, color)) legal.push([row, 6]);
    }

    // queenside: squares b, c, d must be empty, king must not pass through check
    if (cr[color + 'Q'] && !b[row][3] && !b[row][2] && !b[row][1]) {
      const nb1 = copyBoard(b); nb1[row][3] = code; nb1[row][4] = null;
      const nb2 = copyBoard(b); nb2[row][2] = code; nb2[row][4] = null;
      if (!isInCheck(nb1, color) && !isInCheck(nb2, color)) legal.push([row, 2]);
    }
  }

  return legal;
}

/**
 * Returns pseudo-legal moves for piece at (r,c).
 * Does NOT check whether the move leaves own king in check.
 * Used internally for attack detection (isInCheck).
 */
function getRawMoves(b, r, c, ep) {
  const code = b[r][c];
  if (!code) return [];
  const { color, type } = pc(code);
  const opp = color === 'w' ? 'b' : 'w';
  const moves = [];

  const inB      = (rr, cc) => rr >= 0 && rr < 8 && cc >= 0 && cc < 8;
  const friendly = (rr, cc) => inB(rr, cc) && b[rr][cc] && pc(b[rr][cc]).color === color;
  const enemy    = (rr, cc) => inB(rr, cc) && b[rr][cc] && pc(b[rr][cc]).color === opp;
  const empty    = (rr, cc) => inB(rr, cc) && !b[rr][cc];

  // sliding piece: moves along a direction until blocked
  const slide = (dr, dc) => {
    let nr = r + dr, nc = c + dc;
    while (inB(nr, nc)) {
      if (friendly(nr, nc)) break;
      moves.push([nr, nc]);
      if (enemy(nr, nc)) break;
      nr += dr; nc += dc;
    }
  };

  // jumping piece: one fixed offset
  const jump = (dr, dc) => {
    if (inB(r + dr, c + dc) && !friendly(r + dr, c + dc)) moves.push([r + dr, c + dc]);
  };

  if      (type === 'R') { for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) slide(dr, dc); }
  else if (type === 'B') { for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) slide(dr, dc); }
  else if (type === 'Q') { for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]) slide(dr, dc); }
  else if (type === 'N') { for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) jump(dr, dc); }
  else if (type === 'K') { for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) jump(dr, dc); }
  else if (type === 'P') {
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;
    // forward one (and optionally two from start row)
    if (empty(r + dir, c)) {
      moves.push([r + dir, c]);
      if (r === startRow && empty(r + 2 * dir, c)) moves.push([r + 2 * dir, c]);
    }
    // diagonal captures + en passant
    for (const dc of [-1, 1]) {
      if (enemy(r + dir, c + dc)) moves.push([r + dir, c + dc]);
      if (ep && inB(r + dir, c + dc) && ep[0] === r + dir && ep[1] === c + dc) moves.push([r + dir, c + dc]);
    }
  }

  return moves;
}

/* ═══════════════════════════════════════════════
   CHECK / MATE / STALEMATE
═══════════════════════════════════════════════ */

/** Find the king's [r,c] for the given color. */
function findKing(b, color) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (b[r][c] === color + 'K') return [r, c];
  return null;
}

/** Returns true if the given color's king is currently under attack. */
function isInCheck(b, color) {
  const kp = findKing(b, color);
  if (!kp) return false;
  const [kr, kc] = kp;
  const opp = color === 'w' ? 'b' : 'w';
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (b[r][c] && pc(b[r][c]).color === opp)
        if (getRawMoves(b, r, c, null).some(([mr, mc]) => mr === kr && mc === kc))
          return true;
  return false;
}

/** Returns true if the given color has at least one legal move available. */
function hasAnyLegalMove(color) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c] && pc(board[r][c]).color === color)
        if (getLegalMoves(board, r, c, enPassant, castleRights).length > 0)
          return true;
  return false;
}

/** Same as hasAnyLegalMove but operates on an explicit board (used in notation). */
function hasAnyLegalMoveBoard(b, color) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (b[r][c] && pc(b[r][c]).color === color)
        if (getLegalMoves(b, r, c, enPassant, castleRights).length > 0)
          return true;
  return false;
}

/** Sets gameOver = true if the current player has no legal moves. */
function checkGameOver() {
  if (!hasAnyLegalMove(turn)) gameOver = true;
}

/* ═══════════════════════════════════════════════
   STATUS BAR
═══════════════════════════════════════════════ */

function updateStatus() {
  const dot = document.getElementById('turn-dot');
  const msg = document.getElementById('status-msg');
  const bar = document.getElementById('status-text');
  bar.className = '';

  if (gameOver) {
    if (isInCheck(board, turn)) {
      msg.textContent = (turn === 'w' ? 'Black' : 'White') + ' wins by checkmate!';
      bar.className = 'mate';
    } else {
      msg.textContent = 'Stalemate — draw!';
      bar.className = 'check';
    }
    dot.style.background = '#888';
    return;
  }

  dot.style.background = turn === 'w' ? '#f0d9b5' : '#2c2c2c';
  dot.style.border = '1.5px solid #888';

  if (isInCheck(board, turn)) {
    msg.textContent = (turn === 'w' ? 'White' : 'Black') + ' is in check!';
    bar.className = 'check';
  } else {
    msg.textContent = (turn === 'w' ? 'White' : 'Black') + "'s turn";
  }
}

/* ═══════════════════════════════════════════════
   MOVE HISTORY
═══════════════════════════════════════════════ */

function renderHistory() {
  const el = document.getElementById('move-history');
  el.innerHTML = '';
  moveHistory.forEach(pair => {
    const span = document.createElement('span');
    span.className = 'move-pair';
    span.innerHTML =
      `<span class="num">${pair.n}.</span>` +
      `<span class="mv w">${pair.w || ''}</span> ` +
      `<span class="mv b">${pair.b || ''}</span> `;
    el.appendChild(span);
  });
  const hw = document.getElementById('history-wrap');
  hw.scrollTop = hw.scrollHeight;
}

/* ═══════════════════════════════════════════════
   CAPTURED PIECES
═══════════════════════════════════════════════ */

function renderCaptures() {
  const byValue = arr => [...arr].sort((a, b) => pieceValue(b) - pieceValue(a));
  document.getElementById('black-captures').textContent =
    byValue(capturedByBlack).map(c => UNICODE[c]).join('');
  document.getElementById('white-captures').textContent =
    byValue(capturedByWhite).map(c => UNICODE[c]).join('');
}

/** Point value of a piece for sorting captured pieces display. */
function pieceValue(code) {
  return { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 }[code[1]] || 0;
}

/* ═══════════════════════════════════════════════
   ALGEBRAIC NOTATION
═══════════════════════════════════════════════ */

function buildNotation(code, fr, fc, tr, tc, captured, promotedTo, nb, oppColor) {
  const { type } = pc(code);
  const file = FILES[tc];
  const rank = 8 - tr;

  // castling short notation
  if (type === 'K' && tc - fc === 2)  return 'O-O';
  if (type === 'K' && fc - tc === 2)  return 'O-O-O';

  let s = '';
  if (type !== 'P') s += type;
  else if (captured) s += FILES[fc]; // pawn capture: prefix with origin file

  if (captured || (type === 'P' && fc !== tc)) s += 'x';
  s += file + rank;

  if (promotedTo) s += '=' + pc(promotedTo).type;

  // check / checkmate symbol
  const inCheck = isInCheck(nb, oppColor);
  if (inCheck) {
    s += hasAnyLegalMoveBoard(nb, oppColor) ? '+' : '#';
  }
  return s;
}

/* ═══════════════════════════════════════════════
   UTILITY
═══════════════════════════════════════════════ */

/** Deep copy a board (array of arrays). */
function copyBoard(b) {
  return b.map(row => [...row]);
}

/* ═══════════════════════════════════════════════
   BOOT
═══════════════════════════════════════════════ */


/* ═══════════════════════════════════════════════
   TIMER — 10 minute rapid, player loses on flag
═══════════════════════════════════════════════ */

const TIMER_START = 10 * 60; // 10 minutes in seconds
let timeWhite = TIMER_START;
let timeBlack = TIMER_START;
let timerInterval = null;

/** Format seconds → "MM:SS" */
function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

/** Update both timer displays and their CSS classes */
function updateTimerDisplay() {
  const wEl = document.getElementById('time-white');
  const bEl = document.getElementById('time-black');
  const wBar = document.getElementById('timer-white');
  const bBar = document.getElementById('timer-black');

  wEl.textContent = formatTime(timeWhite);
  bEl.textContent = formatTime(timeBlack);

  // active glow — highlight whose turn it is
  wBar.classList.toggle('active', turn === 'w' && !gameOver);
  bBar.classList.toggle('active', turn === 'b' && !gameOver);

  // low time warning — under 30 seconds
  wBar.classList.toggle('low', timeWhite <= 30 && timeWhite > 0);
  bBar.classList.toggle('low', timeBlack <= 30 && timeBlack > 0);
}

/** Start the countdown for the current player */
function startTimer() {
  stopTimer(); // clear any existing interval
  timerInterval = setInterval(() => {
    if (gameOver) { stopTimer(); return; }

    // tick down current player's clock
    if (turn === 'w') timeWhite--;
    else              timeBlack--;

    updateTimerDisplay();

    // check for flag (time ran out)
    if (timeWhite <= 0 || timeBlack <= 0) {
      stopTimer();
      const loser  = timeWhite <= 0 ? 'White' : 'Black';
      const winner = timeWhite <= 0 ? 'Black' : 'White';

      // flag the bar
      const flaggedBar = timeWhite <= 0
        ? document.getElementById('timer-white')
        : document.getElementById('timer-black');
      flaggedBar.classList.add('flagged');
      flaggedBar.classList.remove('active', 'low');

      // end the game
      gameOver = true;
      soundGameOver();

      // show result in status message element (even though hidden, updateStatus handles it)
      const msg = document.getElementById('status-msg');
      if (msg) msg.textContent = winner + ' wins on time!';

      // show a visible alert on the board
      showFlagOverlay(winner);
    }
  }, 1000);
}

/** Stop the countdown */
function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

/** Reset timers back to 10:00 */
function resetTimers() {
  stopTimer();
  timeWhite = TIMER_START;
  timeBlack = TIMER_START;
  document.getElementById('timer-white').classList.remove('active','low','flagged');
  document.getElementById('timer-black').classList.remove('active','low','flagged');
  updateTimerDisplay();
}

/** Show a "FLAG" overlay on the board when time runs out */
function showFlagOverlay(winner) {
  // remove any existing overlay
  const old = document.getElementById('flag-overlay');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'flag-overlay';
  overlay.style.cssText = `
    position: absolute; inset: 0; z-index: 200;
    background: rgba(0,0,0,0.75);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    border-radius: 4px;
  `;
  overlay.innerHTML = `
    <div style="font-size:52px; margin-bottom:12px;">🏁</div>
    <div style="font-family:'Segoe UI',sans-serif; font-size:22px;
                font-weight:700; color:#e8d5b0; letter-spacing:2px;">
      ${winner} wins on time!
    </div>
    <div style="font-family:'Segoe UI',sans-serif; font-size:14px;
                color:#94a3b8; margin-top:8px;">
      Click New Game to play again
    </div>
  `;
  document.querySelector('.container').appendChild(overlay);
}

/* ── Patch initGame to reset timers and start clock ── */
const _origInitGame = initGame;
initGame = function() {
  // remove flag overlay if present
  const old = document.getElementById('flag-overlay');
  if (old) old.remove();

  _origInitGame();   // run original init
  resetTimers();     // reset clocks
  startTimer();      // start white's clock
};

/* ── Patch executeMove to switch the clock on each move ── */
const _origExecuteMove = executeMove;
executeMove = function(fr, fc, tr, tc, promoType) {
  _origExecuteMove(fr, fc, tr, tc, promoType);
  if (!gameOver) startTimer(); // restart interval for new active player
};

// Kick everything off
initGame();