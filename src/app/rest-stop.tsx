"use client";

/**
 * The Rest Stop (design 5): home opens here after 3 or more days without a learned day.
 * One tap starts a 3-minute session. The words never blame the learner for the break.
 */
export function RestStop({ onStart, onShowChoices }: { onStart: () => void; onShowChoices: () => void }) {
  return (
    <section className="commit" aria-labelledby="rest-stop-title">
      <h2 id="rest-stop-title">Rest Stop</h2>
      <p>Welcome back. Three minutes is a good way to start again.</p>
      <p className="lead">New week starts Monday.</p>
      <button type="button" className="button-main" onClick={onStart}>
        Start 3 minutes
      </button>
      <button type="button" className="button-quiet" onClick={onShowChoices}>
        Show all choices
      </button>
    </section>
  );
}
