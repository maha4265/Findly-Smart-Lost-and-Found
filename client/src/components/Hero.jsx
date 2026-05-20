export default function Hero({ matchCount }) {
  return (
    <section className="hero">
      <div>
        <p className="eyebrow">Context-aware recovery</p>
        <h2>Report an item, search unclaimed found reports, and verify ownership when AI finds a match.</h2>
      </div>
      <div className="metric">
        <strong>{matchCount}</strong>
        <span>AI matches for your lost reports</span>
      </div>
    </section>
  );
}
