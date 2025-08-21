import { Link, useLocation } from "wouter";
import { 
  ChartLine, 
  Folder, 
  Box, 
  Users, 
  Globe, 
  History, 
  Settings,
  Activity,
  Package,
  FolderCog
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: ChartLine },
  { name: "Products", href: "/products", icon: Box },
  { name: "Competitors", href: "/competitors", icon: Users },
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
                    flex items-center space-x-2 px-4 py-4 text-xs font-medium uppercase tracking-wider transition-all duration-200
                    ${isActive 
                      ? "text-white bg-gradient-to-r from-[#CB0000]/20 to-transparent" 
                      : "text-gray-500 hover:text-gray-300"
                    }
                  `}>
                    <Icon size={18} className={`transition-all duration-200 ${isActive ? "text-[#FF0000] drop-shadow-[0_0_8px_rgba(255,0,0,0.6)]" : "text-gray-600 group-hover:text-gray-400"}`} />
                    <span className={isActive ? "drop-shadow-[0_0_4px_rgba(255,255,255,0.3)]" : ""}>{item.name}</span>
                    
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF0000] to-[#CB0000] shadow-[0_0_10px_rgba(255,0,0,0.5)]" />
                    )}
                    
                    {/* Hover indicator */}
                    {!isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#FF0000] to-[#CB0000] scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left" />
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-[#CB0000]/30 to-[#CB0000]/10 rounded-full border border-[#CB0000]/50 shadow-[0_0_15px_rgba(203,0,0,0.3)]">
            <Activity size={16} className="text-[#FF0000] animate-pulse drop-shadow-[0_0_8px_rgba(255,0,0,0.8)]" />
            <span className="text-xs text-gray-200 font-medium">MONITORING ACTIVE</span>
          </div>
          <button className="text-gray-400 hover:text-[#FF0000] hover:drop-shadow-[0_0_8px_rgba(255,0,0,0.6)] transition-all duration-200 p-2 rounded-lg hover:bg-[#CB0000]/10 hover:border hover:border-[#CB0000]/30">
            <Settings size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
}