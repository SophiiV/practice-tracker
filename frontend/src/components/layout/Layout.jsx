// Каркас сторінки: шапка, навігація, основна область (<Outlet /> для вкладених маршрутів), підвал.
import { Outlet } from 'react-router-dom';
import Header from './Header.jsx';
import Nav from './Nav.jsx';
import Footer from './Footer.jsx';
import styles from './Layout.module.css';

export default function Layout() {
  return (
    <div className={styles.shell}>
      <Header />
      <div className={styles.body}>
        <Nav />
        <main className={styles.main}>
          <Outlet />
          <Footer />
        </main>
      </div>
    </div>
  );
}
