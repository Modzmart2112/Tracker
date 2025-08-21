import { Link, useLocation } from "wouter";
import { 
  ChartLine, 
  Folder, 
  Box, 
  Users, 
  Globe, 
  History, 
  Settings,
  Activity
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: ChartLine },
  { name: "Categories", href: "/categories", icon: Folder },
  { name: "Products", href: "/products", icon: Box },
  { name: "Competitors", href: "/competitors", icon: Users },
  { name: "Pages", href: "/pages", icon: Globe },
  { name: "Changes", href: "/changes", icon: History },
  { name: "Admin", href: "/admin", icon: Settings },
];

export function Navbar() {
  const [location] = useLocation();

  return (
    <nav className="bg-gradient-to-r from-black via-gray-900 to-black border-b border-gray-800 px-8 shadow-xl">
      <div className="flex items-center justify-between">
        <ul className="flex items-center space-x-1">
          {navigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <li key={item.name}>
                <Link href={item.href} className={`
                  relative flex items-center space-x-2 px-6 py-4 text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? "text-[#CB0000]" 
                    : "text-gray-400 hover:text-white"
                  }
                  group
                `}>
                  <Icon size={18} className={isActive ? "text-[#CB0000]" : "text-gray-500 group-hover:text-white"} />
                  <span>{item.name}</span>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#CB0000] to-transparent" />
                  )}
                  {!isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-30 transition-opacity" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-gray-400 text-sm">
            <Activity size={16} className="text-[#CB0000] animate-pulse" />
            <span>Live Monitoring</span>
          </div>
          <div className="h-6 w-px bg-gray-800" />
          <button className="text-gray-400 hover:text-white transition-colors">
            <Settings size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
}