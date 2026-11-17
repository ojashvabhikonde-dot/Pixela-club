// frontend/src/components/navigation/Navbar.jsx
import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen(!open);

  return (
    <nav className="bg-bgMid text-primary fixed w-full z-50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0">
            <Link href="/">
              <a className="text-2xl font-bold" aria-label="Pixela Logo">Pixela</a>
            </Link>
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <Link href="/"><a className="hover:text-accent">Home</a></Link>
              <Link href="/about"><a className="hover:text-accent">About</a></Link>
              <Link href="/gallery"><a className="hover:text-accent">Gallery</a></Link>
              <Link href="/exhibitions"><a className="hover:text-accent">Exhibitions</a></Link>
              <Link href="/crew"><a className="hover:text-accent">Crew</a></Link>
              <Link href="/events"><a className="hover:text-accent">Events</a></Link>
              <Link href="/auth/login"><a className="hover:text-accent">Login / Join</a></Link>
            </div>
          </div>
          <div className="-mr-2 flex md:hidden">
            <button onClick={toggle} className="inline-flex items-center justify-center p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent" aria-label="Main menu" aria-expanded={open}>
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-bgMid">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link href="/"><a className="block px-3 py-2 rounded-md hover:bg-bgDark">Home</a></Link>
            <Link href="/about"><a className="block px-3 py-2 rounded-md hover:bg-bgDark">About</a></Link>
            <Link href="/gallery"><a className="block px-3 py-2 rounded-md hover:bg-bgDark">Gallery</a></Link>
            <Link href="/exhibitions"><a className="block px-3 py-2 rounded-md hover:bg-bgDark">Exhibitions</a></Link>
            <Link href="/crew"><a className="block px-3 py-2 rounded-md hover:bg-bgDark">Crew</a></Link>
            <Link href="/events"><a className="block px-3 py-2 rounded-md hover:bg-bgDark">Events</a></Link>
            <Link href="/auth/login"><a className="block px-3 py-2 rounded-md hover:bg-bgDark">Login / Join</a></Link>
          </div>
        </div>
      )}
    </nav>
  );
}
