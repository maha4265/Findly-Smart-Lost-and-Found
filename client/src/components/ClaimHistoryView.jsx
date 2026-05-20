import EmptyState from "./EmptyState.jsx";
import { formatDateTime, reportTitle } from "../utils/format.js";

export default function ClaimHistoryView({ claims, user }) {
  const verifiedClaims = claims.filter(
    (claim) => claim.status === "verified" && claim.lostReport && claim.foundReport && claim.lostUser && claim.foundUser,
  );

  return (
    <section className="stack">
      <div className="section-head">
        <div>
          <h2>Claim History</h2>
          <p>Verified claims stay here so contact details are available after refresh.</p>
        </div>
      </div>

      {verifiedClaims.length ? (
        verifiedClaims.map((claim) => {
          const isLostOwner = String(claim.lostUser?._id) === String(user?._id);
          const contact = isLostOwner ? claim.foundUser : claim.lostUser;
          const contactLabel = isLostOwner ? "Finder contact" : "Lost owner contact";

          return (
            <article className="panel history-card" key={claim._id}>
              <div>
                <h3>{reportTitle(claim.lostReport)} matched with {reportTitle(claim.foundReport)}</h3>
                <div className="tags">
                  <span className="status-claimed">verified</span>
                  <span>{formatDateTime(claim.createdAt)}</span>
                </div>
              </div>
              <div className="contact-panel">
                <h4>{contactLabel}</h4>
                <p><strong>Name:</strong> {contact?.name}</p>
                <p><strong>Email:</strong> {contact?.email}</p>
                {contact?.phone && <p><strong>Phone:</strong> {contact.phone}</p>}
                {contact?.address && <p><strong>Address:</strong> {contact.address}</p>}
              </div>
            </article>
          );
        })
      ) : (
        <EmptyState text="No verified claims yet." />
      )}
    </section>
  );
}
