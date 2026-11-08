// Навігація: на десктопі — бічне меню, на мобільному — нижня панель (перемикається через CSS).
// NavLink автоматично додає клас активному пункту меню.
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import styles from './Nav.module.css';

const ITEMS = [
  { to: '/materials', label: 'Документи', icon: '▤' },
  { to: '/', label: 'Головна', icon: '⌂', end: true },
  { to: '/assignments', label: 'Направлення', icon: '☰' },
  { to: '/enterprises', label: 'Бази практики', icon: '⚑' },
];

export default function Nav() {
  const { user } = useAuth();
  const items = ITEMS.filter((i) => !i.roles || i.roles.includes(user.role));

  return (
    <nav className={styles.nav} aria-label="Головне меню">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          <span className={styles.icon} aria-hidden="true">{item.icon}</span>
          <span className={styles.label}>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
