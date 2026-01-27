import { useEffect, useRef, useState, ReactNode } from "react";

export default function MobileScaler({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState<number | "auto">("auto");
  const [isMobile, setIsMobile] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // 1. Detect Screen Size & Calculate Scale
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      // Active only for mobile/tablet (< 768px)
      const mobile = width < 768;
      setIsMobile(mobile);

      if (mobile) {
        // Calculate scale to fit the 480px design width exactly into the device width
        const calculatedScale = width / 480;
        setScale(calculatedScale);
      } else {
        setScale(1);
      }
    };

    // Initial calculation
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 2. Observer for Dynamic Content Height (To fix scroll length)
  useEffect(() => {
    if (!contentRef.current || !isMobile) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // We update the outer container's height to match the scaled visual height
        setContentHeight(entry.contentRect.height * scale);
      }
    });

    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [scale, isMobile]);

  // If Desktop/Tablet, render normally without wrappers
  if (!isMobile) {
    return <>{children}</>;
  }

  // If Mobile, render the Scaled Canvas
  return (
    <div
      style={{
        width: "100%",
        // Set outer height to the scaled content height so scrolling works correctly
        height: contentHeight === "auto" ? "auto" : `${contentHeight}px`,
        overflowX: "hidden",
        overflowY: "visible", // Allow native scroll
        position: "relative",
      }}
    >
      <div
        ref={contentRef}
        style={{
          // Lock the Layout Canvas to your exact Design Spec
          width: "480px", 
          minHeight: "100vh", // Ensure it fills screen vertically
          
          // Apply the Scale Transformation
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          
          // Force styles to ensure no layout leakage
          position: "absolute",
          top: 0,
          left: 0,
          backgroundColor: "#fff", // Prevent transparency issues
        }}
      >
        {children}
      </div>
    </div>
  );
}