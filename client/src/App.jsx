import { useCallback, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { Bell } from "lucide-react";
import Header from "./components/Header.jsx";
import Hero from "./components/Hero.jsx";
import Login from "./components/Login.jsx";
import ReportForm from "./components/ReportForm.jsx";
import MatchesView from "./components/MatchesView.jsx";
import BrowseReportsView from "./components/BrowseReportsView.jsx";
import MyReportsView from "./components/MyReportsView.jsx";
import ClaimHistoryView from "./components/ClaimHistoryView.jsx";
import { api, API_URL } from "./utils/api.js";

export default function App() {
  const [view, setView] = useState("report");
  const [reports, setReports] = useState([]);
  const [matches, setMatches] = useState([]);
  const [claims, setClaims] = useState([]);
  const [claimContacts, setClaimContacts] = useState({});
  const [verifiedContact, setVerifiedContact] = useState(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(!!token);

  const refresh = useCallback(async () => {
    const [reportData, matchData, claimData] = await Promise.all([
      api("/reports"),
      api("/reports/matches"),
      api("/claims"),
    ]);
    setReports(reportData);
    setMatches(matchData);
    setClaims(claimData);
  }, []);

  useEffect(() => {
    if (!token) {
      setAuthLoading(false);
      return;
    }

    const loadUser = async () => {
      setAuthLoading(true);
      try {
        const userData = await api("/auth/me");
        setUser(userData);
      } catch (_error) {
        setToken("");
        localStorage.removeItem("token");
      } finally {
        setAuthLoading(false);
      }
    };

    loadUser();
  }, [token]);

  useEffect(() => {
    if (!user) return;
    refresh().catch(() => setNotice("Start the server to sync reports and matches."));
  }, [refresh, user]);

  useEffect(() => {
    if (!token) return undefined;

    const socket = io(API_URL.replace("/api", ""), {
      auth: { token },
    });

    socket.on("match_found", (payload) => {
      if (payload?.notifications?.length) {
        setNotice(payload.notifications[0]);
      } else if (payload?.message) {
        setNotice(payload.message);
      }
      refresh().catch(() => {});
    });

    socket.on("claim_verified", (payload) => {
      setReports((currentReports) =>
        currentReports.map((report) =>
          String(report._id) === String(payload.lostReportId) || String(report._id) === String(payload.foundReportId)
            ? { ...report, status: "claimed" }
            : report,
        ),
      );
      refresh().catch(() => {});
    });

    socket.on("connect_error", () => {
      setNotice("Live updates are unavailable at the moment.");
    });

    return () => {
      socket.disconnect();
    };
  }, [refresh, token]);

  const [registerMode, setRegisterMode] = useState(false);

  const handleShowRegister = () => {
    setRegisterMode(true);
  };

  const handleLogin = (newToken) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setRegisterMode(false);
    setNotice("");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken("");
    setUser(null);
    setReports([]);
    setMatches([]);
    setClaims([]);
    setClaimContacts({});
    setVerifiedContact(null);
  };

  const submitReport = async (event) => {
    event.preventDefault();
    setLoading(true);
    setNotice("");

    try {
      const form = new FormData(event.currentTarget);
      const reportType = form.get("type");
      const result = await api("/reports", { method: "POST", body: form });
      event.currentTarget.reset();
      setNotice(result.notifications?.length ? result.notifications[0] : "Report submitted successfully.");
      await refresh();
      setView(reportType === "lost" ? "found" : "report");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimFoundReport = async (foundReportId, lostReportId, verificationAnswer) => {
    try {
      if (!lostReportId) {
        setNotice("You need to create a lost report first to claim a found item.");
        return;
      }
      const result = await api(`/reports/${foundReportId}/claims`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lostReportId, foundReportId, verificationAnswer }),
      });
      setNotice(result.message);
      if (result.foundUserContact) {
        const foundReport = reports.find((report) => String(report._id) === String(foundReportId));
        setReports((currentReports) =>
          currentReports.map((report) =>
            String(report._id) === String(lostReportId) || String(report._id) === String(foundReportId)
              ? { ...report, status: "claimed" }
              : report,
          ),
        );
        setClaimContacts((current) => ({ ...current, [foundReportId]: result.foundUserContact }));
        setVerifiedContact({
          reportTitle: foundReport ? `${foundReport.category} at ${foundReport.location}` : "found report",
          contact: result.foundUserContact,
        });
      }
      await refresh();
    } catch (error) {
      setNotice(error.message);
    }
  };

  const openLostReports = useMemo(
    () => reports.filter((report) => report.type === "lost" && report.status === "open" && String(report.user?._id) === String(user?._id)),
    [reports, user],
  );

  const openFoundReports = useMemo(
    () => reports.filter((report) => report.type === "found" && report.status === "open" && String(report.user?._id) !== String(user?._id)),
    [reports, user],
  );

  const myReports = useMemo(
    () => reports.filter((report) => String(report.user?._id) === String(user?._id)),
    [reports, user],
  );

  if (!token) {
    return <Login onLogin={handleLogin} initialMode={registerMode ? "register" : "login"} />;
  }

  if (authLoading) {
    return <div className="loading">Checking authentication...</div>;
  }

  return (
    <>
      <Header activeView={view} onViewChange={setView} user={user} onLogout={handleLogout} onShowRegister={handleShowRegister} />
      <main>
        <Hero matchCount={matches.length} />

        {notice && (
          <div className="notice">
            <Bell size={18} />
            <span>{notice}</span>
          </div>
        )}

        {verifiedContact && (
          <section className="panel verified-contact">
            <h2>Finder Contact Shared</h2>
            <p>Verified claim for {verifiedContact.reportTitle}.</p>
            <div className="contact-grid">
              <span><strong>Name:</strong> {verifiedContact.contact.name}</span>
              <span><strong>Email:</strong> {verifiedContact.contact.email}</span>
              {verifiedContact.contact.phone && <span><strong>Phone:</strong> {verifiedContact.contact.phone}</span>}
              {verifiedContact.contact.address && <span><strong>Address:</strong> {verifiedContact.contact.address}</span>}
            </div>
          </section>
        )}

        {view === "report" && <ReportForm loading={loading} onSubmit={submitReport} />}
        {view === "found" && (
          <BrowseReportsView
            foundReports={openFoundReports}
            lostReports={openLostReports}
            onClaimReport={handleClaimFoundReport}
            claimContacts={claimContacts}
          />
        )}
        {view === "matches" && (
          <MatchesView
            matches={matches}
            lostReports={openLostReports}
            onClaimReport={handleClaimFoundReport}
            claimContacts={claimContacts}
          />
        )}
        {view === "my-reports" && <MyReportsView reports={myReports} />}
        {view === "history" && <ClaimHistoryView claims={claims} user={user} />}
      </main>
    </>
  );
}
