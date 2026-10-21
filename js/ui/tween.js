// ==========================================================
// TWEEN
// A tiny animation system: smoothly move values from A to B.
//
// Usage:
//   const job = tween({ duration: 0.8, onUpdate: (k) => { ... } });
//   job.cancel(); // stop early
//
// k goes from 0 to 1 (already eased), so you blend with:
//   value = from + (to - from) * k
// ==========================================================

export const easeInOutCubic = (x) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

const activeJobs = new Set();

export function tween({ duration = 0.8, ease = easeInOutCubic, onUpdate, onComplete }) {
  const job = { elapsed: 0, duration, ease, onUpdate, onComplete };
  activeJobs.add(job);

  return {
    cancel: () => activeJobs.delete(job),
  };
}

// Call once per frame from the main loop
export function updateTweens(delta) {
  for (const job of activeJobs) {
    job.elapsed += delta;
    const progress = Math.min(job.elapsed / job.duration, 1);

    job.onUpdate(job.ease(progress));

    if (progress >= 1) {
      activeJobs.delete(job);
      if (job.onComplete) job.onComplete();
    }
  }
}