import Link from 'next/link';
import { Home, Calendar, BarChart2, Settings } from 'lucide-react';
import { usePathname } from 'next/navigation';

export function MobileNav() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 pb-safe z-50">
            <div className="flex justify-around items-center h-16">
                <Link
                    href="/"
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}
                >
                    <div className={`p-1 rounded-full ${isActive('/') ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}>
                        <Home className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-medium">Tasks</span>
                </Link>

                <Link
                    href="/calendar" // Note: We might need to handle this route if it doesn't exist, or just link to home with view param
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/calendar') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}
                    onClick={(e) => {
                        // Optional: Intercept to just switch view mode if on home page
                        // For now, let's assume we might want a dedicated route or just use query params
                    }}
                >
                    <div className={`p-1 rounded-full ${isActive('/calendar') ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}>
                        <Calendar className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-medium">Calendar</span>
                </Link>

                <Link
                    href="/analytics"
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/analytics') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}
                >
                    <div className={`p-1 rounded-full ${isActive('/analytics') ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}>
                        <BarChart2 className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-medium">Analytics</span>
                </Link>

                <Link
                    href="/settings"
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/settings') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}
                >
                    <div className={`p-1 rounded-full ${isActive('/settings') ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}>
                        <Settings className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-medium">Settings</span>
                </Link>
            </div>
        </nav>
    );
}
