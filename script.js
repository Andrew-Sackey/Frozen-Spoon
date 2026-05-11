/* ============================================================
   SCRIPT.JS — Frozen Spoon Hero
   Dependencies: GSAP 3.12.5, ScrollTrigger (loaded in HTML)
============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    gsap.registerPlugin(ScrollTrigger);

  // ── MOBILE NAV (hamburger) ──────────────────────────────
  (function initMobileNav() {
    const ham    = document.getElementById('nav-ham');
    const drawer = document.getElementById('nav-drawer');
    if (!ham || !drawer) return;

    const drawerLinks = [...drawer.querySelectorAll('.nav-drawer-link, .nav-drawer-cta')];
    let isOpen = false;

    function openDrawer() {
      isOpen = true;
      ham.classList.add('open');
      ham.setAttribute('aria-expanded', 'true');
      drawer.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden'; // prevent background scroll

      // Stagger the links in after the drawer fades in
      gsap.fromTo(drawerLinks,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out',
          stagger: 0.06, delay: 0.15 }
      );
    }

    function closeDrawer() {
      isOpen = false;
      ham.classList.remove('open');
      ham.setAttribute('aria-expanded', 'false');
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';

      // Reset links so they animate in fresh next open
      gsap.set(drawerLinks, { opacity: 0, y: 20 });
    }

    // Toggle on hamburger click
    ham.addEventListener('click', () => isOpen ? closeDrawer() : openDrawer());

    // Close when a drawer link is clicked (navigation)
    drawerLinks.forEach(link => link.addEventListener('click', closeDrawer));

    // Close on Escape key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && isOpen) closeDrawer();
    });
  })();


  // ── SMOOTH ANCHOR NAVIGATION ────────────────────────────
  // CSS scroll-behavior:smooth is off to avoid conflicts with
  // GSAP-pinned sections. This replaces it for all nav links.
  (function initAnchorScroll() {
    const allNavLinks = [
      ...document.querySelectorAll('.nav-link, .nav-drawer-link'),
    ];

    allNavLinks.forEach(link => {
      const href = link.getAttribute('href') || '';
      if (!href.startsWith('#') || href === '#') return;

      link.addEventListener('click', e => {
        const target = document.getElementById(href.slice(1));
        if (!target) return;
        e.preventDefault();

        // Calculate scroll target — offset by nav height
        const navH  = parseInt(getComputedStyle(document.documentElement)
                        .getPropertyValue('--nav-h'), 10) || 72;
        const top   = target.getBoundingClientRect().top + window.scrollY - navH;

        // Native smooth scroll
        window.scrollTo({ top, behavior: 'smooth' });

        // After the scroll settles (~900ms), refresh GSAP so all
        // ScrollTriggers recalculate their active/inactive state.
        // For #services specifically, also force the intro headline
        // to play in case the once:true trigger was skipped.
        setTimeout(() => {
          ScrollTrigger.refresh();
          if (href === '#services') {
            gsap.to('.wwd-intro-eyebrow', { opacity: 1, duration: 0.5, ease: 'power2.out' });
            gsap.to('.wwd-word-ready',    { y: 0, duration: 0.80, ease: 'power3.out', delay: 0.10 });
            gsap.to('.wwd-word-set',      { y: 0, duration: 0.85, ease: 'power3.out', delay: 0.26 });
            gsap.to('.wwd-word-indulge',  { y: 0, filter: 'blur(0px)', duration: 1.0, ease: 'power3.out', delay: 0.44 });
            // Ensure scene 1 text is visible and animated
            const firstBlock = document.querySelector('.wwd-text-block[data-scene="1"]');
            if (firstBlock) {
              gsap.set(firstBlock, { opacity: 1 });
              const lines = firstBlock.querySelectorAll('.wwd-line');
              const spans = firstBlock.querySelectorAll('.wwd-body-line span');
              const tags  = firstBlock.querySelector('.wwd-tag-row');
              gsap.to(lines, { y: 0, duration: 0.85, ease: 'power3.out', stagger: 0.10 });
              gsap.to(spans, { y: 0, duration: 0.65, ease: 'power3.out', stagger: 0.04 }, '+=0.1');
              if (tags) gsap.to(tags, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' });
            }
          }
        }, 900);
      });
    });
  })();


    // ── CONFIG ─────────────────────────────────────────────
    const CYCLE_DELAY  = 3400;    // ms between auto-advances
    const ANIM_DUR     = 0.85;    // orbit transition duration
  
    // Positions for 4 items (offsets from orbit-track center)
    const POS = {
      front: { x:   0,   scale: 1.00, opacity: 1.00, zIndex: 4 },
      right: { x:  350,  scale: 0.60, opacity: 0.78, zIndex: 3 },
      back:  { x:   0,   scale: 0.20, opacity: 0.00, zIndex: 1 },
      left:  { x: -350,  scale: 0.60, opacity: 0.78, zIndex: 3 },
    };
  
    // Slot order: [front, right, back, left]
    const SLOT_NAMES = ['front', 'right', 'back', 'left'];
  
  
    // ── DOM REFS ────────────────────────────────────────────
    const loader        = document.getElementById('loader');
    const nav           = document.getElementById('nav');
    const heroBg        = document.getElementById('hero-bg');
    const eyebrowEl     = document.getElementById('hero-eyebrow');
    const line1El       = document.getElementById('headline-line1');
    const line2El       = document.getElementById('headline-line2');
    const descEl        = document.getElementById('hero-desc');
    const orbitItems    = [...document.querySelectorAll('.orbit-item')];
    const dots          = [...document.querySelectorAll('.orbit-dot')];
    const COUNT         = orbitItems.length;  // 4
  
  
    // ── STATE ───────────────────────────────────────────────
    let activeIndex  = 0;
    let cycleTimer   = null;
    let isAnimating  = false;
  
  
    // ── POSITION HELPERS ───────────────────────────────────
    // Returns the position name ('front','right','back','left')
    // for item at itemIndex when activeIndex = active
    function slotOf(itemIndex, active) {
      const offset = (itemIndex - active + COUNT) % COUNT;
      return SLOT_NAMES[offset];
    }
  
    function applyPositions(animate) {
      orbitItems.forEach((item, i) => {
        const slot = slotOf(i, activeIndex);
        const cfg  = POS[slot];
  
        if (animate) {
          gsap.to(item, {
            x:       cfg.x,
            scale:   cfg.scale,
            opacity: cfg.opacity,
            zIndex:  cfg.zIndex,
            duration: ANIM_DUR,
            ease:    'power3.out',
          });
        } else {
          gsap.set(item, {
            x:       cfg.x,
            scale:   cfg.scale,
            opacity: cfg.opacity,
            zIndex:  cfg.zIndex,
          });
        }
  
        // Mark front item with class for shadow CSS
        item.classList.toggle('is-front', slot === 'front');
      });
    }
  
  
    // ── UPDATE TEXT & BACKGROUND ────────────────────────────
    function updateContent(idx) {
      const item   = orbitItems[idx];
      const newBg  = item.dataset.bg;
      const desc   = item.dataset.desc; // may contain <br /> entities
  
      // Update dots
      dots.forEach((d, i) => d.classList.toggle('active', i === idx));
  
      // Animate background
      gsap.to(heroBg, {
        backgroundColor: newBg,
        duration: 0.9,
        ease: 'power2.inOut',
      });
  
      // Swap text with fade
      const textEls = [eyebrowEl, line1El, line2El, descEl];
  
      gsap.timeline()
        .to(textEls, {
          y: -14, opacity: 0,
          duration: 0.22, ease: 'power2.in', stagger: 0.03,
        })
        .add(() => {
          eyebrowEl.textContent = item.dataset.eyebrow;
          line1El.textContent   = item.dataset.line1;
          line2El.textContent   = item.dataset.line2;
          // data-desc stores HTML entities; decode and set as innerHTML
          const tmp = document.createElement('div');
          tmp.innerHTML = desc;
          descEl.innerHTML = tmp.innerHTML;
        })
        .fromTo(textEls,
          { y: 18, opacity: 0 },
          { y: 0,  opacity: 1, duration: 0.55, ease: 'power3.out', stagger: 0.055 }
        );
    }
  
  
    // ── GO TO INDEX ─────────────────────────────────────────
    function goTo(idx) {
      if (isAnimating || idx === activeIndex) return;
      isAnimating  = true;
      activeIndex  = idx;
      applyPositions(true);
      updateContent(idx);
      setTimeout(() => { isAnimating = false; }, ANIM_DUR * 1000 + 100);
    }
  
  
    // ── AUTO CYCLE ──────────────────────────────────────────
    function startCycle() {
      clearInterval(cycleTimer);
      cycleTimer = setInterval(() => {
        goTo((activeIndex + 1) % COUNT);
      }, CYCLE_DELAY);
    }
  
  
    // ── CLICK HANDLERS ──────────────────────────────────────
    orbitItems.forEach((item, i) => {
      item.addEventListener('click', () => {
        clearInterval(cycleTimer);
        goTo(i);
        startCycle();
      });
    });
  
    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => {
        clearInterval(cycleTimer);
        goTo(i);
        startCycle();
      });
    });
  
  
    // ── MAGNETIC HOVER ──────────────────────────────────────
    orbitItems.forEach(item => {
      const circle = item.querySelector('.orbit-circle');
  
      item.addEventListener('mousemove', e => {
        const r  = item.getBoundingClientRect();
        const cx = r.left + r.width  / 2;
        const cy = r.top  + r.height / 2;
        gsap.to(circle, {
          x: (e.clientX - cx) * 0.10,
          y: (e.clientY - cy) * 0.10,
          duration: 0.4, ease: 'power2.out', overwrite: 'auto',
        });
      });
  
      item.addEventListener('mouseleave', () => {
        gsap.to(circle, {
          x: 0, y: 0,
          duration: 0.8, ease: 'elastic.out(1, 0.55)',
        });
      });
    });
  
  
    // ── AMBIENT FLOAT ───────────────────────────────────────
    // Gentle up-down bob on idle — each item offset in phase
    function startFloat() {
      orbitItems.forEach((item, i) => {
        gsap.to(item, {
          y:        '+=7',
          duration: 2.4 + i * 0.25,
          ease:     'sine.inOut',
          yoyo:     true,
          repeat:   -1,
          delay:    i * 0.55,
        });
      });
    }
  
  
    // ── INTRO TIMELINE ──────────────────────────────────────
    // Set starting state
    applyPositions(false);
    gsap.set(nav,                { opacity: 0, y: -100 });
    gsap.set('.hero-content',    { opacity: 0 });
    gsap.set('.hero-orbit-wrap', { opacity: 0, y: 80   });
    gsap.set('.hero-scroll-hint',{ opacity: 0 });
    gsap.set(orbitItems,         { scale: 0, opacity: 0 }); // override; re-applied below
  
    const intro = gsap.timeline({
      onComplete: () => {
        startCycle();
        startFloat();
      }
    });
  
    intro
      // 1. Hold loader, then fade out
      .to(loader, {
        opacity: 0, duration: 0.55, ease: 'power2.out', delay: 1.4,
      })
      .set(loader, { display: 'none' })
  
      // 2. Nav slides down
      .to(nav, {
        opacity: 1, y: 0, duration: 0.7, ease: 'power3.out',
      }, '-=0.1')
  
      // 3. Hero text stagger in
      .set('.hero-content', { opacity: 1 })
      .fromTo(
        '.hero-content > *',
        { y: 28, opacity: 0 },
        { y: 0,  opacity: 1, duration: 0.75, ease: 'power3.out', stagger: 0.1 },
        '-=0.35'
      )
  
      // 4. Orbit track slides up + items pop in
      .to('.hero-orbit-wrap', {
        opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
      }, '-=0.4')
      .fromTo(orbitItems, {
        scale: 0, opacity: 0,
      }, {
        // Restore each item to its computed position scale/opacity
        scale:   (i) => POS[slotOf(i, 0)].scale,
        opacity: (i) => POS[slotOf(i, 0)].opacity,
        duration: 0.75,
        ease:    'back.out(1.6)',
        stagger: 0.08,
      }, '-=0.55')
  
      // 5. Scroll hint fades in
      .to('.hero-scroll-hint', {
        opacity: 1, duration: 0.5,
      }, '-=0.2');
  
  
    // ── SCROLLTRIGGER — pin hero, animate exit ───────────────
    ScrollTrigger.create({
      trigger: '#hero',
      start:   'top top',
      end:     '+=560',
      pin:     true,
  
      onLeave: () => {
        clearInterval(cycleTimer);
        gsap.to('.hero-orbit-wrap', {
          opacity: 0, y: -50, duration: 0.6, ease: 'power2.in',
        });
        gsap.to('.hero-content', {
          opacity: 0, y: -24, duration: 0.5, ease: 'power2.in',
        });
      },
  
      onEnterBack: () => {
        startCycle();
        gsap.to('.hero-orbit-wrap', {
          opacity: 1, y: 0, duration: 0.7, ease: 'power3.out',
        });
        gsap.to('.hero-content', {
          opacity: 1, y: 0, duration: 0.6, ease: 'power3.out',
        });
      },
    });


    /* ============================================================
   ABOUT SECTION
============================================================ */


  // ── ABOUT: INJECT PILL NAV ─────────────────────────────
  const pillNavHTML = `
  <nav id="about-pill-nav">
    <a href="#" class="pill-nav-logo-link">
      <img src="images/logo.png" alt="Frozen Spoon" class="pill-nav-logo-img"
           onerror="this.style.display='none';this.nextElementSibling.style.display='inline'" />
      <span class="pill-nav-logo-fallback">Frozen Spoon</span>
    </a>
    <ul class="pill-nav-links">
      <li><a href="#">Home</a></li>
      <li><a href="#about">About</a></li>
      <li><a href="#menu">Menu</a></li>
      <li><a href="#gallery">Gallery</a></li>
      <li><a href="#services">What We Do</a></li>
      <li><a href="#testimonials">Testimonials</a></li>
    </ul>
    <a href="#menu" class="pill-nav-cta">Find a spoon</a>
  </nav>
`;
document.getElementById('about-panel').insertAdjacentHTML('afterbegin', pillNavHTML);


// ── ABOUT: WORD SPLIT ──────────────────────────────────
// Wrap every word in the scrub text with a <span class="word">
const scrubEl = document.querySelector('.scrub-text');
const rawWords = scrubEl.textContent.trim().split(/\s+/);
scrubEl.innerHTML = rawWords
  .map(w => `<span class="word">${w}</span>`)
  .join(' ');
const wordSpans = [...scrubEl.querySelectorAll('.word')];


// ── ABOUT: MARQUEE DUPLICATE ───────────────────────────
// Duplicate the marquee track so the loop is seamless
const marqueeTrack = document.getElementById('marquee-track');
const clone = marqueeTrack.cloneNode(true);
clone.id = '';
marqueeTrack.parentElement.appendChild(clone);

// GSAP infinite marquee — moves both tracks in sync
function initMarquee() {
  const trackWidth = marqueeTrack.offsetWidth;
  gsap.set(marqueeTrack.parentElement, { display: 'flex' });

  gsap.to([marqueeTrack, clone], {
    x: `-=${trackWidth}`,
    duration: 28,
    ease: 'none',
    repeat: -1,
    modifiers: {
      x: gsap.utils.unitize(x => parseFloat(x) % trackWidth),
    },
  });
}


// ── ABOUT: MAIN SCROLL ANIMATION ──────────────────────
const aboutPanel  = document.getElementById('about-panel');
const aboutPillNav = document.getElementById('about-pill-nav');
const aboutBadge   = document.querySelector('.about-badge');
const aboutEyebrow = document.querySelector('.about-eyebrow');
const aboutLogo    = document.querySelector('.about-logo-wrap');
const marqueeWrap  = document.querySelector('.about-marquee-wrap');

// Master about timeline — scrub tied to scroll
const aboutTL = gsap.timeline({ paused: true });

// Step 1 (0–0.15): panel wipes up from bottom
aboutTL.to(aboutPanel, {
  clipPath: 'inset(0% 0 0 0)',
  duration: 0.18,
  ease: 'power3.inOut',
}, 0);

// Step 2 (0.12–0.28): pill nav fades in
aboutTL.to(aboutPillNav, {
  opacity: 1,
  duration: 0.1,
  ease: 'power2.out',
}, 0.12);

// Step 3 (0.14–0.28): badge + eyebrow fade in
aboutTL.to([aboutBadge, aboutEyebrow], {
  opacity: 1,
  y: 0,
  duration: 0.1,
  ease: 'power2.out',
  stagger: 0.04,
}, 0.14);

// Step 4 (0.22–0.85): word-by-word scrub fill
wordSpans.forEach((span, i) => {
  const start = 0.22 + (i / wordSpans.length) * 0.58;
  aboutTL.to(span, {
    color: 'rgba(255,255,255,0.92)',
    duration: 0.012,
    ease: 'none',
  }, start);
});

// Step 5 (0.78–0.88): logo drops down from above into the left of the marquee strip
aboutTL.fromTo(aboutLogo,
  { y: -260, opacity: 0 },
  { y: 0, opacity: 1, duration: 0.08, ease: 'power3.out' },
  0.78
);

// Step 6 (0.84–0.94): marquee fades in + starts
aboutTL.to(marqueeWrap, {
  opacity: 1,
  duration: 0.06,
  ease: 'power2.out',
  onStart: initMarquee,
}, 0.84);


// Bind timeline progress to scroll
ScrollTrigger.create({
  trigger:  '#about',
  start:    'top bottom',   // when top of #about hits bottom of viewport
  end:      'bottom bottom',
  scrub:    1.2,
  onUpdate: self => {
    aboutTL.progress(self.progress);
  },
});


// ── ABOUT: HIDE MAIN NAV WHEN PANEL IS COVERING ────────
// Fade the main cream nav out once the about panel is mostly visible
ScrollTrigger.create({
  trigger:  '#about',
  start:    'top 40%',
  end:      'bottom top',
  onEnter:    () => gsap.to('#nav', { opacity: 0, duration: 0.3 }),
  onLeaveBack: () => gsap.to('#nav', { opacity: 1, duration: 0.4 }),
  onLeave:    () => gsap.to('#nav', { opacity: 1, duration: 0.4 }),
  onEnterBack: () => gsap.to('#nav', { opacity: 0, duration: 0.3 }),
});


/* ============================================================
 END ABOUT SECTION
============================================================ */



/* ============================================================
   VIDEO SECTION
   Slot inside the DOMContentLoaded callback in script.js,
   right after the about section code, before the final });
============================================================ */


  // ── VIDEO: DOM REFS ────────────────────────────────────
  const vidSection    = document.getElementById('video-section');
  const vidFrameWrap  = document.getElementById('vid-frame-wrap');
  const vidHeadlineEl = document.getElementById('vid-headline');
  const vidWordStrip  = document.getElementById('vid-word-strip');
  const vidOverlay    = document.getElementById('vid-overlay');
  const vidFill       = document.getElementById('vid-progress-fill');
  const vidCounterEl  = document.getElementById('vid-counter');
  const vidPlaceholder= document.getElementById('vid-placeholder');
  const vidCursor     = document.getElementById('vid-cursor');
  const vidPlayers    = [...document.querySelectorAll('.vid-player')];
  const vidDots       = [...document.querySelectorAll('.vid-dot')];
  const VID_COUNT     = vidPlayers.length;  // 4

  let vidIndex       = 0;
  let vidRAF         = null;   // requestAnimationFrame for progress
  let vidTransitioning = false;
  let anyVideoLoaded = false;


  // ── VIDEO: CHAR SPLIT HEADLINE ─────────────────────────
  function splitHeadline(text) {
    vidHeadlineEl.innerHTML = [...text]
      .map(ch => ch === ' '
        ? '<span class="char" style="display:inline"> </span>'
        : `<span class="char">${ch}</span>`)
      .join('');
    return [...vidHeadlineEl.querySelectorAll('.char')];
  }

  function animateHeadlineIn(chars) {
    gsap.fromTo(chars,
      { y: '110%', opacity: 0 },
      {
        y: 0, opacity: 1,
        duration: 0.65,
        ease: 'power3.out',
        stagger: 0.022,
      }
    );
  }

  function animateHeadlineOut(chars, onComplete) {
    gsap.to(chars, {
      y: '-110%', opacity: 0,
      duration: 0.35,
      ease: 'power2.in',
      stagger: 0.015,
      onComplete,
    });
  }


  // ── VIDEO: WORD STRIP ──────────────────────────────────
  const stripColors = ['c1', 'c2', 'c3', 'c4'];

  function renderWordStrip(wordsStr) {
    const words = wordsStr.split('·').map(w => w.trim());
    vidWordStrip.innerHTML = words.map((w, i) => {
      const sep = i < words.length - 1
        ? '<span class="strip-sep">&middot;</span>'
        : '';
      return `<span class="strip-word ${stripColors[i % 4]}">${w}</span>${sep}`;
    }).join('');

    // Stagger in
    gsap.fromTo('.strip-word',
      { y: 10, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', stagger: 0.08 }
    );
  }


  // ── VIDEO: DOTS ────────────────────────────────────────
  function updateVidDots(idx) {
    vidDots.forEach((d, i) => d.classList.toggle('active', i === idx));
  }


  // ── VIDEO: PROGRESS BAR ────────────────────────────────
  function startProgress(videoEl) {
    cancelAnimationFrame(vidRAF);
    function tick() {
      if (!videoEl.duration) { vidRAF = requestAnimationFrame(tick); return; }
      const pct = (videoEl.currentTime / videoEl.duration) * 100;
      vidFill.style.width = pct + '%';
      vidRAF = requestAnimationFrame(tick);
    }
    vidRAF = requestAnimationFrame(tick);
  }


  // ── VIDEO: TRANSITION TO NEXT ──────────────────────────
  function goToVideo(nextIdx, direction) {
    if (vidTransitioning) return;
    vidTransitioning = true;

    const currentVid = vidPlayers[vidIndex];
    const nextVid    = vidPlayers[nextIdx];
    const currentChars = [...vidHeadlineEl.querySelectorAll('.char')];

    // 1. Fade overlay in (brief flash between clips)
    gsap.timeline()
      .to(vidOverlay, {
        opacity: 0.6,
        duration: 0.25,
        ease: 'power2.in',
      })
      // 2. Swap videos during the flash
      .add(() => {
        currentVid.pause();
        currentVid.classList.remove('active');
        nextVid.classList.add('active');
        nextVid.currentTime = 0;

        // Update counter
        vidIndex = nextIdx;
        vidCounterEl.textContent =
          String(nextIdx + 1).padStart(2, '0') + ' / ' +
          String(VID_COUNT).padStart(2, '0');
        updateVidDots(nextIdx);

        // Try to play (may fail if no src)
        nextVid.play().catch(() => {});
        startProgress(nextVid);

        // Hide placeholder once any video has played
        if (!anyVideoLoaded) {
          anyVideoLoaded = true;
          vidPlaceholder.classList.add('hidden');
        }
      })
      // 3. Swap headline while overlay is still up
      .add(() => {
        animateHeadlineOut(currentChars, () => {
          const newChars = splitHeadline(nextVid.dataset.headline);
          animateHeadlineIn(newChars);
        });
        renderWordStrip(nextVid.dataset.words);
      }, '-=0.1')
      // 4. Fade overlay back out
      .to(vidOverlay, {
        opacity: 0,
        duration: 0.35,
        ease: 'power2.out',
        onComplete: () => { vidTransitioning = false; }
      });
  }


  // ── VIDEO: INIT ────────────────────────────────────────
  function initVideoSection() {
    // Set first video active
    vidPlayers[0].classList.add('active');
    vidCounterEl.textContent = '01 / 0' + VID_COUNT;

    // Split initial headline
    const initChars = splitHeadline(vidPlayers[0].dataset.headline);
    // chars will be revealed by scroll entry animation

    // Init word strip
    renderWordStrip(vidPlayers[0].dataset.words);

    // Auto-advance when video ends
    vidPlayers.forEach((vid, i) => {
      vid.addEventListener('ended', () => {
        goToVideo((i + 1) % VID_COUNT, 1);
      });

      // Hide placeholder if at least one video has a real src
      vid.addEventListener('canplay', () => {
        anyVideoLoaded = true;
        vidPlaceholder.classList.add('hidden');
      });
    });

    // Dot click
    vidDots.forEach((dot, i) => {
      dot.addEventListener('click', () => {
        if (i !== vidIndex) goToVideo(i, i > vidIndex ? 1 : -1);
      });
    });

    // Kick off first video
    vidPlayers[0].play().catch(() => {});
    startProgress(vidPlayers[0]);

    return initChars;
  }

  const initChars = initVideoSection();


  // ── VIDEO: MUTE TOGGLE ─────────────────────────────────
  const muteBtn = document.getElementById('vid-mute-btn');
  let isMuted = true; // start muted

  muteBtn.addEventListener('click', e => {
    e.stopPropagation(); // don't advance video on click
    isMuted = !isMuted;
    vidPlayers.forEach(v => { v.muted = isMuted; });
    muteBtn.classList.toggle('is-unmuted', !isMuted);
  });

  // Keep new videos in sync with mute state when switching
  const _origGoToVideo = goToVideo;


  // ── VIDEO: CUSTOM CURSOR ───────────────────────────────
  let cursorInSection = false;

  vidSection.addEventListener('mouseenter', () => {
    cursorInSection = true;
    gsap.to(vidCursor, {
      opacity: 1, scale: 1,
      duration: 0.4, ease: 'power3.out',
    });
  });

  vidSection.addEventListener('mouseleave', () => {
    cursorInSection = false;
    gsap.to(vidCursor, {
      opacity: 0, scale: 0.4,
      duration: 0.3, ease: 'power2.in',
    });
  });

  window.addEventListener('mousemove', e => {
    if (!cursorInSection) return;
    gsap.to(vidCursor, {
      x: e.clientX,
      y: e.clientY,
      duration: 0.55,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  });

  // Cursor shrinks when hovering directly on the video frame
  document.getElementById('vid-frame').addEventListener('mouseenter', () => {
    gsap.to(vidCursor, { scale: 0.75, duration: 0.3 });
  });
  document.getElementById('vid-frame').addEventListener('mouseleave', () => {
    gsap.to(vidCursor, { scale: 1, duration: 0.3 });
  });

  // Click frame to advance video
  document.getElementById('vid-frame').addEventListener('click', () => {
    goToVideo((vidIndex + 1) % VID_COUNT, 1);
  });


  // ── VIDEO: SCROLL ENTRY ANIMATION ─────────────────────
  // Video frame scales up from 80% as section enters viewport
  gsap.set(vidFrameWrap, { scale: 0.82, opacity: 0, y: 60 });
  gsap.set('.vid-headline-wrap', { opacity: 0, y: 30 });
  gsap.set('.vid-eyebrow', { opacity: 0 });

  ScrollTrigger.create({
    trigger: '#video-section',
    start:   'top 75%',
    once:    true,
    onEnter: () => {
      // Headline eyebrow
      gsap.to('.vid-eyebrow', {
        opacity: 1, duration: 0.6, ease: 'power2.out'
      });
      // Headline wrap
      gsap.to('.vid-headline-wrap', {
        opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', delay: 0.1,
      });
      // Headline chars
      animateHeadlineIn(initChars);

      // Video frame
      gsap.to(vidFrameWrap, {
        scale: 1, opacity: 1, y: 0,
        duration: 1.0, ease: 'power3.out', delay: 0.18,
      });
    },
  });


  // ── VIDEO: PARALLAX ON SCROLL ──────────────────────────
  // Headline moves slightly slower than the frame (depth)
  gsap.to('.vid-headline-wrap', {
    yPercent: -18,
    ease: 'none',
    scrollTrigger: {
      trigger: '#video-section',
      start:   'top bottom',
      end:     'bottom top',
      scrub:   true,
    },
  });

  // ── VIDEO: MUTE ON SCROLL AWAY ─────────────────────────
  // Silence audio the moment the section leaves the viewport
  // in either direction; restore user's choice if they return.
  ScrollTrigger.create({
    trigger: '#video-section',
    start:   'top bottom',   // section enters viewport
    end:     'bottom top',   // section fully exits viewport

    onEnter:      () => { vidPlayers.forEach(v => { v.muted = isMuted; }); },
    onEnterBack:  () => { vidPlayers.forEach(v => { v.muted = isMuted; }); },
    onLeave:      () => { vidPlayers.forEach(v => { v.muted = true; }); },
    onLeaveBack:  () => { vidPlayers.forEach(v => { v.muted = true; }); },
  });

/* ============================================================
   END VIDEO SECTION
============================================================ */




/* ============================================================
   MENU SECTION
   Slot inside DOMContentLoaded in script.js,
   after video section code, before the final });
============================================================ */


  // ── MENU: DOM REFS ─────────────────────────────────────
  const menuCover      = document.getElementById('menu-cover');
  const menuHorizOuter = document.getElementById('menu-horiz-outer');
  const menuHorizTrack = document.getElementById('menu-horiz-track');
  const menuPanels     = [...document.querySelectorAll('.menu-panel')];
  const menuPanelDots  = [...document.querySelectorAll('.mpd')];
  const menuFullCTA    = document.getElementById('menu-full-cta');
  const catCards       = [...document.querySelectorAll('.cat-card')];

  // Items overlay
  const mioOverlay     = document.getElementById('menu-items-overlay');
  const mioClose       = document.getElementById('mio-close');
  const mioEyebrow     = document.getElementById('mio-eyebrow');
  const mioTitle       = document.getElementById('mio-title');
  const mioList        = document.getElementById('mio-list');

  let menuActivePanelIdx = 0;


  // ── MENU: COVER REVEAL ─────────────────────────────────
  // Wrap line 2 into word spans for colour sweep + micro-bounce loop
  const line2Inner = document.querySelector('.mch-line-2 .mch-inner');
  if (line2Inner) {
    line2Inner.innerHTML =
      '<span class="linger-word">Linger</span> ' +
      '<span class="linger-word">over</span> ' +
      '<span class="linger-word">the</span> ' +
      '<em class="hw hw-food"><span class="linger-word">food,</span></em>';
  }

  function playLingerWave() {
    const words = document.querySelectorAll('.mch-line-2 .linger-word');
    if (!words.length) return;
    gsap.timeline({ defaults: { ease: 'power1.inOut' } })
      .to(words, {
        color: '#9A9590',
        duration: 0.36,
        stagger: 0.07,
      })
      .to(words, {
        color: '#3B2418',
        duration: 0.32,
        stagger: 0.07,
      }, '-=0.12')
      .to(words, {
        color: '#ffffff',
        duration: 0.4,
        stagger: 0.07,
      }, '-=0.1')
      .to(words, {
        y: -4,
        duration: 0.1,
        stagger: 0.035,
        ease: 'power2.out',
      }, '+=0.04')
      .to(words, {
        y: 0,
        duration: 0.28,
        stagger: 0.035,
        ease: 'bounce.out',
      });
  }

  function playLine3Finale() {
    const el = document.querySelector('.mch-line-3 .mch-inner');
    if (!el) return;
    /* Scale bounce — avoids clipping under #menu-cover overflow */
    gsap.fromTo(el,
      { scale: 1 },
      {
        scale: 1.08,
        duration: 0.18,
        ease: 'power2.out',
        yoyo: true,
        repeat: 3,
        transformOrigin: '50% 100%',
        onComplete: () => { gsap.set(el, { clearProps: 'scale' }); },
      }
    );
  }

  let menuLingerInterval = null;

  // Set initial states for GSAP — keeps CSS clean
  gsap.set('.mch-inner',       { y: '108%' });
  gsap.set('.menu-label',      { opacity: 0, y: 30 });
  gsap.set('.menu-cover-eyebrow', { opacity: 0 });
  gsap.set('.menu-cover-sub',  { opacity: 0 });
  gsap.set('.mch-line-2 .linger-word', { color: '#ffffff', y: 0 });

  const coverTL = gsap.timeline({
    scrollTrigger: {
      trigger: '#menu',
      start:   'top 72%',
      once:    true,
    },
    onComplete: () => {
      playLine3Finale();
      window.setTimeout(() => {
        playLingerWave();
        if (menuLingerInterval) clearInterval(menuLingerInterval);
        menuLingerInterval = window.setInterval(playLingerWave, 5000);
      }, 1800);
    },
  });

  coverTL
    // 1. "Menu" heading drops in
    .to('.menu-label', {
      opacity: 1, y: 0,
      duration: 0.8, ease: 'power3.out',
    })
    // 2. "A short list." fades under it
    .to('.menu-cover-eyebrow', {
      opacity: 1, duration: 0.5, ease: 'power2.out',
    }, '-=0.4')
    // 3. Three headline lines slide up one by one
    .to('.mch-inner', {
      y: 0,
      duration: 0.9, ease: 'power3.out',
      stagger: 0.2,
    }, '-=0.2')
    // 4. Scroll hint fades in last
    .to('.menu-cover-sub', {
      opacity: 1, duration: 0.5, ease: 'power2.out',
    }, '-=0.3');


  // ── MENU: HORIZONTAL SCROLL (ScrollTrigger) ────────────
  // Single ScrollTrigger — pins the outer wrapper and slides
  // the track left by one viewport-width per panel.
  gsap.set(menuHorizTrack, { x: 0 });

  const horizScrub = ScrollTrigger.create({
    trigger:       '#menu-horiz-outer',
    start:         'top top',
    end:           () => `+=${window.innerWidth * (menuPanels.length - 1)}`,
    scrub:         1,
    pin:           true,
    anticipatePin: 1,
    animation: gsap.to(menuHorizTrack, {
      x:    () => -(menuPanels.length - 1) * window.innerWidth,
      ease: 'none',
    }),
    onEnter: () => {
      // Show first panel cards the moment the section pins
      animatePanelCards(0);
    },
    onUpdate: self => {
      const idx = Math.min(
        menuPanels.length - 1,
        Math.round(self.progress * (menuPanels.length - 1))
      );
      if (idx !== menuActivePanelIdx) {
        menuActivePanelIdx = idx;
        updateMenuDots(idx);
        animatePanelCards(idx);
      }
    },
  });


  // Animate category cards in when their panel becomes active
  function animatePanelCards(panelIdx) {
    const panel = menuPanels[panelIdx];
    const cards = panel.querySelectorAll('.cat-card');
    gsap.killTweensOf(cards);
    gsap.fromTo(cards,
      { opacity: 0, y: 18 },
      {
        opacity: 1,
        y: 0,
        duration: 0.28,
        ease: 'power2.out',
        stagger: { each: 0.028, from: 'start' },
        overwrite: 'auto',
      }
    );
  }

  // Load category thumbnails eagerly so they paint as soon as the panel pins
  document.querySelectorAll('.cat-card img').forEach(img => {
    img.loading = 'eager';
    img.decoding = 'async';
    img.fetchPriority = 'low';
  });

  function updateMenuDots(idx) {
    menuPanelDots.forEach((d, i) => d.classList.toggle('active', i === idx));
  }


  // ── MENU: FULL CTA REVEAL ──────────────────────────────
  ScrollTrigger.create({
    trigger:  '#menu-full-cta',
    start:    'top 85%',
    once:     true,
    onEnter:  () => gsap.to('#menu-full-cta', {
      opacity: 1, duration: 0.7, ease: 'power2.out',
    }),
  });


  // ── MENU: ITEMS OVERLAY ────────────────────────────────
  // Open overlay with items for the clicked category
  function openItemsOverlay(catName, items) {
    // Populate
    mioEyebrow.textContent = 'Menu';
    mioTitle.textContent   = catName;
    mioList.innerHTML = items.map(item => `
      <li class="mio-item">
        <div class="mio-item-info">
          <p class="mio-item-name">${item.name}</p>
          <p class="mio-item-desc">${item.desc}</p>
        </div>
      </li>
    `).join('');

    mioOverlay.setAttribute('aria-hidden', 'false');
    mioOverlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    // Clip from top → fully visible
    gsap.timeline()
      .to(mioOverlay, {
        clipPath: 'inset(0 0 0% 0)',
        duration: 0.65,
        ease: 'power3.inOut',
      })
      // Stagger items in from left
      .fromTo('.mio-item',
        { opacity: 0, x: -24 },
        { opacity: 1, x: 0, duration: 0.55, ease: 'power3.out', stagger: 0.06 },
        '-=0.2'
      );
  }

  function closeItemsOverlay() {
    gsap.to(mioOverlay, {
      clipPath: 'inset(0 0 100% 0)',
      duration: 0.5,
      ease: 'power3.in',
      onComplete: () => {
        mioOverlay.classList.remove('is-open');
        mioOverlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      },
    });
  }

  // Attach click handlers to category cards
  catCards.forEach(card => {
    card.addEventListener('click', () => {
      try {
        const items   = JSON.parse(card.dataset.items);
        const catName = card.querySelector('.cat-label').textContent;
        openItemsOverlay(catName, items);
      } catch(e) { console.error('Menu items parse error', e); }
    });
  });

  mioClose.addEventListener('click', closeItemsOverlay);

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && mioOverlay.classList.contains('is-open')) {
      closeItemsOverlay();
    }
  });

/* ============================================================
   END MENU SECTION
============================================================ */



/* ============================================================
   GALLERY SECTION
============================================================ */

  // ── DOM REFS ───────────────────────────────────────────
  const gCardsLeft   = [...document.querySelectorAll('#g-stack .g-card')];
  const gCardsRight  = [...document.querySelectorAll('#g-stack-right .g-card')];
  const gCounterNum  = document.getElementById('g-counter-num');
  const gGridSlots   = [...document.querySelectorAll('.g-grid-slot')];
  const gHiddenCards = [...document.querySelectorAll('.g-hidden-card')];
  const gMoreBtn     = document.getElementById('gallery-more-btn');
  const gMoreWrap    = document.getElementById('gallery-more-wrap');
  const LEFT_COUNT   = gCardsLeft.length;   // 6
  const RIGHT_COUNT  = gCardsRight.length;  // 8


  // ── INTRO HEADLINE ────────────────────────────────────
  ['.ghl-1', '.ghl-2'].forEach(sel => {
    const el = document.querySelector(sel);
    if (!el) return;
    el.innerHTML = `<span>${el.textContent.trim()}</span>`;
  });
  gsap.set('.ghl-1 span, .ghl-2 span', { y: '105%' });

  // Reveal before scrub starts
  ScrollTrigger.create({
    trigger: '#gallery',
    start:   'top 80%',
    once:    true,
    onEnter: () => gsap.to('.ghl-1 span, .ghl-2 span', {
      y: 0, duration: 0.85, ease: 'power3.out', stagger: 0.14,
    }),
  });


  // ── PRE-POPULATE GRID SLOTS ────────────────────────────
  // Clone images from both stacking card sets into grid slots at init,
  // so slots already have content when the grid fades in.
  gCardsLeft.forEach((card, i) => {
    const slot = gGridSlots[i];
    if (!slot) return;
    slot.appendChild(card.querySelector('img').cloneNode(true));
    const num = card.querySelector('.g-card-num');
    if (num) slot.appendChild(num.cloneNode(true));
  });
  gCardsRight.forEach((card, i) => {
    const slot = gGridSlots[i + LEFT_COUNT];
    if (!slot) return;
    slot.appendChild(card.querySelector('img').cloneNode(true));
    const num = card.querySelector('.g-card-num');
    if (num) slot.appendChild(num.cloneNode(true));
  });


  // ── INITIAL GSAP STATES ────────────────────────────────
  gCardsLeft.forEach(c  => gsap.set(c, { x:  '130vw', rotation:  10, opacity: 0 }));
  gCardsRight.forEach(c => gsap.set(c, { x: '-130vw', rotation:  -8, opacity: 0 }));
  gsap.set('#gallery-stack-area',       { opacity: 0 });
  gsap.set('#gallery-stack-area-right', { opacity: 0 });
  gsap.set('#gallery-grid-wrap',        { opacity: 0 });
  gsap.set(gGridSlots,   { opacity: 0, y: 20 });
  gsap.set(gMoreWrap,    { opacity: 0, y: 16 });
  gsap.set(gHiddenCards, { opacity: 0, y: 18 });


  // ── STACK OFFSETS ──────────────────────────────────────
  // Left stack (top-left): fans down-right
  const stackOffsetsLeft = [
    { x:  0, y:  0, r:  0 },
    { x: -6, y:  5, r: -2 },
    { x:  7, y: 10, r:  3 },
    { x: -9, y: 15, r: -3 },
    { x:  8, y: 20, r:  2 },
    { x: -4, y: 25, r: -1 },
  ];
  // Right stack (bottom-right): mirrors left, fans down-left
  const stackOffsetsRight = [
    { x:  0, y:  0, r:  0 },
    { x:  6, y:  5, r:  2 },
    { x: -7, y:  9, r: -2 },
    { x:  9, y: 13, r:  3 },
    { x: -7, y: 17, r: -3 },
    { x:  5, y: 21, r:  2 },
    { x: -4, y: 25, r: -1 },
    { x:  7, y: 29, r:  3 },
  ];


  // ── SCRUB TIMELINE ─────────────────────────────────────
  // All time positions are proportional fractions (0–1) of total scroll.
  // GSAP maps scroll progress directly to timeline progress, so
  // scrolling back up FULLY REVERSES every animation step.
  //
  // Phase map:
  //  0.00–0.06   intro fades out
  //  0.04–0.09   both stack areas fade in
  //  0.08–0.51   LEFT  6 cards fly in from right (step 0.075, interleaved)
  //  0.11–0.65   RIGHT 8 cards fly in from left  (step 0.070, interleaved)
  //  0.63–0.70   both stacks fade out  ← simultaneous cross-fade
  //  0.63–0.70   grid overlay fades in ← no blank gap
  //  0.65–0.88   14 grid slots stagger in
  //  0.90–1.00   View More button appears

  const galleryTL = gsap.timeline();

  galleryTL.to('.gallery-intro', {
    opacity: 0, y: -24, duration: 0.06, ease: 'power2.in',
  }, 0);

  galleryTL.to(['#gallery-stack-area', '#gallery-stack-area-right'], {
    opacity: 1, duration: 0.05, ease: 'power2.out',
  }, 0.04);

  // LEFT cards: fly in from the RIGHT, land on left stack
  const L_START = 0.08, L_STEP = 0.075, L_DUR = 0.065;
  gCardsLeft.forEach((card, i) => {
    galleryTL.to(card, {
      opacity: 1,
      x: stackOffsetsLeft[i].x,
      y: stackOffsetsLeft[i].y,
      rotation: stackOffsetsLeft[i].r,
      duration: L_DUR, ease: 'power3.out',
    }, L_START + i * L_STEP);
  });

  // RIGHT cards: fly in from the LEFT, land on bottom-right stack (interleaved)
  const R_START = 0.11, R_STEP = 0.070, R_DUR = 0.060;
  gCardsRight.forEach((card, i) => {
    galleryTL.to(card, {
      opacity: 1,
      x: stackOffsetsRight[i].x,
      y: stackOffsetsRight[i].y,
      rotation: stackOffsetsRight[i].r,
      duration: R_DUR, ease: 'power3.out',
    }, R_START + i * R_STEP);
  });

  // Cross-fade: stacks out + grid/slots in simultaneously — no blank gap
  // Stacks fade out
  galleryTL.to(['#gallery-stack-area', '#gallery-stack-area-right'], {
    opacity: 0, scale: 0.94, duration: 0.07, ease: 'power1.inOut',
  }, 0.63);

  // Grid overlay fades in at the same moment (true cross-fade)
  galleryTL.to('#gallery-grid-wrap', {
    opacity: 1, duration: 0.07, ease: 'power1.inOut',
  }, 0.63);

  // Slots begin staggering in almost immediately — before stacks are fully gone
  galleryTL.to(gGridSlots, {
    opacity: 1, y: 0, duration: 0.09, ease: 'power3.out', stagger: 0.011,
  }, 0.65);

  // View More button
  galleryTL.to(gMoreWrap, {
    opacity: 1, y: 0, duration: 0.07, ease: 'power2.out',
  }, 0.90);


  // ── BIND TO SCROLL ─────────────────────────────────────
  ScrollTrigger.create({
    trigger:   '#gallery-scroller',
    start:     'top top',
    end:       'bottom bottom',
    scrub:     0.8,
    animation: galleryTL,

    onUpdate: self => {
      const p = self.progress;

      // Compute combined counter for both stacks
      let leftLanded = 0, rightLanded = 0;
      for (let i = 0; i < LEFT_COUNT; i++) {
        if (p >= L_START + i * L_STEP + L_DUR * 0.6) leftLanded = i + 1;
      }
      for (let i = 0; i < RIGHT_COUNT; i++) {
        if (p >= R_START + i * R_STEP + R_DUR * 0.6) rightLanded = i + 1;
      }

      if (p < 0.07) {
        gCounterNum.textContent = '00';
      } else if (p < 0.69) {
        gCounterNum.textContent = String(leftLanded + rightLanded).padStart(2, '0');
      }

      // Enable pointer-events on grid when visible
      document.getElementById('gallery-grid-wrap')
        .classList.toggle('is-active', p > 0.80);
    },
  });


  // ── VIEW MORE ──────────────────────────────────────────
  // Scroll to end of scroller so the full grid is visible,
  // then show hidden cards as a seamless grid continuation.
  gMoreBtn.addEventListener('click', () => {
    gMoreBtn.classList.add('is-hidden');
    const hidden   = document.getElementById('gallery-hidden');
    const scroller = document.getElementById('gallery-scroller');
    hidden.classList.add('is-visible');

    // Jump to the end of the scroller (100% scrub complete),
    // then scroll hidden section into view.
    const scrollerBottom = scroller.getBoundingClientRect().bottom + window.scrollY;
    window.scrollTo({ top: scrollerBottom, behavior: 'smooth' });

    setTimeout(() => {
      gsap.fromTo(gHiddenCards,
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.06 }
      );
      hidden.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 600);
  });

/* ============================================================
   GALLERY LIGHTBOX
============================================================ */

  const glbEl      = document.getElementById('g-lightbox');
  const glbImg     = glbEl.querySelector('.glb-img');
  const glbCounter = glbEl.querySelector('.glb-counter');
  const glbClosBtn = glbEl.querySelector('.glb-close');
  const glbPrevBtn = glbEl.querySelector('.glb-prev');
  const glbNextBtn = glbEl.querySelector('.glb-next');
  const TOTAL_IMGS = LEFT_COUNT + RIGHT_COUNT + gHiddenCards.length; // 25

  // Build ordered image list: left stack → right stack → hidden cards
  const glbSources = [
    ...gCardsLeft,
    ...gCardsRight,
    ...gHiddenCards,
  ].map(el => ({
    src: el.querySelector('img').src,
    alt: el.querySelector('img').alt || 'Gallery photo',
  }));

  let glbIdx = 0;

  function glbUpdateCounter() {
    glbCounter.textContent =
      `${String(glbIdx + 1).padStart(2, '0')} / ${String(TOTAL_IMGS).padStart(2, '0')}`;
  }

  function glbOpen(idx) {
    glbIdx = idx;
    glbImg.src = glbSources[idx].src;
    glbImg.alt = glbSources[idx].alt;
    glbUpdateCounter();
    glbEl.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    gsap.fromTo(glbImg,
      { opacity: 0, scale: 0.93 },
      { opacity: 1, scale: 1, duration: 0.28, ease: 'power3.out' }
    );
  }

  function glbClose() {
    glbEl.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function glbNavigate(dir) {
    glbIdx = (glbIdx + dir + TOTAL_IMGS) % TOTAL_IMGS;
    // Fade current image out, swap src, fade back in
    gsap.to(glbImg, {
      opacity: 0, scale: 0.94, duration: 0.14, ease: 'power2.in',
      onComplete: () => {
        glbImg.src = glbSources[glbIdx].src;
        glbImg.alt = glbSources[glbIdx].alt;
        glbUpdateCounter();
        gsap.fromTo(glbImg,
          { opacity: 0, scale: 0.96 },
          { opacity: 1, scale: 1, duration: 0.20, ease: 'power3.out' }
        );
      },
    });
  }

  // Grid slots are clickable — open lightbox at matching index (0–13)
  gGridSlots.forEach((slot, i) => {
    slot.style.cursor = 'pointer';
    slot.addEventListener('click', () => glbOpen(i));
  });

  // Hidden cards — open lightbox at index 14–24
  gHiddenCards.forEach((card, i) => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => glbOpen(LEFT_COUNT + RIGHT_COUNT + i));
  });

  // Controls
  glbClosBtn.addEventListener('click', glbClose);
  glbPrevBtn.addEventListener('click', () => glbNavigate(-1));
  glbNextBtn.addEventListener('click', () => glbNavigate(1));

  // Close on backdrop click
  glbEl.addEventListener('click', e => { if (e.target === glbEl) glbClose(); });

  // Keyboard: Escape closes, arrows navigate
  document.addEventListener('keydown', e => {
    if (!glbEl.classList.contains('is-open')) return;
    if (e.key === 'Escape')     glbClose();
    if (e.key === 'ArrowLeft')  glbNavigate(-1);
    if (e.key === 'ArrowRight') glbNavigate(1);
  });

  // Touch swipe — left swipe = next, right swipe = previous
  let glbTouchX = 0;
  glbEl.addEventListener('touchstart', e => {
    glbTouchX = e.changedTouches[0].clientX;
  }, { passive: true });

  glbEl.addEventListener('touchend', e => {
    const diff = glbTouchX - e.changedTouches[0].clientX;
    // Only register as swipe if movement is > 40px
    if (Math.abs(diff) > 40) glbNavigate(diff > 0 ? 1 : -1);
  }, { passive: true });

/* ============================================================
   END GALLERY SECTION + LIGHTBOX
============================================================ */




/* ============================================================
   STATEMENT SECTION — sticky sandwich, 2 slides, zoom + word reveal
============================================================ */

  (function initStatement() {
    const stmtEl = document.getElementById('statement');
    if (!stmtEl) return;

    const slides = [...stmtEl.querySelectorAll('.stmt-slide')];
    const dots   = [...stmtEl.querySelectorAll('.stmt-dot')];
    let   currentSlide = 0;
    let   slideTimer   = null;
    let   hasEntered   = false;

    // ── IMAGE PRELOADER ──────────────────────────────────────
    // Pull each slide's bg URL and preload via Image() so the browser
    // caches them before the section scrolls into view. This eliminates
    // the white flash that occurs when opacity:0 slides become visible
    // before their background-image has loaded.
    slides.forEach((slide) => {
      const bg  = slide.querySelector('.stmt-slide-bg');
      const raw = bg.style.backgroundImage || window.getComputedStyle(bg).backgroundImage;
      const match = raw.match(/url\(["']?([^"')]+)["']?\)/);
      if (match && match[1]) {
        const img = new Image();
        img.src = match[1];   // fire-and-forget; just warms the browser cache
      }
    });

    // ── HELPERS ─────────────────────────────────────────────

    function getSlideEls(slide) {
      return {
        bg:      slide.querySelector('.stmt-slide-bg'),
        eyebrow: slide.querySelector('.stmt-eyebrow'),
        words:   slide.querySelectorAll('.stmt-w'),
        rule:    slide.querySelector('.stmt-rule'),
      };
    }

    // Initialise ALL slides (including slide 0) to fully hidden.
    // Starting scale is 1.38 — big enough to feel the pull toward you.
    slides.forEach((slide) => {
      const { bg, eyebrow, words, rule } = getSlideEls(slide);
      gsap.set(slide,      { opacity: 0 });
      gsap.set(bg,         { scale: 1.38, force3D: true });
      gsap.set(eyebrow,    { opacity: 0 });
      gsap.set([...words], { y: '110%', force3D: true });
      gsap.set(rule,       { scaleX: 0 });
    });

    // ── ENTER ANIMATION ─────────────────────────────────────
    // Slide fades in while the bg rushes toward the viewer (1.38 → 1.0).

    function playSlideIn(slide, delay = 0) {
      const { bg, eyebrow, words, rule } = getSlideEls(slide);
      const tl = gsap.timeline({ delay });

      // Slide container fades in
      tl.to(slide, {
        opacity: 1, duration: 0.6, ease: 'power2.out',
        force3D: true,
      }, 0)

      // Ken Burns zoom: 1.38 → 1.0 over the full 5.5s slide lifetime.
      // The image is always slowly drifting toward the viewer —
      // even while the words are fully visible — right up until it transitions.
      // power1.out gives a gentle deceleration so motion is perceptible throughout.
      .to(bg, {
        scale: 1.0, duration: 5.5, ease: 'power1.out',
        force3D: true,
        willChange: 'transform',
        onComplete() { gsap.set(bg, { willChange: 'auto' }); },
      }, 0)

      // Eyebrow fades in
      .to(eyebrow, {
        opacity: 1, duration: 0.5, ease: 'power2.out',
      }, 0.22)

      // Words clip-reveal upward, domino stagger
      .to([...words], {
        y: 0,
        duration: 0.9,
        ease: 'power3.out',
        stagger: { amount: 0.4, from: 'start' },
        force3D: true,
      }, 0.35)

      // Rule unfolds
      .to(rule, {
        scaleX: 1, duration: 0.55, ease: 'power3.out',
      }, 0.9);

      return tl;
    }

    // ── EXIT ANIMATION ───────────────────────────────────────
    // Outgoing bg gently drifts forward (1.0 → 1.06) as it fades — gives
    // a sense of the image "leaving" rather than just disappearing.

    function playSlideOut(slide) {
      const { bg, eyebrow, words, rule } = getSlideEls(slide);
      return gsap.timeline()
        // Text sweeps up and out
        .to([...words, eyebrow, rule], {
          opacity: 0, y: '-22px',
          duration: 0.38, ease: 'power2.in',
          stagger: { amount: 0.16, from: 'end' },
        }, 0)
        // Background drifts forward as it fades — subtle push-away motion
        .to(bg, {
          scale: 1.06, duration: 0.65, ease: 'power1.in',
          force3D: true,
          willChange: 'transform',
          onComplete() { gsap.set(bg, { willChange: 'auto' }); },
        }, 0)
        // Slide itself fades out
        .to(slide, {
          opacity: 0, duration: 0.42, ease: 'power2.inOut',
        }, 0.22);
    }

    // ── SLIDE TRANSITION ────────────────────────────────────
    // Crossfade: incoming slide starts fading in before outgoing fully finishes.

    function goToSlide(idx) {
      if (idx === currentSlide) return;
      const from = slides[currentSlide];
      const to   = slides[idx];

      // Update state + dots immediately
      currentSlide = idx;
      dots.forEach((d, i) => d.classList.toggle('stmt-dot-active', i === idx));

      // Kill any in-flight tweens on the incoming slide so gsap.set sticks
      const { bg, eyebrow, words, rule } = getSlideEls(to);
      gsap.killTweensOf([to, bg, eyebrow, ...words, rule]);

      // Reset incoming slide to start state (it's already opacity:0)
      gsap.set(bg,         { scale: 1.38, force3D: true, willChange: 'auto' });
      gsap.set(eyebrow,    { opacity: 0 });
      gsap.set([...words], { y: '110%', opacity: 1, force3D: true });
      gsap.set(rule,       { scaleX: 0 });
      gsap.set(to,         { opacity: 0 });

      // Start exit immediately; incoming slide overlaps 0.3s before exit finishes
      playSlideOut(from);
      gsap.delayedCall(0.55, () => playSlideIn(to));
    }

    // ── AUTO-PLAY TIMER ─────────────────────────────────────
    // gsap.delayedCall is tied to GSAP's rAF loop — unlike setInterval,
    // it is not throttled by mobile browsers during active scroll.

    function scheduleNext() {
      slideTimer = gsap.delayedCall(5.5, () => {
        goToSlide((currentSlide + 1) % slides.length);
        scheduleNext();
      });
    }

    function startTimer() {
      stopTimer();
      scheduleNext();
    }

    function stopTimer() {
      if (slideTimer) { slideTimer.kill(); slideTimer = null; }
    }

    // ── ZOOM RESTART ─────────────────────────────────────────
    // Re-establishes the Ken Burns drift from a mid-point (scale 1.15 → 1.0)
    // so the image always feels alive when the section is re-entered without
    // a jarring jump back to full scale 1.38.
    function resumeSlideZoom() {
      const { bg } = getSlideEls(slides[currentSlide]);
      gsap.killTweensOf(bg);
      gsap.set(bg, { scale: 1.15, force3D: true });
      gsap.to(bg, {
        scale: 1.0, duration: 4.0, ease: 'power1.out',
        force3D: true, willChange: 'transform',
        onComplete() { gsap.set(bg, { willChange: 'auto' }); },
      });
    }

    // ── GSAP PIN — holds statement in view for ~200vh of scroll ──
    // Uses position:fixed internally → works despite body overflow-x:hidden.
    // Gallery (z-index:2) slides away above; #services (z-index:2) rises over it.
    ScrollTrigger.create({
      trigger:       stmtEl,
      start:         'top 2%',   // fires just before fully at top — forgives mobile viewport shifts
      end:           '+=200vh',
      pin:           true,
      pinSpacing:    true,
      anticipatePin: 1,

      onEnter() {
        if (!hasEntered) {
          // First time arriving: playSlideIn handles everything including the zoom
          hasEntered = true;
          playSlideIn(slides[0]);
        } else {
          // Re-entering from above (user scrolled back up past section then down again):
          // restart zoom so slide stays alive
          resumeSlideZoom();
        }
        startTimer();
      },

      // User scrolled past section then came back up:
      // restart zoom + timer so the slide is never frozen
      onEnterBack() {
        resumeSlideZoom();
        startTimer();
      },

      // Pause timer when section leaves viewport in either direction
      onLeave()     { stopTimer(); },
      onLeaveBack() { stopTimer(); },

      // ScrollTrigger.refresh() fires after layout changes (fonts/images loaded,
      // resize, etc.).  The sequence within a single refresh cycle is:
      //   onRefresh → onLeave (if position shift) → onEnter (maybe, maybe not)
      // Deferring 150ms puts this check AFTER those callbacks have settled,
      // so we can reliably tell whether the timer is alive and re-start if needed.
      onRefresh(self) {
        gsap.delayedCall(0.15, () => {
          if (!self.isActive) return;
          if (!hasEntered) {
            // Section in view but never initialised (e.g. browser restored scroll here)
            hasEntered = true;
            playSlideIn(slides[0]);
            startTimer();
          } else if (!slideTimer) {
            // hasEntered is true but timer was killed by an onLeave during the refresh;
            // onEnter didn't re-fire because positions shifted too much.
            resumeSlideZoom();
            startTimer();
          }
        });
      },
    });
  })();

/* ============================================================
   END STATEMENT SECTION
============================================================ */




/* ============================================================
   WHAT WE DO SECTION
============================================================ */


  // ── WWD: DOM REFS ───────────────────────────────────────
  const wwdPinOuter     = document.getElementById('wwd-pin-outer');
  const wwdTextBlocks   = [...document.querySelectorAll('.wwd-text-block')];
  const wwdImgLayers    = [...document.querySelectorAll('.wwd-img-layer')];
  const wwdDots         = [...document.querySelectorAll('.wwd-dot')];
  const wwdSceneNum     = document.getElementById('wwd-scene-num');
  const wwdImgCaption   = document.getElementById('wwd-img-caption');
  const wwdProgressFill = document.getElementById('wwd-img-progress-fill');
  const WWD_SCENES = 4;
  let wwdCurrentScene = 1;

  const wwdCaptions   = ['The CEO', 'The Kitchen', 'The Experience', 'The Craft'];
  // Scenes 1-3: dark grays (near-black → dark stone → medium gray — each scene distinct)
  // Scene 4:    warm chocolate — a deliberate shift from cool gray to warm richness
  const wwdLineColors = ['#1e1a17', '#3a3530', '#555050', '#6B3E2A'];


  // ── WWD: INTRO HEADLINE ────────────────────────────────
  ScrollTrigger.create({
    trigger: '.wwd-intro',
    start:   'top 75%',
    once:    true,
    onEnter: () => {
      // Eyebrow
      gsap.to('.wwd-intro-eyebrow', { opacity: 1, duration: 0.5, ease: 'power2.out' });

      // Words reveal upward with a gentle, staggered grace — each slightly later than the last
      gsap.to('.wwd-word-ready',   { y: 0, duration: 0.80, ease: 'power3.out', delay: 0.10 });
      gsap.to('.wwd-word-set',     { y: 0, duration: 0.85, ease: 'power3.out', delay: 0.26 });
      gsap.fromTo('.wwd-word-indulge',
        { y: '110%', filter: 'blur(6px)' },
        { y: 0, filter: 'blur(0px)', duration: 1.0, ease: 'power3.out', delay: 0.44 }
      );
    },
  });


  // ── WWD: SPRINKLE GENERATOR ────────────────────────────
  // Tiny floating sugar sprinkles — fits a dessert / ice cream shop perfectly
  (function wwdCreateSprinkles() {
    const container = document.getElementById('wwd-sprinkles');
    if (!container) return;

    const COLORS = [
      '#FF7EB3', '#FFD166', '#FBF8F3', '#c8814a',
      '#FF9CC2', '#FFE59A', '#E8DDD4', '#F4A261',
      '#FFB3D1', '#FFEC80', '#D4C5B5', '#E76F51',
    ];
    const COUNT = 22;

    for (let i = 0; i < COUNT; i++) {
      const el      = document.createElement('div');
      el.className  = 'wwd-sprinkle';
      const w       = 2 + Math.random() * 1.4;            // 2–3.4 px wide
      const h       = w * (3.2 + Math.random() * 2.2);    // ~3–5× taller (pill)
      const rot     = Math.round(Math.random() * 360);
      const opacity = (0.28 + Math.random() * 0.38).toFixed(2);
      const dur     = (3.5 + Math.random() * 5).toFixed(2);
      const delay   = -(Math.random() * 8).toFixed(2);    // negative = already mid-cycle
      const left    = (4 + Math.random() * 92).toFixed(1);
      const top     = (3 + Math.random() * 94).toFixed(1);
      const color   = COLORS[i % COLORS.length];

      el.style.cssText = [
        `width:${w.toFixed(1)}px`,
        `height:${h.toFixed(1)}px`,
        `background:${color}`,
        `left:${left}%`,
        `top:${top}%`,
        `--r:${rot}deg`,
        `--o:${opacity}`,
        `--dur:${dur}s`,
        `--delay:${delay}s`,
      ].join(';');

      container.appendChild(el);
    }
  })();


  // ── WWD: STARS + CONFETTI GENERATOR ───────────────────
  (function wwdCreateStars() {
    const container = document.getElementById('wwd-sprinkles');
    if (!container) return;

    const STAR_COLORS = ['#FF7EB3', '#FFD166', '#FBF8F3', '#FF9CC2', '#FFEC80', '#c8814a', '#F4A261', '#E0AAFF'];

    // 14 stars (alternating 4-pt and 5-pt)
    for (let i = 0; i < 14; i++) {
      const el     = document.createElement('div');
      el.className = i % 2 === 0 ? 'wwd-star' : 'wwd-star wwd-star-5';
      const size   = (6 + Math.random() * 9).toFixed(1);
      const rot    = Math.round(Math.random() * 360);
      const opacity= (0.25 + Math.random() * 0.40).toFixed(2);
      const dur    = (4 + Math.random() * 6).toFixed(2);
      const delay  = -(Math.random() * 10).toFixed(2);
      const left   = (3 + Math.random() * 94).toFixed(1);
      const top    = (3 + Math.random() * 94).toFixed(1);
      const color  = STAR_COLORS[i % STAR_COLORS.length];

      el.style.cssText = [
        `width:${size}px`, `height:${size}px`,
        `background:${color}`,
        `left:${left}%`, `top:${top}%`,
        `--r:${rot}deg`, `--o:${opacity}`,
        `--dur:${dur}s`, `--delay:${delay}s`,
      ].join(';');
      container.appendChild(el);
    }
  })();


  // ── WWD: INIT SCENE STATE ──────────────────────────────
  function wwdInitScene(sceneEl) {
    const lines     = sceneEl.querySelectorAll('.wwd-line');
    const bodySpans = sceneEl.querySelectorAll('.wwd-body-line span');
    const tagRow    = sceneEl.querySelector('.wwd-tag-row');
    // Reset all possible animation properties so each scene starts clean
    gsap.set(lines,     { y: '105%', x: 0, scale: 1, filter: 'blur(0px)' });
    gsap.set(bodySpans, { y: '100%', x: 0, opacity: 1 });
    gsap.set(tagRow,    { opacity: 0, y: 10, scale: 1 });
  }

  wwdTextBlocks.forEach((block, i) => {
    wwdInitScene(block);
    block.querySelectorAll('.wwd-line').forEach(line => {
      line.style.color = wwdLineColors[i];
    });
  });

  // Init image layers — all clipped away except scene 1
  wwdImgLayers.forEach((layer, i) => {
    if (i === 0) {
      gsap.set(layer, { clipPath: 'inset(0% 0% 0% 0% round 20px)', opacity: 1 });
    } else {
      gsap.set(layer, { clipPath: 'inset(100% 0% 0% 0% round 20px)', opacity: 1 });
    }
    // Show only first flip panel per layer
    const panels = layer.querySelectorAll('.wwd-flip-panel');
    panels.forEach((p, pi) => gsap.set(p, { opacity: pi === 0 ? 1 : 0, scaleX: 1 }));
  });


  // ── WWD: 4 DISTINCT ANIMATE-IN FUNCTIONS ───────────────

  // Scene 1 — "The Rise": clip-reveal from below
  function wwdAnimIn1(el) {
    const lines = el.querySelectorAll('.wwd-line');
    const spans = el.querySelectorAll('.wwd-body-line span');
    const tags  = el.querySelector('.wwd-tag-row');
    gsap.timeline()
      .to(lines, { y: 0, duration: 0.85, ease: 'power3.out', stagger: 0.10 })
      .to(spans, { y: 0, duration: 0.65, ease: 'power3.out', stagger: 0.04 }, '-=0.5')
      .to(tags,  { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '-=0.2');
  }

  // Scene 2 — "The Drift": blur-slide in from the right
  function wwdAnimIn2(el) {
    const lines = el.querySelectorAll('.wwd-line');
    const spans = el.querySelectorAll('.wwd-body-line span');
    const tags  = el.querySelector('.wwd-tag-row');
    gsap.set(lines, { x: 40, filter: 'blur(10px)' });
    gsap.timeline()
      .to(lines, { y: 0, x: 0, filter: 'blur(0px)', duration: 0.9, ease: 'expo.out', stagger: 0.12 })
      .to(spans, { y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.03 }, '-=0.55')
      .to(tags,  { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }, '-=0.2');
  }

  // Scene 3 — "The Spring": elastic bounce from the left
  function wwdAnimIn3(el) {
    const lines = el.querySelectorAll('.wwd-line');
    const spans = el.querySelectorAll('.wwd-body-line span');
    const tags  = el.querySelector('.wwd-tag-row');
    gsap.set(lines, { x: -36 });
    gsap.timeline()
      .to(lines, { y: 0, x: 0, duration: 1.0, ease: 'elastic.out(1,0.55)', stagger: 0.1 })
      .to(spans, { y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.04 }, '-=0.7')
      .to(tags,  { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'back.out(1.5)' }, '-=0.25');
  }

  // Scene 4 — "The Scale": scale up from small
  function wwdAnimIn4(el) {
    const lines = el.querySelectorAll('.wwd-line');
    const spans = el.querySelectorAll('.wwd-body-line span');
    const tags  = el.querySelector('.wwd-tag-row');
    gsap.set(lines, { scale: 0.82 });
    gsap.timeline()
      .to(lines, { y: 0, scale: 1, duration: 0.85, ease: 'power4.out', stagger: 0.09 })
      .to(spans, { y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.03 }, '-=0.55')
      .to(tags,  { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }, '-=0.2');
  }

  const wwdAnimInFns = [wwdAnimIn1, wwdAnimIn2, wwdAnimIn3, wwdAnimIn4];

  function wwdAnimateIn(sceneEl) {
    const idx = wwdTextBlocks.indexOf(sceneEl);
    (wwdAnimInFns[idx] || wwdAnimIn1)(sceneEl);
  }


  // ── WWD: ANIMATE SCENE OUT ─────────────────────────────
  function wwdAnimateOut(sceneEl, direction) {
    const lines = sceneEl.querySelectorAll('.wwd-line');
    const spans = sceneEl.querySelectorAll('.wwd-body-line span');
    const tags  = sceneEl.querySelector('.wwd-tag-row');
    const exitY = direction === 'up' ? '-120%' : '120%';
    return gsap.timeline()
      .to([spans, tags], {
        opacity: 0, y: direction === 'up' ? -8 : 8,
        duration: 0.3, ease: 'power2.in', stagger: 0.02,
      })
      .to(lines, {
        y: exitY, duration: 0.55, ease: 'power2.in',
        stagger: { amount: 0.08, from: direction === 'up' ? 'end' : 'start' },
      }, '-=0.15');
  }


  // ── WWD: IMAGE FLIP CYCLING ────────────────────────────
  let wwdFlipTimers = [null, null, null, null];

  function wwdFlipImage(sceneIdx) {
    const layer  = wwdImgLayers[sceneIdx];
    const panels = [...layer.querySelectorAll('.wwd-flip-panel')];
    if (!panels.length) return;
    const cur  = panels.find(p => p.classList.contains('wwd-fp-active')) || panels[0];
    const curI = panels.indexOf(cur);
    const nxt  = panels[(curI + 1) % panels.length];

    gsap.to(cur, {
      scaleX: 0, duration: 0.28, ease: 'power2.in', transformOrigin: 'center center',
      onComplete() {
        cur.classList.remove('wwd-fp-active');
        gsap.set(cur, { opacity: 0, scaleX: 1 });
        nxt.classList.add('wwd-fp-active');
        gsap.set(nxt, { opacity: 1, scaleX: 0 });
        gsap.to(nxt, { scaleX: 1, duration: 0.28, ease: 'power2.out', transformOrigin: 'center center' });
      },
    });
  }

  function wwdStartFlip(sceneIdx) {
    wwdStopFlip(sceneIdx);
    if (sceneIdx === 0) return; // CEO has single image — no flip
    // Reset panels to first image
    const panels = [...wwdImgLayers[sceneIdx].querySelectorAll('.wwd-flip-panel')];
    panels.forEach((p, i) => {
      p.classList.toggle('wwd-fp-active', i === 0);
      gsap.set(p, { opacity: i === 0 ? 1 : 0, scaleX: 1 });
    });
    wwdFlipTimers[sceneIdx] = setInterval(() => wwdFlipImage(sceneIdx), 3000);
  }

  function wwdStopFlip(sceneIdx) {
    if (wwdFlipTimers[sceneIdx]) {
      clearInterval(wwdFlipTimers[sceneIdx]);
      wwdFlipTimers[sceneIdx] = null;
    }
  }


  // ── WWD: TRANSITION TO SCENE N ─────────────────────────
  let wwdAnimInTimer = null;

  function wwdGoToScene(nextScene, direction) {
    if (nextScene === wwdCurrentScene) return;

    const fromIdx   = wwdCurrentScene - 1;
    const toIdx     = nextScene - 1;
    const fromBlock = wwdTextBlocks[fromIdx];
    const toBlock   = wwdTextBlocks[toIdx];
    const fromImg   = wwdImgLayers[fromIdx];
    const toImg     = wwdImgLayers[toIdx];

    // ── Fix: cancel any pending delayed animate-in from rapid scroll ──
    if (wwdAnimInTimer) { clearTimeout(wwdAnimInTimer); wwdAnimInTimer = null; }

    // Kill in-flight tweens on both blocks to prevent state conflicts
    const allEls = [
      ...fromBlock.querySelectorAll('.wwd-line, .wwd-body-line span, .wwd-tag-row'),
      ...toBlock.querySelectorAll('.wwd-line, .wwd-body-line span, .wwd-tag-row'),
    ];
    gsap.killTweensOf([...allEls, fromImg, toImg]);

    // Reset incoming block then make it visible (but hidden via transforms)
    wwdInitScene(toBlock);
    gsap.set(toBlock, { opacity: 1 });

    // Animate current text out
    wwdAnimateOut(fromBlock, direction);

    // Stop cycling on outgoing scene
    wwdStopFlip(fromIdx);

    // Image curtain wipe
    gsap.timeline()
      .to(fromImg, {
        clipPath: direction === 'up'
          ? 'inset(0% 0% 100% 0% round 20px)'
          : 'inset(100% 0% 0% 0% round 20px)',
        duration: 0.75, ease: 'power3.inOut',
      })
      .set(fromImg, { opacity: 0 })
      .set(toImg, {
        opacity: 1,
        clipPath: direction === 'up'
          ? 'inset(100% 0% 0% 0% round 20px)'
          : 'inset(0% 0% 100% 0% round 20px)',
      })
      .to(toImg, { clipPath: 'inset(0% 0% 0% 0% round 20px)', duration: 0.8, ease: 'power3.inOut' }, '-=0.1');

    // Scale settle on the active panel's image
    const toActiveImg = toImg.querySelector('.wwd-fp-active img') || toImg.querySelector('img');
    if (toActiveImg) {
      gsap.fromTo(toActiveImg, { scale: 1.08 }, { scale: 1.0, duration: 1.4, ease: 'power3.out' });
    }

    // Delayed: animate in new text + start flip cycling
    wwdAnimInTimer = setTimeout(() => {
      wwdAnimateIn(toBlock);
      gsap.set(fromBlock, { opacity: 0 });
      wwdStartFlip(toIdx);
      wwdAnimInTimer = null;
    }, 350);

    // UI state
    wwdCurrentScene = nextScene;
    wwdSceneNum.textContent = String(nextScene).padStart(2, '0');
    wwdImgCaption.textContent = wwdCaptions[toIdx];
    wwdProgressFill.style.width = `${(nextScene / WWD_SCENES) * 100}%`;
    wwdDots.forEach((d, i) => d.classList.toggle('active', i === toIdx));
  }


  // ── WWD: SCROLLTRIGGER PIN ─────────────────────────────
  let wwdLastScene = 1;

  ScrollTrigger.create({
    trigger:       wwdPinOuter,
    start:         'top top',
    end:           `+=${window.innerHeight * WWD_SCENES}`,
    pin:           '#wwd-stage',
    anticipatePin: 1,
    scrub:         false,
    onUpdate: self => {
      const scene = Math.min(WWD_SCENES, Math.floor(self.progress * WWD_SCENES) + 1);
      if (scene !== wwdLastScene) {
        wwdGoToScene(scene, scene > wwdLastScene ? 'up' : 'down');
        wwdLastScene = scene;
      }
      wwdProgressFill.style.width = `${self.progress * 100}%`;
    },
  });


  // ── WWD: STAGE ENTRANCE ────────────────────────────────
  gsap.set('#wwd-scene-counter', { opacity: 0, y: -16 });
  gsap.set('#wwd-dots',          { opacity: 0, x: 20 });
  gsap.set('#wwd-img-frame',     { opacity: 0, y: 32 });
  gsap.set('#wwd-img-caption',   { opacity: 0, y: 10 });
  gsap.set('#wwd-img-progress',  { opacity: 0 });

  ScrollTrigger.create({
    trigger: '#wwd-pin-outer',
    start:   'top 82%',
    once:    true,
    onEnter: () => {
      gsap.timeline()
        .to('#wwd-scene-counter', { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' }, 0)
        .to('#wwd-img-frame',     { opacity: 1, y: 0, duration: 0.90, ease: 'power3.out' }, 0.05)
        .to('#wwd-dots',          { opacity: 1, x: 0, duration: 0.60, ease: 'power3.out' }, 0.15)
        .to('#wwd-img-caption',   { opacity: 1, y: 0, duration: 0.50, ease: 'power2.out' }, 0.30)
        .to('#wwd-img-progress',  { opacity: 1,        duration: 0.40, ease: 'power2.out' }, 0.35);
    },
  });


  // ── WWD: SCENE 1 INITIAL REVEAL ────────────────────────
  ScrollTrigger.create({
    trigger: '#wwd-pin-outer',
    start:   'top 55%',
    once:    true,
    onEnter: () => {
      const firstBlock = wwdTextBlocks[0];
      gsap.set(firstBlock, { opacity: 1 });
      wwdAnimateIn(firstBlock);
      // Fade sprinkles in when section first activates
      gsap.to('#wwd-sprinkles', { opacity: 1, duration: 1.2, ease: 'power2.out' });
      const firstImg = wwdImgLayers[0].querySelector('img');
      if (firstImg) gsap.fromTo(firstImg, { scale: 1.08 }, { scale: 1.0, duration: 1.6, ease: 'power3.out' });
    },
  });


  // ── WWD: DOT NAVIGATION ────────────────────────────────
  wwdDots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      const pinStart = wwdPinOuter.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: pinStart + i * window.innerHeight, behavior: 'smooth' });
    });
  });


/* ============================================================
   END WHAT WE DO SECTION
============================================================ */



/* ============================================================
   TESTIMONIALS SECTION
   Slot inside DOMContentLoaded in script.js,
   after What We Do code, before the final });
============================================================ */


  // ── TESTI: DATA ────────────────────────────────────────
  const testiData = [
    {
      initial:    'A',
      quote:      'The Biscoff pancakes are something I think about on bad days. Warm, generous, exactly right. There is nowhere else in Accra that makes you feel this well looked after.',
      name:       'Ama Osei-Bonsu',
      descriptor: 'Regular since 2022 · Accra',
    },
    {
      initial:    'K',
      quote:      'I came for the waffles and stayed for everything else. The chocolate drip waffle is one of the best things I have eaten in this city. The space is beautiful too — quiet and warm.',
      name:       'Kwame Asante',
      descriptor: 'Food writer · Accra',
    },
    {
      initial:    'E',
      quote:      'Frozen Spoon has become our family Sunday ritual. The kids love the ice cream and my husband and I refuse to leave without a freakshake. It never gets old.',
      name:       'Efua Mensah-Quartey',
      descriptor: 'Regular since 2021 · East Legon',
    },
    {
      initial:    'M',
      quote:      'Every time I visit, something about it feels considered. The food, the light, the way the staff moves. It is the kind of place that makes you slow down.',
      name:       'Michael Addo',
      descriptor: 'Architect · Cantonments',
    },
    {
      initial:    'D',
      quote:      'I ordered the Velvet Dream freakshake on a whim and genuinely had to stop and think about it for a moment. That is not something I say about dessert often.',
      name:       'Dede Asiedu',
      descriptor: 'Regular since 2023 · Labone',
    },
  ];

  const TESTI_COUNT    = testiData.length;
  const TESTI_INTERVAL = 16000; // ms

  // ── TESTI: DOM REFS ────────────────────────────────────
  const testiQuoteWrap = document.getElementById('testi-quote-wrap');
  const testiQuoteText = document.getElementById('testi-quote-text');
  const testiName      = document.getElementById('testi-name');
  const testiDesc      = document.getElementById('testi-descriptor');
  const testiCountCur  = document.getElementById('testi-count-cur');
  const testiProgFill  = document.getElementById('testi-progress-fill');
  const testiAvItems   = [...document.querySelectorAll('.testi-av-item')];
  const testiPrev      = document.getElementById('testi-prev');
  const testiNext      = document.getElementById('testi-next');

  let testiCurrent  = 0;
  let testiTimer    = null;
  let testiRunning  = false;


  // ── TESTI: PROGRESS BAR ────────────────────────────────
  function testiResetProgress() {
    // Kill transition, reset to 0, then let it run to 100
    testiProgFill.style.transition = 'none';
    testiProgFill.style.width = '0%';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        testiProgFill.style.transition = `width ${TESTI_INTERVAL}ms linear`;
        testiProgFill.style.width = '100%';
      });
    });
  }


  // ── TESTI: TRANSITION ──────────────────────────────────
  function testiGoTo(idx, direction) {
    if (idx === testiCurrent) return;

    const data    = testiData[idx];
    const exitDir = direction === 'next' ? '-110%' : '110%';
    const enterDir= direction === 'next' ?  '110%' : '-110%';

    // Animate out current quote
    gsap.to(testiQuoteText, {
      y:        exitDir,
      opacity:  0,
      duration: 0.4,
      ease:     'power2.in',
    });

    gsap.to([testiName, testiDesc], {
      y: direction === 'next' ? -10 : 10,
      opacity: 0,
      duration: 0.25,
      ease: 'power2.in',
    });

    // Swap content after exit
    setTimeout(() => {
      testiQuoteText.textContent = data.quote;
      testiName.textContent      = data.name;
      testiDesc.textContent      = data.descriptor;
      testiCountCur.textContent  = idx + 1;

      // Set start position for enter
      gsap.set(testiQuoteText, { y: enterDir, opacity: 0 });
      gsap.set([testiName, testiDesc], {
        y: direction === 'next' ? 12 : -12,
        opacity: 0,
      });

      // Animate in
      gsap.to(testiQuoteText, {
        y: 0, opacity: 1, duration: 0.6, ease: 'power3.out',
      });

      gsap.to([testiName, testiDesc], {
        y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', stagger: 0.06,
      });

      // Update avatars
      testiAvItems.forEach((av, i) => {
        av.classList.toggle('active', i === idx);
      });

      testiCurrent = idx;
      testiResetProgress();

    }, 300);
  }


  // ── TESTI: AUTO CYCLE ──────────────────────────────────
  function testiStartCycle() {
    clearInterval(testiTimer);
    testiTimer = setInterval(() => {
      testiGoTo((testiCurrent + 1) % TESTI_COUNT, 'next');
    }, TESTI_INTERVAL);
  }


  // ── TESTI: CONTROLS ────────────────────────────────────
  testiNext.addEventListener('click', () => {
    clearInterval(testiTimer);
    testiGoTo((testiCurrent + 1) % TESTI_COUNT, 'next');
    testiStartCycle();
  });

  testiPrev.addEventListener('click', () => {
    clearInterval(testiTimer);
    testiGoTo((testiCurrent - 1 + TESTI_COUNT) % TESTI_COUNT, 'prev');
    testiStartCycle();
  });

  testiAvItems.forEach((av, i) => {
    av.addEventListener('click', () => {
      if (i === testiCurrent) return;
      clearInterval(testiTimer);
      testiGoTo(i, i > testiCurrent ? 'next' : 'prev');
      testiStartCycle();
    });
  });


  // ── TESTI: SCROLL ENTRY ────────────────────────────────
  ScrollTrigger.create({
    trigger: '#testimonials',
    start:   'top 70%',
    once:    true,
    onEnter: () => {

      // Headline — bouncy pop-in with a playful tilt that settles upright
      gsap.fromTo('.testi-hl-line',
        { y: '110%', rotation: -5, opacity: 1 },
        {
          y: 0, rotation: 0, duration: 1.1, ease: 'back.out(1.7)', stagger: 0.22,
          onComplete() {
            // Once both lines are settled, start the subtle warm-glow pulse
            document.querySelectorAll('.testi-hl-line').forEach(el => {
              el.style.animationPlayState = 'running';
            });
          },
        }
      );

      // Sub-headline — slight scale pop after the headline lands
      gsap.fromTo('.testi-sub-headline',
        { opacity: 0, y: 14, scale: 0.88 },
        { opacity: 1, y: 0, scale: 1, duration: 0.72, ease: 'back.out(1.5)', delay: 0.48 }
      );

      // Card scale up
      gsap.to('#testi-card', {
        opacity:  1,
        scale:    1,
        y:        0,
        duration: 0.9,
        ease:     'power3.out',
        delay:    0.25,
        onComplete: () => {
          // Start auto-cycle only after card is visible
          testiStartCycle();
          testiRunning = true;
          testiResetProgress();
        },
      });

      // Nav fade in
      gsap.fromTo('#testi-nav',
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', delay: 0.5 }
      );
    },
  });

/* ============================================================
   END TESTIMONIALS SECTION
============================================================ */


/* NOTE: ScrollTrigger already auto-refreshes on window.load via its default
   autoRefreshEvents setting. No explicit refresh needed here — adding one
   would cause a double-refresh that fires onLeave mid-animation and kills
   the statement section's auto-advance timer. */





   /* ============================================================
   FOOTER
   Slot inside DOMContentLoaded in script.js,
   after testimonials code, before the final });
============================================================ */


  // ── FOOTER: COPYRIGHT YEAR ─────────────────────────────
  const footerYearEl = document.getElementById('footer-year');
  if (footerYearEl) {
    footerYearEl.textContent = new Date().getFullYear();
  }


  // ── FOOTER: MARQUEE ────────────────────────────────────
  const footerTrack = document.getElementById('footer-marquee-track');
  if (footerTrack) {
    // Duplicate track for seamless loop
    const clone = footerTrack.cloneNode(true);
    footerTrack.parentElement.appendChild(clone);

    const trackW = footerTrack.offsetWidth;

    gsap.to([footerTrack, clone], {
      x:        `-=${trackW}`,
      duration: 32,
      ease:     'none',
      repeat:   -1,
      modifiers: {
        x: gsap.utils.unitize(x => parseFloat(x) % trackW),
      },
    });
  }


  // ── FOOTER: BACK TO TOP ────────────────────────────────
  const footerTopBtn = document.getElementById('footer-top-btn');
  if (footerTopBtn) {
    footerTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }


  // ── FOOTER: SCROLL ENTRY ANIMATIONS ───────────────────
  ScrollTrigger.create({
    trigger: '#site-footer',
    start:   'top 85%',
    once:    true,
    onEnter: () => {

      // Stagger in each column
      gsap.fromTo('.footer-col',
        { opacity: 0, y: 32 },
        {
          opacity:  1,
          y:        0,
          duration: 0.75,
          ease:     'power3.out',
          stagger:  0.1,
        }
      );

      // Social icons pop in
      gsap.fromTo('.footer-social-link',
        { opacity: 0, scale: 0.7 },
        {
          opacity:  1,
          scale:    1,
          duration: 0.5,
          ease:     'back.out(1.8)',
          stagger:  0.07,
          delay:    0.3,
        }
      );

      // Wordmark fades in
      gsap.fromTo('#footer-wordmark',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 1.2, ease: 'power2.out', delay: 0.4 }
      );

      // Bottom bar
      gsap.fromTo('#footer-bottom',
        { opacity: 0 },
        { opacity: 1, duration: 0.6, ease: 'power2.out', delay: 0.5 }
      );
    },
  });


  // ── FOOTER: SOCIAL LINK MAGNETIC HOVER ────────────────
  document.querySelectorAll('.footer-social-link').forEach(link => {
    link.addEventListener('mousemove', e => {
      const r  = link.getBoundingClientRect();
      const cx = r.left + r.width  / 2;
      const cy = r.top  + r.height / 2;
      gsap.to(link, {
        x: (e.clientX - cx) * 0.25,
        y: (e.clientY - cy) * 0.25,
        duration: 0.35,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    });

    link.addEventListener('mouseleave', () => {
      gsap.to(link, {
        x: 0, y: 0,
        duration: 0.6,
        ease: 'elastic.out(1, 0.55)',
      });
    });
  });

/* ============================================================
   END FOOTER
============================================================ */

  }); // DOMContentLoaded