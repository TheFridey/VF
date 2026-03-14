'use client';

import Link from 'next/link';
import { Shield } from 'lucide-react';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-800 bg-gray-950/80 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-green-500" />
              <span className="font-bold text-white">VeteranFinder</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              A trusted space for the UK veteran community — built by veterans, for veterans.
            </p>
          </div>

          {/* Legal */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Legal &amp; Compliance</p>
            <ul className="space-y-2">
              <li><Link href="/privacy"  className="text-xs text-gray-500 hover:text-green-400 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms"    className="text-xs text-gray-500 hover:text-green-400 transition-colors">Terms of Service</Link></li>
              <li><Link href="/cookies"  className="text-xs text-gray-500 hover:text-green-400 transition-colors">Cookie Policy</Link></li>
              <li><Link href="/dpia"     className="text-xs text-gray-500 hover:text-green-400 transition-colors">Data Protection (DPIA)</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Company</p>
            <ul className="space-y-2">
              <li><Link href="/about"   className="text-xs text-gray-500 hover:text-green-400 transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="text-xs text-gray-500 hover:text-green-400 transition-colors">Contact</Link></li>
              <li><Link href="/app/premium" className="text-xs text-gray-500 hover:text-green-400 transition-colors">BIA Membership</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-600">
            © {year} VeteranFinder Ltd. All rights reserved. Registered in England &amp; Wales.
          </p>
          <p className="text-xs text-gray-600">
            Regulated under UK GDPR · ICO registered · Data processed lawfully
          </p>
        </div>
      </div>
    </footer>
  );
}
