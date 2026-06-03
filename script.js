// Navbar scroll effect
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
  document.getElementById('backToTop').classList.toggle('visible', window.scrollY > 400);
});

// Mobile hamburger menu
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
hamburger.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => navLinks.classList.remove('open'));
});

// Booking tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// Fleet filter
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.filter;
    document.querySelectorAll('.car-card').forEach(card => {
      const show = filter === 'all' || card.dataset.category === filter;
      card.style.display = show ? '' : 'none';
      if (show) {
        card.style.animation = 'none';
        card.offsetHeight;
        card.style.animation = 'fadeInUp .4s ease forwards';
      }
    });
  });
});

// Back to top
document.getElementById('backToTop').addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Form submissions
document.getElementById('bookingForm').addEventListener('submit', e => {
  e.preventDefault();
  showToast('Recherche en cours... Nous vous contactons sous peu !', 'success');
});
document.getElementById('contactForm').addEventListener('submit', e => {
  e.preventDefault();
  showToast('Message envoyé avec succès ! Nous vous répondrons dans les 24h.', 'success');
  e.target.reset();
});

// Toast notification
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%) translateY(20px);
    background: ${type === 'success' ? '#2d9cdb' : '#E63946'};
    color: #fff; padding: 16px 28px; border-radius: 50px;
    font-size: 14px; font-weight: 600; font-family: Inter, sans-serif;
    box-shadow: 0 8px 32px rgba(0,0,0,.25); z-index: 9999;
    opacity: 0; transition: all .4s cubic-bezier(.4,0,.2,1);
    max-width: 90vw; text-align: center;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(10px)';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

// Scroll reveal animation
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.service-card, .car-card, .step-card, .testimonial-card').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(24px)';
  el.style.transition = 'opacity .6s ease, transform .6s ease';
  observer.observe(el);
});

// Animate stats counter
function animateCounter(el, target, suffix = '') {
  let start = 0;
  const duration = 2000;
  const step = target / (duration / 16);
  const timer = setInterval(() => {
    start += step;
    if (start >= target) {
      el.textContent = target.toLocaleString('fr-FR') + suffix;
      clearInterval(timer);
    } else {
      el.textContent = Math.floor(start).toLocaleString('fr-FR') + suffix;
    }
  }, 16);
}

const statsObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const statNums = entry.target.querySelectorAll('.stat-num');
      statNums.forEach(el => {
        const text = el.textContent;
        if (text.includes('500')) animateCounter(el, 500, '+');
        else if (text.includes('15')) animateCounter(el, 15, '+');
        else if (text.includes('10K')) { el.textContent = '0+'; animateCounter(el, 10, 'K+'); }
      });
      statsObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

const heroStats = document.querySelector('.hero-stats');
if (heroStats) statsObserver.observe(heroStats);
