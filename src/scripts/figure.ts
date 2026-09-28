// Real captures (the ```figure and ```example-gallery blocks): a muted loop
// plays only while it is on screen, after the page has loaded, and never with
// reduced motion or Save-Data (the poster stays). "Play with sound" swaps in
// the recording with its captions, in place.
const still = matchMedia("(prefers-reduced-motion: reduce)").matches || (navigator as any).connection?.saveData;

const start = () => {
  if (!still && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const v = e.target as HTMLVideoElement;
        if (e.isIntersecting) { v.preload = "auto"; v.play().then(() => v.classList.add("on"), () => {}); } else v.pause();
      }
    }, { threshold: 0.35 });
    document.querySelectorAll<HTMLVideoElement>("video[data-loop]").forEach((v) => io.observe(v));
  }
  document.querySelectorAll<HTMLAnchorElement>("a[data-sound]").forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault();
    const box = a.parentElement!;
    box.querySelector("video[data-loop]")?.remove();
    const v = document.createElement("video");
    Object.assign(v, { controls: true, autoplay: true, playsInline: true, src: a.dataset.sound!, className: "fig-clip" });
    v.poster = box.querySelector("img")?.currentSrc ?? "";
    const t = document.createElement("track");
    Object.assign(t, { kind: "captions", srclang: "en", label: "English", src: a.dataset.vtt!, default: true });
    v.append(t);
    a.replaceWith(v);
    v.focus();
  }));
};
if (document.readyState === "complete") start(); else addEventListener("load", start, { once: true });
