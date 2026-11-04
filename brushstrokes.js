(() => {
  // Set to true to bring back the background brushstrokes.
  const BRUSHSTROKES_ENABLED = false;
  if (!BRUSHSTROKES_ENABLED) return;

  const ns = 'http://www.w3.org/2000/svg';
  const layer = document.createElementNS(ns, 'svg');
  layer.classList.add('background-brushstrokes');
  layer.setAttribute('aria-hidden', 'true');
  layer.setAttribute('focusable', 'false');
  document.body.appendChild(layer);
  const random = (min, max) => min + Math.random() * (max - min);
  const seeds = Array.from({length:64}, (_, i) => ({
    x: ((i % 4) + random(.1, .9)) / 4,
    y: (Math.floor(i / 4) + random(.1, .9)) / 16,
    length: random(320, 680), angle: random(-.55, .55),
    bend: random(-90, 90), width: random(5, 12),
    color: `hsl(${Math.floor(random(0, 360))} 65% 64%)`
  }));

  function render() {
    const width = document.body.clientWidth, height = document.body.offsetHeight;
    if (!width || !height) return;
    const origin = document.body.getBoundingClientRect();
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d', {willReadFrequently:true});
    ctx.fillStyle = ctx.strokeStyle = '#fff';
    ctx.lineWidth = 6;
    ctx.lineJoin = ctx.lineCap = 'round';
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent.trim() || node.parentElement.closest('svg,script,style')) continue;
      const style = getComputedStyle(node.parentElement);
      ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const range = document.createRange();
      let offset = 0;
      for (const character of node.textContent) {
        range.setStart(node, offset); offset += character.length; range.setEnd(node, offset);
        if (!character.trim()) continue;
        const box = range.getBoundingClientRect();
        if (!box.width || !box.height) continue;
        const text = style.textTransform === 'uppercase' ? character.toUpperCase() : character;
        const descent = ctx.measureText(text).fontBoundingBoxDescent ?? parseFloat(style.fontSize) * .22;
        const x = box.left - origin.left, y = box.bottom - origin.top - descent;
        ctx.fillText(text, x, y); ctx.strokeText(text, x, y);
      }
    }
    // Reserve the complete handwriting, including letters not revealed yet.
    document.querySelectorAll('.traced-handwriting path').forEach(path => {
      const matrix = path.getScreenCTM();
      if (!matrix) return;
      ctx.save();
      ctx.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e-origin.left, matrix.f-origin.top);
      const scale = Math.hypot(matrix.a, matrix.b) || 1;
      ctx.lineWidth = 2.16 + 6 / scale;
      ctx.stroke(new Path2D(path.getAttribute('d')));
      ctx.restore();
    });
    // Keep paint off the writing cards, form controls and logo illustration.
    document.querySelectorAll('.writing-card,.contact-form,.coffee-drawing').forEach(element => {
      const box = element.getBoundingClientRect();
      ctx.fillRect(box.left-origin.left-5, box.top-origin.top-5, box.width+10, box.height+10);
    });
    // Give each complete phrase room, including wrapped lines and future copy.
    document.querySelectorAll('.traced-handwriting').forEach(element => {
      const box = element.getBoundingClientRect();
      ctx.fillRect(box.left-origin.left-28, box.top-origin.top-24, box.width+56, box.height+48);
    });
    const pixels = ctx.getImageData(0, 0, width, height).data;
    layer.setAttribute('viewBox', `0 0 ${width} ${height}`);
    layer.replaceChildren();
    const occupied = new Map();
    function nearby(x, y) {
      const found = [];
      const bx = Math.floor(x/32), by = Math.floor(y/32);
      for (let dy=-1; dy<=1; dy++) for (let dx=-1; dx<=1; dx++) {
        found.push(...(occupied.get(`${bx+dx},${by+dy}`) || []));
      }
      return found;
    }
    seeds.forEach(seed => {
      const radius = Math.ceil(seed.width / 2 + 3);
      const clear = (x, y) => {
        if (x < radius || x > width-radius || y < radius || y > height-radius) return false;
        for (let dy=-radius; dy<=radius; dy+=2) for (let dx=-radius; dx<=radius; dx+=2) {
          if (dx*dx+dy*dy > radius*radius) continue;
          const px=Math.round(x+dx), py=Math.round(y+dy);
          if (pixels[(py*width+px)*4+3]) return false;
        }
        return !nearby(x,y).some(p => Math.hypot(x-p.x,y-p.y) < (seed.width+p.width)/2+18);
      };
      const length = Math.min(seed.length, width*.85);
      const steps = Math.ceil((length+Math.abs(seed.bend)*3)/3);
      const points=[];
      for (let i=0; i<=steps; i++) {
        const t=i/steps, along=length*(t-.5);
        const curve=Math.sin(t*Math.PI)*seed.bend + Math.sin(t*Math.PI*2)*seed.bend*.3;
        const x=seed.x*width+Math.cos(seed.angle)*along-Math.sin(seed.angle)*curve;
        const y=seed.y*height+Math.sin(seed.angle)*along+Math.cos(seed.angle)*curve;
        let shift=0;
        if (!clear(x,y)) for (let distance=4; distance<=32; distance+=4) {
          if (clear(x,y-distance)) {shift=-distance; break;}
          if (clear(x,y+distance)) {shift=distance; break;}
        }
        points.push({x,y,shift});
      }
      const routed=points.map((point,index)=>{
        let shift=0, sum=0;
        for(let j=Math.max(0,index-6);j<=Math.min(points.length-1,index+6);j++) {
          const weight=7-Math.abs(index-j); shift+=points[j].shift*weight; sum+=weight;
        }
        return {x:point.x,y:point.y+shift/sum};
      });
      const runs=[]; let run=[];
      const flush=()=>{if(run.length>1) runs.push(run); run=[];};
      for(const point of routed) {
        const previous=run.at(-1);
        let safe=clear(point.x,point.y);
        if(safe && previous) {
          const count=Math.ceil(Math.hypot(point.x-previous.x,point.y-previous.y)/2);
          for(let i=1;i<count;i++) if(!clear(previous.x+(point.x-previous.x)*i/count,previous.y+(point.y-previous.y)*i/count)) {safe=false;break;}
        }
        if(safe) run.push(point); else flush();
      }
      flush();
      const runLength=points=>points.reduce((sum,p,i)=>i?sum+Math.hypot(p.x-points[i-1].x,p.y-points[i-1].y):0,0);
      runs.sort((a,b)=>runLength(b)-runLength(a));
      const best=runs[0];
      if(!best || runLength(best)<65) return;
      const path=document.createElementNS(ns,'path');
      path.setAttribute('d','M '+best.map(p=>`${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' L '));
      path.setAttribute('stroke',seed.color); path.setAttribute('stroke-width',seed.width);
      layer.appendChild(path);
      best.forEach(point=>{
        const key=`${Math.floor(point.x/32)},${Math.floor(point.y/32)}`;
        if(!occupied.has(key)) occupied.set(key,[]);
        occupied.get(key).push({...point,width:seed.width});
      });
    });
  }
  let frame;
  function schedule() {cancelAnimationFrame(frame); frame=requestAnimationFrame(render);}
  schedule();
  window.addEventListener('resize', schedule);
  window.addEventListener('load', schedule, {once:true});
  if(document.fonts) document.fonts.ready.then(schedule);
  if(window.ResizeObserver) new ResizeObserver(schedule).observe(document.body);
})();
