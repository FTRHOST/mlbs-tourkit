import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { AppState } from '../types';

const ASSETS = "/assets/";

interface AdContentProps {
  adConfig: AppState['adConfig'];
  ads: AppState['ads'];
  forceFade?: boolean;
  layout?: 'single' | 'grid';
}

const AdContent: React.FC<AdContentProps> = React.memo(({ adConfig, ads, forceFade, layout = 'single' }) => {
  const [fadeIndex, setFadeIndex] = useState(0);
  const [shouldScroll, setShouldScroll] = useState(false);
  
  // Grid Layout States
  const [gridPage, setGridPage] = useState(0);
  const [gridPages, setGridPages] = useState<string[][]>([ads]);
  const [isGridPaginated, setIsGridPaginated] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const effectiveEffect = forceFade ? 'fade' : adConfig.effect;

  // --- LOGIC FOR GRID LAYOUT ---
  useLayoutEffect(() => {
    if (layout === 'grid') {
      const itemsPerPage = 6; // Fixed: 2 rows x 3 columns = 6 items max per page
      
      const newPages: string[][] = [];
      for (let i = 0; i < ads.length; i += itemsPerPage) {
          newPages.push(ads.slice(i, i + itemsPerPage));
      }
      
      setGridPages(newPages);
      setIsGridPaginated(newPages.length > 1);
    }
  }, [layout, ads]); 

  // Grid Animation
  useEffect(() => {
      if (layout === 'grid' && isGridPaginated) {
          const interval = setInterval(() => {
              setGridPage(prev => (prev + 1) % gridPages.length);
          }, 5000); // 5 seconds per page
          return () => clearInterval(interval);
      }
  }, [layout, isGridPaginated, gridPages.length]);


  // --- LOGIC FOR SINGLE LAYOUT ---
  useEffect(() => {
    if (layout === 'single' && effectiveEffect === 'fade') {
      const interval = setInterval(() => {
        if (adConfig.type === 'images' && ads.length > 0) {
          setFadeIndex(prev => (prev + 1) % ads.length);
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [layout, effectiveEffect, adConfig.type, ads.length]);

  useEffect(() => {
    const checkOverflow = () => {
      if (layout === 'single' && effectiveEffect === 'scroll' && containerRef.current && contentRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const contentWidth = contentRef.current.scrollWidth;
        setShouldScroll(contentWidth > containerWidth);
      }
    };

    if (layout === 'single' && effectiveEffect === 'scroll') {
      checkOverflow();
      const timer = setTimeout(checkOverflow, 1000);
      window.addEventListener('resize', checkOverflow);
      return () => {
        window.removeEventListener('resize', checkOverflow);
        clearTimeout(timer);
      };
    } else if (layout === 'single') {
      setShouldScroll(false);
    }
  }, [layout, effectiveEffect, ads]);

  const getAdSrc = (ad: string) => {
    if (ad.startsWith('data:')) return ad;
    return `${ASSETS}${ad}.png`;
  };

  // --- RENDER: GRID LAYOUT ---
  if (layout === 'grid') {
      const currentAds = isGridPaginated ? gridPages[gridPage] : ads;

      return (
          <div 
            ref={containerRef} 
            className={`w-full h-full grid grid-cols-3 grid-rows-2 justify-items-center items-center gap-x-12 gap-y-4 overflow-hidden ${isGridPaginated ? 'animate-fade' : ''}`}
            key={isGridPaginated ? gridPage : 'static'} 
          >
              {currentAds.map((ad, idx) => (
                  <img 
                    key={`${gridPage}-${idx}`}
                    src={getAdSrc(ad)}
                    className="max-h-[140px] w-full object-contain"
                    alt="Sponsor"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
              ))}
          </div>
      );
  }

  // --- RENDER: SINGLE LAYOUT ---
  const renderMarquee = (children: React.ReactNode) => (
    <div 
      ref={containerRef}
      className="marquee-wrapper"
      style={{ '--speed': `${adConfig.speed}s` } as any}
    >
      <div 
        className={`marquee-content ${!shouldScroll ? 'w-full !justify-center !animate-none' : ''}`}
      >
        <div ref={contentRef} className="flex items-center">
          {children}
        </div>
      </div>
      {shouldScroll && (
        <div className="marquee-content">
          <div className="flex items-center">
            {children}
          </div>
        </div>
      )}
    </div>
  );

  if (adConfig.type === 'text') {
    if (effectiveEffect === 'scroll') {
      return renderMarquee(
        <span className="font-gothic text-[40px] uppercase tracking-widest px-[50px] text-white">
          {adConfig.text}
        </span>
      );
    } else {
      return (
        <div className="w-full h-full flex items-center justify-center font-gothic text-[40px] animate-fade uppercase tracking-wide text-white">
          {adConfig.text}
        </div>
      );
    }
  }

  if (effectiveEffect === 'scroll') {
    return renderMarquee(
      <div className="flex items-center gap-[100px] px-[50px]">
        {ads.map((ad, idx) => (
          <img 
            key={idx}
            src={getAdSrc(ad)} 
            className="h-[45px] w-auto object-contain" 
            onError={(e) => { e.currentTarget.src = `https://placehold.co/150x45/18252C/ffffff?text=${ad.substring(0, 10)}`; }}
          />
        ))}
      </div>
    );
  } else {
    const activeAd = ads[fadeIndex] || ads[0];
    return (
      <div className="w-full h-full flex items-center justify-center">
        {activeAd && (
          <img 
            key={activeAd}
            src={getAdSrc(activeAd)} 
            className="h-[100%] w-auto object-contain animate-fade" 
            onError={(e) => { e.currentTarget.src = `https://placehold.co/150x45/18252C/ffffff?text=${activeAd.substring(0, 10)}`; }}
          />
        )}
      </div>
    );
  }
}, (prev, next) => {
  return JSON.stringify(prev.adConfig) === JSON.stringify(next.adConfig) &&
         JSON.stringify(prev.ads) === JSON.stringify(next.ads) &&
         prev.forceFade === next.forceFade &&
         prev.layout === next.layout;
});

export default AdContent;
