import React from 'react';

export function SensorCardSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-5 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-24 bg-slate-300 dark:bg-slate-700 rounded-md"></div>
        <div className="w-9 h-9 rounded-xl bg-slate-300 dark:bg-slate-700"></div>
      </div>
      <div className="h-9 w-28 bg-slate-300 dark:bg-slate-700 rounded-lg mb-4"></div>
      <div className="h-10 w-full bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-6 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-6 w-36 bg-slate-300 dark:bg-slate-700 rounded-md"></div>
        <div className="h-8 w-48 bg-slate-300 dark:bg-slate-700 rounded-lg"></div>
      </div>
      <div className="h-64 w-full bg-slate-200 dark:bg-slate-800 rounded-xl mb-4"></div>
      <div className="grid grid-cols-3 gap-4">
        <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
        <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
        <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
      </div>
    </div>
  );
}
