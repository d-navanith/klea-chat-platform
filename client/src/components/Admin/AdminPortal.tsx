import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { AdminLogin } from './AdminLogin';
import { AdminDashboard } from './AdminDashboard';

export const AdminPortal: React.FC = () => {
  const { adminToken, adminUser, setAdminUser, adminLogout } = useStore();
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    if (!adminToken) {
      setVerifying(false);
      return;
    }

    // Verify admin token on backend to prevent forged local storage
    fetch('/api/admin/auth/me', {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Invalid token');
        return res.json();
      })
      .then((data) => {
        if (data.adminUser && data.adminUser.role === 'ADMIN') {
          setAdminUser(data.adminUser);
        } else {
          adminLogout();
        }
      })
      .catch(() => {
        adminLogout();
      })
      .finally(() => {
        setVerifying(false);
      });
  }, [adminToken]);

  if (verifying) {
    return (
      <div className="h-screen w-screen bg-[#0b1016] text-white flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-[#7f91a4] font-mono">Verifying administrative security credentials...</span>
      </div>
    );
  }

  if (!adminToken || !adminUser || adminUser.role !== 'ADMIN') {
    return <AdminLogin />;
  }

  return <AdminDashboard />;
};
