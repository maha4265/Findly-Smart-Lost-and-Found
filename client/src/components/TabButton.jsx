export default function TabButton({ icon: Icon, label, active, onClick }) {
  return (
    <button className={`tab ${active ? "active" : ""}`} onClick={onClick}>
      <Icon size={17} />
      <span>{label}</span>
    </button>
  );
}
