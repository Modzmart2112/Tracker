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
    <nav className="bg-white border-b border-gray-200 px-8 shadow-sm">
      <div className="flex items-center justify-between">
        <ul className="flex items-center space-x-1">
          {navigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <li key={item.name}>
                <Link href={item.href} className={`
                  relative flex items-center space-x-2 px-6 py-4 text-sm font-medium transition-colors duration-150
                  ${isActive 
                    ? "text-red-600 bg-red-50" 
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }
                  rounded-lg
                `}>
                  <Icon size={18} className={isActive ? "text-red-600" : "text-gray-500"} />
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-gray-600 text-sm">
            <Activity size={16} className="text-red-600" />
            <span>Live Monitoring</span>
          </div>
          <div className="h-6 w-px bg-gray-300" />
          <button className="text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-lg hover:bg-gray-50">
            <Settings size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
}