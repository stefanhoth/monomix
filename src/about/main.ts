const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

// Reveal-on-view (Hallmark motion.md): one-shot fade + rise, IntersectionObserver only.
const revealTargets = document.querySelectorAll<HTMLElement>(".reveal");
if (prefersReducedMotion || !("IntersectionObserver" in window)) {
  revealTargets.forEach((el) => el.classList.add("is-visible"));
} else {
  const observer = new IntersectionObserver(
    (entries, obs) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.15 },
  );
  revealTargets.forEach((el) => observer.observe(el));
}

// Hum signature move #7: a single star-burst micro-celebration, fired once
// per click, only from the primary (pear) CTA — never auto-looping.
if (!prefersReducedMotion) {
  document
    .querySelectorAll<HTMLElement>(".btn:not(.btn--outline)")
    .forEach((btn) => {
      btn.addEventListener("click", (event) => {
        const star = document.createElement("span");
        star.className = "star-burst";
        star.style.left = `${event.clientX - 12}px`;
        star.style.top = `${event.clientY - 12}px`;
        document.body.appendChild(star);
        star.addEventListener("animationend", () => star.remove());
      });
    });
}
