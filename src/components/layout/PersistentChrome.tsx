import { useLocation } from "react-router-dom";
import { ReactNode, Suspense, lazy } from "react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const FeaturedCatalogueStrip = lazy(() => import("@/components/catalogue/FeaturedCatalogueStrip"));

const isExcludedPath = (pathname: string) => {
  if (pathname.startsWith("/site/")) return true;
  if (pathname === "/demo-org") return true;
  if (pathname === "/video-call") return true;
  return false;
};

interface Props {
  children: ReactNode;
}

const PersistentChrome = ({ children }: Props) => {
  const { pathname } = useLocation();
  if (isExcludedPath(pathname)) return <>{children}</>;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 pt-16 flex flex-col">
        <Suspense fallback={null}>
          <FeaturedCatalogueStrip />
        </Suspense>
        {children}
      </div>
      <Footer />
    </div>
  );
};

export default PersistentChrome;
