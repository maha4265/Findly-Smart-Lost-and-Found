import EmptyState from "./EmptyState.jsx";
import { assetUrl } from "../utils/api.js";
import { formatDateTime, reportTitle } from "../utils/format.js";

export default function MyReportsView({ reports }) {
  const sortedReports = [...reports].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <section className="stack">
      <div className="section-head">
        <div>
          <h2>My Reports</h2>
          <p>Your submitted lost and found reports with their current status.</p>
        </div>
      </div>

      {sortedReports.length ? (
        sortedReports.map((report) => (
          <article className="report-card found-report-card" key={report._id}>
            <img src={assetUrl(report.imageUrl)} alt={report.category} />
            <div>
              <div className="card-title-row">
                <h3>{reportTitle(report)}</h3>
                <span className={`status ${report.status === "claimed" ? "status-claimed" : ""}`}>{report.status}</span>
              </div>
              <p>{report.details || report.aiDescription || "No extra details provided."}</p>
              <div className="tags">
                <span className={report.type}>{report.type}</span>
                <span>{formatDateTime(report.occurredAt)}</span>
              </div>
              {report.type === "found" && report.verificationQuestion && (
                <div className="claim-box">
                  <p><strong>Verification question:</strong> {report.verificationQuestion}</p>
                </div>
              )}
            </div>
          </article>
        ))
      ) : (
        <EmptyState text="You have not submitted any reports yet." />
      )}
    </section>
  );
}
