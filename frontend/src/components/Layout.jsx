import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, LogOut, Phone } from 'lucide-react';

export default function Layout({ user, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-indigo-500/20 text-indigo-400'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
    }`;

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-[#1e293b] border-r border-slate-700 flex flex-col p-4">
        <div className="flex items-center gap-2 mb-8 px-2">
          <Phone className="w-6 h-6 text-indigo-400" />
          <span className="text-lg font-bold text-white">Calling Coach</span>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          <NavLink to="/" end className={linkClass}>
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </NavLink>
          <NavLink to="/new-session" className={linkClass}>
            <PlusCircle className="w-4 h-4" />
            New Session
          </NavLink>
        </nav>

        <div className="border-t border-slate-700 pt-4 mt-4">
          <div className="text-sm text-slate-400 px-2 mb-2">{user?.name}</div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-red-400 transition-colors w-full rounded-lg hover:bg-slate-800"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
