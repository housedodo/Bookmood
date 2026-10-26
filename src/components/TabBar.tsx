import { NavLink } from 'react-router-dom';
import Icon, { type IconName } from './Icon';
import '../styles/tabbar.css';

interface Tab {
  to: string;
  label: string;
  icon: IconName;
  className?: string;
}

const TABS: Tab[] = [
  { to: '/', label: 'Library', icon: 'library' },
  { to: '/pick', label: 'Pick', icon: 'heart' },
  { to: '/scan', label: 'Scan', icon: 'scan', className: 'tab-scan' },
  { to: '/settings', label: 'Settings', icon: 'settings', className: 'tab-settings' },
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
          <Icon name={tab.icon} className="tab-icon" />
          {tab.className !== 'tab-scan' && <span>{tab.label}</span>}
        </NavLink>
      ))}
    </nav>
  );
}
