import { Outlet, Link, useLocation } from 'react-router-dom';
import { BookOpen, Brain, Settings, Wrench, Hash, Clock, Users, Compass } from 'lucide-react';
import QuickFlashcard from './QuickFlashcard';

export default function Layout() {
  const location = useLocation();

  const navItems = [
    { name: 'Library', path: '/', icon: BookOpen },
    { name: 'Timeline', path: '/timeline', icon: Clock },
    { name: 'People', path: '/people', icon: Users },
    { name: 'Next Steps', path: '/next-steps', icon: Compass },
    { name: 'Review', path: '/review', icon: Brain },
    { name: 'Tags', path: '/tags', icon: Hash },
    { name: 'Tools', path: '/tools', icon: Wrench },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row pb-16 md:pb-0">
      {/* PC: サイドバー */}
      <nav className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 fixed h-full shrink-0">
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-gray-900" />
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">ReadingLog</h1>
        </div>
        <div className="p-4 space-y-2 flex-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* スマホ: ボトムナビゲーション */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white/90 backdrop-blur-md border-t border-gray-200 flex justify-around px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] z-50 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 py-1 transition-colors ${
                isActive ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              <item.icon className={`h-6 w-6 transition-transform ${isActive ? 'scale-110' : ''}`} />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* メインコンテンツ */}
      <main className="flex-1 md:ml-64 pb-[calc(env(safe-area-inset-bottom)+5rem)] md:pb-0">
        <Outlet />
      </main>

      {/* 右下のクイック追加ボタン */}
      <QuickFlashcard />
    </div>
  );
}
