export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Skeleton Header Card */}
      <div className="bg-slate-200/70 rounded-2xl h-36 w-full" />

      {/* Skeleton KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 h-36 flex flex-col justify-between">
          <div className="h-4 bg-slate-200 rounded w-1/2" />
          <div className="h-8 bg-slate-200 rounded w-3/4" />
          <div className="h-3 bg-slate-100 rounded w-2/3" />
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 h-36 flex flex-col justify-between">
          <div className="h-4 bg-slate-200 rounded w-1/2" />
          <div className="h-8 bg-slate-200 rounded w-3/4" />
          <div className="h-3 bg-slate-100 rounded w-2/3" />
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 h-36 flex flex-col justify-between sm:col-span-2 lg:col-span-1">
          <div className="h-4 bg-slate-200 rounded w-1/2" />
          <div className="h-8 bg-slate-200 rounded w-3/4" />
          <div className="h-3 bg-slate-100 rounded w-2/3" />
        </div>
      </div>

      {/* Skeleton List Items */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4">
        <div className="h-5 bg-slate-200 rounded w-1/4" />
        <div className="space-y-3 pt-2">
          <div className="h-16 bg-slate-50 rounded-xl border border-slate-100" />
          <div className="h-16 bg-slate-50 rounded-xl border border-slate-100" />
          <div className="h-16 bg-slate-50 rounded-xl border border-slate-100" />
        </div>
      </div>
    </div>
  );
}
