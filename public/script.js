// Countdown, Calendar, Envelope Animation, RSVP with Maybe date
// plus cinematic auto‑scroll (cancelable by user)

(function() {
  // DOM elements
  const envelopeStage = document.getElementById('envelopeStage');
  const envelopeWrapper = document.getElementById('envelopeWrapper');
  const personalizedPassDiv = document.getElementById('personalizedPass');
  const mainInvitation = document.getElementById('mainInvitation');
  const seeDetailsBtn = document.getElementById('seeDetailsBtn');
  const audio = document.getElementById('weddingAudio');
  const audioToggle = document.getElementById('audioToggleBtn');
  const guestNameInput = document.getElementById('guestNameInput');
  const guestNameSpan = document.getElementById('guestNameDisplay');
  const nameErrorDiv = document.getElementById('nameError');

  // Guest name handling
  let guestName = "";
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('guest')) {
    guestName = decodeURIComponent(urlParams.get('guest'));
  } else if (guestNameInput) {
    guestName = guestNameInput.value.trim();
  }
  if (guestNameInput) guestNameInput.value = guestName;
  if (guestNameSpan) guestNameSpan.innerText = guestName || "Our Beloved Guest";

  // Live update name display
  if (guestNameInput) {
    guestNameInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (guestNameSpan) guestNameSpan.innerText = val || "Our Beloved Guest";
      if (nameErrorDiv) nameErrorDiv.style.display = 'none';
      if (guestNameInput) guestNameInput.style.borderColor = '#DDD6CA';
    });
  }

  let envelopeOpened = false;

  // Envelope click with validation
  envelopeWrapper.addEventListener('click', () => {
    if (envelopeOpened) return;
    const currentName = guestNameInput ? guestNameInput.value.trim() : "";
    if (currentName === "") {
      if (nameErrorDiv) nameErrorDiv.style.display = 'block';
      if (guestNameInput) guestNameInput.style.borderColor = '#d9534f';
      envelopeWrapper.style.transform = 'translateX(0)';
      envelopeWrapper.style.animation = 'shake 0.3s ease';
      setTimeout(() => { envelopeWrapper.style.animation = ''; }, 300);
      return;
    }
    envelopeOpened = true;
    if (guestNameSpan) guestNameSpan.innerText = currentName;
    audio.play().catch(e => console.log("Autoplay blocked"));
    envelopeWrapper.classList.add('open');
    setTimeout(() => {
      envelopeStage.style.display = 'none';
      personalizedPassDiv.classList.remove('hidden-section');
      personalizedPassDiv.style.display = 'block';
    }, 500);
  });

  // Shake animation keyframes
  const style = document.createElement('style');
  style.textContent = `@keyframes shake { 0% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } 100% { transform: translateX(0); } }`;
  document.head.appendChild(style);

  // ========== CINEMATIC SLIDE-UP + AUTO-SCROLL (CANCELABLE) ==========
  let autoScrollAnimationId = null;
  let userInterrupted = false;

  function stopAutoScroll() {
    if (autoScrollAnimationId) {
      cancelAnimationFrame(autoScrollAnimationId);
      autoScrollAnimationId = null;
    }
  }

  function startCinematicScroll() {
    // Cancel any existing animation
    stopAutoScroll();
    userInterrupted = false;
    
    // Get elements
    const rsvpButton = document.getElementById('openRsvpModalBtn');
    if (!rsvpButton) return;
    
    // Starting scroll position: top of main invitation (where the couple's name is)
    const startY = mainInvitation.offsetTop;
    // Target: position of RSVP button (we want it to end near the bottom of viewport)
    // For a nicer finish, scroll until the button is 100px from the top of the window
    const buttonRect = rsvpButton.getBoundingClientRect();
    const targetY = buttonRect.top + window.pageYOffset - 100;
    // Ensure we don't scroll beyond the bottom of the page
    const maxScroll = document.body.scrollHeight - window.innerHeight;
    const finalTarget = Math.min(targetY, maxScroll);
    
   const distance = finalTarget - startY;
    if (distance <= 0) return;
    
   const duration = 14000; // 14 seconds total: fast first 6s, slower after
    const fastPhaseDuration = 6000; // first 6 seconds
    const fastPhaseCoverage = 0.6; // covers 60% of the distance by the 6s mark
    let startTime = null;
    
    function twoPhaseEase(elapsed) {
      if (elapsed <= fastPhaseDuration) {
        const p = elapsed / fastPhaseDuration;
        const easedOut = 1 - Math.pow(1 - p, 3); // fast, snappy start
        return easedOut * fastPhaseCoverage;
      } else {
        const slowPhaseDuration = duration - fastPhaseDuration;
        const p = Math.min((elapsed - fastPhaseDuration) / slowPhaseDuration, 1);
        const easedInOut = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        return fastPhaseCoverage + easedInOut * (1 - fastPhaseCoverage);
      }
    }
    
    function scrollStep(timestamp) {
      if (userInterrupted) {
        stopAutoScroll();
        return;
      }
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = twoPhaseEase(elapsed);
      const scrollY = startY + (distance * eased);
      window.scrollTo(0, scrollY);
      if (progress < 1 && !userInterrupted) {
        autoScrollAnimationId = requestAnimationFrame(scrollStep);
      } else {
        autoScrollAnimationId = null;
      }
    }
    
    // Add event listeners to detect user scroll attempts
    const cancelAutoScroll = () => {
      if (!userInterrupted) {
        userInterrupted = true;
        stopAutoScroll();
        // Remove listeners after interruption
        window.removeEventListener('wheel', cancelAutoScroll);
        window.removeEventListener('touchstart', cancelAutoScroll);
        window.removeEventListener('keydown', cancelAutoScroll);
      }
    };
    
    window.addEventListener('wheel', cancelAutoScroll, { once: false, passive: true });
    window.addEventListener('touchstart', cancelAutoScroll, { once: false, passive: true });
    window.addEventListener('keydown', (e) => {
      // Arrow keys or page up/down also count as manual scroll
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'PageUp' || e.key === 'PageDown' || e.key === 'Home' || e.key === 'End') {
        cancelAutoScroll();
      }
    });
    
    // Also stop if the user clicks and drags the scrollbar (detect mousedown on document)
    document.addEventListener('mousedown', cancelAutoScroll, { once: false });
    
    // Start animation
    autoScrollAnimationId = requestAnimationFrame(scrollStep);
  }

  // Trigger after "See more details"
  seeDetailsBtn.addEventListener('click', () => {
    personalizedPassDiv.style.display = 'none';
    mainInvitation.classList.remove('hidden-section');
    mainInvitation.style.display = 'block';
    void mainInvitation.offsetHeight; // force reflow
    mainInvitation.classList.add('visible');
    initCountdown();
    generateCalendar();
    
    // Wait for slide-up CSS transition to finish (0.8s) then start scroll
    setTimeout(() => {
      startCinematicScroll();
    }, 800);
  });

  // Countdown (December 18, 2026 15:00:00)
  const weddingDate = new Date(2026, 11, 12, 15, 0, 0).getTime();
  function initCountdown() {
    const daysSpan = document.getElementById('days');
    const hoursSpan = document.getElementById('hours');
    const minutesSpan = document.getElementById('minutes');
    const secondsSpan = document.getElementById('seconds');
    function updateTimer() {
      const now = new Date().getTime();
      const distance = weddingDate - now;
      if (distance < 0) {
        daysSpan.innerText = '00'; hoursSpan.innerText = '00'; minutesSpan.innerText = '00'; secondsSpan.innerText = '00';
        return;
      }
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (86400000)) / (3600000));
      const minutes = Math.floor((distance % 3600000) / 60000);
      const seconds = Math.floor((distance % 60000) / 1000);
      daysSpan.innerText = days < 10 ? '0'+days : days;
      hoursSpan.innerText = hours < 10 ? '0'+hours : hours;
      minutesSpan.innerText = minutes < 10 ? '0'+minutes : minutes;
      secondsSpan.innerText = seconds < 10 ? '0'+seconds : seconds;
    }
    updateTimer();
    setInterval(updateTimer, 1000);
  }

  // Calendar (December 2026)
  function generateCalendar() {
    const container = document.getElementById('decemberCalendar');
    if (!container) return;
    const year = 2026, month = 11;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month+1, 0).getDate();
    const weddingDayNum = 12;
    let html = '';
    const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    for (let i=0; i<7; i++) html += `<div style="font-size: 10px; font-weight:600;">${weekdays[i]}</div>`;
    let startOffset = firstDay;
    for (let i=0; i<startOffset; i++) html += `<div class="calendar-day"></div>`;
    for (let d=1; d<=daysInMonth; d++) {
      let isWedding = (d === weddingDayNum);
      let extraIcon = isWedding ? ' <i class="fas fa-heart" style="font-size: 8px;"></i>' : '';
      html += `<div class="calendar-day ${isWedding ? 'wedding-day' : ''}">${d}${extraIcon}</div>`;
    }
    container.innerHTML = html;
  }

  // Map links
  document.addEventListener('click', (e) => {
    if (e.target.classList && e.target.classList.contains('map-link')) {
      const mapUrl = e.target.getAttribute('data-map');
      if (mapUrl) window.open(mapUrl, '_blank');
    }
  });

  // RSVP Modal with Maybe date logic
  const modal = document.getElementById('rsvpModal');
  const openRsvpBtn = document.getElementById('openRsvpModalBtn');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const submitRsvp = document.getElementById('submitRsvpBtn');
  const rsvpFeedback = document.getElementById('rsvpFeedback');
  const attendanceSelect = document.getElementById('rsvpAttendance');
  const maybeDateContainer = document.getElementById('maybeDateContainer');
  const maybeDateInput = document.getElementById('maybeResponseDate');

function openModal() { modal.classList.add('active'); }
  function closeModal() { modal.classList.remove('active'); rsvpFeedback.innerHTML = ''; maybeDateContainer.style.display = 'none'; maybeDateInput.value = ''; }

if (openRsvpBtn) openRsvpBtn.addEventListener('click', () => {
    userInterrupted = true;
    stopAutoScroll();
    openModal();
  });
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  // Toggle date field when Maybe selected
  attendanceSelect.addEventListener('change', () => {
    if (attendanceSelect.value === 'maybe') {
      maybeDateContainer.style.display = 'block';
    } else {
      maybeDateContainer.style.display = 'none';
      maybeDateInput.value = '';
    }
  });

  // Submit RSVP
  submitRsvp.addEventListener('click', async () => {
    const fullName = document.getElementById('rsvpFullName').value.trim();
    const attendanceValue = attendanceSelect.value;
    const message = document.getElementById('rsvpMessage').value.trim();
    let maybeDate = '';

    if (attendanceValue === 'maybe') {
      maybeDate = maybeDateInput.value;
      if (!maybeDate) {
        rsvpFeedback.innerHTML = '<span style="color:#b25e5e;">Please provide an expected response date.</span>';
        return;
      }
    }

    if (!fullName) {
      rsvpFeedback.innerHTML = '<span style="color:#b25e5e;">Please enter your full name.</span>';
      return;
    }

    const attending = (attendanceValue === 'yes');
    rsvpFeedback.innerHTML = 'Sending...';

    try {
      const response = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fullName, attending, message, maybeResponseDate: maybeDate })
      });
      const data = await response.json();
      if (response.ok) {
        rsvpFeedback.innerHTML = '<span style="color:#5F6F4A;">Thank you! We can\'t wait to celebrate ✨</span>';
        document.getElementById('rsvpFullName').value = '';
        document.getElementById('rsvpMessage').value = '';
        maybeDateInput.value = '';
        attendanceSelect.value = 'yes';
        maybeDateContainer.style.display = 'none';
        setTimeout(() => closeModal(), 1600);
      } else {
        rsvpFeedback.innerHTML = `<span style="color:#b25e5e;">Error: ${data.error || 'try again'}</span>`;
      }
    } catch (err) {
      rsvpFeedback.innerHTML = '<span style="color:#b25e5e;">Network error. Please check connection.</span>';
    }
  });

  // Audio controls
  audio.volume = 0.4;
  audioToggle.addEventListener('click', () => {
    if (audio.paused) {
      audio.play().catch(e => console.log);
      audioToggle.innerHTML = '<i class="fas fa-volume-up"></i>';
    } else {
      audio.pause();
      audioToggle.innerHTML = '<i class="fas fa-volume-mute"></i>';
    }
  });
  audio.addEventListener('ended', () => { audio.currentTime = 0; audio.play().catch(e=>{}); });
})();