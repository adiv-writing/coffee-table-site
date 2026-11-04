document.getElementById('year').textContent = new Date().getFullYear();
const svgNamespace = 'http://www.w3.org/2000/svg';
const writingScene = document.querySelector('.handwriting-scene');
const font = window.handwritingFont;
const phrases = (window.writingPhrases || []).filter(phrase => typeof phrase === 'string' && phrase.trim());
const phrase = phrases.length ? phrases[Math.floor(Math.random() * phrases.length)] : "I've broken many pens, but I've never thrown one away.";
// Use the same stroke for typographic apostrophes while preserving the visible copy.
const characters = Array.from(phrase.replace(/[‘’]/g, "'").replace(/[“”]/g, '"'));
if (writingScene) {
  writingScene.querySelector('.handwritten').setAttribute('aria-label', phrase);
  writingScene.querySelector('.written-line').textContent = phrase;
}
if (writingScene && font && characters.every(character => font[character])) {
  let x = 10;
  const glyphs = characters.map(character => {
    const glyph = {x, character, advance:font[character].advance, contours:font[character].contours};
    x += font[character].advance;
    return glyph;
  });
  const artwork = {width:x + 30, height:155, glyphs};
  const paragraph = writingScene.querySelector('.handwritten');
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const svg = document.createElementNS(svgNamespace, 'svg');
  svg.classList.add('traced-handwriting');
  svg.setAttribute('viewBox', `10 0 ${artwork.width - 10} ${artwork.height}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  paragraph.appendChild(svg);
  // Keep the large letter size. Longer phrases wrap instead of shrinking.
  function fitWriting() {
    const scale = 0.506;
    const available = Math.max(240, document.documentElement.clientWidth - 40);
    const lineLimit = available / scale - 20;
    const widths = [];
    let cursor = 0, row = 0, index = 0;
    for (const word of characters.join('').match(/\s+|\S+/g)) {
      const wordGlyphs = glyphs.slice(index, index + Array.from(word).length);
      const wordWidth = wordGlyphs.reduce((sum, glyph) => sum + glyph.advance, 0);
      if (word.trim() && cursor && cursor + wordWidth > lineLimit) {
        widths[row] = cursor;
        row += 1;
        cursor = 0;
      }
      for (const glyph of wordGlyphs) {
        glyph.row = row;
        glyph.x = cursor;
        if (cursor || word.trim()) cursor += glyph.advance;
      }
      index += wordGlyphs.length;
    }
    widths[row] = cursor;
    const widest = Math.max(...widths);
    glyphs.forEach(glyph => glyph.node.setAttribute('transform', `translate(${10 + glyph.x + (widest - widths[glyph.row]) / 2} ${glyph.row * 140})`));
    svg.setAttribute('viewBox', `0 0 ${widest + 20} ${155 + row * 140}`);
    paragraph.style.width = `${available}px`;
    svg.style.width = `${(widest + 20) * scale}px`;
    svg.style.maxWidth = 'none';
  }
  const strokes = [];
  let totalLength = 0;
  let frame;
  artwork.glyphs.forEach(glyph => {
    glyph.node = document.createElementNS(svgNamespace, 'g');
    svg.appendChild(glyph.node);
    glyph.contours.forEach(contour => {
      const path = document.createElementNS(svgNamespace, 'path');
      path.setAttribute('d', contour);
      path.setAttribute('class', 'letter-trace');
      glyph.node.appendChild(path);
      const length = path.getTotalLength();
      path.style.strokeDasharray = `${length} ${length}`;
      path.style.strokeDashoffset = length;
      strokes.push({path, length, start:totalLength});
      totalLength += length;
    });
  });
  fitWriting();
  window.addEventListener('resize', fitWriting);
  writingScene.classList.add('has-tracing');
  function write() {
    cancelAnimationFrame(frame);
    strokes.forEach(stroke => stroke.path.style.strokeDashoffset = preference.matches ? 0 : stroke.length);
    if (preference.matches) return;
    const start = performance.now() + 200;
    const duration = Math.max(4200, Math.min(8000, characters.length * 140)) / 1.2;
    let index = 0;
    function draw(now) {
      const distance = Math.min(1, Math.max(0, now - start) / duration) * totalLength;
      while (index < strokes.length && distance >= strokes[index].start + strokes[index].length) {
        strokes[index++].path.style.strokeDashoffset = 0;
      }
      if (index === strokes.length) return;
      const stroke = strokes[index];
      stroke.path.style.strokeDashoffset = stroke.length - Math.max(0, distance - stroke.start);
      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
  }
  preference.addEventListener('change', write);
  requestAnimationFrame(write);
}

const contactForm = document.getElementById('contact-form');
if (contactForm) {
  const submitButton = contactForm.querySelector('button[type="submit"]');
  const result = document.getElementById('contact-result');
  let sending = false;
  contactForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending || !contactForm.reportValidity()) return;
    const data = new FormData(contactForm);
    if (data.get('botcheck')) return;
    data.delete('redirect');
    const buttonContent = submitButton.innerHTML;
    sending = true;
    submitButton.disabled = true;
    submitButton.textContent = 'Sending�';
    contactForm.setAttribute('aria-busy', 'true');
    result.dataset.state = 'sending';
    result.textContent = 'Sending your message�';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(contactForm.action, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
        body: JSON.stringify(Object.fromEntries(data)),
        signal: controller.signal
      });
      const payload = await response.json();
      if (!response.ok || payload.success !== true) {
        result.dataset.state = 'error';
        result.textContent = response.status === 429
          ? 'Too many attempts. Please wait a little before trying again.'
          : 'Your message could not be sent. Please try again.';
        return;
      }
      contactForm.reset();
      result.dataset.state = 'success';
      result.textContent = 'Thank you. Your message has been sent.';
    } catch {
      result.dataset.state = 'error';
      result.textContent = 'Unable to send your message. Please check your connection and try again.';
    } finally {
      clearTimeout(timeout);
      sending = false;
      submitButton.disabled = false;
      submitButton.innerHTML = buttonContent;
      contactForm.removeAttribute('aria-busy');
    }
  });
}
