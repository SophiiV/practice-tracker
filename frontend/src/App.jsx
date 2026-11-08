// Кореневий компонент: налаштування маршрутизації (react-router) та контексту автентифікації.
// Усі сторінки, крім /login, доступні лише авторизованому користувачу (ProtectedRoute).
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Layout from './components/layout/Layout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import AssignmentsPage from './pages/AssignmentsPage.jsx';
import AssignmentDetailsPage from './pages/AssignmentDetailsPage.jsx';
import MaterialsPage from './pages/MaterialsPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import EnterprisesPage from './pages/EnterprisesPage.jsx';

// Обгортка для захищених маршрутів: якщо користувач не увійшов — перенаправляємо на /login;
// якщо вказано roles і роль користувача не входить до списку — на головну.
function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Вкладені маршрути рендеряться всередині <Layout /> через <Outlet /> */}
            <Route index element={<DashboardPage />} />
            <Route path="assignments" element={<AssignmentsPage />} />
            <Route path="assignments/:id" element={<AssignmentDetailsPage />} />
            <Route path="materials" element={<MaterialsPage />} />
            <Route path="enterprises" element={<EnterprisesPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
