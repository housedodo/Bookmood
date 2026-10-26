import { NavLink } from 'react-router-dom';
import '../styles/tabbar.css';

interface Tab {
  to: string;
  label: string;
  emoji: string;
  className?: string;
}

const TABS: Tab[] = [
  { to: '/', label: 'Library', emoji: '📚' },
  { to: '/pick', label: 'Pick', emoji: '💕' },
  { to: '/scan', label: 'Scan', emoji: '📷', className: 'tab-scan' },
  { to: '/settings', label: 'Settings', emoji: '⚙️', className: 'tab-settings' },
];

export default function TabBar() {
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end
          aria-label={tab.label}
          className={({ isActive }) => ['tab', tab.className, isActive && 'active'].filter(Boolean).join(' ')}
        >
          <span className="tab-emoji" aria-hidden="true">{tab.emoji}</span>
          {tab.className !== 'tab-scan' && <span>{tab.label}</span>}
        </NavLink>
      ))}
    </nav>
  );
}
