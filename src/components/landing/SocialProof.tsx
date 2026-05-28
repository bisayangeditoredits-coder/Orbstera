"use client";



export function SocialProof() {
  const stats = [
    { value: '2M+', label: 'Presentations Generated' },
    { value: '85%', label: 'Less Time Spent' },
    { value: '10k+', label: 'Active Teams' },
    { value: '4.9/5', label: 'Average Rating' }
  ];
  
  return (
    <section className="w-full py-16 lg:py-24 bg-slate-50 flex flex-col items-center border-y border-slate-100">
      <div className="max-w-7xl w-full mx-auto px-6 sm:px-12">
        <p 
          className="text-center text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-widest mb-12 sm:mb-16"
        >
          Powering the world&apos;s most innovative presentations
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {stats.map((stat, i) => (
            <div 
              key={i}
              className="flex flex-col items-center text-center"
            >
              <div className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-primary tracking-tight mb-2 sm:mb-4">
                {stat.value}
              </div>
              <div className="text-sm font-medium text-slate-600">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
