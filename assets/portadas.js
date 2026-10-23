/* Portadas originales por capas: lettering intacto y mancha roja independiente. */
(function(){
 'use strict';
 const story=[['title','15% 6% 68% 5%',.15],['daily','32.5% 18% 59% 5%',1.35],['see','45.8% 53% 49.8% 5%',2.75],['cross','55.1% 28% 40.7% 24%',3.9],['ignore','64.1% 4% 31.5% 50%',5.05],['remain','85.7% 18% 9.5% 23%',6.25]];
 const instructions=[['walk','11% 20% 81.5% 20%',.1],['look','25% 28% 68.5% 28%',.85],['listen','38.5% 17% 54.5% 17%',1.6],['invitation','57% 14% 27.5% 14%',2.45],['start','83.5% 27% 9.5% 27%',3.25]];
 class Covers{
  constructor(root,onStart){this.root=root;this.onStart=onStart;this.ready=false;this.visible=true;this.timer=null;this.hideTimer=null;this.stage='story';this.pages=[root.querySelector('[data-cover="story"]'),root.querySelector('[data-cover="instructions"]')];
   for(const [i,page]of this.pages.entries()){
    const src=window.ENOJO_PORTADAS[i?'instrucciones':'inicio'];const frame=page.querySelector('.cover-frame');
    const stain=document.createElement('img');stain.src=src;stain.alt='';stain.className='cover-stain';stain.setAttribute('aria-hidden','true');if(i===0){const backdrop=document.createElement('div');backdrop.className='cover-backdrop';backdrop.setAttribute('aria-hidden','true');root.append(backdrop)};
    for(const [name,clip,delay]of i?instructions:story){
     if(!i&&name==='ignore'){
      const glyphs={N:[524,541,1040,1076],O:[545,562,1040,1076],R:[567,584,1040,1076],M:[609,626,1040,1076],A:[588,605,1040,1076],L:[209,228,609,638],I:[486,498,1040,1076],Z:[354,370,896,932],S:[652,668,1040,1076]};
      [...'NORMALIZAMOS'].forEach((letter,j)=>{const [x,r,y,b]=glyphs[letter];const glyph=document.createElement('img');glyph.src=src;glyph.alt='';glyph.className='cover-fragment cover-fragment--normal';glyph.style.clipPath='inset('+(y/16)+'% '+((739-r-1)/7.39)+'% '+((1600-b)/16)+'% '+(x/7.39)+'%)';glyph.style.translate=((402+j*23-x)/7.39)+'% '+((letter==='L'?1048-y:1040-y)/16)+'%';glyph.style.setProperty('--delay',delay+'s');glyph.setAttribute('aria-hidden','true');frame.append(glyph)});continue;
     }
     const ink=document.createElement('img');ink.src=src;ink.alt='';ink.className='cover-fragment cover-fragment--'+name;ink.style.clipPath='inset('+clip+')';if(!i&&name==='cross'){ink.style.clipPath='inset(64.1% 4% 31.5% 50%)';ink.style.translate='-26.66% -9.25%'}ink.style.setProperty('--delay',delay+'s');ink.setAttribute('aria-hidden','true');frame.append(ink)}
    page.addEventListener('click',()=>this.activate());page.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();this.activate()}});
   }
   this.reset();
  }
  setChromeColor(color){const meta=document.querySelector?.('meta[name="theme-color"]');if(meta)meta.setAttribute('content',color)}
  setReady(ready){this.ready=!!ready;this.pages[1].setAttribute('aria-disabled',String(!ready));this.pages[1].setAttribute('aria-busy',String(!ready))}
  activate(){if(!this.visible)return;if(this.stage==='instructions'&&this.ready)this.onStart()}
  next(){if(this.stage!=='story'||!this.visible)return;clearTimeout(this.timer);this.stage='instructions';this.root.dataset.stage='instructions';this.pages[0].classList.remove('is-current');this.pages[0].setAttribute('aria-hidden','true');this.pages[0].tabIndex=-1;this.pages[1].classList.add('is-current');this.pages[1].setAttribute('aria-hidden','false');this.pages[1].tabIndex=0;this.pages[1].focus({preventScroll:true})}
  hide(){clearTimeout(this.timer);clearTimeout(this.hideTimer);this.visible=false;this.stage='hidden';this.root.dataset.stage='hidden';this.root.classList.add('is-leaving');document.body.classList.remove('cover-active');this.setChromeColor('#09090c');this.hideTimer=setTimeout(()=>{if(!this.visible)this.root.hidden=true},600)}
  reset(){clearTimeout(this.timer);clearTimeout(this.hideTimer);this.visible=true;this.stage='story';this.root.hidden=false;this.root.classList.remove('is-leaving');this.root.dataset.stage='story';document.body.classList.add('cover-active');this.setChromeColor('#a62d27');for(const [i,page]of this.pages.entries()){page.classList.toggle('is-current',i===0);page.setAttribute('aria-hidden',String(i!==0));page.tabIndex=i===0?0:-1}this.timer=setTimeout(()=>this.next(),10100);this.setReady(this.ready)}
 }
 window.EnojoCover=Covers;
})();
