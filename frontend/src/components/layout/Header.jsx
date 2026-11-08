// Шапка: назва системи, поточний користувач та кнопка виходу.
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLE_LABEL } from '../../utils/constants.js';
import { shortName } from '../../utils/format.js';
import styles from './Header.module.css';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.logo} aria-hidden="true">▤</span>
        <span>Трекер Практики</span>
      </div>
      <div className={styles.user}>
        <span className={styles.userName}>
          <span className="only-desktop">{user.fullName}</span>
          <span className="only-mobile">{shortName(user.fullName)}</span>
          <span className={styles.role}> · {ROLE_LABEL[user.role]}</span>
        </span>
        <button type="button" className={styles.logout} onClick={handleLogout}>Вийти</button>
      </div>
    </header>
  );
}
