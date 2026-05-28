"use client";



const FEATURES = [
  {
    title: 'Restyle with one click.',
    desc: 'Instantly swap between themes, typography sets, and color palettes. Your entire deck reformats perfectly, no manual tweaking required.',
    image: 'https://images.unsplash.com/photo-1541462608143-67571c6738dd?q=80&w=800&auto=format&fit=crop',
    align: 'left',
  },
  {
    title: 'Present anywhere, beautifully.',
    desc: 'Stop worrying about aspect ratios. Orbstera presentations are web-native and automatically adapt to any screen size???from ultrawide monitors to mobile phones.',
    image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=800&auto=format&fit=crop',
    align: 'right',
  },
];

export function Features() {
  return (
    <section className="w-full bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        
        <div className="flex flex-col gap-24 md:gap-32">
          {FEATURES.map((feature, i) => (
            <div 
              key={i} 
              className={`flex flex-col gap-10 md:gap-16 items-center ${feature.align === 'left' ? 'md:flex-row' : 'md:flex-row-reverse'}`}
            >
              
              {/* Text Side */}
              <div 
                className="w-full md:w-1/2 flex flex-col justify-center"
              >
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-6 leading-tight">
                  {feature.title}
                </h2>
                <p className="text-lg text-slate-600 leading-relaxed font-medium">
                  {feature.desc}
                </p>
              </div>

              {/* Image Side */}
              <div 
                className="w-full md:w-1/2"
              >
                <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/[0.05]">
                  <img 
                    src={feature.image} 
                    alt={feature.title} 
                    className="w-full h-full object-cover transition-transform duration-[10s] hover:scale-105"
                  />
                  <div className="absolute inset-0 ring-1 ring-inset ring-black/10 rounded-2xl pointer-events-none" />
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
