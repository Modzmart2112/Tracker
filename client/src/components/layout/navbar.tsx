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
    <nav className="bg-gray-900 border-b border-gray-800 px-8">
      <div className="flex items-center justify-between">
        <ul className="flex items-center">
          {navigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <li key={item.name}>
                <Link href={item.href} className="relative group">
                  <div className={`
                    flex items-center space-x-2 px-4 py-3 text-xs font-medium uppercase tracking-wider transition-all duration-200
                    ${isActive 
                      ? "text-white" 
                      : "text-gray-500 hover:text-gray-300"
                    }
                  `}>
                    <Icon size={16} className={`transition-colors duration-200 ${isActive ? "text-[#CB0000]" : "text-gray-600 group-hover:text-gray-400"}`} />
                    <span>{item.name}</span>
                    
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#CB0000]" />
                    )}
                    
                    {/* Hover indicator */}
                    {!isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#CB0000] scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left" />
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 px-3 py-1 bg-black/30 rounded-full border border-gray-800">
            <Activity size={14} className="text-[#CB0000] animate-pulse" />
            <span className="text-xs text-gray-400 font-medium">MONITORING ACTIVE</span>
          </div>
          <button className="text-gray-500 hover:text-[#CB0000] transition-colors p-2 rounded-lg hover:bg-black/30">
            <Settings size={16} />
          </button>
        </div>
      </div>
    </nav>
  );
}