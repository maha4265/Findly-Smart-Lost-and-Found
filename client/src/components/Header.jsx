import { ClipboardList, History, Search, Sparkles, Upload, LogOut, UserPlus } from "lucide-react";
import TabButton from "./TabButton.jsx";

const tabs = [
  { id: "report", label: "Report", icon: Upload },
  { id: "found", label: "Found List", icon: Search },
  { id: "matches", label: "AI Matches", icon: Sparkles },
  { id: "my-reports", label: "My Reports", icon: ClipboardList },
  { id: "history", label: "Claim History", icon: History },
];

export default function Header({ activeView, onViewChange, user, onLogout, onShowRegister }) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">MERN + AI matching</p>
        <h1>Findly</h1>
      </div>
      <nav className="tabs" aria-label="Primary">
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            icon={tab.icon}
            label={tab.label}
            active={activeView === tab.id}
            onClick={() => onViewChange(tab.id)}
          />
        ))}
      </nav>
      <div className="user-panel">
        {user ? (
          <>
            <span>{user.name} ({user.role})</span>
            <button className="ghost logout-button" type="button" onClick={onLogout}>
              <LogOut size={16} /> Logout
            </button>
          </>
        ) : (
          <button className="primary" type="button" onClick={onShowRegister}>
            <UserPlus size={16} /> Create account
          </button>
        )}
      </div>
    </header>
  );
}
