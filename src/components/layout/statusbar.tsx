'use client';

export function Statusbar() {
  return (
    <footer className="statusbar">
      <div className="statusbar__left">
        <span className="statusbar__model">No model</span>
      </div>
      <div className="statusbar__right">
        <span className="statusbar__cost">$0.00</span>
        <span className="statusbar__separator">&middot;</span>
        <span className="statusbar__research">Idle</span>
      </div>
    </footer>
  );
}
