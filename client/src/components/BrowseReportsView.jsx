import { useMemo, useState } from "react";
import { Calendar, MapPin, Search } from "lucide-react";
import EmptyState from "./EmptyState.jsx";
import { assetUrl } from "../utils/api.js";
import { formatDateTime, reportTitle } from "../utils/format.js";

export default function BrowseReportsView({ foundReports, lostReports, onClaimReport, claimContacts }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLostReport, setSelectedLostReport] = useState("");
  const [answers, setAnswers] = useState({});
  const [claimingId, setClaimingId] = useState("");

  const categories = useMemo(() => [...new Set(foundReports.map((report) => report.category))], [foundReports]);

  const filteredReports = foundReports
    .filter((report) => {
      if (selectedCategory !== "all" && report.category !== selectedCategory) return false;
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return [report.category, report.location, report.details, report.aiDescription]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const submitClaim = async (report) => {
    const lostReportId = selectedLostReport || lostReports[0]?._id;
    const verificationAnswer = answers[report._id] || "";

    if (!lostReportId) {
      alert("Create a lost report first, then claim a found item.");
      return;
    }
    if (!verificationAnswer.trim()) {
      alert("Select an answer to verify ownership.");
      return;
    }

    setClaimingId(report._id);
    try {
      await onClaimReport(report._id, lostReportId, verificationAnswer);
      setAnswers((current) => ({ ...current, [report._id]: "" }));
    } finally {
      setClaimingId("");
    }
  };

  return (
    <section className="stack">
      <div className="section-head">
        <div>
          <h2>Unclaimed Found Reports</h2>
          <p>Browse items reported as found. Contact details are shown only after the correct answer.</p>
        </div>
        <select value={selectedLostReport} onChange={(event) => setSelectedLostReport(event.target.value)} disabled={!lostReports.length}>
          <option value="">{lostReports.length ? "Use latest lost report" : "No open lost report"}</option>
          {lostReports.map((report) => (
            <option key={report._id} value={report._id}>
              {reportTitle(report)}
            </option>
          ))}
        </select>
      </div>

      <div className="panel filters-panel">
        <div className="search-field">
          <Search size={18} />
          <input
            type="search"
            placeholder="Search found reports by category, place, or details"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
        <div className="filter-tabs">
          <button className={selectedCategory === "all" ? "primary" : "ghost"} type="button" onClick={() => setSelectedCategory("all")}>
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              className={selectedCategory === category ? "primary" : "ghost"}
              type="button"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {filteredReports.length ? (
        filteredReports.map((report) => (
          <FoundReportCard
            key={report._id}
            report={report}
            answer={answers[report._id] || ""}
            contact={claimContacts[report._id]}
            disabled={!lostReports.length || claimingId === report._id}
            onAnswerChange={(value) => setAnswers((current) => ({ ...current, [report._id]: value }))}
            onSubmit={() => submitClaim(report)}
          />
        ))
      ) : (
        <EmptyState text="No unclaimed found reports match your search." />
      )}
    </section>
  );
}

export function FoundReportCard({ report, answer, contact, disabled, onAnswerChange, onSubmit, matchScore }) {
  return (
    <article className="report-card found-report-card">
      <img src={assetUrl(report.imageUrl)} alt={report.category} />
      <div>
        <div className="card-title-row">
          <h3>{reportTitle(report)}</h3>
          {matchScore ? <span className="status">{matchScore}% AI match</span> : null}
        </div>
        <p>{report.aiDescription || report.details || "No extra details provided."}</p>
        <div className="tags">
          <span className="found">found</span>
          <span>{report.status}</span>
          <span><MapPin size={14} /> {report.location}</span>
          <span><Calendar size={14} /> {formatDateTime(report.occurredAt)}</span>
        </div>

        {contact ? (
          <div className="contact-panel">
            <h4>Owner verified. Finder contact</h4>
            <p><strong>Name:</strong> {contact.name}</p>
            <p><strong>Email:</strong> {contact.email}</p>
            {contact.phone && <p><strong>Phone:</strong> {contact.phone}</p>}
            {contact.address && <p><strong>Address:</strong> {contact.address}</p>}
          </div>
        ) : (
          <div className="claim-box">
            <p><strong>Verification question:</strong> {report.verificationQuestion || "Ask the finder to add a verification question."}</p>
            {report.verificationOptions?.length ? (
              <div className="answer-options">
                {report.verificationOptions.map((option) => (
                  <button
                    key={option}
                    className={answer === option ? "primary" : "ghost"}
                    type="button"
                    onClick={() => onAnswerChange(option)}
                    disabled={disabled}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <input
                value={answer}
                onChange={(event) => onAnswerChange(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && onSubmit()}
                placeholder="Enter the answer"
                disabled={disabled}
              />
            )}
            <button className="ghost verify-button" type="button" onClick={onSubmit} disabled={disabled}>
              Verify ownership
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
