import { Link, useLocation } from "wouter";
import { 
  ChartLine, 
  Folder, 
  Box, 
  Users, 
  Globe, 
  History, 
  Settings,
  User
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: ChartLine },
  { name: "Categories", href: "/categories", icon: Folder },
  { name: "Products", href: "/products", icon: Box },
  { name: "Competitors", href: "/competitors", icon: Users },
  { name: "Pages & Scraping", href: "/pages", icon: Globe },
  { name: "Recent Changes", href: "/changes", icon: History },
  { name: "Admin", href: "/admin", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <ChartLine className="text-white text-sm" size={16} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">CompetitorScope</h1>
            <p className="text-xs text-slate-500">Competitive Intelligence</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <li key={item.name}>
                <Link href={item.href} className={`flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors ${
                  isActive 
                    ? "bg-primary/10 text-primary-700" 
                    : "text-slate-600 hover:bg-slate-100"
                }`}>
                  <Icon size={16} />
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center">
            <User className="text-slate-600 text-sm" size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900">John Smith</p>
            <p className="text-xs text-slate-500">Administrator</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
