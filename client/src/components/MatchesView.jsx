import { useState } from "react";
import EmptyState from "./EmptyState.jsx";
import { FoundReportCard } from "./BrowseReportsView.jsx";
import { reportTitle } from "../utils/format.js";

export default function MatchesView({ matches, lostReports, onClaimReport, claimContacts }) {
  const [answers, setAnswers] = useState({});
  const [selectedLostReport, setSelectedLostReport] = useState("");
  const [claimingId, setClaimingId] = useState("");

  const visibleMatches = selectedLostReport
    ? matches.filter((match) => String(match.lostItem._id) === String(selectedLostReport))
    : matches;

  const submitClaim = async (match) => {
    const verificationAnswer = answers[match.id] || "";

    if (!verificationAnswer.trim()) {
      alert("Select an answer to verify ownership.");
      return;
    }

    setClaimingId(match.id);
    try {
      await onClaimReport(match.foundItem._id, match.lostItem._id, verificationAnswer);
      setAnswers((current) => ({ ...current, [match.id]: "" }));
    } finally {
      setClaimingId("");
    }
  };

  return (
    <section className="stack">
      <div className="section-head">
        <div>
          <h2>AI Matched Found Reports</h2>
          <p>These found reports are ranked against your open lost reports.</p>
        </div>
        <select value={selectedLostReport} onChange={(event) => setSelectedLostReport(event.target.value)} disabled={!lostReports.length}>
          <option value="">All open lost reports</option>
          {lostReports.map((report) => (
            <option key={report._id} value={report._id}>
              {reportTitle(report)}
            </option>
          ))}
        </select>
      </div>

      {visibleMatches.length ? (
        visibleMatches.map((match) => (
          <div key={match.id} className="match-result">
            <div className="match-context">
              <strong>{reportTitle(match.lostItem)}</strong>
              <span>Image {match.breakdown.image}%</span>
              <span>Category {match.breakdown.category}%</span>
              <span>Location {match.breakdown.location}%</span>
              <span>Time {match.breakdown.time}%</span>
            </div>
            <FoundReportCard
              report={match.foundItem}
              answer={answers[match.id] || ""}
              contact={claimContacts[match.foundItem._id]}
              disabled={claimingId === match.id}
              matchScore={match.score}
              onAnswerChange={(value) => setAnswers((current) => ({ ...current, [match.id]: value }))}
              onSubmit={() => submitClaim(match)}
            />
          </div>
        ))
      ) : (
        <EmptyState text="No AI matches for your open lost reports yet." />
      )}
    </section>
  );
}
