"use client"

import { Calendar, Home, Inbox, Search, Settings, Users, Heart, HelpCircle } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"

// Menu items.
const items = [

  {
    title: "inbox",
    url: "/inbox",
    icon: Inbox,
  }
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <div className="w-20 bg-[#330019] border-r border-[gray-200] flex flex-col items-center py-6 space-y-8">
      {/* Logo */}
      <div className="w-8 h-8 relative">
        <Image
          src="/whitelogo.svg"
          alt="Logo"
          width={32}
          height={32}
          className="object-contain"
        />
      </div>

      {/* Navigation Items */}
      <nav className="flex flex-col items-center space-y-6">
        {items.map((item) => {
          const isActive = pathname === item.url || (item.url === "/orders" && pathname.startsWith("/orders"))
          return (
            <Link
              key={item.title}
              href={item.url}
              className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors group ${
                isActive 
                  ? 'text-white' 
                  : 'text-zinc-400 hover:text-gray-600'
              }`}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-xs font-medium">{item.title}</span>
              {isActive && (
                <div className="w-1 h-1 bg-white rounded-full mt-1"></div>
              )}
            </Link>
          )
        })}
      </nav>

    </div>
  )
}