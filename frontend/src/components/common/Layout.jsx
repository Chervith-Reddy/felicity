import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FiHome, FiCalendar, FiUsers, FiUser, FiLogOut,
  FiPlusCircle, FiSettings, FiBarChart2, FiShield,
  FiActivity, FiKey
} from 'react-icons/fi';

const participantNav = [
  { path: '/dashboard', icon: FiHome, label: 'Dashboard' },
  { path: '/events', icon: FiCalendar, label: 'Browse Events' },
  { path: '/clubs', icon: FiUsers, label: 'Clubs' },
  { path: '/profile', icon: FiUser, label: 'Profile' },
];

const organizerNav = [
  { path: '/organizer', icon: FiBarChart2, label: 'Dashboard' },
  { path: '/organizer/ongoing', icon: FiActivity, label: 'Ongoing Events' },
  { path: '/organizer/events/create', icon: FiPlusCircle, label: 'Create Event' },
  { path: '/organizer/profile', icon: FiSettings, label: 'Profile' },
];

const adminNav = [
  { path: '/admin', icon: FiShield, label: 'Dashboard' },
  { path: '/admin/organizers', icon: FiUsers, label: 'Organizers' },
  { path: '/admin/users', icon: FiUser, label: 'Users' },
  { path: '/admin/password-resets', icon: FiKey, label: 'Password Resets' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks = user?.role === 'admin' ? adminNav :
    user?.role === 'organizer' ? organizerNav : participantNav;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const displayName = user?.role === 'organizer' ? user.name : `${user?.firstName} ${user?.lastName}`;

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-64 gradient-bg flex flex-col shadow-xl">
        <div className="p-6 border-b border-white/20">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-primary-600 font-bold text-sm">F</span>
            </div>
            <span className="text-white font-bold text-xl">Felicity</span>
          </Link>
          <div className="mt-3">
            <p className="text-white font-medium text-sm truncate">{displayName}</p>
            <span className="text-white/70 text-xs capitalize">{user?.role}</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navLinks.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <Link key={path} to={path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/20">
          <button onClick={handleLogout}
            className="flex items-center space-x-3 px-4 py-3 rounded-lg text-white/80 hover:bg-white/10 hover:text-white w-full text-sm font-medium transition-colors"
          >
            <FiLogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
